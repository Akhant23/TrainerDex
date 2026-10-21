/**
 * Resort tiles: 16×16 pixel art generated from shapes (no borrowed tilesets).
 *
 * The resort is drawn in 2.5D: every tile has a flat `px` image that is laid on the tilted
 * floor, and objects that stand up (trees, lamps, counters, walls) also have a `prop` — an
 * upright sprite drawn at the tile's front edge, scaled with distance like a character.
 * `wall` props only show where the tile in front of them is open floor (so back walls face you
 * and side/front walls stay out of the way). Water has a second animation frame (`frame2`).
 */
import { Grid } from '../sprites/raster.ts'
import type { Palette, Pixels } from '../sprites/pixels.ts'

export const TILE = 16

export interface Prop {
  px: Pixels
  /** x of the sprite's base point (it stands on the middle of the tile's front edge). */
  anchorX: number
}

export interface TileDef {
  px: Pixels
  frame2?: Pixels
  prop?: Prop
  wall?: boolean
  solid: boolean
}

export const tilePalette: Palette = {
  K: '#1c1a24',
  g: '#6cbc54', G: '#509c3c', n: '#3e7e30', N: '#2c5c24',
  s: '#f2dca4', S: '#e0c48a',
  p: '#d8dce4', P: '#b8bfcc', '1': '#c8ced8', '2': '#9aa2b2',
  w: '#3c9ee6', W: '#8cd0ff', v: '#2a7cc0',
  f: '#ffffff',
  t: '#8a5a32', T: '#b07a44', u: '#5e3c20',
  e: '#2f8a4c', E: '#56b070', '3': '#1e6a38',
  r: '#e04848', R: '#a83030', '4': '#ff7a70',
  q: '#e86a96', Q: '#b84a72', '5': '#ffa8c4',
  c: '#f4ecd8', C: '#d8ccb0', '6': '#b8aa8c',
  b: '#a8d8f8', B: '#5a90c8', '7': '#2e5a8c',
  d: '#2a3a5a', D: '#46608c',
  y: '#f8d040', Y: '#c8a018',
  o: '#f4ead6', O: '#e2d6bc',
  m: '#c83c48', M: '#a02c38',
  a: '#e0b030', A: '#b08818',
  x: '#d6dce8', X: '#a8b0c4', '8': '#7c8498',
  i: '#48d0e0', I: '#2aa8bc',
  h: '#ffffff', z: '#5c6474', Z: '#b0b8c8', '9': '#3a404e',
  k: '#e070a0', j: '#f8d8e8',
  // roofs
  H: '#3a9a96', J: '#256e6c', L: '#62c4bc',
  V: '#7a6ab8', U: '#564890', F: '#a294e0',
}

const grid = (w = TILE, h = TILE) => new Grid(w, h)
const fill = (ch: string) => grid().rect(0, 0, 15, 15, ch)
const dots = (g: Grid, pts: Array<[number, number]>, ch: string) => (pts.forEach(([x, y]) => g.set(x, y, ch)), g)

/* ---------------- ground ---------------- */

const grass = () => dots(fill('g'), [[3, 3], [11, 5], [6, 11], [13, 13]], 'G')
const sand = () => dots(fill('s'), [[3, 4], [11, 2], [7, 9], [13, 12], [2, 13], [9, 14]], 'S')
/** City paving: large light slabs with darker joints, like BW's plazas. */
const paving = () => {
  // one clean slab per tile with a soft joint, like BW's city squares
  const g = fill('p')
  return g.rect(0, 15, 15, 15, '1').rect(15, 0, 15, 15, '1')
}
const floor = () => {
  const g = grid()
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g.set(x, y, (x < 8) !== (y < 8) ? 'O' : 'o')
  return g
}
const wallTop = () => fill('8').rect(0, 0, 15, 0, 'X')

function water(shift: number): Pixels {
  const g = fill('w')
  for (const [x, y] of [[2, 3], [9, 7], [4, 12], [12, 13]] as const) g.rect((x + shift) % 14, y, ((x + shift) % 14) + 2, y, 'W')
  g.set((6 + shift) % 16, 1, 'v').set((14 + shift) % 16, 10, 'v')
  return g.toPixels()
}
function pool(shift: number): Pixels {
  const g = fill('i')
  g.rect(0, 0, 15, 0, 'I').rect(0, 8, 15, 8, 'I').rect(8, 0, 8, 15, 'I')
  g.set(3 + shift, 3, 'h').set(4 + shift, 3, 'h').set(12 - shift, 11, 'h')
  return g.toPixels()
}
function shore(alt: boolean): Pixels {
  const g = sand()
  g.rect(0, 9, 15, 15, 'w')
  for (let x = 0; x < 16; x++) g.set(x, 8 + (x % 4 === (alt ? 2 : 0) ? 1 : 0), 'f')
  return g.toPixels()
}

