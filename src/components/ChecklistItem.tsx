import { useState } from 'react'

interface ChecklistItemProps {
  itemName: string
  completed: boolean
  notes: string
  severity: number
  repairPrice: string
  onToggle: () => void
  onNotesChange: (notes: string) => void
  onSeverityChange: (severity: number) => void
  onRepairPriceChange: (repairPrice: string) => void
}

const checklistQuickNotes: Record<string, { good: string; na: string }> = {
  'Thermostat Check': {
    good: 'Thermostat was checked and is operating properly at the time of inspection.',
    na: 'Thermostat check was not applicable for this inspection.',
  },
  'Inspect Flame Sensor': {
    good: 'Flame sensor was inspected and appears to be in good condition at the time of inspection.',
    na: 'Flame sensor inspection was not applicable for this system.',
  },
  'Inspect Electrical Components Of Furnace': {
    good: 'Furnace electrical components were inspected and appear to be operating properly.',
    na: 'Furnace electrical component inspection was not applicable for this system.',
  },
  'Inspect Flue And Venting': {
    good: 'Flue and venting were inspected with no visible concerns found.',
    na: 'Flue and venting inspection was not applicable for this system.',
  },
  'Carbon Monoxide Test': {
    good: 'Carbon monoxide test was completed and no unsafe levels were detected at the time of inspection.',
    na: 'Carbon monoxide test was not applicable for this inspection.',
  },
  'Check Burner Flame': {
    good: 'Burner flame was checked and appears normal at the time of inspection.',
    na: 'Burner flame check was not applicable for this system.',
  },
  'Inspect Air Filter': {
    good: 'Air filter was inspected and appears to be in acceptable condition.',
    na: 'Air filter inspection was not applicable for this system.',
  },
  'Inspect And Clean Interior Coil': {
    good: 'Interior coil was inspected and appears to be in good condition at the time of inspection.',
    na: 'Interior coil inspection/cleaning was not applicable for this system.',
  },
  'Inspection Of Squirrel Cage': {
    good: 'Squirrel cage was inspected and appears to be in acceptable condition.',
    na: 'Squirrel cage inspection was not applicable for this system.',
  },
  'Inspect Heat Exchanger': {
    good: 'Heat exchanger was visually inspected with no visible concerns found at the time of inspection.',
    na: 'Heat exchanger inspection was not applicable for this system.',
  },
  'Inspect Gas Connect For Leaks (Furnace)': {
    good: 'Furnace gas connection was checked and no leak was detected at the time of inspection.',
    na: 'Furnace gas connection inspection was not applicable for this system.',
  },
  'Test Safety Switches': {
    good: 'Safety switches were tested and appear to be operating properly.',
    na: 'Safety switch testing was not applicable for this system.',
  },
  'Inspect Duct Connections For Leaks/Disconnects (Visible Areas)': {
    good: 'Visible duct connections were inspected with no major leaks or disconnects found.',
    na: 'Duct connection inspection was not applicable for this inspection.',
  },
  'Check Carbon Monoxide Level': {
    good: 'Carbon monoxide level was checked and no unsafe readings were detected.',
    na: 'Carbon monoxide level check was not applicable for this inspection.',
  },
  'Inspect Humidifier Condition': {
    good: 'Humidifier condition was inspected and appears acceptable at the time of inspection.',
    na: 'Humidifier inspection was not applicable because no humidifier was present or connected to this system.',
  },
  'Inspect UV Light Condition': {
    good: 'UV light condition was inspected and appears to be operating properly.',
    na: 'UV light inspection was not applicable because no UV light was present or connected to this system.',
  },
  'Inspect Air Purifier Condition': {
    good: 'Air purifier condition was inspected and appears acceptable at the time of inspection.',
    na: 'Air purifier inspection was not applicable because no air purifier was present or connected to this system.',
  },
  'Inspect Media Filter Condition': {
    good: 'Media filter condition was inspected and appears acceptable at the time of inspection.',
    na: 'Media filter inspection was not applicable because no media filter was present.',
  },
  'Check If Germicidal Bulb Needs Replacement': {
    good: 'Germicidal bulb was checked and does not appear to need replacement at this time.',
    na: 'Germicidal bulb check was not applicable because no germicidal bulb was present.',
  },
  'Inspect Return Duct Condition': {
    good: 'Return duct condition was inspected with no visible concerns found.',
    na: 'Return duct inspection was not applicable for this inspection.',
  },
  'Inspect Supply Duct Condition': {
    good: 'Supply duct condition was inspected with no visible concerns found.',
    na: 'Supply duct inspection was not applicable for this inspection.',
  },
  'Check For Visible Air Leaks At Duct Connections': {
    good: 'Visible duct connections were checked and no major air leaks were found.',
    na: 'Air leak check at duct connections was not applicable for this inspection.',
  },
  'Check Filter Rack Seal': {
    good: 'Filter rack seal was inspected and appears to be sealing properly.',
    na: 'Filter rack seal inspection was not applicable for this system.',
  },
  'Check For Airflow Concerns': {
    good: 'Airflow was checked and no major airflow concerns were found at the time of inspection.',
    na: 'Airflow check was not applicable for this inspection.',
  },
  'Inspect Electrical Components Of AC Unit': {
    good: 'AC electrical components were inspected and appear to be operating properly.',
    na: 'AC electrical component inspection was not applicable for this system.',
  },
  'Check Interior Coils And Line Set For Refrigerant Leaks': {
    good: 'Interior coils and line set were inspected with no visible refrigerant leak concerns found.',
    na: 'Interior coil and line set refrigerant leak check was not applicable for this system.',
  },
  'Check Exterior Coils And Line Set For Refrigerant Leaks': {
    good: 'Exterior coils and line set were inspected with no visible refrigerant leak concerns found.',
    na: 'Exterior coil and line set refrigerant leak check was not applicable for this system.',
  },
  'Measure Refrigerant Pressures If Leak Is Suspected': {
    good: 'Refrigerant pressures were checked and appeared acceptable at the time of inspection.',
    na: 'Refrigerant pressures were not measured because no refrigerant leak was suspected at the time of inspection.',
  },
  'Clear Condensate Pan Of Debris And Flush Drain': {
    good: 'Condensate pan and drain were checked and appear to be draining properly.',
    na: 'Condensate pan and drain service was not applicable for this system.',
  },
  'Clean Condenser': {
    good: 'Condenser was cleaned and appears to be in acceptable condition.',
    na: 'Condenser cleaning was not applicable for this system.',
  },
  'Check Refrigerant Line Insulation': {
    good: 'Refrigerant line insulation was inspected and appears acceptable.',
    na: 'Refrigerant line insulation check was not applicable for this system.',
  },
  'Inspect Outdoor Fan/Motor': {
    good: 'Outdoor fan and motor were inspected and appear to be operating properly.',
    na: 'Outdoor fan/motor inspection was not applicable for this system.',
  },
  'Inspect Evaporator Coil Condition': {
    good: 'Evaporator coil condition was inspected and no major concerns were found.',
    na: 'Evaporator coil inspection was not applicable for this system.',
  },
  'Inspect Primary Condensate Drain': {
    good: 'Primary condensate drain was inspected and appears to be draining properly.',
    na: 'Primary condensate drain inspection was not applicable for this system.',
  },
  'Inspect Secondary Condensate Drain': {
    good: 'Secondary condensate drain was inspected with no major concerns found.',
    na: 'Secondary condensate drain inspection was not applicable for this system.',
  },
  'Inspect Drain Safety Switch': {
    good: 'Drain safety switch was inspected and appears to be operating properly.',
    na: 'Drain safety switch inspection was not applicable for this system.',
  },
  'Inspect Condensate Drain Pan': {
    good: 'Condensate drain pan was inspected with no major concerns found.',
    na: 'Condensate drain pan inspection was not applicable for this system.',
  },
  'Inspect TXV Bulb Position And Insulation': {
    good: 'TXV bulb position and insulation were inspected and appear acceptable.',
    na: 'TXV bulb inspection was not applicable for this system.',
  },
  'Add Drain Pan Treatment If Needed': {
    good: 'Drain pan treatment was added as needed during the inspection.',
    na: 'Drain pan treatment was not needed or was not applicable for this system.',
  },
}

