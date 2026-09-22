import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { invoiceTotal } from '../../supabase/functions/_shared/invoice'
import './QuickInvoice.css'

type Item = { id: string; description: string; price: string }
const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const requestKey = 'cramer-quick-invoice-request'
const getRequestId = () => { try { const saved=sessionStorage.getItem(requestKey);if(saved)return saved;const id=crypto.randomUUID();sessionStorage.setItem(requestKey,id);return id } catch { return crypto.randomUUID() } }
const emptyCustomer = () => ({ name:'', email:'', address:'', technician:'', serviceDate:today(), notes:'' })
const newItem = (): Item => ({id:crypto.randomUUID(),description:'',price:''})
const dollars = (v: unknown) => `$${Number(v || 0).toFixed(2)}`
async function call(action: string, fields: object = {}) {
  const {data,error} = await supabase.functions.invoke('tuneup-invoice',{body:{action,quick:true,...fields}})
  if (error) {
    let message = error.message
    try { message = (await error.context.json()).error || message } catch { /* Network error. */ }
    throw new Error(message)
  }
  if (!data?.success) throw new Error(data?.error || 'Unable to complete request.')
  return data
}
export function QuickInvoice() {
  const navigate = useNavigate()
  const {invoiceId} = useParams()
  const [customer,setCustomer] = useState(emptyCustomer)
  const [items,setItems] = useState<Item[]>([newItem()])
  const [requestId,setRequestId] = useState(getRequestId)
  const [result,setResult] = useState<any>(null)
  const [recent,setRecent] = useState<any[]>([])
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const [error,setError] = useState('')
  const [checkout,setCheckout] = useState<{url:string;expiresAt:number}|null>(null)
  const [now,setNow] = useState(Date.now())
  const draft = {choices:items.map(i=>({id:i.id,kind:'additional' as const,description:i.description.trim(),price:Number(i.price),approval:'approved' as const}))}
  let total = 0
  try { total = invoiceTotal(draft) } catch { total = items.reduce((s,i)=>s+(Number(i.price)||0),0) }
  useEffect(()=>{ call('quick_list').then(d=>setRecent(d.invoices || [])).catch(e=>setError(e.message)) },[invoiceId])
  useEffect(()=>{
    setResult(null);setCheckout(null);setMessage('');setError('')
    if (!invoiceId) {setBusy(false);return}
    let active=true;setBusy(true)
    call('get',{invoiceId}).then(d=>{if(active)setResult(d)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setBusy(false)})
    return ()=>{active=false}
  },[invoiceId])
  // Check the saved CRM balance, never infer payment from a redirect or a button click.
  useEffect(()=>{
    if (!invoiceId || !result?.invoice || Number(result.invoice.amount_due)<=0) return
    let active=true
    const timer=setInterval(()=>{
      setNow(Date.now())
      call('get',{invoiceId}).then(d=>{if(active){setResult(d);if(Number(d.invoice?.amount_due)<=0)setCheckout(null)}}).catch(()=>{})
    },8000)
    return ()=>{active=false;clearInterval(timer)}
  },[invoiceId,result?.invoice?.id,result?.invoice?.amount_due])
  const run = async (fn:()=>Promise<void>) => {setBusy(true);setError('');setMessage('');try{await fn()}catch(e:any){setError(e.message || 'Unable to complete request.')}finally{setBusy(false)}}
  const create = async (e:React.FormEvent) => {
    e.preventDefault()
    await run(async()=>{
      invoiceTotal(draft)
      if(total<0.5 || total>999999.99)throw new Error('Enter a total between $0.50 and $999,999.99.')
      const d=await call('quick_create',{requestId,customer,draft})
      try {sessionStorage.removeItem(requestKey)} catch {}
      navigate(`/quick-invoice/${d.invoiceId}`)
    })
  }
  const refresh = () => run(async()=>{const d=await call('get',{invoiceId});setResult(d);setMessage(Number(d.invoice.amount_due)<=0?'Payment received.':'Payment has not been confirmed yet.')})
  const pay = () => run(async()=>{
    const d=await call('checkout',{invoiceId});setResult(d);setCheckout({url:d.checkoutUrl,expiresAt:d.expiresAt});setNow(Date.now())
  })
  const download = () => run(async()=>{
    const d=await call('pdf',{invoiceId});const bytes=Uint8Array.from(atob(d.pdfBase64),(c)=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download=`invoice-${d.invoice.invoice_number}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)
  })
  const startNew = () => {setCustomer(emptyCustomer());setItems([newItem()]);try{sessionStorage.removeItem(requestKey)}catch{};setRequestId(getRequestId());navigate('/quick-invoice')}
  const paid = result?.invoice?.status==='paid' || (result?.invoice && Number(result.invoice.amount_due)<=0)
  const payable = result?.invoice && !paid && result.invoice.status!=='cancelled'
  const validCheckout = checkout && checkout.expiresAt*1000>now
  return <main className="quick-invoice">
    <header className="quick-heading"><div><button className="btn btn-secondary" onClick={()=>navigate('/')}>← Home</button><h1>Quick Invoice</h1><p>Invoice a service or repair and collect payment on site.</p></div>{invoiceId && <button className="btn btn-secondary" disabled={busy} onClick={startNew}>New Invoice</button>}</header>
    {error && <p className="quick-error" role="alert">{error}</p>}{message && <p className="quick-message" role="status">{message}</p>}
    {!invoiceId ? <form onSubmit={create} className="quick-panel">
      <h2>Customer & job</h2><div className="quick-fields">
        <label>Customer name<input required maxLength={200} value={customer.name} disabled={busy} onChange={e=>setCustomer({...customer,name:e.target.value})} autoComplete="name" /></label>
        <label>Email for invoice & receipt<input type="email" required maxLength={254} value={customer.email} disabled={busy} onChange={e=>setCustomer({...customer,email:e.target.value})} autoComplete="email" /></label>
        <label className="quick-wide">Service address<input required maxLength={500} value={customer.address} disabled={busy} onChange={e=>setCustomer({...customer,address:e.target.value})} autoComplete="street-address" /></label>
        <label>Technician<input required maxLength={200} value={customer.technician} disabled={busy} onChange={e=>setCustomer({...customer,technician:e.target.value})} /></label>
        <label>Service date<input type="date" required value={customer.serviceDate} disabled={busy} onChange={e=>setCustomer({...customer,serviceDate:e.target.value})} /></label>
      </div>
      <h2>Services & repairs</h2><p>Enter the work agreed with the customer and the full price for each item.</p>
      {items.map((item,index)=><div className="quick-item" key={item.id}>
        <label>Item {index+1}<input required maxLength={500} placeholder="Example: Replace capacitor" value={item.description} disabled={busy} onChange={e=>setItems(items.map(i=>i.id===item.id?{...i,description:e.target.value}:i))} /></label>
        <label>Price ($)<input required type="number" inputMode="decimal" min="0" max="999999" step="0.01" value={item.price} disabled={busy} onChange={e=>setItems(items.map(i=>i.id===item.id?{...i,price:e.target.value}:i))} /></label>
        <button type="button" aria-label={`Remove item ${index+1}`} className="btn btn-secondary" disabled={busy || items.length===1} onClick={()=>setItems(items.filter(i=>i.id!==item.id))}>Remove</button>
      </div>)}
      <button type="button" className="btn btn-secondary" disabled={busy || items.length>=100} onClick={()=>setItems([...items,newItem()])}>+ Add Item</button>
      <label className="quick-notes">Scope of work / notes<textarea maxLength={4000} rows={3} value={customer.notes} disabled={busy} onChange={e=>setCustomer({...customer,notes:e.target.value})} /></label>
      <div className="quick-total"><span>Total due</span><strong>{dollars(total)}</strong></div>
      <p>Check the details before creating the invoice. The saved invoice will also appear in the CRM.</p>
      <button className="btn btn-primary" disabled={busy}>{busy?'Creating…':'Create Invoice & Continue to Payment'}</button>
    </form> : result?.invoice ? <section className="quick-panel">
      <div className="quick-invoice-title"><h2>{result.invoice.invoice_number}</h2><span className={paid?'quick-paid':'quick-status'}>{paid?'Paid':result.invoice.status}</span></div>
      <p><strong>{result.snapshot?.customer_name}</strong><br/>{result.snapshot?.address}<br/>{result.recipient}</p><div className="quick-lines">{result.lines.map((l:any,index:number)=><div key={l.id || index}><span>{l.description}</span><strong>{dollars(l.total_cost)}</strong></div>)}</div>
      <div className="quick-total"><span>{paid?'Paid in full':'Balance due'}</span><strong>{dollars(result.invoice.amount_due)}</strong></div>
      {paid && <p className="quick-message">Payment recorded. You can download the invoice below.</p>}
      <div className="quick-actions">
        {payable && <button className="btn btn-primary" disabled={busy} onClick={pay}>{busy?'Working…':checkout?'Refresh Payment Link':'Collect Payment'}</button>}
        {payable && <button className="btn btn-secondary" disabled={busy} onClick={()=>run(async()=>{const d=await call('send',{invoiceId});setMessage(d.alreadySent?'This invoice and payment link were already emailed.':'Invoice PDF and payment link emailed.');})}>Email Invoice & Payment Link</button>}
        {result.invoice.status!=='cancelled' && <button className="btn btn-secondary" disabled={busy} onClick={()=>run(async()=>{await call('send_only',{invoiceId});setMessage('Invoice PDF emailed without a payment link.');setResult(await call('get',{invoiceId}));})}>Send Invoice Only</button>}
        <button className="btn btn-secondary" disabled={busy} onClick={download}>Download Invoice PDF</button>
        <button className="btn btn-secondary" disabled={busy} onClick={refresh}>Check Payment Status</button>
      </div>
      {validCheckout ? <div className="quick-payment"><h2>Scan to pay</h2><p>The customer can scan this code with their phone camera.</p><QRCodeSVG value={checkout!.url} size={256} marginSize={4} level="M" title="Scan to pay this invoice securely with Stripe" /><p>Pay by card or an available wallet, such as Apple Pay, on the customer’s phone.</p><a className="btn btn-primary" href={checkout!.url} target="_blank" rel="noopener noreferrer">Open Stripe Checkout on This iPad</a><p>Waiting for Stripe confirmation. Payment status updates automatically.</p></div> : checkout && <p>This payment link has expired. Tap Refresh Payment Link.</p>}
      <p className="quick-tap-note">This invoice is saved in CRM → Invoices. For cash payments, record the payment in CRM → Payments, then check payment status here before emailing a paid invoice. Send Invoice Only emails the PDF without a payment link.</p>
      {payable && <p className="quick-tap-note">Tap a card or phone: a separate Stripe card reader is required with an iPad. The iPad itself cannot accept contactless card taps. Scan-to-pay works without a reader.</p>}
    </section> : <p role="status">{busy?'Loading invoice…':'Invoice could not be loaded.'}</p>}
    {!invoiceId && <section className="quick-panel"><h2>Recent quick invoices</h2>{recent.length===0?<p>No quick invoices yet.</p>:recent.map(row=><button type="button" className="quick-recent" key={row.invoice_id} onClick={()=>navigate(`/quick-invoice/${row.invoice_id}`)}><span><strong>{row.crm_invoices?.invoice_number}</strong><br/>{row.snapshot?.customer_name}</span><span>{dollars(row.crm_invoices?.amount_due)} due<br/>{row.crm_invoices?.status}</span></button>)}</section>}
  </main>
}
