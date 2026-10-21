/**
 * Battle move animations, Black/White style: pixel-art particles, projectiles, beams and stamps
 * drawn on a DS-resolution canvas (256 px wide) laid over the battle field.
 *
 * Every move has a recipe: timed layers (anticipation → travel → impact → aftermath) plus the
 * moment the hit lands (`impact`), which the battle waits for before showing damage, and the
 * attacker's body motion (`motion`). Layers marked `onHit` are swapped for a whiff when the move
 * misses. Recipes are built from a small set of painters so moves share a look per type but
 * each still has its own identity.
 */
import type { MoveId } from './data'

export type Pt = [number, number]
export type Motion = 'lunge' | 'jump' | 'dive' | 'cast' | 'none'

export interface FxEnv {
  /** attacker and target centres, in canvas px */
  from: Pt
  to: Pt
  W: number
  H: number
  /** which side is attacking (0 = you, from the lower left) */
  side: 0 | 1
  missed: boolean
  rand: () => number
}

export interface Layer {
  t0: number
  dur: number
  /** only drawn if the move connects; replaced by a whiff on a miss */
  onHit?: boolean
  draw: (ctx: CanvasRenderingContext2D, k: number, env: FxEnv) => void
}

export interface Recipe {
  /** ms from the start when the hit lands / the effect applies */
  impact: number
  motion: Motion
  layers: (env: FxEnv) => Layer[]
}

/* ---------------- pixel sprites ---------------- */

interface Spr {
  rows: string[]
  pal: Record<string, string>
}
const spr = (pal: Record<string, string>, ...rows: string[]): Spr => ({ rows, pal })

