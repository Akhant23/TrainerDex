/**
 * The admin's activity chart, as pure functions: what arrived on which day (in one time zone),
 * with every day in the range present, so a quiet day is a real zero and not a gap.
 */

export type ActivitySource = 'message' | 'suggestion' | 'avatar'
export const ACTIVITY_SOURCES: readonly ActivitySource[] = ['message', 'suggestion', 'avatar']

export interface ActivityItem {
  /** ISO timestamp it arrived. */
  at: string
  source: ActivitySource
  /** Still waiting for moderation. */
  pending: boolean
}

export interface ActivityDay {
  /** YYYY-MM-DD in the chart's time zone. */
  key: string
  counts: Record<ActivitySource, number>
  /** Of those, how many are still waiting for moderation. */
  pending: Record<ActivitySource, number>
  total: number
}

export const ACTIVITY_TZ = 'Australia/Sydney'

const keyFormat = new Map<string, Intl.DateTimeFormat>()
/** The calendar day an instant falls on in `tz`, as YYYY-MM-DD. */
export function dayKey(at: Date | string, tz = ACTIVITY_TZ): string {
  let f = keyFormat.get(tz)
  if (!f) keyFormat.set(tz, (f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })))
  return f.format(typeof at === 'string' ? new Date(at) : at)
}

/** The day `n` days before `key` (calendar arithmetic, so it's right across daylight saving). */
export function shiftKey(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d - n))
  return t.toISOString().slice(0, 10)
}

/** The oldest instant worth fetching for the last `days` days (a day of slack for time zones). */
export function rangeStart(days: number, now = new Date()): Date {
  return new Date(now.getTime() - (days + 1) * 86_400_000)
}

/** One entry per day for the last `days` days ending today in `tz`, oldest first. */
export function buildDays(items: readonly ActivityItem[], days: number, now = new Date(), tz = ACTIVITY_TZ): ActivityDay[] {
  const today = dayKey(now, tz)
  const out: ActivityDay[] = []
  const index = new Map<string, ActivityDay>()
  for (let i = days - 1; i >= 0; i--) {
    const day: ActivityDay = { key: shiftKey(today, i), counts: { message: 0, suggestion: 0, avatar: 0 }, pending: { message: 0, suggestion: 0, avatar: 0 }, total: 0 }
    out.push(day)
    index.set(day.key, day)
  }
  for (const it of items) {
    if (Number.isNaN(Date.parse(it.at))) continue
    const day = index.get(dayKey(it.at, tz))
    if (!day) continue
    day.counts[it.source]++
    day.total++
    if (it.pending) day.pending[it.source]++
  }
  return out
}

/** A round axis maximum at or above `n`, and the step between gridlines (whole numbers). */
export function niceScale(n: number): { max: number; step: number } {
  if (n <= 0) return { max: 1, step: 1 }
  if (n <= 4) return { max: n, step: 1 }
  const rough = n / 4
  const mag = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((s) => s * mag).find((s) => s >= rough) ?? 10 * mag
  return { max: Math.ceil(n / step) * step, step }
}

/** "Mon 20 Oct" for a YYYY-MM-DD key. */
export function dayLabel(key: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('en-AU', { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
}
