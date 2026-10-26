import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ACTIVITY_SOURCES, ACTIVITY_TZ, buildDays, dayLabel, niceScale, rangeStart, type ActivityDay, type ActivityItem, type ActivitySource } from '../systems/activity'
import { AdminPage, Notice, RefreshButton, Segmented } from './AdminUi'

/**
 * The admin's ACTIVITY tab: what arrived each day (Pager messages, suggestions, resort avatars),
 * straight from the moderation tables. Range and source filters, stat cards, then a day-by-day bar
 * chart (gridlines, axis labels, a per-day tooltip on hover or with the arrow keys) with the same
 * numbers available as a table.
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
/** One colour per kind, the same in the stat cards, the legend, the bars and the tooltip (`--cat-*`). */
const SHADE: Record<ActivitySource, string> = { message: 'var(--cat-message)', suggestion: 'var(--cat-suggestion)', avatar: 'var(--cat-avatar)' }

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
    <AdminPage
      title="Activity"
      description={`What visitors sent in, day by day (${ACTIVITY_TZ} time). Counts come from the Pager and resort tables as they are now, so deleted items aren’t counted.`}
      actions={<RefreshButton busy={busy} onClick={load} />}
    >
      <div className="adm-toolbar">
        <Segmented label="RANGE" value={range} options={RANGES.map((r) => ({ value: r, label: `${r} DAYS` }))} onChange={setRange} />
        <Segmented
          label="SHOW"
          value={filter}
          options={[{ value: 'all' as Filter, label: 'EVERYTHING' }, ...ACTIVITY_SOURCES.map((s) => ({ value: s as Filter, label: NAMES[s].short.toUpperCase() }))]}
          onChange={setFilter}
        />
      </div>

      {error ? (
        <Notice
          kind="error"
          title="Couldn’t load the activity"
          action={
            <button type="button" className="pixel-btn adm-btn" onClick={load}>
              TRY AGAIN
            </button>
          }
        >
          {error}
        </Notice>
      ) : !data || !days ? (
        <Notice kind="loading" title="Loading activity" />
      ) : (
        <>
          <Stats days={days} shown={shown} failed={data.failed} range={range} />
          <Chart days={days} shown={available} failed={shown.filter((s) => data.failed[s])} range={range} />
          {(Object.keys(data.failed).length > 0 || data.capped.length > 0) && (
            <div className="adm-notes">
              {data.failed.message && <p>Pager messages and suggestions couldn’t be loaded ({data.failed.message}). They’re left out, not counted as zero.</p>}
              {data.failed.avatar && <p>Resort avatars couldn’t be loaded ({data.failed.avatar}). They’re left out, not counted as zero.</p>}
              {data.capped.length > 0 && <p>Only the newest {ROW_CAP.toLocaleString('en-AU')} rows per table are counted.</p>}
            </div>
          )}
        </>
      )}
    </AdminPage>
  )
}

const sum = (days: ActivityDay[], s: ActivitySource) => days.reduce((n, d) => n + d.counts[s], 0)
const span = (days: ActivityDay[]) => `${dayLabel(days[0].key, { day: 'numeric', month: 'short' })} and ${dayLabel(days[days.length - 1].key, { day: 'numeric', month: 'short', year: 'numeric' })}`

interface StatCard {
  label: string
  value: string
  sub: string
  /** A kind's colour, or a role: the total in navy, waiting items in red. */
  accent: string
  /** The value is a word, not a count (unavailable, not needed, none yet): shown smaller. */
  word?: boolean
}

