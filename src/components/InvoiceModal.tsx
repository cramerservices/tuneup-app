import { useState } from 'react'
import { invoiceTotal } from '../../supabase/functions/_shared/invoice'
import type { Approval, InvoiceChoice, InvoiceDraft } from '../../supabase/functions/_shared/invoice'
export type { InvoiceDraft }
interface Props {
  initialDraft: InvoiceDraft
  sendEmail: boolean
  recipient: string
  onClose: () => void
  onSave: (draft: InvoiceDraft, action: 'save' | 'generate' | 'send') => Promise<void>
}
export function InvoiceModal({ initialDraft, sendEmail, recipient, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<InvoiceDraft>(initialDraft)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const update = (id: string, values: Partial<InvoiceChoice>) => setDraft(d => ({ choices: d.choices.map(c => c.id === id ? { ...c, ...values } : c) }))
  const decide = (item: InvoiceChoice, approval: Approval) => setDraft(d => {
    const choices = d.choices.map(c => c.id === item.id ? { ...c, approval: (c.approval === approval ? 'pending' : approval) as Approval } : c)
    if (item.kind === 'service') {
      const selected = choices.filter(c => c.kind === 'service' && c.approval === 'approved')
      selected.forEach((c, index) => { c.price = selected.length === 3 ? (index === 2 ? 83.34 : 83.33) : selected.length === 2 ? 100 : 125 })
    }
    return { choices }
  })
  let total = 0
  try { total = invoiceTotal(draft) } catch { /* Validation is shown when saving. */ }
  const submit = async (action: 'save' | 'generate' | 'send') => {
    setBusy(true); setError('')
    try { invoiceTotal(draft); await onSave(draft, action); onClose() }
    catch (e: any) { setError(e.message || 'Unable to save invoice.') }
    finally { setBusy(false) }
  }
  return <div className="modal-overlay"><div className="modal-content invoice-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-review-title">
    <div className="modal-header"><h2 id="invoice-review-title">{sendEmail ? 'Invoice & Payment Link' : 'Review Invoice'}</h2><button type="button" aria-label="Close invoice" disabled={busy} onClick={onClose}>✕</button></div>
    <div className="modal-body">
      <p>Record the customer’s choice for each item. Only approved items are billed.</p>
      {(['service', 'repair', 'addon', 'additional'] as const).map(kind => <section className="invoice-section" key={kind}>
        <h3>{{ service: 'Services performed', repair: 'Repairs', addon: 'Add-ons', additional: 'Additional work' }[kind]}</h3>
        {draft.choices.filter(c => c.kind === kind).map(item => <div key={item.id} className="billing-choice">
          {kind === 'additional' ? <input aria-label="Work description" value={item.description} disabled={busy} onChange={e => update(item.id,{description:e.target.value})} /> : <strong>{item.description}</strong>}
          <label>Price ($)<input type="number" min="0" max="999999" step="0.01" aria-label={`Price for ${item.description || 'additional work'}`} value={item.price} disabled={busy} onChange={e => update(item.id,{price:Math.max(0,Number(e.target.value))})} /></label>
          <div className="billing-decisions">
            <label><input type="checkbox" checked={item.approval === 'approved'} disabled={busy} onChange={() => decide(item,'approved')} />Approve</label>
            <label><input type="checkbox" checked={item.approval === 'disapproved'} disabled={busy} onChange={() => decide(item,'disapproved')} />Disapprove</label>
            {item.approval === 'pending' && <span>Not decided</span>}
          </div>
        </div>)}
      </section>)}
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setDraft(d => ({choices:[...d.choices,{id:crypto.randomUUID(),kind:'additional',description:'',price:0,approval:'pending'}]}))}>+ Add Line Item</button>
      <div className="invoice-totals"><strong>Approved total: ${total.toFixed(2)}</strong></div>
      {sendEmail && <p>The itemized invoice PDF and Stripe payment link will be emailed together to <strong>{recipient || 'the email on the report'}</strong>.</p>}
      <p>Creating the invoice locks these selections. Later invoice changes can be made in the CRM.</p>
      {error && <p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
    </div>
    <div className="modal-footer">
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => submit('save')}>Save Selections</button>
      <button type="button" className="btn btn-primary" disabled={busy || !draft.choices.some(c=>c.approval==='approved') || (sendEmail && total<=0)} onClick={() => submit(sendEmail?'send':'generate')}>{busy?'Working…':sendEmail?'Email Invoice & Payment Link':'Generate Invoice'}</button>
    </div>
  </div></div>
}
