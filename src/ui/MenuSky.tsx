import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { CLOUD, MOON, resort, SUN, sydney, type Silhouette, type Sprite } from '../sprites/skyline'
import type { SkyState } from '../resort/sky'
import { useSettings } from '../systems/settings'

/**
 * The main menu's backdrop: two silhouette bands that pan slowly at different speeds (Sydney far
 * off, the Battle Resort's roofline nearer), and the sky above them on the resort's clock (a sun
 * or moon on its arc, stars at night, clouds drifting). The bands take the focused tile's colours;
 * the sky's sprites are pale and see-through so the stripes show through them.
 */

const dpr = () => (typeof window !== 'undefined' && window.devicePixelRatio) || 1

/** Mix two #rrggbb colours (k = 0 → a, 1 → b). */
function mix(a: string, b: string, k: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [pa, pb] = [p(a), p(b)]
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join('')}`
}

let bands: { far: Silhouette; near: Silhouette } | undefined
const silhouettes = () => (bands ??= { far: sydney(), near: resort() })

/** What lies under a band, down to the panel's foot: the harbour (rippling) or the resort's paving. */
type Ground = 'water' | 'paving'

/**
 * One silhouette band, tiled across `width` (plus a tile to pan into), on the device-pixel grid,
 * with `below` rows of ground under it in the same colour (its pattern repeats within the tile, so
 * it pans with the band seamlessly).
 */
function Band({ art, color, lit, scale, width, period, below, ground }: { art: Silhouette; color: string; lit: boolean; scale: number; width: number; period: number; below: number; ground: Ground }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const tile = art.w * scale
  const tiles = Math.ceil(width / tile) + 1
  const rows = art.h + below
  // in step with every other copy of this band (the wipe's new colour lands exactly over the old)
  const [delay] = useState(() => -Math.round(performance.now() % period))
  useLayoutEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const p = scale * dpr()
    c.width = Math.round(tiles * art.w * p)
    c.height = Math.round(rows * p)
    ctx.clearRect(0, 0, c.width, c.height)
    const px = (x: number, y: number, w: number, fill: string) => {
      ctx.fillStyle = fill
      for (let t = 0; t < tiles; t++) ctx.fillRect(Math.round((t * art.w + x) * p), Math.round(y * p), Math.round(w * p), Math.round(p))
    }
    const paint = (mask: Uint8Array, fill: string) => {
      for (let y = 0; y < art.h; y++)
        for (let x = 0; x < art.w; ) {
          if (!mask[y * art.w + x]) {
            x++
            continue
          }
          let run = 1
          while (x + run < art.w && mask[y * art.w + x + run]) run++
          px(x, y, run, fill)
          x += run
        }
    }
    paint(art.body, color)
    if (lit) paint(art.lights, '#ffe7a0')
    // the ground under the band, down to the foot of the panel
    ctx.fillStyle = color
    ctx.fillRect(0, Math.round(art.h * p), c.width, c.height)
    const light = mix(color, '#ffffff', 0.12)
    const dark = mix(color, '#1c1a24', 0.25)
    for (let y = 0; y < below; y++) {
      const row = art.h + y
      if (ground === 'water') {
        // ripples: short pale dashes, staggered row to row (every pattern repeats in 32 px)
        if (y % 3 !== 1) continue
        const off = ((y * 11) % 32) | 0
        for (let x = off % 32; x < art.w; x += 32) px(x, row, 6 + (y % 2) * 3, light)
        // and the lights of the far shore glinting on the water after dark
        if (lit && y < 9) for (let x = (y * 7) % 16; x < art.w; x += 16) if ((x * 13 + y) % 5 === 0) px(x, row, 2, '#ffe7a080')
      } else {
        // paving: a dark joint every 6 rows, and staggered joints across (12 px slabs)
        if (y % 6 === 0) px(0, row, art.w, dark)
        else if (y % 6 === 1) px(0, row, art.w, light)
        else for (let x = Math.floor(y / 6) % 2 ? 6 : 0; x < art.w; x += 12) px(x, row, 1, dark)
      }
    }
  }, [art, color, lit, scale, tiles, rows, below, ground])
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="skyline-pan pixelated absolute bottom-0 left-0"
      style={{ width: tiles * tile, height: rows * scale, animationDuration: `${period}ms`, animationDelay: `${delay}ms`, animationTimingFunction: 'linear', ['--pan' as string]: `-${tile}px` }}
    />
  )
}

/**
 * Both bands, in shades of the tile's colour: the far one a little darker than the stripes, the
 * near one darker still. They stand up from behind the platform (the resort's roofs just over its
 * rim, the city's shore above them) and their ground runs on down to the panel's foot, behind the
 * text box: the harbour under the city, the resort's paving under its roofs, all panning together.
 */
export function SkylineBands({ tones, scale, width, ground, stage, lit }: { tones: readonly [string, string]; scale: number; width: number; ground: number; stage: number; lit: boolean }) {
  const { far, near } = silhouettes()
  if (!width || !scale) return null
  const [farColor, nearColor] = [mix(tones[0], '#1c1a24', 0.4), mix(tones[0], '#1c1a24', 0.6)]
  const [farBase, nearBase] = [ground + Math.round(stage * 0.17), ground + Math.round(stage * 0.06)]
  return (
    <>
      <Band art={far} color={farColor} lit={lit} scale={scale} width={width} period={320_000} below={Math.ceil(farBase / scale)} ground="water" />
      <Band art={near} color={nearColor} lit={lit} scale={scale} width={width} period={150_000} below={Math.ceil(nearBase / scale)} ground="paving" />
    </>
  )
}

function SpriteCanvas({ sprite, color, scale, className = '', style }: { sprite: Sprite; color: string; scale: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [w, h] = [sprite[0].length, sprite.length]
  useLayoutEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const p = scale * dpr()
    c.width = Math.round(w * p)
    c.height = Math.round(h * p)
    ctx.fillStyle = color
    sprite.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && ctx.fillRect(Math.round(x * p), Math.round(y * p), Math.ceil(p), Math.ceil(p))))
  }, [sprite, color, scale, w, h])
  return <canvas ref={ref} aria-hidden className={`pixelated absolute ${className}`} style={{ width: w * scale, height: h * scale, ...style }} />
}

const TINT: Record<SkyState['phase'], string> = {
  dawn: 'rgba(255,170,150,0.08)',
  day: 'transparent',
  dusk: 'rgba(255,120,60,0.10)',
  night: 'rgba(20,24,72,0.24)',
}

/** Where the night's stars sit (fractions of the panel's width and of its top quarter), each with its own twinkle. */
const STARS = Array.from({ length: 16 }, (_, i) => ({ x: ((i * 9301 + 49297) % 233280) / 233280, y: ((i * 4877 + 13) % 1000) / 1000, d: (i * 733) % 3000 }))

/** The sky over the menu: the time of day's tint, a sun or moon on its arc, stars, clouds. */
export function MenuSky({ sky, scale, width, height }: { sky: SkyState; scale: number; width: number; height: number }) {
  const { reducedMotion } = useSettings()
  const night = sky.phase === 'night'
  // the clouds' drift is on the page's clock, so they're spread out (and keep going) from the start
  const [t0] = useState(() => performance.now())
  if (!width || !scale) return null
  // the sun or moon rises on the left and sets on the right, highest at mid-phase
  const arc = Math.sin(Math.PI * sky.t)
  const body = { left: Math.round((0.04 + 0.86 * sky.t) * width), top: Math.round((0.03 + 0.09 * (1 - arc)) * height) }
  const sunColor = sky.phase === 'day' ? '#fff3b0' : '#ffc88a'
  const cloudCount = sky.weather === 'clear' ? 3 : 5
  const cloudW = CLOUD[0].length * scale
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: TINT[sky.phase] }} />
      {night &&
        STARS.map((s, i) => (
          <span key={i} className="menu-star absolute" style={{ left: `${s.x * 100}%`, top: `${s.y * 26}%`, width: scale, height: scale, animationDelay: `-${s.d}ms` }} />
        ))}
      {sky.weather !== 'rain' && <SpriteCanvas sprite={night ? MOON : SUN} color={night ? '#f4f0dc' : sunColor} scale={scale} style={{ ...body, opacity: 0.9 }} />}
      {Array.from({ length: cloudCount }, (_, i) => {
        const period = 90_000 + i * 37_000
        return (
          <SpriteCanvas
            key={i}
            sprite={CLOUD}
            color="#ffffff"
            scale={scale}
            className={reducedMotion ? '' : 'cloud-drift'}
            style={{
              left: 0,
              top: `${3 + ((i * 7) % 18)}%`,
              opacity: night ? 0.14 : sky.weather === 'clear' ? 0.3 : 0.38,
              transform: reducedMotion ? `translateX(${Math.round(((i + 0.5) / cloudCount) * width)}px)` : undefined,
              animationDuration: `${period}ms`,
              animationDelay: `-${Math.round((t0 + i * period * 0.37) % period)}ms`,
              animationTimingFunction: 'linear',
              ['--from' as string]: `-${cloudW}px`,
              ['--to' as string]: `${width}px`,
            }}
          />
        )
      })}
    </div>
  )
}