const INK = '#1c1a24'
export const S = {
  star: spr({ k: INK, w: '#ffffff', y: '#ffe060', o: '#f8a020' }, '...k...', '..kyk..', 'kkkyykk', 'kyywyyk', '.kyyyk.', 'kyk.kyk', 'kk...kk'),
  impact: spr({ k: INK, w: '#ffffff', y: '#fff080' }, '....w....', '.w..w..w.', '..wwyww..', '..wyyyw..', 'wwyyyyyww', '..wyyyw..', '..wwyww..', '.w..w..w.', '....w....'),
  spark: spr({ w: '#ffffff', y: '#fff6a0' }, '.y.', 'ywy', '.y.'),
  dust: spr({ a: '#e8e2d0', b: '#b8b0a0', k: '#6a6458' }, '.aaa.', 'aaaab', 'abbbb', '.kkk.'),
  note: spr({ k: INK, p: '#f070b0', P: '#b0407a' }, '..kk', '..kpk', '..k.k', '..k..', 'kkk..', 'kppk.', 'kPPk.', '.kk..'),
  note2: spr({ k: INK, v: '#a070f0', V: '#6040b0' }, '.kkkkk', '.kvvvk', '.k...k', '.k...k', 'kk..kk', 'vvk.vvk', 'VVk.VVk', 'kk..kk.'),
  gavel: spr({ k: INK, b: '#8a5a2a', B: '#5e3c1e', l: '#c99a5e' }, 'kkkkkkkkkk', 'kllllllllk', 'kbbbbbbbbk', 'kBBBBBBBBk', 'kkkkbbkkkk', '....kbk...', '....kbk...', '....kbk...', '....kBk...', '....kkk...'),
  bubble: spr({ k: INK, w: '#ffffff', r: '#e0383e' }, '.kkkkkkk.', 'kwwwwwwwk', 'kwwwrwwwk', 'kwwwrwwwk', 'kwwwrwwwk', 'kwwwwwwwk', 'kwwwrwwwk', 'kwwwwwwwk', '.kkkwkkk.', '...kwk...', '...kk....'),
  magnifier: spr({ k: INK, g: '#d8f0ff', G: '#90b8d8', b: '#8a5a2a' }, '.kkkk...', 'kggGGk..', 'kgggGk..', 'kgGGGk..', 'kGGGGk..', '.kkkkbk.', '.....kbk', '......kk'),
  paper: spr({ k: INK, w: '#f8f8f4', s: '#c8ccd8' }, 'kkkkkk', 'kwwwwk', 'kwsswk', 'kwwwwk', 'kwsswk', 'kwwwwk', 'kkkkkk'),
  flask: spr({ k: INK, w: '#d8f0ff', g: '#58c870', G: '#2f9048' }, '..kkk..', '..kwk..', '..kwk..', '.kwwwk.', 'kgggggk', 'kgGgggk', 'kgGGggk', '.kkkkk.'),
  bubbleG: spr({ g: '#9ff0a8', w: '#ffffff' }, '.gg.', 'gw.g', 'g..g', '.gg.'),
  crystal: spr({ k: INK, t: '#a0f0e0', T: '#40b8a0', w: '#ffffff' }, '..k..', '.ktk.', 'ktwtk', 'kttTk', 'ktTTk', '.kTk.', '..k..'),
  check: spr({ k: INK, g: '#78f088', G: '#30a040' }, '......kk', '.....kgk', 'kk..kgk.', 'kgkkgk..', '.kggk...', '..kk....'),
  bar: spr({ k: INK, y: '#ffd040', Y: '#c09010' }, 'kkk', 'kyk', 'kyk', 'kYk', 'kYk', 'kkk'),
  pencil: spr({ k: INK, y: '#f8c838', Y: '#c09010', p: '#f8a0b8', w: '#f0d8b0' }, 'kkkkkkkkkkk.', 'kpkyyyyyyywk', 'kpkYYYYYYYwk', 'kkkkkkkkkkk.'),
  card: spr({ k: INK, a: '#f08030', b: '#40b8f0', c: '#a060e0', w: '#ffffff' }, 'kkkkkkk', 'kaabbwk', 'kaabbwk', 'kccccwk', 'kwwwwwk', 'kkkkkkk'),
  arrowUp: spr({ k: INK, r: '#ff6050', R: '#c02828' }, '...k...', '..krk..', '.krrrk.', 'krrrrrk', 'kkrRrkk', '..kRk..', '..kRk..', '..kkk..'),
  arrowDown: spr({ k: INK, b: '#60a0ff', B: '#2050c0' }, '..kkk..', '..kBk..', '..kBk..', 'kkbBbkk', 'kbbbbbk', '.kbbbk.', '..kbk..', '...k...'),
  ball: spr({ k: INK, w: '#ffffff', s: '#c8ccd8' }, '.kkkkk.', 'kwwkwwk', 'kwkkkwk', 'kkwwwkk', 'kwkwkwk', 'kswwwsk', '.kkkkk.'),
  cricket: spr({ k: INK, r: '#d83030', R: '#902020', w: '#f8e0e0' }, '.kkk.', 'krwrk', 'krwRk', 'kRwRk', '.kkk.'),
  flag: spr({ k: INK, r: '#e0383e', b: '#5e3c1e', y: '#f8c838' }, 'ky.....', 'kbkkkk.', 'kbrrrrk', 'kbrrrk.', 'kbrrk..', 'kbkk...', 'kb.....', 'kb.....', 'kb.....', 'kk.....'),
  jawTop: spr({ k: INK, c: '#40e0f0', C: '#1890a8', w: '#ffffff' }, 'kkkkkkkkkkk', 'kcccccccccck', 'kCCCCCCCCCk', 'kwkwkwkwkwk', '.k.k.k.k.k.'),
  jawBot: spr({ k: INK, c: '#40e0f0', C: '#1890a8', w: '#ffffff' }, '.k.k.k.k.k.', 'kwkwkwkwkwk', 'kCCCCCCCCCk', 'kcccccccccck', 'kkkkkkkkkkk'),
  zero: spr({ c: '#40e0f0' }, 'ccc', 'c.c', 'c.c', 'c.c', 'ccc'),
  one: spr({ c: '#40e0f0' }, '.c.', 'cc.', '.c.', '.c.', 'ccc'),
  flame: spr({ k: INK, r: '#e04020', o: '#f89020', y: '#ffe060' }, '..k..', '.kok.', '.kok.', 'kooyk', 'koyyk', 'kryyk', '.krk.'),
  plus: spr({ k: INK, g: '#78f088', G: '#30a040' }, '.kkk.', 'kkgkk', 'kgggk', 'kkGkk', '.kkk.'),
  shard: spr({ k: INK, i: '#c8f0ff', I: '#78b8e8', w: '#ffffff' }, '.k.', 'kik', 'kwk', 'kik', 'kIk', 'kIk', '.k.'),
  box: spr({ k: INK, b: '#c99a5e', B: '#8a5a2a', t: '#e0383e' }, 'kkkkkkkk', 'kbbttbbk', 'kbbttbbk', 'kkkkkkkk', 'kBBttBBk', 'kBBttBBk', 'kkkkkkkk'),
  tag: spr({ k: INK, r: '#e0383e', w: '#ffffff' }, '.kkkkkk', 'kwrrrrk', 'krrrrrk', '.kkkkkk'),
  cross: spr({ k: INK, r: '#ff3040', R: '#a01020' }, 'kk.....kk', 'krk...krk', '.krk.krk.', '..krRrk..', '...kRk...', '..krRrk..', '.krk.krk.', 'krk...krk', 'kk.....kk'),
  warn: spr({ k: INK, y: '#ffd040' }, '....k....', '...kyk...', '...kkk...', '..kykyk..', '..kykyk..', '.kyyyyyk.', '.kyykyyk.', 'kkkkkkkkk'),
  ballot: spr({ k: INK, w: '#f8f8f4', b: '#2050c0' }, 'kkkkkkk', 'kwwwwwk', 'kwbwbwk', 'kwwwwwk', 'kwbbbwk', 'kkkkkkk'),
  rewind: spr({ k: INK, g: '#78f0d8', G: '#30a090' }, '..kkkk...', '.kggggk..', 'kgk..kgk.', 'kk....kgk', '......kgk', 'kk...kggk', 'kgkkkggk.', '.kggggk..', '..kkkk...'),
  confetti1: spr({ a: '#f04060' }, 'aa', 'aa'),
  confetti2: spr({ a: '#40b8f0' }, 'a', 'a'),
  confetti3: spr({ a: '#f8d040' }, 'aa'),
  leaf: spr({ k: INK, g: '#78d060', G: '#3a8030' }, '..kk', '.kgk', 'kgGk', 'kGk.', 'kk..'),
  sweat: spr({ w: '#ffffff', b: '#90c8ff' }, '.w.', 'wbw', 'bbb'),
  ember: spr({ o: '#ffb040', y: '#ffe080' }, 'yo', 'oo'),
}

