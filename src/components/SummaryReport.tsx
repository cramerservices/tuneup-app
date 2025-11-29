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
  onBack,
  onExportPDF
}: SummaryReportProps) {
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
        <h2>Items Requiring Attention</h2>
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

      {selectedSuggestions.length > 0 && (
        <div className="summary-section">
          <h2>Additional Recommendations</h2>
          <ul className="suggestions-list">
            {selectedSuggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
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
