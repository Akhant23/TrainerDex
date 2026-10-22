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
 *
 * The mounts (Megaphawk, Hootour, Diplomoth) also have a rear view (`framesBack`): the same
 * creature seen from behind and a little above as it flies away, wings beating out to both sides,
 * the rider's seat on its back. Original art drawn for this site, from each mount's own shapes and
 * palette (and its battle back sprite's details: the megaphone, the scarf and flag, the placard).
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
  /** facing left, as authored */
  frames: FlightFrame[]
  /**
   * Facing right: drawn from the same shapes through a mirroring canvas, then shaded, so the light
   * still comes from the upper left; anything held comes round to the near side (see `held`).
   * Never just the left frames flipped, which would mirror the lighting and the held item.
   */
  framesRight: FlightFrame[]
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
  /**
   * Seen from behind, flying away (same size, frame timing and wingbeat as the side view), and
   * where the rider's hips go in it; null for creatures that never carry anyone away.
   */
  framesBack: FlightFrame[] | null
  saddleBack: Array<[number, number]> | null
  /**
   * Turning away, three-quarters from behind: heading up and to the left (you see its back and
   * left flank) or up and to the right (its back and right flank). Each is drawn as itself, not a
   * mirror of the other: anything carried on its right (Megaphawk's megaphone, Hootour's flag)
   * stays on its right, tucked behind the body heading left and in view heading right.
   */
  framesQuarter: Record<'left' | 'right', FlightFrame[]> | null
  saddleQuarter: Record<'left' | 'right', Array<[number, number]>> | null
}

/** Drawing the right-facing frames: shapes go through MirrorGrid, held items come to the near side. */
let MIRROR = false

/**
 * A HiGrid that draws everything mirrored left-to-right, so the right-facing frames come from
 * the same shape code as the left-facing ones but are rasterised (and then shaded) in place,
 * rather than being a flipped copy of finished art.
 */
class MirrorGrid extends HiGrid {
  private mx(x: number) {
    return FLIGHT_BASE_W - 1 - x
  }
  set(x: number, y: number, ch: string) {
    return super.set(this.mx(x), y, ch)
  }
  get(x: number, y: number) {
    return super.get(this.mx(x), y)
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, ch: string, shade?: string, light?: string) {
    return super.ellipse(this.mx(cx), cy, rx, ry, ch, shade, light)
  }
  rect(x0: number, y0: number, x1: number, y1: number, ch: string) {
    return super.rect(this.mx(x1), y0, this.mx(x0), y1, ch)
  }
  poly(points: Array<[number, number]>, ch: string) {
    return super.poly(points.map(([x, y]) => [FLIGHT_BASE_W - x, y]), ch)
  }
  line(x0: number, y0: number, x1: number, y1: number, ch: string, thick = 1) {
    return super.line(FLIGHT_BASE_W - 0.5 - x0, y0, FLIGHT_BASE_W - 0.5 - x1, y1, ch, thick)
  }
  stamp(x: number, y: number, rows: string[]) {
    // pixel by pixel through the base set (HiGrid.stamp calls this.set, which would mirror twice)
    rows.forEach((r, dy) => [...r].forEach((c, dx) => c !== '.' && super.set(this.mx(x + dx), y + dy, c)))
    return this
  }
  sample(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number) => string | null) {
    return super.sample(FLIGHT_BASE_W - x1, y0, FLIGHT_BASE_W - x0, y1, (x, y) => fn(FLIGHT_BASE_W - x, y))
  }
}

const grid = (): HiGrid => (MIRROR ? new MirrorGrid(FLIGHT_BASE_W, FLIGHT_BASE_H, K2) : new HiGrid(FLIGHT_BASE_W, FLIGHT_BASE_H, K2))
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
  featherWing(g, [root[0], root[1]], [root[0] + chord, root[1] + 0.6], [root[0] + fx * len * fold, root[1] + fy * len * fold], col, shade, light)
}

