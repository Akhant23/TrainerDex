/**
 * The Battle Resort's sky: a day/night cycle that follows the visitor's local clock, a sun or
 * moon that moves across it, drifting clouds, stars at night, and weather that changes every few
 * minutes (clear, cloudy, breezy, rain). Drawn on the canvas behind and over the 2.5D world.
 */

export type Phase = 'dawn' | 'day' | 'dusk' | 'night'
export type Weather = 'clear' | 'cloudy' | 'breezy' | 'rain'

export interface SkyState {
  phase: Phase
  /** 0 → 1 across the current phase (sun/moon position) */
  t: number
  weather: Weather
}

const WEATHER_CYCLE: Weather[] = ['clear', 'clear', 'cloudy', 'breezy', 'clear', 'rain', 'cloudy', 'clear']
/** Weather holds for four minutes at a time, the same for everyone. */
const WEATHER_MS = 4 * 60 * 1000

export function skyAt(date = new Date()): SkyState {
  const h = date.getHours() + date.getMinutes() / 60
  const span = (a: number, b: number) => (h - a) / (b - a)
  const phase: Phase = h >= 5 && h < 7 ? 'dawn' : h >= 7 && h < 17.5 ? 'day' : h >= 17.5 && h < 19.5 ? 'dusk' : 'night'
  const t = phase === 'dawn' ? span(5, 7) : phase === 'day' ? span(7, 17.5) : phase === 'dusk' ? span(17.5, 19.5) : h >= 19.5 ? (h - 19.5) / 9.5 : (h + 4.5) / 9.5
  const block = Math.floor(date.getTime() / WEATHER_MS)
  const weather = WEATHER_CYCLE[((block * 2654435761) >>> 0) % WEATHER_CYCLE.length]
  return { phase, t: Math.max(0, Math.min(1, t)), weather }
}

const ICON: Record<Phase, string> = { dawn: '☀', day: '☀', dusk: '☀', night: '☾' }
export function skyLabel(s: SkyState): string {
  const w = s.weather === 'rain' ? '☂ RAIN' : s.weather === 'cloudy' ? '☁ CLOUDY' : s.weather === 'breezy' ? '≈ BREEZY' : 'CLEAR'
  return `${ICON[s.phase]} ${s.phase.toUpperCase()} · ${w}`
}

const GRADIENTS: Record<Phase, [string, string]> = {
  dawn: ['#f4a6a0', '#ffe2b0'],
  day: ['#4f9fe8', '#cfeeff'],
  dusk: ['#5a4a9a', '#ff9e6e'],
  night: ['#0a1230', '#28386a'],
}

/** Paint the sky into the top of the canvas, down to the horizon row `hy` (device pixels). */
export function drawSky(ctx: CanvasRenderingContext2D, w: number, hy: number, now: number, s: SkyState, px: number) {
  if (hy <= 0) return
  const [top, bottom] = GRADIENTS[s.phase]
  const g = ctx.createLinearGradient(0, 0, 0, hy)
  g.addColorStop(0, s.weather === 'rain' ? mix(top, '#5a6474', 0.6) : s.weather === 'cloudy' ? mix(top, '#9aa6b8', 0.35) : top)
  g.addColorStop(1, s.weather === 'rain' ? mix(bottom, '#8a94a4', 0.6) : bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, hy)

  // stars
  if (s.phase === 'night') {
    for (let i = 0; i < 60; i++) {
      const x = ((i * 9301 + 49297) % 233280) / 233280
      const y = ((i * 4877 + 13) % 1000) / 1000
      if (y * hy > hy * 0.85) continue
      const tw = 0.5 + 0.5 * Math.sin(now / 600 + i)
      ctx.fillStyle = `rgba(255,255,240,${0.35 + tw * 0.5})`
      ctx.fillRect(Math.round(x * w), Math.round(y * hy * 0.85), px, px)
    }
  }

  // sun or moon on an arc from the left horizon to the right
  if (s.weather !== 'rain') {
    const ang = Math.PI * (1 - s.t)
    const cx = w * (0.5 + 0.42 * Math.cos(ang))
    const cy = hy * (0.95 - 0.75 * Math.sin(ang))
    const r = px * (s.phase === 'night' ? 7 : 9)
    if (s.phase === 'night') {
      ctx.fillStyle = 'rgba(240,240,220,0.18)'
      disc(ctx, cx, cy, r * 1.8)
      ctx.fillStyle = '#f2f0dc'
      disc(ctx, cx, cy, r)
      ctx.fillStyle = mix(GRADIENTS.night[0], '#28386a', 0.5)
      disc(ctx, cx + r * 0.45, cy - r * 0.2, r * 0.85)
    } else {
      ctx.fillStyle = s.phase === 'day' ? 'rgba(255,250,200,0.35)' : 'rgba(255,190,120,0.35)'
      disc(ctx, cx, cy, r * 2)
      ctx.fillStyle = s.phase === 'day' ? '#fff3a0' : '#ffb070'
      disc(ctx, cx, cy, r)
    }
  }

  // drifting clouds (more and greyer in bad weather, faster when breezy)
  const count = s.weather === 'clear' ? 3 : s.weather === 'breezy' ? 4 : 7
  const speed = s.weather === 'breezy' ? 0.03 : 0.008
  const shade = s.phase === 'night' ? '#4a5678' : s.weather === 'rain' ? '#9aa2ae' : s.weather === 'cloudy' ? '#e4e8ee' : '#ffffff'
  for (let i = 0; i < count; i++) {
    const span = w + 240 * px
    const x = ((i * 0.37 * span + now * speed * px * (1 + i * 0.2)) % span) - 120 * px
    const y = hy * (0.15 + ((i * 0.29) % 0.6))
    cloud(ctx, x, y, px * (14 + (i % 3) * 6), shade)
  }
}

