import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from './lib/supabase'

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

  const handleExportPDF = () => {
    window.print()
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
        .maybeSingle()

      if (error) throw error
      if (!data) {
        navigate('/saved')
        return
      }

      setServiceTypes(data.service_types || [])
    } catch (error) {
      console.error('Error loading inspection:', error)
      navigate('/saved')
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

  const handleExportPDF = () => {
    window.print()
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