/**
 * Tip of a bird's wing seen from behind, per frame, as fractions of its length: [out to the side,
 * down]. Both wings beat together, so from behind the stroke reads as a V, a wide flat span, a
 * droop and a half-folded recovery (the side view's up, mid-down, down, mid-up).
 */
const BIRD_TIP_BACK: Pt[] = [
  [0.46, -0.86],
  [0.97, -0.18],
  [0.8, 0.52],
  [0.64, -0.58],
]
/** How much of the wing's depth shows from behind and above, per frame: most when spread flat. */
const BIRD_DEPTH_BACK = [0.75, 0.8, 0.7, 0.72]

/** One wing seen from behind: from the shoulder out to one side (`side` −1 left, 1 right). */
function birdWingBack(g: HiGrid, root: Pt, side: -1 | 1, frame: number, len: number, chord: number, col: string, shade: string, light: string) {
  const fold = frame === 3 ? 0.86 : 1
  const [fx, fy] = BIRD_TIP_BACK[frame]
  // the trailing edge meets the body a little further out and lower than the leading edge, so even
  // the raised wing (nearly edge-on from behind) keeps some breadth at the shoulder
  featherWing(g, root, [root[0] + side * chord * 0.3, root[1] + chord * BIRD_DEPTH_BACK[frame]], [root[0] + side * fx * len * fold, root[1] + fy * len * fold], col, shade, light)
}

