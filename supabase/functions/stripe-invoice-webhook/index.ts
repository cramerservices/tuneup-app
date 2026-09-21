/// <reference lib="deno.ns" />

import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_INVOICE_WEBHOOK_SECRET = Deno.env.get("STRIPE_INVOICE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function safeNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function syncInvoiceToServicesCompleted(invoiceId: string) {
  const { data: invoiceRow, error: invoiceError } = await supabaseAdmin
    .from("crm_invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (invoiceError) throw invoiceError;

  const invoice = invoiceRow as Record<string, any>;

  const { data: existingRow, error: existingError } = await supabaseAdmin
    .from("services_completed")
    .select("id, payload, pdf_path")
    .eq("invoice_id", invoice.id)
    .maybeSingle();

  if (existingError) throw existingError;

  const existingPayload = (existingRow?.payload ?? {}) as Record<string, any>;
  const finalPdfUrl =
    existingPayload?.pdf_url ||
    existingRow?.pdf_path ||
    null;

  const payload = {
    kind: "invoice",
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    estimate_id: invoice.estimate_id || null,
    status: invoice.status,
    total_amount: safeNumber(invoice.total_amount),
    amount_paid: safeNumber(invoice.amount_paid),
    amount_due: safeNumber(invoice.amount_due),
    approved: null,
    payments: [],
    pdf_url: finalPdfUrl,
  };

  const summary =
    invoice.status === "paid"
      ? `Invoice ${invoice.invoice_number} paid in full.`
      : `Invoice ${invoice.invoice_number} partial payment received. Balance due: $${safeNumber(
          invoice.amount_due
        ).toFixed(2)}`;

  const mirrorRow = {
    customer_id: invoice.customer_id,
    service_type: "invoice",
    service_date: invoice.invoice_date,
    technician_name: invoice.tech_name,
    summary,
    pdf_path: finalPdfUrl,
    payload,
    invoice_id: invoice.id,
    estimate_id: invoice.estimate_id || null,
    completed_at: new Date().toISOString(),
  };

  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from("services_completed")
    .update(mirrorRow)
    .eq("invoice_id", invoice.id)
    .select("id");

  if (updateError) throw updateError;

  if (updatedRows && updatedRows.length > 0) return;

  const { error: insertError } = await supabaseAdmin
    .from("services_completed")
    .insert(mirrorRow);

  if (insertError) throw insertError;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    if (
      !STRIPE_SECRET_KEY ||
      !STRIPE_INVOICE_WEBHOOK_SECRET ||
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return json(500, { error: "Missing required secrets" });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return json(400, { error: "Missing Stripe signature" });
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_INVOICE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err?.message || err);
      return json(400, { error: "Invalid webhook signature" });
    }

    if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
      return json(200, { ok: true, ignored: event.type });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = (session.metadata || {}) as Record<string, string>;

    if (metadata.kind !== "invoice_payment") {
      return json(200, { ok: true, ignored: "not invoice payment" });
    }

    const invoiceId = metadata.invoice_id;
    if (session.payment_status !== "paid") {
      return json(200, { ok: true, ignored: "payment not settled" });
    }
    const paymentAmount = safeNumber(session.amount_total) / 100;
    const stripeSessionId = session.id;
    const stripePaymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null;

    if (!invoiceId) {
      return json(400, { error: "Missing invoice_id in Stripe metadata" });
    }

    if (!paymentAmount || paymentAmount <= 0) {
      return json(400, { error: "Invalid payment_amount in Stripe metadata" });
    }

    const { data: existingPayment, error: existingPaymentError } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("stripe_checkout_session_id", stripeSessionId)
      .maybeSingle();

    if (existingPaymentError) throw existingPaymentError;

    if (existingPayment) {
      return json(200, {
        ok: true,
        message: "Payment already processed",
        payment_id: existingPayment.id,
      });
    }

    const { data: invoiceRow, error: invoiceError } = await supabaseAdmin
      .from("crm_invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    const invoice = invoiceRow as Record<string, any>;

    const oldAmountPaid = safeNumber(invoice.amount_paid);
    const oldAmountDue = safeNumber(invoice.amount_due);

    if (oldAmountDue <= 0) {
      return json(200, {
        ok: true,
        message: "Invoice already fully paid",
      });
    }

    const actualPaymentAmount = Math.min(paymentAmount, oldAmountDue);
    const newAmountPaid = Number((oldAmountPaid + actualPaymentAmount).toFixed(2));
    const newAmountDue = Number(Math.max(0, oldAmountDue - actualPaymentAmount).toFixed(2));
    const newStatus = newAmountDue <= 0 ? "paid" : "partial";

    const { data: insertedPayment, error: paymentInsertError } = await supabaseAdmin
      .from("payments")
      .insert({
        invoice_id: invoiceId,
        payment_date: new Date().toISOString().slice(0, 10),
        amount: actualPaymentAmount,
       payment_method: "card",
        reference_number: stripeSessionId,
        notes: "stripe checkout payment",
        created_at: new Date().toISOString(),
        stripe_checkout_session_id: stripeSessionId,
        stripe_payment_intent_id: stripePaymentIntentId,
        status: "paid",
      })
      .select("id")
      .single();

    if (paymentInsertError) throw paymentInsertError;

    const { error: invoiceUpdateError } = await supabaseAdmin
      .from("crm_invoices")
      .update({
        amount_paid: newAmountPaid,
        amount_due: newAmountDue,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (invoiceUpdateError) throw invoiceUpdateError;

    await syncInvoiceToServicesCompleted(invoiceId);

    return json(200, {
      ok: true,
      payment_id: insertedPayment.id,
      invoice_id: invoiceId,
      amount_paid: newAmountPaid,
      amount_due: newAmountDue,
      status: newStatus,
    });
  } catch (err: any) {
    console.error("stripe-invoice-webhook error:", err);
    return json(500, {
      error: "Unhandled webhook error",
      details: String(err?.message ?? err),
    });
  }
});