const cache = new Map<Spr, HTMLCanvasElement>()
function canvasOf(s: Spr): HTMLCanvasElement {
  let c = cache.get(s)
  if (!c) {
    c = document.createElement('canvas')
    c.width = Math.max(...s.rows.map((r) => r.length))
    c.height = s.rows.length
    const ctx = c.getContext('2d')!
    s.rows.forEach((r, y) =>
      [...r].forEach((ch, x) => {
        if (ch === '.') return
        ctx.fillStyle = s.pal[ch]
        ctx.fillRect(x, y, 1, 1)
      }),
    )
    cache.set(s, c)
  }
  return c
}

/** Draw a pixel sprite centred on (x, y) at a whole-number scale; optional quarter-turn rotation. */
export function blit(ctx: CanvasRenderingContext2D, s: Spr, x: number, y: number, scale = 1, alpha = 1, quarterTurns = 0, mirror = false) {
  const c = canvasOf(s)
  const k = Math.max(1, Math.round(scale))
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(Math.round(x), Math.round(y))
  if (quarterTurns) ctx.rotate((quarterTurns % 4) * (Math.PI / 2))
  if (mirror) ctx.scale(-1, 1)
  ctx.drawImage(c, -Math.floor((c.width * k) / 2), -Math.floor((c.height * k) / 2), c.width * k, c.height * k)
  ctx.restore()
}

/* ---------------- painters ---------------- */

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const easeOut = (k: number) => 1 - (1 - k) * (1 - k)
const easeIn = (k: number) => k * k
const pxRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
  ctx.fillStyle = c
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
}

/** Where a missed shot ends up: past the target, off to the side. */
const missPoint = (env: FxEnv): Pt => [env.to[0] + (env.side === 0 ? 34 : -34), env.to[1] - 18]
const aim = (env: FxEnv): Pt => (env.missed ? missPoint(env) : env.to)

type At = 'user' | 'target'
const pos = (env: FxEnv, at: At): Pt => (at === 'user' ? env.from : aim(env))

/** A sprite flying from the attacker to the target, optionally arcing, spinning and trailing. */
function projectile(sprite: Spr, t0: number, dur: number, o: { arc?: number; spin?: boolean; trail?: Spr; scale?: number; low?: boolean; delay?: number } = {}): Layer {
  return {
    t0: t0 + (o.delay ?? 0),
    dur,
    draw(ctx, k, env) {
      const to = aim(env)
      const from: Pt = o.low ? [env.from[0], env.from[1] + 14] : env.from
      const end: Pt = o.low ? [to[0], to[1] + 14] : to
      const q = env.missed ? k * 1.25 : k
      const x = lerp(from[0], end[0], q)
      const y = lerp(from[1], end[1], q) - Math.sin(Math.min(1, q) * Math.PI) * (o.arc ?? 0)
      if (o.trail)
        for (let i = 1; i <= 4; i++) {
          const qq = Math.max(0, q - i * 0.06)
          blit(ctx, o.trail, lerp(from[0], end[0], qq), lerp(from[1], end[1], qq) - Math.sin(Math.min(1, qq) * Math.PI) * (o.arc ?? 0), 1, 1 - i * 0.2)
        }
      blit(ctx, sprite, x, y, o.scale ?? 2, 1, o.spin ? Math.floor(k * 8) : 0)
    },
  }
}

/** Particles bursting outward from a point, with optional gravity. */
function burst(sprites: Spr[], at: At, t0: number, dur: number, o: { n?: number; speed?: number; gravity?: number; scale?: number; up?: boolean; onHit?: boolean } = {}): Layer {
  const n = o.n ?? 8
  return {
    t0,
    dur,
    onHit: o.onHit ?? at === 'target',
    draw(ctx, k, env) {
      const [cx, cy] = pos(env, at)
      for (let i = 0; i < n; i++) {
        const ang = o.up ? -Math.PI / 2 + ((i / n) - 0.5) * 1.6 : (i / n) * Math.PI * 2 + i * 0.37
        const sp = (o.speed ?? 34) * (0.6 + ((i * 7919) % 10) / 25)
        const d = easeOut(k) * sp
        const x = cx + Math.cos(ang) * d
        const y = cy + Math.sin(ang) * d + (o.gravity ?? 0) * k * k
        blit(ctx, sprites[i % sprites.length], x, y, o.scale ?? 1, k > 0.7 ? (1 - k) / 0.3 : 1)
      }
    },
  }
}