/** The wing shape both views share: leading edge r1 → tip, trailing edge tip → r2 with feather points. */
function featherWing(g: HiGrid, r1: Pt, r2: Pt, tip: Pt, col: string, shade: string, light: string) {
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

/**
 * Draw what a flyer carries. Facing left the item sits at its authored depth; facing right the
 * creature has turned round, so the side that was away from you now faces you: the item is drawn
 * over that layer's shapes (and outlined) instead of under them. Returns the ink pass to run after
 * the layer is outlined.
 */
function held(g: HiGrid, id: FlyerId, bob: number, wave: number) {
  const h = HOLDS[id]
  if (!h?.flight) return null
  const at: Hold = { ...h.flight, y: h.flight.y + bob, wave }
  if (MIRROR)
    return () => {
      drawItem(g, h.item, at)
      g.outline(OL)
      itemDetails(g, h.item, at)
    }
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

/* ---------------- seen from behind ---------------- */

/**
 * Parts drawn on their own grids, each with its own outline, then laid over each other in order
 * (back to front), so a nearer part keeps its dark edge where it crosses a farther one.
 */
function stack(...parts: HiGrid[]): Pixels {
  const out = parts[0].toPixels().map((r) => [...r])
  for (const g of parts.slice(1)) g.toPixels().forEach((r, y) => [...r].forEach((c, x) => c !== '.' && (out[y][x] = c)))
  return out.map((r) => r.join(''))
}
type BackDraw = (f: number) => { far: Pixels; body: Pixels; near: Pixels; saddle: Pt }
/** Centre line of the rear view. */
const MID = FLIGHT_BASE_W / 2

function megaphawkBack(f: number) {
  const b = BOB[f]
  // the megaphone, held out in front of its beak and tilted to its right (as in its battle back
  // sprite): from behind, the bell's rim shows past that side of its head
  const horn = grid().ellipse(MID + 4.5, 10.5 + b, 5.2, 6.2, 'R').ellipse(MID + 4.5, 10.5 + b, 4.2, 5.2, 'W', 'w')
  horn.outline(OL)
  const head = grid().ellipse(MID, 13 + b, 6, 5.6, 'D', 'd')
  // the crest, swept back
  head.poly([[MID - 2.6, 10 + b], [MID - 5, 3 + b], [MID, 9 + b]], 'd').poly([[MID, 9 + b], [MID + 3, 2 + b], [MID + 3.5, 10 + b]], 'D')
  head.outline(OL)
  const wings = [-1, 1].map((side) => {
    const w = grid()
    birdWingBack(w, [MID + side * 5.5, 16.5 + b], side as -1 | 1, f, 19, 10, 'D', 'd', 'C')
    return w.outline(OL)
  })
  const back = grid()
  back.ellipse(MID - 3.6, 27.5 + b, 1.7, 1.3, 'Y').ellipse(MID + 3.6, 27.5 + b, 1.7, 1.3, 'Y')
  back.ellipse(MID, 20 + b, 8.5, 7.2, 'D', 'd')
  back.outline(OL)
  // the tail fans out toward you, under the rider's seat
  const tail = grid().poly([[MID - 4, 24 + b], [MID + 4, 24 + b], [MID + 8, 33 + b], [MID, 35.5 + b], [MID - 8, 33 + b]], 'd')
  tail.outline(OL)
  for (const dx of [-4, 0, 4]) tail.line(MID, 25.5 + b, MID + dx, 33.5 + b, 'D')
  return { far: stack(horn, head, ...wings), body: stack(back), near: stack(tail), saddle: [MID, 14.5 + b] as Pt }
}

function hootourBack(f: number) {
  const b = BOB[f]
  const wave = f / 4
  const head = grid()
  head.poly([[MID - 5.5, 10 + b], [MID - 6.5, 3 + b], [MID - 2, 9 + b]], 'H').poly([[MID + 2, 9 + b], [MID + 6.5, 3 + b], [MID + 5.5, 10 + b]], 'h')
  head.ellipse(MID, 13 + b, 7.2, 6.6, 'H', 'h')
  head.outline(OL)
  const wings = [-1, 1].map((side) => {
    const w = grid()
    birdWingBack(w, [MID + side * 6, 17.5 + b], side as -1 | 1, f, 16, 11, 'H', 'h', 'C')
    return w.outline(OL)
  })
  // the flag, gripped in its talons, streams back toward you on its right side
  const flag = grid()
  drawItem(flag, 'flag', { x: MID + 4, y: 28 + b, angle: Math.PI - 0.5, scale: 0.62, wave })
  flag.outline(OL)
  const back = grid()
  back.ellipse(MID, 21 + b, 9.5, 8, 'H', 'h')
  // the scarf: knotted round the neck, its tail flapping down the back
  const w = Math.sin(wave * Math.PI * 2) * 1.2
  back.rect(MID - 7, 16 + b, MID + 7, 18 + b, 'Y')
  back.poly([[MID - 1.5, 18 + b], [MID + 1.5, 18 + b], [MID + 2 + w, 27 + b], [MID - 2 + w, 27 + b]], 'Y')
  back.ellipse(MID - 3.5, 29 + b, 1.8, 1.4, 'O').ellipse(MID + 3.5, 29 + b, 1.8, 1.4, 'O')
  back.outline(OL)
  back.line(MID + w * 0.5, 19 + b, MID + w, 26 + b, 'y')
  const tail = grid().poly([[MID - 3.5, 26 + b], [MID + 3.5, 26 + b], [MID + 5, 32 + b], [MID, 33.5 + b], [MID - 5, 32 + b]], 'h')
  tail.outline(OL)
  return { far: stack(head, ...wings, flag), body: stack(back), near: stack(tail), saddle: [MID, 15 + b] as Pt }
}

function diplomothBack(f: number) {
  const b = BOB[f] * 0.7
  // wing elevation per frame (0 = level, negative = raised), both sides together
  const e = [-0.95, -0.4, 0.4, -0.15][f]
  const antennae = grid()
  antennae.line(MID - 2, 12 + b, MID - 7, 4 + b, 'G').line(MID + 2, 12 + b, MID + 7, 4 + b, 'G')
  antennae.outline(OL)
  for (const [x, y] of [[MID - 7, 4], [MID - 6, 5], [MID + 7, 4], [MID + 6, 5]]) antennae.set(x, y + b, 'G')
  const wings = [-1, 1].map((side) => {
    const g = grid()
    // forewing out and up, hindwing lower and smaller; the eye spot near the forewing's tip
    const ang = (a: number) => (side > 0 ? a : Math.PI - a)
    swingWing(g, [MID + side * 3, 17 + b], ang(e), 11, 5.4, 'M', 'm', ['V', 2.2])
    swingWing(g, [MID + side * 3, 20 + b], ang(e + 0.5), 7, 4.2, 'M', 'm')
    return g.outline(OL)
  })
  // the placard hangs below on its pole: from behind, its blank back
  const placard = grid()
  drawItem(placard, 'placard', { x: MID, y: 26 + b, angle: Math.PI, scale: 0.8 })
  placard.outline(OL)
  const body = grid()
  body.ellipse(MID, 17 + b, 4.6, 4, 'G', 'g')
  body.ellipse(MID, 14.5 + b, 4.4, 2.2, 'W', 'w')
  body.line(MID - 2, 21 + b, MID - 2, 25 + b, 'G').line(MID + 2, 21 + b, MID + 2, 25 + b, 'G')
  body.outline(OL)
  // the abdomen, segmented, toward you below the seat
  const abdomen = grid().ellipse(MID, 24 + b, 3.6, 6, 'G', 'g')
  abdomen.outline(OL)
  for (const y of [22, 25, 28]) abdomen.line(MID - 2.5, y + b, MID + 2.5, y + b, 'g')
  return { far: stack(antennae, ...wings, placard), body: stack(body), near: stack(abdomen), saddle: [MID, 15.5 + b] as Pt }
}

const BACKS: Partial<Record<FlyerId, BackDraw>> = { megaphawk: megaphawkBack, hootour: hootourBack, diplomoth: diplomothBack }

/* ---------------- three-quarters from behind (turning away) ---------------- */

/**
 * `h`: the way it's heading, −1 up-left or 1 up-right. The head is turned toward that side, the
 * near wing (on that side) spreads full length in front of the body's edge, the far wing is
 * foreshortened and half hidden behind it, and the body lies on the diagonal with the tail toward
 * you on the other side. What it carries on its right is on your right in both: behind the body
 * heading left, in front of it heading right.
 */
type QuarterDraw = (f: number, h: -1 | 1) => { far: Pixels; body: Pixels; near: Pixels; saddle: Pt }

function megaphawkQuarter(f: number, h: -1 | 1) {
  const b = BOB[f]
  const farWing = grid()
  birdWingBack(farWing, [MID - h * 3, 15.5 + b], (-h) as -1 | 1, f, 11, 7, 'd', 'E', 'd')
  farWing.outline(OL)
  // the megaphone points the way it's heading: its bell shows past that side of the head
  const horn = grid().ellipse(MID + h * 11, 9.5 + b, 4.6, 5.6, 'R').ellipse(MID + h * 11, 9.5 + b, 3.6, 4.6, 'W', 'w')
  horn.outline(OL)
  const head = grid().ellipse(MID + h * 6.5, 12.5 + b, 5.8, 5.4, 'D', 'd')
  head.poly([[MID + h * 4.5, 9.5 + b], [MID + h * 2, 3 + b], [MID + h * 7, 9 + b]], 'd').poly([[MID + h * 7, 9 + b], [MID + h * 10, 2.5 + b], [MID + h * 10.5, 10 + b]], 'D')
  head.outline(OL)
  const back = grid()
  back.ellipse(MID - h * 2.5, 28 + b, 1.6, 1.2, 'Y')
  rotEllipse(back, MID + h * 0.5, 20 + b, 9.5, 7, h * -0.35, 'D', 'd')
  back.outline(OL)
  const nearWing = grid()
  birdWingBack(nearWing, [MID + h * 5, 17 + b], h, f, 19, 10, 'D', 'd', 'C')
  nearWing.outline(OL)
  const tail = grid().poly([[MID - h * 2, 24 + b], [MID - h * 7.5, 23.5 + b], [MID - h * 11, 32 + b], [MID - h * 5, 34.5 + b], [MID + h * 1, 31 + b]], 'd')
  tail.outline(OL)
  for (const dx of [0, 3, 6]) tail.line(MID - h * 3.5, 25.5 + b, MID - h * (2 + dx), 33 + b, 'D')
  return { far: stack(farWing, horn, head), body: stack(back, nearWing), near: stack(tail), saddle: [MID, 14.5 + b] as Pt }
}

function hootourQuarter(f: number, h: -1 | 1) {
  const b = BOB[f]
  const wave = f / 4
  const farWing = grid()
  birdWingBack(farWing, [MID - h * 3.5, 16.5 + b], (-h) as -1 | 1, f, 10, 7, 'h', 'E', 'h')
  farWing.outline(OL)
  const head = grid()
  head.poly([[MID + h * 1.5, 10 + b], [MID + h * 0.5, 3 + b], [MID + h * 5, 9 + b]], 'H').poly([[MID + h * 8, 9 + b], [MID + h * 12.5, 3.5 + b], [MID + h * 11.5, 10.5 + b]], 'h')
  head.ellipse(MID + h * 6.5, 13 + b, 7, 6.4, 'H', 'h')
  head.outline(OL)
  // the flag in its talons, on its right: heading left that side is away from you
  const flag = grid()
  // (heading right it's in front: gripped lower, so the pole hangs clear of the body)
  drawItem(flag, 'flag', h > 0 ? { x: MID + 7, y: 31 + b, angle: Math.PI - 0.35, scale: 0.6, wave } : { x: MID + 5, y: 28 + b, angle: Math.PI - 0.5, scale: 0.62, wave })
  flag.outline(OL)
  const back = grid()
  rotEllipse(back, MID + h * 0.5, 21 + b, 10, 8, h * -0.3, 'H', 'h')
  // the scarf round its neck, its tail flapping back along the body
  const w = Math.sin(wave * Math.PI * 2) * 1.2
  back.poly([[MID + h * 1, 15.5 + b], [MID + h * 10, 16.5 + b], [MID + h * 9.5, 18.5 + b], [MID + h * 0.5, 18 + b]], 'Y')
  back.poly([[MID + h * 1, 18 + b], [MID + h * 3.5, 18 + b], [MID - h * 2 + w, 27 + b], [MID - h * 5 + w, 26.5 + b]], 'Y')
  back.ellipse(MID - h * 3, 29.5 + b, 1.8, 1.4, 'O')
  back.outline(OL)
  const nearWing = grid()
  birdWingBack(nearWing, [MID + h * 5.5, 17.5 + b], h, f, 16, 11, 'H', 'h', 'C')
  nearWing.outline(OL)
  const tail = grid().poly([[MID - h * 1.5, 26 + b], [MID - h * 6.5, 25.5 + b], [MID - h * 8.5, 31.5 + b], [MID - h * 3.5, 33.5 + b], [MID + h * 1, 31 + b]], 'h')
  tail.outline(OL)
  const parts = h > 0 ? { far: stack(farWing, head), body: stack(back, nearWing, flag) } : { far: stack(farWing, flag, head), body: stack(back, nearWing) }
  return { ...parts, near: stack(tail), saddle: [MID, 15 + b] as Pt }
}

function diplomothQuarter(f: number, h: -1 | 1) {
  const b = BOB[f] * 0.7
  const e = [-0.95, -0.4, 0.4, -0.15][f]
  const ang = (side: number, a: number) => (side > 0 ? a : Math.PI - a)
  // the far pair, foreshortened behind the body
  const farWings = grid()
  swingWing(farWings, [MID - h * 2, 16.5 + b], ang(-h, e - 0.15), 7, 4.6, 'm', 'E', ['V', 1.6])
  swingWing(farWings, [MID - h * 2, 19.5 + b], ang(-h, e + 0.4), 4.8, 3.6, 'm', 'E')
  farWings.outline(OL)
  const antennae = grid()
  antennae.line(MID + h * 3, 12 + b, MID + h * 4, 4 + b, 'G').line(MID + h * 6, 12.5 + b, MID + h * 11, 5 + b, 'G')
  antennae.outline(OL)
  for (const [x, y] of [[MID + h * 4, 4], [MID + h * 11, 5]]) antennae.set(x, y + b, 'G')
  const placard = grid()
  drawItem(placard, 'placard', { x: MID - h * 1, y: 26 + b, angle: Math.PI, scale: 0.78 })
  placard.outline(OL)
  const body = grid()
  rotEllipse(body, MID + h * 1.5, 17 + b, 5, 4, h * -0.3, 'G', 'g')
  body.ellipse(MID + h * 3, 14.5 + b, 4.2, 2.2, 'W', 'w')
  body.outline(OL)
  const nearWings = grid()
  swingWing(nearWings, [MID + h * 3, 17 + b], ang(h, e), 11.5, 5.6, 'M', 'm', ['V', 2.2])
  swingWing(nearWings, [MID + h * 3, 20 + b], ang(h, e + 0.5), 7.4, 4.4, 'M', 'm')
  nearWings.outline(OL)
  const abdomen = grid()
  rotEllipse(abdomen, MID - h * 1.5, 24 + b, 3.6, 6, h * 0.35, 'G', 'g')
  abdomen.outline(OL)
  for (const y of [22, 25, 28]) abdomen.line(MID - h * 1.5 - 2.5, y + b - h * 0.4, MID - h * 1.5 + 2.5, y + b + h * 0.4, 'g')
  return { far: stack(farWings, antennae, placard), body: stack(body, nearWings), near: stack(abdomen), saddle: [MID + h * 1, 15.5 + b] as Pt }
}

const QUARTERS: Partial<Record<FlyerId, QuarterDraw>> = { megaphawk: megaphawkQuarter, hootour: hootourQuarter, diplomoth: diplomothQuarter }

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
  const framesRight: FlightFrame[] = []
  const saddle: Array<[number, number]> = []
  let rideable = true
  const finish = (g: HiGrid | Pixels) => {
    const sh = formShade(Array.isArray(g) ? g : g.toPixels(), palette, K2 + 1)
    const r = selectiveOutline(sh.pixels, sh.palette)
    palette = r.palette
    return r.pixels
  }
  try {
    for (let f = 0; f < 4; f++) {
      MIRROR = false
      const { far, body, near, saddle: s } = spec.draw(f)
      frames.push({ far: finish(far), body: finish(body), near: finish(near) })
      if (s) saddle.push([s[0] * K2, s[1] * K2])
      else rideable = false
      MIRROR = true
      const r = spec.draw(f)
      framesRight.push({ far: finish(r.far), body: finish(r.body), near: finish(r.near) })
    }
  } finally {
    MIRROR = false
  }
  const back = BACKS[id]
  let framesBack: FlightFrame[] | null = null
  let saddleBack: Array<[number, number]> | null = null
  if (back) {
    framesBack = []
    saddleBack = []
    for (let f = 0; f < 4; f++) {
      const r = back(f)
      framesBack.push({ far: finish(r.far), body: finish(r.body), near: finish(r.near) })
      saddleBack.push([r.saddle[0] * K2, r.saddle[1] * K2])
    }
  }
  const quarter = QUARTERS[id]
  let framesQuarter: FlightSprite['framesQuarter'] = null
  let saddleQuarter: FlightSprite['saddleQuarter'] = null
  if (quarter) {
    framesQuarter = { left: [], right: [] }
    saddleQuarter = { left: [], right: [] }
    for (const [side, h] of [['left', -1], ['right', 1]] as const)
      for (let f = 0; f < 4; f++) {
        const r = quarter(f, h)
        framesQuarter[side].push({ far: finish(r.far), body: finish(r.body), near: finish(r.near) })
        saddleQuarter[side].push([r.saddle[0] * K2, r.saddle[1] * K2])
      }
  }
  return { palette, frames, framesRight, framesBack, saddleBack, framesQuarter, saddleQuarter, style: spec.style, frameMs: spec.frameMs, world: spec.world, saddle: rideable ? saddle : null }
}

export const FLYERS: FlyerId[] = ['megaphawk', 'hootour', 'riffin', 'campfly', 'diplomoth']
export const flightArt: Record<FlyerId, FlightSprite> = Object.fromEntries(FLYERS.map((id) => [id, buildFlyer(id)])) as Record<FlyerId, FlightSprite>
export const RIDEABLE: FlyerId[] = FLYERS.filter((id) => flightArt[id].saddle)
