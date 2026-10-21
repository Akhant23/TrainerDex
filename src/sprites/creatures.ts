/**
 * Original battle creatures, built from shapes in raster.ts in the Black/White style:
 * three-tone shading lit from the upper left, a selectively tinted outline (bwstyle.ts), and two
 * views per species — the front (how the opponent's creature faces you) and the back (your own
 * creature in battle, seen over its shoulder toward the foe, as in Gen V).
 *
 * Held items (the gavel, flag, guitar, bat…) come from held.ts and are placed at each species'
 * grip point; the paw, wing, flipper or leg holding them is drawn over the grip afterwards.
 * Builders draw on a 40×40 base grid; build(2) rasterises the same shapes at 80×80.
 */
import { Grid, HiGrid } from './raster.ts'
import type { Palette, Pixels } from './pixels.ts'
import { drawItem, HOLDS, ITEM_PALETTE, itemDetails } from './held.ts'
import { formShade, OUTLINE_KEY, selectiveOutline } from './bwstyle.ts'

export const CREATURE_SIZE = 40
const K = '#1c1a24'
const OL = OUTLINE_KEY

export interface CreatureArt {
  palette: Palette
  /** front view, facing the viewer (and slightly left) */
  pixels: Pixels
  /** back view: your creature in battle, facing away toward the upper right */
  back: Pixels
}

/** Resolution the builders below draw at (1 = 40×40, 2 = 80×80 hi-res). */
let RES = 1
/**
 * Idle phase the builders draw (0–3). Like BW battle sprites, each species' idle moves its own
 * signature parts (a tail flick, an ear twitch, wings shifting) rather than bobbing as a whole;
 * phase 0 is the resting pose used for stills and icons.
 */
let PHASE = 0
/** Pick this phase's value from a 4-step cycle. */
const cyc = <T,>(steps: readonly [T, T, T, T]) => steps[PHASE]
/** An attack pose being drawn (wind-up or strike), for species that have one (battle/poses.ts). */
let POSE: 'windup' | 'strike' | null = null
/** An occasional idle gesture being drawn (see IDLE_GESTURES), and which of its frames. */
let GESTURE: string | null = null
let GFRAME = 0
/** This gesture frame's value, or `rest` when another gesture (or none) is playing. */
const gest = <T,>(id: string, steps: readonly T[], rest: T) => (GESTURE === id ? steps[GFRAME] : rest)

export interface IdleGesture {
  id: string
  frames: number
  frameMs: number
  views: Array<'front' | 'back'>
  /** relative frequency */
  weight: number
}
/**
 * Occasional idle gestures, layered over the looping idle by the battle sprite's scheduler: a
 * blink where the species has eyes that can close, and one bigger, rarer gesture. Only the test
 * species have them so far; the rest keep the plain loop.
 */
export const IDLE_GESTURES: Partial<Record<string, IdleGesture[]>> = {
  byterat: [
    { id: 'blink', frames: 1, frameMs: 130, views: ['front'], weight: 3 },
    { id: 'sniff', frames: 4, frameMs: 150, views: ['front', 'back'], weight: 2 },
  ],
  megaphawk: [
    { id: 'blink', frames: 1, frameMs: 130, views: ['front'], weight: 3 },
    { id: 'squawk', frames: 4, frameMs: 140, views: ['front', 'back'], weight: 1 },
  ],
  gavelion: [
    { id: 'blink', frames: 1, frameMs: 130, views: ['front'], weight: 3 },
    { id: 'shake', frames: 4, frameMs: 120, views: ['front', 'back'], weight: 2 },
  ],
  helixor: [
    { id: 'blink', frames: 1, frameMs: 130, views: ['front'], weight: 3 },
    { id: 'tongue', frames: 3, frameMs: 110, views: ['front'], weight: 2 },
  ],
}
function grid() {
  return new HiGrid(CREATURE_SIZE, CREATURE_SIZE, RES)
}

/** Draw a species' held item for this view (the holder's grip goes on afterwards). */
function hold(g: HiGrid, id: string, view: 'front' | 'back') {
  const h = HOLDS[id]
  const at = h?.[view]
  if (h && at) drawItem(g, h.item, at)
}
function holdInk(g: HiGrid, id: string, view: 'front' | 'back') {
  const h = HOLDS[id]
  const at = h?.[view]
  if (h && at) itemDetails(g, h.item, at)
}

type Art = { pixels: Pixels; palette: Palette }

/* ---------------- Aaryan's team ---------------- */

function gavelion(): Art {
  const g = grid()
  // robe body + feet
  g.ellipse(20, 30, 10, 8, 'R', 'r', 'Q')
  g.ellipse(14, 37, 3, 1.5, 'F', 'f').ellipse(26, 37, 3, 1.5, 'F', 'f')
  g.rect(19, 23, 20, 29, 'W')
  // mane with spikes (idle: the side spikes bristle)
  // shake gesture: the mane spikes swing; wind-up pose: fully bristled
  const m = cyc([0, -1, -1.5, -0.5] as const) + gest('shake', [-2, 1, -2, 0], 0) + (POSE === 'windup' ? -2.5 : 0)
  g.poly([[6, 15], [1, 11 + m], [8, 9]], 'M').poly([[34, 15], [39, 11 + m], [32, 9]], 'M')
  g.poly([[7, 22], [3, 24], [9, 18]], 'M').poly([[33, 22], [37, 24], [31, 18]], 'M')
  g.ellipse(20, 15, 13, 11, 'M', 'm')
  g.ellipse(20, 17, 8, 7, 'F', 'f')
  // barrister's wig
  g.ellipse(20, 7, 9, 4, 'W', 'w')
  g.ellipse(11, 10, 2, 2, 'W', 'w').ellipse(29, 10, 2, 2, 'W', 'w').ellipse(11, 14, 2, 2, 'W', 'w').ellipse(29, 14, 2, 2, 'W', 'w')
  // left paw resting; the gavel in the right paw, which closes over the handle
  g.ellipse(10, 29, 2.5, 2, 'F', 'f')
  hold(g, 'gavelion', 'front')
  g.ellipse(32, 27.6, 2.7, 2.3, 'F', 'f')
  g.outline(OL)
  // face (eyes shut for a blink; brows down and a roar for an attack)
  if (GESTURE === 'blink') g.stamp(16, 16, ['KK']).stamp(23, 16, ['KK'])
  else g.stamp(16, 15, ['WK', 'KK', 'KK']).stamp(23, 15, ['WK', 'KK', 'KK'])
  if (POSE) g.line(15, 13, 18, 14, 'K').line(25, 14, 22, 13, 'K')
  g.stamp(19, 19, ['NN', 'KK'])
  if (POSE === 'strike') g.stamp(17, 21, ['KKKKKK', 'KPPPPK', '.KKKK.'])
  else g.stamp(17, 21, ['K....K', '.KKKK.'])
  g.set(14, 19, 'P').set(26, 19, 'P')
  g.line(31, 27, 33, 27, 'f')
  return {
    pixels: g.toPixels(),
    palette: { K, R: '#2c2c3c', r: '#1e1e2a', Q: '#4a4a5e', W: '#f4f4ee', w: '#c8c8d0', M: '#e0a030', m: '#b07018', F: '#f0c878', f: '#d0a050', N: '#6a3a2a', P: '#f08080', G: '#8a5a2a', g: '#c08a50' },
  }
}

