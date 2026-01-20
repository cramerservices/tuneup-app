export interface ChecklistItem {
  item: string
  serviceTypes: string[]
}

export const furnaceItems: ChecklistItem[] = [
  { item: 'Thermostat Check', serviceTypes: ['furnace', 'ac'] },
  { item: 'Inspect Flame Sensor', serviceTypes: ['furnace'] },
  { item: 'Inspect Electrical Components Of Furnace', serviceTypes: ['furnace'] },
  { item: 'Inspect Flue And Venting', serviceTypes: ['furnace'] },
  { item: 'Carbon Monoxide Test', serviceTypes: ['furnace'] },
  { item: 'Check Burner Flame', serviceTypes: ['furnace'] },
  { item: 'Inspect Air Filter', serviceTypes: ['furnace', 'ac'] },
  { item: 'Inspect And Clean Interior Coil', serviceTypes: ['furnace', 'ac'] },
  { item: 'Inspection And Cleaning Of Squirrel Cage', serviceTypes: ['furnace', 'ac'] },
  { item: 'Inspect Heat Exchanger', serviceTypes: ['ac'] },
  { item: 'Inspect Gas Connect For Leaks (Furnace)', serviceTypes: ['ac'] }, 
  { item: 'Test Safety Switches', serviceTypes: ['ac'] },
  { item: 'Inspect duct connections for leaks/disconnects (visible areas)', serviceTypes: ['ac'] }
]

export const acItems: ChecklistItem[] = [
  { item: 'Thermostat Check', serviceTypes: ['furnace', 'ac'] },
  { item: 'Inspect Electrical Components Of AC Unit', serviceTypes: ['ac'] },
  { item: 'Inspect Air Filter', serviceTypes: ['furnace', 'ac'] },
  { item: 'Inspect And Clean Interior Coil', serviceTypes: ['furnace', 'ac'] },
  { item: 'Check Interior Coils And Line Set For Refrigerant Leaks', serviceTypes: ['ac'] },
  { item: 'Check Exterior Coils And Line Set For Refrigerant Leaks', serviceTypes: ['ac'] },
  { item: 'Measure Refrigerant Pressures If Leak Is Suspected', serviceTypes: ['ac'] },
  { item: 'Clear Condensate Pan Of Debris And Flush Drain', serviceTypes: ['ac'] },
  { item: 'Clean Condenser', serviceTypes: ['ac'] },
  { item: 'Check refrigerant line insulation', serviceTypes: ['ac'] },
  { item: 'Inspect duct connections for leaks/disconnects (visible areas)', serviceTypes: ['ac'] }
}

]

export const hotWaterTankItems: ChecklistItem[] = [
  { item: 'Flush Water Heater', serviceTypes: ['hot_water_tank'] },
  { item: 'Inspect Anode Rod', serviceTypes: ['hot_water_tank'] },
  { item: 'Inspect Water Connections', serviceTypes: ['hot_water_tank'] },
  { item: 'Inspect Gas/Electrical Components', serviceTypes: ['hot_water_tank'] },
  { item: 'Inspect Water Heater Exhaust', serviceTypes: ['hot_water_tank'] } ,
  { item: 'Inspect Gas Connect For Leaks (WH)', serviceTypes: ['ac'] },
  { item: 'Inspect expansion tank', serviceTypes: ['ac'] }
]

export const additionalSuggestions: string[] = [
  'Power Surge Protector',
  'Smart Thermostat',
  'Smart Water Monitor And Automatic Water Shut Off Valve',
  'Smart Air Register Vents',
  'Air Purifier',
  'UV Light',
  'Humidifier',
  'De Humidifier',
  'Compressor Blanket',
  'Hard Start Kit',
  'Powered Anode Rod'
]

export function getItemsForServices(serviceTypes: string[]): ChecklistItem[] {
  const itemMap = new Map<string, ChecklistItem>()

  if (serviceTypes.includes('furnace')) {
    furnaceItems.forEach(item => {
      const existing = itemMap.get(item.item)
      if (existing) {
        const combinedServiceTypes = Array.from(new Set([...existing.serviceTypes, ...item.serviceTypes]))
        itemMap.set(item.item, { ...item, serviceTypes: combinedServiceTypes })
      } else {
        itemMap.set(item.item, item)
      }
    })
  }

  if (serviceTypes.includes('ac')) {
    acItems.forEach(item => {
      const existing = itemMap.get(item.item)
      if (existing) {
        const combinedServiceTypes = Array.from(new Set([...existing.serviceTypes, ...item.serviceTypes]))
        itemMap.set(item.item, { ...item, serviceTypes: combinedServiceTypes })
      } else {
        itemMap.set(item.item, item)
      }
    })
  }

  if (serviceTypes.includes('hot_water_tank')) {
    hotWaterTankItems.forEach(item => {
      itemMap.set(item.item, item)
    })
  }

  return Array.from(itemMap.values())
}
