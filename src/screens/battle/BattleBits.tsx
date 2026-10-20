import { useLayoutEffect, useState, type RefObject } from 'react'
import { creatureArt } from '../../sprites/creatures'
import { PixelArt } from '../../ui/PixelArt'
import type { SpeciesId } from '../../battle/data'

export function CreatureSprite({ id, scale, flip = false, className = '' }: { id: SpeciesId; scale: number; flip?: boolean; className?: string }) {
  const art = creatureArt[id]
  return <PixelArt pixels={art.pixels} palette={art.palette} scale={scale} className={`${flip ? 'flip' : ''} ${className}`} />
}

/** Largest integer scale so `units` pixels fit in `fraction` of the element's height. */
export function useHeightScale(ref: RefObject<HTMLElement | null>, fraction: number, units: number) {
  const [scale, setScale] = useState(2)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setScale(Math.max(1, Math.floor((el.clientHeight * fraction) / units)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, fraction, units])
  return scale
}

/** Game-style HP bar. */
export function HpBar({ hp, max, showNumbers = false }: { hp: number; max: number; showNumbers?: boolean }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100))
  const color = pct > 50 ? 'var(--color-leaf)' : pct > 20 ? 'var(--color-amber)' : 'var(--color-ember)'
  return (
    <div>
      <div className="flex items-center gap-1">
        <span className="font-display rounded-sm bg-[#e0a020] px-1 text-[clamp(6px,1.6cqi,9px)] leading-tight text-ink">HP</span>
        <div
          role="meter"
          aria-label="HP"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={Math.round(hp)}
          className="h-[clamp(5px,1.4cqi,9px)] flex-1 bg-[#384050] shadow-[0_0_0_2px_var(--color-ink)]"
        >
          <div className="h-full" style={{ width: `${pct}%`, background: color, boxShadow: 'inset 0 -2px 0 rgb(0 0 0 / 0.25)' }} />
        </div>
      </div>
      {showNumbers && (
        <p className="font-display m-0 mt-0.5 text-right text-[clamp(7px,2cqi,12px)]">
          {Math.max(0, Math.round(hp))}/{max}
        </p>
      )}
    </div>
  )
}