function gavelionBack(): Pixels {
  const g = grid()
  // tail with a tuft, sweeping out to the lower left
  const t = cyc([0, -0.5, -1, -0.5] as const)
  g.line(13, 34, 5 + t, 31, 'F', 1.6)
  g.ellipse(4 + t, 29 + t * 0.5, 2.8, 2.8, 'M', 'm')
  // robe, with its back seam
  g.ellipse(21, 30, 11, 9, 'R', 'r', 'Q')
  // mane from behind, spikes out to both sides
  // wind-up: mane bristles; strike: it snaps forward
  const mb = gest('shake', [-2, 1, -2, 0], 0) + (POSE === 'windup' ? -2.5 : POSE === 'strike' ? 2 : 0)
  g.poly([[8, 14], [2, 10 + mb], [9, 8]], 'M').poly([[35, 13], [40, 9 + mb], [33, 7]], 'm')
  g.poly([[8, 21], [3, 24], [10, 17]], 'M').poly([[34, 21], [39, 23], [32, 17]], 'm')
  g.ellipse(22, 15, 13.5, 11.5, 'M', 'm')
  // ears poking up
  g.ellipse(12, 6, 2.4, 2.4, 'F', 'f').ellipse(31, 5, 2.4, 2.4, 'F', 'f')
  // the wig from behind: rows of curls and a queue tied with a black bow
  g.ellipse(22, 8, 8.5, 4.2, 'W', 'w')
  for (const x of [15, 18.5, 22, 25.5, 29]) g.ellipse(x, 12.4, 1.8, 1.8, 'W', 'w')
  g.line(22, 13, 22, 23, 'W', 1.4)
  // the gavel raised in the right paw
  hold(g, 'gavelion', 'back')
  g.ellipse(33, 23, 2.7, 2.3, 'F', 'f')
  g.outline(OL)
  g.line(21, 26, 21, 38, 'r')
  g.stamp(20, 19, ['K.K', '.K.', 'K.K'])
  return g.toPixels()
}

function helixorPoints(): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  for (let i = 0; i <= 28; i++) {
    const t = i / 28
    // idle: the strand turns slowly, so the twist travels up its body
    pts.push([20 + 9 * Math.sin(t * Math.PI * 2.2 + PHASE * 0.22), 36 - t * 24])
  }
  return pts
}

function helixor(): Art {
  const g = grid()
  const pts = helixorPoints()
  pts.forEach(([x, y]) => g.ellipse(x, y, 3.6, 3.6, 'T', 't'))
  pts.forEach(([x, y], i) => i % 4 === 2 && g.rect(Math.round(x) - 2, Math.round(y), Math.round(x) + 2, Math.round(y), i % 8 === 2 ? 'P' : 'Y'))
  const [hx, hy] = pts[pts.length - 1]
  g.ellipse(hx, hy - 2, 7, 6, 'T', 't')
  g.rect(Math.round(hx) - 7, Math.round(hy) - 4, Math.round(hx) + 7, Math.round(hy) - 3, 'K')
  g.ellipse(hx - 3, hy - 3, 2.2, 2.2, 'L', 'l').ellipse(hx + 3, hy - 3, 2.2, 2.2, 'L', 'l')
  // tongue gesture: the forked tongue flicks out further
  const tongue = gest('tongue', [2, 3.5, 1.5], 0)
  g.line(hx, hy + 4, hx + 1, hy + 7 + tongue, 'R')
  g.outline(OL)
  if (GESTURE === 'blink') g.line(hx - 5, hy - 3, hx - 1, hy - 3, 'l').line(hx + 1, hy - 3, hx + 5, hy - 3, 'l')
  else g.set(hx - 3, hy - 3, 'K').set(hx + 3, hy - 3, 'K').set(hx - 4, hy - 4, 'W').set(hx + 2, hy - 4, 'W')
  return {
    pixels: g.toPixels(),
    palette: { K, T: '#3fb8a0', t: '#24806e', P: '#f070a0', Y: '#f8d040', L: '#d8f0ff', l: '#90b8d8', R: '#e0383e', W: '#ffffff' },
  }
}

function helixorBack(): Pixels {
  const g = grid()
  const pts = helixorPoints().map(([x, y]): [number, number] => [x + 1, y + 1])
  pts.forEach(([x, y]) => g.ellipse(x, y, 3.8, 3.8, 'T', 't'))
  // the dorsal stripes run down its back
  pts.forEach(([x, y], i) => i % 3 === 1 && g.rect(Math.round(x) - 1, Math.round(y) - 1, Math.round(x) + 1, Math.round(y) - 1, i % 6 === 1 ? 'P' : 'Y'))
  const [hx, hy] = pts[pts.length - 1]
  g.ellipse(hx + 1, hy - 2, 7, 6, 'T', 't')
  // the goggle strap wraps round the back of its head
  g.rect(Math.round(hx) - 6, Math.round(hy) - 3, Math.round(hx) + 8, Math.round(hy) - 2, 'K')
  g.ellipse(hx + 7, hy - 3, 1.6, 2.2, 'L', 'l')
  g.outline(OL)
  return g.toPixels()
}

function brushfox(): Art {
  const g = grid()
  // idle: the paint-tipped tail sways
  const tw = cyc([0, 0.5, 1, 0.5] as const)
  g.ellipse(31 + tw * 0.5, 27, 6, 8, 'O', 'o')
  g.ellipse(33 + tw, 20, 4, 4, 'V', 'v')
  g.ellipse(19, 29, 8, 7, 'O', 'o')
  g.ellipse(18, 31, 4, 4, 'W', 'w')
  g.rect(13, 34, 15, 38, 'O').rect(21, 34, 23, 38, 'o')
  g.poly([[10, 13], [11, 3], [17, 10]], 'O').poly([[20, 10], [25, 3], [26, 13]], 'O')
  g.poly([[12, 11], [12, 6], [15, 10]], 'P').poly([[22, 10], [24, 6], [24, 11]], 'P')
  g.ellipse(18, 16, 8, 7, 'O', 'o')
  g.ellipse(18, 19, 4, 3, 'W', 'w')
  g.ellipse(17, 7, 6, 2.5, 'R', 'r')
  g.outline(OL)
  g.set(17, 4, 'K')
  g.stamp(14, 15, ['WK', 'KK'])
  g.stamp(21, 15, ['WK', 'KK'])
  g.stamp(17, 18, ['KK'])
  g.set(35, 30, 'V').set(36, 33, 'v').set(29, 37, 'V')
  return {
    pixels: g.toPixels(),
    palette: { K, O: '#f08030', o: '#b85818', W: '#fff4e8', w: '#e0c8b0', V: '#a060e0', v: '#6030a0', P: '#f8a0b8', R: '#e0383e', r: '#9a2028' },
  }
}

