import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ACTIVITY_SOURCES, ACTIVITY_TZ, buildDays, dayLabel, niceScale, rangeStart, type ActivityDay, type ActivityItem, type ActivitySource } from '../systems/activity'

/**
 * The admin's ACTIVITY tab: what arrived each day (Pager messages, suggestions, resort avatars),
 * straight from the moderation tables. Laid out like a light analytics page: range and source
 * filters, a row of stat cards, then a day-by-day bar chart with gridlines, axis labels and a
 * per-day readout on hover or with the arrow keys.
 */

const RANGES = [7, 30, 90, 180] as const
type Range = (typeof RANGES)[number]
type Filter = 'all' | ActivitySource
/** Most rows read per table; the guestbook is small, but a flood shouldn't hang the page. */
const ROW_CAP = 5000
const PAGE = 1000

const NAMES: Record<ActivitySource, { one: string; many: string; short: string }> = {
  message: { one: 'Pager message', many: 'Pager messages', short: 'Pager' },
  suggestion: { one: 'suggestion', many: 'Suggestions', short: 'Suggestions' },
  avatar: { one: 'resort avatar', many: 'Resort avatars', short: 'Avatars' },
}
/** Darkest first: the stack reads Pager (dark) · suggestions · avatars (light). */
const SHADE: Record<ActivitySource, string> = { message: '#0d5fc2', suggestion: '#2f9be6', avatar: '#86d4f6' }

interface Loaded {
  items: ActivityItem[]
  /** Sources that failed to load, with why: shown as unknown, never as zero. */
  failed: Partial<Record<ActivitySource, string>>
  capped: ActivitySource[]
  at: Date
}

async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<{ rows: T[]; capped: boolean }> {
  const rows: T[] = []
  for (let from = 0; from < ROW_CAP; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return { rows, capped: false }
  }
  return { rows, capped: true }
}

async function loadActivity(db: SupabaseClient): Promise<Loaded> {
  const since = rangeStart(RANGES[RANGES.length - 1]).toISOString()
  const [msgs, avatars] = await Promise.allSettled([
    readAll<{ created_at: string; kind: string; status: string }>((a, b) =>
      db.from('messages').select('created_at,kind,status').gte('created_at', since).order('created_at', { ascending: false }).range(a, b),
    ),
    readAll<{ created_at: string }>((a, b) => db.from('trainers').select('created_at').gte('created_at', since).order('created_at', { ascending: false }).range(a, b)),
  ])
  const items: ActivityItem[] = []
  const failed: Loaded['failed'] = {}
  const capped: ActivitySource[] = []
  if (msgs.status === 'fulfilled') {
    for (const r of msgs.value.rows) items.push({ at: r.created_at, source: r.kind === 'suggestion' ? 'suggestion' : 'message', pending: r.status === 'pending' })
    if (msgs.value.capped) capped.push('message', 'suggestion')
  } else {
    failed.message = failed.suggestion = msgs.reason instanceof Error ? msgs.reason.message : 'Couldn’t load.'
  }
  if (avatars.status === 'fulfilled') {
    for (const r of avatars.value.rows) items.push({ at: r.created_at, source: 'avatar', pending: false })
    if (avatars.value.capped) capped.push('avatar')
  } else {
    failed.avatar = avatars.reason instanceof Error ? avatars.reason.message : 'Couldn’t load.'
  }
  // nothing loaded at all is an error, not an empty chart
  if (msgs.status === 'rejected' && avatars.status === 'rejected') throw new Error(failed.message ?? failed.avatar)
  return { items, failed, capped, at: new Date() }
}

