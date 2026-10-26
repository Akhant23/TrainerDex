import { describe, expect, it } from 'vitest'
import { deviceOf, duration, flag, median, pct, sortVisitors, summarize, tagOf, tally, visitorsOf, visitorsPerDay, type VisitRow } from './metrics'
import { classifySource, isBot, parseUserAgent, parseVisitReport, referrerHost } from '../../supabase/functions/_shared/visit'

const v = (over: Partial<VisitRow>): VisitRow => ({
  id: Math.random().toString(36).slice(2),
  visitor_id: 'aaaaaaaaaaaaaaaa',
  started_at: '2026-10-24T01:00:00Z',
  last_seen_at: '2026-10-24T01:00:06Z',
  active_seconds: 6,
  returning_visit: false,
  source: 'direct',
  referrer_host: null,
  landing: '/',
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  ref: null,
  link_code: null,
  label: null,
  ip_host: null,
  org: null,
  isp: null,
  city: null,
  region: null,
  country: null,
  country_code: null,
  device: 'desktop',
  os: 'macOS',
  os_version: '10.15',
  browser: 'Chrome',
  browser_version: '153',
  sections: [],
  ...over,
})

describe('summary numbers', () => {
  it('counts visitors, LinkedIn, organisations, returning, time and sections', () => {
    const rows = [
      v({ visitor_id: 'a'.repeat(16), source: 'linkedin', org: 'TPG Telecom Limited', active_seconds: 6 }),
      v({ visitor_id: 'a'.repeat(16), returning_visit: true, active_seconds: 30, sections: ['profile'] }),
      v({ visitor_id: 'b'.repeat(16), org: 'UNSW', active_seconds: 100, sections: ['pc', 'album'] }),
    ]
    const s = summarize(rows)
    expect(s).toMatchObject({ visits: 3, visitors: 2, linkedinVisitors: 1, linkedinVisits: 1, organisations: 2, returningVisits: 1, medianSeconds: 30, meanSeconds: 45, sectionVisits: 2 })
    expect(pct(1, 3)).toBe(33)
    expect(pct(1, 0)).toBe(0)
  })

  it('median and durations', () => {
    expect(median([])).toBe(0)
    expect(median([5, 1, 3])).toBe(3)
    expect(median([1, 2, 3, 4])).toBe(3)
    expect(duration(6)).toBe('6s')
    expect(duration(125)).toBe('2m 05s')
    expect(duration(3840)).toBe('1h 04m')
  })

  it('flags and device lines', () => {
    expect(flag('au')).toBe('🇦🇺')
    expect(flag(null)).toBe('')
    expect(flag('AUS')).toBe('')
    expect(deviceOf(v({}))).toBe('Desktop · macOS 10.15 · Chrome 153')
  })
})

describe('visitors', () => {
  const rows = [
    v({ visitor_id: 'a'.repeat(16), started_at: '2026-10-20T01:00:00Z', last_seen_at: '2026-10-20T01:01:00Z', source: 'linkedin', org: 'TPG Telecom Limited', ip_host: '61-8-121-56.tpgi.com.au', city: 'Sydney', country_code: 'AU', active_seconds: 60, sections: ['profile'] }),
    v({ visitor_id: 'a'.repeat(16), started_at: '2026-10-24T01:00:00Z', last_seen_at: '2026-10-24T01:00:10Z', returning_visit: true, label: 'Sarah, recruiter at Canva', active_seconds: 10, sections: ['pc', 'profile'] }),
    v({ visitor_id: 'b'.repeat(16), started_at: '2026-10-22T01:00:00Z', last_seen_at: '2026-10-22T01:00:05Z', city: 'Melbourne', country_code: 'AU', active_seconds: 5 }),
  ]
  it('one row per browser: label first, then organisation, then place', () => {
    const [a, b] = sortVisitors(visitorsOf(rows), 'recent')
    expect(a).toMatchObject({ who: 'Sarah, recruiter at Canva', labelled: true, visits: 2, seconds: 70, source: 'linkedin', fromLinkedIn: true, sections: ['profile', 'pc'], lastSeen: '2026-10-24T01:00:10Z' })
    expect(a.timeline.map((t) => t.started_at.slice(5, 10))).toEqual(['10-24', '10-20'])
    expect(b.who).toBe('Someone in Melbourne, AU')
  })
  it('sorts by visits, time, sections and organisation (none last)', () => {
    const vs = visitorsOf(rows)
    expect(sortVisitors(vs, 'visits')[0].visits).toBe(2)
    expect(sortVisitors(vs, 'time')[0].seconds).toBe(70)
    expect(sortVisitors(vs, 'org')[1].org).toBeNull()
  })
})

