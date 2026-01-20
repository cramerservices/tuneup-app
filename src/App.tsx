import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import { ServiceSelection } from './components/ServiceSelection'
import { InspectionFormUpdated } from './components/InspectionFormUpdated'
import { SummaryReport } from './components/SummaryReport'
import { MaintenancePlansPage } from './components/MaintenancePlansPage'

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

function InspectionFlow() {
  const [currentStep, setCurrentStep] = useState<AppStep>('service-selection')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)

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

  const handleBackToServiceSelection = () => {
    setCurrentStep('service-selection')
  }

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <>
      {currentStep === 'service-selection' && (
        <ServiceSelection onServicesSelected={handleServicesSelected} />
      )}

      {currentStep === 'inspection' && (
        <InspectionFormUpdated
          serviceTypes={selectedServices}
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
        {/* Your existing inspection workflow */}
        <Route path="/" element={<InspectionFlow />} />

        {/* New membership plans page */}
        <Route path="/maintenance-plans" element={<MaintenancePlansPage />} />

        {/* Anything else -> go home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
  )
}

export default App
