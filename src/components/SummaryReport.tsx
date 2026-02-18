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
    <div className="summary-report">
      <div className="summary-header">
        <div className="summary-header-top">
          <div>
            <h1>Tune-Up Summary Report</h1>
            <p style={{ marginTop: 8, opacity: 0.9 }}>Inspection summary</p>
          </div>

          <div className="info-row">
            <div className="info-label">Completion</div>
            <div className="info-value">{completionPercentage}%</div>
          </div>
        </div>
      </div>

      {showInvoicePrint && invoiceData && (
        <InvoicePrintAny invoiceData={invoiceData} onClose={handleCloseInvoicePrint} />
      )}

      <div ref={reportRef}>
        {/* Customer Info */}
        <div className="customer-info">
          <h2>Customer Information</h2>

          <div className="form-grid">
            <div className="form-field">
              <label>Name</label>
              <div>{customerName || '—'}</div>
            </div>

            <div className="form-field">
              <label>Email</label>
              <div>{customerEmail || '—'}</div>
            </div>

            <div className="form-field">
              <label>Address</label>
              <div>{address || '—'}</div>
            </div>

            <div className="form-field">
              <label>Technician</label>
              <div>{technicianName || '—'}</div>
            </div>

            <div className="form-field">
              <label>Date</label>
              <div>{inspectionDate || '—'}</div>
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div className="equipment-summary summary-section">
          <h2>Equipment</h2>

          {equipment.length > 0 ? (
            <div className="equipment-summary-grid">
              {equipment.map((eq: any, idx: number) => (
                <div key={idx} className="equipment-summary-card">
                  <h3 className="equipment-type-header">Service Type: {eq.serviceType}</h3>

                  <div className="equipment-details">
                    <div className="equipment-detail-row">
                      <span className="detail-label">Brand</span>
                      <span className="detail-value">{eq.brand}</span>
                    </div>
                    <div className="equipment-detail-row">
                      <span className="detail-label">Model</span>
                      <span className="detail-value">{eq.model}</span>
                    </div>
                    <div className="equipment-detail-row">
                      <span className="detail-label">Serial</span>
                      <span className="detail-value">{eq.serial}</span>
                    </div>

                    {eq.notes && (
                      <div className="equipment-detail-row" style={{ alignItems: 'flex-start' }}>
                        <span className="detail-label">Notes</span>
                        <span className="detail-value">{eq.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-equipment-info">No equipment details recorded.</p>
          )}
        </div>

        {/* Recommendations */}
        <div className="recommendations-section summary-section">
          <h2>Recommendations</h2>
          <p className="section-intro">These are the recommended improvements based on the inspection.</p>

          {sortedSuggestions.length > 0 ? (
            <div className="recommendations-list">
              {sortedSuggestions.map((suggestion: any, idx: number) => (
                <div key={idx} className="recommendation-card">
                  <div className="recommendation-header">
                    <div className="recommendation-title">{suggestion?.title ?? 'Recommendation'}</div>
                    {suggestion?.price && <div className="recommendation-price">{suggestion.price}</div>}
                  </div>

                  {suggestion?.description && (
                    <p className="recommendation-pitch">{suggestion.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-issues">No recommendations selected.</div>
          )}
        </div>

        {/* General Notes */}
        <div className="general-notes-section">
          <h2>General Notes</h2>
          <p style={{ lineHeight: 1.7 }}>{generalNotes || 'No notes provided.'}</p>
        </div>

        {/* Checklist Summary + Toggle */}
        <div className="checklist-section">
          <div className="section-header-with-toggle">
            <h2>Inspection Checklist</h2>
            <button
              onClick={() => setShowFullReport(!showFullReport)}
              className="toggle-report-btn"
              type="button"
            >
              {showFullReport ? 'Hide Detailed Report' : 'Show Detailed Report'}
            </button>
          </div>

          <div className="summary-stats">
            <div className="stat-card">
              <div className="stat-number">{items.length}</div>
              <div className="stat-label">Total Items</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{completedItems.length}</div>
              <div className="stat-label">Completed</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{issueItems.length}</div>
              <div className="stat-label">Issues Found</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{sortedSuggestions.length}</div>
              <div className="stat-label">Recommendations</div>
            </div>
          </div>

          {showFullReport && (
            <>
              <h3 style={{ marginBottom: 12 }}>Completed Items</h3>
              {completedItems.length > 0 ? (
                <div className="completed-list">
                  {completedItems.map((item) => (
                    <div key={item.id} className="completed-item">
                      <span className="completed-check">✓</span>
                      <div>
                        <div className="completed-name">{item.label}</div>
                        {item.notes && <div className="completed-notes">{item.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-equipment-info">No completed items recorded.</p>
              )}

              <div style={{ height: 24 }} />

              <h3 style={{ marginBottom: 12 }}>Issues Found</h3>
              {issueItems.length > 0 ? (
                <div className="issues-list">
                  {issueItems.map((item) => (
                    <div key={item.id} className="issue-item">
                      <div className="issue-header">
                        <div className="issue-title">{item.label}</div>
                        <span
                          className="severity-badge"
                          style={{ background: '#fee2e2', color: '#b91c1c' }}
                        >
                          Issue
                        </span>
                      </div>
                      {item.notes && <div className="issue-notes">{item.notes}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-issues">No issues were found during the inspection.</div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="summary-actions">
        <button onClick={onBack} className="btn btn-secondary" type="button">
          Back to Inspection
        </button>

        {onSendEmail && (
          <button
            onClick={onSendEmail}
            className="btn btn-secondary"
            disabled={Boolean(isSending)}
            type="button"
          >
            {isSending ? 'Sending…' : 'Send Email'}
          </button>
        )}

        <button onClick={handleExportPDF} className="btn btn-primary" type="button">
          Export PDF
        </button>

        <button onClick={() => setShowInvoiceModal(true)} className="btn btn-success" type="button">
          Create Invoice
        </button>
      </div>

      {showInvoiceModal && (
        <InvoiceModalAny
          customerName={customerName}
          onClose={() => setShowInvoiceModal(false)}
          onGenerate={handleGenerateInvoice}
        />
      )}
    </div>
  )

}
