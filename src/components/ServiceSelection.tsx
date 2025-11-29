import { useState } from 'react'

interface ServiceSelectionProps {
  onServicesSelected: (services: string[]) => void
}

export function ServiceSelection({ onServicesSelected }: ServiceSelectionProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  const services = [
    { id: 'furnace', label: 'Furnace Tune Up', icon: '🔥' },
    { id: 'ac', label: 'AC/Heat Pump', icon: '❄️' },
    { id: 'hot_water_tank', label: 'Hot Water Tank', icon: '💧' }
  ]

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(s => s !== serviceId)
        : [...prev, serviceId]
    )
  }

  const handleContinue = () => {
    if (selectedServices.length > 0) {
      onServicesSelected(selectedServices)
    }
  }

  return (
    <div className="service-selection">
      <div className="service-selection-header">
        <h1>Select Service Type</h1>
        <p>Choose which tune-ups the customer wants</p>
      </div>

      <div className="service-cards">
        {services.map(service => (
          <button
            key={service.id}
            className={`service-card ${selectedServices.includes(service.id) ? 'selected' : ''}`}
            onClick={() => toggleService(service.id)}
          >
            <div className="service-icon">{service.icon}</div>
            <div className="service-label">{service.label}</div>
            <div className="service-checkbox">
              {selectedServices.includes(service.id) && (
                <span className="checkmark">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="service-selection-footer">
        <button
          className="btn btn-primary btn-large"
          onClick={handleContinue}
          disabled={selectedServices.length === 0}
        >
          Continue to Inspection
        </button>
      </div>
    </div>
  )
}