/* ---------------- props (upright) ---------------- */

function palm(): Prop {
  const g = grid(32, 52)
  // trunk with rings, leaning slightly
  g.line(16, 51, 15, 22, 't', 3)
  for (let y = 24; y < 50; y += 4) g.line(15, y, 17, y, 'T')
  g.line(17, 26, 17, 50, 'u')
  // fronds
  g.poly([[16, 16], [1, 24], [4, 17]], 'e').poly([[16, 16], [31, 24], [28, 17]], '3')
  g.poly([[16, 15], [2, 8], [9, 9]], 'E').poly([[16, 15], [30, 8], [23, 9]], 'e')
  g.poly([[16, 15], [12, 2], [19, 3]], 'E').poly([[16, 16], [8, 27], [12, 19]], '3').poly([[16, 16], [24, 27], [20, 19]], 'e')
  g.ellipse(15, 18, 2.5, 2, 't').ellipse(18, 19, 2, 1.8, 'u')
  return { px: g.outline().toPixels(), anchorX: 16 }
}

function umbrella(): Prop {
  const g = grid(32, 38)
  g.line(16, 37, 16, 12, 'z', 2)
  g.poly([[1, 15], [16, 4], [31, 15]], 'r')
  for (const [a, b] of [[6, 10], [21, 26]]) g.poly([[a, 15], [16, 4], [b, 15]], 'h')
  g.rect(1, 15, 31, 16, 'R')
  g.set(16, 3, 'y')
  return { px: g.outline().toPixels(), anchorX: 16 }
}

function lamp(): Prop {
  const g = grid(10, 40)
  g.rect(4, 8, 5, 39, '9').rect(3, 36, 6, 39, 'z')
  g.ellipse(4.5, 5, 4, 4.5, 'y', 'a', 'h')
  g.rect(2, 9, 7, 10, '9')
  return { px: g.outline().toPixels(), anchorX: 5 }
}

function bench(): Prop {
  const g = grid(16, 14)
  g.rect(0, 2, 15, 4, 'T').rect(0, 6, 15, 8, 'T').rect(0, 4, 15, 4, 't').rect(0, 8, 15, 8, 't')
  g.rect(1, 9, 2, 13, '9').rect(13, 9, 14, 13, '9')
  return { px: g.outline().toPixels(), anchorX: 8 }
}

function sign(): Prop {
  const g = grid(16, 22)
  g.rect(7, 12, 8, 21, 't')
  g.rect(1, 1, 14, 12, 'T').rect(1, 11, 14, 12, 't')
  g.rect(3, 4, 12, 4, 'u').rect(3, 7, 10, 7, 'u')
  return { px: g.outline().toPixels(), anchorX: 8 }
}

/** A BW-style post box on a short post, like the ones outside every house. */
function mailbox(): Prop {
  const g = grid(14, 22)
  g.rect(6, 11, 7, 21, '8')
  g.rect(1, 2, 12, 11, 'r').rect(1, 9, 12, 11, 'R').rect(2, 2, 11, 3, '4')
  g.rect(3, 6, 10, 6, 'R')
  g.rect(12, 3, 13, 8, 'y').set(13, 9, 'Y')
  return { px: g.outline().toPixels(), anchorX: 7 }
}

/** A low stone planter of flowers, for the paving. */
function planter(): Prop {
  const g = grid(16, 14)
  g.rect(1, 7, 14, 13, 'X').rect(1, 7, 14, 8, 'x').rect(1, 12, 14, 13, '8')
  g.ellipse(8, 5, 7, 3.6, 'e', '3', 'E')
  dots(g, [[3, 4], [6, 2], [9, 4], [12, 3], [5, 6], [11, 6]], 'r')
  dots(g, [[4, 2], [8, 3], [13, 5], [7, 6]], 'y')
  dots(g, [[2, 6], [10, 2]], 'q')
  return { px: g.outline().toPixels(), anchorX: 8 }
}

function hedge(): Prop {
  const g = grid(16, 20)
  g.rect(0, 0, 15, 19, 'n')
  g.rect(0, 0, 15, 5, 'g')
  dots(g, [[2, 2], [7, 1], [12, 3], [4, 4], [10, 2]], 'E')
  dots(g, [[3, 9], [9, 12], [13, 8], [6, 15], [11, 17], [2, 16]], 'N')
  g.rect(0, 6, 15, 6, 'G')
  return { px: g.toPixels(), anchorX: 8 }
}

