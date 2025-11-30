export const suggestionPitches: Record<string, string> = {
  'Power surge protector': 'Protect your expensive HVAC equipment from electrical surges and power spikes that can cause costly damage. A surge protector can save you thousands in repair costs and extend the life of your system.',

  'Smart Thermostat': 'Save up to 23% on your energy bills while enjoying perfect comfort. Control your home temperature from anywhere, create automatic schedules, and get energy usage insights. Most customers see payback within 2 years.',

  'Leak detector sensor': 'Detect water leaks before they cause major damage to your home. Get instant alerts on your phone and prevent thousands in water damage repairs. Peace of mind for your most valuable investment.',

  'Smart air register vents': 'Achieve room-by-room temperature control and stop wasting energy heating or cooling unused spaces. Balance your home comfort and reduce energy bills by up to 30% in multi-story homes.',

  'Air purifier': 'Breathe cleaner, healthier air by removing 99.97% of airborne particles including allergens, dust, pet dander, and viruses. Essential for family members with allergies, asthma, or respiratory concerns.',

  'UV light': 'Kill up to 99% of mold, bacteria, and viruses in your HVAC system. Improve indoor air quality, reduce illness, and eliminate musty odors. A chemical-free solution for healthier air your family breathes.',

  'Humidifier': 'Combat dry winter air that damages wood furniture, causes static electricity, and irritates skin and sinuses. Maintain optimal 30-50% humidity for comfort and protect your home. Also helps your heating system work more efficiently.',

  'De humidifier': 'Prevent mold growth, musty odors, and structural damage from excess moisture. Essential for basement and humid climate comfort. Protects your home investment and improves air quality.',

  'Compressor blanket': 'Reduce outdoor unit noise by up to 50% and protect your compressor from harsh weather. Extend equipment life while keeping your outdoor space peaceful. Great for units near bedrooms or patios.',

  'Hard start kit': 'Reduce startup stress on your AC compressor, lower energy consumption, and prevent premature failure. Especially beneficial for older units or homes with voltage fluctuations. Can add years to your system life.',

  'Powered anode rod': 'Extend your water heater life by 2-3x by preventing tank corrosion. Unlike traditional rods, powered rods never need replacement and work better in all water conditions. A one-time investment that protects your water heater for decades.'
}

export function getSuggestionPitch(suggestion: string): string {
  return suggestionPitches[suggestion] || 'Recommended upgrade for improved system performance and efficiency.'
}
