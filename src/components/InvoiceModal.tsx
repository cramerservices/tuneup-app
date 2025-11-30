import { useState, useEffect } from 'react'

interface ServicePrice {
  furnace: boolean
  ac: boolean
  hot_water_tank: boolean
  furnacePrice: number
  acPrice: number
  hotWaterPrice: number
}

interface ApprovedSuggestion {
  suggestion: string
  price: number
}

interface AdditionalWork {
  description: string
  price: number
}

interface InvoiceModalProps {
  selectedSuggestions: string[]
  onClose: () => void
  onGenerateInvoice: (invoiceData: InvoiceData) => void
}

export interface InvoiceData {
  services: ServicePrice
  approvedSuggestions: ApprovedSuggestion[]
  additionalWork: AdditionalWork[]
  subtotal: number
  tax: number
  total: number
}

export function InvoiceModal({
  selectedSuggestions,
  onClose,
  onGenerateInvoice
}: InvoiceModalProps) {
  const [services, setServices] = useState<ServicePrice>({
    furnace: false,
    ac: false,
    hot_water_tank: false,
    furnacePrice: 125,
    acPrice: 125,
    hotWaterPrice: 125
  })

  const [approvedSuggestions, setApprovedSuggestions] = useState<ApprovedSuggestion[]>([])
  const [additionalWork, setAdditionalWork] = useState<AdditionalWork[]>([])

  useEffect(() => {
    const selectedCount = [services.furnace, services.ac, services.hot_water_tank].filter(Boolean).length

    let furnacePrice = 125
    let acPrice = 125
    let hotWaterPrice = 125

    if (selectedCount === 2) {
      furnacePrice = 100
      acPrice = 100
      hotWaterPrice = 100
    } else if (selectedCount === 3) {
      furnacePrice = 83.33
      acPrice = 83.33
      hotWaterPrice = 83.34
    }

    setServices(prev => ({
      ...prev,
      furnacePrice: services.furnace ? furnacePrice : prev.furnacePrice,
      acPrice: services.ac ? acPrice : prev.acPrice,
      hotWaterPrice: services.hot_water_tank ? hotWaterPrice : prev.hotWaterPrice
    }))
  }, [services.furnace, services.ac, services.hot_water_tank])

  const toggleService = (service: 'furnace' | 'ac' | 'hot_water_tank') => {
    setServices(prev => ({ ...prev, [service]: !prev[service] }))
  }

  const updateServicePrice = (service: 'furnacePrice' | 'acPrice' | 'hotWaterPrice', value: number) => {
    setServices(prev => ({ ...prev, [service]: value }))
  }

  const toggleSuggestion = (suggestion: string) => {
    setApprovedSuggestions(prev => {
      const exists = prev.find(s => s.suggestion === suggestion)
      if (exists) {
        return prev.filter(s => s.suggestion !== suggestion)
      } else {
        return [...prev, { suggestion, price: 0 }]
      }
    })
  }

  const updateSuggestionPrice = (suggestion: string, price: number) => {
    setApprovedSuggestions(prev =>
      prev.map(s => s.suggestion === suggestion ? { ...s, price } : s)
    )
  }

  const addAdditionalWork = () => {
    setAdditionalWork(prev => [...prev, { description: '', price: 0 }])
  }

  const updateAdditionalWork = (index: number, field: 'description' | 'price', value: string | number) => {
    setAdditionalWork(prev =>
      prev.map((work, i) => i === index ? { ...work, [field]: value } : work)
    )
  }

  const removeAdditionalWork = (index: number) => {
    setAdditionalWork(prev => prev.filter((_, i) => i !== index))
  }

  const calculateTotal = () => {
    let subtotal = 0

    if (services.furnace) subtotal += services.furnacePrice
    if (services.ac) subtotal += services.acPrice
    if (services.hot_water_tank) subtotal += services.hotWaterPrice

    approvedSuggestions.forEach(s => subtotal += s.price)
    additionalWork.forEach(w => subtotal += w.price)

    const tax = subtotal * 0.0 // Adjust tax rate as needed
    const total = subtotal + tax

    return { subtotal, tax, total }
  }

  const handleGenerate = () => {
    const totals = calculateTotal()
    onGenerateInvoice({
      services,
      approvedSuggestions,
      additionalWork,
      ...totals
    })
  }

  const totals = calculateTotal()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content invoice-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Invoice</h2>
          <button onClick={onClose} className="modal-close-btn">✕</button>
        </div>

        <div className="modal-body">
          <div className="invoice-section">
            <h3>Services Performed</h3>
            <div className="invoice-items">
              <div className="invoice-item">
                <label className="invoice-checkbox-label">
                  <input
                    type="checkbox"
                    checked={services.furnace}
                    onChange={() => toggleService('furnace')}
                  />
                  <span>Furnace Tune-Up</span>
                </label>
                {services.furnace && (
                  <input
                    type="number"
                    value={services.furnacePrice}
                    onChange={(e) => updateServicePrice('furnacePrice', parseFloat(e.target.value) || 0)}
                    className="price-input"
                    step="0.01"
                  />
                )}
              </div>

              <div className="invoice-item">
                <label className="invoice-checkbox-label">
                  <input
                    type="checkbox"
                    checked={services.ac}
                    onChange={() => toggleService('ac')}
                  />
                  <span>AC/Heat Pump Service</span>
                </label>
                {services.ac && (
                  <input
                    type="number"
                    value={services.acPrice}
                    onChange={(e) => updateServicePrice('acPrice', parseFloat(e.target.value) || 0)}
                    className="price-input"
                    step="0.01"
                  />
                )}
              </div>

              <div className="invoice-item">
                <label className="invoice-checkbox-label">
                  <input
                    type="checkbox"
                    checked={services.hot_water_tank}
                    onChange={() => toggleService('hot_water_tank')}
                  />
                  <span>Hot Water Tank Service</span>
                </label>
                {services.hot_water_tank && (
                  <input
                    type="number"
                    value={services.hotWaterPrice}
                    onChange={(e) => updateServicePrice('hotWaterPrice', parseFloat(e.target.value) || 0)}
                    className="price-input"
                    step="0.01"
                  />
                )}
              </div>
            </div>
          </div>

          {selectedSuggestions.length > 0 && (
            <div className="invoice-section">
              <h3>Approved Recommendations</h3>
              <div className="invoice-items">
                {selectedSuggestions.map(suggestion => {
                  const isApproved = approvedSuggestions.find(s => s.suggestion === suggestion)
                  return (
                    <div key={suggestion} className="invoice-item">
                      <label className="invoice-checkbox-label">
                        <input
                          type="checkbox"
                          checked={!!isApproved}
                          onChange={() => toggleSuggestion(suggestion)}
                        />
                        <span>{suggestion}</span>
                      </label>
                      {isApproved && (
                        <input
                          type="number"
                          value={isApproved.price}
                          onChange={(e) => updateSuggestionPrice(suggestion, parseFloat(e.target.value) || 0)}
                          className="price-input"
                          placeholder="Price"
                          step="0.01"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="invoice-section">
            <h3>Additional Work</h3>
            <div className="invoice-items">
              {additionalWork.map((work, index) => (
                <div key={index} className="invoice-item additional-work-item">
                  <input
                    type="text"
                    value={work.description}
                    onChange={(e) => updateAdditionalWork(index, 'description', e.target.value)}
                    className="description-input"
                    placeholder="Description of work"
                  />
                  <input
                    type="number"
                    value={work.price}
                    onChange={(e) => updateAdditionalWork(index, 'price', parseFloat(e.target.value) || 0)}
                    className="price-input"
                    placeholder="Price"
                    step="0.01"
                  />
                  <button
                    onClick={() => removeAdditionalWork(index)}
                    className="remove-btn"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addAdditionalWork} className="btn btn-secondary btn-small">
              + Add Line Item
            </button>
          </div>

          <div className="invoice-totals">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.tax > 0 && (
              <div className="total-row">
                <span>Tax:</span>
                <span>${totals.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="total-row total-final">
              <span>Total:</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleGenerate} className="btn btn-primary">
            Generate Invoice
          </button>
        </div>
      </div>
    </div>
  )
}