function brushfoxBack(): Pixels {
  const g = grid()
  // the paint-tipped tail curls up beside it
  const tw = cyc([0, -0.5, -1, -0.5] as const)
  g.ellipse(9 + tw * 0.5, 27, 6, 8, 'O', 'o')
  g.ellipse(7 + tw, 19, 4, 4, 'V', 'v')
  g.ellipse(21, 29, 8.5, 7.5, 'O', 'o')
  g.rect(15, 34, 17, 38, 'o').rect(23, 34, 25, 38, 'O')
  // ears from behind (no pink), the beret on top
  g.poly([[14, 12], [15, 2], [20, 9]], 'O').poly([[24, 9], [29, 2], [30, 12]], 'o')
  g.ellipse(22, 16, 8.5, 7.5, 'O', 'o')
  g.ellipse(23, 7, 6.5, 2.6, 'R', 'r')
  g.outline(OL)
  g.set(23, 4, 'K')
  g.set(6, 22, 'V').set(10, 31, 'v')
  return g.toPixels()
}

function subwoof(): Art {
  const g = grid()
  g.rect(12, 37, 15, 38, 'B').rect(25, 37, 28, 38, 'B')
  g.rect(10, 20, 30, 36, 'D').rect(29, 20, 30, 36, 'd')
  // idle: the speaker cone pulses with the beat
  const beat = cyc([0, 0.7, 0, 0.7] as const)
  g.ellipse(20, 29, 5 + beat, 5 + beat, 'g', 'G')
  g.ellipse(20, 29, 2, 2, 'K')
  g.ellipse(11, 16, 3, 5, 'b').ellipse(29, 16, 3, 5, 'b')
  g.ellipse(20, 13, 8, 7, 'B', 'b')
  g.ellipse(20, 16, 3.5, 2.5, 'W', 'w')
  g.line(12, 9, 20, 4, 'R', 2).line(20, 4, 28, 9, 'R', 2)
  g.ellipse(11, 12, 2.2, 3, 'R', 'r').ellipse(29, 12, 2.2, 3, 'R', 'r')
  g.outline(OL)
  g.stamp(16, 12, ['WK', 'KK'])
  g.stamp(23, 12, ['WK', 'KK'])
  g.stamp(19, 15, ['KK'])
  g.stamp(18, 17, ['K..K', '.KK.'])
  const out = cyc([0, 1, 0, 1] as const)
  g.stamp(1 - out, 26, ['Y..', '.Y.', 'Y..']).stamp(36 + out, 26, ['..Y', '.Y.', '..Y'])
  return {
    pixels: g.toPixels(),
    palette: { K, D: '#383848', d: '#24242e', g: '#a8b0c0', G: '#707888', B: '#b07848', b: '#805030', W: '#f8f0e0', w: '#d8c8b0', R: '#e05890', r: '#a02858', Y: '#f8d040' },
  }
}

function subwoofBack(): Pixels {
  const g = grid()
  g.rect(12, 37, 15, 38, 'b').rect(25, 37, 28, 38, 'B')
  // the back panel of the cabinet: screws and an input jack
  g.rect(10, 20, 30, 36, 'D').rect(10, 20, 11, 36, 'd')
  g.rect(13, 23, 27, 33, 'd')
  g.ellipse(20, 28, 2, 2, 'G', 'g')
  // a stubby wagging tail
  g.ellipse(31 + cyc([0, 1, 0, -1] as const), 33, 2.4, 1.6, 'B', 'b')
  g.ellipse(11, 16, 3, 5, 'b').ellipse(29, 16, 3, 5, 'B', 'b')
  g.ellipse(20, 13, 8, 7, 'B', 'b')
  g.line(12, 9, 20, 4, 'R', 2).line(20, 4, 28, 9, 'R', 2)
  g.ellipse(11, 12, 2.2, 3, 'R', 'r').ellipse(29, 12, 2.2, 3, 'R', 'r')
  g.outline(OL)
  for (const [x, y] of [[13, 23], [27, 23], [13, 33], [27, 33]]) g.set(x, y, 'g')
  g.set(20, 28, 'K')
  return g.toPixels()
}

function strikaroo(): Art {
  const g = grid()
  // idle: the tail tip lifts and one ear twitches
  const tl = cyc([0, -1, -2, -1] as const)
  const ear = cyc([0, 0, -1, 0] as const)
  g.line(12, 35, 3, 28 + tl, 'B', 3)
  g.ellipse(15, 37, 5, 1.6, 'B', 'b').ellipse(24, 37, 4, 1.6, 'B', 'b')
  g.ellipse(18, 26, 7, 9, 'J', 'j')
  g.rect(12, 24, 24, 25, 'Y')
  g.ellipse(25, 22, 2, 3, 'B', 'b')
  g.ellipse(16, 5, 1.8, 4.5, 'B', 'b').ellipse(22, 4 + ear, 1.8, 4.5, 'B', 'b')
  g.ellipse(20, 12, 6, 5, 'B', 'b')
  g.ellipse(24, 14, 3, 2, 'C', 'c')
  // the ball rests against its right foot
  hold(g, 'strikaroo', 'front')
  g.outline(OL)
  holdInk(g, 'strikaroo', 'front')
  g.set(16, 3, 'P').set(16, 4, 'P').set(22, 2 + ear, 'P').set(22, 3 + ear, 'P')
  g.stamp(18, 10, ['WK', 'KK'])
  g.stamp(26, 13, ['K'])
  g.stamp(17, 29, ['KKK', '..K', '.K.', '.K.'])
  return {
    pixels: g.toPixels(),
    palette: { K, B: '#c07840', b: '#8a5028', J: '#1f8a4c', j: '#126034', Y: '#f8c838', C: '#f0d8b0', c: '#c8b088', W: '#f8f8f8', w: '#a8b0c0', P: '#f0a0a0' },
  }
}

function strikarooBack(): Pixels {
  const g = grid()
  // the long tail props it up from behind
  g.line(15, 34, 3, 38 + cyc([0, -0.5, -1, -0.5] as const), 'B', 3)
  g.ellipse(17, 37, 4, 1.6, 'b').ellipse(26, 37, 5, 1.6, 'B', 'b')
  g.ellipse(20, 26, 7.5, 9, 'J', 'j')
  g.rect(13, 23, 27, 24, 'Y')
  g.ellipse(13, 23, 2, 3, 'B', 'b')
  g.ellipse(18, 5, 1.8, 4.5, 'B', 'b').ellipse(25, 4, 1.8, 4.5, 'B', 'b')
  g.ellipse(22, 12, 6, 5, 'B', 'b')
  hold(g, 'strikaroo', 'back')
  g.outline(OL)
  holdInk(g, 'strikaroo', 'back')
  // the number 7 on its back
  g.stamp(18, 26, ['YYYY', '...Y', '..Y.', '..Y.', '.Y..'])
  return g.toPixels()
}

