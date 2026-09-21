import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { jsPDF } from 'jspdf'
const root=new URL('../',import.meta.url)
const shared={exports:{}}
vm.runInNewContext(ts.transpile(fs.readFileSync(new URL('supabase/functions/_shared/invoice.ts',root),'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}),shared)
const {invoiceLines,invoiceTotal}=shared.exports
const choices=[
 {id:'r',kind:'repair',description:'Capacitor repair',price:125.25,approval:'approved'},
 {id:'a',kind:'addon',description:'Surge protector',price:150,approval:'approved'},
 {id:'d',kind:'addon',description:'Declined upgrade',price:500,approval:'disapproved'},
 {id:'p',kind:'repair',description:'Undecided repair',price:700,approval:'pending'},
]
const draft={choices}
const raw=fs.readFileSync(new URL('supabase/functions/tuneup-invoice/index.ts',root),'utf8').replace(/^import .*\n/gm,'')
const code=ts.transpile(raw,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None})
function setup({role='admin',paid=false,providerFails=false}={}) {
 const state={emails:[],sessions:[],invoice:{id:'11111111-1111-4111-8111-111111111111',invoice_number:'INV-TEST',customer_id:'customer-test',invoice_date:'2026-09-21',due_date:'2026-09-28',created_at:'2026-09-21T00:00:00Z',status:paid?'paid':'draft',total_amount:275.25,amount_paid:paid?275.25:0,amount_due:paid?0:275.25},billing:{inspection_id:'22222222-2222-4222-8222-222222222222',invoice_id:'11111111-1111-4111-8111-111111111111',recipient_email:'cramerservicesllc@gmail.com',draft,snapshot:{customer_name:'Test Customer',address:'TEST ONLY'}}}
 const tables={tuneup_billing:state.billing,crm_invoices:state.invoice,crm_invoice_line_items:invoiceLines(draft)}
 const admin={auth:{getUser:async()=>({data:{user:{id:'staff-id',email:'staff@example.com',app_metadata:{role}}}})},from:table=>{
  let patch
  const result=()=>{if(patch)Object.assign(tables[table],patch);return {data:tables[table],error:null}}
  const query={select:()=>query,eq:()=>query,order:()=>query,update:p=>{patch=p;return query},single:async()=>result(),maybeSingle:async()=>result(),then:(yes,no)=>Promise.resolve(result()).then(yes,no)}
  return query
 }}
 class Stripe { checkout={sessions:{
  create:async(params,opts)=>{state.sessions.push({params,opts});return {id:'cs_test_one',url:'https://checkout.stripe.com/test',status:'open',amount_total:27525,customer_email:state.billing.recipient_email}},
  retrieve:async()=>({id:'cs_test_one',url:'https://checkout.stripe.com/test',status:'open',amount_total:27525,customer_email:state.billing.recipient_email}),
  expire:async()=>({}),
 }} }
 let handler
 vm.runInNewContext(code,{createClient:()=>admin,Stripe,jsPDF,invoiceLines,Response,Request,AbortSignal,Date,
  Deno:{env:{get:()=> 'test-config'},serve:fn=>{handler=fn}},
  fetch:async(_,opts)=>{state.emails.push(JSON.parse(opts.body));return Response.json(providerFails?{message:'Sender rejected'}:{id:'email_test_one'},{status:providerFails?422:200})},
 })
 return {state,call:action=>handler(new Request('https://example.com',{method:'POST',headers:{Authorization:'Bearer mock'},body:JSON.stringify({action,inspectionId:state.billing.inspection_id})}))}
}
test('only approved repairs and add-ons count, with cent rounding',()=>{
 assert.equal(invoiceTotal(draft),275.25);assert.equal(invoiceLines(draft).length,2)
 assert.equal(invoiceTotal({choices:[{...choices[0],price:1.005}]}),1.01)
 assert.throws(()=>invoiceTotal({choices:[choices[0],choices[0]]}),/Duplicate/)
 assert.throws(()=>invoiceTotal({choices:[{...choices[0],price:-1}]}),/valid/)
})
test('email includes invoice PDF and Stripe link using the exact saved balance',async()=>{
 const app=setup();const res=await app.call('send');const body=await res.json();assert.equal(res.status,200,JSON.stringify(body))
 assert.equal(app.state.sessions.length,1)
 assert.equal(app.state.sessions[0].params.line_items.reduce((s,l)=>s+l.price_data.unit_amount,0),27525)
 assert.equal(app.state.sessions[0].params.metadata.invoice_id,app.state.invoice.id)
 assert.equal(app.state.sessions[0].params.payment_method_types,undefined)
 assert.deepEqual(app.state.emails[0].to,['cramerservicesllc@gmail.com'])
 assert.match(app.state.emails[0].html,/Pay Now with Stripe/)
 assert.equal(Buffer.from(app.state.emails[0].attachments[0].content,'base64').subarray(0,5).toString(),'%PDF-')
 assert.equal(app.state.billing.email_id,'email_test_one')
})
test('retry reuses the saved invoice and session without another email',async()=>{
 const app=setup();await app.call('send');const res=await app.call('send');assert.equal(res.status,200)
 assert.equal(app.state.sessions.length,1);assert.equal(app.state.emails.length,1)
})
test('customer cannot send payment requests',async()=>{
 const app=setup({role:'customer'});assert.equal((await app.call('send')).status,403);assert.equal(app.state.emails.length,0)
})
test('paid invoice cannot create another checkout',async()=>{
 const app=setup({paid:true});assert.equal((await app.call('send')).status,400);assert.equal(app.state.sessions.length,0)
})
test('provider failure is visible and does not mark email sent',async()=>{
 const app=setup({providerFails:true});const res=await app.call('send');assert.equal(res.status,400);assert.match((await res.json()).error,/Sender rejected/);assert.equal(app.state.billing.email_id,undefined)
})
