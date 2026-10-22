/**
 * The main menu's backdrop silhouettes, drawn pixel by pixel in code: a far band of Sydney (the
 * CBD's towers round Sydney Tower, the Harbour Bridge's arch, the Opera House's sails) and a
 * near band of the Battle Resort's roofline (the Battle Tower, roofs, a dome, palms). Each is a
 * one-colour mask that tiles left to right, with a second mask of windows that light up after
 * dark. Plus the sky's few sprites: a sun, a moon and a cloud.
 */

export interface Silhouette {
  w: number
  h: number
  /** 1 where the silhouette is solid, row by row */
  body: Uint8Array
  /** 1 where a window glows at dusk and night (always inside the body) */
  lights: Uint8Array
}

class Mask {
  readonly w: number
  readonly h: number
  readonly body: Uint8Array
  readonly lights: Uint8Array
  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.body = new Uint8Array(w * h)
    this.lights = new Uint8Array(w * h)
  }
  /** Set a pixel, counted up from the ground (y = 0 is the bottom row); x wraps so the band tiles. */
  set(x: number, y: number, on = 1, layer: 'body' | 'lights' = 'body') {
    const ix = ((Math.round(x) % this.w) + this.w) % this.w
    const iy = this.h - 1 - Math.round(y)
    if (iy < 0 || iy >= this.h) return
    this[layer][iy * this.w + ix] = on
  }
  /** A solid block from x0..x1 (inclusive), ground up to height `top`. */
  block(x0: number, x1: number, top: number, from = 0) {
    for (let x = x0; x <= x1; x++) for (let y = from; y < top; y++) this.set(x, y)
  }
  /** A lit window grid on a block: every `dx` columns and `dy` rows, some left dark. */
  windows(x0: number, x1: number, top: number, seed: number, dx = 2, dy = 3, from = 2) {
    let s = seed
    for (let y = from; y < top - 2; y += dy)
      for (let x = x0 + 1; x < x1; x += dx) {
        s = (s * 1103515245 + 12345) >>> 0
        if (s % 5 < 3) this.set(x, y, 1, 'lights')
      }
  }
  done(): Silhouette {
    return { w: this.w, h: this.h, body: this.body, lights: this.lights }
  }
}

export const SYDNEY_W = 256
export const SYDNEY_H = 44

/** Sydney, far off: the CBD with Sydney Tower, the Harbour Bridge, the Opera House. */
export function sydney(): Silhouette {
  const m = new Mask(SYDNEY_W, SYDNEY_H)
  // the harbour's edge, all the way along
  m.block(0, SYDNEY_W - 1, 2)

  // the CBD: towers of different heights, each with its windows
  const towers: Array<[number, number, number]> = [
    [2, 11, 17],
    [12, 18, 25],
    [19, 28, 14],
    [34, 41, 22],
    [42, 50, 28],
    [51, 58, 19],
    [59, 64, 12],
  ]
  towers.forEach(([x0, x1, top], i) => {
    m.block(x0, x1, top)
    m.windows(x0, x1, top, 17 + i * 31)
  })
  // Sydney Tower: a thin shaft, the turret (a wide drum with a lip), a spire
  m.block(30, 32, 34)
  m.block(27, 35, 37, 33)
  m.block(28, 34, 38, 37)
  m.block(31, 31, 43, 38)
  for (const x of [28, 30, 32, 34]) m.set(x, 35, 1, 'lights')

  // the Harbour Bridge: two granite pylons, a deck, and the arch with its hangers
  const [a0, a1, deck] = [86, 160, 8]
  const pylon = (x0: number) => {
    m.block(x0, x0 + 6, 17)
    m.block(x0 + 1, x0 + 5, 18, 17)
    m.set(x0 + 3, 14, 0)
  }
  pylon(a0 - 7)
  pylon(a1 + 1)
  m.block(a0 - 16, a1 + 16, deck + 1, deck - 1)
  for (let x = a0 - 16; x <= a1 + 16; x += 3) m.set(x, deck - 2) // the deck's piers into the water
  for (let x = a0; x <= a1; x++) {
    const t = (x - a0) / (a1 - a0)
    const top = deck + 2 + Math.round(20 * Math.sin(Math.PI * t))
    const low = deck + Math.round(14 * Math.sin(Math.PI * t))
    m.set(x, top)
    m.set(x, top - 1)
    m.set(x, Math.max(low, deck + 1))
    // the hangers and the lattice between the chords
    if ((x - a0) % 4 === 0) for (let y = deck + 1; y < top; y++) m.set(x, y)
    else if ((x - a0) % 4 === 2) for (let y = Math.max(low, deck + 1); y < top; y++) m.set(x, y)
  }

  // the Opera House: a podium and its sails, each a shell leaning out over the next
  m.block(180, 240, 5)
  const sails: Array<[number, number, number]> = [
    [184, 15, 13],
    [195, 17, 18],
    [209, 14, 15],
    [220, 11, 11],
    [229, 8, 8],
  ]
  for (const [bx, w, h] of sails) {
    // row by row: the front edge leans out toward the tip, the back curves down to the podium
    for (let y = 0; y < h; y++) {
      const t = 1 - Math.pow(y / h, 1 / 0.55)
      const x0 = bx - Math.round((3 * y) / h)
      for (let x = x0; x <= bx + Math.round(w * t); x++) m.set(x, 5 + y)
      // a pixel of sky between this shell and the one behind it
      m.set(x0 - 1, 5 + y, 0)
    }
  }
  // a few low harbourside buildings to finish the tile
  m.block(244, 249, 7)
  m.block(250, 254, 5)
  m.windows(244, 249, 7, 91, 2, 2)
  return m.done()
}

