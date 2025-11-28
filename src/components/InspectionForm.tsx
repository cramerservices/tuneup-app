import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { checklistData } from '../data/checklistItems'
import { ChecklistItem } from './ChecklistItem'

interface ItemState {
  category: string
  itemName: string
  completed: boolean
  notes: string
  severity: number
}

export function InspectionForm() {
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [technicianName, setTechnicianName] = useState('')
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0])
  const [generalNotes, setGeneralNotes] = useState('')
  const [items, setItems] = useState<ItemState[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    const initialItems: ItemState[] = []
    checklistData.forEach(category => {
      category.items.forEach(item => {
        initialItems.push({
          category: category.category,
          itemName: item,
          completed: false,
          notes: '',
          severity: 0
        })
      })
    })
    setItems(initialItems)
  }, [])

  const handleItemToggle = (index: number) => {
    const newItems = [...items]
    newItems[index].completed = !newItems[index].completed
    setItems(newItems)
  }

  const handleNotesChange = (index: number, notes: string) => {
    const newItems = [...items]
    newItems[index].notes = notes
    setItems(newItems)
  }

  const handleSeverityChange = (index: number, severity: number) => {
    const newItems = [...items]
    newItems[index].severity = severity
    setItems(newItems)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')

    try {
      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections')
        .insert({
          customer_name: customerName,
          address: address,
          technician_name: technicianName,
          inspection_date: inspectionDate,
          notes: generalNotes
        })
        .select()
        .single()

      if (inspectionError) throw inspectionError

      const itemsToInsert = items.map(item => ({
        inspection_id: inspection.id,
        category: item.category,
        item_name: item.itemName,
        completed: item.completed,
        notes: item.notes,
        severity: item.severity
      }))

      const { error: itemsError } = await supabase
        .from('inspection_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      setSaveMessage('Inspection saved successfully!')
      setTimeout(() => {
        handleReset()
      }, 2000)
    } catch (error) {
      console.error('Error saving inspection:', error)
      setSaveMessage('Error saving inspection. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setCustomerName('')
    setAddress('')
    setTechnicianName('')
    setInspectionDate(new Date().toISOString().split('T')[0])
    setGeneralNotes('')

    const resetItems: ItemState[] = []
    checklistData.forEach(category => {
      category.items.forEach(item => {
        resetItems.push({
          category: category.category,
          itemName: item,
          completed: false,
          notes: '',
          severity: 0
        })
      })
    })
    setItems(resetItems)
    setSaveMessage('')
  }

  const completedCount = items.filter(item => item.completed).length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="inspection-form">
      <header className="form-header">
        <h1>HVAC Tune-Up Checklist</h1>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          <span className="progress-text">{completedCount} / {totalCount} completed</span>
        </div>
      </header>

      <section className="customer-info">
        <h2>Customer Information</h2>
        <div className="form-grid">
          <div className="form-field">
            <label>Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
            />
          </div>
          <div className="form-field">
            <label>Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter service address"
            />
          </div>
          <div className="form-field">
            <label>Technician Name</label>
            <input
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="Enter technician name"
            />
          </div>
          <div className="form-field">
            <label>Inspection Date</label>
            <input
              type="date"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="checklist-section">
        <h2>Inspection Checklist</h2>
        {checklistData.map((category, categoryIndex) => (
          <div key={categoryIndex} className="category-section">
            <h3 className="category-title">{category.category}</h3>
            <div className="category-items">
              {category.items.map((item) => {
                const globalIndex = items.findIndex(
                  i => i.category === category.category && i.itemName === item
                )
                if (globalIndex === -1) return null
                const itemState = items[globalIndex]
                return (
                  <ChecklistItem
                    key={globalIndex}
                    itemName={itemState.itemName}
                    completed={itemState.completed}
                    notes={itemState.notes}
                    severity={itemState.severity}
                    onToggle={() => handleItemToggle(globalIndex)}
                    onNotesChange={(notes) => handleNotesChange(globalIndex, notes)}
                    onSeverityChange={(severity) => handleSeverityChange(globalIndex, severity)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="general-notes-section">
        <h2>General Notes</h2>
        <textarea
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Add any general notes or recommendations for the customer..."
          className="general-notes-textarea"
          rows={5}
        />
      </section>

      <div className="form-actions">
        {saveMessage && (
          <div className={`save-message ${saveMessage.includes('Error') ? 'error' : 'success'}`}>
            {saveMessage}
          </div>
        )}
        <button
          onClick={handleReset}
          className="btn btn-secondary"
          disabled={saving}
        >
          Reset Form
        </button>
        <button
          onClick={handleSave}
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Inspection'}
        </button>
      </div>
    </div>
  )
}
