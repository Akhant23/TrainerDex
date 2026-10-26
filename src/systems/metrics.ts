/**
 * The admin's METRICS tab, as pure functions over visit rows (public.visits): the headline
 * numbers, one row per visitor with their timeline, the breakdowns (sources, organisations,
 * places, browsers…) and visitors per day. Tested in metrics.test.ts.
 */
import { dayKey, shiftKey } from './activity'

export interface VisitRow {
  id: string
  visitor_id: string
  started_at: string
  last_seen_at: string
  active_seconds: number
  returning_visit: boolean
  source: 'linkedin' | 'search' | 'social' | 'referral' | 'tagged' | 'direct'
  referrer_host: string | null
  landing: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  ref: string | null
  link_code: string | null
  label: string | null
  ip_host: string | null
  org: string | null
  isp: string | null
  city: string | null
  region: string | null
  country: string | null
  country_code: string | null
  device: 'desktop' | 'mobile' | 'tablet' | null
  os: string | null
  os_version: string | null
  browser: string | null
  browser_version: string | null
  sections: string[]
}

export const VISIT_COLUMNS =
  'id,visitor_id,started_at,last_seen_at,active_seconds,returning_visit,source,referrer_host,landing,utm_source,utm_medium,utm_campaign,ref,link_code,label,ip_host,org,isp,city,region,country,country_code,device,os,os_version,browser,browser_version,sections'

export const SOURCE_NAMES: Record<VisitRow['source'], string> = {
  linkedin: 'LinkedIn',
  search: 'Search',
  social: 'Social',
  referral: 'Other sites',
  tagged: 'Tagged link',
  direct: 'Direct',
}

export const SECTION_NAMES: Record<string, string> = {
  profile: 'Profile',
  pokedex: 'Pokédex',
  card: 'Trainer Card',
  pc: 'PC',
  album: 'Photo Album',
  battle: 'Battle Resort',
  pager: 'Poké Pager',
  settings: 'Settings',
  medals: 'Medal Box',
}

const time = (iso: string) => Date.parse(iso) || 0