/** An expanding pixel ring (sound waves, shockwaves, barriers). */
function ring(at: At, t0: number, dur: number, o: { r0?: number; r1?: number; color?: string; width?: number; squash?: number; onHit?: boolean; fade?: boolean } = {}): Layer {
  return {
    t0,
    dur,
    onHit: o.onHit ?? at === 'target',
    draw(ctx, k, env) {
      const [cx, cy] = pos(env, at)
      const r = lerp(o.r0 ?? 4, o.r1 ?? 30, easeOut(k))
      const w = o.width ?? 2
      const sq = o.squash ?? 0.55
      ctx.globalAlpha = o.fade === false ? 1 : 1 - k * 0.8
      const steps = Math.max(16, Math.round(r * 3))
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2
        pxRect(ctx, cx + Math.cos(a) * r - w / 2, cy + Math.sin(a) * r * sq - w / 2, w, w, o.color ?? '#ffffff')
      }
      ctx.globalAlpha = 1
    },
  }
}

/** A beam from the attacker to the target: straight, a sine wave, a double helix or jagged lightning. */
function beam(t0: number, dur: number, o: { colors: string[]; kind: 'straight' | 'sine' | 'helix' | 'bolt'; width?: number; amp?: number }): Layer {
  return {
    t0,
    dur,
    draw(ctx, k, env) {
      const to = aim(env)
      const len = Math.hypot(to[0] - env.from[0], to[1] - env.from[1])
      const reach = Math.min(1, k * 2.2)
      const fade = k > 0.75 ? (1 - k) / 0.25 : 1
      const nx = -(to[1] - env.from[1]) / len
      const ny = (to[0] - env.from[0]) / len
      const w = o.width ?? 2
      const amp = o.amp ?? 5
      ctx.globalAlpha = fade
      const steps = Math.round(len * reach)
      o.colors.forEach((col, strand) => {
        let seed = strand * 101 + Math.floor(k * 10) * 7
        for (let i = 0; i < steps; i++) {
          const q = i / len
          let off = 0
          if (o.kind === 'sine') off = Math.sin(q * 24 - k * 30 + strand * 2) * amp
          if (o.kind === 'helix') off = Math.sin(q * 18 - k * 20 + strand * Math.PI) * amp
          if (o.kind === 'bolt') {
            if (i % 6 === 0) seed = (seed * 9301 + 49297) % 233280
            off = ((seed / 233280) * 2 - 1) * amp
          }
          const x = lerp(env.from[0], to[0], q) + nx * off
          const y = lerp(env.from[1], to[1], q) + ny * off
          pxRect(ctx, x, y, w, w, col)
        }
      })
      ctx.globalAlpha = 1
    },
  }
}

/** A sprite that pops onto a point with a squash-and-settle, holds, then fades. */
function stamp(sprite: Spr, at: At, t0: number, dur: number, o: { scale?: number; dy?: number; dx?: number; drop?: number; onHit?: boolean } = {}): Layer {
  return {
    t0,
    dur,
    onHit: o.onHit ?? at === 'target',
    draw(ctx, k, env) {
      const [x, y] = pos(env, at)
      const base = o.scale ?? 2
      const pop = k < 0.2 ? base + (1 - k / 0.2) * base : base
      const fall = o.drop ? (1 - Math.min(1, k / 0.35)) * o.drop : 0
      blit(ctx, sprite, x + (o.dx ?? 0), y + (o.dy ?? 0) - fall, o.drop ? base : pop, k > 0.8 ? (1 - k) / 0.2 : 1)
    },
  }
}

/** Sprites falling from above onto a point. */
function rain(sprites: Spr[], at: At, t0: number, dur: number, o: { n?: number; spread?: number; scale?: number; height?: number } = {}): Layer {
  const n = o.n ?? 6
  return {
    t0,
    dur,
    onHit: at === 'target',
    draw(ctx, k, env) {
      const [cx, cy] = pos(env, at)
      for (let i = 0; i < n; i++) {
        const delay = (i / n) * 0.45
        const q = Math.max(0, Math.min(1, (k - delay) / 0.5))
        if (q <= 0) continue
        const x = cx + (((i * 37) % 11) / 10 - 0.5) * (o.spread ?? 30)
        const y = lerp(cy - (o.height ?? 70), cy + ((i * 13) % 7) - 3, easeIn(q))
        blit(ctx, sprites[i % sprites.length], x, y, o.scale ?? 2, q >= 1 ? Math.max(0, 1 - (k - delay - 0.5) * 3) : 1)
      }
    },
  }
}

