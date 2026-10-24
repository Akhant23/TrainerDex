// Supabase Edge Function: submit-message
//
// POST { name, message, avatar, kind?, turnstileToken, website, trainerId?, trainerSecret? }
//   kind = 'message' (default) or 'suggestion' (a creature idea; only admins ever see it)
//   1. CORS + method check
//   2. Validate & clean (shared rules), honeypot, links, profanity
//   3. Verify the Cloudflare Turnstile token server-side
//   4. Rate limit by salted IP hash (3 per hour, 10 per day)
//   5. If a resort trainer id + secret are sent and match, link the message to that avatar
//   6. Insert as `pending` with the service role (browser inserts are blocked by RLS)
//
// Secrets (set with `supabase secrets set`, never in the client):
//   TURNSTILE_SECRET_KEY, RATE_LIMIT_SALT, ALLOWED_ORIGINS (comma-separated)
// Provided automatically by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { validateSubmission } from '../_shared/validate.ts'

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

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } })
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Ask Cloudflare whether the Turnstile token is good. Returns Cloudflare's error codes when it isn't
 * (logged, never the secret): "invalid-input-secret" / "missing-input-secret" mean this server's
 * TURNSTILE_SECRET_KEY is wrong or unset — a set-up problem, not the visitor's fault.
 */
async function verifyTurnstile(token: string, ip: string): Promise<{ ok: boolean; codes: string[] }> {
  const secret = env('TURNSTILE_SECRET_KEY')
  if (!secret) return { ok: false, codes: ['missing-input-secret'] }
  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  if (ip) form.append('remoteip', ip)
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
  const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
  return { ok: data.success === true, codes: data['error-codes'] ?? [] }
}
const SETUP_CODES = ['invalid-input-secret', 'missing-input-secret']

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

  const result = validateSubmission(body as never)
  if (!result.ok) {
    // pretend success to obvious bots so they don't learn the rules
    if (result.spam && body.website) return json({ ok: true }, 202, origin)
    return json({ error: result.error }, 400, origin)
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  const human = await verifyTurnstile(String(body.turnstileToken ?? ''), ip)
  if (!human.ok) {
    console.warn('turnstile rejected:', human.codes.join(',') || 'no codes')
    if (human.codes.some((c) => SETUP_CODES.includes(c))) return json({ error: 'The human check isn’t set up correctly on the server yet. Please try again later.' }, 503, origin)
    return json({ error: 'Couldn’t verify you’re human. Please try the check again.' }, 400, origin)
  }

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
  const ipHash = await sha256(`${env('RATE_LIMIT_SALT')}:${ip}`)

  const since = (ms: number) => new Date(Date.now() - ms).toISOString()
  const [{ count: hour }, { count: day }] = await Promise.all([
    db.from('messages').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since(3_600_000)),
    db.from('messages').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since(86_400_000)),
  ])
  if ((hour ?? 0) >= 3 || (day ?? 0) >= 10) {
    return json({ error: 'You’ve sent a few messages already — please try again later.' }, 429, origin)
  }

  // optional link to the sender's resort avatar (only if they prove they own it)
  let trainerId: string | null = null
  if (result.value.kind === 'message' && typeof body.trainerId === 'string' && typeof body.trainerSecret === 'string') {
    const { data: t } = await db.from('trainers').select('id, secret_hash').eq('id', body.trainerId).maybeSingle()
    if (t && t.secret_hash === (await sha256(`trainer:${body.trainerSecret}`))) trainerId = t.id
  }

  // lets the sender delete it later with the same browser secret ("forget me")
  const ownerHash = typeof body.trainerSecret === 'string' && /^[0-9a-f]{32,128}$/i.test(body.trainerSecret) ? await sha256(`owner:${body.trainerSecret}`) : null

  const { error } = await db.from('messages').insert({ ...result.value, trainer_id: trainerId, owner_hash: ownerHash, ip_hash: ipHash, status: 'pending' })
  if (error) {
    console.error('insert failed', error.message)
    return json({ error: 'Something went wrong sending your message.' }, 500, origin)
  }
  return json({ ok: true }, 202, origin)
})
