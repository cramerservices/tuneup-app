interface SuggestionInfo {
  pitch: string
  price: number
  priceLabel?: string
}

export const suggestionPitches: Record<string, SuggestionInfo> = {
  'Power surge protector': {
    pitch: 'Protect your expensive HVAC equipment from electrical surges and power spikes that can cause costly damage. A surge protector can save you thousands in repair costs and extend the life of your system.',
    price: 150
  },

  'Smart Thermostat': {
    pitch: 'Save up to 23% on your energy bills while enjoying perfect comfort. Control your home temperature from anywhere, create automatic schedules, and get energy usage insights. Most customers see payback within 2 years.',
    price: 150,
    priceLabel: '$150 (or $300 for Gen 4 Smart Thermostat)'
  },

  'Smart water monitor and automatic water shut off valve': {
    pitch: 'Smart water monitoring with automatic shut-off provides 24/7 protection against water damage. Detect leaks instantly and automatically stop water flow to prevent catastrophic flooding. Perfect peace of mind when you\'re away from home.',
    price: 700
  },

  'Leak detector sensor': {
    pitch: 'Detect water leaks before they cause major damage to your home. Get instant alerts on your phone and prevent thousands in water damage repairs. Peace of mind for your most valuable investment.',
    price: 0
  },

  'Smart air register vents': {
    pitch: 'Achieve room-by-room temperature control and stop wasting energy heating or cooling unused spaces. Balance your home comfort and reduce energy bills by up to 30% in multi-story homes.',
    price: 150
  },

  'Air purifier': {
    pitch: 'Breathe cleaner, healthier air by removing 99.97% of airborne particles including allergens, dust, pet dander, and viruses. Essential for family members with allergies, asthma, or respiratory concerns.',
    price: 0
  },

  'UV light': {
    pitch: 'Kill up to 99% of mold, bacteria, and viruses in your HVAC system. Improve indoor air quality, reduce illness, and eliminate musty odors. A chemical-free solution for healthier air your family breathes.',
    price: 150
  },

  'Humidifier': {
    pitch: 'Combat dry winter air that damages wood furniture, causes static electricity, and irritates skin and sinuses. Maintain optimal 30-50% humidity for comfort and protect your home. Also helps your heating system work more efficiently.',
    price: 450
  },

  'De humidifier': {
    pitch: 'Prevent mold growth, musty odors, and structural damage from excess moisture. Essential for basement and humid climate comfort. Protects your home investment and improves air quality.',
    price: 0
  },

  'Compressor blanket': {
    pitch: 'Reduce outdoor unit noise by up to 50% and protect your compressor from harsh weather. Extend equipment life while keeping your outdoor space peaceful. Great for units near bedrooms or patios.',
    price: 150
  },

  'Hard start kit': {
    pitch: 'Reduce startup stress on your AC compressor, lower energy consumption, and prevent premature failure. Especially beneficial for older units or homes with voltage fluctuations. Can add years to your system life.',
    price: 100
  },

  'Powered anode rod': {
    pitch: 'Extend your water heater life by 2-3x by preventing tank corrosion. Unlike traditional rods, powered rods never need replacement and work better in all water conditions. A one-time investment that protects your water heater for decades.',
    price: 250
  }
}

export function getSuggestionInfo(suggestion: string): SuggestionInfo {
  return suggestionPitches[suggestion] || {
    pitch: 'Recommended upgrade for improved system performance and efficiency.',
    price: 0
  }
}