export function median(xs: readonly number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

/** 6s · 2m 05s · 1h 04m */
export function duration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`
}

/** 🇦🇺 for "AU" (regional indicator letters); empty for anything that isn't two letters. */
export function flag(cc: string | null | undefined): string {
  if (!cc || !/^[A-Za-z]{2}$/.test(cc)) return ''
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

export const placeOf = (v: Pick<VisitRow, 'city' | 'country_code' | 'country'>) => [v.city, v.country_code ?? v.country].filter(Boolean).join(', ') || null

export const deviceOf = (v: Pick<VisitRow, 'device' | 'os' | 'os_version' | 'browser' | 'browser_version'>) =>
  [v.device ? v.device[0].toUpperCase() + v.device.slice(1) : null, [v.os, v.os_version].filter(Boolean).join(' ') || null, [v.browser, v.browser_version].filter(Boolean).join(' ') || null]
    .filter(Boolean)
    .join(' · ')

export interface Summary {
  visits: number
  visitors: number
  linkedinVisitors: number
  linkedinVisits: number
  organisations: number
  returningVisits: number
  medianSeconds: number
  meanSeconds: number
  sectionVisits: number
}

export function summarize(visits: readonly VisitRow[]): Summary {
  const secs = visits.map((v) => v.active_seconds)
  return {
    visits: visits.length,
    visitors: new Set(visits.map((v) => v.visitor_id)).size,
    linkedinVisitors: new Set(visits.filter((v) => v.source === 'linkedin').map((v) => v.visitor_id)).size,
    linkedinVisits: visits.filter((v) => v.source === 'linkedin').length,
    organisations: new Set(visits.map((v) => v.org).filter(Boolean)).size,
    returningVisits: visits.filter((v) => v.returning_visit).length,
    medianSeconds: median(secs),
    meanSeconds: secs.length ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length) : 0,
    sectionVisits: visits.filter((v) => v.sections.length > 0).length,
  }
}

export const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0)

export interface VisitorRow {
  id: string
  /** The personal-link label, else "Someone at <org>", else "Someone in <place>". */
  who: string
  labelled: boolean
  org: string | null
  host: string | null
  place: string | null
  countryCode: string | null
  device: string
  /** How they first arrived. */
  source: VisitRow['source']
  fromLinkedIn: boolean
  visits: number
  seconds: number
  sections: string[]
  firstSeen: string
  lastSeen: string
  /** Their visits, newest first. */
  timeline: VisitRow[]
}

export function visitorsOf(visits: readonly VisitRow[]): VisitorRow[] {
  const by = new Map<string, VisitRow[]>()
  for (const v of visits) by.set(v.visitor_id, [...(by.get(v.visitor_id) ?? []), v])
  return [...by.entries()].map(([id, vs]) => {
    const timeline = [...vs].sort((a, b) => time(b.started_at) - time(a.started_at))
    const latest = timeline[0]
    const first = timeline[timeline.length - 1]
    const label = timeline.find((v) => v.label)?.label ?? null
    const org = timeline.find((v) => v.org)?.org ?? null
    const place = placeOf(latest)
    const sections = [...new Set(timeline.slice().reverse().flatMap((v) => v.sections))]
    return {
      id,
      who: label ?? (org ? `Someone at ${org}` : place ? `Someone in ${place}` : 'Someone'),
      labelled: Boolean(label),
      org,
      host: latest.ip_host,
      place,
      countryCode: latest.country_code,
      device: deviceOf(latest),
      source: first.source,
      fromLinkedIn: timeline.some((v) => v.source === 'linkedin'),
      visits: timeline.length,
      seconds: timeline.reduce((n, v) => n + v.active_seconds, 0),
      sections,
      firstSeen: first.started_at,
      lastSeen: timeline.reduce((m, v) => (time(v.last_seen_at) > time(m) ? v.last_seen_at : m), latest.last_seen_at),
      timeline,
    }
  })
}

export type VisitorSort = 'recent' | 'visits' | 'time' | 'sections' | 'org' | 'who'
export const VISITOR_SORTS: ReadonlyArray<{ value: VisitorSort; label: string }> = [
  { value: 'recent', label: 'Most recent' },
  { value: 'visits', label: 'Most visits' },
  { value: 'time', label: 'Most time on site' },
  { value: 'sections', label: 'Most sections opened' },
  { value: 'org', label: 'Organisation A–Z' },
  { value: 'who', label: 'Name A–Z' },
]

const collator = new Intl.Collator('en-AU', { sensitivity: 'base', numeric: true })
export function sortVisitors(rows: readonly VisitorRow[], sort: VisitorSort): VisitorRow[] {
  const recent = (a: VisitorRow, b: VisitorRow) => time(b.lastSeen) - time(a.lastSeen) || a.id.localeCompare(b.id)
  const cmp: Record<VisitorSort, (a: VisitorRow, b: VisitorRow) => number> = {
    recent,
    visits: (a, b) => b.visits - a.visits || recent(a, b),
    time: (a, b) => b.seconds - a.seconds || recent(a, b),
    sections: (a, b) => b.sections.length - a.sections.length || recent(a, b),
    // no organisation goes last
    org: (a, b) => (a.org ? (b.org ? collator.compare(a.org, b.org) : -1) : b.org ? 1 : 0) || recent(a, b),
    who: (a, b) => collator.compare(a.who, b.who) || recent(a, b),
  }
  return [...rows].sort(cmp[sort])
}

export interface Tally {
  key: string
  count: number
  /** Distinct visitors behind the count. */
  people: number
}

/** Visits counted by `keyOf` (null keys skipped), biggest first, with distinct visitors each. */
export function tally(visits: readonly VisitRow[], keyOf: (v: VisitRow) => string | null | undefined | readonly string[]): Tally[] {
  const counts = new Map<string, { count: number; people: Set<string> }>()
  for (const v of visits) {
    const k = keyOf(v)
    for (const key of Array.isArray(k) ? k : [k]) {
      if (!key) continue
      const t = counts.get(key) ?? { count: 0, people: new Set<string>() }
      t.count++
      t.people.add(v.visitor_id)
      counts.set(key, t)
    }
  }
  return [...counts.entries()].map(([key, t]) => ({ key, count: t.count, people: t.people.size })).sort((a, b) => b.count - a.count || b.people - a.people || collator.compare(a.key, b.key))
}

/** A visit's tags as "utm_source / medium / campaign" or the ?ref= value. */
export function tagOf(v: VisitRow): string | null {
  const utm = [v.utm_source, v.utm_medium, v.utm_campaign].filter(Boolean).join(' / ')
  return utm || v.ref || null
}

/**
 * Distinct visitors per day (in the chart's time zone) for the last `days` days, split into
 * LinkedIn and everyone else (a visitor counts as LinkedIn on a day any of their visits that day
 * came from LinkedIn).
 */
export function visitorsPerDay(visits: readonly VisitRow[], days: number, now = new Date()): { key: string; counts: { linkedin: number; other: number } }[] {
  const today = dayKey(now)
  const out = Array.from({ length: days }, (_, i) => ({ key: shiftKey(today, days - 1 - i), li: new Set<string>(), all: new Set<string>() }))
  const index = new Map(out.map((d) => [d.key, d]))
  for (const v of visits) {
    const d = index.get(dayKey(v.started_at))
    if (!d) continue
    d.all.add(v.visitor_id)
    if (v.source === 'linkedin') d.li.add(v.visitor_id)
  }
  return out.map((d) => ({ key: d.key, counts: { linkedin: d.li.size, other: d.all.size - d.li.size } }))
}
