/**
 * Flying creatures, seen side-on (facing left; mirror for right), Black/White style.
 *
 * Each flyer is drawn in three layers per frame — far wing, body (with any held item) and near
 * wing — so a rider can sit between the body and the near wing and the two move as one: the near
 * wing sweeps over the rider's legs on the downstroke. The body bobs against the wingbeat.
 *
 *   flap    birds: a four-frame feathered wingbeat (up, mid-down, down, mid-up)
 *   flutter moths: broad fore- and hindwings swinging about the shoulder
 *   buzz    small insects: fast translucent wings, plus a pulsing glow
 *
 * Builders draw on a 56×40 base grid, rasterised at 2× (112×80 art pixels).
 */
import { HiGrid } from './raster.ts'
import type { Palette, Pixels } from './pixels.ts'
import { drawItem, HOLDS, ITEM_PALETTE, itemDetails, type Hold } from './held.ts'
import { formShade, OUTLINE_KEY, selectiveOutline } from './bwstyle.ts'
import { creatureArtHi } from './creatures.ts'

export const FLIGHT_BASE_W = 56
export const FLIGHT_BASE_H = 40
const K2 = 2
export const FLIGHT_W = FLIGHT_BASE_W * K2
export const FLIGHT_H = FLIGHT_BASE_H * K2
const OL = OUTLINE_KEY

export type FlyerId = 'megaphawk' | 'hootour' | 'riffin' | 'campfly' | 'diplomoth'
export type FlightStyle = 'flap' | 'flutter' | 'buzz'

export interface FlightFrame {
  far: Pixels
  body: Pixels
  near: Pixels
}

export interface FlightSprite {
  palette: Palette
  frames: FlightFrame[]
  style: FlightStyle
  /** ms per frame */
  frameMs: number
  /** World pixels per art pixel, so mounts are big enough to carry a trainer. */
  world: number
  /**
   * Where a rider sits, per frame, in art pixels (the rider's hips go here), or null if this
   * creature is too small to ride. Moves with the body bob.
   */
  saddle: Array<[number, number]> | null
}

const grid = () => new HiGrid(FLIGHT_BASE_W, FLIGHT_BASE_H, K2)
type Pt = [number, number]

/** Body bob per frame (base px): rises on the downstroke. */
const BOB = [1, 0, -1, 0]

/* ---------------- wings ---------------- */

/** Tip of a bird's wing per frame, as fractions of its length: [back, down]. */
const BIRD_TIP: Pt[] = [
  [0.32, -1], // fully raised
  [0.78, -0.28], // sweeping down, spread toward you
  [0.3, 0.72], // fully down
  [0.55, -0.62], // coming back up, half folded
]

/** A feathered wing: leading edge from the shoulder to the tip, notched primaries on the trailing edge. */
function birdWing(g: HiGrid, root: Pt, frame: number, len: number, chord: number, col: string, shade: string, light: string) {
  const fold = frame === 3 ? 0.86 : 1
  const [fx, fy] = BIRD_TIP[frame]
  const r1: Pt = [root[0], root[1]]
  const r2: Pt = [root[0] + chord, root[1] + 0.6]
  const tip: Pt = [root[0] + fx * len * fold, root[1] + fy * len * fold]
  // trailing edge from the tip back to the rear of the shoulder, with feather points
  const d: Pt = [r2[0] - tip[0], r2[1] - tip[1]]
  const dl = Math.hypot(d[0], d[1]) || 1
  let n: Pt = [-d[1] / dl, d[0] / dl]
  // make the notches point away from the leading edge
  const mid: Pt = [(tip[0] + r1[0]) / 2, (tip[1] + r1[1]) / 2]
  if ((tip[0] + d[0] / 2 + n[0] - mid[0]) * n[0] + (tip[1] + d[1] / 2 + n[1] - mid[1]) * n[1] < 0) n = [-n[0], -n[1]]
  const pts: Pt[] = [r1, tip]
  for (let i = 1; i <= 4; i++) {
    const t = i / 5
    pts.push([tip[0] + d[0] * (t - 0.1) + n[0] * 1.8, tip[1] + d[1] * (t - 0.1) + n[1] * 1.8])
    pts.push([tip[0] + d[0] * t, tip[1] + d[1] * t])
  }
  pts.push(r2)
  g.poly(pts, col)
  // coverts: a lighter band along the leading edge near the shoulder
  const cov: Pt[] = [r1, [r1[0] + (tip[0] - r1[0]) * 0.45, r1[1] + (tip[1] - r1[1]) * 0.45], [r2[0] + (tip[0] - r2[0]) * 0.3, r2[1] + (tip[1] - r2[1]) * 0.3], r2]
  g.poly(cov, light)
  // primary feather lines
  for (let i = 1; i <= 3; i++) {
    const t = i / 4
    const a: Pt = [tip[0] + d[0] * t, tip[1] + d[1] * t]
    const b: Pt = [a[0] + (r1[0] - a[0]) * 0.35, a[1] + (r1[1] - a[1]) * 0.35]
    g.line(a[0], a[1], b[0], b[1], shade)
  }
}

