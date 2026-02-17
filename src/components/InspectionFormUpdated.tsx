import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getItemsForServices, additionalSuggestions } from '../data/checklistItems'
import { ChecklistItem as ChecklistItemComponent } from './ChecklistItem'

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

interface InspectionFormProps {
  // Accept either prop name so the app doesn't crash if parent passes selectedServices
  serviceTypes?: string[]
  selectedServices?: string[]
  inspectionId?: string
  onViewSummary: (data: {
    customerName: string
    address: string
    technicianName: string
    inspectionDate: string
    items: ItemState[]
    selectedSuggestions: string[]
    generalNotes: string
    equipment: EquipmentInfo[]
  }) => void
  onBackToServiceSelection: () => void
}

export function InspectionFormUpdated({ serviceTypes: serviceTypesProp, selectedServices, inspectionId, onViewSummary, onBackToServiceSelection }: InspectionFormProps) {
  const serviceTypes = (serviceTypesProp ?? selectedServices ?? []) as string[]
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [technicianName, setTechnicianName] = useState('')
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0])
  const [generalNotes, setGeneralNotes] = useState('')
  const [items, setItems] = useState<ItemState[]>([])
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([])
  const [equipment, setEquipment] = useState<EquipmentInfo[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { error } = await supabase.from('inspections').select('count').limit(1)
        if (error) {
          console.error('Database connection test failed:', error)
        }
      } catch (err) {
        console.error('Database connection error:', err)
      }
    }
    testConnection()
  }, [])

  useEffect(() => {
    if (inspectionId) {
      loadInspection(inspectionId)
    }
  }, [inspectionId])

  const loadInspection = async (id: string) => {
    setLoading(true)
    try {
      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (inspectionError) throw inspectionError
      if (!inspection) throw new Error('Inspection not found')

      setCustomerName(inspection.customer_name || '')
      setAddress(inspection.address || '')
      setTechnicianName(inspection.technician_name || '')
      // If this inspection is already linked to a customer, prefill their email (nice for editing)
      if (inspection.customer_id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', inspection.customer_id)
          .maybeSingle()
        if (prof?.email) setCustomerEmail(prof.email)
      }
      setInspectionDate(inspection.inspection_date || new Date().toISOString().split('T')[0])
      setGeneralNotes(inspection.notes || '')
      setSelectedSuggestions(inspection.selected_suggestions || [])

      const { data: itemsData, error: itemsError } = await supabase
        .from('inspection_items')
        .select('*')
        .eq('inspection_id', id)

      if (itemsError) throw itemsError

      const loadedItems: ItemState[] = (itemsData || []).map(item => ({
        itemName: item.item_name,
        completed: item.completed,
        notes: item.notes || '',
        severity: item.severity || 0
      }))

      setItems(loadedItems)

      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment_info')
        .select('*')
        .eq('inspection_id', id)

      if (equipmentError) throw equipmentError

      const loadedEquipment: EquipmentInfo[] = (equipmentData || []).map(equip => ({
        serviceType: equip.service_type,
        brand: equip.brand || '',
        modelNumber: equip.model_number || '',
        serialNumber: equip.serial_number || ''
      }))

      setEquipment(loadedEquipment)

    } catch (error) {
      console.error('Error loading inspection:', error)
      setSaveMessage('Error loading inspection. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialEquipment = serviceTypes.map(type => ({
      serviceType: type,
      brand: '',
      modelNumber: '',
      serialNumber: ''
    }))
    setEquipment(initialEquipment)
  }, [serviceTypes])

  useEffect(() => {
    const checklistItems = getItemsForServices(serviceTypes)
    const initialItems: ItemState[] = checklistItems.map(item => ({
      itemName: item.item,
      completed: false,
      notes: '',
      severity: 0
    }))
    setItems(initialItems)
  }, [serviceTypes])

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

  const toggleSuggestion = (suggestion: string) => {
    setSelectedSuggestions(prev =>
      prev.includes(suggestion)
        ? prev.filter(s => s !== suggestion)
        : [...prev, suggestion]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')

    try {
      // Link this inspection to the correct customer account (Plans dashboard)
      const email = customerEmail.trim().toLowerCase()
      if (!email) {
        throw new Error('Customer email is required to link the inspection to a dashboard user.')
      }

      // Try RPC (recommended) so techs can resolve customer_id even if 'profiles' has strict RLS.
      // Requires SQL function: public.get_customer_id_by_email(p_email text) returning uuid
      let customerIdFromRpc: string | null = null
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_customer_id_by_email', { p_email: email })
        if (!rpcErr && rpcData) customerIdFromRpc = rpcData as unknown as string
      } catch {
        // ignore; we'll fall back to direct table query
      }

      let customerProfile: { id: string; email?: string } | null = null
      let customerLookupError: any = null

      if (!customerIdFromRpc) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', email)
          .limit(1)
          .maybeSingle()

        customerProfile = data as any
        customerLookupError = error as any
      } else {
        customerProfile = { id: customerIdFromRpc, email }
      }

      if (customerLookupError) throw customerLookupError
      if (!customerProfile?.id) {
        throw new Error(`No customer found for email: ${email}`)
      }

      const customerId = customerProfile.id

      let finalInspectionId = inspectionId

      if (inspectionId) {
        const { error: updateError } = await supabase
          .from('inspections')
          .update({
             customer_id: customerId,
             customer_name: customerName,
            address: address,
            technician_name: technicianName,
            inspection_date: inspectionDate,
            notes: generalNotes,
            service_types: serviceTypes,
            selected_suggestions: selectedSuggestions,
            updated_at: new Date().toISOString()
          })
          .eq('id', inspectionId)

        if (updateError) throw updateError

        await supabase.from('inspection_items').delete().eq('inspection_id', inspectionId)
        await supabase.from('equipment_info').delete().eq('inspection_id', inspectionId)
      } else {
        const { data: inspection, error: inspectionError } = await supabase
          .from('inspections')
          .insert({
             customer_id: customerId,
             customer_name: customerName,
            address: address,
            technician_name: technicianName,
            inspection_date: inspectionDate,
            notes: generalNotes,
            service_types: serviceTypes,
            selected_suggestions: selectedSuggestions
          })
          .select()
          .maybeSingle()

        if (inspectionError) {
          console.error('Inspection error details:', inspectionError)
          throw inspectionError
        }

        if (!inspection) {
          throw new Error('Failed to create inspection record')
        }

        finalInspectionId = inspection.id
      }

      const itemsToInsert = items.map(item => ({
        inspection_id: finalInspectionId,
        category: '',
        item_name: item.itemName,
        completed: item.completed,
        notes: item.notes,
        severity: item.severity,
        item_type: 'checklist'
      }))

      const { error: itemsError } = await supabase
        .from('inspection_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      const equipmentToInsert = equipment
        .filter(equip => equip.brand || equip.modelNumber || equip.serialNumber)
        .map(equip => ({
          inspection_id: finalInspectionId,
          service_type: equip.serviceType,
          brand: equip.brand,
          model_number: equip.modelNumber,
          serial_number: equip.serialNumber
        }))

      if (equipmentToInsert.length > 0) {
        const { error: equipmentError } = await supabase
          .from('equipment_info')
          .insert(equipmentToInsert)

        if (equipmentError) throw equipmentError
      }

      setSaveMessage(inspectionId ? 'Inspection updated successfully!' : 'Inspection saved successfully!')

      setTimeout(() => {
        onViewSummary({
          customerName,
customerEmail: email,
customerId,
          address,
          technicianName,
          inspectionDate,
          items,
          selectedSuggestions,
          generalNotes,
          equipment
        })
      }, 1500)
    } catch (error) {
      console.error('Error saving inspection:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setSaveMessage(`Error saving inspection: ${errorMessage}. Please refresh the page and try again.`)
    } finally {
      setSaving(false)
    }
  }

  const completedCount = items.filter(item => item.completed).length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'furnace': return 'Furnace'
      case 'ac': return 'AC/Heat Pump'
      case 'hot_water_tank': return 'Hot Water Tank'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="inspection-form">
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <h2>Loading inspection...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="inspection-form">
      <header className="form-header">
        <div className="header-top">
          <button onClick={onBackToServiceSelection} className="back-button">
            ← Back to Service Selection
          </button>
        </div>
        <h1>HVAC Tune-Up Checklist</h1>
        <div className="service-types-display">
          {serviceTypes.map(type => (
            <span key={type} className="service-badge">
              {getServiceTypeLabel(type)}
            </span>
          ))}
        </div>
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
            <label>Customer Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Enter customer email (for dashboard)"
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

      <section className="equipment-info">
        <h2>Equipment Information</h2>
        {equipment.map((equip, index) => (
          <div key={index} className="equipment-card">
            <h3 className="equipment-type-header">{getServiceTypeLabel(equip.serviceType)}</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Brand</label>
                <input
                  type="text"
                  value={equip.brand}
                  onChange={(e) => {
                    const newEquipment = [...equipment]
                    newEquipment[index].brand = e.target.value
                    setEquipment(newEquipment)
                  }}
                  placeholder="Enter brand name"
                />
              </div>
              <div className="form-field">
                <label>Model Number</label>
                <input
                  type="text"
                  value={equip.modelNumber}
                  onChange={(e) => {
                    const newEquipment = [...equipment]
                    newEquipment[index].modelNumber = e.target.value
                    setEquipment(newEquipment)
                  }}
                  placeholder="Enter model number"
                />
              </div>
              <div className="form-field">
                <label>Serial Number</label>
                <input
                  type="text"
                  value={equip.serialNumber}
                  onChange={(e) => {
                    const newEquipment = [...equipment]
                    newEquipment[index].serialNumber = e.target.value
                    setEquipment(newEquipment)
                  }}
                  placeholder="Enter serial number"
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="checklist-section">
        <h2>Inspection Checklist</h2>
        <div className="category-items">
          {items.map((item, index) => (
            <ChecklistItemComponent
              key={index}
              itemName={item.itemName}
              completed={item.completed}
              notes={item.notes}
              severity={item.severity}
              onToggle={() => handleItemToggle(index)}
              onNotesChange={(notes) => handleNotesChange(index, notes)}
              onSeverityChange={(severity) => handleSeverityChange(index, severity)}
            />
          ))}
        </div>
      </section>

      <section className="suggestions-section">
        <h2>Additional Suggestions</h2>
        <p className="section-description">Select any additional items or upgrades you recommend to the customer:</p>
        <div className="suggestions-grid">
          {additionalSuggestions.map((suggestion, index) => (
            <label key={index} className="suggestion-item">
              <input
                type="checkbox"
                checked={selectedSuggestions.includes(suggestion)}
                onChange={() => toggleSuggestion(suggestion)}
                className="checkbox"
              />
              <span>{suggestion}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="general-notes-section">
        <h2>General Notes</h2>
        <textarea
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Add any additional observations, recommendations, or important information for the customer..."
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
          onClick={handleSave}
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? 'Saving...' : inspectionId ? 'Update & View Summary' : 'Save & View Summary'}
        </button>
      </div>
    </div>
  )
}
