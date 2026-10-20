/**
 * Held items for creatures: each item is drawn in its own local space around a grip point, then
 * placed per species and per view (front, back, flight) by the HOLDS table below. The creature's
 * builder draws the item first and its paw/wing/leg/flipper over the grip afterwards, so the item
 * reads as held rather than pasted on. Items share one small palette (digit keys) so any
 * creature can carry any item.
 */
import type { Raster } from './raster.ts'

export const ITEM_PALETTE: Record<string, string> = {
  '1': '#8a5a2a', // wood
  '2': '#5e3c1e', // wood shadow
  '3': '#c99a5e', // wood light
  '4': '#e0383e', // red cloth / lacquer
  '5': '#a02028', // red shadow
  '6': '#e2e6ee', // steel
  '7': '#8890a0', // steel shadow
  '8': '#f8f8f4', // paper / willow face
  '9': '#c8ccd8', // paper shadow
  '0': '#f8c838', // yellow
}

export type ItemId = 'gavel' | 'flag' | 'guitar' | 'bat' | 'needle' | 'placard' | 'pennant' | 'ball'

/** Where an item sits: the grip point (base grid coords), its rotation (radians, 0 = upright), and a flutter phase for cloth. */
export interface Hold {
  x: number
  y: number
  angle: number
  /** 0–1, animates flags and thread */
  wave?: number
  /** draw the item behind the body (over-the-shoulder, slung on the back) */
  behind?: boolean
  scale?: number
  /** mirror left–right (a flag flying the other way) */
  flip?: boolean
}

type Pt = [number, number]

function place(h: Hold) {
  const c = Math.cos(h.angle)
  const s = Math.sin(h.angle)
  const k = h.scale ?? 1
  const m = h.flip ? -1 : 1
  return ([x, y]: Pt): Pt => [h.x + (m * x * c - y * s) * k, h.y + (m * x * s + y * c) * k]
}

/**
 * Draw an item with its grip at `h`. Local space: the grip is (0, 0); "up" is −y.
 */
export function drawItem(g: Raster, item: ItemId, h: Hold) {
  const p = place(h)
  const poly = (pts: Pt[], ch: string) => g.poly(pts.map(p), ch)
  const line = (a: Pt, b: Pt, ch: string, thick = 1) => {
    const [x0, y0] = p(a)
    const [x1, y1] = p(b)
    g.line(x0, y0, x1, y1, ch, thick)
  }
  const wave = h.wave ?? 0
  const flap = Math.sin(wave * Math.PI * 2)
  switch (item) {
    case 'gavel':
      line([0, -4], [0, 6], '1', 1.4)
      poly([[-4.6, -9], [4.6, -9], [4.6, -4.4], [-4.6, -4.4]], '1')
      poly([[-4.6, -9], [4.6, -9], [4.6, -7.8], [-4.6, -7.8]], '3')
      poly([[-4.6, -9], [-3.2, -9], [-3.2, -4.4], [-4.6, -4.4]], '2')
      poly([[3.2, -9], [4.6, -9], [4.6, -4.4], [3.2, -4.4]], '2')
      break
    case 'flag':
      line([0, -16], [0, 11], '2', 1)
      poly([[0.6, -16], [9 + flap, -14.5 + flap * 0.8], [10.5, -12 + flap], [0.6, -10]], '4')
      poly([[0.6, -12.5], [10.5, -12 + flap], [0.6, -10]], '5')
      g.ellipse(...p([0, -16.6]), 0.9, 0.9, '0')
      break
    case 'pennant':
      line([0, -10], [0, 7], '2', 1)
      poly([[0.6, -10], [7 + flap, -8 + flap * 0.6], [0.6, -5.6]], '0')
      break
    case 'guitar':
      // body against the holder, neck up and away
      g.ellipse(...p([3.5, 5.5]), 4.6, 3.6, '4', '5')
      g.ellipse(...p([1, 2.6]), 3, 2.6, '4', '5')
      g.ellipse(...p([2.6, 4.4]), 1, 1, '2')
      line([1.4, 1], [-0.6, -9], '1', 1.4)
      poly([[-2.2, -9], [1, -9.6], [0.6, -12.4], [-2.4, -11.6]], '1')
      break
    case 'bat':
      // willow blade with a rounded toe, taped handle
      poly([[-1.9, -16], [1.9, -16], [2.2, -3], [-2.2, -3]], '8')
      poly([[0.6, -16], [1.9, -16], [2.2, -3], [0.8, -3]], '9')
      line([0, -3], [0, 4], '1', 1.2)
      line([0, -1], [0, 4], '4', 1.2)
      break
    case 'needle':
      line([0, -11], [0, 4], '6', 1)
      line([0.4, -11], [0.4, 4], '7', 0.5)
      g.ellipse(...p([0, -9.4]), 0.6, 0.9, '.')
      // the thread trails from the eye and sways
      line([0, -9.4], [3 + flap, -6], '4')
      line([3 + flap, -6], [4.6, -1 + flap], '4')
      break
    case 'placard':
      line([0, -3], [0, 9], '1', 1.4)
      poly([[-7.5, -11], [7.5, -11], [7.5, -2.6], [-7.5, -2.6]], '8')
      poly([[-7.5, -4], [7.5, -4], [7.5, -2.6], [-7.5, -2.6]], '9')
      break
    case 'ball':
      // the grip is where the ball rests against the foot (its lower left)
      g.ellipse(...p([3, -3]), 3.4, 3.4, '8', '9')
      break
  }
}

