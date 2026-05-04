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
interface SystemReadings {
  blowerCapacitor?: string
  blowerAmps?: string
  inducerMotorAmps?: string
  gasPressure?: string
  temperatureRise?: string
  returnAirTemp?: string
  supplyAirTemp?: string
  outdoorTemp?: string
  indoorWetBulb?: string
  lowSidePressure?: string
  highSidePressure?: string
  superheat?: string
  subcooling?: string
  compressorAmps?: string
  condenserFanAmps?: string
  capacitorHerm?: string
  capacitorFan?: string
  capacitorCommon?: string
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
  systemReadings?: SystemReadings
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
  const [showDetailedReport, setShowDetailedReport] = useState(false)

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
const systemReadings = data.systemReadings || {}

const hasSystemReadings = Object.values(systemReadings).some(
  (value) => String(value || '').trim() !== ''
)

const completedWithNoIssues = checkedItems.filter((item) => getSeverity(item) === 0)
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

const systemReadings = data.systemReadings || {}

const checkedItems: InspectionItem[] = items.filter((i) => isCompleted(i))
const incompleteItems: InspectionItem[] = items.filter((i) => !isCompleted(i))
const completedWithNoIssues = checkedItems.filter((item) => getSeverity(item) === 0)

const hasSystemReadings = Object.values(systemReadings).some(
  (value) => String(value || '').trim() !== ''
)

  // A checklist "issue" is any item with severity > 0 (per your rule)
  const itemsWithIssues: InspectionItem[] = items
    .filter((i) => getSeverity(i) > 0)
    .sort((a, b) => getSeverity(b) - getSeverity(a))

  const sortedIncompleteItems: InspectionItem[] = [...incompleteItems].sort(
    (a, b) => getSeverity(b) - getSeverity(a)
  )

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
    if (severity >= 9) return 'Critical'
    if (severity >= 7) return 'High'
    if (severity >= 4) return 'Medium'
    return 'Low'
  }
const renderReading = (label: string, value: any) => {
  const displayValue = String(value || '').trim()
  if (!displayValue) return null

  return (
    <div className="reading-row">
      <span className="reading-label">{label}</span>
      <span className="reading-value">{displayValue}</span>
    </div>
  )
}

