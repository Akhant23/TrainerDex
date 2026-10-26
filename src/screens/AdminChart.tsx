import { useState, type KeyboardEvent } from 'react'
import { ACTIVITY_TZ, dayLabel, niceScale } from '../systems/activity'
import { DAY_SORTS, sortDays, type DaySort } from '../systems/adminSort'
import { useSavedChoice } from '../ui/useSavedChoice'
import { SortSelect } from './AdminUi'

/**
 * The admin's day-by-day bar chart (Activity and Metrics): stacked series in fixed colours, dashed
 * gridlines on round numbers, first/last (and a few middle) dates, a tooltip and a readout for the
 * day under the pointer or picked with the arrow keys, and the same numbers as a sortable table.
 * An empty period shows an explanation instead of empty axes.
 */

export interface ChartSeries {
  id: string
  /** Legend and table heading, e.g. "From LinkedIn". */
  label: string
  /** Tooltip wording for 1 / many, e.g. "visitor from LinkedIn" / "visitors from LinkedIn". */
  one: string
  many: string
  color: string
  /** A shorter table heading, so the table fits a phone. */
  short?: string
}

export interface ChartDay {
  key: string
  counts: Record<string, number>
}

const isDaySort = (v: unknown): v is DaySort => DAY_SORTS.some((s) => s.value === v)

export function DayChart({
  days,
  series,
  range,
  title,
  totals,
  totalWord,
  extra,
  empty,
  unavailable,
}: {
  days: readonly ChartDay[]
  series: readonly ChartSeries[]
  range: number
  title: string
  /** Legend figures (default: each series summed over the days). */
  totals?: Record<string, number>
  /** How the readout names a day's total: "3 new", "2 visitors". */
  totalWord: (n: number) => string
  /** More for the readout about day i, e.g. ", 2 still waiting for review". */
  extra?: (i: number) => string
  empty: { title: string; text: string }
  /** Set when there's nothing to chart because the data couldn't be loaded. */
  unavailable?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const [daySort, setDaySort] = useSavedChoice<DaySort>('admin-sort-days', 'newest', isDaySort)
  const dayTotal = (d: ChartDay) => series.reduce((n, s) => n + (d.counts[s.id] ?? 0), 0)
  const totalsArr = days.map(dayTotal)
  const peak = Math.max(0, ...totalsArr)
  const { max, step } = niceScale(peak)
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step)
  const gap = range <= 30 ? 'gap-[3px]' : range <= 90 ? 'gap-[1px]' : 'gap-0'
  // x labels: the first and last day, plus a few between on longer ranges
  const every = range <= 7 ? 1 : range <= 30 ? 7 : range <= 90 ? 15 : 30
  const xLabels = days.map((d, i) => (i === 0 || i === days.length - 1 || (i % every === 0 && days.length - 1 - i >= every / 2) ? d.key : null))
  const first = dayLabel(days[0].key, { day: 'numeric', month: 'short' })
  const last = dayLabel(days[days.length - 1].key, { day: 'numeric', month: 'short', year: 'numeric' })
  const subtitle = `Last ${range} days, ${first} – ${last} · ${ACTIVITY_TZ} time`
  const legend = totals ?? Object.fromEntries(series.map((s) => [s.id, days.reduce((n, d) => n + (d.counts[s.id] ?? 0), 0)]))
  const word = (s: ChartSeries, n: number) => `${n} ${n === 1 ? s.one : s.many}`

  const describe = (i: number) => {
    const d = days[i]
    const parts = series.filter((s) => (d.counts[s.id] ?? 0) > 0).map((s) => word(s, d.counts[s.id]))
    return `${dayLabel(d.key)}: ${totalsArr[i] === 0 ? 'nothing' : `${totalWord(totalsArr[i])}${series.length > 1 ? ` (${parts.join(', ')})` : ''}`}${extra?.(i) ?? ''}`
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
        <h3 className="adm-h3">{title}</h3>
        <p className="adm-chart-sub">{subtitle}</p>
      </div>
      {series.length > 0 && !unavailable && (
        <ul className="adm-legend" aria-label="Legend">
          {series.map((s) => (
            <li key={s.id}>
              <span aria-hidden className="adm-swatch" style={{ background: s.color }} />
              {s.label} <strong>{legend[s.id] ?? 0}</strong>
            </li>
          ))}
        </ul>
      )}
    </header>
  )

  if (unavailable || peak === 0)
    return (
      <section className="adm-card adm-chart" aria-label={title}>
        {header}
        <div className="adm-chart-empty">
          <p className="adm-chart-empty-title">{unavailable ? 'No data to chart' : `${empty.title} between ${first} and ${last}`}</p>
          <p>{unavailable ?? empty.text}</p>
        </div>
      </section>
    )

  const at = hover == null ? 0 : (hover + 0.5) / days.length
  const activeDays = days.filter((_, i) => totalsArr[i] > 0)
  return (
    <section className="adm-card adm-chart" aria-label={title}>
      {header}
      <div
        className="adm-plot"
        tabIndex={0}
        role="group"
        aria-label={`Bar chart: ${title}. ${subtitle}. Use the left and right arrow keys to read each day.`}
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
                <div className="adm-stack" style={{ height: `${(totalsArr[i] / max) * 100}%` }}>
                  {series.map((s) => ((d.counts[s.id] ?? 0) > 0 ? <span key={s.id} style={{ flexGrow: d.counts[s.id], background: s.color }} /> : null))}
                </div>
              </div>
            ))}
          </div>
          {hover != null && (
            <div className="adm-tip" role="presentation" style={{ left: `${at * 100}%`, transform: `translateX(${at < 0.18 ? '-12%' : at > 0.82 ? '-88%' : '-50%'})` }}>
              <strong className="block">{dayLabel(days[hover].key)}</strong>
              {totalsArr[hover] === 0 ? (
                <span className="block">Nothing</span>
              ) : (
                series.map((s) =>
                  (days[hover].counts[s.id] ?? 0) > 0 ? (
                    <span key={s.id} className="flex items-center gap-1.5">
                      <span aria-hidden className="adm-swatch" style={{ background: s.color }} />
                      {word(s, days[hover].counts[s.id])}
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
        <div className="adm-toolbar mt-3">
          <SortSelect value={daySort} options={DAY_SORTS} onChange={setDaySort} />
        </div>
        <div className="adm-table-scroll">
          <table className="adm-table adm-table--compact">
            <caption className="sr-only">
              {title}, each day with any. {subtitle}
            </caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                {series.length > 1 &&
                  series.map((s) => (
                    <th key={s.id} scope="col" className="adm-num">
                      {s.short ?? s.label}
                    </th>
                  ))}
                <th scope="col" className="adm-num">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {sortDays(activeDays, daySort, dayTotal).map((d) => (
                <tr key={d.key}>
                  <th scope="row">{dayLabel(d.key)}</th>
                  {series.length > 1 &&
                    series.map((s) => (
                      <td key={s.id} className="adm-num">
                        {d.counts[s.id] ?? 0}
                      </td>
                    ))}
                  <td className="adm-num">
                    <strong>{dayTotal(d)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="adm-notes-inline">Days not listed had none.</p>
      </details>
    </section>
  )
}
