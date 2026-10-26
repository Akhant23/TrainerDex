import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { PixelIcon } from '../ui/PixelIcon'
import type { IconName } from '../sprites/icons'
import { PAGE_SIZE } from '../systems/adminSort'

/**
 * The admin's building blocks, so every admin page shares one look: TrainerDex's Gen V cards and
 * buttons (ink outlines, hard drops, pixel headings) with a plain, readable face for the data
 * itself. Styles are the `.adm-*` rules in styles/index.css.
 */

/** A page inside the admin: a heading, one line on what it's for, and its actions on the right. */
export function AdminPage({ title, description, actions, children }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="adm-page" aria-labelledby={`adm-${title}`}>
      <header className="adm-page-head">
        <div className="min-w-0">
          <h2 id={`adm-${title}`} className="adm-h2">
            {title}
          </h2>
          {description && <p className="adm-lede">{description}</p>}
        </div>
        {actions && <div className="adm-page-actions">{actions}</div>}
      </header>
      {children}
    </section>
  )
}

export interface SegmentOption<T> {
  value: T
  label: string
  /** A count shown after the label (e.g. how many are pending). */
  count?: number
}

/**
 * A row of mutually exclusive choices (date range, source, status). The chosen one is filled blue;
 * arrow keys move between them like any radio group.
 */
export function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: readonly SegmentOption<T>[]; onChange: (v: T) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const current = Math.max(0, options.findIndex((o) => o.value === value))
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    e.stopPropagation()
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : (current + d + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }
  return (
    <div className="adm-filter">
      <span className="adm-filter-label" aria-hidden>
        {label}
      </span>
      <div className="adm-seg" role="radiogroup" aria-label={label} onKeyDown={onKey}>
        {options.map((o, i) => {
          const on = o.value === value
          return (
            <button
              key={String(o.value)}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className={`adm-seg-btn ${on ? 'adm-seg-btn--on' : ''}`}
              onClick={() => onChange(o.value)}
            >
              {o.label}
              {o.count != null && <span className="adm-seg-count">{o.count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type NoticeKind = 'empty' | 'loading' | 'error' | 'info'
const NOTICE_ICON: Record<NoticeKind, string> = { empty: '○', loading: '…', error: '!', info: 'i' }

/** Loading, empty, error and info states, all in one shape so none of them looks broken. */
export function Notice({ kind, title, children, action, icon }: { kind: NoticeKind; title: string; children?: ReactNode; action?: ReactNode; icon?: IconName }) {
  return (
    <div className={`adm-card adm-notice adm-notice--${kind}`} role={kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined}>
      <span className="adm-notice-icon" aria-hidden>
        {icon ? <PixelIcon name={icon} scale={2} /> : NOTICE_ICON[kind]}
      </span>
      <div className="min-w-0">
        <p className="adm-notice-title">{kind === 'loading' ? <span className="adm-loading">{title}</span> : title}</p>
        {children && <div className="adm-notice-text">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}

export type BadgeTone = 'pending' | 'approved' | 'rejected' | 'spam' | 'visible' | 'hidden'
const BADGE: Record<BadgeTone, { glyph: string; text: string }> = {
  pending: { glyph: '●', text: 'Pending' },
  approved: { glyph: '✓', text: 'Approved' },
  rejected: { glyph: '✕', text: 'Rejected' },
  spam: { glyph: '!', text: 'Spam' },
  visible: { glyph: '●', text: 'Visible' },
  hidden: { glyph: '◌', text: 'Hidden' },
}

/** A status label: a glyph and a word as well as a colour, so it reads without the colour. */
export function StatusBadge({ tone }: { tone: BadgeTone }) {
  const b = BADGE[tone]
  return (
    <span className={`adm-badge adm-badge--${tone}`}>
      <span aria-hidden>{b.glyph}</span>
      {b.text}
    </span>
  )
}

/**
 * An inline "are you sure?" for actions that can't be undone: says what will happen, puts focus on
 * the safe choice, and Esc backs out.
 */
export function ConfirmBar({ question, detail, confirmLabel, onConfirm, onCancel }: { question: string; detail?: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => cancelRef.current?.focus(), [])
  return (
    <div
      className="adm-confirm"
      role="alertdialog"
      aria-label={question}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        e.preventDefault()
        e.stopPropagation()
        onCancel()
      }}
    >
      <div className="min-w-0">
        <p className="adm-confirm-q">{question}</p>
        {detail && <p className="adm-confirm-detail">{detail}</p>}
      </div>
      <div className="adm-actions">
        <button ref={cancelRef} type="button" className="pixel-btn adm-btn" onClick={onCancel}>
          CANCEL
        </button>
        <button type="button" className="pixel-btn pixel-btn--primary adm-btn" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

/** "3 min ago", "yesterday", or a date: easier to scan in a list than a full timestamp. */
export function When({ iso }: { iso: string }) {
  // relative to when the row was shown (a reload or Refresh brings it up to date)
  const [now] = useState(() => Date.now())
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return <span className="adm-time">unknown date</span>
  const full = d.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
  const mins = Math.round((now - d.getTime()) / 60000)
  const sameYear = d.getFullYear() === new Date(now).getFullYear()
  const day = d.toLocaleDateString('en-AU', sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
  // the full date and time is in the tooltip
  const short = mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : mins < 24 * 60 ? `${Math.round(mins / 60)} h ago` : day
  return (
    <time className="adm-time" dateTime={d.toISOString()} title={full}>
      {short}
    </time>
  )
}

/** Re-read this page's data; says so while it's working. */
export function RefreshButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button type="button" className="pixel-btn adm-btn" onClick={onClick} disabled={busy} aria-label={busy ? 'Refreshing' : 'Refresh'}>
      <span aria-hidden className={busy ? 'adm-spin' : ''}>
        ↻
      </span>{' '}
      {busy ? 'REFRESHING' : 'REFRESH'}
    </button>
  )
}

/** A labelled dropdown for orders with more choices than a segmented row holds. */
export function SortSelect<T extends string>({ label = 'SORT', value, options, onChange }: { label?: string; value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (v: T) => void }) {
  const id = useId()
  return (
    <div className="adm-filter">
      <label className="adm-filter-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="adm-select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Narrow a list by typing: names, text, whatever the page passes in. */
export function FindBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const id = useId()
  return (
    <div className="adm-filter adm-filter--grow">
      <label className="adm-filter-label" htmlFor={id}>
        FIND
      </label>
      <input
        id={id}
        className="adm-input adm-find"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Esc clears the box first (and never leaves the page from in here)
          if (e.key === 'Escape' && value) {
            e.preventDefault()
            e.stopPropagation()
            onChange('')
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  )
}

/** "Showing 50 of 120" and a button for the next batch, so long lists stay quick to scan. */
export function ShowMore({ shown, total, noun, onMore }: { shown: number; total: number; noun: string; onMore: () => void }) {
  if (total <= shown) return null
  return (
    <div className="adm-more">
      <span className="adm-summary">
        Showing <strong>{shown}</strong> of <strong>{total}</strong> {noun}
      </span>
      <button type="button" className="pixel-btn adm-btn" onClick={onMore}>
        SHOW {Math.min(total - shown, PAGE_SIZE)} MORE
      </button>
    </div>
  )
}