export function AdminActivity({ db }: { db: SupabaseClient }) {
  const [range, setRange] = useState<Range>(30)
  const [filter, setFilter] = useState<Filter>('all')
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)

  // bumping `attempt` (Refresh / Try again) reloads; state only changes once the tables answer
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    loadActivity(db).then(
      (d) => {
        if (!live) return
        setData(d)
        setError('')
        setBusy(false)
      },
      (e: unknown) => {
        if (!live) return
        setError(e instanceof Error ? e.message : 'Couldn’t load the activity.')
        setBusy(false)
      },
    )
    return () => {
      live = false
    }
  }, [db, attempt])

  const load = () => {
    setBusy(true)
    setError('')
    setAttempt((n) => n + 1)
  }

  const shown: ActivitySource[] = filter === 'all' ? [...ACTIVITY_SOURCES] : [filter]
  const available = shown.filter((s) => !data?.failed[s])
  const days = useMemo(() => (data ? buildDays(data.items, range, data.at) : null), [data, range])

  return (
    <div className="act space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Range" value={range} options={RANGES.map((r) => ({ value: r, label: `${r} days` }))} onChange={setRange} />
        <Segmented
          label="Source"
          value={filter}
          options={[{ value: 'all' as Filter, label: 'Everything' }, ...ACTIVITY_SOURCES.map((s) => ({ value: s as Filter, label: NAMES[s].short }))]}
          onChange={setFilter}
        />
        <button type="button" className="act-refresh" onClick={load} disabled={busy}>
          {busy ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div role="alert" className="act-card act-state">
          <p className="m-0">Couldn’t load the activity: {error}</p>
          <button type="button" className="act-refresh mt-2" onClick={load}>
            Try again
          </button>
        </div>
      ) : !data || !days ? (
        <div className="act-card act-state" role="status">
          <span>Loading activity…</span>
        </div>
      ) : (
        <>
          <Stats days={days} shown={shown} failed={data.failed} range={range} />
          <Chart days={days} shown={available} range={range} />
          {(Object.keys(data.failed).length > 0 || data.capped.length > 0) && (
            <p className="act-note m-0">
              {data.failed.message && <span className="block">Pager messages and suggestions couldn’t be loaded ({data.failed.message}), so they’re left out rather than counted as zero.</span>}
              {data.failed.avatar && <span className="block">Resort avatars couldn’t be loaded ({data.failed.avatar}), so they’re left out rather than counted as zero.</span>}
              {data.capped.length > 0 && <span className="block">Only the newest {ROW_CAP.toLocaleString('en-AU')} rows per table are counted.</span>}
            </p>
          )}
        </>
      )}
      <p className="act-note m-0">Counts come from the Pager and resort tables as they are now: deleted items aren’t counted. Days are in {ACTIVITY_TZ}.</p>
    </div>
  )
}

function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="act-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'act-seg--on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Stats({ days, shown, failed, range }: { days: ActivityDay[]; shown: ActivitySource[]; failed: Loaded['failed']; range: number }) {
  const sum = (s: ActivitySource) => days.reduce((n, d) => n + d.counts[s], 0)
  const ok = shown.filter((s) => !failed[s])
  const total = ok.reduce((n, s) => n + sum(s), 0)
  const moderated = ok.filter((s) => s !== 'avatar')
  const pending = moderated.length ? days.reduce((n, d) => n + moderated.reduce((m, s) => m + d.pending[s], 0), 0) : null
  const onlyAvatars = shown.every((s) => s === 'avatar')
  const busiest = days.reduce<ActivityDay | null>((best, d) => {
    const n = ok.reduce((m, s) => m + d.counts[s], 0)
    return n > 0 && (!best || n > ok.reduce((m, s) => m + best.counts[s], 0)) ? d : best
  }, null)
  const busiestN = busiest ? ok.reduce((m, s) => m + busiest.counts[s], 0) : 0
  const activeDays = days.filter((d) => ok.some((s) => d.counts[s] > 0)).length

  const cards: { label: string; value: string; sub: string }[] = [
    { label: 'New', value: ok.length ? String(total) : '—', sub: `in the last ${range} days` },
    ...ACTIVITY_SOURCES.filter((s) => shown.includes(s)).map((s) => ({
      label: NAMES[s].many,
      value: failed[s] ? '—' : String(sum(s)),
      sub: failed[s] ? 'couldn’t load' : total > 0 ? `${Math.round((sum(s) / total) * 100)}% of new` : 'none yet',
    })),
    {
      label: 'Waiting for review',
      value: onlyAvatars ? 'n/a' : pending == null ? '—' : String(pending),
      sub: onlyAvatars ? 'avatars go live straight away' : 'of those, still pending',
    },
    { label: 'Busiest day', value: busiest ? String(busiestN) : '—', sub: busiest ? dayLabel(busiest.key) : `active on ${activeDays} days` },
  ]
  return (
    <div className="act-stats">
      {cards.map((c) => (
        <div key={c.label} className="act-card act-stat">
          <span className="act-stat-label">{c.label}</span>
          <span className="act-stat-value">{c.value}</span>
          <span className="act-stat-sub">{c.sub}</span>
        </div>
      ))}
    </div>
  )
}