/** Sprites rising around a point (stat boosts, music, embers). */
function rise(sprites: Spr[], at: At, t0: number, dur: number, o: { n?: number; spread?: number; scale?: number; down?: boolean } = {}): Layer {
  const n = o.n ?? 6
  return {
    t0,
    dur,
    draw(ctx, k, env) {
      const [cx, cy] = pos(env, at)
      for (let i = 0; i < n; i++) {
        const delay = (i / n) * 0.4
        const q = Math.max(0, Math.min(1, (k - delay) / 0.6))
        if (q <= 0) continue
        const x = cx + (((i * 53) % 13) / 12 - 0.5) * (o.spread ?? 54) + Math.sin(q * 6 + i) * 2
        const y = cy + (o.down ? -24 + q * 40 : 18 - q * 40)
        blit(ctx, sprites[i % sprites.length], x, y, o.scale ?? 2, q > 0.75 ? (1 - q) / 0.25 : 1)
      }
    },
  }
}

/** Sprites circling a point (cards, checks, rewind arrows), optionally closing in. */
function orbit(sprites: Spr[], at: At, t0: number, dur: number, o: { n?: number; r?: number; turns?: number; close?: boolean; scale?: number; reverse?: boolean } = {}): Layer {
  const n = o.n ?? 5
  return {
    t0,
    dur,
    onHit: at === 'target',
    draw(ctx, k, env) {
      const [cx, cy] = pos(env, at)
      const r = (o.r ?? 26) * (o.close ? 1 - easeIn(k) * 0.9 : 1)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (o.reverse ? -1 : 1) * k * Math.PI * 2 * (o.turns ?? 1)
        blit(ctx, sprites[i % sprites.length], cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.5, o.scale ?? 2, k > 0.85 ? (1 - k) / 0.15 : 1)
      }
    },
  }
}

/** A brief full-screen flash or dim (kept low so it never strobes). */
function flash(t0: number, dur: number, color: string, alpha = 0.35): Layer {
  return {
    t0,
    dur,
    draw(ctx, k, env) {
      ctx.globalAlpha = alpha * (1 - k)
      ctx.fillStyle = color
      ctx.fillRect(0, 0, env.W, env.H)
      ctx.globalAlpha = 1
    },
  }
}

/** Speed lines streaking past a point. */
function speedLines(at: At, t0: number, dur: number, color = '#ffffff'): Layer {
  return {
    t0,
    dur,
    draw(ctx, k, env) {
      const [cx, cy] = pos(env, at)
      for (let i = 0; i < 9; i++) {
        const y = cy - 22 + ((i * 17) % 44)
        const x = cx + 40 - ((k * 140 + i * 23) % 90)
        pxRect(ctx, x, y, 12 + (i % 3) * 4, 1, color)
      }
    },
  }
}

/** A grid barrier in front of a point: hexes (firewall) or a net. */
function barrier(at: At, t0: number, dur: number, kind: 'hex' | 'net', color: string): Layer {
  return {
    t0,
    dur,
    draw(ctx, k, env) {
      const [cx, cy] = pos(env, at)
      const reveal = Math.min(1, k * 3)
      const flicker = k > 0.7 && Math.floor(k * 40) % 2 === 0 ? 0.4 : 0.85
      ctx.globalAlpha = flicker * (k > 0.85 ? (1 - k) / 0.15 : 1)
      const cols = 6
      const rows = 5
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          if ((i + j * cols) / (cols * rows) > reveal) continue
          const x = cx - 24 + i * 9 + (kind === 'hex' && j % 2 ? 4 : 0)
          const y = cy - 22 + j * 9
          if (kind === 'hex') {
            pxRect(ctx, x + 2, y, 4, 1, color)
            pxRect(ctx, x, y + 2, 1, 4, color)
            pxRect(ctx, x + 7, y + 2, 1, 4, color)
            pxRect(ctx, x + 2, y + 7, 4, 1, color)
          } else {
            pxRect(ctx, x, y, 9, 1, color)
            pxRect(ctx, x, y, 1, 9, color)
          }
        }
      ctx.globalAlpha = 1
    },
  }
}

/** A scan line sweeping down over a point. */
function scan(at: At, t0: number, dur: number, color: string): Layer {
  return {
    t0,
    dur,
    onHit: true,
    draw(ctx, k, env) {
      const [cx, cy] = pos(env, at)
      const y = cy - 26 + k * 52
      ctx.globalAlpha = 0.85
      pxRect(ctx, cx - 26, y, 52, 2, color)
      ctx.globalAlpha = 0.3
      pxRect(ctx, cx - 26, y - 6, 52, 6, color)
      ctx.globalAlpha = 1
    },
  }
}

/** Jaws snapping shut on a point. */
function chomp(t0: number, dur: number): Layer {
  return {
    t0,
    dur,
    onHit: true,
    draw(ctx, k, env) {
      const [cx, cy] = env.to
      const open = k < 0.5 ? 10 - k * 18 : k < 0.7 ? 1 : (k - 0.7) * 30
      blit(ctx, S.jawTop, cx, cy - open - 4, 2, k > 0.85 ? (1 - k) / 0.15 : 1)
      blit(ctx, S.jawBot, cx, cy + open + 4, 2, k > 0.85 ? (1 - k) / 0.15 : 1)
    },
  }
}

