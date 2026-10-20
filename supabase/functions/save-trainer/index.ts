// Supabase Edge Function: save-trainer
//
// POST { id, secret, name, greeting, appearance, party, record: { titles, wins, losses } }
//   1. CORS + method check
//   2. Validate (shared rules): uuid id, random secret, filtered name/greeting, known options
//   3. Existing trainer → the secret must match (sha-256) → update
//      New trainer → rate limit by salted IP hash (5 new avatars per day) → insert
//   Avatars are public straight away; admins can hide them from the dashboard. Hidden
//   trainers stay hidden when their owner edits them.
//
// Secrets (set with `supabase secrets set`, never in the client):
//   RATE_LIMIT_SALT, ALLOWED_ORIGINS (comma-separated)
// Provided automatically by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { validateTrainer } from '../_shared/trainer.ts'

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

  const result = validateTrainer(body)
  if (!result.ok) return json({ error: result.error }, 400, origin)
  const t = result.value

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
  const secretHash = await sha256(`trainer:${t.secret}`)
  const fields = { name: t.name, greeting: t.greeting, appearance: t.appearance, party: t.party, titles: t.record.titles, wins: t.record.wins, losses: t.record.losses, updated_at: new Date().toISOString() }

  const { data: existing, error: readError } = await db.from('trainers').select('id, secret_hash, updated_at').eq('id', t.id).maybeSingle()
  if (readError) {
    console.error('read failed', readError.message)
    return json({ error: 'Something went wrong saving your avatar.' }, 500, origin)
  }

  if (existing) {
    if (existing.secret_hash !== secretHash) return json({ error: 'That avatar belongs to someone else.' }, 403, origin)
    // a gentle brake on rapid-fire edits
    if (Date.now() - new Date(existing.updated_at).getTime() < 5_000) return json({ error: 'Saving too quickly — try again in a few seconds.' }, 429, origin)
    const { error } = await db.from('trainers').update(fields).eq('id', t.id)
    if (error) {
      console.error('update failed', error.message)
      return json({ error: 'Something went wrong saving your avatar.' }, 500, origin)
    }
    return json({ ok: true }, 200, origin)
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  const ipHash = await sha256(`${env('RATE_LIMIT_SALT')}:${ip}`)
  const { count } = await db
    .from('trainers')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', new Date(Date.now() - 86_400_000).toISOString())
  if ((count ?? 0) >= 5) return json({ error: 'Too many new avatars from your network today — try again tomorrow.' }, 429, origin)

  const { error } = await db.from('trainers').insert({ id: t.id, ...fields, secret_hash: secretHash, ip_hash: ipHash })
  if (error) {
    console.error('insert failed', error.message)
    return json({ error: 'Something went wrong saving your avatar.' }, 500, origin)
  }
  return json({ ok: true }, 201, origin)
})
