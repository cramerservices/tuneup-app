export interface ChecklistItem {
  item: string
  serviceTypes: string[]
}

export const furnaceItems: ChecklistItem[] = [
  { item: 'Thermostat check', serviceTypes: ['furnace'] },
  { item: 'Inspect flame sensor', serviceTypes: ['furnace'] },
  { item: 'Inspect electrical components of furnace', serviceTypes: ['furnace'] },
  { item: 'Inspect flue/venting', serviceTypes: ['furnace'] },
  { item: 'Carbon monoxide test', serviceTypes: ['furnace'] },
  { item: 'Check burner flame', serviceTypes: ['furnace'] },
  { item: 'Inspect air filter', serviceTypes: ['furnace'] },
  { item: 'Inspect/clean of interior coil', serviceTypes: ['furnace'] },
  { item: 'Inspection and cleaning of squirrel cages (additional cost for cleanings that require removal of blower motor assembly)', serviceTypes: ['furnace'] }
]

export const acItems: ChecklistItem[] = [
  { item: 'Thermostat check', serviceTypes: ['ac'] },
  { item: 'Check interior coils and line set for refrigerant leaks', serviceTypes: ['ac'] },
  { item: 'Inspect electrical components of AC unit', serviceTypes: ['ac'] },
  { item: 'Clear condensate pan of debris and flush drain', serviceTypes: ['ac'] },
  { item: 'Measure refrigerant pressures if there is a sign of leak', serviceTypes: ['ac'] },
  { item: 'Inspect air filter (replace at additional cost)', serviceTypes: ['ac'] },
  { item: 'Inspect and cleaning of interior coil', serviceTypes: ['ac'] },
  { item: 'Inspection and cleaning of squirrel cages (additional cost for cleanings that require removal of blower motor assembly)', serviceTypes: ['ac'] }
]

export const hotWaterTankItems: ChecklistItem[] = [
  { item: 'Flush water heater', serviceTypes: ['hot_water_tank'] },
  { item: 'Replace anode rod $60', serviceTypes: ['hot_water_tank'] },
  { item: 'Safety check', serviceTypes: ['hot_water_tank'] }
]

export const additionalSuggestions: string[] = [
  'Power surge protector',
  'Smart Thermostat',
  'Leak detector sensor',
  'Smart air register vents',
  'Air purifier',
  'UV light',
  'Humidifier',
  'De humidifier',
  'Compressor blanket',
  'Hard start kit',
  'Powered anode rod'
]

export function getItemsForServices(serviceTypes: string[]): ChecklistItem[] {
  const itemMap = new Map<string, ChecklistItem>()

  if (serviceTypes.includes('furnace')) {
    furnaceItems.forEach(item => {
      itemMap.set(item.item, item)
    })
  }

  if (serviceTypes.includes('ac')) {
    acItems.forEach(item => {
      itemMap.set(item.item, item)
    })
  }

  if (serviceTypes.includes('hot_water_tank')) {
    hotWaterTankItems.forEach(item => {
      itemMap.set(item.item, item)
    })
  }

  return Array.from(itemMap.values())
}