/** A dotted path leading round the target, a little flag at its head. */
function tourPath(t0: number, dur: number): Layer {
  return {
    t0,
    dur,
    draw(ctx, k, env) {
      const [cx, cy] = aim(env)
      const pts = 40
      const head = Math.floor(k * pts)
      for (let i = 0; i < head; i += 2) {
        const a = (i / pts) * Math.PI * 2.2 - Math.PI
        pxRect(ctx, cx + Math.cos(a) * 30, cy + 8 + Math.sin(a) * 12, 2, 2, '#f8d040')
      }
      const a = (head / pts) * Math.PI * 2.2 - Math.PI
      blit(ctx, S.flag, cx + Math.cos(a) * 30, cy + Math.sin(a) * 12, 1)
    },
  }
}

/** The impact itself: a white star, a ring and a puff of dust — the shared "it connected". */
function hit(t: number, big = false): Layer[] {
  return [stamp(S.impact, 'target', t, big ? 320 : 240, { scale: big ? 3 : 2 }), ring('target', t, 300, { r0: 6, r1: big ? 36 : 24, color: '#ffffff', width: 2 }), burst([S.dust], 'target', t + 40, 360, { n: 5, speed: 22, gravity: 10 })]
}

/* ---------------- recipes ---------------- */

const R = (impact: number, motion: Motion, layers: (env: FxEnv) => Layer[]): Recipe => ({ impact, motion, layers })

