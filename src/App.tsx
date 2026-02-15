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

function InspectionWrapper() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<AppStep>('service-selection')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [inspectionId, setInspectionId] = useState<string | undefined>(undefined)

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
  const handleBackToServiceSelection = () => {
    setCurrentStep('service-selection')
    setInspectionId(undefined)
  }

  const handleExportPDF = async () => {
    try {
      if (!summaryData) throw new Error('Missing summary data')
      if (!inspectionId) throw new Error('Missing inspection ID (save the inspection first)')

      // 1) Locate the report DOM (SummaryReport already has id="summary-report")
      const reportEl = document.getElementById('summary-report')
      if (!reportEl) throw new Error('Could not find the report element (#summary-report)')

      // 2) Render report -> canvas
      const canvas = await html2canvas(reportEl, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')

      // 3) Canvas -> PDF (A4), supports multi-page
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297

      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const pdfBlob = pdf.output('blob') as Blob

      // 4) Find the customer's auth UUID (portal_customers.id) so the PDF can be private per-customer
      let customerId: string | null = null

      // Prefer email if you have it
      if (summaryData.customerEmail) {
        const { data, error } = await supabase
          .from('portal_customers')
          .select('id')
          .eq('email', summaryData.customerEmail)
          .maybeSingle()

        if (error) throw error
        customerId = data?.id ?? null
      }

      // Fallback: match by service address (works if your addresses match exactly)
      if (!customerId) {
        const { data, error } = await supabase
          .from('portal_customers')
          .select('id')
          .eq('service_address', summaryData.address)
          .maybeSingle()

        if (error) throw error
        customerId = data?.id ?? null
      }

      if (!customerId) {
        throw new Error(
          "Couldn't match this tune-up to a customer account. Add customer email to the form (recommended), or make sure the service address matches portal_customers.service_address exactly."
        )
      }

      // 5) Upload to private storage bucket
      const pdfPath = `${customerId}/${inspectionId}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('service-docs')
        .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true })

      if (uploadError) throw uploadError

      // 6) Finalize (creates services_completed row + decrements tune_ups_remaining)
      const { error: finalizeError } = await supabase.rpc('finalize_tuneup', {
        p_inspection_id: inspectionId,
        p_pdf_path: pdfPath
      })

      if (finalizeError) throw finalizeError

      alert('Done! The tune-up is saved to Service History and the PDF is now available in the customer dashboard.')
    } catch (err: any) {
      console.error(err)
      alert(err?.message ?? 'Failed to export + save the PDF')
    }
  }

  return (
    <>
      {currentStep === 'service-selection' && (
        <ServiceSelection onServicesSelected={handleServicesSelected} onViewSaved={() => navigate('/saved')} />
      )}

      {currentStep === 'inspection' && (
        <InspectionFormUpdated
          serviceTypes={selectedServices}
          inspectionId={inspectionId}
          onViewSummary={handleViewSummary}
          onBackToServiceSelection={handleBackToServiceSelection}
        />
      )}

      {currentStep === 'summary' && summaryData && (
        <SummaryReport
          customerName={summaryData.customerName}
          address={summaryData.address}
          technicianName={summaryData.technicianName}
          inspectionDate={summaryData.inspectionDate}
          items={summaryData.items}
          selectedSuggestions={summaryData.selectedSuggestions}
          generalNotes={summaryData.generalNotes}
          equipment={summaryData.equipment}
          onBack={handleBackToInspection}
          onExportPDF={handleExportPDF}
        />
      )}
    </>
  )
}

function EditInspectionWrapper() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [serviceTypes, setServiceTypes] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState<AppStep>('inspection')
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)

  useEffect(() => {
    if (id) {
      loadInspectionData(id)
    }
  }, [id])

  const loadInspectionData = async (inspectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select('service_types')
        .eq('id', inspectionId)
        .single()

      if (error) throw error

      setServiceTypes(data?.service_types || [])
    } catch (error) {
      console.error('Error loading inspection:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewSummary = (data: SummaryData) => {
    setSummaryData(data)
    setCurrentStep('summary')
  }

  const handleBackToInspection = () => setCurrentStep('inspection')

  const handleBackToServiceSelection = () => {
    navigate('/saved')
  }

  const handleExportPDF = async () => {
    try {
      if (!summaryData) throw new Error('Missing summary data')
      if (!id) throw new Error('Missing inspection ID')

      const reportEl = document.getElementById('summary-report')
      if (!reportEl) throw new Error('Could not find the report element (#summary-report)')

      const canvas = await html2canvas(reportEl, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297

      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const pdfBlob = pdf.output('blob') as Blob

      let customerId: string | null = null

      if (summaryData.customerEmail) {
        const { data, error } = await supabase
          .from('portal_customers')
          .select('id')
          .eq('email', summaryData.customerEmail)
          .maybeSingle()
        if (error) throw error
        customerId = data?.id ?? null
      }

      if (!customerId) {
        const { data, error } = await supabase
          .from('portal_customers')
          .select('id')
          .eq('service_address', summaryData.address)
          .maybeSingle()
        if (error) throw error
        customerId = data?.id ?? null
      }

      if (!customerId) {
        throw new Error(
          "Couldn't match this tune-up to a customer account. Add customer email to the form (recommended), or make sure the service address matches portal_customers.service_address exactly."
        )
      }

      const pdfPath = `${customerId}/${id}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('service-docs')
        .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true })

      if (uploadError) throw uploadError

      const { error: finalizeError } = await supabase.rpc('finalize_tuneup', {
        p_inspection_id: id,
        p_pdf_path: pdfPath
      })

      if (finalizeError) throw finalizeError

      alert('Done! The tune-up is saved to Service History and the PDF is now available in the customer dashboard.')
    } catch (err: any) {
      console.error(err)
      alert(err?.message ?? 'Failed to export + save the PDF')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <h2>Loading...</h2>
      </div>
    )
  }

  return (
    <>
      {currentStep === 'inspection' && (
        <InspectionFormUpdated
          serviceTypes={serviceTypes}
          inspectionId={id}
          onViewSummary={handleViewSummary}
          onBackToServiceSelection={handleBackToServiceSelection}
        />
      )}

      {currentStep === 'summary' && summaryData && (
        <SummaryReport
          customerName={summaryData.customerName}
          address={summaryData.address}
          technicianName={summaryData.technicianName}
          inspectionDate={summaryData.inspectionDate}
          items={summaryData.items}
          selectedSuggestions={summaryData.selectedSuggestions}
          generalNotes={summaryData.generalNotes}
          equipment={summaryData.equipment}
          onBack={handleBackToInspection}
          onExportPDF={handleExportPDF}
        />
      )}
    </>
  )
}

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<InspectionWrapper />} />
        <Route path="/inspection/:id" element={<EditInspectionWrapper />} />
        <Route path="/saved" element={<SavedInspectionsWrapper />} />
        <Route path="/maintenance-plans" element={<MaintenancePlansPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