function Chart({ days, shown, range }: { days: ActivityDay[]; shown: ActivitySource[]; range: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const totals = days.map((d) => shown.reduce((n, s) => n + d.counts[s], 0))
  const peak = Math.max(0, ...totals)
  const { max, step } = niceScale(peak)
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step)
  const empty = peak === 0
  const gap = range <= 30 ? 'gap-[3px]' : range <= 90 ? 'gap-[1px]' : 'gap-0'
  // x labels: the first and last day, plus a few between on longer ranges
  const every = range <= 7 ? 1 : range <= 30 ? 7 : range <= 90 ? 15 : 30
  const xLabels = days.map((d, i) => (i === 0 || i === days.length - 1 || (i % every === 0 && days.length - 1 - i >= every / 2) ? d.key : null))

  const readout = (i: number) => {
    const d = days[i]
    const parts = shown.filter((s) => d.counts[s] > 0).map((s) => `${d.counts[s]} ${d.counts[s] === 1 ? NAMES[s].one : NAMES[s].many.toLowerCase()}`)
    const total = totals[i]
    const waiting = shown.reduce((n, s) => n + d.pending[s], 0)
    const pending = waiting > 0 ? ` · ${waiting} waiting for review` : ''
    return `${dayLabel(d.key)}: ${total === 0 ? 'nothing new' : `${total} new (${parts.join(', ')})`}${pending}`
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    e.stopPropagation()
    const cur = hover ?? days.length - 1
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? days.length - 1 : Math.max(0, Math.min(days.length - 1, cur + (e.key === 'ArrowLeft' ? -1 : 1)))
    setHover(next)
  }

  return (
    <section className="act-card act-chart" aria-labelledby="act-chart-title">
      <header className="flex flex-wrap items-baseline gap-x-2">
        <h3 id="act-chart-title" className="m-0 text-[16px] font-semibold">
          Activity over time
        </h3>
        <span className="act-sub">{ACTIVITY_TZ}</span>
        <span className="act-legend" aria-label="Legend">
          {shown.map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span aria-hidden className="act-swatch" style={{ background: SHADE[s] }} />
              {NAMES[s].many}
            </span>
          ))}
        </span>
      </header>

      <div className="act-plot" tabIndex={0} role="group" aria-label={`Bar chart, new items per day for the last ${range} days. Use the left and right arrow keys to read each day.`} onKeyDown={onKey} onBlur={() => setHover(null)} onPointerLeave={() => setHover(null)}>
        <div className="act-yaxis" aria-hidden>
          {ticks
            .slice()
            .reverse()
            .map((t) => (
              <span key={t} style={{ bottom: `${(t / max) * 100}%` }}>
                {t}
              </span>
            ))}
        </div>
        <div className="act-area">
          {ticks.map((t) => (
            <span key={t} aria-hidden className={`act-grid ${t === 0 ? 'act-grid--base' : ''}`} style={{ bottom: `${(t / max) * 100}%` }} />
          ))}
          <div className={`act-bars ${gap}`}>
            {days.map((d, i) => (
              <div key={d.key} className={`act-col ${hover === i ? 'act-col--on' : ''}`} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
                <div className="act-stack" style={{ height: `${(totals[i] / max) * 100}%` }}>
                  {shown.map((s) =>
                    d.counts[s] > 0 ? <span key={s} style={{ flexGrow: d.counts[s], background: SHADE[s] }} /> : null,
                  )}
                </div>
              </div>
            ))}
          </div>
          {hover != null && (
            <div
              className="act-tip"
              role="presentation"
              style={{ left: `${((hover + 0.5) / days.length) * 100}%`, transform: `translateX(${(hover + 0.5) / days.length < 0.18 ? '-12%' : (hover + 0.5) / days.length > 0.82 ? '-88%' : '-50%'})` }}
            >
              <strong className="block">{dayLabel(days[hover].key)}</strong>
              {totals[hover] === 0 ? (
                <span className="block">Nothing new</span>
              ) : (
                shown.map((s) =>
                  days[hover].counts[s] > 0 ? (
                    <span key={s} className="flex items-center gap-1">
                      <span aria-hidden className="act-swatch" style={{ background: SHADE[s] }} />
                      {days[hover].counts[s]} {days[hover].counts[s] === 1 ? NAMES[s].one : NAMES[s].many.toLowerCase()}
                    </span>
                  ) : null,
                )
              )}
            </div>
          )}
          {shown.length === 0 ? <p className="act-empty m-0">These couldn’t be loaded, so there’s nothing to chart.</p> : empty && <p className="act-empty m-0">Nothing new in the last {range} days.</p>}
        </div>
      </div>
      <div className="act-xaxis" aria-hidden>
        {xLabels.map((k, i) =>
          k ? (
            <span key={k} style={{ left: `${((i + 0.5) / days.length) * 100}%` }} className={i === 0 ? 'act-x--first' : i === days.length - 1 ? 'act-x--last' : 'act-x--mid'}>
              {dayLabel(k, { day: 'numeric', month: 'short' })}
            </span>
          ) : null,
        )}
      </div>
      <p className="act-readout m-0" aria-live="polite">
        {hover == null ? 'Point at a day for its numbers.' : readout(hover)}
      </p>
    </section>
  )
}
