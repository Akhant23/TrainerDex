import { useLayoutEffect, useMemo, useState, type RefObject } from 'react'
import { creatureArt, creatureArtHi, CREATURE_SIZE } from '../../sprites/creatures'
import { pixelsToDataUrl } from '../../sprites/render'
import type { Pixels } from '../../sprites/pixels'
import { useSettings } from '../../systems/settings'
import type { SpeciesId } from '../../battle/data'

/** BW-style breathing: the upper body rises by `d` pixels and the waist stretches to follow. */
function breathe(px: Pixels, d: number): Pixels {
  const split = Math.round(px.length * 0.62)
  return px.map((row, y) => (y + d < split ? px[y + d] : y < split ? px[split] : row))
}
const stripCache = new Map<string, string>()
function idleStrip(id: SpeciesId, hi: boolean): string {
  const key = `${id}:${hi}`
  let url = stripCache.get(key)
  if (!url) {
    const art = (hi ? creatureArtHi : creatureArt)[id]
    // rest → up → further up → up (looping)
    const lift = hi ? [0, 2, 3, 2] : [0, 1, 1, 1]
    const frames = lift.map((d) => breathe(art.pixels, d))
    url = pixelsToDataUrl(frames[0].map((_, y) => frames.map((f) => f[y]).join('')), art.palette)
    stripCache.set(key, url)
  }
  return url
}

/**
 * A battle creature with a looping idle animation. `scale` is in 40-pixel units; at even
 * scales the 80×80 hi-res art is used, so big sprites get the finer linework.
 */
export function CreatureSprite({ id, scale, flip = false, still = false, className = '' }: { id: SpeciesId; scale: number; flip?: boolean; still?: boolean; className?: string }) {
  const { reducedMotion } = useSettings()
  const hi = scale % 2 === 0
  const size = CREATURE_SIZE * scale
  const url = useMemo(() => idleStrip(id, hi), [id, hi])
  const animate = !still && !reducedMotion
  return (
    <span
      role="img"
      aria-label={id}
      className={`pixelated inline-block align-bottom ${animate ? 'creature-idle' : ''} ${flip ? 'flip' : ''} ${className}`}
      style={{ width: size, height: size, backgroundImage: `url(${url})`, backgroundSize: `${size * 4}px ${size}px`, backgroundRepeat: 'no-repeat', ['--cw' as string]: `${size}px` }}
    />
  )
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
        <span className="font-display rounded-sm bg-[#e0a020] px-1 text-[clamp(8px,2.2cqi,13px)] leading-tight text-ink">HP</span>
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
        <p className="font-display m-0 mt-0.5 text-right text-[clamp(10px,2.8cqi,17px)]">
          {Math.max(0, Math.round(hp))}/{max}
        </p>
      )}
    </div>
  )
}
