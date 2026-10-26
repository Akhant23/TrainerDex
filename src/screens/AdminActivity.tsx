import { useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ACTIVITY_SOURCES, ACTIVITY_TZ, buildDays, dayLabel, rangeStart, type ActivityDay, type ActivityItem, type ActivitySource } from '../systems/activity'
import { AdminPage, Notice, RefreshButton, Segmented } from './AdminUi'
import { DayChart } from './AdminChart'

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
  return (
    <DayChart
      days={days}
      range={range}
      title="New submissions per day"
      series={shown.map((s) => ({ id: s, label: NAMES[s].many, short: NAMES[s].short, one: NAMES[s].one, many: NAMES[s].many.toLowerCase(), color: SHADE[s] }))}
      totalWord={(n) => `${n} new`}
      extra={(i) => {
        const waiting = shown.reduce((n, s) => n + days[i].pending[s], 0)
        return waiting ? `, ${waiting} still waiting for review` : ''
      }}
      empty={{ title: 'No submissions', text: 'When a visitor sends a Pager message or a suggestion, or makes a resort avatar, it’s counted here on the day it arrived.' }}
      unavailable={shown.length === 0 ? `${failed.map((s) => NAMES[s].many).join(' and ')} couldn’t be loaded, so there’s nothing to show for this period. Try Refresh.` : undefined}
    />
  )
}
