import type { ReactNode } from 'react'
import { types, type TypeId } from '../content/pokedex'
import { sources, type SourceId } from '../content/sources'

/** Pokémon-style type pill. */
export function TypeChip({ type }: { type: TypeId }) {
  const t = types[type]
  return (
    <span
      className="font-display inline-block px-2 py-1 text-[13px] leading-none text-paper text-outline"
      style={{ background: t.color, boxShadow: '0 0 0 2px var(--color-ink), inset 0 -2px 0 rgb(0 0 0 / 0.25)' }}
    >
      {t.label}
    </span>
  )
}

/** "Source: Resume · LinkedIn" line under facts. */
export function Sources({ ids, className = '' }: { ids: readonly SourceId[]; className?: string }) {
  if (!ids.length) return null
  return (
    <p className={`m-0 border-t border-dashed border-[#c8d0e0] pt-3 text-[13px] leading-relaxed text-muted ${className}`}>
      <span className="font-display text-[11px] tracking-wide">SOURCE </span>
      {ids.map((id, i) => {
        const s = sources[id]
        return (
          <span key={id}>
            {i > 0 && ' · '}
            {s.href ? (
              <a href={s.href} target="_blank" rel="noreferrer" className="text-harbour underline decoration-dotted underline-offset-2">
                {s.label}
              </a>
            ) : (
              s.label
            )}
          </span>
        )
      })}
    </p>
  )
}

/** Small heading used inside content panels. */
export function Heading({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`font-display m-0 mb-3 text-[clamp(14px,3.2cqi,18px)] text-dex-red ${className}`}>{children}</h3>
}

/** Pill list for skills/tags. */
export function Tags({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
      {items.map((s) => (
        <li key={s} className="bg-[#dfe4f0] px-2.5 py-1 text-[14px] leading-snug shadow-[0_0_0_2px_#b8c0d8]">
          {s}
        </li>
      ))}
    </ul>
  )
}

/** Shown wherever a fact hasn't been supplied yet — never filled with invented text. */
export function Pending({ children = 'Notes coming soon.' }: { children?: ReactNode }) {
  return <span className="text-muted italic">{children}</span>
}

/** Split prose into sentences for dot points ("e.g." / "St." safe enough for our content). */
export function toPoints(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘(])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * ▸ dot-point list with comfortable spacing. Pass prose (split by sentence) or an array. A single
 * point is a plain paragraph unless `marked`, where it keeps its ▸ (so a page's points all match).
 */
export function Bullets({ items, className = '', marked = false }: { items: string | readonly string[]; className?: string; marked?: boolean }) {
  const list = typeof items === 'string' ? toPoints(items) : items
  if (list.length === 1 && !marked) return <p className={`m-0 leading-relaxed ${className}`}>{list[0]}</p>
  return (
    <ul className={`m-0 list-none space-y-3.5 p-0 leading-relaxed ${className}`}>
      {list.map((t) => (
        <li key={t} className="flex gap-2.5">
          <span aria-hidden className="shrink-0 text-dex-red">
            ▸
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}
