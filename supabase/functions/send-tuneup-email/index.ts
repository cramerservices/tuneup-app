import { createClient } from 'npm:@supabase/supabase-js@2.86.0'

const cors = {
  'Access-Control-Allow-Origin': 'https://www.cramerservies.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { success: false, error: 'Use POST.' })
  try {
    const authorization = req.headers.get('Authorization') || ''
    if (!authorization.startsWith('Bearer ')) return json(401, { success: false, error: 'Sign in is required.' })
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
    const { data: { user }, error } = await client.auth.getUser()
    if (error || !user) return json(401, { success: false, error: 'Your session expired. Sign in again.' })
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })
    const { data: profiles, error: profileError } = await admin.from('profiles').select('role')
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
    if (profileError) throw new Error('Unable to verify staff access.')
    const approvedEmails = ['cramerservicesllc@gmail.com', 'cramerservicesllc+staff@gmail.com']
    const staffRoles = ['admin', 'staff', 'technician', 'tech']
    if (!approvedEmails.includes((user.email || '').toLowerCase()) &&
        !profiles?.some(p => staffRoles.includes(String(p.role).toLowerCase()))) {
      return json(403, { success: false, error: 'Staff access is required to email reports.' })
    }
    let body
    try { body = await req.json() } catch { return json(400, { success: false, error: 'Invalid report request.' }) }
    const to = typeof body.to === 'string' ? body.to.trim() : ''
    if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(to)) return json(400, { success: false, error: 'Enter a valid customer email.' })
    const pdf = body.pdfBase64
    if (typeof pdf !== 'string' || !pdf.startsWith('JVBERi0') || !/^[A-Za-z0-9+/]+={0,2}$/.test(pdf)) {
      return json(400, { success: false, error: 'A valid PDF report is required.' })
    }
    if (pdf.length > 20 * 1024 * 1024) return json(413, { success: false, error: 'Report is too large to email. Reduce the number of photos.' })
    const key = Deno.env.get('RESEND_API_KEY')
    if (!key) throw new Error('Email service is not configured.')
    const clean = (value: unknown) => String(value || '').replace(/[\r\n]/g, ' ').slice(0, 250)
    const filename = (clean(body.filename).replace(/[^a-zA-Z0-9._-]/g, '-') || 'tuneup-summary.pdf').replace(/(?:\.pdf)?$/, '.pdf')
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Cramer Services <estimates@cramerservicesllc.com>',
        reply_to: 'cramerservicesllc@gmail.com',
        to: [to],
        subject: `Your HVAC Tune-Up Report${body.inspectionDate ? ` - ${clean(body.inspectionDate)}` : ''}`,
        text: `Hi ${clean(body.customerName) || 'Customer'},\n\nYour HVAC tune-up summary report is attached.\n\nInspection date: ${clean(body.inspectionDate)}\nTechnician: ${clean(body.technicianName)}\nService address: ${clean(body.address)}\n\nQuestions? Reply to this email or call 314-267-8594.\n\nThank you,\nCramer Services LLC`,
        attachments: [{ filename, content: pdf }],
      }),
      signal: AbortSignal.timeout(25000),
    })
    const sent = await result.json()
    if (!result.ok) return json(502, { success: false, error: sent.message || 'Email provider rejected the report.' })
    if (!sent.id) throw new Error('Email provider did not confirm acceptance.')
    return json(200, { success: true, id: sent.id })
  } catch (error) {
    return json(500, { success: false, error: error instanceof Error ? error.message : 'Unable to send the report.' })
  }
})