function hootour(): Art {
  const g = grid()
  // idle: the ear tufts quiver and it glances about
  const tuft = cyc([0, -1, 0, -1] as const)
  const look = cyc([0, 0, 1, 0] as const)
  g.poly([[10, 13], [11, 4 + tuft], [16, 11]], 'H').poly([[30, 13], [29, 4 + tuft], [24, 11]], 'H')
  g.ellipse(20, 24, 11, 13, 'H', 'h')
  g.ellipse(20, 27, 7, 8, 'C', 'c')
  g.ellipse(15, 18, 4, 4, 'W', 'w').ellipse(25, 18, 4, 4, 'W', 'w')
  g.ellipse(15 + look, 18, 1.6, 1.6, 'K').ellipse(25 + look, 18, 1.6, 1.6, 'K')
  g.poly([[18, 21], [22, 21], [20, 25]], 'O')
  g.rect(10, 29, 30, 31, 'Y').rect(10, 31, 30, 31, 'y')
  g.rect(24, 31, 26, 36, 'Y')
  g.ellipse(16, 38, 2, 1, 'O').ellipse(24, 38, 2, 1, 'O')
  // the flag held high in the right wing, its feathers wrapped round the pole
  hold(g, 'hootour', 'front')
  g.ellipse(32, 26, 3, 5.5, 'H', 'h')
  g.ellipse(31.5, 27.5, 1.6, 1.4, 'C')
  g.outline(OL)
  g.set(14 + look, 17, 'W').set(24 + look, 17, 'W')
  g.stamp(16, 24, ['c.c', '.c.']).stamp(21, 26, ['c.c', '.c.'])
  return {
    pixels: g.toPixels(),
    palette: { K, H: '#9a6a40', h: '#6a4428', C: '#f0dcb0', c: '#c8b088', W: '#ffffff', w: '#d0d8e0', O: '#f0a020', Y: '#f8d030', y: '#c8a010', G: '#6a4a2a', R: '#e0383e' },
  }
}

function hootourBack(): Pixels {
  const g = grid()
  const tuft = cyc([0, -1, 0, -1] as const)
  g.poly([[11, 13], [12, 4 + tuft], [17, 11]], 'H').poly([[31, 13], [30, 4 + tuft], [25, 11]], 'h')
  g.ellipse(21, 24, 11, 13, 'H', 'h')
  // folded wings and the tail
  g.ellipse(11, 27, 3, 7.5, 'h').ellipse(31, 26, 3, 7.5, 'H', 'h')
  g.poly([[17, 35], [25, 35], [21, 39]], 'h')
  // scarf knot and tail hanging down its back
  g.rect(11, 20, 31, 22, 'Y').rect(11, 22, 31, 22, 'y')
  g.poly([[19, 22], [23, 22], [24, 31], [20, 30]], 'Y')
  g.ellipse(17, 38, 2, 1, 'O').ellipse(25, 38, 2, 1, 'O')
  hold(g, 'hootour', 'back')
  g.ellipse(32, 26, 3, 5.5, 'H', 'h')
  g.outline(OL)
  // feather chevrons
  for (const [x, y] of [[15, 12], [22, 11], [27, 15], [16, 26], [26, 28]]) g.stamp(x, y, ['h.h', '.h.'])
  return g.toPixels()
}

/* ---------------- Starters ---------------- */

function byterat(): Art {
  const g = grid()
  // idle: the cable tail flicks side to side and one ear twitches
  const tx = cyc([0, 1, 2, 1] as const)
  // sniff gesture: both ears twitch and the nose wiggles; wind-up pose: ears flattened back
  const sniff = gest('sniff', [-1, 0, -1, 0], 0)
  const ear = cyc([0, 0, -1, 0] as const) + sniff + (POSE === 'windup' ? 1.5 : 0)
  const earL = sniff + (POSE === 'windup' ? 1.5 : 0)
  const nose = gest('sniff', [0, -1, 0, -1], 0)
  g.line(26, 33, 34, 32, 'L').line(34, 32, 37 + tx * 0.5, 24, 'L').line(37 + tx * 0.5, 24, 37 + tx, 19, 'L')
  g.ellipse(19, 29, 9, 7, 'S', 's')
  g.ellipse(18, 31, 5, 4, 'W', 'w')
  g.ellipse(12, 37, 3, 1.4, 'S', 's').ellipse(24, 37, 3, 1.4, 'S', 's')
  g.ellipse(10, 11 + earL, 3.5, 3.5, 'S', 's').ellipse(20, 10 + ear, 3.5, 3.5, 'S', 's')
  g.ellipse(10, 11 + earL, 1.8, 1.8, 'P').ellipse(20, 10 + ear, 1.8, 1.8, 'P')
  g.ellipse(15, 19, 7, 6, 'S', 's')
  g.ellipse(8 + nose, 21, 2.5, 2, 'S', 's')
  g.rect(9, 17, 20, 18, 'L')
  g.outline(OL)
  g.rect(9, 16, 20, 16, 'K').rect(9, 19, 20, 19, 'K')
  // the visor's eye-lights go off for a blink
  if (GESTURE !== 'blink') g.set(12, 17, 'W').set(17, 17, 'W')
  g.set(6 + nose, 21, 'P')
  // strike pose: the bite, mouth open on its front teeth
  if (POSE === 'strike') g.stamp(9, 22, ['KKKK', 'KWWK', 'KPPK', '.KK.'])
  else g.stamp(10, 23, ['K.K', '.K.'])
  g.set(34, 32, 'Y').set(37 + tx * 0.5, 24, 'Y').set(37 + tx, 18, 'Y')
  return {
    pixels: g.toPixels(),
    palette: { K, S: '#7088b0', s: '#4a5e88', W: '#e8eef8', w: '#b8c4d8', P: '#f0a0b8', L: '#40e0f0', Y: '#f8d040' },
  }
}

function byteratBack(): Pixels {
  const g = grid()
  // the ethernet tail loops out behind, plug and all
  // sniff gesture and the strike pose both whip the tail up
  const tx = cyc([0, -1, -2, -1] as const) + gest('sniff', [-1, -2, -1, 0], 0) + (POSE === 'strike' ? -2 : 0)
  g.line(13, 33, 5, 31, 'L').line(5, 31, 3 + tx, 23, 'L')
  g.rect(2 + tx, 20, 4 + tx, 22, 'Y')
  g.ellipse(21, 29, 9, 7, 'S', 's')
  g.ellipse(14, 37, 3, 1.4, 's').ellipse(26, 37, 3, 1.4, 'S', 's')
  const earB = POSE === 'windup' ? 1.5 : 0
  g.ellipse(14, 10 + earB, 3.5, 3.5, 'S', 's').ellipse(26, 10 + earB, 3.5, 3.5, 's')
  g.ellipse(21, 18, 7.5, 6.5, 'S', 's')
  // visor strap round the back of its head
  g.rect(14, 16, 28, 17, 'L')
  g.outline(OL)
  g.set(28, 16, 'Y')
  return g.toPixels()
}