/** Ink details that go on after outlining (so they aren't swallowed by the outline pass). */
export function itemDetails(g: Raster, item: ItemId, h: Hold) {
  const p = place(h)
  if (item === 'placard') {
    const [a0, a1] = [p([-5.5, -8.5]), p([5, -8.5])]
    const [b0, b1] = [p([-5.5, -6.2]), p([2.5, -6.2])]
    g.line(a0[0], a0[1], a1[0], a1[1], 'K').line(b0[0], b0[1], b1[0], b1[1], 'K')
  }
  if (item === 'ball') {
    const [x, y] = p([3, -3])
    g.stamp(Math.round(x) - 1, Math.round(y) - 1, ['K.K', '.K.'])
  }
}

/** Which creature holds what, and where, in each view. Grips are on the holding paw/wing/leg. */
export const HOLDS: Partial<Record<string, { item: ItemId; front: Hold; back?: Hold; flight?: Hold; grip: string }>> = {
  gavelion: { item: 'gavel', grip: 'right paw', front: { x: 32, y: 27, angle: 0.12 }, back: { x: 33, y: 22, angle: 0.35 } },
  hootour: { item: 'flag', grip: 'right wing tip', front: { x: 31.5, y: 27, angle: 0.04, scale: 0.72 }, back: { x: 32, y: 26, angle: 0.15 }, flight: { x: 27, y: 29, angle: Math.PI / 2 + 0.12 } },
  riffin: { item: 'guitar', grip: 'right flipper', front: { x: 27, y: 25, angle: 0.55 }, back: { x: 28, y: 22, angle: 0.7 }, flight: { x: 34, y: 15, angle: 1.95, scale: 0.85 } },
  wicketoad: { item: 'bat', grip: 'right hand, blade over the shoulder', front: { x: 30, y: 30, angle: 0.32, behind: true }, back: { x: 30, y: 29, angle: -0.35, behind: true } },
  campfly: { item: 'pennant', grip: 'front leg', front: { x: 9, y: 26, angle: -0.08, flip: true }, back: { x: 31, y: 25, angle: 0.15 }, flight: { x: 15, y: 27, angle: -0.35 } },
  stitchick: { item: 'needle', grip: 'right wing', front: { x: 32, y: 21, angle: 0.5, scale: 0.9 }, back: { x: 32, y: 22, angle: 0.4, scale: 0.9 } },
  diplomoth: { item: 'placard', grip: 'front legs', front: { x: 20, y: 33, angle: 0, scale: 0.8 }, back: { x: 30, y: 27, angle: 0.1, scale: 0.8 }, flight: { x: 23, y: 25, angle: Math.PI, scale: 0.8, behind: true } },
  strikaroo: { item: 'ball', grip: 'right foot', front: { x: 27.5, y: 37.5, angle: 0 }, back: { x: 29, y: 38, angle: 0 } },
}