describe('breakdowns', () => {
  it('tallies visits with distinct people, biggest first, skipping blanks and spreading arrays', () => {
    const rows = [v({ visitor_id: 'a'.repeat(16), sections: ['pc', 'album'] }), v({ visitor_id: 'a'.repeat(16), sections: ['pc'] }), v({ visitor_id: 'b'.repeat(16), sections: [] })]
    expect(tally(rows, (r) => r.sections)).toEqual([
      { key: 'pc', count: 2, people: 1 },
      { key: 'album', count: 1, people: 1 },
    ])
    expect(tally(rows, (r) => r.org)).toEqual([])
  })
  it('tags read as utm parts or the ?ref=', () => {
    expect(tagOf(v({ utm_source: 'linkedin', utm_medium: 'profile' }))).toBe('linkedin / profile')
    expect(tagOf(v({ ref: 'cv' }))).toBe('cv')
    expect(tagOf(v({}))).toBeNull()
  })
  it('visitors per day, LinkedIn apart, every day present', () => {
    const rows = [v({ started_at: '2026-10-25T23:00:00Z', source: 'linkedin' }), v({ visitor_id: 'b'.repeat(16), started_at: '2026-10-26T01:00:00Z' }), v({ started_at: '2026-10-26T02:00:00Z' })]
    const days = visitorsPerDay(rows, 3, new Date('2026-10-26T05:00:00Z'))
    expect(days.map((d) => d.key)).toEqual(['2026-10-24', '2026-10-25', '2026-10-26'])
    // 23:00 UTC on the 25th is the 26th in Sydney; visitor a is LinkedIn that day
    expect(days[2].counts).toEqual({ linkedin: 1, other: 1 })
  })
})

describe('track-visit shared checks', () => {
  it('accepts a well-formed start and rejects anything off', () => {
    const ok = parseVisitReport({ event: 'start', session: 's'.repeat(20), visitor: 'v'.repeat(20), seconds: 3.7, referrer: 'https://www.linkedin.com/feed/', link: 'ABC123' })
    expect(ok).toMatchObject({ event: 'start', seconds: 3, referrer: 'https://www.linkedin.com/feed/', link: 'abc123' })
    expect(parseVisitReport({ event: 'start', session: 'short', visitor: 'v'.repeat(20) })).toBeNull()
    expect(parseVisitReport({ event: 'drop', session: 's'.repeat(20), visitor: 'v'.repeat(20) })).toBeNull()
    expect(parseVisitReport({ event: 'section', session: 's'.repeat(20), visitor: 'v'.repeat(20), section: 'admin' })).toBeNull()
    expect(parseVisitReport({ event: 'section', session: 's'.repeat(20), visitor: 'v'.repeat(20), section: 'pc' })?.section).toBe('pc')
    expect(parseVisitReport({ event: 'ping', session: 's'.repeat(20), visitor: 'v'.repeat(20), seconds: 99999 })?.seconds).toBe(14400)
    expect(parseVisitReport({ event: 'ping', session: 's'.repeat(20), visitor: 'v'.repeat(20), seconds: -1 })).toBeNull()
    expect(parseVisitReport(null)).toBeNull()
  })
  it('classifies where a visit came from', () => {
    expect(classifySource({ host: referrerHost('https://www.linkedin.com/in/someone') })).toBe('linkedin')
    expect(classifySource({ host: 'lnkd.in' })).toBe('linkedin')
    expect(classifySource({ utm_source: 'LinkedIn' })).toBe('linkedin')
    expect(classifySource({ ref: 'cv' })).toBe('tagged')
    expect(classifySource({ host: 'google.com.au' })).toBe('search')
    expect(classifySource({ host: 't.co' })).toBe('social')
    expect(classifySource({ host: 'example.org' })).toBe('referral')
    expect(classifySource({})).toBe('direct')
    expect(classifySource({ host: 'akhan.dev' }, 'akhan.dev')).toBe('direct')
    expect(referrerHost('not a url')).toBeUndefined()
  })
  it('reads browser, system and device from user agents', () => {
    expect(parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36')).toEqual({ device: 'desktop', os: 'macOS', os_version: '10.15', browser: 'Chrome', browser_version: '153' })
    expect(parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1')).toMatchObject({ device: 'mobile', os: 'iOS', os_version: '18.1', browser: 'Safari', browser_version: '18' })
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0')).toMatchObject({ os: 'Windows', os_version: '10/11', browser: 'Edge' })
    expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36')).toMatchObject({ device: 'tablet', os: 'Android' })
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(isBot('LinkedInBot/1.0 (compatible; Mozilla/5.0)')).toBe(true)
    expect(isBot('Mozilla/5.0 (Macintosh) Chrome/153 Safari/537.36')).toBe(false)
  })
})
