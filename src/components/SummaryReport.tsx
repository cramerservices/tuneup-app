import { useRef, useState } from 'react'
import type { FC } from 'react'
import { getSuggestionInfo } from '../data/suggestionPitches'
import { InvoiceModal } from './InvoiceModal'
import { InvoicePrint } from './InvoicePrint'

// html2pdf is used to generate the PDF blob for uploading to Supabase
// @ts-ignore - html2pdf.js ships without TS types
import html2pdf from 'html2pdf.js'
import { supabase } from '../lib/supabase'

const InvoiceModalAny = InvoiceModal as unknown as FC<any>
const InvoicePrintAny = InvoicePrint as unknown as FC<any>

interface InspectionItem {
  id: string
  label: string
  checked: boolean
  issueFound: boolean
  notes?: string
  itemName: string
  completed: boolean
  severity: number
}

interface EquipmentInfo {
  serviceType: string
  brand: string
  modelNumber: string
  serialNumber: string
  age?: string
  notes?: string
}

interface SummaryDataLike {
  customerName?: string
  address?: string
  technicianName?: string
  inspectionDate?: string
  customerEmail?: string
  items?: InspectionItem[]
  selectedSuggestions?: string[]
  generalNotes?: string
  equipment?: EquipmentInfo[]
}

interface SummaryReportProps {
  data: SummaryDataLike
  onBack: () => void
  onExportPDF: () => void
  onSendEmail?: () => Promise<void> | void
  isSending?: boolean
}

