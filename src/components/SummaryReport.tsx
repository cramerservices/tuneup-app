import { useRef, useState } from 'react'
import type { FC } from 'react'
import { getSuggestionInfo } from '../data/suggestionPitches'
import { InvoiceModal } from './InvoiceModal'
import { InvoicePrint } from './InvoicePrint'
const InvoiceModalAny = InvoiceModal as unknown as FC<any>
const InvoicePrintAny = InvoicePrint as unknown as FC<any>

// @ts-ignore - html2pdf.js ships without TS types
import html2pdf from 'html2pdf.js'
import { supabase } from '../lib/supabase'
 
interface InspectionItem {
  id: string
  label: string
  checked: boolean
  issueFound: boolean
  notes?: string
}

interface SummaryDataLike {
  customerName?: string
  customerEmail?: string
  address?: string
  technicianName?: string
  inspectionDate?: string
  items?: any[]
  selectedSuggestions?: string[]
  generalNotes?: string
  equipment?: any[]
}

interface SummaryReportProps {
  data: SummaryDataLike
  onBack: () => void
  onExportPDF: () => void
  onSendEmail?: () => Promise<void> | void
  isSending?: boolean
}

export function SummaryReport({ data, onBack, onExportPDF, onSendEmail, isSending }: SummaryReportProps) {
  const [showFullReport, setShowFullReport] = useState(true)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const [showInvoicePrint, setShowInvoicePrint] = useState(false)

  const reportRef = useRef<HTMLDivElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const customerName = data?.customerName ?? ''
  const customerEmail = data?.customerEmail
  const address = data?.address ?? ''
  const technicianName = data?.technicianName ?? ''
  const inspectionDate = data?.inspectionDate ?? ''
  const generalNotes = data?.generalNotes ?? ''
  const selectedSuggestions = data?.selectedSuggestions ?? []
  const rawEquipment = data?.equipment ?? []
  const rawItems = data?.items ?? []

  // Normalize data from older/newer shapes so the report doesn't break if fields differ
  const items: InspectionItem[] = rawItems.map((it: any, idx: number) => ({
    id: String(it?.id ?? idx),
    label: String(it?.label ?? it?.itemName ?? `Item ${idx + 1}`),
    checked: Boolean(it?.checked ?? it?.completed ?? false),
    issueFound: Boolean(it?.issueFound ?? ((typeof it?.severity === 'number' ? it.severity : 0) > 0)),
    notes: (it?.notes ?? '') as string,
  }))

  const equipment = rawEquipment.map((eq: any) => ({
    serviceType: String(eq?.serviceType ?? ''),
    equipmentType: eq?.equipmentType,
    brand: eq?.brand ?? eq?.brandName ?? '',
    model: eq?.model ?? eq?.modelNumber ?? '',
    serial: eq?.serial ?? eq?.serialNumber ?? '',
    age: eq?.age ?? '',
    notes: eq?.notes ?? '',
  }))

  // Get summary statistics
  const checkedItems = items.filter((item) => item.checked)
  const itemsWithIssues = items.filter((item) => item.issueFound)
  const completionPercentage = items.length > 0 ? Math.round((checkedItems.length / items.length) * 100) : 0

  // Get suggestions info
  const suggestionDetails = selectedSuggestions.map((id) => getSuggestionInfo(id)).filter(Boolean)

  // Sort suggestions by priority (safe even if the underlying suggestion objects aren't typed)
  type PriorityKey = 'high' | 'medium' | 'low'
  const priorityOrder: Record<PriorityKey, number> = { high: 3, medium: 2, low: 1 }
  const toPriority = (v: unknown): PriorityKey => (v === 'high' || v === 'medium' || v === 'low' ? v : 'low')

  const sortedSuggestions = [...suggestionDetails].sort((a, b) => {
    const aP = toPriority((a as any)?.priority ?? (a as any)?.severity ?? (a as any)?.level)
    const bP = toPriority((b as any)?.priority ?? (b as any)?.severity ?? (b as any)?.level)
    return priorityOrder[bP] - priorityOrder[aP]
  })

  const handleGenerateInvoice = (invoiceData: any) => {
    setInvoiceData(invoiceData)
    setShowInvoiceModal(false)
    setShowInvoicePrint(true)
  }

  const handleCloseInvoicePrint = () => {
    setShowInvoicePrint(false)
    setInvoiceData(null)
  }

  const lookupCustomerIdByEmail = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase()

    // 1) Preferred: RPC (works even if customer tables have strict RLS)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_customer_id_by_email', { p_email: cleanEmail })
      if (!rpcErr && rpcData) return rpcData as unknown as string
    } catch {
      // ignore; fall back to direct table reads
    }

    // 2) Fallback: try common customer tables
    const tryTables = ['portal_customers', 'profiles'] as const
    for (const table of tryTables) {
      const { data, error } = await supabase.from(table).select('id').eq('email', cleanEmail).maybeSingle()
      if (error) continue
      if (data?.id) return data.id as string
    }

    throw new Error('No customer found with that email.')
  }

  const generatePdfBlob = async () => {
    if (!reportRef.current) throw new Error('Report not ready')

    const opt = {
      margin: [0.4, 0.4, 0.4, 0.4],
      filename: 'tuneup-summary.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    }

    // html2pdf returns a chainable instance; we can ask it for the underlying jsPDF output
    // @ts-ignore
    const worker = html2pdf().set(opt).from(reportRef.current).toPdf()

    // @ts-ignore
    const pdf: any = await worker.get('pdf')
    const blob = pdf.output('blob')
    return blob as Blob
  }

  const completeAndUploadToDashboard = async () => {
    try {
      setUploading(true)
      setUploadError(null)

      if (!customerEmail) {
        throw new Error('Customer email is required to attach this tune-up to the correct dashboard account.')
      }

      const customerId = await lookupCustomerIdByEmail(customerEmail)
      const pdfBlob = await generatePdfBlob()

      const safeName = customerName.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const pdfPath = `${customerId}/tuneups/${inspectionDate}-${safeName}-${ts}.pdf`

      const { error: uploadErr } = await supabase.storage.from('service-docs').upload(pdfPath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      })
      if (uploadErr) throw uploadErr

      const payloadItems = items.map((item) => ({
        label: item.label,
        checked: item.checked,
        issueFound: item.issueFound,
        notes: item.notes ?? '',
      }))

      const { error: rpcErr } = await supabase.rpc('add_service_history', {
        p_customer_id: customerId,
        p_service_type: 'Tune-Up',
        p_service_date: inspectionDate,
        p_technician_name: technicianName,
        p_address: address,
        p_items: payloadItems,
        p_general_notes: generalNotes,
        p_recommendations: selectedSuggestions,
        p_pdf_path: pdfPath,
      })
      if (rpcErr) throw rpcErr

      alert('Saved! This tune-up is now in the customer dashboard service history.')
    } catch (e: any) {
      console.error(e)
      setUploadError(e?.message ?? 'Failed to upload.')
      alert(e?.message ?? 'Failed to upload.')
    } finally {
      setUploading(false)
    }
  }

  return (

<div className="summary-container">
  <div ref={reportRef} id="summary-report" className="summary-report">
    {/* Header */}
    <div className="summary-header">
      <div className="summary-header-top">
        <img
          src="/CramerLogoText.png"
          alt="Cramer Services"
          className="summary-logo"
          onError={(e) => {
            // fallback if logo path differs
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="summary-contact-info">
          <div className="company-name">Cramer Services LLC</div>
          <div className="company-contact">Phone: (314) 210-4318</div>
          <div className="company-contact">Email: cramerservicesllc@gmail.com</div>
          <div className="company-contact">License: #E-XXXXX</div>
        </div>
      </div>

      <div className="summary-header-content">
        <h1 className="summary-title">Tune-Up Summary Report</h1>

        <div className="summary-progress">
          <div className="progress-text">{completionPercentage}% Complete</div>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>

    {/* Top summary cards */}
    <div className="summary-info">
      <div className="info-card">
        <h2 className="card-title">Customer Information</h2>
        <div className="info-row">
          <span className="info-label">Name:</span>
          <span className="info-value">{customerName || "—"}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Email:</span>
          <span className="info-value">{customerEmail || "—"}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Address:</span>
          <span className="info-value">{address || "—"}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Technician:</span>
          <span className="info-value">{technicianName || "—"}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Date:</span>
          <span className="info-value">{inspectionDate || "—"}</span>
        </div>
      </div>

      <div className="info-card">
        <h2 className="card-title">Summary</h2>
        <div className="info-row">
          <span className="info-label">Service Types:</span>
          <span className="info-value">
            {equipment.length
              ? [...new Set(equipment.map((e: any) => e?.serviceType).filter(Boolean))].join(", ")
              : "—"}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">Recommendations:</span>
          <span className="info-value">{selectedSuggestions.length}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Checklist Items Completed:</span>
          <span className="info-value">{itemsCompleted.length}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Issues Found:</span>
          <span className="info-value">{issuesFound.length}</span>
        </div>

        {saveError && (
          <div className="alert alert-danger" style={{ marginTop: 12 }}>
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="alert alert-success" style={{ marginTop: 12 }}>
            {saveSuccess}
          </div>
        )}
      </div>
    </div>

    {/* Equipment */}
    <div className="summary-section equipment-section">
      <h2 className="equipment-summary-title">Equipment</h2>

      {equipment.length === 0 ? (
        <div className="no-data">No equipment information provided.</div>
      ) : (
        <div className="equipment-summary-grid">
          {equipment.map((eq: any, idx: number) => (
            <div key={`${eq?.serviceType || "equipment"}-${idx}`} className="equipment-summary-card">
              <div className="equipment-summary-card-header">
                <span className="equipment-service-type">{eq?.serviceType || "Equipment"}</span>
              </div>

              <div className="equipment-details">
                <div className="equipment-detail-row">
                  <span className="equipment-detail-label">Brand:</span>
                  <span className="equipment-detail-value">{eq?.brand || "—"}</span>
                </div>
                <div className="equipment-detail-row">
                  <span className="equipment-detail-label">Model:</span>
                  <span className="equipment-detail-value">{eq?.model || "—"}</span>
                </div>
                <div className="equipment-detail-row">
                  <span className="equipment-detail-label">Serial:</span>
                  <span className="equipment-detail-value">{eq?.serial || "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Recommendations */}
    <div className="summary-section">
      <h2 className="section-title">Recommendations</h2>

      {selectedSuggestions.length === 0 ? (
        <div className="no-data">No recommendations selected.</div>
      ) : (
        <div className="recommendation-badges">
          {selectedSuggestions.map((s: string) => {
            const info = getSuggestionInfo(s);
            const label = info?.label || s;
            return (
              <span key={s} className="recommendation-badge">
                {label}
              </span>
            );
          })}
        </div>
      )}
    </div>

    {/* General Notes */}
    <div className="summary-section">
      <h2 className="section-title">General Notes</h2>
      {generalNotes?.trim() ? (
        <div className="notes-box">{generalNotes}</div>
      ) : (
        <div className="no-data">No general notes provided.</div>
      )}
    </div>

    {/* Checklist + Issues */}
    <div className="summary-section checklist-section">
      <div className="section-header-with-toggle">
        <h2 className="section-title">Inspection Checklist</h2>
        <button
          type="button"
          className="btn btn-link toggle-button"
          onClick={() => setShowFullReport((v) => !v)}
        >
          {showFullReport ? "Hide Detailed Report" : "Show Detailed Report"}
        </button>
      </div>

      <div className="checklist-grid">
        <div className="checklist-column">
          <h3 className="subsection-title">Completed Items</h3>
          {itemsCompleted.length === 0 ? (
            <div className="no-data">No checklist items marked completed.</div>
          ) : (
            <ul className="checklist-list">
              {itemsCompleted.map((item: any, idx: number) => (
                <li key={`c-${idx}`} className="checklist-item completed">
                  {typeof item === "string" ? item : item?.name || item?.label || "Item"}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="checklist-column">
          <h3 className="subsection-title">Issues Found</h3>
          {issuesFound.length === 0 ? (
            <div className="no-data">No issues were found during the inspection.</div>
          ) : (
            <ul className="issues-list">
              {issuesFound.map((issue: any, idx: number) => (
                <li key={`i-${idx}`} className="issue-item">
                  {issue?.issue || issue?.name || issue?.label || JSON.stringify(issue)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showFullReport && (
  <div className="detailed-report">
    <h3 className="subsection-title">Detailed Report</h3>
    <div className="details-box">
      <div style={{ marginBottom: 10 }}>
        <strong>All Checklist Items:</strong>
      </div>
      <ul className="checklist-list">
        {(Array.isArray(items) ? items : []).map((it: any, idx: number) => (
          <li key={`all-${idx}`} className={`checklist-item ${it?.completed ? "completed" : ""}`}>
            {typeof it === "string" ? it : it?.name || it?.label || "Item"}
          </li>
        ))}
      </ul>
    </div>
  </div>
)}
    </div>
  </div>

  {/* Actions */}
  <div className="summary-actions">
    <button type="button" className="btn btn-secondary" onClick={onBack}>
      Back to Inspection
    </button>

    <button type="button" className="btn btn-light" onClick={handleSendEmail}>
      Send Email
    </button>

    <button type="button" className="btn btn-success" onClick={() => setShowInvoiceModal(true)}>
      Generate Invoice
    </button>

    <button
      type="button"
      className="btn btn-primary"
      disabled={isSaving}
      onClick={handleCompleteAndSaveToDashboard}
      title={!customerEmail ? "Customer email is required to attach to a dashboard account." : undefined}
    >
      {isSaving ? "Saving…" : "Complete & Save to Customer Dashboard"}
    </button>

    <button type="button" className="btn btn-outline" onClick={handleExportPDF}>
      Export as PDF
    </button>
  </div>

  {showInvoiceModal && (
    <InvoiceModalAny
      isOpen={showInvoiceModal}
      onClose={() => setShowInvoiceModal(false)}
      customerName={customerName}
      customerAddress={address}
      inspectionData={{
        customerName,
        customerEmail,
        address,
        technicianName,
        inspectionDate,
        equipment,
        selectedSuggestions,
        generalNotes,
        items,
      }}
    />
  )}

      {showInvoicePrint && (
        <InvoicePrintAny invoiceData={invoiceData} onClose={handleCloseInvoicePrint} />
      )}

</div>

  )
}
