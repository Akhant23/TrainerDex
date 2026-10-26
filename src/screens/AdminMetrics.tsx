import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ACTIVITY_TZ } from '../systems/activity'
import { matches, pageFor, PAGE_SIZE } from '../systems/adminSort'
import {
  deviceOf,
  duration,
  flag,
  pct,
  placeOf,
  SECTION_NAMES,
  SOURCE_NAMES,
  sortVisitors,
  summarize,
  tagOf,
  tally,
  VISIT_COLUMNS,
  visitorsOf,
  visitorsPerDay,
  VISITOR_SORTS,
  type Tally,
  type VisitorRow,
  type VisitorSort,
  type VisitRow,
} from '../systems/metrics'
import { dayKey, rangeStart, shiftKey } from '../systems/activity'
import { useSettings } from '../systems/settings'
import { useSavedChoice } from '../ui/useSavedChoice'
import { AdminPage, ConfirmBar, FindBox, Notice, RefreshButton, Segmented, ShowMore, SortSelect, When } from './AdminUi'
import { DayChart } from './AdminChart'

/**
 * The admin's METRICS tab: who visits the site, from where, for how long and what they open,
 * from public.visits (recorded by the track-visit Edge Function). Range and audience filters,
 * headline cards, visitors per day, a visitors table with each one's timeline, breakdowns, and
 * personal links that label one person's visits.
 */

const RANGES = [7, 30, 90, 180] as const
type Range = (typeof RANGES)[number]
type Audience = 'everyone' | 'linkedin'
const ROW_CAP = 10_000

const isVisitorSort = (v: unknown): v is VisitorSort => VISITOR_SORTS.some((s) => s.value === v)

interface Loaded {
  visits: VisitRow[]
  links: LinkRow[]
  capped: boolean
  at: Date
}
interface LinkRow {
  code: string
  label: string
  created_at: string
}

async function loadMetrics(db: SupabaseClient): Promise<Loaded> {
  const since = rangeStart(RANGES[RANGES.length - 1]).toISOString()
  const visits: VisitRow[] = []
  let capped = true
  for (let from = 0; from < ROW_CAP; from += 1000) {
    const { data, error } = await db.from('visits').select(VISIT_COLUMNS).gte('started_at', since).order('started_at', { ascending: false }).range(from, from + 999)
    if (error) throw new Error(error.message)
    visits.push(...((data ?? []) as unknown as VisitRow[]))
    if (!data || data.length < 1000) {
      capped = false
      break
    }
  }
  const { data: links, error } = await db.from('personal_links').select('code,label,created_at').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return { visits, links: (links ?? []) as LinkRow[], capped, at: new Date() }
}