export const SummaryReport: FC<SummaryReportProps> = ({
  data,
  onBack,
  onExportPDF,
  onSendEmail,
  isSending,
}) => {
  const reportRef = useRef<HTMLDivElement | null>(null)
  const [showFullReport, setShowFullReport] = useState(true)

  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const [showInvoicePrint, setShowInvoicePrint] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const customerName = data.customerName || ''
  const address = data.address || ''
  const technicianName = data.technicianName || ''
  const inspectionDate = data.inspectionDate || ''
  const customerEmail = data.customerEmail || ''

  const items: InspectionItem[] = Array.isArray(data.items) ? data.items : []
  const selectedSuggestions: string[] = Array.isArray(data.selectedSuggestions) ? data.selectedSuggestions : []
  const equipment: EquipmentInfo[] = Array.isArray(data.equipment) ? data.equipment : []
  const generalNotes = data.generalNotes || ''

  const getTitleParts = (item: InspectionItem) => {
    const primary = (item.label || item.itemName || '').trim()
    const secondary =
      item.label && item.itemName && item.label.trim() !== item.itemName.trim()
        ? item.itemName.trim()
        : ''
    return { primary, secondary }
  }

  const isCompleted = (item: InspectionItem) => Boolean((item as any).checked ?? item.completed)

  const getSeverity = (item: InspectionItem) => {
    const s = Number((item as any).severity ?? 0)
    return Number.isFinite(s) ? s : 0
  }

  const checkedItems: InspectionItem[] = items.filter((i) => isCompleted(i))
  const incompleteItems: InspectionItem[] = items.filter((i) => !isCompleted(i))

  // A checklist "issue" is any item with severity > 0 (per your rule)
  const itemsWithIssues: InspectionItem[] = items.filter((i) => getSeverity(i) > 0)

  const completionPercentage =
    items.length > 0 ? Math.round((checkedItems.length / items.length) * 100) : 0

  // Suggestions info
  const suggestionDetails = selectedSuggestions
    .map((id) => getSuggestionInfo(id))
    .filter(Boolean) as any[]

  const sortedSuggestions = [...suggestionDetails].sort((a: any, b: any) => {
    const ap = typeof a?.price === 'number' ? a.price : 0
    const bp = typeof b?.price === 'number' ? b.price : 0
    return bp - ap
  })

  const severityLabel = (severity: number) => {
    // 0-10 scale
    if (severity >= 7) return 'High'
    if (severity >= 4) return 'Medium'
    return 'Low'
  }

  const handleGenerateInvoice = (generated: any) => {
    setInvoiceData(generated)
    setShowInvoiceModal(false)
    setShowInvoicePrint(true)
  }

  const handleCloseInvoicePrint = () => {
    setShowInvoicePrint(false)
  }

  const generatePdfBlob = async (): Promise<Blob> => {
    if (!reportRef.current) throw new Error('Report not ready')

    const worker = html2pdf()
      .set({
        margin: 10,
        filename: 'tuneup-summary.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(reportRef.current)
      .toPdf()

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
        throw new Error(
          'Customer email is required to attach this tune-up to the correct dashboard account.'
        )
      }

      // 1) Generate PDF blob
      const blob = await generatePdfBlob()

      // 2) Find the portal customer by email
      const { data: customerRow, error: customerErr } = await supabase
        .from('portal_customers')
        .select('id')
        .eq('email', customerEmail)
        .maybeSingle()

      if (customerErr) throw customerErr
      if (!customerRow?.id) {
        throw new Error(
          'No dashboard account found for this email. Ask the customer to sign up first.'
        )
      }

      const customerId = customerRow.id as string
      const serviceDate = inspectionDate || new Date().toISOString().slice(0, 10)
      const serviceId = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now())

      const filePath = `${customerId}/${serviceDate}_${serviceId}.pdf`

      // 3) Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('service-docs')
        .upload(filePath, blob, { contentType: 'application/pdf', upsert: true })

      if (uploadErr) throw uploadErr

      // 4) Insert row in service_reports (if you have this table)
      // If your schema differs, you can remove this block.
      await supabase.from('service_docs').insert({
        customer_id: customerId,
        service_date: serviceDate,
        service_type: (equipment?.[0]?.serviceType || 'tuneup') as string,
        storage_path: filePath,
      })

      setUploadError(null)
      alert('Uploaded to customer dashboard ✅')
    } catch (err: any) {
      setUploadError(err?.message ?? String(err))
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
            <p style={{ marginTop: 8, opacity: 0.9 }}>{completionPercentage}% Complete</p>
          </div>
        </div>
      </div>

      {showInvoicePrint && invoiceData && (
        <InvoicePrintAny invoiceData={invoiceData} onClose={handleCloseInvoicePrint} />
      )}

      {/* Everything inside this ref is what gets turned into the PDF */}
      <div ref={reportRef}>
        <div className="summary-stats">
          <div className="stat-card">
            <div className="stat-value">{items.length}</div>
            <div className="stat-label">Total Items</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{checkedItems.length}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{itemsWithIssues.length}</div>
            <div className="stat-label">Issues Found</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{sortedSuggestions.length}</div>
            <div className="stat-label">Recommendations</div>
          </div>
        </div>

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

        <div className="summary-section">
          <h2>Equipment</h2>
          {equipment.length > 0 ? (
            <div className="equipment-summary-grid">
              {equipment.map((eq, idx) => (
                <div key={idx} className="equipment-card">
                  <p>
                    <strong>Service Type:</strong> {eq.serviceType || '—'}
                  </p>
                  <p>
                    <strong>Brand:</strong> {eq.brand || '—'}
                  </p>
                  <p>
                    <strong>Model #:</strong> {(eq as any).modelNumber || (eq as any).model || '—'}
                  </p>
                  <p>
                    <strong>Serial:</strong> {(eq as any).serialNumber || (eq as any).serial || '—'}
                  </p>
                  {eq.age && (
                    <p>
                      <strong>Age:</strong> {eq.age}
                    </p>
                  )}
                  {eq.notes && (
                    <p>
                      <strong>Notes:</strong> {eq.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-equipment">No equipment details recorded.</div>
          )}
        </div>

        <div className="summary-section">
          <h2>Recommendations</h2>
          {sortedSuggestions.length > 0 ? (
            <div style={{ display: 'grid', gap: 16 }}>
              {sortedSuggestions.map((suggestion: any, idx: number) => (
                <div key={idx} className="recommendation-card">
                  <div className="recommendation-header">
                    <div className="recommendation-title">
                      {suggestion?.title ?? 'Recommendation'}
                    </div>
                    {typeof suggestion?.price === 'number' && (
                      <div className="recommendation-price">${suggestion.price}</div>
                    )}
                  </div>
                  {suggestion?.description && (
                    <div className="recommendation-description">{suggestion.description}</div>
                  )}
                  {suggestion?.pitch && (
                    <div className="recommendation-description" style={{ marginTop: 8 }}>
                      {suggestion.pitch}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-issues">No recommendations selected.</div>
          )}
        </div>

        <div className="general-notes-section">
          <h2>General Notes</h2>
          <div className="general-notes">{generalNotes || '—'}</div>
        </div>

        {showFullReport && (
          <div className="checklist-section">
            <div className="section-header-with-toggle">
              <h2>Inspection Checklist</h2>
              <button
                type="button"
                className="toggle-report-btn"
                onClick={() => setShowFullReport(false)}
              >
                Hide Detailed Report
              </button>
            </div>

            <h3 style={{ marginTop: 0 }}>Issues Found</h3>
            {itemsWithIssues.length > 0 ? (
              <div className="issues-list">
                {itemsWithIssues.map((item: InspectionItem) => {
                  const { primary, secondary } = getTitleParts(item)
                  const sev = getSeverity(item)
                  return (
                    <div key={item.id} className="issue-item">
                      <div className="issue-header">
                        <div className="issue-title">{primary || '—'}</div>
                        <div className={`severity-badge severity-${severityLabel(sev).toLowerCase()}`}>
                          Severity {sev}/10
                        </div>
                      </div>

                      {secondary ? <div className="item-notes"><strong>Item:</strong> {secondary}</div> : null}
                      {item.notes ? <div className="issue-notes"><strong>Notes:</strong> {item.notes}</div> : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="no-issues">No issues were found during the inspection.</div>
            )}
          

            <h3 style={{ marginTop: 24 }}>Not Completed</h3>
            {incompleteItems.length > 0 ? (
              <div className="issues-list">
                {incompleteItems.map((item: InspectionItem) => {
                  const { primary, secondary } = getTitleParts(item)
                  const sev = getSeverity(item)
                  return (
                    <div key={item.id} className="issue-item">
                      <div className="issue-header">
                        <div className="issue-title">{primary || '—'}</div>
                        <div className="severity-badge severity-low">Not Completed</div>
                      </div>

                      {secondary ? <div className="item-notes"><strong>Item:</strong> {secondary}</div> : null}
                      {sev > 0 ? (
                        <div className="item-notes"><strong>Severity:</strong> {sev}/10</div>
                      ) : null}
                      {item.notes ? <div className="issue-notes"><strong>Notes:</strong> {item.notes}</div> : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="no-issues">All items were checked off.</div>
            )}
</div>
        )}

        {!showFullReport && (
          <div className="checklist-section">
            <div className="section-header-with-toggle">
              <h2>Inspection Checklist</h2>
              <button
                type="button"
                className="toggle-report-btn"
                onClick={() => setShowFullReport(true)}
              >
                Show Detailed Report
              </button>
            </div>
            <div className="no-issues">Detailed checklist is hidden.</div>
          </div>
        )}
      </div>

      <div className="summary-actions">
        <button onClick={onBack} className="btn btn-secondary" type="button">
          Back to Inspection
        </button>

        <button
          onClick={onExportPDF}
          className="btn btn-primary"
          type="button"
        >
          Export PDF
        </button>

        {onSendEmail && (
          <button
            onClick={onSendEmail}
            className="btn btn-primary"
            disabled={!!isSending}
            type="button"
          >
            {isSending ? 'Sending…' : 'Send Email'}
          </button>
        )}

        <button
          onClick={() => setShowInvoiceModal(true)}
          className="btn btn-secondary"
          type="button"
        >
          Generate Invoice
        </button>

        <button
          onClick={completeAndUploadToDashboard}
          className="btn btn-primary"
          disabled={uploading}
          type="button"
          title="Uploads PDF to the customer's dashboard"
        >
          {uploading ? 'Uploading…' : 'Upload to Dashboard'}
        </button>
      </div>

      {uploadError && (
        <div style={{ padding: 16, color: 'crimson' }}>
          {uploadError}
        </div>
      )}

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

