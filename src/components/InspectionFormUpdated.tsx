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
  age: string
}
interface SystemReadings {
  blowerCapacitor: string
  blowerAmps: string
  inducerMotorAmps: string
  gasPressure: string
  temperatureRise: string
  returnAirTemp: string
  supplyAirTemp: string
  outdoorTemp: string
  indoorWetBulb: string
  lowSidePressure: string
  highSidePressure: string
  superheat: string
  subcooling: string
  compressorAmps: string
  condenserFanAmps: string
  capacitorHerm: string
  capacitorFan: string
  capacitorCommon: string
}
interface InspectionFormProps {
  // Accept either prop name so the app doesn't crash if parent passes selectedServices
  serviceTypes?: string[]
  selectedServices?: string[]
  inspectionId?: string
  onViewSummary: (data: {
    customerName: string
    customerEmail?: string
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
        const { data: customer } = await supabase
          .from('customers')
          .select('email')
          .eq('id', inspection.customer_id)
          .maybeSingle()

        if (customer?.email) {
          setCustomerEmail(customer.email)
        } else {
          // Backward compatibility for inspections that stored a profile id.
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', inspection.customer_id)
            .maybeSingle()

          if (profile?.email) setCustomerEmail(profile.email)
        }
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
  serialNumber: equip.serial_number || '',
  age: equip.age || ''
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
  serialNumber: '',
  age: ''
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

  const normalizeEmail = (value: string) => value.trim().toLowerCase()

  const parseAddressParts = (serviceAddress: string) => {
    const parts = serviceAddress.split(',').map(part => part.trim()).filter(Boolean)
    const city = parts.length > 1 ? parts[1] : null
    const stateZipMatch = (parts[2] || '').match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/)

    return {
      city,
      state: stateZipMatch?.[1] ?? null,
      zipCode: stateZipMatch?.[2] ?? null
    }
  }

  const syncProfileAfterInspection = async () => {
    const normalizedEmail = normalizeEmail(customerEmail)

    if (!normalizedEmail) {
      console.log('inspection complete')
      console.log('customer email found', null)
      return null
    }

    console.log('inspection complete')
    console.log('customer email found', normalizedEmail)

    try {
      const { data: customersByEmail, error: customersLookupError } = await supabase
        .from('customers')
        .select('id, email')
        .ilike('email', normalizedEmail)
        .limit(5)

      if (customersLookupError) throw customersLookupError

      const matchedCustomer = (customersByEmail || []).find(
        row => normalizeEmail(row.email || '') === normalizedEmail
      )

      console.log('matching customers lookup result', matchedCustomer ?? null)

      const { data: portalCustomersByEmail, error: portalCustomersLookupError } = await supabase
        .from('portal_customers')
        .select('id, email')
        .ilike('email', normalizedEmail)
        .limit(5)

      if (portalCustomersLookupError) throw portalCustomersLookupError

      const matchedPortalCustomer = (portalCustomersByEmail || []).find(
        row => normalizeEmail(row.email || '') === normalizedEmail
      )

      console.log('matching portal_customers lookup result', matchedPortalCustomer ?? null)

      const { city, state, zipCode } = parseAddressParts(address)
      const { data: syncResult, error: syncError } = await supabase.rpc('sync_profile_by_email', {
        p_email: normalizedEmail,
        p_customer_id: matchedCustomer?.id ?? null,
        p_portal_customer_id: matchedPortalCustomer?.id ?? null,
        p_full_name: customerName?.trim() || null,
        p_phone: null,
        p_service_address: address?.trim() || null,
        p_city: city,
        p_state: state,
        p_zip_code: zipCode
      })

      if (syncError) {
        console.error('sync_profile_by_email error', syncError)
        return {
          matchedCustomer,
          matchedPortalCustomer,
          syncResult: null,
          syncError
        }
      }

      console.log('sync_profile_by_email success result', syncResult)

      return {
        matchedCustomer,
        matchedPortalCustomer,
        syncResult,
        syncError: null
      }
    } catch (error) {
      console.error('sync_profile_by_email error', error)
      return {
        matchedCustomer: null,
        matchedPortalCustomer: null,
        syncResult: null,
        syncError: error
      }
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')

    try {
      const normalizedEmail = normalizeEmail(customerEmail)

      let customerId: string | null = null
      if (normalizedEmail) {
        const { data: customersByEmail, error: customerLookupError } = await supabase
          .from('customers')
          .select('id, email')
          .ilike('email', normalizedEmail)
          .limit(5)

        if (customerLookupError) throw customerLookupError

        const matchedCustomer = (customersByEmail || []).find(
          row => normalizeEmail(row.email || '') === normalizedEmail
        )
        customerId = matchedCustomer?.id ?? null
      }

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
  .filter(equip => equip.brand || equip.modelNumber || equip.serialNumber || equip.age)
  .map(equip => ({
    inspection_id: finalInspectionId,
    service_type: equip.serviceType,
    brand: equip.brand,
    model_number: equip.modelNumber,
    serial_number: equip.serialNumber,
    age: equip.age
  }))

      if (equipmentToInsert.length > 0) {
        const { error: equipmentError } = await supabase
          .from('equipment_info')
          .insert(equipmentToInsert)

        if (equipmentError) throw equipmentError
      }

      await syncProfileAfterInspection()

      setSaveMessage(inspectionId ? 'Inspection updated successfully!' : 'Inspection saved successfully!')

      setTimeout(() => {
       onViewSummary({
  customerName,
  customerEmail,
  address,
  technicianName,
  inspectionDate,
  items,
  selectedSuggestions,
  generalNotes,
  equipment,
  systemReadings
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
              <div className="form-field">
  <label>Age</label>
  <input
    type="text"
    value={equip.age}
    onChange={(e) => {
      const newEquipment = [...equipment]
      newEquipment[index].age = e.target.value
      setEquipment(newEquipment)
    }}
    placeholder="Example: 12 years"
  />
</div>
            </div>
          </div>
        ))}
      </section>
<section className="system-readings-section">
  <h2>System Readings</h2>

  <div className="readings-card">
    <h3 className="equipment-type-header">Furnace / Air Handler Readings</h3>
    <div className="form-grid">
      <div className="form-field">
        <label>Blower Capacitor</label>
        <input
          type="text"
          value={systemReadings.blowerCapacitor}
          onChange={(e) => setSystemReadings({ ...systemReadings, blowerCapacitor: e.target.value })}
          placeholder="Example: 7.5 / 10 MFD"
        />
      </div>

      <div className="form-field">
        <label>Blower Amps</label>
        <input
          type="text"
          value={systemReadings.blowerAmps}
          onChange={(e) => setSystemReadings({ ...systemReadings, blowerAmps: e.target.value })}
          placeholder="Example: 3.2 A"
        />
      </div>

      <div className="form-field">
        <label>Inducer Motor Amps</label>
        <input
          type="text"
          value={systemReadings.inducerMotorAmps}
          onChange={(e) => setSystemReadings({ ...systemReadings, inducerMotorAmps: e.target.value })}
          placeholder="Example: 1.1 A"
        />
      </div>

      <div className="form-field">
        <label>Gas Pressure</label>
        <input
          type="text"
          value={systemReadings.gasPressure}
          onChange={(e) => setSystemReadings({ ...systemReadings, gasPressure: e.target.value })}
          placeholder="Example: 3.5 WC"
        />
      </div>

      <div className="form-field">
        <label>Temperature Rise</label>
        <input
          type="text"
          value={systemReadings.temperatureRise}
          onChange={(e) => setSystemReadings({ ...systemReadings, temperatureRise: e.target.value })}
          placeholder="Example: 45°"
        />
      </div>

      <div className="form-field">
        <label>Return Air Temp</label>
        <input
          type="text"
          value={systemReadings.returnAirTemp}
          onChange={(e) => setSystemReadings({ ...systemReadings, returnAirTemp: e.target.value })}
          placeholder="Example: 70°"
        />
      </div>

      <div className="form-field">
        <label>Supply Air Temp</label>
        <input
          type="text"
          value={systemReadings.supplyAirTemp}
          onChange={(e) => setSystemReadings({ ...systemReadings, supplyAirTemp: e.target.value })}
          placeholder="Example: 115°"
        />
      </div>
    </div>
  </div>

  <div className="readings-card">
    <h3 className="equipment-type-header">AC / Heat Pump Readings</h3>
    <div className="form-grid">
      <div className="form-field">
        <label>Outdoor Temp</label>
        <input
          type="text"
          value={systemReadings.outdoorTemp}
          onChange={(e) => setSystemReadings({ ...systemReadings, outdoorTemp: e.target.value })}
          placeholder="Example: 78°"
        />
      </div>

      <div className="form-field">
        <label>Indoor Wet Bulb</label>
        <input
          type="text"
          value={systemReadings.indoorWetBulb}
          onChange={(e) => setSystemReadings({ ...systemReadings, indoorWetBulb: e.target.value })}
          placeholder="Example: 63°"
        />
      </div>

      <div className="form-field">
        <label>Low Side Pressure</label>
        <input
          type="text"
          value={systemReadings.lowSidePressure}
          onChange={(e) => setSystemReadings({ ...systemReadings, lowSidePressure: e.target.value })}
          placeholder="Example: 136 PSI"
        />
      </div>

      <div className="form-field">
        <label>High Side Pressure</label>
        <input
          type="text"
          value={systemReadings.highSidePressure}
          onChange={(e) => setSystemReadings({ ...systemReadings, highSidePressure: e.target.value })}
          placeholder="Example: 325 PSI"
        />
      </div>

      <div className="form-field">
        <label>Superheat</label>
        <input
          type="text"
          value={systemReadings.superheat}
          onChange={(e) => setSystemReadings({ ...systemReadings, superheat: e.target.value })}
          placeholder="Example: 12°"
        />
      </div>

      <div className="form-field">
        <label>Subcooling</label>
        <input
          type="text"
          value={systemReadings.subcooling}
          onChange={(e) => setSystemReadings({ ...systemReadings, subcooling: e.target.value })}
          placeholder="Example: 10°"
        />
      </div>

      <div className="form-field">
        <label>Compressor Amps</label>
        <input
          type="text"
          value={systemReadings.compressorAmps}
          onChange={(e) => setSystemReadings({ ...systemReadings, compressorAmps: e.target.value })}
          placeholder="Example: 8.5 A"
        />
      </div>

      <div className="form-field">
        <label>Condenser Fan Amps</label>
        <input
          type="text"
          value={systemReadings.condenserFanAmps}
          onChange={(e) => setSystemReadings({ ...systemReadings, condenserFanAmps: e.target.value })}
          placeholder="Example: 1.2 A"
        />
      </div>

      <div className="form-field">
        <label>Capacitor Herm</label>
        <input
          type="text"
          value={systemReadings.capacitorHerm}
          onChange={(e) => setSystemReadings({ ...systemReadings, capacitorHerm: e.target.value })}
          placeholder="Example: 45"
        />
      </div>

      <div className="form-field">
        <label>Capacitor Fan</label>
        <input
          type="text"
          value={systemReadings.capacitorFan}
          onChange={(e) => setSystemReadings({ ...systemReadings, capacitorFan: e.target.value })}
          placeholder="Example: 5"
        />
      </div>

      <div className="form-field">
        <label>Capacitor Common</label>
        <input
          type="text"
          value={systemReadings.capacitorCommon}
          onChange={(e) => setSystemReadings({ ...systemReadings, capacitorCommon: e.target.value })}
          placeholder="Example: Common"
        />
      </div>
    </div>
  </div>
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
        <h2>Add-Ons</h2>
        <p className="section-description">Select any add-ons you want to include for the customer:</p>
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
          placeholder="Add any additional observations, add-ons, or important information for the customer..."
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