export function AdminMetrics({ db }: { db: SupabaseClient }) {
  const [range, setRange] = useState<Range>(7)
  const [audience, setAudience] = useState<Audience>('everyone')
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [attempt, setAttempt] = useState(0)

  // bumping `attempt` (Refresh / Try again) reloads; state only changes once the tables answer
  useEffect(() => {
    let live = true
    loadMetrics(db).then(
      (d) => {
        if (!live) return
        setData(d)
        setError('')
        setBusy(false)
      },
      (e: unknown) => {
        if (!live) return
        setError(e instanceof Error ? e.message : 'Couldn’t load the metrics.')
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

  const inRange = useMemo(() => {
    if (!data) return []
    const first = shiftKey(dayKey(data.at), range - 1)
    return data.visits.filter((v) => dayKey(v.started_at) >= first && (audience === 'everyone' || v.source === 'linkedin'))
  }, [data, range, audience])

  const missingTable = /relation .*visits.* does not exist|personal_links.* does not exist|schema cache/i.test(error)
  return (
    <AdminPage
      title="Metrics"
      description={`Who visits the site, where they came from, how long they stay and which sections they open (${ACTIVITY_TZ} time).`}
      actions={<RefreshButton busy={busy} onClick={load} />}
    >
      <div className="adm-toolbar">
        <Segmented label="RANGE" value={range} options={RANGES.map((r) => ({ value: r, label: `${r} DAYS` }))} onChange={setRange} />
        <Segmented
          label="AUDIENCE"
          value={audience}
          options={[
            { value: 'everyone' as Audience, label: 'EVERYONE' },
            { value: 'linkedin' as Audience, label: 'FROM LINKEDIN' },
          ]}
          onChange={setAudience}
        />
      </div>

      {error ? (
        <Notice
          kind="error"
          title={missingTable ? 'Visit metrics aren’t set up yet' : 'Couldn’t load the metrics'}
          action={
            <button type="button" className="pixel-btn adm-btn" onClick={load}>
              TRY AGAIN
            </button>
          }
        >
          {missingTable ? 'The database has no visits table yet. Apply the visit-metrics migration and deploy track-visit (docs/BACKEND.md).' : error}
        </Notice>
      ) : !data ? (
        <Notice kind="loading" title="Loading metrics" />
      ) : (
        <>
          <MetricCards visits={inRange} range={range} audience={audience} />
          <DayChart
            days={visitorsPerDay(inRange, range, data.at)}
            range={range}
            title="Visitors over time"
            series={[
              { id: 'linkedin', label: 'From LinkedIn', short: 'LinkedIn', one: 'visitor from LinkedIn', many: 'visitors from LinkedIn', color: 'var(--cat-linkedin)' },
              ...(audience === 'everyone' ? [{ id: 'other', label: 'Everyone else', short: 'Others', one: 'other visitor', many: 'other visitors', color: 'var(--cat-visitor)' }] : []),
            ]}
            totals={legendTotals(inRange)}
            totalWord={(n) => `${n} ${n === 1 ? 'visitor' : 'visitors'}`}
            empty={{ title: 'No visitors', text: 'Visits show up here as people open the site. Your own browser isn’t counted if VISIT STATS is off below.' }}
          />
          <Visitors visits={inRange} capped={data.capped} />
          <Breakdowns visits={inRange} />
          <PersonalLinks db={db} links={data.links} visits={data.visits} onChange={load} />
          <OwnVisits />
          <p className="adm-notes-inline">Visits, IP addresses and network lookups (from ip-api.com) are kept for 180 days, then only daily totals remain.</p>
        </>
      )}
    </AdminPage>
  )
}

/** Distinct visitors in the range: those with any LinkedIn visit, and everyone else. */
function legendTotals(visits: VisitRow[]): Record<string, number> {
  const li = new Set(visits.filter((v) => v.source === 'linkedin').map((v) => v.visitor_id))
  const all = new Set(visits.map((v) => v.visitor_id))
  return { linkedin: li.size, other: all.size - li.size }
}

function MetricCards({ visits, range, audience }: { visits: VisitRow[]; range: number; audience: Audience }) {
  const s = summarize(visits)
  const none = s.visits === 0
  const period = `in the last ${range} days`
  const cards: { label: string; value: string; sub: string; accent: string; word?: boolean }[] = [
    { label: 'Visitors', value: String(s.visitors), sub: none ? `none ${period}` : `${s.visits} ${s.visits === 1 ? 'visit' : 'visits'}`, accent: 'var(--adm-navy)' },
    {
      label: 'From LinkedIn',
      value: String(s.linkedinVisitors),
      sub: none ? `none ${period}` : audience === 'linkedin' ? 'showing LinkedIn only' : `${pct(s.linkedinVisits, s.visits)}% of visits`,
      accent: 'var(--cat-linkedin)',
    },
    { label: 'Organisations', value: String(s.organisations), sub: 'networks seen', accent: 'var(--cat-avatar)' },
    none
      ? { label: 'Returning', value: 'No visits', sub: period, accent: 'var(--adm-muted)', word: true }
      : { label: 'Returning', value: `${pct(s.returningVisits, s.visits)}%`, sub: `${s.returningVisits} of ${s.visits} visits`, accent: 'var(--adm-blue)' },
    none
      ? { label: 'Time on site', value: 'No visits', sub: period, accent: 'var(--adm-muted)', word: true }
      : { label: 'Time on site', value: duration(s.medianSeconds), sub: `median · avg ${duration(s.meanSeconds)}`, accent: 'var(--cat-suggestion)' },
    none
      ? { label: 'Opened a section', value: 'No visits', sub: period, accent: 'var(--adm-muted)', word: true }
      : { label: 'Opened a section', value: `${pct(s.sectionVisits, s.visits)}%`, sub: `${s.sectionVisits} of ${s.visits} visits`, accent: 'var(--adm-red)' },
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

function SourceBadge({ source }: { source: VisitRow['source'] }) {
  return <span className={`adm-source adm-source--${source}`}>{SOURCE_NAMES[source]}</span>
}

function Visitors({ visits, capped }: { visits: VisitRow[]; capped: boolean }) {
  const [sort, setSort] = useSavedChoice<VisitorSort>('admin-sort-visitors', 'recent', isVisitorSort)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [more, setMore] = useState({ key: '', n: PAGE_SIZE })
  const rows = useMemo(() => visitorsOf(visits), [visits])
  const found = useMemo(() => sortVisitors(rows.filter((r) => matches(query, r.who, r.org, r.host, r.place, r.device)), sort), [rows, query, sort])
  const listKey = `${sort}|${query}|${visits.length}`
  const shown = pageFor(more, listKey)

  return (
    <section className="adm-card adm-panel" aria-labelledby="adm-visitors-title">
      <header className="adm-panel-head">
        <div className="min-w-0">
          <h3 id="adm-visitors-title" className="adm-h3">
            Visitors
          </h3>
          <p className="adm-chart-sub">
            {rows.length} in this range · {VISITOR_SORTS.find((s) => s.value === sort)?.label.toLowerCase()} · choose a name for their timeline
            {capped && ' · only the newest 10,000 visits are loaded'}
          </p>
        </div>
        <div className="adm-toolbar">
          <SortSelect value={sort} options={VISITOR_SORTS} onChange={setSort} />
          <FindBox value={query} onChange={setQuery} placeholder="Name, organisation, place" />
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="adm-panel-empty">No visitors in this range yet.</p>
      ) : found.length === 0 ? (
        <p className="adm-panel-empty">Nobody matches “{query.trim()}”.</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table adm-table--visitors">
            <thead>
              <tr>
                <th scope="col">Who</th>
                <th scope="col">Network / organisation</th>
                <th scope="col">Place</th>
                <th scope="col">Device</th>
                <th scope="col">Source</th>
                <th scope="col" className="adm-num">
                  Visits
                </th>
                <th scope="col" className="adm-num">
                  Time
                </th>
                <th scope="col">Sections opened</th>
                <th scope="col">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {found.slice(0, shown).map((r) => (
                <Fragment key={r.id}>
                  <VisitorLine r={r} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} />
                  {open === r.id && (
                    <tr className="adm-timeline-row">
                      <td colSpan={9}>
                        <Timeline r={r} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ShowMore shown={Math.min(shown, found.length)} total={found.length} noun="visitors" onMore={() => setMore({ key: listKey, n: shown + PAGE_SIZE })} />
    </section>
  )
}

function VisitorLine({ r, open, onToggle }: { r: VisitorRow; open: boolean; onToggle: () => void }) {
  return (
    <tr className={open ? 'adm-row--open' : ''}>
      <td data-label="Who">
        <button type="button" className="adm-who-btn" aria-expanded={open} onClick={onToggle}>
          <span aria-hidden className="adm-caret">
            {open ? '▼' : '▶'}
          </span>
          <span className={r.labelled ? 'adm-who-label' : ''}>{r.who}</span>
        </button>
      </td>
      <td data-label="Network">
        {r.org ?? <span className="adm-time">unknown</span>}
        {r.host && <span className="adm-sub-line">{r.host}</span>}
      </td>
      <td data-label="Place">
        {r.place ? (
          <>
            <span aria-hidden>{flag(r.countryCode)} </span>
            {r.place}
          </>
        ) : (
          <span className="adm-time">unknown</span>
        )}
      </td>
      <td data-label="Device">{r.device || <span className="adm-time">unknown</span>}</td>
      <td data-label="Source">
        <SourceBadge source={r.source} />
      </td>
      <td data-label="Visits" className="adm-num">
        {r.visits}
      </td>
      <td data-label="Time" className="adm-num">
        {duration(r.seconds)}
      </td>
      <td data-label="Sections">{r.sections.length ? r.sections.map((s) => SECTION_NAMES[s] ?? s).join(', ') : <span className="adm-time">none</span>}</td>
      <td data-label="Last seen">
        <When iso={r.lastSeen} />
      </td>
    </tr>
  )
}

function Timeline({ r }: { r: VisitorRow }) {
  return (
    <ol className="adm-timeline" aria-label={`${r.who}: visits, newest first`}>
      {r.timeline.map((v) => (
        <li key={v.id}>
          <span className="adm-timeline-when">
            {new Date(v.started_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short', timeZone: ACTIVITY_TZ })}
          </span>
          <span className="adm-timeline-body">
            <SourceBadge source={v.source} />
            {v.referrer_host && <span> from {v.referrer_host}</span>}
            {tagOf(v) && <span> · tagged “{tagOf(v)}”</span>}
            {v.returning_visit && <span> · returning</span>}
            <span> · {duration(v.active_seconds)} on the page</span>
            <span className="block adm-time">
              {v.sections.length ? `Opened ${v.sections.map((s) => SECTION_NAMES[s] ?? s).join(' → ')}` : 'Didn’t open a section'}
              {v.landing && v.landing !== '/' ? ` · landed on ${v.landing}` : ''}
              {' · '}
              {deviceOf(v)}
              {placeOf(v) ? ` · ${placeOf(v)}` : ''}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function Bars({ title, note, rows, people, empty, format, color }: { title: string; note?: string; rows: Tally[]; people?: boolean; empty: string; format?: (key: string) => string; color?: (key: string) => string }) {
  const [all, setAll] = useState(false)
  const top = Math.max(1, ...rows.map((r) => r.count))
  const list = all ? rows : rows.slice(0, 6)
  return (
    <section className="adm-card adm-bars-card" aria-label={title}>
      <h3 className="adm-h3">
        {title}
        {note && <span className="adm-bars-note">{note}</span>}
      </h3>
      {rows.length === 0 ? (
        <p className="adm-panel-empty">{empty}</p>
      ) : (
        <ul className="adm-bar-list">
          {list.map((r) => (
            <li key={r.key}>
              <span className="adm-bar-label" title={format ? format(r.key) : r.key}>
                {format ? format(r.key) : r.key}
              </span>
              <span className="adm-bar-track" aria-hidden>
                <span style={{ width: `${(r.count / top) * 100}%`, background: color?.(r.key) ?? 'var(--cat-visitor)' }} />
              </span>
              <span className="adm-bar-count">
                {r.count}
                {people && <span className="adm-bar-people">{r.people === 1 ? '1 person' : `${r.people} people`}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 6 && (
        <button type="button" className="adm-link-btn" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${rows.length}`}
        </button>
      )}
    </section>
  )
}

function Breakdowns({ visits }: { visits: VisitRow[] }) {
  const s = summarize(visits)
  const li = (key: string) => (/linkedin/i.test(key) ? 'var(--cat-linkedin)' : 'var(--cat-visitor)')
  return (
    <div className="adm-breakdowns">
      <Bars title="Top sources" rows={tally(visits, (v) => v.source)} people format={(k) => SOURCE_NAMES[k as VisitRow['source']] ?? k} color={(k) => (k === 'linkedin' ? 'var(--cat-linkedin)' : 'var(--cat-visitor)')} empty="No visits yet." />
      <Bars title="Organisations and networks" rows={tally(visits, (v) => v.org)} people empty="No networks looked up yet." />
      <Bars
        title="Most-opened sections"
        note={s.visits ? `${pct(s.sectionVisits, s.visits)}% of visits opened one` : undefined}
        rows={tally(visits, (v) => v.sections)}
        people
        format={(k) => SECTION_NAMES[k] ?? k}
        color={() => 'var(--adm-red)'}
        empty="No sections opened yet."
      />
      <Bars title="Places" rows={tally(visits, (v) => placeOf(v))} empty="No places yet." />
      <Bars title="Countries" rows={tally(visits, (v) => v.country_code)} format={(k) => `${flag(k)} ${k}`} empty="No countries yet." />
      <Bars title="Referrers" rows={tally(visits, (v) => v.referrer_host)} color={li} empty="Nobody arrived from another site yet." />
      <Bars title="Devices" rows={tally(visits, (v) => (v.device ? v.device[0].toUpperCase() + v.device.slice(1) : null))} empty="No devices yet." />
      <Bars title="Browsers" rows={tally(visits, (v) => v.browser)} empty="No browsers yet." />
      <Bars title="Systems" rows={tally(visits, (v) => v.os)} empty="No systems yet." />
      <Bars title="Tagged links (utm and ?ref=)" rows={tally(visits, tagOf)} color={li} empty="No tagged links used yet." />
    </div>
  )
}

function newCode(): string {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => a[b % a.length]).join('')
}

function PersonalLinks({ db, links, visits, onChange }: { db: SupabaseClient; links: LinkRow[]; visits: VisitRow[]; onChange: () => void }) {
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)
  const urlOf = (code: string) => `${location.origin}/?p=${code}`
  const counts = tally(visits, (v) => v.link_code)

  const create = async (e: FormEvent) => {
    e.preventDefault()
    const name = label.trim()
    if (!name) return
    setBusy(true)
    setError('')
    const { error } = await db.from('personal_links').insert({ code: newCode(), label: name.slice(0, 80) })
    setBusy(false)
    if (error) return setError(error.message)
    setLabel('')
    onChange()
  }
  const remove = async (code: string) => {
    const { error } = await db.from('personal_links').delete().eq('code', code)
    setConfirm(null)
    if (error) return setError(error.message)
    onChange()
  }
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(urlOf(code))
      setCopied(code)
      window.setTimeout(() => setCopied((c) => (c === code ? '' : c)), 1800)
    } catch {
      setError('Couldn’t copy. Select the link and copy it instead.')
    }
  }

  return (
    <section className="adm-card adm-panel" aria-labelledby="adm-links-title">
      <header className="adm-panel-head">
        <div className="min-w-0">
          <h3 id="adm-links-title" className="adm-h3">
            Personal links
          </h3>
          <p className="adm-chart-sub">Share one with a single person: every visit from their browser gets their label, even later ones without the link.</p>
        </div>
      </header>
      <form className="adm-link-form" onSubmit={create}>
        <label className="sr-only" htmlFor="adm-link-label">
          Who the link is for
        </label>
        <input id="adm-link-label" className="adm-input adm-find" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder="Who it’s for, e.g. Sarah, recruiter at Canva" autoComplete="off" />
        <button type="submit" className="pixel-btn pixel-btn--primary adm-btn" disabled={busy || !label.trim()}>
          {busy ? 'CREATING…' : 'CREATE LINK'}
        </button>
      </form>
      {error && <p className="adm-error mt-2">{error}</p>}
      {links.length > 0 && (
        <ul className="adm-links">
          {links.map((l) => (
            <li key={l.code}>
              <span className="min-w-0 flex-1">
                <span className="adm-name">{l.label}</span>
                <span className="adm-sub-line">
                  <code className="adm-code">{urlOf(l.code)}</code> · {counts.find((c) => c.key === l.code)?.count ?? 0} visits in 180 days · made <When iso={l.created_at} />
                </span>
              </span>
              {confirm === l.code ? (
                <ConfirmBar question={`Delete the link for ${l.label}?`} detail="The link stops labelling new visits. Visits already labelled keep the label." confirmLabel="DELETE LINK" onConfirm={() => void remove(l.code)} onCancel={() => setConfirm(null)} />
              ) : (
                <span className="adm-actions">
                  <button type="button" className="pixel-btn adm-btn" onClick={() => void copy(l.code)}>
                    {copied === l.code ? '✓ COPIED' : 'COPY LINK'}
                  </button>
                  <button type="button" className="pixel-btn adm-btn adm-btn--danger" onClick={() => setConfirm(l.code)}>
                    DELETE…
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** "Don't count my own visits from this browser": the same switch as Settings → VISIT STATS. */
function OwnVisits() {
  const { saved, saveSettings } = useSettings()
  return (
    <label className="adm-check">
      <input type="checkbox" checked={saved.visitStats === false} onChange={(e) => saveSettings({ ...saved, visitStats: !e.target.checked })} />
      <span>Don’t count my own visits from this browser (turn this on in each browser you use; it’s the VISIT STATS setting)</span>
    </label>
  )
}
