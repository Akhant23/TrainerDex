// Supabase Edge Function: track-visit
//
// POST (text/plain JSON, so the browser can send it on the way out without a preflight)
//   { event: 'start' | 'ping' | 'section', session, visitor, seconds, section?, referrer?, landing?,
//     utm_source?, utm_medium?, utm_campaign?, ref?, link? }
//
//   start   → records a visit: source (LinkedIn, search, tag…), browser/system/device from the
//             User-Agent, and the visitor's network and place from their IP (looked up at
//             ip-api.com, cached a week in ip_lookups). A personal-link code labels the visit.
//   ping    → updates how long the page has been visible (never goes down, capped at 4 h)
//   section → adds a menu section to the visit's list (each once, in order)
//
// Bots and link previews are ignored. Each IP may start at most 60 visits an hour. Now and then
// it runs public.purge_old_visits() (180-day retention).
//
// Secrets (set with `supabase secrets set`): ALLOWED_ORIGINS (comma-separated)
// Provided automatically by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { classifySource, isBot, parseUserAgent, parseVisitReport, referrerHost } from '../_shared/visit.ts'

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
const reply = (status: number, origin: string | null, body: unknown = { ok: status < 400 }) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } })

interface Lookup {
  host: string | null
  org: string | null
  isp: string | null
  asn: string | null
  city: string | null
  region: string | null
  country: string | null
  country_code: string | null
}

const cut = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)

/** Network and place for an IP: from the week-long cache, else ip-api.com (free, no key). */
// deno-lint-ignore no-explicit-any
async function lookup(db: any, ip: string): Promise<Lookup | null> {
  const { data: hit } = await db.from('ip_lookups').select('host,org,isp,asn,city,region,country,country_code').eq('ip', ip).gte('looked_up_at', new Date(Date.now() - 7 * 864e5).toISOString()).maybeSingle()
  if (hit) return hit as Lookup
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,isp,org,as,reverse`, { signal: AbortSignal.timeout(2500) })
    const j = await res.json()
    if (j.status !== 'success') return null
    const l: Lookup = {
      host: cut(j.reverse, 200),
      org: cut(j.org, 120) ?? cut(j.isp, 120),
      isp: cut(j.isp, 120),
      asn: cut(j.as, 120),
      city: cut(j.city, 80),
      region: cut(j.regionName, 80),
      country: cut(j.country, 80),
      country_code: cut(j.countryCode, 2),
    }
    await db.from('ip_lookups').upsert({ ip, looked_up_at: new Date().toISOString(), ...l })
    return l
  } catch (e) {
    console.error('ip lookup failed', (e as Error).message)
    return null
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })
  if (req.method !== 'POST') return reply(405, origin)
  if (allowed.length && origin && !allowed.includes(origin)) return reply(403, origin)

  const ua = req.headers.get('user-agent') ?? ''
  if (isBot(ua)) return reply(202, origin, { ok: true, ignored: 'bot' })

  let raw: unknown
  try {
    const text = await req.text()
    if (text.length > 4000) return reply(413, origin)
    raw = JSON.parse(text)
  } catch {
    return reply(400, origin)
  }
  const r = parseVisitReport(raw)
  if (!r) return reply(400, origin)

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
  const now = new Date().toISOString()

  if (r.event === 'ping') {
    // only ever forwards: a late or repeated ping can't shorten the visit
    const { error } = await db.from('visits').update({ active_seconds: r.seconds, last_seen_at: now }).eq('session_id', r.session).eq('visitor_id', r.visitor).lt('active_seconds', r.seconds)
    if (error) console.error('ping failed', error.message)
    return reply(error ? 500 : 200, origin)
  }

  if (r.event === 'section') {
    const { data: v } = await db.from('visits').select('id,sections').eq('session_id', r.session).eq('visitor_id', r.visitor).maybeSingle()
    if (!v) return reply(404, origin)
    const sections: string[] = v.sections ?? []
    if (!sections.includes(r.section!) && sections.length < 20) {
      const { error } = await db
        .from('visits')
        .update({ sections: [...sections, r.section], last_seen_at: now })
        .eq('id', v.id)
      if (error) console.error('section failed', error.message)
    }
    return reply(200, origin)
  }

  // start: one row per session (a reload of the same tab carries on the same visit)
  const { data: existing } = await db.from('visits').select('id').eq('session_id', r.session).maybeSingle()
  if (existing) return reply(200, origin, { ok: true, again: true })

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  if (ip) {
    const { count } = await db.from('visits').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('started_at', new Date(Date.now() - 3600e3).toISOString())
    if ((count ?? 0) >= 60) return reply(429, origin)
  }

  const host = referrerHost(r.referrer)
  const siteHost = origin ? referrerHost(origin) : undefined
  const source = classifySource({ host, utm_source: r.utm_source, ref: r.ref }, siteHost)
  const agent = parseUserAgent(ua)
  const [place, prior, link] = await Promise.all([
    ip ? lookup(db, ip) : Promise.resolve(null),
    db.from('visits').select('id', { count: 'exact', head: true }).eq('visitor_id', r.visitor),
    r.link ? db.from('personal_links').select('code,label').eq('code', r.link).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const { error } = await db.from('visits').insert({
    session_id: r.session,
    visitor_id: r.visitor,
    started_at: now,
    last_seen_at: now,
    active_seconds: r.seconds,
    returning_visit: (prior.count ?? 0) > 0,
    source,
    referrer_host: host && host !== siteHost ? host : null,
    landing: r.landing ?? null,
    utm_source: r.utm_source ?? null,
    utm_medium: r.utm_medium ?? null,
    utm_campaign: r.utm_campaign ?? null,
    ref: r.ref ?? null,
    link_code: link.data?.code ?? null,
    label: link.data?.label ?? null,
    ip: ip || null,
    ip_host: place?.host ?? null,
    org: place?.org ?? null,
    isp: place?.isp ?? null,
    asn: place?.asn ?? null,
    city: place?.city ?? null,
    region: place?.region ?? null,
    country: place?.country ?? null,
    country_code: place?.country_code ?? null,
    ...agent,
  })
  // a second start for the same session racing this one is fine
  if (error && error.code !== '23505') {
    console.error('start failed', error.message)
    return reply(500, origin)
  }

  // retention, about once in fifty visits
  if (Math.random() < 0.02) {
    const { error: purge } = await db.rpc('purge_old_visits')
    if (purge) console.error('purge failed', purge.message)
  }
  return reply(200, origin, { ok: true, label: link.data?.label ?? null })
})
