import { useLayoutEffect, useMemo, useState, type RefObject } from 'react'
import { CREATURE_SIZE, gestureFrames, idleFrames, poseFrame } from '../../sprites/creatures'
import { useCreatureIdle } from '../../ui/useCreatureIdle'
import { pixelsToDataUrl } from '../../sprites/render'
import type { Pixels } from '../../sprites/pixels'
import { useSettings } from '../../systems/settings'
import { creatureOverrideUrl } from '../../sprites/assets'
import { useAssetLoads } from '../../ui/useAssets'
import { crispScale } from '../../ui/CharacterSprite'
import type { SpeciesId } from '../../battle/data'

/** BW-style breathing: the upper body rises by `d` pixels and the waist stretches to follow. */
function breathe(px: Pixels, d: number): Pixels {
  const split = Math.round(px.length * 0.62)
  return px.map((row, y) => (y + d < split ? px[y + d] : y < split ? px[split] : row))
}
const stripCache = new Map<string, string>()
function idleStrip(id: SpeciesId, hi: boolean, view: 'front' | 'back'): string {
  const key = `${id}:${hi}:${view}`
  let url = stripCache.get(key)
  if (!url) {
    // each species' own idle motion (tail, ears, wings…), with the breath on top:
    // rest → up → further up → up (looping)
    const { frames: own, palette } = idleFrames(id, hi ? 2 : 1, view)
    const lift = hi ? [0, 2, 3, 2] : [0, 1, 1, 1]
    const frames = lift.map((d, i) => breathe(own[i], d))
    url = pixelsToDataUrl(frames[0].map((_, y) => frames.map((f) => f[y]).join('')), palette)
    stripCache.set(key, url)
  }
  return url
}
/** A one-off strip (an attack pose or an idle gesture), frames side by side. */
function strip(key: string, make: () => { frames: Pixels[]; palette: Record<string, string> }): string {
  let url = stripCache.get(key)
  if (!url) {
    const { frames, palette } = make()
    url = pixelsToDataUrl(frames[0].map((_, y) => frames.map((f) => f[y]).join('')), palette)
    stripCache.set(key, url)
  }
  return url
}

export type CreaturePose = 'windup' | 'strike'

/**
 * A battle creature with a looping idle animation. `scale` is in 40-pixel units; at even
 * scales the 80×80 hi-res art is used, so big sprites get the finer linework. `view="back"`
 * shows it from behind, as your own creature appears in a BW battle.
 *
 * Each sprite loops at its own speed and phase, and species with idle gestures blink or do
 * something bigger now and then (useCreatureIdle). `pose` shows an attack pose instead (a
 * species without that pose just shows its rest frame); gestures stop while it's set or while
 * `busy` (its own move is playing).
 */
export function CreatureSprite({ id, scale, flip = false, still = false, view = 'front', pose = null, busy = false, seed, className = '' }: { id: SpeciesId; scale: number; flip?: boolean; still?: boolean; view?: 'front' | 'back'; pose?: CreaturePose | null; busy?: boolean; seed?: number; className?: string }) {
  const { reducedMotion } = useSettings()
  const hi = scale % 2 === 0
  const k = hi ? 2 : 1
  const size = CREATURE_SIZE * scale
  const url = useMemo(() => idleStrip(id, hi, view), [id, hi, view])
  const animate = !still && !reducedMotion
  // gestures yield while this creature is posing or its own move is playing
  const { gesture, epoch, loop } = useCreatureIdle(id, view, animate && !pose && !busy, seed)
  useAssetLoads()
  const handDrawn = view === 'front' ? creatureOverrideUrl(id) : null
  if (handDrawn) return <img src={handDrawn} width={size} height={size} alt={id} draggable={false} className={`pixelated inline-block align-bottom ${flip ? 'flip' : ''} ${className}`} />
  const box = { width: size, height: size, backgroundRepeat: 'no-repeat', ['--cw' as string]: `${size}px` }
  const cls = `pixelated inline-block align-bottom ${flip ? 'flip' : ''} ${className}`
  if (pose) {
    const p = strip(`pose:${id}:${k}:${view}:${pose}`, () => poseFrame(id, k, view, pose))
    return <span role="img" aria-label={id} data-pose={pose} className={cls} style={{ ...box, backgroundImage: `url(${p})`, backgroundSize: `${size}px ${size}px` }} />
  }
  if (gesture && animate) {
    const g = strip(`gesture:${id}:${k}:${view}:${gesture.id}`, () => gestureFrames(id, k, view, gesture.id))
    return (
      <span
        role="img"
        aria-label={id}
        data-gesture={gesture.id}
        className={`${cls} ${gesture.frames > 1 ? 'creature-gesture' : ''}`}
        style={{ ...box, backgroundImage: `url(${g})`, backgroundSize: `${size * gesture.frames}px ${size}px`, ['--n' as string]: gesture.frames, animationDuration: `${gesture.frames * gesture.frameMs}ms`, animationTimingFunction: `steps(${gesture.frames})` }}
      />
    )
  }
  return (
    <span
      key={epoch}
      role="img"
      aria-label={id}
      className={`${cls} ${animate ? 'creature-idle' : ''}`}
      style={{ ...box, backgroundImage: `url(${url})`, backgroundSize: `${size * 4}px ${size}px`, animationDuration: `${loop.periodMs}ms`, animationDelay: epoch === 0 ? `-${loop.offsetMs}ms` : '0ms' }}
    />
  )
}

/**
 * Largest scale so `units` pixels fit in `fraction` of the element's height: a whole number, or
 * with `crisp`, any step that keeps art pixels on whole device pixels (see crispScale).
 */
export function useHeightScale(ref: RefObject<HTMLElement | null>, fraction: number, units: number, crisp = false) {
  const [scale, setScale] = useState(2)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const px = (el.clientHeight * fraction) / units
      setScale(crisp ? crispScale(px) : Math.max(1, Math.floor(px)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, fraction, units, crisp])
  return scale
}

/** Game-style HP bar. */
/** Gen V HP gauge: an outlined HP tag, a dark track, and a fill lit along its top half. */
export function HpBar({ hp, max, showNumbers = false, dark = false }: { hp: number; max: number; showNumbers?: boolean; dark?: boolean }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100))
  const color = pct > 50 ? '#48c050' : pct > 20 ? '#f0b020' : '#e83828'
  const light = pct > 50 ? '#88f070' : pct > 20 ? '#ffe070' : '#ff8868'
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className="font-display rounded-[3px] bg-[#f0a828] px-1 text-[clamp(8px,2.2cqi,13px)] leading-tight text-[#3a2008] shadow-[0_0_0_1.5px_var(--gv-ink)]">HP</span>
        <div
          role="meter"
          aria-label="HP"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={Math.round(hp)}
          className="h-[clamp(6px,1.5cqi,10px)] flex-1 rounded-[2px] bg-[#262a3c] shadow-[0_0_0_2px_var(--gv-ink),inset_0_1px_0_rgb(255_255_255_/_0.12)]"
        >
          <div className="h-full rounded-[1px]" style={{ width: `${pct}%`, background: `linear-gradient(180deg, ${light} 0 45%, ${color} 45% 100%)` }} />
        </div>
      </div>
      {showNumbers && (
        <p className={`gv-label m-0 mt-0.5 text-right text-[clamp(10px,2.8cqi,17px)] ${dark ? 'text-paper' : ''}`}>
          {Math.max(0, Math.round(hp))}/{max}
        </p>
      )}
    </div>
  )
}
