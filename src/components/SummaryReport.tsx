import { useRef, useState } from 'react'
import { getSuggestionInfo } from '../data/suggestionPitches'
import { InvoiceModal } from './InvoiceModal'
import { InvoicePrint } from './InvoicePrint'

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

interface SummaryReportProps {
  items: InspectionItem[]
  generalNotes: string
  selectedSuggestions: string[] // Suggestion IDs
  equipment: Array<{
    serviceType: 'AC' | 'Furnace'
    equipmentType?: string
    brand?: string
    model?: string
    serial?: string
    age?: string
    notes?: string
  }>
  customerName: string
  customerEmail?: string
  address: string
  technicianName: string
  inspectionDate: string
  onBack: () => void
  onExportPDF: () => void
}

export function SummaryReport({
  items,
  generalNotes,
  selectedSuggestions,
  equipment,
  customerName,
  customerEmail,
  address,
  technicianName,
  inspectionDate,
  onBack,
  onExportPDF
}: SummaryReportProps) {
  const [showFullReport, setShowFullReport] = useState(true)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const [showInvoicePrint, setShowInvoicePrint] = useState(false)

  const reportRef = useRef<HTMLDivElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Get summary statistics
  const checkedItems = items.filter((item) => item.checked)
  const itemsWithIssues = items.filter((item) => item.issueFound)
  const completionPercentage = items.length > 0 ? Math.round((checkedItems.length / items.length) * 100) : 0

  // Get suggestions info
  const suggestionDetails = selectedSuggestions.map((id) => getSuggestionInfo(id)).filter(Boolean)

  // Sort suggestions by priority
  const sortedSuggestions = [...suggestionDetails].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return (priorityOrder[b?.priority || 'low'] || 0) - (priorityOrder[a?.priority || 'low'] || 0)
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
    const { data, error } = await supabase.from('portal_customers').select('id').eq('email', cleanEmail).maybeSingle()

    if (error) throw error
    if (!data?.id) throw new Error('No paid member found with that email.')
    return data.id as string
  }

  const generatePdfBlob = async () => {
    const el = reportRef.current
    if (!el) throw new Error('Report element not found')

    const opt = {
      margin: 10,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const worker: any = (html2pdf as any)().set(opt).from(el)
    const pdf = await worker.toPdf().get('pdf')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob: Blob = (pdf as any).output('blob')
    return blob
  }

  const completeAndUploadToDashboard = async () => {
    try {
      setUploadError(null)
      setUploading(true)

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
        upsert: true
      })
      if (uploadErr) throw uploadErr

      const { error: rpcErr } = await supabase.rpc('finalize_tuneup', {
        p_customer_id: customerId,
        p_service_type: 'tuneup',
        p_service_date: inspectionDate,
        p_technician_name: technicianName,
        p_summary: 'Tune-up completed',
        p_work_completed: items
          .filter((item) => item.checked || item.issueFound)
          .map((item) => ({
            task: item.label,
            status: item.issueFound ? 'issue' : 'checked',
            notes: item.notes ?? ''
          })),
        p_recommendations: selectedSuggestions,
        p_pdf_path: pdfPath
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

  if (showInvoicePrint && invoiceData) {
    return <InvoicePrint invoiceData={invoiceData} onClose={handleCloseInvoicePrint} />
  }

  return (
    <div className="summary-report" id="summary-report">
      <div ref={reportRef}>
        <div className="summary-header">
          <h1>HVAC Service Summary Report</h1>
          <div className="customer-info">
            <p>
              <strong>Customer:</strong> {customerName}
            </p>
            <p>
              <strong>Address:</strong> {address}
            </p>
            <p>
              <strong>Technician:</strong> {technicianName}
            </p>
            <p>
              <strong>Date:</strong> {inspectionDate}
            </p>
          </div>
        </div>

        <div className="completion-summary">
          <div className="completion-stats">
            <div className="stat-item">
              <span className="stat-number">{completionPercentage}%</span>
              <span className="stat-label">Completed</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{checkedItems.length}</span>
              <span className="stat-label">Tasks Completed</span>
            </div>
            <div className="stat-item issues">
              <span className="stat-number">{itemsWithIssues.length}</span>
              <span className="stat-label">Issues Found</span>
            </div>
          </div>
        </div>

        <div className="equipment-section">
          <h2>Equipment Information</h2>
          {equipment.map((eq, idx) => (
            <div key={idx} className="equipment-card">
              <h3>{eq.serviceType} System</h3>
              <div className="equipment-details">
                {eq.equipmentType && (
                  <p>
                    <strong>Type:</strong> {eq.equipmentType}
                  </p>
                )}
                {eq.brand && (
                  <p>
                    <strong>Brand:</strong> {eq.brand}
                  </p>
                )}
                {eq.model && (
                  <p>
                    <strong>Model:</strong> {eq.model}
                  </p>
                )}
                {eq.serial && (
                  <p>
                    <strong>Serial:</strong> {eq.serial}
                  </p>
                )}
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
            </div>
          ))}
        </div>

        {generalNotes && (
          <div className="notes-section">
            <h2>General Notes</h2>
            <p>{generalNotes}</p>
          </div>
        )}

        {sortedSuggestions.length > 0 && (
          <div className="suggestions-section">
            <h2>Recommended Services & Upgrades</h2>
            {sortedSuggestions.map((suggestion, idx) => (
              <div key={idx} className={`suggestion-card priority-${suggestion?.priority}`}>
                <div className="suggestion-header">
                  <h3>{suggestion?.title}</h3>
                  <span className={`priority-badge priority-${suggestion?.priority}`}>
                    {suggestion?.priority?.toUpperCase()} PRIORITY
                  </span>
                </div>
                <p className="suggestion-description">{suggestion?.description}</p>
                <div className="suggestion-benefits">
                  <strong>Benefits:</strong>
                  <p>{suggestion?.benefits}</p>
                </div>
                <div className="estimated-cost">
                  <strong>Estimated Cost:</strong> {suggestion?.estimated_cost}
                </div>
              </div>
            ))}
          </div>
        )}

        {showFullReport && (
          <div className="detailed-report">
            <h2>Detailed Inspection Checklist</h2>

            <div className="checklist-section">
              <h3>Completed Tasks</h3>
              {checkedItems.length > 0 ? (
                <ul className="checklist-items">
                  {checkedItems.map((item) => (
                    <li key={item.id} className="checklist-item completed">
                      <span className="item-label">✓ {item.label}</span>
                      {item.notes && <span className="item-notes">{item.notes}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-items">No tasks were marked as completed.</p>
              )}
            </div>

            <div className="checklist-section issues">
              <h3>Issues Found</h3>
              {itemsWithIssues.length > 0 ? (
                <ul className="checklist-items">
                  {itemsWithIssues.map((item) => (
                    <li key={item.id} className="checklist-item issue">
                      <span className="item-label">⚠ {item.label}</span>
                      {item.notes && <span className="item-notes">{item.notes}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-items">No issues were found during the inspection.</p>
              )}
            </div>
          </div>
        )}

        <div className="report-toggle">
          <button onClick={() => setShowFullReport(!showFullReport)} className="btn btn-outline">
            {showFullReport ? 'Hide Detailed Report' : 'Show Detailed Report'}
          </button>
        </div>
      </div>

      <div className="summary-actions">
        <button onClick={onBack} className="btn btn-secondary">
          Back to Inspection
        </button>
        <button onClick={() => setShowInvoiceModal(true)} className="btn btn-success">
          Generate Invoice
        </button>

        <button
          onClick={completeAndUploadToDashboard}
          className="btn btn-primary"
          disabled={uploading}
          title="Uploads the PDF into the member dashboard and decreases tuneups remaining by 1"
        >
          {uploading ? 'Saving…' : 'Complete & Save to Customer Dashboard'}
        </button>

        <button onClick={onExportPDF} className="btn btn-secondary">
          Export as PDF
        </button>
      </div>

      {uploadError && (
        <div style={{ marginTop: 12, color: '#b91c1c', fontSize: 14 }}>
          {uploadError}
        </div>
      )}

      {showInvoiceModal && (
        <InvoiceModal customerName={customerName} onClose={() => setShowInvoiceModal(false)} onGenerate={handleGenerateInvoice} />
      )}
    </div>
  )
}