export const RESORT_W = 192
export const RESORT_H = 30

/** The Battle Resort, near: the Battle Tower, pitched roofs, a domed hall, palms, a hedge line. */
export function resort(): Silhouette {
  const m = new Mask(RESORT_W, RESORT_H)
  m.block(0, RESORT_W - 1, 3)

  // the Battle Tower: a stepped tower with a crown, a beacon on a mast
  m.block(14, 31, 9)
  m.block(16, 29, 19)
  m.block(18, 27, 24)
  m.block(20, 25, 26)
  m.block(22, 23, 29)
  for (const [x0, x1, y0, y1] of [[16, 29, 4, 8], [18, 27, 10, 18], [20, 25, 20, 23]] as const)
    for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 3) m.set(x, y, 1, 'lights')

  // houses with pitched roofs
  const house = (x0: number, w: number, wall: number) => {
    m.block(x0, x0 + w, wall)
    const mid = x0 + w / 2
    for (let x = x0 - 1; x <= x0 + w + 1; x++) {
      const top = wall + Math.round((w / 2 + 1 - Math.abs(x - mid)) * 0.7)
      for (let y = wall; y < top; y++) m.set(x, y)
    }
    m.windows(x0, x0 + w, wall, x0 * 7, 3, 3)
  }
  house(42, 16, 8)
  house(122, 14, 7)
  house(140, 10, 9)

  // the domed hall
  m.block(70, 94, 9)
  for (let x = 72; x <= 92; x++) {
    const t = (x - 82) / 10
    const top = 9 + Math.round(9 * Math.sqrt(Math.max(0, 1 - t * t)))
    for (let y = 9; y < top; y++) m.set(x, y)
  }
  m.block(82, 82, 21, 18)
  m.windows(70, 94, 9, 5, 3, 3)

  // palms: a leaning trunk and drooping fronds
  const palm = (x0: number, h: number, lean: number) => {
    for (let y = 3; y <= h; y++) m.set(x0 + Math.round((lean * (y - 3) * (y - 3)) / (h * h)), y)
    const tx = x0 + lean
    // a tuft on top, and on each side an upper frond arching out and a lower one hanging down
    for (const [dx, dy] of [[0, 1], [-1, 1], [1, 1], [0, 2]]) m.set(tx + dx, h + dy)
    for (const dir of [-1, 1]) {
      for (const [dx, dy] of [[1, 1], [2, 1], [3, 1], [4, 0], [5, 0], [6, -1], [7, -2]]) m.set(tx + dir * dx, h + dy)
      for (const [dx, dy] of [[1, 0], [2, 0], [3, -1], [4, -2], [4, -3]]) m.set(tx + dir * dx, h + dy)
    }
  }
  palm(106, 17, 2)
  palm(112, 13, -1)
  palm(162, 16, 1)
  palm(184, 12, -2)

  // a hedge along the front, bumpy
  for (let x = 0; x < RESORT_W; x++) if ((x * 7) % 5 < 3) m.set(x, 3)
  return m.done()
}

/** A small pixel sprite as rows ('#' solid, '+' a second tone, '.' clear). */
export type Sprite = readonly string[]

export const SUN: Sprite = [
  '....####....',
  '..########..',
  '.##########.',
  '.##########.',
  '############',
  '############',
  '############',
  '############',
  '.##########.',
  '.##########.',
  '..########..',
  '....####....',
]

export const MOON: Sprite = [
  '....####....',
  '..#####.....',
  '.#####......',
  '.####.......',
  '#####.......',
  '####........',
  '####........',
  '#####.......',
  '.####.......',
  '.#####......',
  '..#####.....',
  '....####....',
]

export const CLOUD: Sprite = [
  '........####............',
  '.....#########..........',
  '....###########.####....',
  '..######################',
  '.#######################',
  '########################',
  '.######################.',
]