export const RECIPES: Record<MoveId, Recipe> = {
  // LAW: gavels, paper, red ink
  objection: R(560, 'cast', () => [stamp(S.bubble, 'user', 0, 520, { scale: 2, dy: -30, onHit: false }), ring('user', 160, 300, { r0: 8, r1: 28, color: '#ffe060', onHit: false }), projectile(S.bubble, 260, 300, { scale: 1 }), ring('target', 560, 260, { r0: 6, r1: 34, color: '#ffe060', width: 3 }), ...hit(560, true), flash(560, 160, '#ffffff', 0.3)]),
  crossExamine: R(620, 'cast', () => [{ t0: 0, dur: 620, draw: (ctx, k, env) => { const [cx, cy] = aim(env); blit(ctx, S.magnifier, cx - 22 + Math.sin(k * Math.PI * 3) * 22, cy - 6 + k * 12, 2) } }, burst([S.spark], 'target', 560, 300, { n: 6, speed: 20 }), ...hit(620)]),
  finalSubmission: R(460, 'cast', () => [stamp(S.gavel, 'target', 0, 700, { scale: 3, drop: 80, dy: -14 }), ...hit(460, true), burst([S.paper], 'target', 470, 520, { n: 6, speed: 34, gravity: 30 }), flash(460, 140, '#ffffff', 0.25)]),
  criticalAnalysis: R(560, 'cast', () => [stamp(S.spark, 'user', 0, 320, { scale: 3, dy: -12, onHit: false }), rise([S.bar, S.bar, S.arrowUp], 'user', 120, 720, { n: 6 })]),
  resolution: R(640, 'cast', () => [0, 90, 180, 270].map((d) => projectile(S.ballot, 0, 420, { delay: d, arc: 14 })).concat([burst([S.ballot, S.paper], 'target', 640, 480, { n: 8, speed: 30, gravity: 20 }), ...hit(640)])),
  veto: R(360, 'cast', () => [stamp(S.cross, 'target', 0, 760, { scale: 3 }), ring('target', 360, 260, { r0: 10, r1: 34, color: '#ff3040', width: 3 }), flash(360, 120, '#ff3040', 0.18)]),

  // SCIENCE: flasks, bubbles, helices, crystals
  labExperiment: R(560, 'cast', () => [projectile(S.flask, 0, 560, { arc: 40, spin: true }), burst([S.bubbleG], 'target', 560, 620, { n: 10, speed: 30, up: true }), ring('target', 560, 300, { r0: 6, r1: 28, color: '#78f088', width: 2 }), stamp(S.impact, 'target', 560, 220, { scale: 2 })]),
  splice: R(520, 'cast', () => [beam(0, 760, { colors: ['#f070a0', '#3fb8a0'], kind: 'helix', width: 2, amp: 6 }), ...hit(520), burst([S.spark], 'target', 540, 400, { n: 8 })]),
  catalyst: R(480, 'cast', () => [beam(0, 520, { colors: ['#40b8a0', '#ffffff'], kind: 'bolt', width: 2, amp: 6 }), burst([S.crystal], 'target', 480, 520, { n: 7, speed: 30, gravity: 18 }), ...hit(480)]),
  peerReview: R(500, 'cast', () => [orbit([S.check], 'user', 0, 900, { n: 4, r: 24, turns: 1 }), ring('user', 300, 500, { r0: 26, r1: 30, color: '#78f088', width: 2, fade: false, onHit: false })]),

  // TECH: data, circuits, jaws, barriers
  byte: R(400, 'lunge', () => [chomp(80, 520), burst([S.zero, S.one], 'target', 400, 520, { n: 10, speed: 34 }), stamp(S.impact, 'target', 400, 200, { scale: 2 })]),
  overclock: R(620, 'cast', () => [rise([S.flame, S.ember], 'user', 0, 600, { n: 8, spread: 30 }), beam(380, 420, { colors: ['#ffffff', '#40e0f0'], kind: 'bolt', width: 2, amp: 7 }), ...hit(620, true), flash(620, 160, '#40e0f0', 0.3), burst([S.spark, S.ember], 'user', 760, 380, { n: 6, speed: 18, onHit: false })]),
  firewall: R(450, 'cast', () => [barrier('user', 0, 1000, 'hex', '#40e0f0')]),
  ctrlZ: R(500, 'cast', () => [orbit([S.rewind], 'user', 0, 800, { n: 3, r: 24, turns: 1.2, reverse: true, scale: 1 }), rise([S.plus], 'user', 300, 700, { n: 6 })]),
  riskAudit: R(560, 'cast', () => [scan('target', 0, 560, '#40e0f0'), stamp(S.warn, 'target', 520, 520, { scale: 2, dy: -26 }), ...hit(560)]),

  // MUSIC: notes, sound rings, waves
  bassDrop: R(720, 'cast', () => [flash(0, 600, '#100818', 0.4), ring('target', 360, 420, { r0: 50, r1: 8, color: '#a070f0', width: 3 }), ring('target', 720, 360, { r0: 6, r1: 44, color: '#f070b0', width: 4 }), ring('target', 800, 360, { r0: 6, r1: 34, color: '#a070f0', width: 3 }), burst([S.note, S.note2], 'target', 720, 560, { n: 8, speed: 40 }), stamp(S.impact, 'target', 720, 240, { scale: 3 })]),
  feedbackLoop: R(560, 'cast', () => [beam(0, 700, { colors: ['#f070b0', '#a070f0'], kind: 'sine', width: 2, amp: 6 }), ring('target', 560, 300, { r0: 6, r1: 26, color: '#f070b0' }), stamp(S.impact, 'target', 560, 220, { scale: 2 })]),
  powerChord: R(500, 'cast', () => [beam(0, 520, { colors: ['#ffffff', '#f070b0'], kind: 'bolt', width: 2, amp: 6 }), beam(120, 480, { colors: ['#a070f0'], kind: 'bolt', width: 1, amp: 9 }), burst([S.note, S.note2], 'target', 500, 520, { n: 8, speed: 34 }), ...hit(500)]),
  hypeTrack: R(500, 'cast', () => [rise([S.note, S.note2, S.note], 'user', 0, 900, { n: 9, spread: 44 }), speedLines('user', 300, 500, '#f070b0')]),

  // CREATIVE: stars, sketches, cards, colour
  creativeSpark: R(520, 'cast', () => [projectile(S.star, 0, 520, { trail: S.spark, scale: 2, spin: true }), burst([S.star, S.spark], 'target', 520, 520, { n: 10, speed: 36 }), stamp(S.impact, 'target', 520, 220, { scale: 2 })]),
  quickSketch: R(300, 'lunge', () => [{ t0: 60, dur: 420, onHit: true, draw: (ctx, k, env) => { const [cx, cy] = env.to; for (let s = 0; s < 3; s++) { const q = Math.min(1, Math.max(0, k * 3 - s)); if (q <= 0) continue; for (let i = 0; i < q * 40; i++) pxRect(ctx, cx - 20 + i, cy - 14 + s * 12 + Math.sin(i / 3) * 3, 2, 2, ['#f8c838', '#f08030', '#a060e0'][s]) } blit(ctx, S.pencil, cx - 20 + Math.min(1, k * 3) * 40, cy - 14, 1) } }, stamp(S.impact, 'target', 300, 200, { scale: 2 })]),
  moodBoard: R(700, 'cast', () => [orbit([S.card], 'target', 0, 720, { n: 6, r: 32, turns: 1, close: true }), burst([S.spark], 'target', 680, 320, { n: 6 })]),
  rebrand: R(600, 'cast', () => [orbit([S.confetti1, S.confetti2, S.confetti3, S.spark], 'user', 0, 900, { n: 12, r: 26, turns: 1.5, close: true })]),
  hypeCampaign: R(560, 'cast', () => [0, 140, 280].map((d) => ring('user', d, 520, { r0: 6, r1: 60, color: '#f8d040', width: 2, squash: 0.4, onHit: false })).concat([projectile(S.star, 120, 440, { trail: S.confetti3 }), burst([S.confetti1, S.confetti2, S.confetti3], 'target', 560, 700, { n: 14, speed: 40, gravity: 26 }), ...hit(560)])),
  soldOut: R(520, 'cast', () => [rain([S.tag], 'target', 0, 600, { n: 7 }), ring('target', 520, 320, { r0: 8, r1: 30, color: '#e0383e', width: 3 }), stamp(S.impact, 'target', 520, 220, { scale: 3 })]),
  merchDrop: R(480, 'cast', () => [rain([S.box], 'target', 0, 640, { n: 4, spread: 26, scale: 2, height: 90 }), ...hit(480), burst([S.dust], 'target', 500, 400, { n: 6, speed: 28 })]),

  // SPORT: balls, speed, nets
  bicycleKick: R(520, 'jump', () => [projectile(S.ball, 260, 260, { arc: 30, spin: true, scale: 2 }), ...hit(520, true)]),
  hitForSix: R(380, 'cast', () => [projectile(S.cricket, 0, 380, { trail: S.cricket, scale: 2 }), ...hit(380, true), flash(380, 160, '#ffffff', 0.3)]),
  sprint: R(400, 'cast', () => [speedLines('user', 0, 800), burst([S.dust], 'user', 0, 400, { n: 4, speed: 18, onHit: false })]),
  yorker: R(440, 'cast', () => [projectile(S.cricket, 0, 440, { low: true, trail: S.dust, scale: 2 }), stamp(S.impact, 'target', 440, 220, { scale: 2, dy: 12 }), burst([S.dust], 'target', 450, 380, { n: 6, speed: 20 })]),
  netSession: R(500, 'cast', () => [barrier('user', 0, 900, 'net', '#f8f8f4'), { t0: 100, dur: 700, draw: (ctx, k, env) => blit(ctx, S.cricket, env.from[0] - 10 + k * 20, env.from[1] - 20 + Math.abs(Math.sin(k * Math.PI * 3)) * -16 + 16, 2) }]),

  // LEADER: flags, gold, speeches, warmth
  leadByExample: R(560, 'cast', () => [stamp(S.flag, 'user', 0, 600, { scale: 2, dx: -16, dy: -10, onHit: false }), projectile(S.star, 220, 340, { trail: S.spark, scale: 2 }), burst([S.star, S.spark], 'target', 560, 480, { n: 8, speed: 32 }), ...hit(560)]),
  pepTalk: R(500, 'cast', () => [stamp(S.bubble, 'user', 0, 520, { scale: 2, dy: -30, onHit: false }), rise([S.arrowUp], 'user', 200, 700, { n: 5 })]),
  guidedTour: R(640, 'cast', () => [tourPath(0, 640), ...hit(640)]),
  icebreaker: R(460, 'cast', () => [0, 80, 160].map((d) => projectile(S.shard, 0, 340, { delay: d, scale: 2 })).concat([burst([S.shard, S.spark], 'target', 460, 480, { n: 10, speed: 34, gravity: 20 }), ...hit(460)])),
  campfireStory: R(600, 'cast', () => [rise([S.flame], 'user', 0, 900, { n: 5, spread: 20, scale: 2 }), rise([S.ember, S.plus], 'user', 200, 800, { n: 8, spread: 36 })]),

  // NORMAL: body blows
  tackle: R(200, 'lunge', () => hit(200)),
  bunnyHop: R(420, 'jump', () => [...hit(420, true), ring('target', 420, 320, { r0: 10, r1: 34, color: '#e8e2d0', width: 2, squash: 0.3 })]),
  diveBomb: R(560, 'dive', () => [speedLines('target', 300, 260, '#ffffff'), ...hit(560, true), ring('target', 560, 340, { r0: 10, r1: 40, color: '#e8e2d0', width: 3, squash: 0.3 })]),
  struggle: R(200, 'lunge', () => [stamp(S.impact, 'target', 200, 200, { scale: 1 }), stamp(S.sweat, 'user', 0, 400, { scale: 2, dy: -24, onHit: false })]),
}

