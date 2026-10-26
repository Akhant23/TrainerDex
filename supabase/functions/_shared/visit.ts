/**
 * Visit metrics: what the site reports, checked strictly, and the facts derived from a request
 * (browser, system, device, where the visitor came from). Pure functions shared by the
 * `track-visit` Edge Function and the site's tests.
 */

/** The menu sections a visit can open (src/content/menu.ts ids, plus the medal box). */
export const SECTIONS = ['profile', 'pokedex', 'card', 'pc', 'album', 'battle', 'pager', 'settings', 'medals'] as const
export type Section = (typeof SECTIONS)[number]

export type VisitSource = 'linkedin' | 'search' | 'social' | 'referral' | 'tagged' | 'direct'

export interface VisitReport {
  /** start: a new visit; ping: still here (active seconds so far); section: opened a section */
  event: 'start' | 'ping' | 'section'
  session: string
  visitor: string
  seconds: number
  section?: Section
  /** start only */
  referrer?: string
  landing?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  ref?: string
  link?: string
}

const ID = /^[a-z0-9]{16,40}$/
const LINK = /^[a-z0-9]{6,16}$/
const clip = (v: unknown, n: number): string | undefined => {
  if (typeof v !== 'string') return undefined
  // drop control characters
  const s = [...v].filter((c) => c.charCodeAt(0) > 31 && c.charCodeAt(0) !== 127).join('').trim()
  return s ? s.slice(0, n) : undefined
}

/** A report from the site, or null if anything about it is off. */
export function parseVisitReport(raw: unknown): VisitReport | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const b = raw as Record<string, unknown>
  if (b.event !== 'start' && b.event !== 'ping' && b.event !== 'section') return null
  if (typeof b.session !== 'string' || !ID.test(b.session)) return null
  if (typeof b.visitor !== 'string' || !ID.test(b.visitor)) return null
  const seconds = Number(b.seconds ?? 0)
  if (!Number.isFinite(seconds) || seconds < 0) return null
  const r: VisitReport = { event: b.event, session: b.session, visitor: b.visitor, seconds: Math.min(14400, Math.floor(seconds)) }
  if (b.event === 'section') {
    if (!SECTIONS.includes(b.section as Section)) return null
    r.section = b.section as Section
  }
  if (b.event === 'start') {
    r.referrer = clip(b.referrer, 500)
    r.landing = clip(b.landing, 200)
    r.utm_source = clip(b.utm_source, 80)
    r.utm_medium = clip(b.utm_medium, 80)
    r.utm_campaign = clip(b.utm_campaign, 80)
    r.ref = clip(b.ref, 80)
    const link = clip(b.link, 16)?.toLowerCase()
    if (link && LINK.test(link)) r.link = link
  }
  return r
}

/** The host of a referrer URL (without "www."), or undefined for none / an unreadable one. */
export function referrerHost(referrer: string | undefined): string | undefined {
  if (!referrer) return undefined
  try {
    const u = new URL(referrer)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined
    return u.hostname.replace(/^www\./, '').toLowerCase().slice(0, 120)
  } catch {
    return undefined
  }
}

const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex|brave|startpage|kagi)\./
const SOCIAL = /(^|\.)(facebook\.com|fb\.com|instagram\.com|t\.co|x\.com|twitter\.com|reddit\.com|threads\.net|tiktok\.com|youtube\.com|discord\.com|bsky\.app|mastodon\.social|whatsapp\.com|messenger\.com)$/

/**
 * Where a visit came from. LinkedIn wins whether it's the referrer, a short link or a tag; then
 * a tag (utm / ?ref=); then the referrer's kind; no referrer is a direct visit. Links within the
 * site itself don't count as referrers.
 */
export function classifySource(r: { host?: string; utm_source?: string; ref?: string }, siteHost?: string): VisitSource {
  const host = r.host && r.host !== siteHost?.replace(/^www\./, '') ? r.host : undefined
  const tag = `${r.utm_source ?? ''} ${r.ref ?? ''}`.toLowerCase()
  if (host === 'linkedin.com' || host?.endsWith('.linkedin.com') || host === 'lnkd.in' || /linkedin/.test(tag)) return 'linkedin'
  if (tag.trim()) return 'tagged'
  if (!host) return 'direct'
  if (SEARCH.test(host)) return 'search'
  if (SOCIAL.test(host)) return 'social'
  return 'referral'
}

export interface Agent {
  device: 'desktop' | 'mobile' | 'tablet'
  os?: string
  os_version?: string
  browser?: string
  browser_version?: string
}

const major = (v: string | undefined, parts = 1) => v?.replace(/_/g, '.').split('.').slice(0, parts).join('.')

/**
 * Browser, system and device from a User-Agent string. Deliberately coarse (major versions only),
 * and newer browsers freeze some of it (e.g. Chrome always says macOS 10.15).
 */
export function parseUserAgent(ua: string): Agent {
  const s = ua.slice(0, 600)
  let os: string | undefined
  let osv: string | undefined
  let m: RegExpMatchArray | null
  if ((m = s.match(/iPhone OS (\d+[_\d]*)/)) || (m = s.match(/iPad.*OS (\d+[_\d]*)/))) {
    os = 'iOS'
    osv = major(m[1], 2)
  } else if (/iPad|iPhone|iPod/.test(s)) os = 'iOS'
  else if ((m = s.match(/Android (\d+(?:\.\d+)?)/))) {
    os = 'Android'
    osv = major(m[1])
  } else if ((m = s.match(/Mac OS X (\d+[_.]\d+)/))) {
    os = 'macOS'
    osv = major(m[1], 2)
  } else if ((m = s.match(/Windows NT (\d+\.\d+)/))) {
    os = 'Windows'
    osv = ({ '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' } as Record<string, string>)[m[1]] ?? m[1]
  } else if (/CrOS/.test(s)) os = 'ChromeOS'
  else if (/Linux/.test(s)) os = 'Linux'

  let browser: string | undefined
  let bv: string | undefined
  const pick = (name: string, re: RegExp) => {
    const r = s.match(re)
    if (r && !browser) {
      browser = name
      bv = major(r[1])
    }
  }
  pick('Edge', /Edg(?:e|A|iOS)?\/(\d+[\d.]*)/)
  pick('Opera', /(?:OPR|Opera)\/(\d+[\d.]*)/)
  pick('Samsung Internet', /SamsungBrowser\/(\d+[\d.]*)/)
  pick('Firefox', /(?:Firefox|FxiOS)\/(\d+[\d.]*)/)
  pick('Chrome', /(?:CriOS|Chrome)\/(\d+[\d.]*)/)
  if (!browser && /Safari\//.test(s)) pick('Safari', /Version\/(\d+[\d.]*)/)
  if (!browser && /Safari\//.test(s)) browser = 'Safari'

  const tablet = /iPad|Tablet|PlayBook/.test(s) || (/Android/.test(s) && !/Mobile/.test(s))
  const mobile = !tablet && /Mobi|iPhone|iPod|Android/.test(s)
  return { device: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop', os, os_version: osv, browser, browser_version: bv }
}

/** True for automated traffic the metrics shouldn't count (crawlers, link previews, headless). */
export function isBot(ua: string): boolean {
  return !ua || /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora link|headless|lighthouse|pingdom|uptime|curl|wget|python-requests|axios|node-fetch/i.test(ua)
}