function Stats({ days, shown, failed, range }: { days: ActivityDay[]; shown: ActivitySource[]; failed: Loaded['failed']; range: number }) {
  const ok = shown.filter((s) => !failed[s])
  const total = ok.reduce((n, s) => n + sum(days, s), 0)
  const moderated = ok.filter((s) => s !== 'avatar')
  const pending = days.reduce((n, d) => n + moderated.reduce((m, s) => m + d.pending[s], 0), 0)
  const onlyAvatars = shown.every((s) => s === 'avatar')
  const perDay = (d: ActivityDay) => ok.reduce((m, s) => m + d.counts[s], 0)
  const busiest = days.reduce<ActivityDay | null>((best, d) => (perDay(d) > 0 && (!best || perDay(d) > perDay(best)) ? d : best), null)
  const activeDays = days.filter((d) => perDay(d) > 0).length
  const ties = busiest ? days.filter((d) => d !== busiest && perDay(d) === perDay(busiest)).length : 0
  const period = `in the last ${range} days`

  const cards: StatCard[] = [
    ok.length
      ? { label: 'New', value: String(total), sub: total ? `${period}, on ${activeDays} ${activeDays === 1 ? 'day' : 'days'}` : `nothing ${period}`, accent: 'var(--adm-navy)' }
      : { label: 'New', value: 'Unavailable', sub: 'couldn’t load the tables', accent: 'var(--adm-navy)', word: true },
    ...ACTIVITY_SOURCES.filter((s) => shown.includes(s)).map<StatCard>((s) =>
      failed[s]
        ? { label: NAMES[s].many, value: 'Unavailable', sub: 'couldn’t load this table', accent: SHADE[s], word: true }
        : { label: NAMES[s].many, value: String(sum(days, s)), sub: total > 0 && shown.length > 1 ? `${Math.round((sum(days, s) / total) * 100)}% of new` : period, accent: SHADE[s] },
    ),
    onlyAvatars
      ? { label: 'Waiting for review', value: 'Not needed', sub: 'avatars go live without review', accent: 'var(--adm-muted)', word: true }
      : !moderated.length
        ? { label: 'Waiting for review', value: 'Unavailable', sub: 'couldn’t load the messages', accent: 'var(--adm-red)', word: true }
        : { label: 'Waiting for review', value: String(pending), sub: pending ? 'from this period, still pending' : 'nothing pending from this period', accent: pending ? 'var(--adm-red)' : 'var(--adm-muted)' },
    busiest
      ? { label: 'Busiest day', value: String(perDay(busiest)), sub: ties > 0 ? `${dayLabel(busiest.key)}, tied with ${ties} other ${ties === 1 ? 'day' : 'days'}` : dayLabel(busiest.key), accent: 'var(--adm-blue)' }
      : { label: 'Busiest day', value: 'None yet', sub: ok.length ? `no submissions ${period}` : 'couldn’t load the tables', accent: 'var(--adm-muted)', word: true },
  ]
  return (
    <ul className="adm-stats" aria-label="Totals">
      {cards.map((c) => (
        <li key={c.label} className="adm-card adm-stat" style={{ ['--accent' as string]: c.accent }}>
          <span className="adm-stat-label">{c.label}</span>
          <span className={`adm-stat-value ${c.word ? 'adm-stat-value--word' : ''}`}>{c.value}</span>
          <span className="adm-stat-sub">{c.sub}</span>
        </li>
      ))}
    </ul>
  )
}

