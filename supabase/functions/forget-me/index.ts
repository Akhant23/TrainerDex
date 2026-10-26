// Supabase Edge Function: forget-me
//
// POST { trainerId, secret, visitorId? }
//   Deletes everything this browser sent: the resort avatar (if the secret matches), every
//   Poké Pager message or suggestion stamped with the same secret, and the visit metrics recorded
//   under this browser's random visitor id. Called from
//   Settings → Reset save data. Nothing to prove beyond the secret, which only that browser holds.
//
// Secrets (set with `supabase secrets set`): ALLOWED_ORIGINS (comma-separated)
// Provided automatically by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const env = (k: string) => Deno.env.get(k) ?? ''
const allowed = env('ALLOWED_ORIGINS')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function cors(origin: string | null): HeadersInit {
  const ok = origin && (allowed.length === 0 || allowed.includes(origin))
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  }
}
const json = (body: unknown, status: number, origin: string | null) => new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } })

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SECRET_RE = /^[0-9a-f]{32,128}$/i
const VISITOR_RE = /^[a-z0-9]{16,40}$/

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin)
  if (allowed.length && origin && !allowed.includes(origin)) return json({ error: 'Origin not allowed.' }, 403, origin)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request.' }, 400, origin)
  }
  const id = String(body.trainerId ?? '')
  const secret = String(body.secret ?? '')
  if (!UUID_RE.test(id) || !SECRET_RE.test(secret)) return json({ error: 'Invalid request.' }, 400, origin)
  const visitor = typeof body.visitorId === 'string' && VISITOR_RE.test(body.visitorId) ? body.visitorId : null

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
  const [{ error: e1, count: messages }, { error: e2, count: trainers }, { error: e3, count: visits }] = await Promise.all([
    db.from('messages').delete({ count: 'exact' }).eq('owner_hash', await sha256(`owner:${secret}`)),
    db.from('trainers').delete({ count: 'exact' }).eq('id', id.toLowerCase()).eq('secret_hash', await sha256(`trainer:${secret}`)),
    visitor ? db.from('visits').delete({ count: 'exact' }).eq('visitor_id', visitor) : Promise.resolve({ error: null, count: 0 }),
  ])
  if (e1 || e2 || e3) {
    console.error('forget failed', e1?.message, e2?.message, e3?.message)
    return json({ error: 'Couldn’t remove your data right now. Please try again.' }, 500, origin)
  }
  return json({ ok: true, messages: messages ?? 0, trainers: trainers ?? 0, visits: visits ?? 0 }, 200, origin)
})
