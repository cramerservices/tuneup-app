import { createClient } from 'npm:@supabase/supabase-js@2.86.0'
import Stripe from 'npm:stripe@22.4.0'
import { jsPDF } from 'npm:jspdf@2.5.2'
import { invoiceLines } from '../_shared/invoice.ts'

const cors = {
  'Access-Control-Allow-Origin': 'https://www.cramerservies.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const money = (value: unknown) => `$${Number(value || 0).toFixed(2)}`
const escape = (value: unknown) => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))

function makePdf(invoice: any, lines: any[], snapshot: any) {
  const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  pdf.setCreationDate(new Date(invoice.created_at))
  pdf.setFileId(invoice.id.replace(/-/g, ''))
  let y = 45
  const text = (value: string, size = 11) => {
    pdf.setFontSize(size)
    for (const line of pdf.splitTextToSize(value, 520)) {
      if (y > 735) { pdf.addPage(); y = 45 }
      pdf.text(line, 45, y); y += size + 6
    }
  }
  text('CRAMER SERVICES LLC', 19)
  text('314-267-8594 | cramerservicesllc@gmail.com')
  text(`Invoice ${invoice.invoice_number}`, 15)
  text(`Invoice date: ${invoice.invoice_date}   Due: ${invoice.due_date}`)
  text(`Bill to: ${snapshot?.customer_name || ''}`)
  text(String(snapshot?.address || ''))
  text(`Service date: ${snapshot?.inspection_date || ''}   Technician: ${snapshot?.technician_name || ''}`)
  y += 12
  for (const line of lines) text(`${line.description}    ${money(line.total_cost)}`)
  y += 12
  text(`Invoice total: ${money(invoice.total_amount)}`, 13)
  text(`Paid: ${money(invoice.amount_paid)}`)
  text(`Balance due: ${money(invoice.amount_due)}`, 14)
  text('Use the secure Pay Now link in your email to pay this invoice.')
  text('Thank you for choosing Cramer Services LLC.')
  return pdf.output('datauristring').split(',')[1]
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { success: false, error: 'Use POST.' })
  try {
    const authorization = req.headers.get('Authorization') || ''
    if (!authorization.startsWith('Bearer ')) return json(401, { success: false, error: 'Sign in is required.' })
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json(401, { success: false, error: 'Sign in again to manage invoices.' })
    // Trusted Auth metadata, not the user-editable profile role.
    const staffRoles = ['admin', 'staff', 'technician', 'tech']
    const approvedStaff = ['cramerservicesllc@gmail.com', 'tech1@cramerservies.com', 'cramerservicesllc+staff@gmail.com']
    if (!approvedStaff.includes((user.email || '').toLowerCase()) && !staffRoles.includes(String(user.app_metadata?.role || ''))) {
      return json(403, { success: false, error: 'This account is not approved to manage invoices.' })
    }
    const body = await req.json()
    const { action, inspectionId } = body
    if (!['get','save','generate','send','pdf'].includes(action) || !/^[0-9a-f-]{36}$/i.test(inspectionId || '')) return json(400, { success: false, error: 'Invalid invoice request.' })
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    let { data: billing, error: billingError } = await admin.from('tuneup_billing').select('*').eq('inspection_id', inspectionId).maybeSingle()
    if (billingError) throw billingError
    if (action !== 'get' && action !== 'pdf' && !billing?.invoice_id) {
      const draft = body.draft || billing?.draft
      const lines = invoiceLines(draft)
      if (action !== 'save' && lines.length === 0) throw new Error('Approve at least one invoice item.')
      if (action === 'send' && lines.reduce((s,c)=>s+Math.round(c.total_cost*100),0) < 50) throw new Error('Stripe payments require a balance of at least $0.50.')
      const result = await admin.rpc('save_tuneup_billing', { p_inspection_id: inspectionId, p_draft: draft, p_line_items: lines, p_actor: user.id, p_create: action !== 'save' })
      if (result.error) throw result.error
      billing = result.data
    }
    if (!billing?.invoice_id) return json(200, { success: true, draft: billing?.draft || null, invoice: null })
    const { data: invoice, error: invoiceError } = await admin.from('crm_invoices').select('*').eq('id', billing.invoice_id).single()
    if (invoiceError) throw invoiceError
    const { data: lines, error: lineError } = await admin.from('crm_invoice_line_items').select('*').eq('invoice_id', invoice.id).order('sort_order')
    if (lineError) throw lineError
    const result = { success: true, draft: billing.draft, invoice, lines, recipient: billing.recipient_email }
    if (action === 'get' || action === 'save' || action === 'generate') return json(200, result)
    const pdfBase64 = makePdf(invoice, lines || [], billing.snapshot)
    if (action === 'pdf') return json(200, { ...result, pdfBase64 })
    if (invoice.status === 'cancelled' || invoice.status === 'paid' || Number(invoice.amount_due) <= 0) throw new Error('This invoice has no payable balance.')
    const to = billing.recipient_email
    if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(to || '')) throw new Error('A valid customer email is required on the report.')
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!stripeKey || !resendKey) throw new Error('Payment or email service is not configured.')
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-07-29.dahlia', maxNetworkRetries: 2, timeout: 20000 })
    const cents = Math.round(Number(invoice.amount_due) * 100)
    if (cents < 50) throw new Error('Stripe payments require a balance of at least $0.50.')
    let session: Stripe.Checkout.Session | null = null
    const previousId = invoice.stripe_checkout_session_id
    if (previousId) {
      const previous = await stripe.checkout.sessions.retrieve(previousId)
      if (previous.status === 'complete') throw new Error('Payment has already been submitted. Wait for the invoice balance to update.')
      if (previous.status === 'open' && previous.amount_total === cents && previous.customer_email === to) session = previous
      else if (previous.status === 'open') await stripe.checkout.sessions.expire(previousId)
    }
    if (!session) {
      const totalCents = (lines || []).reduce((s,l)=>s+Math.round(Number(l.total_cost)*100),0)
      const chargeLines = Number(invoice.amount_paid) === 0 && totalCents === cents
        ? (lines || []).map(l=>({quantity:1,price_data:{currency:'usd',unit_amount:Math.round(Number(l.total_cost)*100),product_data:{name:String(l.description).slice(0,250)}}}))
        : [{quantity:1,price_data:{currency:'usd',unit_amount:cents,product_data:{name:`Balance for invoice ${invoice.invoice_number}`}}}]
      session = await stripe.checkout.sessions.create({
        mode: 'payment', integration_identifier: 'tuneup_invoice_nqxtmzpa', customer_email: to,
        success_url: 'https://www.cramerservicesllc.com/?invoicePayment=success',
        cancel_url: 'https://www.cramerservicesllc.com/?invoicePayment=cancelled',
        line_items: chargeLines,
        metadata: { kind:'invoice_payment',invoice_id:invoice.id,invoice_number:invoice.invoice_number,customer_id:invoice.customer_id,payment_amount:(cents/100).toFixed(2),payment_type:'full',amount_due_before_payment:(cents/100).toFixed(2),total_amount:Number(invoice.total_amount).toFixed(2) },
      }, { idempotencyKey: `tuneup-invoice-${invoice.id}-${cents}-${previousId || 'initial'}` })
      const saved = await admin.from('crm_invoices').update({ stripe_checkout_session_id: session.id }).eq('id',invoice.id)
      if (saved.error) throw saved.error
    }
    if (!session.url) throw new Error('Stripe did not return a payment link.')
    if (billing.email_id && billing.email_session_id === session.id) return json(200, {...result, emailId:billing.email_id,alreadySent:true})
    const invoiceNumber = escape(invoice.invoice_number)
    const email = await fetch('https://api.resend.com/emails', {
      method:'POST', headers:{Authorization:`Bearer ${resendKey}`,'Content-Type':'application/json','Idempotency-Key':`tuneup-invoice-${invoice.id}-${session.id}`},
      body:JSON.stringify({
        from:'Cramer Services <Invoice@cramerservicesllc.com>', reply_to:'cramerservicesllc@gmail.com', to:[to],
        subject:`Invoice ${invoice.invoice_number} and payment link - Cramer Services`,
        text:`Hi ${billing.snapshot?.customer_name || 'Customer'},\n\nYour itemized invoice ${invoice.invoice_number} is attached.\nTotal: ${money(invoice.total_amount)}\nBalance due: ${money(invoice.amount_due)}\n\nPay securely with Stripe: ${session.url}\n\nThis link expires in 24 hours or sooner. Contact us if you need a new link.\n\nCramer Services LLC\n314-267-8594`,
        html:`<div style="font-family:Arial,sans-serif;line-height:1.6"><p>Hi ${escape(billing.snapshot?.customer_name || 'Customer')},</p><p>Your itemized invoice <strong>${invoiceNumber}</strong> is attached.</p><p>Total: ${money(invoice.total_amount)}<br><strong>Balance due: ${money(invoice.amount_due)}</strong></p><p><a style="display:inline-block;padding:14px 24px;background:#174ea6;color:white;border-radius:6px" href="${escape(session.url)}">Pay Now with Stripe</a></p><p>This link expires in 24 hours or sooner. Contact us if you need a new link.</p><p>Cramer Services LLC<br>314-267-8594</p></div>`,
        attachments:[{filename:`invoice-${invoice.invoice_number}.pdf`,content:pdfBase64}],
      }), signal:AbortSignal.timeout(25000),
    })
    const sent = await email.json()
    if (!email.ok || !sent.id) throw new Error(sent.message || 'Email provider did not confirm the invoice email.')
    const recorded = await admin.from('tuneup_billing').update({email_id:sent.id,email_session_id:session.id,email_sent_at:new Date().toISOString()}).eq('inspection_id',inspectionId)
    if (recorded.error) throw new Error('Email accepted, but the send record could not be saved. Retrying will reuse the same invoice.')
    const updated = await admin.from('crm_invoices').update({status:'sent'}).eq('id',invoice.id).eq('status','draft')
    if (updated.error) throw new Error('Email accepted, but invoice status could not be updated.')
    return json(200,{...result,emailId:sent.id})
  } catch (error: any) { return json(400,{success:false,error:error?.message || 'Invoice operation failed.'}) }
})
