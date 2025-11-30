import { useState } from 'react'
import { getSuggestionInfo } from '../data/suggestionPitches'

interface ItemState {
  itemName: string
  completed: boolean
  notes: string
  severity: number
}

interface SummaryReportProps {
  customerName: string
  address: string
  technicianName: string
  inspectionDate: string
  items: ItemState[]
  selectedSuggestions: string[]
  generalNotes: string
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
  onBack,
  onExportPDF
}: SummaryReportProps) {
  const [showFullReport, setShowFullReport] = useState(false)
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
        <button onClick={onExportPDF} className="btn btn-primary">
          Export as PDF
        </button>
      </div>
    </div>
  )
}
