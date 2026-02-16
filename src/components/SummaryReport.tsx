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
    const { data, error } = await supabase.from('portal_customers').select('id').eq('email', cleanEmail).maybeSingle()
    if (error) throw error
    if (!data?.id) throw new Error('No portal customer found with that email.')
    return data.id as string
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
    <div className="summary-report-page">
      <div className="summary-header">
        <h1>Tune-Up Summary Report</h1>
        <p className="completion-status">{completionPercentage}% Complete</p>
      </div>

      {showInvoicePrint && invoiceData && (
        <InvoicePrint invoiceData={invoiceData} onClose={handleCloseInvoicePrint} />
      )}

      <div ref={reportRef} className="report-content">
        <div className="report-section">
          <h2>Customer Information</h2>
          <p>
            <strong>Name:</strong> {customerName}
          </p>
          <p>
            <strong>Email:</strong> {customerEmail || '—'}
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

        <div className="report-section">
          <h2>Equipment</h2>
          {equipment.length > 0 ? (
            <div className="equipment-grid">
              {equipment.map((eq: any, idx: number) => (
                <div key={idx} className="equipment-card">
                  <p>
                    <strong>Service Type:</strong> {eq.serviceType || '—'}
                  </p>
                  <p>
                    <strong>Brand:</strong> {eq.brand || '—'}
                  </p>
                  <p>
                    <strong>Model:</strong> {eq.model || '—'}
                  </p>
                  <p>
                    <strong>Serial:</strong> {eq.serial || '—'}
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
            <p className="no-items">No equipment details recorded.</p>
          )}
        </div>

        <div className="report-section">
          <h2>Recommendations</h2>
          {sortedSuggestions.length > 0 ? (
            <ul className="recommendations-list">
              {sortedSuggestions.map((suggestion: any, idx: number) => (
                <li key={idx} className="recommendation-item">
                  <strong>{suggestion?.title ?? 'Recommendation'}</strong>
                  {suggestion?.description && <p>{suggestion.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-items">No recommendations selected.</p>
          )}
        </div>

        <div className="report-section">
          <h2>General Notes</h2>
          <p>{generalNotes || 'No additional notes provided.'}</p>
        </div>

        {showFullReport && (
          <div className="report-section">
            <h2>Inspection Checklist</h2>

            <div className="checklist-grid">
              <div className="checklist-column">
                <h3>Completed Items</h3>
                {checkedItems.length > 0 ? (
                  <ul>
                    {checkedItems.map((item) => (
                      <li key={item.id}>
                        {item.label}
                        {item.notes && <div className="item-notes">{item.notes}</div>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-items">No items were marked as completed.</p>
                )}
              </div>

              <div className="checklist-column">
                <h3>Issues Found</h3>
                {itemsWithIssues.length > 0 ? (
                  <ul>
                    {itemsWithIssues.map((item) => (
                      <li key={item.id}>
                        {item.label}
                        {item.notes && <div className="item-notes">{item.notes}</div>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-items">No issues were found during the inspection.</p>
                )}
              </div>
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

        {onSendEmail && (
          <button onClick={onSendEmail} className="btn btn-outline" disabled={Boolean(isSending)}>
            {isSending ? 'Sending…' : 'Send Email'}
          </button>
        )}

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
        <InvoiceModal
          customerName={customerName}
          onClose={() => setShowInvoiceModal(false)}
          onGenerate={handleGenerateInvoice}
        />
      )}
    </div>
  )
}
