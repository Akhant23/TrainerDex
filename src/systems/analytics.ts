/**
 * Visit stats for the admin's METRICS tab. One small report when a visit starts (where it came
 * from: referrer, utm / ?ref= tags, a personal link), a report the first time each menu section is
 * opened, and the seconds the page has been visible, every 20 s and on the way out. The server
 * (supabase/functions/track-visit) works out browser, device, network and place itself.
 *
 * Never sent: with the VISIT STATS setting off, with Do Not Track or Global Privacy Control on, on
 * the admin or the phone controller, from local dev servers, or without a backend.
 */
import { menuEntryForRoute } from '../content/menu'
import { load, save } from './storage'
import type { Settings } from './settings'

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
const PING_MS = 20_000

function randomId(): string {
  const a = 'abcdefghijklmnopqrstuvwxyz0123456789'
  try {
    return Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => a[b % 36]).join('')
  } catch {
    return Array.from({ length: 20 }, () => a[Math.floor(Math.random() * 36)]).join('')
  }
}

const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]{16,40}$/.test(v)

/** This browser's random visitor id (kept in localStorage; "Reset save data" clears it). */
export function visitorId(): string {
  const id = load<string>('vid', '', isId)
  if (id) return id
  const fresh = randomId()
  save('vid', fresh)
  return fresh
}

/** A sessionStorage read that can't throw (storage blocked, e.g. Safari's "Block All Cookies"). */
function sessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function sessionId(): string {
  try {
    const s = sessionStorage.getItem('tdx:v1:sid')
    if (s && isId(s)) return s
    const fresh = randomId()
    sessionStorage.setItem('tdx:v1:sid', fresh)
    return fresh
  } catch {
    return randomId()
  }
}

/** Off when the visitor (or the admin, for their own browser) turned VISIT STATS off. */
export function statsAllowed(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  if (nav.globalPrivacyControl || nav.doNotTrack === '1') return false
  return load<Partial<Settings>>('settings', {}).visitStats !== false
}

const excludedRoute = (path: string) => path.startsWith('/admin') || path.startsWith('/controller')

function sectionOf(path: string): string | null {
  if (path === '/medals') return 'medals'
  return menuEntryForRoute(path)?.id ?? null
}

let started = false

/**
 * Begin reporting this visit, once per page load; it lasts as long as the page. `path` is the
 * current hash route; `onRoute` subscribes to route changes.
 */
export function startVisitStats(path: string, onRoute: (fn: (path: string) => void) => void): void {
  if (started || !URL || !ANON) return
  const local = /^(localhost|127\.|\[?::1\]?|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname)
  if ((local && !load('metrics-dev', false)) || excludedRoute(path) || !statsAllowed()) return
  started = true

  const endpoint = `${URL}/functions/v1/track-visit?apikey=${encodeURIComponent(ANON)}`
  const session = sessionId()
  const visitor = visitorId()
  let queue: Promise<unknown> = Promise.resolve()
  // text/plain keeps it a simple request (no preflight), so it can go out as the page closes
  const send = (body: Record<string, unknown>, keepalive = false) => {
    if (!statsAllowed()) return
    const payload = JSON.stringify({ ...body, session, visitor, seconds: Math.floor(seconds()) })
    queue = queue.then(() => fetch(endpoint, { method: 'POST', body: payload, keepalive }).catch(() => undefined))
  }

  // visible time only, carried across reloads of the same tab
  let base = Number(sessionGet('tdx:v1:secs') ?? 0) || 0
  let since = document.visibilityState === 'visible' ? performance.now() : 0
  const seconds = () => base + (since ? (performance.now() - since) / 1000 : 0)
  const bank = () => {
    base = seconds()
    since = 0
    try {
      sessionStorage.setItem('tdx:v1:secs', String(Math.floor(base)))
    } catch {
      /* storage off */
    }
  }

  // where this visit came from: tags and a personal link from the query, or the stored link
  const q = new URLSearchParams(location.search)
  const tag = (k: string) => q.get(k)?.slice(0, 80) || undefined
  const link = q.get('p')?.toLowerCase()
  if (link && /^[a-z0-9]{6,16}$/.test(link)) save('plink', link)
  send({
    event: 'start',
    referrer: document.referrer || undefined,
    landing: (location.pathname + location.hash).slice(0, 200),
    utm_source: tag('utm_source'),
    utm_medium: tag('utm_medium'),
    utm_campaign: tag('utm_campaign'),
    ref: tag('ref'),
    link: load<string>('plink', '') || undefined,
  })

  const opened = new Set<string>()
  try {
    const was: unknown = JSON.parse(sessionGet('tdx:v1:opened') ?? '[]')
    if (Array.isArray(was)) for (const x of was) if (typeof x === 'string') opened.add(x)
  } catch {
    /* garbled: count sections afresh */
  }
  const route = (p: string) => {
    const s = sectionOf(p)
    if (!s || opened.has(s)) return
    opened.add(s)
    try {
      sessionStorage.setItem('tdx:v1:opened', JSON.stringify([...opened]))
    } catch {
      /* storage off */
    }
    send({ event: 'section', section: s })
  }
  route(path)
  onRoute(route)

  window.setInterval(() => document.visibilityState === 'visible' && send({ event: 'ping' }), PING_MS)
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      bank()
      send({ event: 'ping' }, true)
    } else since = performance.now()
  }
  const onHide = () => {
    bank()
    send({ event: 'ping' }, true)
  }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onHide)
}