function Chart({ days, shown, failed, range }: { days: ActivityDay[]; shown: ActivitySource[]; failed: ActivitySource[]; range: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const totals = days.map((d) => shown.reduce((n, s) => n + d.counts[s], 0))
  const peak = Math.max(0, ...totals)
  const { max, step } = niceScale(peak)
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step)
  const gap = range <= 30 ? 'gap-[3px]' : range <= 90 ? 'gap-[1px]' : 'gap-0'
  // x labels: the first and last day, plus a few between on longer ranges
  const every = range <= 7 ? 1 : range <= 30 ? 7 : range <= 90 ? 15 : 30
  const xLabels = days.map((d, i) => (i === 0 || i === days.length - 1 || (i % every === 0 && days.length - 1 - i >= every / 2) ? d.key : null))
  const subtitle = `Last ${range} days, ${dayLabel(days[0].key, { day: 'numeric', month: 'short' })} – ${dayLabel(days[days.length - 1].key, { day: 'numeric', month: 'short', year: 'numeric' })} · ${ACTIVITY_TZ} time`
  const activeDays = days.filter((_, i) => totals[i] > 0)

  const describe = (i: number) => {
    const d = days[i]
    const parts = shown.filter((s) => d.counts[s] > 0).map((s) => `${d.counts[s]} ${d.counts[s] === 1 ? NAMES[s].one : NAMES[s].many.toLowerCase()}`)
    const waiting = shown.reduce((n, s) => n + d.pending[s], 0)
    return `${dayLabel(d.key)}: ${totals[i] === 0 ? 'nothing new' : `${totals[i]} new (${parts.join(', ')})`}${waiting ? `, ${waiting} still waiting for review` : ''}`
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    e.stopPropagation()
    const cur = hover ?? days.length - 1
    setHover(e.key === 'Home' ? 0 : e.key === 'End' ? days.length - 1 : Math.max(0, Math.min(days.length - 1, cur + (e.key === 'ArrowLeft' ? -1 : 1))))
  }

  const header = (
    <header className="adm-chart-head">
      <div className="min-w-0">
        <h3 className="adm-h3">New submissions per day</h3>
        <p className="adm-chart-sub">{subtitle}</p>
      </div>
      {shown.length > 0 && (
        <ul className="adm-legend" aria-label="Legend">
          {shown.map((s) => (
            <li key={s}>
              <span aria-hidden className="adm-swatch" style={{ background: SHADE[s] }} />
              {NAMES[s].many} <strong>{sum(days, s)}</strong>
            </li>
          ))}
        </ul>
      )}
    </header>
  )

  if (shown.length === 0)
    return (
      <section className="adm-card adm-chart" aria-label="New submissions per day">
        {header}
        <div className="adm-chart-empty">
          <p className="adm-chart-empty-title">No data to chart</p>
          <p>{failed.map((s) => NAMES[s].many).join(' and ')} couldn’t be loaded, so there’s nothing to show for this period. Try Refresh.</p>
        </div>
      </section>
    )
  if (peak === 0)
    return (
      <section className="adm-card adm-chart" aria-label="New submissions per day">
        {header}
        <div className="adm-chart-empty">
          <p className="adm-chart-empty-title">No submissions between {span(days)}</p>
          <p>When a visitor sends a Pager message or a suggestion, or makes a resort avatar, it’s counted here on the day it arrived.</p>
        </div>
      </section>
    )

  const at = hover == null ? 0 : (hover + 0.5) / days.length
  return (
    <section className="adm-card adm-chart" aria-label="New submissions per day">
      {header}
      <div
        className="adm-plot"
        tabIndex={0}
        role="group"
        aria-label={`Bar chart of new submissions per day. ${subtitle}. Use the left and right arrow keys to read each day.`}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        onPointerLeave={() => setHover(null)}
      >
        <div className="adm-yaxis" aria-hidden>
          {ticks.map((t) => (
            <span key={t} style={{ bottom: `${(t / max) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
        <div className="adm-area">
          {ticks.map((t) => (
            <span key={t} aria-hidden className={`adm-grid ${t === 0 ? 'adm-grid--base' : ''}`} style={{ bottom: `${(t / max) * 100}%` }} />
          ))}
          <div className={`adm-bars ${gap}`}>
            {days.map((d, i) => (
              <div key={d.key} className={`adm-col ${hover === i ? 'adm-col--on' : ''}`} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
                <div className="adm-stack" style={{ height: `${(totals[i] / max) * 100}%` }}>
                  {shown.map((s) => (d.counts[s] > 0 ? <span key={s} style={{ flexGrow: d.counts[s], background: SHADE[s] }} /> : null))}
                </div>
              </div>
            ))}
          </div>
          {hover != null && (
            <div className="adm-tip" role="presentation" style={{ left: `${at * 100}%`, transform: `translateX(${at < 0.18 ? '-12%' : at > 0.82 ? '-88%' : '-50%'})` }}>
              <strong className="block">{dayLabel(days[hover].key)}</strong>
              {totals[hover] === 0 ? (
                <span className="block">Nothing new</span>
              ) : (
                shown.map((s) =>
                  days[hover].counts[s] > 0 ? (
                    <span key={s} className="flex items-center gap-1.5">
                      <span aria-hidden className="adm-swatch" style={{ background: SHADE[s] }} />
                      {days[hover].counts[s]} {days[hover].counts[s] === 1 ? NAMES[s].one : NAMES[s].many.toLowerCase()}
                    </span>
                  ) : null,
                )
              )}
            </div>
          )}
        </div>
      </div>
      <div className="adm-xaxis" aria-hidden>
        {xLabels.map((k, i) =>
          k ? (
            <span key={k} style={{ left: `${((i + 0.5) / days.length) * 100}%` }} className={i === 0 ? 'adm-x--first' : i === days.length - 1 ? 'adm-x--last' : 'adm-x--mid'}>
              {dayLabel(k, { day: 'numeric', month: 'short' })}
            </span>
          ) : null,
        )}
      </div>
      <p className="adm-readout" aria-live="polite">
        {hover == null ? 'Point at a bar, or focus the chart and use the arrow keys, for that day’s numbers.' : describe(hover)}
      </p>
      <details className="adm-details">
        <summary>Show the days as a table</summary>
        <table className="adm-table adm-table--compact">
          <caption className="sr-only">New submissions on each day with any activity. {subtitle}</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              {shown.map((s) => (
                <th key={s} scope="col" className="adm-num">
                  {NAMES[s].many}
                </th>
              ))}
              <th scope="col" className="adm-num">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {activeDays.map((d) => (
              <tr key={d.key}>
                <th scope="row">{dayLabel(d.key)}</th>
                {shown.map((s) => (
                  <td key={s} className="adm-num" data-label={NAMES[s].many}>
                    {d.counts[s]}
                  </td>
                ))}
                <td className="adm-num" data-label="Total">
                  <strong>{shown.reduce((n, s) => n + d.counts[s], 0)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="adm-notes-inline">Days not listed had no submissions.</p>
      </details>
    </section>
  )
}
