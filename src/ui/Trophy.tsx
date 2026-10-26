import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { Badge } from '../content/badges'
import { pixelsToDataUrl } from '../sprites/render'
import { TROPHY_GLINTS, TROPHY_H, TROPHY_W, trophyArt } from '../sprites/trophy'
import { progress, useProgress } from '../systems/progress'
import { useSettings } from '../systems/settings'
import { crispScale } from './CharacterSprite'

/** How far the pointer must travel over the trophy for one polish tick (and one sweep of light). */
const RUB_PX = 40
const SPARKLE_MS = 620
const MAX_SPARKLES = 4

/**
 * A badge's trophy, filling the panel it's in (`fill` of its height, at a crisp whole-pixel scale),
 * and polished by rubbing it. Each rub tick adds polish (stored per visitor, as before), sends a
 * band of light across the metal (masked to the trophy's own silhouette, so it only crosses the
 * gold) and pops a small four-point sparkle at the next spot on the metal; the gold also brightens
 * a little as it's polished. Stop rubbing and it all settles; fully polished, it glints now and then.
 */
export function Trophy({ badge, fill = 0.74 }: { badge: Badge; fill?: number }) {
  const { shine } = useProgress()
  const { sfx, reducedMotion } = useSettings()
  const stored = shine[badge.id] ?? 0
  const polished = stored >= 100
  const art = useMemo(() => trophyArt(badge.pixels, badge.palette), [badge])
  const url = useMemo(() => pixelsToDataUrl(art.pixels, art.palette), [art])

  // fit the panel: the largest crisp scale at which the trophy is `fill` of its height (and fits across)
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(2)
  useLayoutEffect(() => {
    const el = box.current?.parentElement
    if (!el) return
    const measure = () => setScale(crispScale(Math.min((el.clientHeight * fill) / TROPHY_H, (el.clientWidth * 0.86) / TROPHY_W)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fill])

  // polishing: pointer travel → ticks; each tick a sweep of light and a sparkle
  const last = useRef<{ x: number; y: number } | null>(null)
  const travelled = useRef(0)
  const glint = useRef(0)
  const [sweep, setSweep] = useState(0)
  const lastSweep = useRef(0)
  const [sparkles, setSparkles] = useState<Array<{ id: number; at: [number, number] }>>([])
  const tick = () => {
    const before = shine[badge.id] ?? 0
    progress.polish(badge.id, 4)
    if (before < 100 && before + 4 >= 100) sfx('save')
    else if (before < 100) sfx('blip')
    if (reducedMotion) return
    // one sweep of light at a time (a new one only once the last has mostly crossed)
    const now = performance.now()
    if (now - lastSweep.current > 480) {
      lastSweep.current = now
      setSweep((n) => n + 1)
    }
    const id = ++glint.current
    const at = TROPHY_GLINTS[id % TROPHY_GLINTS.length]
    setSparkles((s) => [...s.slice(-(MAX_SPARKLES - 1)), { id, at }])
    window.setTimeout(() => setSparkles((s) => s.filter((x) => x.id !== id)), SPARKLE_MS)
  }
  const onMove = (e: PointerEvent) => {
    const p = { x: e.clientX, y: e.clientY }
    if (last.current) travelled.current += Math.hypot(p.x - last.current.x, p.y - last.current.y)
    last.current = p
    if (travelled.current > RUB_PX) {
      travelled.current = 0
      tick()
    }
  }

  // once it's spotless, a slow glint every few seconds (not while you're rubbing)
  useEffect(() => {
    if (!polished || reducedMotion) return
    const t = window.setInterval(() => {
      if (last.current) return
      setSweep((n) => n + 1)
      const id = ++glint.current
      setSparkles((s) => [...s.slice(-(MAX_SPARKLES - 1)), { id, at: TROPHY_GLINTS[id % TROPHY_GLINTS.length] }])
      window.setTimeout(() => setSparkles((s) => s.filter((x) => x.id !== id)), SPARKLE_MS)
    }, 3600)
    return () => window.clearInterval(t)
  }, [polished, reducedMotion])

  const level = 0.3 + 0.7 * (stored / 100) // trophies start a little dull
  const w = TROPHY_W * scale
  const h = TROPHY_H * scale
  return (
    <div
      ref={box}
      className="relative touch-none"
      style={{ width: w, height: h, filter: `saturate(${level}) brightness(${0.72 + 0.28 * level})` }}
      onPointerMove={onMove}
      onPointerLeave={() => (last.current = null)}
    >
      <img src={url} width={w} height={h} alt={`${badge.name} trophy`} draggable={false} className="pixelated block" />
      {/* the sweep of light, cut to the trophy's own shape */}
      {sweep > 0 && (
        <div
          key={sweep}
          aria-hidden
          className="trophy-sweep pointer-events-none absolute inset-0"
          style={{ maskImage: `url(${url})`, WebkitMaskImage: `url(${url})`, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' }}
        />
      )}
      {sparkles.map((s) => (
        <span
          key={s.id}
          aria-hidden
          className="trophy-sparkle pointer-events-none absolute"
          style={{ left: `${(s.at[0] / TROPHY_W) * 100}%`, top: `${(s.at[1] / TROPHY_H) * 100}%`, width: Math.max(6, scale * 5), height: Math.max(6, scale * 5) }}
        />
      ))}
    </div>
  )
}