function beakerbun(): Art {
  const g = grid()
  // idle: bubbles rise through the liquid, which sloshes, and an ear twitches
  const ear = cyc([0, 0, -1, 0] as const)
  const rise = cyc([0, 1, 2, 3] as const)
  g.ellipse(17, 3, 1.6, 4.5, 'W', 'w').ellipse(23, 3 + ear, 1.6, 4.5, 'W', 'w')
  g.ellipse(20, 9, 5.5, 4.5, 'W', 'w')
  g.ellipse(20, 29, 11, 9, 'L', 'l')
  g.rect(16, 14, 24, 21, 'L').rect(23, 14, 24, 21, 'l')
  // liquid fills the bottom of the flask
  fill(g, 28 + cyc([0, 0, 1, 0] as const), 'L', 'G')
  fill(g, 28 + cyc([0, 0, 1, 0] as const), 'l', 'g')
  g.rect(15, 13, 25, 13, 'w')
  g.outline(OL)
  g.set(17, 1, 'P').set(17, 2, 'P').set(23, 1 + ear, 'P').set(23, 2 + ear, 'P')
  g.stamp(17, 8, ['K....K'])
  g.stamp(19, 10, ['PK'])
  g.stamp(13, 22, ['W', 'W', 'W']).stamp(14, 25, ['W'])
  g.stamp(18, 31 - rise * 0.5, ['.W.', 'W.W', '.W.']).stamp(24, 34 - rise, ['W']).stamp(14, 33 - (rise % 2), ['W'])
  return {
    pixels: g.toPixels(),
    palette: { K, W: '#ffffff', w: '#d0d8e0', P: '#f8a0b8', L: '#c8ecff', l: '#88c0e8', G: '#58c870', g: '#2f9048' },
  }
}

/** Recolour `from` to `to` below row `y0` (liquid levels). */
function fill(g: HiGrid, y0: number, from: string, to: string) {
  for (let y = y0; y < CREATURE_SIZE; y++) for (let x = 0; x < CREATURE_SIZE; x++) if (g.get(x, y) === from) g.set(x, y, to)
}

function beakerbunBack(): Pixels {
  const g = grid()
  g.ellipse(18, 3, 1.6, 4.5, 'W', 'w').ellipse(24, 3, 1.6, 4.5, 'w')
  g.ellipse(21, 9, 5.5, 4.5, 'W', 'w')
  g.ellipse(20, 29, 11, 9, 'L', 'l')
  g.rect(16, 14, 24, 21, 'L').rect(16, 14, 17, 21, 'l')
  fill(g, 26 + cyc([0, 0, 1, 0] as const), 'L', 'G')
  fill(g, 26 + cyc([0, 0, 1, 0] as const), 'l', 'g')
  g.rect(15, 13, 25, 13, 'w')
  g.outline(OL)
  // a cotton tail pressed to the glass, and the light catching the far side
  g.ellipse(21, 12, 1.6, 1.4, 'W')
  g.stamp(26, 22, ['W', 'W']).stamp(25, 31, ['.W.', 'W.W'])
  return g.toPixels()
}

function riffin(): Art {
  const g = grid()
  g.ellipse(14, 38, 3, 1.2, 'O').ellipse(22, 38, 3, 1.2, 'O')
  g.ellipse(18, 25, 9, 11, 'D', 'd')
  g.ellipse(18, 28, 6, 8, 'W', 'w')
  g.ellipse(18, 12, 7, 6, 'D', 'd')
  g.ellipse(17, 13, 4.5, 4, 'W', 'w')
  g.poly([[21, 10], [30, 13], [21, 17]], 'O')
  g.rect(21, 12, 22, 15, 'Y')
  // idle: the free flipper strums
  g.ellipse(13, 26 + cyc([0, 1, 2, 1] as const), 3, 5, 'D', 'd')
  // the guitar against its belly, its right flipper on the neck
  hold(g, 'riffin', 'front')
  g.ellipse(27.5, 24.5, 2.4, 4.2, 'D', 'd')
  g.outline(OL)
  g.stamp(16, 12, ['KR', 'KK'])
  return {
    pixels: g.toPixels(),
    palette: { K, D: '#2a2a3a', d: '#18181f', W: '#f8f8f4', w: '#c8ccd8', O: '#f07828', Y: '#f8d040', R: '#e04040', r: '#a02828', G: '#8a5a2a' },
  }
}

function riffinBack(): Pixels {
  const g = grid()
  g.ellipse(16, 38, 3, 1.2, 'O').ellipse(24, 38, 3, 1.2, 'O')
  g.poly([[16, 34], [23, 34], [19, 39]], 'd')
  g.ellipse(20, 25, 9, 11, 'D', 'd')
  // the white cheek and the tip of the beak show past its head
  g.ellipse(21, 12, 7, 6, 'D', 'd')
  g.ellipse(26, 13, 2.4, 3, 'W', 'w')
  g.poly([[27, 11], [33, 13], [27, 15]], 'O')
  g.ellipse(12, 26 + cyc([0, 1, 2, 1] as const), 3, 5, 'D', 'd')
  // the guitar neck sticks out past its shoulder, flipper wrapped round it
  hold(g, 'riffin', 'back')
  g.ellipse(28, 23.5, 2.6, 4.4, 'D', 'd')
  g.outline(OL)
  return g.toPixels()
}

/* ---------------- Introduced in the Battle Tower ---------------- */

function wicketoad(): Art {
  const g = grid()
  // cricket bat resting over the shoulder, behind the body
  hold(g, 'wicketoad', 'front')
  g.ellipse(20, 29, 12, 9, 'G', 'g')
  g.ellipse(20, 31, 8, 6, 'L', 'l')
  g.ellipse(11, 37, 4, 1.6, 'G', 'g').ellipse(29, 37, 4, 1.6, 'G', 'g')
  g.ellipse(19, 17, 10, 7, 'G', 'g')
  g.ellipse(13, 11, 4, 4, 'G', 'g').ellipse(25, 11, 4, 4, 'G', 'g')
  // a navy cap
  g.ellipse(19, 9, 6, 3, 'N', 'n').rect(19, 10, 28, 11, 'n')
  // idle: the throat sac swells and settles
  g.ellipse(19, 22, 6, 2.6 + cyc([0, 0.6, 1.2, 0.6] as const), 'L', 'l')
  // the hand round the handle
  g.ellipse(30, 30, 3, 2.6, 'G', 'g')
  g.outline(OL)
  g.ellipse(13, 12, 2.2, 2.2, 'W').ellipse(25, 12, 2.2, 2.2, 'W')
  g.set(13, 12, 'K').set(14, 12, 'K').set(25, 12, 'K').set(26, 12, 'K')
  g.stamp(14, 19, ['K..........K', '.KKKKKKKKKK.'])
  g.line(29, 30, 31, 30, 'g')
  return {
    pixels: g.toPixels(),
    palette: { K, G: '#5cb048', g: '#3a8030', L: '#d8f0a0', l: '#b0d070', W: '#ffffff', B: '#ecd49c', b: '#b8945a', N: '#26345e', n: '#161f3c' },
  }
}

function wicketoadBack(): Pixels {
  const g = grid()
  hold(g, 'wicketoad', 'back')
  g.ellipse(20, 29, 12, 9, 'G', 'g')
  g.ellipse(11, 37, 4, 1.6, 'g').ellipse(29, 37, 4, 1.6, 'G', 'g')
  g.ellipse(20, 17, 10, 7, 'G', 'g')
  // idle: one eye bump twitches up
  g.ellipse(14, 11, 4, 4, 'G', 'g').ellipse(26, 11 + cyc([0, 0, -1, 0] as const), 4, 4, 'G', 'g')
  // the cap from behind, with its strap gap
  g.ellipse(20, 10, 6.5, 3.4, 'N', 'n')
  g.ellipse(30, 29, 3, 2.6, 'G', 'g')
  g.outline(OL)
  for (const [x, y, r] of [[15, 27, 1.6], [24, 31, 1.8], [19, 20, 1.3], [27, 24, 1.2]] as const) g.ellipse(x, y, r, r, 'g')
  g.rect(19, 12, 21, 12, 'L')
  return g.toPixels()
}