function plant(): Prop {
  const g = grid(16, 26)
  g.poly([[4, 18], [12, 18], [11, 25], [5, 25]], 'T')
  g.rect(4, 18, 12, 19, 't')
  g.ellipse(8, 10, 6.5, 6.5, 'e', '3', 'E')
  g.ellipse(4, 6, 3, 3.5, 'E', 'e').ellipse(12, 7, 3, 3.5, 'e', '3').ellipse(8, 3, 3, 3, 'E')
  return { px: g.outline().toPixels(), anchorX: 8 }
}

function counter(): Prop {
  const g = grid(16, 24)
  g.rect(0, 0, 15, 5, 'T').rect(0, 0, 15, 1, 'C')
  g.rect(0, 6, 15, 23, 't').rect(0, 6, 15, 6, 'u')
  for (let x = 3; x < 16; x += 8) g.rect(x, 9, x + 1, 21, 'u')
  return { px: g.toPixels(), anchorX: 8 }
}

function suggestionBox(): Prop {
  const g = grid(16, 26)
  g.rect(7, 16, 8, 25, '9')
  g.rect(2, 4, 13, 16, 'r').rect(10, 4, 13, 16, 'R')
  g.rect(2, 2, 13, 4, '4').rect(4, 7, 11, 8, 'K')
  g.rect(4, 11, 11, 13, 'h').set(5, 12, 'r').set(7, 12, 'r').set(9, 12, 'r')
  return { px: g.outline().toPixels(), anchorX: 8 }
}

/**
 * BW's round town tree: a short trunk under a dense canopy. Gen V foliage is many small leaf
 * clumps, each lit on its upper left and shaded below, with a scalloped edge, rather than a few
 * big blobs; the underside is darker where the canopy shades itself.
 */
function roundTree(): Prop {
  const g = grid(32, 46)
  g.rect(13, 32, 18, 45, 't').rect(16, 32, 18, 45, 'u')
  // the canopy's mass, then its shaded underside
  g.ellipse(15.5, 20, 15, 14, 'e', '3')
  g.ellipse(15.5, 28, 12.5, 5, '3', 'N')
  // clumps, back row first: each a small lit ball with a dark lower rim
  const clumps: Array<[number, number, number]> = [
    [8, 9, 4.2], [15.5, 6.5, 4.6], [23, 9, 4.2],
    [4.5, 16, 4], [11, 14, 4.4], [19, 13.5, 4.4], [26.5, 16, 4],
    [6, 23, 4.2], [13, 21, 4.6], [20.5, 21, 4.6], [27, 23, 3.8],
    [10, 27, 3.8], [17, 27.5, 4], [23.5, 27, 3.6],
  ]
  for (const [x, y, r] of clumps) {
    const low = y > 24
    g.ellipse(x, y, r, r * 0.9, low ? 'e' : 'E', low ? 'N' : '3', low ? undefined : 'g')
  }
  // a few leaf-tip highlights on the lit side
  for (const [x, y] of [[7, 7], [14, 4], [10, 12], [17, 11], [4, 14], [12, 19], [19, 19], [24, 7]]) g.set(x, y, 'g')
  return { px: g.outline().toPixels(), anchorX: 16 }
}

function fence(): Prop {
  const g = grid(16, 14)
  g.rect(0, 4, 15, 5, 'h').rect(0, 9, 15, 10, 'h')
  for (const x of [1, 7, 13]) g.rect(x, 1, x + 2, 13, 'h').rect(x + 2, 1, x + 2, 13, 'x').set(x + 1, 0, 'h')
  return { px: g.outline().toPixels(), anchorX: 8 }
}

function trophyCabinet(): Prop {
  const g = grid(16, 32)
  g.rect(0, 2, 15, 31, 't').rect(2, 4, 13, 28, '7').rect(3, 5, 12, 27, 'b').rect(3, 5, 5, 27, 'h')
  for (const [x, y] of [[6, 8], [9, 15], [6, 22]]) g.rect(x, y, x + 2, y + 2, 'y').set(x + 1, y + 3, 'Y').rect(x, y + 4, x + 2, y + 4, 'Y')
  g.rect(3, 13, 12, 13, 't').rect(3, 20, 12, 20, 't')
  return { px: g.outline().toPixels(), anchorX: 8 }
}

function balloons(): Prop {
  const g = grid(16, 36)
  g.line(8, 35, 5, 14, 'z').line(8, 35, 11, 12, 'z').line(8, 35, 8, 8, 'z')
  g.ellipse(4.5, 10, 4, 5, 'q', 'Q', '5').ellipse(11.5, 9, 4, 5, 'b', 'B', 'h').ellipse(8, 4, 4, 4.5, 'y', 'Y', 'h')
  g.rect(6, 33, 10, 35, 'z')
  return { px: g.outline().toPixels(), anchorX: 8 }
}

