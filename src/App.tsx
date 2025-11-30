import { useState } from 'react'
import { ServiceSelection } from './components/ServiceSelection'
import { InspectionFormUpdated } from './components/InspectionFormUpdated'
import { SummaryReport } from './components/SummaryReport'
import './App.css'

type AppStep = 'service-selection' | 'inspection' | 'summary'

interface ItemState {
  itemName: string
  completed: boolean
  notes: string
  severity: number
}

interface SummaryData {
  customerName: string
  address: string
  technicianName: string
  inspectionDate: string
  items: ItemState[]
  selectedSuggestions: string[]
  generalNotes: string
}

function App() {
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
    <div className="app">
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
          onBack={handleBackToInspection}
          onExportPDF={handleExportPDF}
        />
      )}
    </div>
  )
}

export default App