function campfly(): Art {
  const g = grid()
  // idle: the wings buzz and the lantern glow pulses
  const buzz = cyc([0, -1.5, 0, -1.5] as const)
  const glow = cyc([0, 0.8, 1.4, 0.8] as const)
  // glow
  g.ellipse(25, 29, 11 + glow, 9 + glow, 'g')
  g.ellipse(11, 12 + buzz * 0.5, 7, 4.5 + buzz, 'V', 'v').ellipse(27, 11 + buzz * 0.5, 7, 4.5 + buzz, 'V', 'v')
  g.ellipse(25, 29, 7.5, 6.5, 'Y', 'y', 'W')
  g.ellipse(18, 21, 6, 5, 'B', 'b')
  g.ellipse(15, 14, 6.5, 6, 'B', 'b')
  g.line(12, 8, 8, 2, 'B').line(18, 8, 21, 2, 'B')
  g.ellipse(8, 2, 1.5, 1.5, 'Y').ellipse(21, 2, 1.5, 1.5, 'Y')
  // legs: one reaches out and holds the pennant
  g.line(19, 26, 21, 33, 'B')
  hold(g, 'campfly', 'front')
  g.line(15, 24, 10, 26, 'B')
  g.ellipse(9, 26, 1.4, 1.4, 'B')
  g.outline(OL)
  g.ellipse(12, 14, 2, 2.2, 'W').ellipse(18, 14, 2, 2.2, 'W')
  g.set(12, 15, 'K').set(18, 15, 'K')
  g.stamp(13, 18, ['K..K', '.KK.'])
  return {
    pixels: g.toPixels(),
    palette: { K, B: '#3a3c58', b: '#24263a', V: '#d8ecff', v: '#a8c4e8', Y: '#fff070', y: '#f0c030', W: '#ffffff', g: '#fff8c0', F: '#8a5a2a', R: '#f4c838' },
  }
}

function campflyBack(): Pixels {
  const g = grid()
  const glow = cyc([0, 0.8, 1.4, 0.8] as const)
  g.ellipse(15, 30, 11 + glow, 9 + glow, 'g')
  g.ellipse(15, 30, 7.5, 6.5, 'Y', 'y', 'W')
  g.ellipse(22, 21, 6, 5, 'B', 'b')
  g.ellipse(25, 14, 6.5, 6, 'B', 'b')
  g.line(25, 8, 24, 2, 'B').line(29, 9, 34, 3, 'B')
  g.ellipse(24, 2, 1.5, 1.5, 'Y').ellipse(34, 3, 1.5, 1.5, 'Y')
  // wings fold over its back from this side
  const buzz = cyc([0, -1.2, 0, -1.2] as const)
  g.ellipse(14, 17, 8, 4.5 + buzz, 'V', 'v').ellipse(28, 20, 7, 4 + buzz, 'V', 'v')
  hold(g, 'campfly', 'back')
  g.line(26, 24, 31, 25, 'B')
  g.ellipse(31, 25, 1.4, 1.4, 'B')
  g.outline(OL)
  return g.toPixels()
}

function megaphawk(): Art {
  const g = grid()
  // idle: the wings lift and settle, the crest feathers sway, and the megaphone crackles
  // squawk gesture: wings flung up; wind-up pose: wings raised high; strike: wings swept down
  const lift = cyc([0, -1, -2, -1] as const) + gest('squawk', [-2, -4, -4, -2], 0) + (POSE === 'windup' ? -5 : POSE === 'strike' ? 1 : 0)
  const sway = cyc([0, 0.5, 1, 0.5] as const)
  // wings + body
  g.poly([[8, 22], [1, 34 + lift], [12, 32]], 'D').poly([[30, 22], [38, 33 + lift], [27, 32]], 'd')
  g.ellipse(19, 27, 10, 10, 'D', 'd')
  g.ellipse(19, 30, 6, 6.5, 'C', 'c')
  g.ellipse(14, 38, 3, 1.3, 'Y').ellipse(24, 38, 3, 1.3, 'Y')
  g.ellipse(17, 13, 8, 7.5, 'D', 'd')
  g.poly([[12, 7], [9 + sway, 0], [16, 5]], 'D').poly([[16, 6], [16 + sway, 0], [20, 5]], 'd')
  // megaphone beak
  g.poly([[23, 11], [37, 6], [37, 21], [23, 17]], 'W')
  g.poly([[23, 15], [37, 15], [37, 21], [23, 17]], 'w')
  g.rect(22, 11, 24, 17, 'R')
  g.outline(OL)
  g.rect(36, 7, 37, 20, 'R')
  if (GESTURE === 'blink') g.line(15, 12, 19, 12, 'K')
  else g.ellipse(17, 12, 2.4, 2.4, 'W').set(18, 12, 'K').set(18, 13, 'K')
  g.line(13, 9, 19, 10, 'K')
  const loud = POSE === 'strike' || (GESTURE === 'squawk' && GFRAME > 0)
  if (loud)
    // a full-volume blast: sound lines fanning out of the bell
    for (const [x0, y0, x1, y1] of [[38, 6, 40, 2], [38, 13, 40, 13], [38, 20, 40, 24]]) g.line(x0, y0, x1, y1, 'Y')
  else if (PHASE % 2 === 0) for (const [x, y] of [[38, 4], [39, 12], [38, 22]]) g.set(x, y, 'Y')
  return {
    pixels: g.toPixels(),
    palette: { K, D: '#8a5430', d: '#5e361c', C: '#f4e2c4', c: '#d8c09c', W: '#f8f8f4', w: '#c8ccd8', R: '#e0383e', Y: '#f8c030' },
  }
}

function megaphawkBack(): Pixels {
  const g = grid()
  // tail fan
  g.poly([[13, 34], [27, 34], [24, 40], [16, 40]], 'd')
  g.ellipse(20, 27, 10, 10, 'D', 'd')
  // folded wings down its back, primaries crossed at the tail (they shift as it breathes)
  const lift = cyc([0, -0.5, -1, -0.5] as const) + gest('squawk', [-1, -2, -2, -1], 0) + (POSE === 'windup' ? -3 : POSE === 'strike' ? 1 : 0)
  g.poly([[10, 20 + lift], [19, 24], [17, 37], [8, 33 + lift]], 'd')
  g.poly([[30, 20 + lift], [21, 24], [24, 37], [32, 33 + lift]], 'D')
  g.ellipse(14, 38, 3, 1.3, 'Y').ellipse(26, 38, 3, 1.3, 'Y')
  g.ellipse(21, 13, 8, 7.5, 'D', 'd')
  g.poly([[17, 7], [15, 0], [21, 5]], 'D').poly([[22, 6], [23, 0], [26, 6]], 'd')
  // the bell of the megaphone shows past its head
  g.poly([[27, 11], [36, 7], [36, 19], [27, 16]], 'W')
  g.poly([[27, 14], [36, 14], [36, 19], [27, 16]], 'w')
  g.outline(OL)
  g.rect(35, 8, 36, 18, 'R')
  g.line(12, 24, 15, 34, 'D').line(28, 24, 26, 34, 'd')
  return g.toPixels()
}