/** Filled ellipse rotated by `ang` (radians), sampled at the fine resolution. */
function rotEllipse(g: HiGrid, cx: number, cy: number, rx: number, ry: number, ang: number, ch: string, shade?: string) {
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  const R = Math.max(rx, ry) + 1
  g.sample(cx - R, cy - R, cx + R, cy + R, (x, y) => {
    const dx = x - cx
    const dy = y - cy
    const u = (dx * c + dy * s) / rx
    const v = (-dx * s + dy * c) / ry
    if (u * u + v * v > 1) return null
    return shade && v > 0.3 ? shade : ch
  })
}

/** A wing that swings about the shoulder: the ellipse sits out along the angle from the root. */
function swingWing(g: HiGrid, root: Pt, ang: number, rx: number, ry: number, col: string, shade?: string, spot?: [string, number]) {
  const cx = root[0] + Math.cos(ang) * rx * 0.92
  const cy = root[1] + Math.sin(ang) * rx * 0.92
  rotEllipse(g, cx, cy, rx, ry, ang, col, shade)
  if (spot) {
    const [ch, r] = spot
    rotEllipse(g, root[0] + Math.cos(ang) * rx * 1.15, root[1] + Math.sin(ang) * rx * 1.15, r, r, 0, ch)
  }
}

function held(g: HiGrid, id: FlyerId, bob: number, wave: number) {
  const h = HOLDS[id]
  if (!h?.flight) return null
  const at: Hold = { ...h.flight, y: h.flight.y + bob, wave }
  drawItem(g, h.item, at)
  return () => itemDetails(g, h.item, at)
}

/* ---------------- species ---------------- */

function megaphawk(f: number) {
  const b = BOB[f]
  const far = grid()
  birdWing(far, [34, 15 + b], f, 18, 9, 'd', 'E', 'd')
  far.outline(OL)

  const body = grid()
  body.poly([[40, 18 + b], [52, 14 + b], [54, 19 + b], [52, 25 + b], [40, 23 + b]], 'd')
  body.ellipse(31, 20 + b, 11, 6.5, 'D', 'd')
  body.ellipse(31, 23 + b, 8, 3.2, 'C', 'c')
  body.ellipse(35, 27 + b, 2.4, 1.2, 'Y')
  body.ellipse(20, 16 + b, 6.5, 6, 'D', 'd')
  body.poly([[22, 11 + b], [29, 6 + b], [26, 12 + b]], 'd').poly([[19, 10 + b], [23, 4 + b], [24, 11 + b]], 'D')
  body.poly([[15, 14 + b], [4, 9 + b], [4, 23 + b], [15, 18 + b]], 'W')
  body.poly([[15, 16 + b], [4, 16 + b], [4, 23 + b], [15, 18 + b]], 'w')
  body.rect(14, 14 + b, 16, 18 + b, 'R')
  body.outline(OL)
  body.rect(4, 10 + b, 5, 22 + b, 'R')
  body.ellipse(19, 15 + b, 2.2, 2.2, 'W').set(18, 15 + b, 'K').set(18, 16 + b, 'K')
  body.line(16, 12 + b, 22, 13 + b, 'K')
  body.line(44, 19 + b, 52, 17 + b, 'D').line(44, 21 + b, 52, 21 + b, 'D')

  const near = grid()
  birdWing(near, [30, 16 + b], f, 20, 10, 'D', 'd', 'C')
  near.outline(OL)
  return { far, body, near, saddle: [26, 13.5 + b] as Pt }
}