/** A low line of distant hills and trees where the ground meets the sky. */
export function drawHorizon(ctx: CanvasRenderingContext2D, w: number, hy: number, s: SkyState, px: number) {
  const far = s.phase === 'night' ? '#1c2a3a' : s.phase === 'dusk' ? '#5a4a6a' : '#7aa6a0'
  const near = s.phase === 'night' ? '#14202c' : s.phase === 'dusk' ? '#40344e' : '#4e8a6a'
  ctx.fillStyle = far
  ctx.beginPath()
  ctx.moveTo(0, hy)
  for (let x = 0; x <= w; x += 8 * px) ctx.lineTo(x, hy - px * (10 + 8 * Math.sin(x / (60 * px)) + 5 * Math.sin(x / (23 * px))))
  ctx.lineTo(w, hy)
  ctx.fill()
  ctx.fillStyle = near
  for (let x = 0; x < w; x += 7 * px) {
    const hgt = px * (5 + ((x / px) * 7919) % 6)
    ctx.beginPath()
    ctx.ellipse(x, hy - hgt * 0.5, 5 * px, hgt, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Darkness, dusk warmth and rain over the finished frame. Returns lamp glow strength (0–1). */
export function drawWeatherOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, now: number, s: SkyState, px: number) {
  if (s.phase === 'night') {
    ctx.fillStyle = 'rgba(16,24,70,0.42)'
    ctx.fillRect(0, 0, w, h)
  } else if (s.phase === 'dusk') {
    ctx.fillStyle = 'rgba(255,120,60,0.12)'
    ctx.fillRect(0, 0, w, h)
  } else if (s.phase === 'dawn') {
    ctx.fillStyle = 'rgba(255,170,150,0.08)'
    ctx.fillRect(0, 0, w, h)
  }
  if (s.weather === 'rain' || s.weather === 'cloudy') {
    ctx.fillStyle = 'rgba(60,70,90,0.14)'
    ctx.fillRect(0, 0, w, h)
  }
  if (s.weather === 'rain') {
    ctx.strokeStyle = 'rgba(200,220,255,0.55)'
    ctx.lineWidth = px * 0.6
    ctx.beginPath()
    for (let i = 0; i < 90; i++) {
      const x = ((i * 137.5 * px + now * 0.05 * px) % (w + 40 * px)) - 20 * px
      const y = ((i * 71.3 * px + now * 0.9 * px) % (h + 40 * px)) - 20 * px
      ctx.moveTo(x, y)
      ctx.lineTo(x - 2 * px, y + 7 * px)
    }
    ctx.stroke()
  }
  return s.phase === 'night' ? 1 : s.phase === 'dusk' ? 0.5 : 0
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color
  for (const [dx, dy, k] of [[0, 0, 1], [r * 0.9, r * 0.15, 0.8], [-r * 0.9, r * 0.2, 0.75], [r * 0.35, -r * 0.45, 0.75]] as const) {
    ctx.beginPath()
    ctx.ellipse(x + dx, y + dy, r * k, r * k * 0.62, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function mix(a: string, b: string, k: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join('')}`
}