function merchRack(): Prop {
  const g = grid(16, 30)
  g.rect(1, 2, 2, 29, '9').rect(13, 2, 14, 29, '9').rect(1, 2, 14, 3, '9')
  for (const [x, c, d] of [[3, 'F', 'V'], [8, 'h', 'x']] as const) {
    g.poly([[x, 5], [x + 5, 5], [x + 6, 19], [x - 1, 19]], c).rect(x + 4, 5, x + 5, 19, d)
    g.rect(x + 1, 13, x + 4, 16, d)
  }
  g.rect(0, 27, 15, 29, 'z')
  return { px: g.outline().toPixels(), anchorX: 8 }
}

function toteBags(): Prop {
  const g = grid(16, 18)
  for (const [x, y] of [[1, 8], [7, 9], [4, 3]]) {
    g.rect(x, y, x + 8, y + 8, 'o').rect(x + 6, y, x + 8, y + 8, 'O')
    g.rect(x + 2, y + 3, x + 5, y + 5, 'y')
    g.line(x + 2, y, x + 4, y - 3, 'O').line(x + 6, y, x + 4, y - 3, 'O')
  }
  return { px: g.outline().toPixels(), anchorX: 8 }
}

function pillar(): Prop {
  const g = grid(16, 44)
  g.rect(3, 4, 12, 39, 'h').rect(10, 4, 12, 39, 'x').rect(5, 6, 5, 37, 'x')
  g.rect(1, 0, 14, 4, 'a').rect(1, 39, 14, 43, 'a').rect(1, 3, 14, 4, 'A').rect(1, 42, 14, 43, 'A')
  return { px: g.outline().toPixels(), anchorX: 8 }
}

/** Interior walls are tall, like BW rooms, so the room fills even a tall screen. */
const WALL_H = 88
/** Fixtures (PC, lift) sit at the bottom of the wall; this is how far down they start. */
const LOW = WALL_H - 44
function wallBase(): Grid {
  const g = grid(16, WALL_H)
  // wallpaper with a picture rail, then wainscoting and a skirting board
  g.rect(0, 0, 15, WALL_H - 1, 'x')
  g.rect(0, 0, 15, 3, 'X')
  for (let y = 8; y < LOW; y += 10) g.rect(0, y, 15, y, 'Z')
  g.rect(0, LOW, 15, LOW + 1, 'X')
  for (let y = LOW + 6; y < WALL_H - 6; y += 8) g.rect(0, y, 15, y, 'Z')
  g.rect(0, WALL_H - 6, 15, WALL_H - 1, '8').rect(0, WALL_H - 6, 15, WALL_H - 6, 'z')
  return g
}
function wall(): Prop {
  return { px: wallBase().toPixels(), anchorX: 8 }
}
function pcWall(): Prop {
  const g = wallBase()
  // a terminal standing against the wall
  g.rect(1, LOW + 14, 14, LOW + 43, '9').rect(2, LOW + 15, 13, LOW + 42, 'z')
  g.rect(3, LOW + 17, 12, LOW + 27, 'K').rect(4, LOW + 18, 11, LOW + 26, 'B').rect(5, LOW + 19, 8, LOW + 20, 'b')
  g.rect(4, LOW + 31, 11, LOW + 33, 'Z').rect(4, LOW + 36, 11, LOW + 37, 'K')
  g.set(11, LOW + 31, 'r')
  return { px: g.toPixels(), anchorX: 8 }
}
function liftWall(): Prop {
  const g = wallBase()
  g.rect(0, LOW + 6, 15, WALL_H - 1, '9').rect(1, LOW + 8, 14, WALL_H - 1, 'Z')
  g.rect(7, LOW + 8, 8, WALL_H - 1, 'K').rect(2, LOW + 10, 5, LOW + 12, 'h')
  g.rect(5, LOW + 2, 10, LOW + 4, 'y')
  return { px: g.toPixels(), anchorX: 8 }
}

/* ---------------- tile table ---------------- */

