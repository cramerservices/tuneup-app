import { useState } from 'react'

interface ServiceSelectionProps {
  onNext: (services: string[]) => void
  onViewSaved?: () => void
}

export function ServiceSelection({ onNext, onViewSaved }: ServiceSelectionProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  const services = [
    { id: 'furnace', label: 'Furnace Tune Up', icon: '🔥' },
    { id: 'ac', label: 'AC/Heat Pump', icon: '❄️' },
    { id: 'mini_split', label: 'Mini Split', icon: '🌀' },
    { id: 'hot_water_tank', label: 'Hot Water Tank', icon: '💧' },
  ]

  const toggleService = (id: string) => {
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const handleContinue = () => {
    if (selectedServices.length === 0) return
    onNext(selectedServices)
  }

  return (
    <div className="service-selection-page">
      <h1>Select Service Type</h1>

      <div className="service-selection-grid">
        {services.map((svc) => (
          <button
            key={svc.id}
            className={`service-card ${selectedServices.includes(svc.id) ? 'selected' : ''}`}
            onClick={() => toggleService(svc.id)}
            type="button"
          >
            <div className="service-card-icon">{svc.icon}</div>
            <div className="service-card-label">{svc.label}</div>
          </button>
        ))}
      </div>

      <div className="service-selection-footer">
        {onViewSaved && (
          <button className="btn btn-secondary" onClick={onViewSaved} type="button">
            View Saved Inspections
          </button>
        )}

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
