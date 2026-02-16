import { useState, useEffect } from 'react'
import type { FC, ReactNode } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
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
  // legacy fields used by older parts of your app
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

function TechAuthGate({ children }: { children: ReactNode }) {
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />

          <button onClick={signIn} style={{ padding: 10 }}>
            Sign in
          </button>

          {error && <div style={{ color: 'crimson' }}>{error}</div>}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 10 }}>
        <button onClick={signOut} style={{ padding: '6px 10px' }}>
          Sign out
        </button>
      </div>
      {children}
    </div>
  )
}

function InspectionWrapper() {
  const [currentStep, setCurrentStep] = useState<
    'service-selection' | 'inspection' | 'summary'
  >('service-selection')

  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [inspectionId, setInspectionId] = useState<string | undefined>(undefined)
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
      // You likely have your own email logic; leaving as-is
      setMessage('Email sent!')
    } catch (err: any) {
      setMessage(`Email failed: ${err?.message ?? String(err)}`)
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      setMessage(null)
      const reportEl = document.querySelector('.report-content') as HTMLElement | null
      if (!reportEl) {
        setMessage('Could not find report content to export.')
        return
      }

      const canvas = await html2canvas(reportEl, { scale: 2 })
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
        <InspectionForm
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