function stitchick(): Art {
  const g = grid()
  g.ellipse(20, 24, 13, 13, 'Y', 'y', 'W')
  // the hoodie: lower half, hood behind the head
  g.poly([[7, 25], [33, 25], [32, 36], [8, 36]], 'H')
  g.rect(26, 25, 32, 36, 'h')
  g.rect(14, 29, 26, 34, 'h')
  g.ellipse(14, 38, 2.5, 1.3, 'O').ellipse(26, 38, 2.5, 1.3, 'O')
  // needle and thread pinched in its right wing
  hold(g, 'stitchick', 'front')
  g.ellipse(31.5, 22.5, 2.6, 3.6, 'Y', 'y')
  g.outline(OL)
  g.rect(14, 29, 26, 29, 'K')
  g.line(17, 25, 17, 30, 'W').line(23, 25, 23, 30, 'W')
  // idle: it glances one way, then the other
  const look = cyc([0, 1, 0, -1] as const)
  g.ellipse(15 + look * 0.6, 18, 1.8, 2.2, 'K').ellipse(25 + look * 0.6, 18, 1.8, 2.2, 'K')
  g.set(15 + look * 0.6, 17, 'W').set(25 + look * 0.6, 17, 'W')
  g.poly([[18, 20], [22, 20], [20, 23]], 'O')
  g.set(11, 21, 'P').set(29, 21, 'P')
  return {
    pixels: g.toPixels(),
    palette: { K, Y: '#f8d848', y: '#d0a820', W: '#fff8d8', H: '#a890e0', h: '#7860b0', O: '#f08a28', X: '#d8dee8', R: '#e04848', P: '#f8a0a0' },
  }
}

function stitchickBack(): Pixels {
  const g = grid()
  g.ellipse(20, 24, 13, 13, 'Y', 'y', 'W')
  // the hood hangs down its back
  g.poly([[9, 15], [31, 15], [28, 27], [20, 30], [12, 27]], 'H')
  g.poly([[24, 15], [31, 15], [28, 27], [24, 29]], 'h')
  g.poly([[7, 27], [33, 27], [32, 36], [8, 36]], 'H')
  g.rect(26, 27, 32, 36, 'h')
  // idle: it shifts its weight, tapping one foot
  g.ellipse(14, 38, 2.5, 1.3, 'O').ellipse(26, 38 + cyc([0, -0.8, 0, 0] as const), 2.5, 1.3, 'O')
  hold(g, 'stitchick', 'back')
  g.ellipse(32, 23, 2.6, 3.6, 'Y', 'y')
  g.outline(OL)
  g.line(20, 30, 20, 36, 'h')
  return g.toPixels()
}

function diplomoth(): Art {
  const g = grid()
  // idle: the wings flutter, narrowing as they tilt toward you
  const f = cyc([0, -0.8, -1.6, -0.8] as const)
  g.ellipse(10 - f * 0.5, 15, 9 + f, 9, 'M', 'm').ellipse(30 + f * 0.5, 15, 9 + f, 9, 'M', 'm')
  g.ellipse(11, 29, 7 + f * 0.5, 6, 'M', 'm').ellipse(29, 29, 7 + f * 0.5, 6, 'M', 'm')
  g.ellipse(10 - f * 0.5, 15, 4 + f * 0.4, 4, 'V', 'v').ellipse(30 + f * 0.5, 15, 4 + f * 0.4, 4, 'V', 'v')
  g.ellipse(20, 24, 4, 10, 'G', 'g')
  g.ellipse(20, 15, 6, 3, 'W', 'w')
  g.ellipse(20, 10, 5, 4.5, 'G', 'g')
  g.line(18, 6, 14, 0, 'G').line(22, 6, 26, 0, 'G')
  // the placard, held up by its front legs
  hold(g, 'diplomoth', 'front')
  g.line(18, 21, 14.5, 24.6, 'G').line(22, 21, 25.5, 24.6, 'G')
  g.outline(OL)
  holdInk(g, 'diplomoth', 'front')
  g.set(18, 10, 'K').set(22, 10, 'K').set(18, 9, 'W').set(22, 9, 'W')
  for (const x of [13, 15, 25, 27]) g.set(x, 1, 'G')
  return {
    pixels: g.toPixels(),
    palette: { K, M: '#d8c8a0', m: '#b0a078', V: '#6a5ab0', v: '#4a3a88', G: '#6a6a7a', g: '#4a4a58', W: '#f8f8f4', w: '#d0d0d8', F: '#8a5a2a' },
  }
}

function diplomothBack(): Pixels {
  const g = grid()
  // wings spread, seen from above and behind: the paler underside pattern
  const f = cyc([0, -0.8, -1.6, -0.8] as const)
  g.ellipse(10 - f * 0.5, 16, 9 + f, 9, 'M', 'm').ellipse(30 + f * 0.5, 15, 9 + f, 9, 'M', 'm')
  g.ellipse(11, 29, 7 + f * 0.5, 6, 'm').ellipse(29, 29, 7 + f * 0.5, 6, 'M', 'm')
  g.ellipse(10 - f * 0.5, 16, 2.6, 2.6, 'v').ellipse(30 + f * 0.5, 15, 2.6, 2.6, 'v')
  g.ellipse(20, 24, 4, 10, 'G', 'g')
  g.ellipse(21, 15, 6, 3, 'W', 'w')
  g.ellipse(21, 10, 5, 4.5, 'G', 'g')
  g.line(19, 6, 16, 0, 'G').line(23, 6, 27, 0, 'G')
  // the placard raised on the right, its blank back to you
  hold(g, 'diplomoth', 'back')
  g.line(24, 24, 29.5, 27, 'G')
  g.outline(OL)
  for (const x of [15, 17, 26, 28]) g.set(x, 1, 'G')
  return g.toPixels()
}

function datadillo(): Art {
  const g = grid()
  g.ellipse(29, 34, 6, 2, 'S', 's')
  g.ellipse(22, 25, 14, 11, 'A', 'a', 'Q')
  for (let x = 12; x <= 32; x += 5) g.line(x, 15, x + 1, 35, 'a')
  g.ellipse(8, 29, 6, 5, 'S', 's')
  g.ellipse(6, 22, 2, 3, 'S', 's')
  // idle: the tail flicks and a pulse runs along the circuit lines
  g.line(35, 30, 39, 33 + cyc([0, -1, -1, 0] as const), 'A', 2)
  g.ellipse(12, 37, 2.5, 1.5, 'S', 's').ellipse(30, 37, 2.5, 1.5, 'S', 's')
  g.outline(OL)
  // circuit lines glowing across the plates
  g.line(17, 18, 17, 24, 'C').line(17, 24, 23, 24, 'C').line(23, 24, 23, 30, 'C').line(28, 17, 28, 22, 'C')
  g.set(17, 18, 'W').set(23, 30, 'W').set(28, 17 + PHASE, 'W')
  // the pulse travels down the line (the still frame shows none)
  const pulse: Array<[number, number] | null> = [null, [17, 22], [20, 24], [23, 27]]
  const at = pulse[PHASE]
  if (at) g.set(at[0], at[1], 'W')
  g.set(6, 28, 'K').set(2, 31, 'P')
  return {
    pixels: g.toPixels(),
    palette: { K, A: '#6a7a98', a: '#4a5674', Q: '#8e9cb8', S: '#e0b4a0', s: '#b88a78', C: '#40e0f0', W: '#ffffff', P: '#f08098' },
  }
}

