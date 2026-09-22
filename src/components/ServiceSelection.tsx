import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface ServiceSelectionProps {
  onNext: (services: string[]) => void
  onViewSaved?: () => void
}

export function ServiceSelection({ onNext, onViewSaved }: ServiceSelectionProps) {
  const navigate = useNavigate()
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  const services = [
    { id: 'furnace', label: 'Furnace Tune Up', icon: '🔥' },
    { id: 'ac', label: 'AC/Heat Pump', icon: '❄️' },
    { id: 'mini_split', label: 'Mini Split', icon: '🌀' },
    { id: 'hot_water_tank', label: 'Hot Water Tank', icon: '💧' },
  ]

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const handleContinue = () => {
    if (selectedServices.length === 0) return
    onNext(selectedServices)
  }

  return (
    <div className="service-selection">
      <div className="service-selection-header">
        <h1>Select Service Type</h1>
        <p>Select what you’re servicing so the checklist matches the job.</p>

        <div style={{marginTop:20,padding:20,background:'#eef5ff',borderRadius:12}}>
          <h2 style={{margin:'0 0 8px'}}>Service or repair without a tune-up?</h2>
          <button className="btn btn-primary btn-large" type="button" onClick={()=>navigate('/quick-invoice')}>Quick Invoice & Collect Payment</button>
        </div>
        {onViewSaved && (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={onViewSaved}>
              View Saved Inspections
            </button>
          </div>
        )}
      </div>

      <div className="service-cards">
        {services.map((svc) => {
          const isSelected = selectedServices.includes(svc.id)
          return (
            <div
              key={svc.id}
              className={`service-card ${isSelected ? 'selected' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => toggleService(svc.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleService(svc.id)
                }
              }}
            >
              <div className="service-icon">{svc.icon}</div>
              <div className="service-label">{svc.label}</div>
            </div>
          )
        })}
      </div>

      <div className="service-selection-footer">
        <button
          className="btn btn-primary btn-large"
          onClick={handleContinue}
          disabled={selectedServices.length === 0}
          type="button"
        >
          Continue to Inspection
        </button>
      </div>
    </div>
  )
}

export default ServiceSelection
