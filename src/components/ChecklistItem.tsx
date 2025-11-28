import { useState } from 'react'

interface ChecklistItemProps {
  itemName: string
  completed: boolean
  notes: string
  severity: number
  onToggle: () => void
  onNotesChange: (notes: string) => void
  onSeverityChange: (severity: number) => void
}

export function ChecklistItem({
  itemName,
  completed,
  notes,
  severity,
  onToggle,
  onNotesChange,
  onSeverityChange
}: ChecklistItemProps) {
  const [showNotes, setShowNotes] = useState(false)

  const getSeverityColor = (level: number) => {
    if (level === 0) return '#e5e7eb'
    if (level <= 3) return '#fef3c7'
    if (level <= 6) return '#fed7aa'
    if (level <= 8) return '#fecaca'
    return '#fca5a5'
  }

  const getSeverityLabel = (level: number) => {
    if (level === 0) return 'No Issue'
    if (level <= 3) return 'Minor'
    if (level <= 6) return 'Moderate'
    if (level <= 8) return 'Significant'
    return 'Critical'
  }

  return (
    <div className="checklist-item">
      <div className="item-header">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={completed}
            onChange={onToggle}
            className="checkbox"
          />
          <span className={completed ? 'completed-text' : ''}>{itemName}</span>
        </label>
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="notes-toggle"
        >
          {showNotes ? 'Hide Details' : 'Add Details'}
        </button>
      </div>

      {showNotes && (
        <div className="item-details">
          <div className="severity-section">
            <label className="severity-label">
              Severity: <strong>{getSeverityLabel(severity)}</strong> ({severity}/10)
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={severity}
              onChange={(e) => onSeverityChange(parseInt(e.target.value))}
              className="severity-slider"
              style={{
                background: `linear-gradient(to right, ${getSeverityColor(severity)} 0%, ${getSeverityColor(severity)} ${severity * 10}%, #e5e7eb ${severity * 10}%, #e5e7eb 100%)`
              }}
            />
          </div>

          <div className="notes-section">
            <label className="notes-label">Notes:</label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add any notes or observations..."
              className="notes-textarea"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  )
}
