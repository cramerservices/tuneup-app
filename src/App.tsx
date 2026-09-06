import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'

import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'

import { supabase } from './lib/supabase'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

import { ServiceSelection } from './components/ServiceSelection'
import { InspectionFormUpdated as InspectionForm } from './components/InspectionFormUpdated'
import { SummaryReport } from './components/SummaryReport'
import { MaintenancePlansPage } from './components/MaintenancePlansPage'
import { SavedInspections } from './components/SavedInspections'

import './App.css'

interface ItemState {
  id?: string
  label?: string
  checked?: boolean
  issueFound?: boolean
  notes?: string
  itemName: string
  completed: boolean
  severity: number
  repairPrice?: string | number | null
  photoUrls?: string[]
  photo_urls?: string[]
  photoUrl?: string
  photo_url?: string
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
  systemReadings?: SystemReadings
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

  if (loading) {
    return (
      <main className="auth-shell">
        <div className="auth-loading" role="status" aria-live="polite">
          <span className="auth-spinner" aria-hidden="true" />
          <span>Preparing technician access…</span>
        </div>
      </main>
    )
  }

  if (!sessionUserId) {
    return (
      <main className="auth-shell">
        <section className="auth-card" aria-labelledby="tech-login-title">
          <div className="auth-brand">
            <img src="/CramerLogoText.png" alt="Cramer Services" />
            <span className="auth-app-label">HVAC Tune-Up Checklist</span>
          </div>

          <div className="auth-heading">
            <span className="auth-lock" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10m-10 0h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Zm5.5 4.5v2" />
              </svg>
            </span>
            <div>
              <p className="auth-eyebrow">Staff access</p>
              <h1 id="tech-login-title">Welcome back</h1>
              <p>Sign in to start or review an HVAC inspection.</p>
            </div>
          </div>

          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (!authBusy) signIn()
            }}
          >
            <label htmlFor="tech-email">Email address</label>
            <input
              id="tech-email"
              name="email"
              type="email"
              placeholder="name@cramerservices.com"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="tech-password">Password</label>
            <input
              id="tech-password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="auth-error" role="alert">
                <span aria-hidden="true">!</span>
                <p>{error}</p>
              </div>
            )}

            <button className="auth-submit" type="submit" disabled={authBusy}>
              {authBusy ? (
                <><span className="auth-button-spinner" aria-hidden="true" /> Signing in…</>
              ) : (
                <>Sign in <span aria-hidden="true">→</span></>
              )}
            </button>
          </form>

          <p className="auth-security-note">
            Authorized Cramer Services technicians only
          </p>
        </section>
      </main>
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