export function ChecklistItem({
  itemName,
  completed,
  notes,
  severity,
  repairPrice,
  onToggle,
  onNotesChange,
  onSeverityChange,
  onRepairPriceChange,
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

  const applyQuickNote = (type: 'good' | 'na') => {
    const quickNote = checklistQuickNotes[itemName]?.[type]

    if (!quickNote) {
      const fallback =
        type === 'good'
          ? `${itemName} was checked and appears acceptable at the time of inspection.`
          : `${itemName} was not applicable for this inspection.`

      onNotesChange(fallback)
    } else {
      onNotesChange(quickNote)
    }

    onSeverityChange(0)
    onRepairPriceChange('')
    setShowNotes(true)

    if (!completed) {
      onToggle()
    }
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

        <div className="item-action-buttons">
          <button
            type="button"
            onClick={() => applyQuickNote('good')}
            className="quick-note-btn quick-note-good"
          >
            Good
          </button>

          <button
            type="button"
            onClick={() => applyQuickNote('na')}
            className="quick-note-btn quick-note-na"
          >
            N/A
          </button>

          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="notes-toggle"
          >
            {showNotes ? 'Hide Details' : 'Add Details'}
          </button>
        </div>
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
                background: `linear-gradient(to right, ${getSeverityColor(severity)} 0%, ${getSeverityColor(severity)} ${
                  severity * 10
                }%, #e5e7eb ${severity * 10}%, #e5e7eb 100%)`,
              }}
            />
          </div>



          {severity >= 5 && (
            <div className="repair-price-section">
              <label className="repair-price-label">Estimated Price to Fix:</label>
              <div className="repair-price-input-wrap">
                <span className="repair-price-dollar">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={repairPrice}
                  onChange={(e) => onRepairPriceChange(e.target.value)}
                  placeholder="Enter repair price"
                  className="repair-price-input"
                />
              </div>
              <p className="repair-price-help">This price will show on the customer PDF report.</p>
            </div>
          )}

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
