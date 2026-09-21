export type Approval = 'pending' | 'approved' | 'disapproved'
export interface InvoiceChoice {
  id: string
  kind: 'service' | 'repair' | 'addon' | 'additional'
  description: string
  price: number
  approval: Approval
}
export interface InvoiceDraft { choices: InvoiceChoice[] }
export function invoiceLines(draft: InvoiceDraft) {
  if (!Array.isArray(draft?.choices) || draft.choices.length > 100) throw new Error('Invoice must contain at most 100 items.')
  const ids = new Set<string>()
  return draft.choices.flatMap((choice) => {
    if (!choice.id || ids.has(choice.id)) throw new Error('Duplicate or missing invoice item.')
    ids.add(choice.id)
    if (!['approved', 'disapproved', 'pending'].includes(choice.approval)) throw new Error('Invalid approval choice.')
    if (choice.approval !== 'approved') return []
    const description = String(choice.description || '').trim()
    const price = Number(choice.price)
    if (!description || description.length > 500) throw new Error('Each approved item needs a description of 500 characters or fewer.')
    if (!Number.isFinite(price) || price < 0 || price > 999999) throw new Error('Enter a valid nonnegative price for each approved item.')
    return [{ description, material_cost: 0, labor_cost: Math.round((price + Number.EPSILON) * 100) / 100, total_cost: Math.round((price + Number.EPSILON) * 100) / 100 }]
  })
}
export function invoiceTotal(draft: InvoiceDraft) {
  return invoiceLines(draft).reduce((sum, item) => sum + Math.round(item.total_cost * 100), 0) / 100
}
