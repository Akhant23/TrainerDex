import { useEffect, useState } from 'react'
import { useSettings } from '../systems/settings'

/** HP-style bar that fills from empty when it first appears. */
export function StatBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color?: string }) {
  const { reducedMotion } = useSettings()
  const [shown, setShown] = useState(reducedMotion ? value : 0)
  useEffect(() => {
    const id = window.setTimeout(() => setShown(value), 60)
    return () => window.clearTimeout(id)
  }, [value])
  const pct = Math.max(0, Math.min(100, (shown / max) * 100))
  const fill = color ?? (pct > 50 ? 'var(--color-leaf)' : pct > 20 ? 'var(--color-amber)' : 'var(--color-ember)')
  return (
    <div className="flex items-center gap-3">
      <span className="font-display cq-text-xs w-[13.5em] shrink-0">{label}</span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="relative h-[calc(var(--u)*3)] flex-1 bg-[#384050] shadow-[0_0_0_var(--u)_var(--color-ink)]"
      >
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: fill,
            boxShadow: 'inset 0 calc(-1 * var(--u)) 0 rgb(0 0 0 / 0.25)',
            transition: reducedMotion ? 'none' : 'width 900ms steps(18)',
          }}
        />
      </div>
    </div>
  )
}