function datadilloBack(): Pixels {
  const g = grid()
  g.line(6, 31, 1, 35 + cyc([0, -1, -1, 0] as const), 'A', 2)
  g.ellipse(20, 25, 15, 12, 'A', 'a', 'Q')
  // plate bands curve over its back
  for (const y of [17, 22, 27, 32]) g.line(7, y + 1, 33, y - 1, 'a')
  g.ellipse(33, 17, 4.5, 4, 'S', 's')
  g.ellipse(35, 12, 1.6, 2.4, 'S', 's')
  g.ellipse(10, 37, 2.5, 1.5, 's').ellipse(29, 37, 2.5, 1.5, 'S', 's')
  g.outline(OL)
  g.line(12, 19, 12, 25, 'C').line(12, 25, 20, 25, 'C').line(26, 18, 26, 29, 'C')
  g.set(12, 19 + PHASE * 2, 'W').set(26, 29 - PHASE * 3, 'W')
  return g.toPixels()
}

const builders: Record<string, [() => Art, () => Pixels]> = {
  gavelion: [gavelion, gavelionBack],
  helixor: [helixor, helixorBack],
  brushfox: [brushfox, brushfoxBack],
  subwoof: [subwoof, subwoofBack],
  strikaroo: [strikaroo, strikarooBack],
  hootour: [hootour, hootourBack],
  byterat: [byterat, byteratBack],
  beakerbun: [beakerbun, beakerbunBack],
  riffin: [riffin, riffinBack],
  wicketoad: [wicketoad, wicketoadBack],
  campfly: [campfly, campflyBack],
  megaphawk: [megaphawk, megaphawkBack],
  stitchick: [stitchick, stitchickBack],
  diplomoth: [diplomoth, diplomothBack],
  datadillo: [datadillo, datadilloBack],
}

/** Run the builders at a resolution and give every view the BW selective outline. */
function build(k: number): Record<string, CreatureArt> {
  RES = k
  const out: Record<string, CreatureArt> = {}
  for (const [id, [front, back]] of Object.entries(builders)) {
    const f = front()
    // big art gets Gen V form shading; the 40×40 icons stay crisp and flat
    const shade = (px: Pixels, pal: Palette) => (k > 1 ? formShade(px, pal, k + 1) : { pixels: px, palette: pal })
    const fs = shade(f.pixels, { ...f.palette, ...ITEM_PALETTE })
    const fr = selectiveOutline(fs.pixels, fs.palette)
    const bs = shade(back(), fr.palette)
    const bk = selectiveOutline(bs.pixels, bs.palette)
    out[id] = { pixels: fr.pixels, back: bk.pixels, palette: bk.palette }
  }
  RES = 1
  return out
}

export const IDLE_FRAMES = 4
const frameCache = new Map<string, { frames: Pixels[]; palette: Palette }>()

/**
 * Render frames of one species and view: each entry sets the drawing state (idle phase, pose,
 * gesture frame) before the builder runs. Frames are shaded and outlined like the still art and
 * share one palette. Built on first use and cached, so the site doesn't pay for every species'
 * animation up front.
 */
function renderFrames(key: string, id: string, k: 1 | 2, view: 'front' | 'back', states: Array<() => void>): { frames: Pixels[]; palette: Palette } {
  const hit = frameCache.get(key)
  if (hit) return hit
  const [front, back] = builders[id]
  const shade = (px: Pixels, pal: Palette) => (k > 1 ? formShade(px, pal, k + 1) : { pixels: px, palette: pal })
  const saved = [RES, PHASE, POSE, GESTURE, GFRAME] as const
  const frames: Pixels[] = []
  let pal: Palette = {}
  RES = k
  try {
    for (const set of states) {
      PHASE = 0
      POSE = null
      GESTURE = null
      GFRAME = 0
      set()
      const f = front()
      const fs = shade(f.pixels, { ...f.palette, ...ITEM_PALETTE, ...pal })
      const fr = selectiveOutline(fs.pixels, fs.palette)
      pal = fr.palette
      if (view === 'front') frames.push(fr.pixels)
      else {
        const bs = shade(back(), pal)
        const bk = selectiveOutline(bs.pixels, bs.palette)
        pal = bk.palette
        frames.push(bk.pixels)
      }
    }
  } finally {
    ;[RES, PHASE, POSE, GESTURE, GFRAME] = saved
  }
  const out = { frames, palette: pal }
  frameCache.set(key, out)
  return out
}

/** A species' looping idle for one view: four frames of its own motion (frame 0 is the still). */
export function idleFrames(id: string, k: 1 | 2, view: 'front' | 'back'): { frames: Pixels[]; palette: Palette } {
  return renderFrames(`idle:${id}:${k}:${view}`, id, k, view, [0, 1, 2, 3].map((p) => () => (PHASE = p)))
}

/** One attack pose (wind-up or strike) for a species that has one; see battle/poses.ts. */
export function poseFrame(id: string, k: 1 | 2, view: 'front' | 'back', pose: 'windup' | 'strike'): { frames: Pixels[]; palette: Palette } {
  return renderFrames(`pose:${id}:${k}:${view}:${pose}`, id, k, view, [() => (POSE = pose)])
}

/** The frames of an occasional idle gesture, drawn over the resting pose. */
export function gestureFrames(id: string, k: 1 | 2, view: 'front' | 'back', gesture: string): { frames: Pixels[]; palette: Palette } {
  const g = IDLE_GESTURES[id]?.find((x) => x.id === gesture)
  const n = g?.frames ?? 0
  return renderFrames(`gesture:${id}:${k}:${view}:${gesture}`, id, k, view, Array.from({ length: n }, (_, i) => () => ((GESTURE = gesture), (GFRAME = i))))
}

/** 40×40 art for small icons. */
export const creatureArt: Record<string, CreatureArt> = build(1)
/** The same creatures at 80×80 with finer outlines, for battles and the party screen. */
export const creatureArtHi: Record<string, CreatureArt> = build(2)
export const CREATURE_HI = CREATURE_SIZE * 2

/** The TRAINERDEX BADGE — earned by beating Aaryan. */
export const trainerdexBadge: { palette: Palette; pixels: Pixels } = (() => {
  const g = new Grid(16, 16)
  g.ellipse(7.5, 7.5, 7, 7, 'A', 'a', 'W')
  g.ellipse(7.5, 7.5, 4, 4, 'R', 'r')
  g.outline()
  g.stamp(4, 4, ['...W...', '...W...', '..WWW..', 'WWWWWWW', '..WWW..', '...W...', '...W...'])
  return { pixels: g.toPixels(), palette: { K, A: '#f0c040', a: '#b08010', W: '#fff6c0', R: '#e0383e', r: '#9a2028' } }
})()
