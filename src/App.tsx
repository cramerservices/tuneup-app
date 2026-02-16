import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from './lib/supabase'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

import { ServiceSelection } from './components/ServiceSelection'
import { InspectionFormUpdated } from './components/InspectionFormUpdated'
import { SummaryReport } from './components/SummaryReport'
import { MaintenancePlansPage } from './components/MaintenancePlansPage'
import { SavedInspections } from './components/SavedInspections'

import './App.css'

type AppStep = 'service-selection' | 'inspection' | 'summary'

interface ItemState {
  itemName: string
  completed: boolean
  notes: string
  severity: number
}

interface EquipmentInfo {
  serviceType: string
  brand: string
  modelNumber: string
  serialNumber: string
}

interface SummaryData {
  customerName: string
  address: string
  technicianName: string
  inspectionDate: string
  customerEmail?: string
  items: ItemState[]
  selectedSuggestions: string[]
  generalNotes: string
  equipment: EquipmentInfo[]
}

function SavedInspectionsWrapper() {
  const navigate = useNavigate()

  const handleLoadInspection = async (inspectionId: string) => {
    navigate(`/inspection/${inspectionId}`)
  }

  const handleNewInspection = () => {
    navigate('/')
  }

  return (
    <SavedInspections
      onLoadInspection={handleLoadInspection}
      onNewInspection={handleNewInspection}
    />
  )
}

function TechAuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSessionUserId(data.session?.user?.id ?? null)
      setLoading(false)
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user?.id ?? null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>

  if (!sessionUserId) {
    return (
      <div style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
        <h2 style={{ marginBottom: 12 }}>Tech Login</h2>
        <p style={{ marginTop: 0, opacity: 0.8 }}>
          This app uploads PDFs to a private bucket, so techs must log in.
        </p>

        <div style={{ display: 'grid', gap: 10 }}>
          <input
            placeholder="Tech email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Tech password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={signIn}>Sign in</button>
          {error && <div style={{ color: 'crimson' }}>{error}</div>}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 8 }}>
        <button onClick={signOut}>Sign out</button>
      </div>
      {children}
    </div>
  )
}

function InspectionWrapper() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<AppStep>('service-selection')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [inspectionId, setInspectionId] = useState<string | undefined>(undefined)

  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleServicesSelected = (services: string[]) => {
    setSelectedServices(services)
    setInspectionId(undefined)
    setCurrentStep('inspection')
  }

  const handleViewSummary = (data: SummaryData) => {
    setSummaryData(data)
    setCurrentStep('summary')
  }

  const handleBackToInspection = () => setCurrentStep('inspection')

  const handleSendEmail = async () => {
    if (!summaryData?.customerEmail) {
      setMessage('No customer email found.')
      return
    }

    // If you already have an email Edge Function, keep your existing code here.
    // Leaving as a placeholder.
    setIsSendingEmail(true)
    try {
      setMessage('Email sending not wired here yet.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleExportPDF = async () => {
    if (!summaryData || !inspectionId) {
      setMessage('Missing summary data or inspection id.')
      return
    }

    try {
      setMessage('Generating PDF…')

      const reportEl = document.getElementById('summary-report-root')
      if (!reportEl) {
        setMessage('Could not find report element.')
        return
      }

      const canvas = await html2canvas(reportEl, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF('p', 'pt', 'letter')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let y = 0
      pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight)

      while (imgHeight + y > pageHeight) {
        y -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight)
      }

      const pdfBlob = pdf.output('blob')

      // 1) Find the customer's auth.user id (portal_customers.id)
      const customerEmail = summaryData.customerEmail?.trim().toLowerCase()
      if (!customerEmail) {
        setMessage('Customer email is required to attach PDF to customer.')
        return
      }

      const { data: customerRow, error: custErr } = await supabase
        .from('portal_customers')
        .select('id')
        .ilike('email', customerEmail)
        .maybeSingle()

      if (custErr) throw custErr
      if (!customerRow?.id) {
        setMessage('No portal customer found with that email.')
        return
      }

      const customerId = customerRow.id as string
      const serviceDate = (summaryData.inspectionDate || '').slice(0, 10) || new Date().toISOString().slice(0, 10)

      // ✅ THIS is where the "<customer_id>/<service_date>_<service_id>.pdf" goes.
      // "path" is the file path INSIDE the bucket.
      const bucket = 'service-docs'
      const pdfPath = `${customerId}/${serviceDate}_${inspectionId}.pdf`

      setMessage('Uploading PDF…')

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(pdfPath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadErr) throw uploadErr

      setMessage('Finalizing tune-up…')

      // 2) Call RPC to:
      // - insert into services_completed (including pdf_path)
      // - decrement tune_ups_remaining
      const { error: rpcErr } = await supabase.rpc('finalize_tuneup', {
        p_inspection_id: inspectionId,
        p_customer_id: customerId,
        p_pdf_path: pdfPath,
        p_service_date: serviceDate,
      })

      if (rpcErr) throw rpcErr

      setMessage('✅ PDF saved + membership updated.')
    } catch (err: any) {
      setMessage(`Export failed: ${err?.message ?? String(err)}`)
    }
  }

  return (
    <div className="app-container">
      {message && (
        <div style={{ padding: 10, marginBottom: 10, background: '#f3f3f3' }}>
          {message}
        </div>
      )}

      {currentStep === 'service-selection' && (
        <ServiceSelection onNext={handleServicesSelected} />
      )}

      {currentStep === 'inspection' && (
        <InspectionFormUpdated
          selectedServices={selectedServices}
          onViewSummary={(data: SummaryData, id?: string) => {
            if (id) setInspectionId(id)
            handleViewSummary(data)
          }}
          onBack={() => setCurrentStep('service-selection')}
          inspectionId={inspectionId}
        />
      )}

      {currentStep === 'summary' && summaryData && (
        <SummaryReport
          data={summaryData}
          onBack={handleBackToInspection}
          onSendEmail={handleSendEmail}
          onExportPDF={handleExportPDF}
          isSending={isSendingEmail}
        />
      )}
    </div>
  )
}

function InspectionByIdWrapper() {
  const { inspectionId } = useParams()
  return <Navigate to={`/`} replace />
}

export default function App() {
  return (
    <TechAuthGate>
      <Routes>
        <Route path="/" element={<InspectionWrapper />} />
        <Route path="/inspection/:inspectionId" element={<InspectionByIdWrapper />} />
        <Route path="/saved" element={<SavedInspectionsWrapper />} />
        <Route path="/plans" element={<MaintenancePlansPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TechAuthGate>
  )
}

