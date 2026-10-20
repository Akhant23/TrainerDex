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
}

const grid = (w = TILE, h = TILE) => new Grid(w, h)
const fill = (ch: string) => grid().rect(0, 0, 15, 15, ch)
const dots = (g: Grid, pts: Array<[number, number]>, ch: string) => (pts.forEach(([x, y]) => g.set(x, y, ch)), g)

/* ---------------- ground ---------------- */

const grass = () => dots(fill('g'), [[2, 3], [3, 2], [10, 5], [11, 4], [6, 11], [7, 10], [13, 13], [14, 12], [1, 14], [8, 1]], 'G')
const sand = () => dots(fill('s'), [[3, 4], [11, 2], [7, 9], [13, 12], [2, 13], [9, 14]], 'S')
/** City paving: large light slabs with darker joints, like BW's plazas. */
const paving = () => {
  const g = fill('p')
  g.rect(0, 15, 15, 15, 'P').rect(15, 0, 15, 15, 'P').rect(0, 7, 15, 7, '1').rect(7, 0, 7, 7, '1')
  return dots(g, [[3, 3], [11, 11], [12, 4]], '1')
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

const WALL_H = 44
function wallBase(): Grid {
  const g = grid(16, WALL_H)
  g.rect(0, 0, 15, WALL_H - 1, 'x')
  g.rect(0, 0, 15, 3, 'X')
  for (let y = 6; y < WALL_H - 6; y += 8) g.rect(0, y, 15, y, 'Z')
  g.rect(0, WALL_H - 6, 15, WALL_H - 1, '8').rect(0, WALL_H - 6, 15, WALL_H - 6, 'z')
  return g
}
function wall(): Prop {
  return { px: wallBase().toPixels(), anchorX: 8 }
}
function pcWall(): Prop {
  const g = wallBase()
  // a terminal standing against the wall
  g.rect(1, 14, 14, 43, '9').rect(2, 15, 13, 42, 'z')
  g.rect(3, 17, 12, 27, 'K').rect(4, 18, 11, 26, 'B').rect(5, 19, 8, 20, 'b')
  g.rect(4, 31, 11, 33, 'Z').rect(4, 36, 11, 37, 'K')
  g.set(11, 31, 'r')
  return { px: g.toPixels(), anchorX: 8 }
}
function liftWall(): Prop {
  const g = wallBase()
  g.rect(0, 6, 15, WALL_H - 1, '9').rect(1, 8, 14, WALL_H - 1, 'Z')
  g.rect(7, 8, 8, WALL_H - 1, 'K').rect(2, 10, 5, 12, 'h')
  g.rect(5, 2, 10, 4, 'y')
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
  d: { px: (() => floor().rect(2, 2, 13, 13, 'z').rect(3, 3, 12, 12, 'Z').rect(5, 6, 10, 6, 'K').rect(6, 7, 9, 7, 'K').rect(7, 8, 8, 8, 'K'))().toPixels(), solid: false },
  m: { px: (() => floor().rect(1, 3, 14, 12, 'M').rect(2, 4, 13, 11, 'm'))().toPixels(), solid: false },
}