export const tiles: Record<string, TileDef> = {
  // outdoor ground
  ',': { px: grass().toPixels(), solid: false },
  f: { px: dots(grass(), [[3, 4], [11, 3], [6, 12], [13, 10], [9, 7]], 'r').stamp(9, 8, ['y']).stamp(2, 10, ['h']).stamp(12, 11, ['q']).toPixels(), solid: false },
  ':': { px: paving().toPixels(), solid: false },
  '=': {
    px: (() => {
      const g = fill('c')
      g.rect(0, 7, 15, 7, 'C').rect(0, 15, 15, 15, 'C').rect(7, 0, 7, 6, 'C').rect(15, 8, 15, 14, 'C')
      return g.toPixels()
    })(),
    solid: false,
  },
  _: { px: sand().toPixels(), solid: false },
  w: { px: water(0), frame2: water(3), solid: true },
  '~': { px: shore(false), frame2: shore(true), solid: true },
  p: { px: pool(0), frame2: pool(1), solid: true },
  // fountain footprint (the fountain itself is a structure)
  F: { px: paving().toPixels(), solid: true },
  // building footprints (hidden under their building sprite); doors are walk-in warps
  '#': { px: fill('9').toPixels(), solid: true },
  D: { px: fill('9').toPixels(), solid: false },
  E: { px: fill('9').toPixels(), solid: true },
  // standing props
  h: { px: fill('N').toPixels(), prop: hedge(), solid: true },
  T: { px: sand().toPixels(), prop: palm(), solid: true },
  Y: { px: grass().toPixels(), prop: palm(), solid: true },
  u: { px: sand().toPixels(), prop: umbrella(), solid: true },
  l: { px: paving().toPixels(), prop: lamp(), solid: true },
  b: { px: grass().toPixels(), prop: bench(), solid: true },
  s: { px: grass().toPixels(), prop: sign(), solid: true },
  // interior
  o: { px: floor().toPixels(), solid: false },
  c: { px: (() => fill('m').rect(0, 0, 0, 15, 'M').rect(15, 0, 15, 15, 'M'))().toPixels(), solid: false },
  a: { px: (() => fill('a').rect(0, 0, 0, 15, 'A').rect(15, 0, 15, 15, 'A').set(7, 7, 'h').set(8, 8, 'h'))().toPixels(), solid: false },
  X: { px: wallTop().toPixels(), prop: wall(), wall: true, solid: true },
  P: { px: wallTop().toPixels(), prop: pcWall(), wall: true, solid: true },
  L: { px: wallTop().toPixels(), prop: liftWall(), wall: true, solid: true },
  C: { px: fill('T').toPixels(), prop: counter(), solid: true },
  t: { px: floor().toPixels(), prop: plant(), solid: true },
  k: { px: floor().toPixels(), prop: suggestionBox(), solid: true },
  // town extras
  O: { px: grass().toPixels(), prop: roundTree(), solid: true },
  n: { px: grass().toPixels(), prop: fence(), solid: true },
  x: { px: paving().toPixels(), prop: mailbox(), solid: true },
  q: { px: paving().toPixels(), prop: planter(), solid: true },
  // tower floor themes (1 school pitch · 2 colour run · 3 ballroom · 4 tours · 5 = gold carpet 'a')
  '!': { px: (() => { const g = fill('g'); for (let x = 0; x < 16; x += 8) g.rect(x, 0, x + 3, 15, 'G'); return g.rect(0, 15, 15, 15, 'h').toPixels() })(), solid: false },
  '@': { px: dots(fill('h'), [[2, 3], [10, 2], [6, 9], [13, 12], [3, 13]], 'q').stamp(12, 6, ['b']).stamp(7, 4, ['y']).stamp(1, 8, ['e']).stamp(9, 14, ['b']).toPixels(), solid: false },
  '$': { px: (() => { const g = fill('M'); g.rect(0, 0, 15, 0, 'm').rect(0, 0, 0, 15, 'm'); return dots(g, [[7, 7], [8, 8], [7, 8], [8, 7]], 'y').toPixels() })(), solid: false },
  '%': { px: fill('y').rect(0, 15, 15, 15, 'Y').rect(15, 0, 15, 15, 'Y').toPixels(), solid: false },
  '&': { px: floor().toPixels(), prop: trophyCabinet(), solid: true },
  '+': { px: floor().toPixels(), prop: balloons(), solid: true },
  '*': { px: floor().toPixels(), prop: merchRack(), solid: true },
  '^': { px: floor().toPixels(), prop: toteBags(), solid: true },
  '|': { px: floor().toPixels(), prop: pillar(), solid: true },
  d: { px: (() => floor().rect(2, 2, 13, 13, 'z').rect(3, 3, 12, 12, 'Z').rect(5, 6, 10, 6, 'K').rect(6, 7, 9, 7, 'K').rect(7, 8, 8, 8, 'K'))().toPixels(), solid: false },
  m: { px: (() => floor().rect(1, 3, 14, 12, 'M').rect(2, 4, 13, 11, 'm'))().toPixels(), solid: false },
}
