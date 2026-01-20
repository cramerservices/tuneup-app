export interface ChecklistItem {
  item: string
  serviceTypes: string[]
}

export const furnaceItems: ChecklistItem[] = [
  { item: 'Thermostat Check', serviceTypes: ['furnace', 'ac', 'mini_split'] },
  { item: 'Inspect Flame Sensor', serviceTypes: ['furnace'] },
  { item: 'Inspect Electrical Components Of Furnace', serviceTypes: ['furnace'] },
  { item: 'Inspect Flue And Venting', serviceTypes: ['furnace'] },
  { item: 'Carbon Monoxide Test', serviceTypes: ['furnace'] },
  { item: 'Check Burner Flame', serviceTypes: ['furnace'] },
  { item: 'Inspect Air Filter', serviceTypes: ['furnace', 'ac'] },
  { item: 'Inspect And Clean Interior Coil', serviceTypes: ['furnace', 'ac'] },
  { item: 'Inspection Of Squirrel Cage', serviceTypes: ['furnace', 'ac'] },
  { item: 'Inspect Heat Exchanger', serviceTypes: ['furnace'] },
  { item: 'Inspect Gas Connect For Leaks (Furnace)', serviceTypes: ['furnace'] }, 
  { item: 'Test Safety Switches', serviceTypes: ['furnace'] },
 { item: 'Inspect Duct Connections For Leaks/Disconnects (Visible Areas)', serviceTypes: ['ac', 'furnace'] }
]

export const acItems: ChecklistItem[] = [
  { item: 'Thermostat Check', serviceTypes: ['furnace', 'ac', 'mini_split'] },
  { item: 'Inspect Electrical Components Of AC Unit', serviceTypes: ['ac'] },
  { item: 'Inspect Air Filter', serviceTypes: ['furnace', 'ac'] },
  { item: 'Inspect And Clean Interior Coil', serviceTypes: ['furnace', 'ac'] },
  { item: 'Check Interior Coils And Line Set For Refrigerant Leaks', serviceTypes: ['ac', 'mini_split'] },
  { item: 'Check Exterior Coils And Line Set For Refrigerant Leaks', serviceTypes: ['ac', 'mini_split'] },
  { item: 'Measure Refrigerant Pressures If Leak Is Suspected', serviceTypes: ['ac'] },
  { item: 'Clear Condensate Pan Of Debris And Flush Drain', serviceTypes: ['ac'] },
  { item: 'Clean Condenser', serviceTypes: ['ac', 'mini_split'] },
   { item: 'Check Refrigerant Line Insulation', serviceTypes: ['ac', 'mini_split'] },
  { item: 'Inspect Duct Connections For Leaks/Disconnects (Visible Areas)', serviceTypes: ['ac', 'furnace'] },
{ item: 'Inspect Outdoor Fan/Motor', serviceTypes: ['ac', 'mini_split'] }

]

export const hotWaterTankItems: ChecklistItem[] = [
  { item: 'Flush Water Heater', serviceTypes: ['hot_water_tank'] },
  { item: 'Inspect Anode Rod', serviceTypes: ['hot_water_tank'] },
  { item: 'Inspect Water Connections', serviceTypes: ['hot_water_tank'] },
  { item: 'Inspect Gas/Electrical Components', serviceTypes: ['hot_water_tank'] },
  { item: 'Inspect Water Heater Exhaust', serviceTypes: ['hot_water_tank'] } ,
  { item: 'Inspect Gas Connect For Leaks (WH)', serviceTypes: ['hot_water_tank'] },
  { item: 'Inspect Expansion Tank', serviceTypes: ['hot_water_tank'] }
]

export const miniSplitItems: ChecklistItem[] = [
  { item: 'Thermostat Check', serviceTypes: ['furnace', 'ac', 'mini_split'] },
  { item: 'Clean/Replace Indoor Filters', serviceTypes: ['mini_split'] },
  { item: 'Inspect Indoor Coil And Clean If Needed', serviceTypes: ['mini_split'] },
  { item: 'Inspect Blower Wheel (Clean If Dirty)', serviceTypes: ['mini_split'] },

  { item: 'Inspect Drain Pan And Flush Condensate Line', serviceTypes: ['mini_split'] },
  { item: 'Test Condensate Pump/Float Switch (If Present)', serviceTypes: ['mini_split'] },

  { item: 'Check Interior Coils And Line Set For Refrigerant Leaks', serviceTypes: ['ac', 'mini_split'] },
  { item: 'Check Exterior Coils And Line Set For Refrigerant Leaks', serviceTypes: ['ac', 'mini_split'] },
  { item: 'Check Refrigerant Line Insulation', serviceTypes: ['ac', 'mini_split'] },

  { item: 'Clean Condenser', serviceTypes: ['ac', 'mini_split'] },
  { item: 'Inspect Outdoor Fan/Motor', serviceTypes: ['ac', 'mini_split'] },
  { item: 'Inspect Electrical Components Of Mini Split', serviceTypes: ['mini_split'] },
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

    if (serviceTypes.includes('mini_split')) {
    miniSplitItems.forEach(item => {
      const existing = itemMap.get(item.item)
      if (existing) {
        const combinedServiceTypes = Array.from(new Set([...existing.serviceTypes, ...item.serviceTypes]))
        itemMap.set(item.item, { ...item, serviceTypes: combinedServiceTypes })
      } else {
        itemMap.set(item.item, item)
      }
    })
  }

  return Array.from(itemMap.values())
}
