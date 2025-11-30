import { useState } from 'react'
import { getSuggestionInfo } from '../data/suggestionPitches'
import { InvoiceModal, InvoiceData } from './InvoiceModal'
import { InvoicePrint } from './InvoicePrint'

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

interface SummaryReportProps {
  customerName: string
  address: string
  technicianName: string
  inspectionDate: string
  items: ItemState[]
  selectedSuggestions: string[]
  generalNotes: string
  equipment: EquipmentInfo[]
  onBack: () => void
  onExportPDF: () => void
}

export function SummaryReport({
  customerName,
  address,
  technicianName,
  inspectionDate,
  items,
  selectedSuggestions,
  generalNotes,
  equipment,
  onBack,
  onExportPDF
}: SummaryReportProps) {
  const [showFullReport, setShowFullReport] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [showInvoicePrint, setShowInvoicePrint] = useState(false)

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'furnace': return 'Furnace'
      case 'ac': return 'AC/Heat Pump'
      case 'hot_water_tank': return 'Hot Water Tank'
      default: return type
    }
  }
  const getSeverityLabel = (level: number) => {
    if (level === 0) return 'No Issue'
    if (level <= 3) return 'Minor'
    if (level <= 6) return 'Moderate'
    if (level <= 8) return 'Significant'
    return 'Critical'
  }

  const getSeverityColor = (level: number) => {
    if (level === 0) return '#6b7280'
    if (level <= 3) return '#f59e0b'
    if (level <= 6) return '#f97316'
    if (level <= 8) return '#ef4444'
    return '#dc2626'
  }

  const uncheckedItems = items.filter(item => !item.completed)
  const itemsWithIssues = uncheckedItems.filter(item => item.severity > 0 || item.notes.trim() !== '')
  const completedItems = items.filter(item => item.completed)

  const handleGenerateInvoice = (data: InvoiceData) => {
    setInvoiceData(data)
    setShowInvoiceModal(false)
    setShowInvoicePrint(true)

    setTimeout(() => {
      window.print()
    }, 100)
  }

  const handleCloseInvoicePrint = () => {
    setShowInvoicePrint(false)
    setInvoiceData(null)
  }

  if (showInvoicePrint && invoiceData) {
    return (
      <div>
        <div className="no-print">
          <button onClick={handleCloseInvoicePrint} className="btn btn-secondary" style={{ margin: '20px' }}>
            ← Back to Summary
          </button>
        </div>
        <InvoicePrint
          customerName={customerName}
          address={address}
          inspectionDate={inspectionDate}
          technicianName={technicianName}
          invoiceData={invoiceData}
        />
      </div>
    )
  }

  return (
    <div className="summary-report" id="summary-report">
      <div className="summary-header">
        <h1>Inspection Summary Report</h1>
        <div className="summary-info">
          <div className="info-row">
            <span className="info-label">Customer:</span>
            <span className="info-value">{customerName || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Address:</span>
            <span className="info-value">{address || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Technician:</span>
            <span className="info-value">{technicianName || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Date:</span>
            <span className="info-value">{inspectionDate}</span>
          </div>
        </div>
      </div>

      {equipment && equipment.length > 0 && (
        <div className="summary-section equipment-summary">
          <h2>Equipment Information</h2>
          <div className="equipment-summary-grid">
            {equipment.map((equip, index) => (
              <div key={index} className="equipment-summary-card">
                <h3 className="equipment-summary-title">{getServiceTypeLabel(equip.serviceType)}</h3>
                <div className="equipment-details">
                  {equip.brand && (
                    <div className="equipment-detail-row">
                      <span className="detail-label">Brand:</span>
                      <span className="detail-value">{equip.brand}</span>
                    </div>
                  )}
                  {equip.modelNumber && (
                    <div className="equipment-detail-row">
                      <span className="detail-label">Model:</span>
                      <span className="detail-value">{equip.modelNumber}</span>
                    </div>
                  )}
                  {equip.serialNumber && (
                    <div className="equipment-detail-row">
                      <span className="detail-label">Serial:</span>
                      <span className="detail-value">{equip.serialNumber}</span>
                    </div>
                  )}
                  {!equip.brand && !equip.modelNumber && !equip.serialNumber && (
                    <p className="no-equipment-info">No equipment information provided</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="summary-section">
        <div className="section-header-with-toggle">
          <h2>Items Requiring Attention</h2>
          <button
            onClick={() => setShowFullReport(!showFullReport)}
            className="toggle-report-btn"
          >
            {showFullReport ? 'Show Issues Only' : 'Show Full Report'}
          </button>
        </div>
        {itemsWithIssues.length === 0 ? (
          <div className="no-issues">
            <p>All items have been completed with no issues noted.</p>
          </div>
        ) : (
          <div className="issues-list">
            {itemsWithIssues.map((item, index) => (
              <div key={index} className="issue-item">
                <div className="issue-header">
                  <h3 className="issue-title">{item.itemName}</h3>
                  <span
                    className="severity-badge"
                    style={{
                      backgroundColor: getSeverityColor(item.severity),
                      color: 'white'
                    }}
                  >
                    {getSeverityLabel(item.severity)} ({item.severity}/10)
                  </span>
                </div>
                {item.notes && (
                  <div className="issue-notes">
                    <strong>Notes:</strong> {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showFullReport && completedItems.length > 0 && (
        <div className="summary-section completed-section">
          <h2>Completed Items (No Issues)</h2>
          <div className="completed-list">
            {completedItems.map((item, index) => (
              <div key={index} className="completed-item">
                <div className="completed-check">✓</div>
                <div className="completed-name">{item.itemName}</div>
                {item.notes && (
                  <div className="completed-notes">{item.notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {generalNotes && (
        <div className="summary-section">
          <h2>General Notes</h2>
          <div className="general-notes-display">
            {generalNotes}
          </div>
        </div>
      )}

      {selectedSuggestions.length > 0 && (
        <div className="summary-section recommendations-section">
          <h2>Recommended Upgrades & Improvements</h2>
          <p className="section-intro">Based on today's inspection, we recommend the following upgrades to enhance your system's performance, efficiency, and reliability:</p>
          <div className="recommendations-list">
            {selectedSuggestions.map((suggestion, index) => {
              const info = getSuggestionInfo(suggestion)
              return (
                <div key={index} className="recommendation-card">
                  <div className="recommendation-header">
                    <h3 className="recommendation-title">{suggestion}</h3>
                    {info.price > 0 && (
                      <span className="recommendation-price">
                        {info.priceLabel || `$${info.price}`}
                      </span>
                    )}
                  </div>
                  <p className="recommendation-pitch">{info.pitch}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="summary-section maintenance-plans-section">
        <h2>Protect Your Investment with a Maintenance Plan</h2>
        <p className="section-intro">Keep your systems running smoothly year-round and avoid costly emergency repairs. Choose the plan that fits your needs:</p>

        <div className="maintenance-plans-grid">
          <div className="maintenance-plan-card basic-plan">
            <div className="plan-header">
              <h3 className="plan-title">Basic Care Plan</h3>
              <div className="plan-price">
                <span className="price-amount">$20</span>
                <span className="price-period">/month</span>
              </div>
            </div>
            <div className="plan-benefits">
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">One annual system tune-up</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">Two service calls per year - service fees waived</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">Priority scheduling for your comfort</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">Transferable if you sell your home</span>
              </div>
            </div>
            <p className="plan-pitch">
              Perfect for homeowners who want reliable comfort without surprises. Regular maintenance prevents costly breakdowns
              and keeps your system running efficiently—often paying for itself through energy savings and avoiding emergency repairs.
            </p>
          </div>

          <div className="maintenance-plan-card premium-plan">
            <div className="plan-badge">Most Popular</div>
            <div className="plan-header">
              <h3 className="plan-title">Premium Care Plan</h3>
              <div className="plan-price">
                <span className="price-amount">$30</span>
                <span className="price-period">/month</span>
              </div>
            </div>
            <div className="plan-benefits">
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">Annual HVAC system tune-up included</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">Annual hot water tank maintenance included</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">Three service calls per year - service fees waived</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">24/7 priority emergency response</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">15% discount on all repairs and parts</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">✓</span>
                <span className="benefit-text">Transferable if you sell your home</span>
              </div>
            </div>
            <p className="plan-pitch">
              Our most comprehensive protection covers all your home comfort systems. Enjoy maximum energy efficiency,
              extended equipment life, and significant savings on repairs. Members save an average of $600 per year compared to
              non-members—making this the smart choice for complete peace of mind.
            </p>
          </div>
        </div>

        <div className="plans-cta">
          <p className="cta-text">Ready to protect your investment? Ask your technician about enrolling today!</p>
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-value">{items.filter(i => i.completed).length}</div>
          <div className="stat-label">Items Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{uncheckedItems.length}</div>
          <div className="stat-label">Items Not Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{itemsWithIssues.length}</div>
          <div className="stat-label">Items with Issues</div>
        </div>
      </div>

      <div className="summary-actions">
        <button onClick={onBack} className="btn btn-secondary">
          Back to Inspection
        </button>
        <button onClick={() => setShowInvoiceModal(true)} className="btn btn-success">
          Generate Invoice
        </button>
        <button onClick={onExportPDF} className="btn btn-primary">
          Export as PDF
        </button>
      </div>

      {showInvoiceModal && (
        <InvoiceModal
          selectedSuggestions={selectedSuggestions}
          onClose={() => setShowInvoiceModal(false)}
          onGenerateInvoice={handleGenerateInvoice}
        />
      )}
    </div>
  )
}
