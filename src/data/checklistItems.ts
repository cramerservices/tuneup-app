export interface ChecklistCategory {
  category: string
  items: string[]
}

export const checklistData: ChecklistCategory[] = [
  {
    category: 'Thermostat & Controls',
    items: [
      'Verify thermostat operation',
      'Check call for heat signal'
    ]
  },
  {
    category: 'Safety Components',
    items: [
      'Inspect flame sensor (clean if needed)',
      'Test ignitor',
      'Check high-limit switch',
      'Inspect pressure switch & tubing',
      'Check rollout switches'
    ]
  },
  {
    category: 'Burner & Combustion',
    items: [
      'Inspect burners for rust/debris',
      'Clean burner assembly (if needed)',
      'Inspect flue/vent for blockage',
      'Test for proper combustion',
      'Check gas pressure (in/out)'
    ]
  },
  {
    category: 'Electrical & Motors',
    items: [
      'Measure amp draw on blower motor',
      'Check capacitor',
      'Inspect wiring & tighten connections',
      'Inspect control board diagnostics'
    ]
  },
  {
    category: 'Airflow',
    items: [
      'Inspect air filter (replace if needed)',
      'Check blower wheel cleanliness',
      'Inspect return & supply ducts'
    ]
  },
  {
    category: 'General',
    items: [
      'Lubricate moving parts (if applicable)',
      'Check for carbon monoxide leaks',
      'Test furnace operation through cycle',
      'Check for gas leaks'
    ]
  }
]