function hootour(f: number) {
  const b = BOB[f]
  const wave = f / 4
  const far = grid()
  birdWing(far, [30, 16 + b], f, 15, 10, 'h', 'E', 'h')
  far.outline(OL)

  const body = grid()
  // the flag, gripped in its talons, streams out behind
  const ink = held(body, 'hootour', b, wave)
  body.poly([[37, 19 + b], [46, 18 + b], [46, 24 + b], [37, 25 + b]], 'h')
  body.ellipse(30, 21 + b, 9.5, 8, 'H', 'h')
  body.ellipse(29, 24 + b, 6.5, 4.5, 'C', 'c')
  body.poly([[22, 10 + b], [25, 3 + b], [27, 11 + b]], 'H').poly([[18, 10 + b], [19, 4 + b], [22, 10 + b]], 'h')
  body.ellipse(20, 16 + b, 7, 6.5, 'H', 'h')
  body.ellipse(17, 17 + b, 4.2, 4.5, 'C', 'c')
  body.poly([[12, 17 + b], [15, 16 + b], [15, 20 + b]], 'O')
  // scarf, its tail flapping
  const w = Math.sin(wave * Math.PI * 2) * 1.5
  body.rect(20, 21 + b, 27, 23 + b, 'Y')
  body.poly([[26, 22 + b], [37, 20 + b + w], [39, 24 + b + w], [27, 24 + b]], 'Y')
  body.ellipse(27, 29 + b, 2, 1.5, 'O')
  body.outline(OL)
  ink?.()
  body.ellipse(16, 16 + b, 1.8, 1.8, 'W').set(15, 16 + b, 'K').set(15, 17 + b, 'K')
  body.line(28, 24 + b, 38, 22 + b + w, 'y')

  const near = grid()
  birdWing(near, [26, 17 + b], f, 17, 11, 'H', 'h', 'C')
  near.outline(OL)
  return { far, body, near, saddle: [27, 13.5 + b] as Pt }
}

function riffin(f: number) {
  const b = BOB[f]
  const far = grid()
  birdWing(far, [31, 16 + b], f, 10, 6, 'd', 'E', 'd')
  far.outline(OL)

  const body = grid()
  body.poly([[39, 18 + b], [45, 19 + b], [39, 22 + b]], 'd')
  body.poly([[36, 24 + b], [43, 27 + b], [37, 27 + b]], 'O')
  body.ellipse(30, 20 + b, 10, 6, 'D', 'd')
  body.ellipse(30, 23 + b, 8, 3, 'W', 'w')
  body.ellipse(19, 16 + b, 5.5, 5, 'D', 'd')
  body.ellipse(18, 17 + b, 3.6, 3, 'W', 'w')
  body.poly([[14, 15 + b], [7, 18 + b], [14, 21 + b]], 'O')
  // the guitar slung across its back on a strap
  body.line(22, 14 + b, 34, 25 + b, 'G')
  const ink = held(body, 'riffin', b, 0)
  body.outline(OL)
  ink?.()
  body.line(13, 15 + b, 13, 21 + b, 'Y')
  body.stamp(17, 15 + b, ['KR', 'KK'])

  const near = grid()
  birdWing(near, [27, 17 + b], f, 11, 7, 'D', 'd', 'D')
  near.outline(OL)
  return { far, body, near, saddle: null }
}

function campfly(f: number) {
  const b = [0, -0.5, 0, 0.5][f]
  const ang = [-1.3, -0.5, 0.2, -0.5][f]
  const pulse = [0, 0.6, 1.2, 0.6][f]
  const far = grid()
  swingWing(far, [22, 16 + b], ang + 0.3, 7, 3, 'v')
  far.outline(OL)

  const body = grid()
  body.ellipse(32, 23 + b, 10 + pulse, 8 + pulse, 'g')
  body.ellipse(32, 23 + b, 7, 5, 'Y', 'y', 'W')
  body.ellipse(23, 20 + b, 4.6, 4, 'B', 'b')
  body.ellipse(16, 18 + b, 5, 4.6, 'B', 'b')
  body.line(14, 14 + b, 10, 8 + b, 'B').line(17, 14 + b, 18, 7 + b, 'B')
  body.ellipse(10, 8 + b, 1.3, 1.3, 'Y').ellipse(18, 7 + b, 1.3, 1.3, 'Y')
  body.line(21, 23 + b, 20, 28 + b, 'B').line(25, 23 + b, 26, 28 + b, 'B')
  // the pennant, held out front in a foreleg
  const ink = held(body, 'campfly', b, f / 4)
  body.line(18, 22 + b, 15, 27 + b, 'B')
  body.outline(OL)
  ink?.()
  body.ellipse(14, 17 + b, 1.8, 2, 'W').set(13, 17 + b, 'K')

  const near = grid()
  swingWing(near, [22, 16 + b], ang, 7.5, 3.2, 'V', 'v')
  near.outline(OL)
  return { far, body, near, saddle: null }
}

