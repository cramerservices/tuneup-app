import { useState, useEffect } from 'react'
import type { FC, ReactNode } from 'react'

import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'

import { supabase } from './lib/supabase'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

import { ServiceSelection } from './components/ServiceSelection'
import * as InspectionFormModule from './components/InspectionFormUpdated'
import { SummaryReport } from './components/SummaryReport'
import { MaintenancePlansPage } from './components/MaintenancePlansPage'
import { SavedInspections } from './components/SavedInspections'

import './App.css'

const InspectionForm = ((InspectionFormModule as any).InspectionFormUpdated ??
  (InspectionFormModule as any).default) as FC<any>

interface ItemState {
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

  const handleLoadInspection = (inspectionId: string) => {
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

function TechAuthGate({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authBusy, setAuthBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (!mounted) return

        if (sessionError) {
          setError(sessionError.message)
          setSessionUserId(null)
          return
        }

        setSessionUserId(data.session?.user?.id ?? null)
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message ?? 'Unable to initialize authentication.')
        setSessionUserId(null)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setError(null)
      setSessionUserId(session?.user?.id ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = async () => {
    setError(null)
    setAuthBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setAuthBusy(false)
  }

  const signOut = async () => {
    setError(null)
    setAuthBusy(true)

    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      setError(error.message)
    }

    setAuthBusy(false)
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />

          <button onClick={signIn} disabled={authBusy} style={{ padding: 10 }}>
            {authBusy ? 'Signing in…' : 'Sign in'}
          </button>

          {error && <div style={{ color: 'crimson' }}>{error}</div>}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 10 }}>
        <button onClick={signOut} disabled={authBusy} style={{ padding: '6px 10px' }}>
          {authBusy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
      {children}
    </div>
  )
}

function InspectionWrapper({ initialInspectionId }: { initialInspectionId?: string }) {
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState<'service-selection' | 'inspection' | 'summary'>(
    initialInspectionId ? 'inspection' : 'service-selection'
  )

  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [inspectionId, setInspectionId] = useState<string | undefined>(initialInspectionId)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleServicesSelected = (services: string[]) => {
    setSelectedServices(services)
    setCurrentStep('inspection')
  }

  const handleViewSummary = (data: SummaryData) => {
    setSummaryData(data)
    setCurrentStep('summary')
  }

  const handleBackToInspection = () => {
    setCurrentStep('inspection')
  }

const handleSendEmail = async () => {
  try {
    setIsSendingEmail(true)
    setMessage(null)

    if (!summaryData) {
      throw new Error('No summary data found.')
    }

    if (!summaryData.customerEmail?.trim()) {
      throw new Error('Customer email is required.')
    }

    const reportEl = document.querySelector('.report-content') as HTMLElement | null
    if (!reportEl) {
      throw new Error('Could not find report content to email.')
    }

    const canvas = await html2canvas(reportEl, { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF('p', 'pt', 'letter')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let position = 0
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)

    while (imgHeight + position > pageHeight) {
      position -= pageHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    }

    const pdfBase64 = pdf.output('datauristring').split(',')[1]

    const { data, error } = await supabase.functions.invoke('send-estimate-email', {
      body: {
        to: summaryData.customerEmail,
        customerName: summaryData.customerName,
        inspectionDate: summaryData.inspectionDate,
        technicianName: summaryData.technicianName,
        address: summaryData.address,
        pdfBase64,
        filename: `tuneup-summary-${summaryData.customerName || 'customer'}.pdf`,
      },
    })

    if (error) throw error

    console.log('Email function response:', data)
    setMessage('Email sent!')
  } catch (err: any) {
    console.error('Email failed:', err)
    setMessage(`Email failed: ${err?.message ?? String(err)}`)
  } finally {
    setIsSendingEmail(false)
  }
}

const handleExportPDF = async () => {
  const hiddenEls = Array.from(document.querySelectorAll('.no-export')) as HTMLElement[]

  try {
    setMessage(null)

    hiddenEls.forEach((el) => {
      el.dataset.prevDisplay = el.style.display || ''
      el.style.display = 'none'
    })

    const reportEl = document.querySelector('.report-content') as HTMLElement | null
    if (!reportEl) {
      setMessage('Could not find report content to export.')
      return
    }

    const canvas = await html2canvas(reportEl, { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF('p', 'pt', 'letter')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let position = 0
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)

    while (imgHeight + position > pageHeight) {
      position -= pageHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    }

    pdf.save('tuneup-summary.pdf')
    setMessage('PDF exported.')
  } catch (err: any) {
    setMessage(`Export failed: ${err?.message ?? String(err)}`)
  } finally {
    hiddenEls.forEach((el) => {
      el.style.display = el.dataset.prevDisplay || ''
      delete el.dataset.prevDisplay
    })
  }
}

  return (
    <div className="app">
      {message && (
        <div style={{ padding: 10, marginBottom: 10, background: '#f3f3f3' }}>
          {message}
        </div>
      )}

      {currentStep === 'service-selection' && (
        <ServiceSelection
          onNext={handleServicesSelected}
          onViewSaved={() => navigate('/saved')}
        />
      )}

      {currentStep === 'inspection' && (
        <InspectionForm
          selectedServices={selectedServices}
          inspectionId={inspectionId}
          onViewSummary={(data: SummaryData) => {
            handleViewSummary(data)
          }}
          onBackToServiceSelection={() => {
            setInspectionId(undefined)
            setCurrentStep('service-selection')
          }}
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
  return <InspectionWrapper initialInspectionId={inspectionId} />
}

export default function App() {
  return (
    <TechAuthGate>
      <Routes>
        <Route path="/" element={<InspectionWrapper />} />
        <Route path="/dashboard" element={<SavedInspectionsWrapper />} />
        <Route path="/inspection/:inspectionId" element={<InspectionByIdWrapper />} />
        <Route path="/saved" element={<SavedInspectionsWrapper />} />
        <Route path="/plans" element={<MaintenancePlansPage />} />
        <Route path="/dashboard/plans" element={<MaintenancePlansPage />} />
        <Route path="/maintenance-plans" element={<MaintenancePlansPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TechAuthGate>
  )
}