const renderSystemReadingsSection = () => {
  if (!hasSystemReadings) return null

  return (
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

        {renderSystemReadingsSection()}

        <div className="summary-section">
          <h2>Add-Ons</h2>
    <h3 style={{ marginTop: 0 }}>Issues Found</h3>
    {itemsWithIssues.length > 0 ? (
      <div className="issues-list">
        {itemsWithIssues.map((item: InspectionItem) => {
          const { primary, secondary } = getTitleParts(item)
          const sev = getSeverity(item)

          return (
            <div
              key={item.id || item.itemName}
              className={`issue-item issue-item-${severityLabel(sev).toLowerCase()}`}
            >
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
        {sortedIncompleteItems.map((item: InspectionItem) => {
          const { primary, secondary } = getTitleParts(item)
          const sev = getSeverity(item)

          return (
            <div
              key={item.id || item.itemName}
              className={`issue-item issue-item-${severityLabel(sev).toLowerCase()}`}
            >
              <div className="issue-header">
                <div className="issue-title">{primary || '—'}</div>
                <div className="severity-badge severity-low">Not Completed</div>
              </div>

              {secondary ? <div className="item-notes"><strong>Item:</strong> {secondary}</div> : null}
              {sev > 0 ? <div className="item-notes"><strong>Severity:</strong> {sev}/10</div> : null}
              {item.notes ? <div className="issue-notes"><strong>Notes:</strong> {item.notes}</div> : null}
            </div>
          )
        })}
      </div>
    ) : (
      <div className="no-issues">All items were checked off.</div>
    )}
  </div>
)

const renderDetailedChecklist = () => (
  <div className="checklist-section page-break-before">
    <h2>Detailed Inspection Checklist</h2>

    <h3 style={{ marginTop: 0 }}>Issues Found</h3>
    {itemsWithIssues.length > 0 ? (
      <div className="issues-list">
        {itemsWithIssues.map((item: InspectionItem) => {
          const { primary, secondary } = getTitleParts(item)
          const sev = getSeverity(item)

          return (
            <div
              key={`issue-${item.id || item.itemName}`}
              className={`issue-item issue-item-${severityLabel(sev).toLowerCase()}`}
            >
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

    <h3 style={{ marginTop: 24 }}>All Checklist Items</h3>
    <div className="detailed-checklist-list">
      {items.map((item: InspectionItem) => {
        const { primary, secondary } = getTitleParts(item)
        const sev = getSeverity(item)
        const completed = isCompleted(item)
        const statusText = completed ? (sev > 0 ? 'Issue Found' : 'Completed') : 'Not Completed'
        const statusClass = completed ? (sev > 0 ? 'status-issue' : 'status-complete') : 'status-incomplete'

        return (
          <div key={`detail-${item.id || item.itemName}`} className="detailed-checklist-item">
            <div className="detailed-checklist-header">
              <div>
                <div className="detailed-checklist-title">{primary || '—'}</div>
                {secondary ? <div className="detailed-checklist-subtitle">{secondary}</div> : null}
              </div>

              <div className="detailed-badges">
                <span className={`status-badge ${statusClass}`}>{statusText}</span>
                <span className={`severity-badge severity-${severityLabel(sev).toLowerCase()}`}>
                  Severity {sev}/10
                </span>
              </div>
            </div>

            <div className="detailed-checklist-notes">
              <strong>Notes:</strong> {item.notes?.trim() || '—'}
            </div>
          </div>
        )
      })}
    </div>

    <h3 style={{ marginTop: 24 }}>Completed With No Issues</h3>
    {completedWithNoIssues.length > 0 ? (
      <div className="completed-list">
        {completedWithNoIssues.map((item) => {
          const { primary } = getTitleParts(item)
          return (
            <div key={`complete-${item.id || item.itemName}`} className="completed-item">
              <div className="completed-check">✓</div>
              <div>
                <div className="completed-name">{primary || '—'}</div>
                {item.notes ? <div className="completed-notes">{item.notes}</div> : null}
              </div>
            </div>
          )
        })}
      </div>
    ) : (
      <div className="no-issues">No completed items without issues were recorded.</div>
    )}

    <h3 style={{ marginTop: 24 }}>Not Completed</h3>
    {incompleteItems.length > 0 ? (
      <div className="issues-list">
        {sortedIncompleteItems.map((item: InspectionItem) => {
          const { primary, secondary } = getTitleParts(item)
          const sev = getSeverity(item)

          return (
            <div key={`incomplete-${item.id || item.itemName}`} className="issue-item">
              <div className="issue-header">
                <div className="issue-title">{primary || '—'}</div>
                <div className="severity-badge severity-low">Not Completed</div>
              </div>

              {secondary ? <div className="item-notes"><strong>Item:</strong> {secondary}</div> : null}
              <div className="item-notes"><strong>Severity:</strong> {sev}/10</div>
              {item.notes ? <div className="issue-notes"><strong>Notes:</strong> {item.notes}</div> : null}
            </div>
          )
        })}
      </div>
    ) : (
      <div className="no-issues">All items were checked off.</div>
    )}
  </div>
)
 const handleGenerateInvoice = async (generated: any) => {
  try {
    setInvoiceData(generated)
    setShowInvoiceModal(false)
    setShowInvoicePrint(true)

    const lineItems = buildCrmInvoiceLineItems(generated)

    if (!customerEmail) {
      throw new Error('Customer email is required to create a CRM invoice.')
    }

    if (lineItems.length === 0) {
      throw new Error('Add at least one invoice line item before generating.')
    }

    const { data: invoiceResult, error: invoiceError } = await supabase.rpc(
      'create_crm_invoice_from_tuneup',
      {
        p_email: customerEmail,
        p_full_name: customerName || null,
        p_phone: null,
        p_service_address: address || null,
        p_city: null,
        p_state: null,
        p_zip_code: null,
        p_invoice_date: inspectionDate || new Date().toISOString().slice(0, 10),
        p_due_date: inspectionDate || new Date().toISOString().slice(0, 10),
        p_work_completed_date: inspectionDate || new Date().toISOString().slice(0, 10),
        p_tech_name: technicianName || null,
        p_notes: generalNotes || null,
        p_line_items: lineItems,
      }
    )

    if (invoiceError) throw invoiceError

    console.log('CRM invoice created', invoiceResult)
    alert(`CRM invoice created ✅ ${invoiceResult?.invoice_number || ''}`)
  } catch (err: any) {
    console.error('Failed to create CRM invoice:', err)
    alert(err?.message || 'Failed to create CRM invoice')
  }
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

  const getInspectionIdFromUrl = (): string => {
    try {
      // Hash routing: https://.../#/inspection/<inspectionId>
      const hash = typeof window !== 'undefined' ? window.location.hash || '' : ''
      const m = hash.match(/#\/inspection\/([^/?#]+)/)
      return (m?.[1] || '').trim()
    } catch {
      return ''
    }
  }
const buildCrmInvoiceLineItems = (invoiceData: any) => {
  const items: Array<{
    description: string
    material_cost: number
    labor_cost: number
    total_cost: number
  }> = []

  if (invoiceData?.services?.furnace) {
    items.push({
      description: 'Furnace Tune-Up',
      material_cost: 0,
      labor_cost: Number(invoiceData.services.furnacePrice || 0),
      total_cost: Number(invoiceData.services.furnacePrice || 0),
    })
  }

  if (invoiceData?.services?.ac) {
    items.push({
      description: 'AC/Heat Pump Service',
      material_cost: 0,
      labor_cost: Number(invoiceData.services.acPrice || 0),
      total_cost: Number(invoiceData.services.acPrice || 0),
    })
  }

  if (invoiceData?.services?.hot_water_tank) {
    items.push({
      description: 'Hot Water Tank Service',
      material_cost: 0,
      labor_cost: Number(invoiceData.services.hotWaterPrice || 0),
      total_cost: Number(invoiceData.services.hotWaterPrice || 0),
    })
  }

  for (const suggestion of invoiceData?.approvedSuggestions || []) {
    items.push({
      description: suggestion.suggestion,
      material_cost: 0,
      labor_cost: Number(suggestion.price || 0),
      total_cost: Number(suggestion.price || 0),
    })
  }

  for (const work of invoiceData?.additionalWork || []) {
    if ((work?.description || '').trim() || Number(work?.price || 0) > 0) {
      items.push({
        description: (work.description || 'Additional Work').trim(),
        material_cost: 0,
        labor_cost: Number(work.price || 0),
        total_cost: Number(work.price || 0),
      })
    }
  }

  return items
}

  
const completeAndUploadToDashboard = async () => {
  try {
    if (uploading) return
    setUploading(true)
    setUploadError(null)

    if (!customerEmail) {
      throw new Error(
        'Customer email is required to attach this tune-up to the correct dashboard account.'
      )
    }

    const blob = await generatePdfBlob()

    const syncPayload = {
      p_email: customerEmail,
      p_full_name: customerName || null,
      p_phone: null,
      p_service_address: address || null,
      p_city: null,
      p_state: null,
      p_zip_code: null,
      p_auth_user_id: null,
    }

    console.log('ensure_customer_for_dashboard payload', syncPayload)

    const { data: ensureResult, error: ensureError } = await supabase.rpc(
      'ensure_customer_for_dashboard',
      syncPayload
    )

    if (ensureError) throw ensureError

    console.log('ensure_customer_for_dashboard result', ensureResult)

    const crmCustomerId = ensureResult?.customer_id as string | undefined

    if (!crmCustomerId) {
      throw new Error('Could not determine CRM customer id for dashboard upload.')
    }

    const serviceDate = inspectionDate || new Date().toISOString().slice(0, 10)
    const serviceId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : String(Date.now())

    const filePath = `${crmCustomerId}/${serviceDate}_${serviceId}.pdf`

    const { error: uploadErr } = await supabase.storage
      .from('service-docs')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadErr) throw uploadErr

    const publicUrl = supabase.storage
      .from('service-docs')
      .getPublicUrl(filePath)?.data?.publicUrl

    if (!publicUrl) {
      throw new Error('Could not generate public URL for the uploaded PDF.')
    }

    const inspectionId = getInspectionIdFromUrl() || serviceId

    const insertPayload = {
      inspection_id: inspectionId,
      report_url: publicUrl,
      customer_id: crmCustomerId,
      customer_name: customerName || null,
      customer_email: customerEmail || null,
      technician_name: technicianName || null,
      service_date: serviceDate || null,
      service_type: equipment?.[0]?.serviceType || 'tuneup',
      storage_path: filePath || null,
    }

    console.log('service_docs insert payload', insertPayload)

    const { error: insertErr } = await supabase
      .from('service_docs')
      .insert(insertPayload)

    if (insertErr) throw insertErr

    setUploadError(null)
    alert('Uploaded to customer dashboard ✅')
  } catch (err: any) {
    console.error('Upload to dashboard failed:', err)
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
  <InvoicePrintAny
    customerName={customerName}
    address={address}
    inspectionDate={inspectionDate}
    technicianName={technicianName}
    invoiceData={invoiceData}
  />
)}
<div className="report-view-toggle no-export">
  <button
    type="button"
    className="toggle-report-btn"
    onClick={() => setShowDetailedReport((prev) => !prev)}
  >
    {showDetailedReport ? 'Show Simple Report' : 'Show Detailed Report'}
  </button>

  <span className="report-view-label">
    {showDetailedReport
      ? 'Detailed report is showing. Export and email will include all checklist items and readings.'
      : 'Simple report is showing. Export and email will include the customer-friendly summary.'}
  </span>
</div>
  

      {/* Everything inside this ref is what gets turned into the PDF */}
      <div ref={reportRef} className="report-content">
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
            <div className="stat-label">Add-Ons</div>
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
          <h2>Add-Ons</h2>
          {sortedSuggestions.length > 0 ? (
            <div style={{ display: 'grid', gap: 16 }}>
              {sortedSuggestions.map((suggestion: any, idx: number) => (
                <div key={idx} className="recommendation-card">
                  <div className="recommendation-header">
                    <div className="recommendation-title">
                      {suggestion?.title ?? 'Add-On'}
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
            <div className="no-issues">No add-ons selected.</div>
          )}
        </div>

        <div className="general-notes-section">
          <h2>General Notes</h2>
          <div className="general-notes">{generalNotes || '—'}</div>
        </div>

              {showDetailedReport ? renderDetailedChecklist() : renderSimpleChecklist()}
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
    selectedSuggestions={selectedSuggestions}
    onClose={() => setShowInvoiceModal(false)}
    onGenerateInvoice={handleGenerateInvoice}
  />
)}
    </div>
  )
}
