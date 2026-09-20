import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const source = fs.readFileSync(new URL('../supabase/functions/send-tuneup-email/index.ts', import.meta.url), 'utf8').replace(/^import .*\n/, '')
const code = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None })
function setup({ authenticated = true, role = 'admin', providerStatus = 200 } = {}) {
  let handler, sent
  const client = {
    auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'test-user', email: 'tech@example.com' } : null }, error: null }) },
    from: () => ({ select: () => ({ or: async () => ({ data: [{ role }], error: null }) }) }),
  }
  vm.runInNewContext(code, {
    createClient: () => client, Response, Request, AbortSignal,
    Deno: { env: { get: () => 'test-config' }, serve: fn => { handler = fn } },
    fetch: async (_, options) => {
      sent = JSON.parse(options.body)
      return Response.json(providerStatus === 200 ? { id: 'email-test-id' } : { message: 'Provider rejected sender' }, { status: providerStatus })
    },
  })
  return { call: body => handler(new Request('https://example.com', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body) })), sent: () => sent }
}
const body = { to: 'cramerservicesllc@gmail.com', customerName: 'TEST ONLY', pdfBase64: Buffer.from('%PDF-1.4\n%%EOF').toString('base64'), filename: 'test.pdf' }
test('tune-up payload sends PDF content without estimate fields', async () => {
  const app = setup(); const res = await app.call(body)
  assert.equal(res.status, 200); assert.equal((await res.json()).success, true)
  assert.equal(app.sent().attachments[0].content, body.pdfBase64)
  assert.equal(app.sent().attachments[0].filename, 'test.pdf')
  assert.match(app.sent().subject, /HVAC Tune-Up/)
  assert.deepEqual(app.sent().to, [body.to])
})
test('rejects signed-out users before sending', async () => {
  const app = setup({ authenticated: false }); assert.equal((await app.call(body)).status, 401); assert.equal(app.sent(), undefined)
})
test('rejects customer accounts before sending', async () => {
  const app = setup({ role: 'customer' }); assert.equal((await app.call(body)).status, 403); assert.equal(app.sent(), undefined)
})
test('rejects invalid PDF attachments', async () => {
  const app = setup(); assert.equal((await app.call({ ...body, pdfBase64: 'invalid' })).status, 400); assert.equal(app.sent(), undefined)
})
test('returns provider errors instead of false success', async () => {
  const app = setup({ providerStatus: 422 }); const res = await app.call(body)
  assert.equal(res.status, 502); assert.equal((await res.json()).error, 'Provider rejected sender')
})