/** The layers to play: on a miss, everything that only happens on contact becomes a whiff. */
export function buildLayers(r: Recipe, env: FxEnv): Layer[] {
  const layers = r.layers(env).filter((l) => !(env.missed && l.onHit))
  if (env.missed) layers.push(whiff(r.impact))
  return layers
}

/**
 * Gen V pacing. Measured frame by frame from Pokémon White 2 footage (docs/GEN5-TIMING.md):
 * contact moves land about 0.65–0.9 s into the animation and finish by 1.3–1.7 s; a thrown
 * projectile lands about 1 s in and finishes by about 2 s; status moves run 2–3 s. The recipes
 * here were authored at roughly half that speed, so playback stretches each one by its kind.
 * These are approximations of the measured ranges, not frame-exact original values.
 */
export function tempoFor(r: Recipe, power: number): number {
  if (power === 0) return 2.2
  return r.motion === 'lunge' ? 2.4 : r.motion === 'jump' ? 2 : r.motion === 'dive' ? 1.6 : 1.8
}

/** The total length of a recipe's animation. */
export function recipeLength(r: Recipe, env: FxEnv): number {
  return Math.max(r.impact, ...r.layers(env).map((l) => l.t0 + l.dur))
}

/** What a miss looks like at the spot the move was aimed: a puff of air. */
export function whiff(t: number): Layer {
  return {
    t0: t,
    dur: 360,
    draw(ctx, k, env) {
      const [x, y] = missPoint(env)
      blit(ctx, S.dust, x, y, 2, 1 - k)
      blit(ctx, S.dust, x + 8 * k, y - 6 * k, 1, 1 - k)
    },
  }
}

/** Seeded random, so an effect looks the same each time it's replayed. */
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