function diplomoth(f: number) {
  const b = BOB[f] * 0.7
  const ang = [-1.35, -0.7, 0.45, -0.3][f]
  const far = grid()
  swingWing(far, [27, 17 + b], ang + 0.2, 10, 5, 'm', 'E')
  swingWing(far, [29, 19 + b], ang + 0.65, 6.5, 4, 'm')
  // the placard hangs below, its pole tucked up behind the body
  const ink = held(far, 'diplomoth', b, 0)
  far.outline(OL)
  ink?.()

  const body = grid()
  body.ellipse(31, 21 + b, 9, 3.8, 'G', 'g')
  body.ellipse(22, 19 + b, 4.6, 4.2, 'G', 'g')
  body.ellipse(20, 17 + b, 4, 3, 'W', 'w')
  body.ellipse(15, 18 + b, 4, 3.6, 'G', 'g')
  body.line(14, 15 + b, 9, 7 + b, 'G').line(16, 15 + b, 17, 6 + b, 'G')
  // legs gripping the top of the placard
  body.line(21, 22 + b, 21, 26 + b, 'G').line(24, 22 + b, 25, 26 + b, 'G')
  body.outline(OL)
  body.set(13, 17 + b, 'W').set(14, 17 + b, 'K')
  for (const [x, y] of [[10, 9], [12, 10], [16, 8], [18, 9]]) body.set(x, y + b, 'G')

  const near = grid()
  swingWing(near, [26, 17 + b], ang, 11, 5.2, 'M', 'm', ['V', 2.2])
  swingWing(near, [28, 19 + b], ang + 0.45, 7, 4, 'M', 'm')
  near.outline(OL)
  // the rider sits forward on the thorax, clear of the wingbeat
  return { far, body, near, saddle: [21.5, 15.5 + b] as Pt }
}

/* ---------------- assembly ---------------- */

const SPECS: Record<FlyerId, { draw: (f: number) => { far: HiGrid; body: HiGrid; near: HiGrid; saddle: Pt | null }; style: FlightStyle; frameMs: number; world: number; extra?: Palette }> = {
  megaphawk: { draw: megaphawk, style: 'flap', frameMs: 120, world: 0.62, extra: { E: '#3e2410' } },
  hootour: { draw: hootour, style: 'flap', frameMs: 140, world: 0.58, extra: { E: '#4a2c18' } },
  riffin: { draw: riffin, style: 'flap', frameMs: 70, world: 0.32, extra: { E: '#0c0c12' } },
  campfly: { draw: campfly, style: 'buzz', frameMs: 45, world: 0.24 },
  diplomoth: { draw: diplomoth, style: 'flutter', frameMs: 110, world: 0.62, extra: { E: '#8a7a58' } },
}

function buildFlyer(id: FlyerId): FlightSprite {
  const spec = SPECS[id]
  let palette: Palette = { ...creatureArtHi[id].palette, ...ITEM_PALETTE, ...spec.extra }
  const frames: FlightFrame[] = []
  const saddle: Array<[number, number]> = []
  let rideable = true
  for (let f = 0; f < 4; f++) {
    const { far, body, near, saddle: s } = spec.draw(f)
    const layers = [far, body, near].map((g) => {
      const sh = formShade(g.toPixels(), palette, K2 + 1)
      const r = selectiveOutline(sh.pixels, sh.palette)
      palette = r.palette
      return r.pixels
    })
    frames.push({ far: layers[0], body: layers[1], near: layers[2] })
    if (s) saddle.push([s[0] * K2, s[1] * K2])
    else rideable = false
  }
  return { palette, frames, style: spec.style, frameMs: spec.frameMs, world: spec.world, saddle: rideable ? saddle : null }
}

export const FLYERS: FlyerId[] = ['megaphawk', 'hootour', 'riffin', 'campfly', 'diplomoth']
export const flightArt: Record<FlyerId, FlightSprite> = Object.fromEntries(FLYERS.map((id) => [id, buildFlyer(id)])) as Record<FlyerId, FlightSprite>
export const RIDEABLE: FlyerId[] = FLYERS.filter((id) => flightArt[id].saddle)
