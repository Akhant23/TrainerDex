/**
 * Resort buildings: large upright sprites standing on a footprint of solid tiles. Each is drawn
 * as if seen from above at an angle (a visible roof slab over the facade), which, standing in
 * the 2.5D world, gives the Black & White city look. All original pixel art.
 */
import { Grid } from '../sprites/raster.ts'
import type { Pixels } from '../sprites/pixels.ts'

export interface StructureArt {
  px: Pixels
  /** base point (front-left corner of the footprint) is at (0, px.length) */
}

/* A tiny 3×5 pixel font for building signs. */
const FONT: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '#.#', '###', '#.#'],
  ' ': ['...', '...', '...', '...', '...'],
}
function text(g: Grid, x: number, y: number, s: string, ch: string) {
  let cx = x
  for (const c of s) {
    const glyph = FONT[c] ?? FONT[' ']
    glyph.forEach((row, dy) => [...row].forEach((p, dx) => p === '#' && g.set(cx + dx, y + dy, ch)))
    cx += 4
  }
}
const textWidth = (s: string) => s.length * 4 - 1

/** The Battle Tower: 10 tiles wide, glass-and-steel, red sign band, sliding doors in the middle. */
function tower(): Pixels {
  const W = 160
  const H = 132
  const g = new Grid(W, H)
  // roof slab seen from above
  g.poly([[8, 0], [152, 0], [160, 22], [0, 22]], 'x')
  g.poly([[8, 0], [152, 0], [153, 3], [7, 3]], 'X')
  g.rect(24, 6, 40, 14, 'Z').rect(24, 13, 40, 14, '8')
  g.rect(118, 6, 136, 15, 'Z').rect(118, 14, 136, 15, '8')
  g.ellipse(80, 11, 14, 6, '1').ellipse(80, 11, 11, 4.4, 'P')
  text(g, 76, 9, 'B', 'y')
  // facade
  g.rect(0, 22, W - 1, H - 1, 'Z')
  g.rect(0, 22, W - 1, 24, '8')
  g.rect(140, 25, W - 1, H - 1, 'X')
  // red sign band with the name
  g.rect(0, 28, W - 1, 46, 'r').rect(0, 28, W - 1, 29, '4').rect(0, 45, W - 1, 46, 'R')
  const label = 'BATTLE TOWER'
  const lw = textWidth(label) * 2
  // double-size letters
  const sx = Math.floor((W - lw) / 2)
  const tmp = new Grid(textWidth(label), 5)
  text(tmp, 0, 0, label, 'h')
  tmp.toPixels().forEach((row, y) => [...row].forEach((c, x) => c !== '.' && g.rect(sx + x * 2, 33 + y * 2, sx + x * 2 + 1, 33 + y * 2 + 1, 'h')))
  // a gold star either side
  for (const cx of [14, 145]) g.poly([[cx, 30], [cx + 3, 36], [cx + 9, 37], [cx + 4, 40], [cx + 6, 45], [cx, 42], [cx - 6, 45], [cx - 4, 40], [cx - 9, 37], [cx - 3, 36]], 'y')
  // glass storeys
  for (let row = 0; row < 2; row++) {
    const y = 52 + row * 18
    for (let col = 0; col < 8; col++) {
      const x = 6 + col * 19
      g.rect(x, y, x + 14, y + 12, '7').rect(x + 1, y + 1, x + 13, y + 11, 'B')
      g.rect(x + 1, y + 1, x + 13, y + 3, 'b').set(x + 2, y + 5, 'h').set(x + 3, y + 4, 'h')
    }
    g.rect(0, y + 14, W - 1, y + 15, 'X')
  }
  // pillars
  for (const x of [0, 52, 106, 156]) g.rect(x, 50, x + 3, H - 1, '8')
  // entrance canopy + sliding doors (lined up with the door tiles: columns 4–5 of the footprint)
  g.rect(52, 88, 107, 93, 'r').rect(52, 93, 107, 94, 'R')
  g.rect(60, 95, 99, H - 1, '9')
  g.rect(62, 97, 79, H - 1, 'b').rect(80, 97, 97, H - 1, 'b')
  g.rect(79, 97, 80, H - 1, 'K')
  g.rect(63, 98, 66, 122, 'h').rect(81, 98, 84, 122, 'h')
  // planters by the door
  for (const x of [40, 110]) g.rect(x, 118, x + 10, H - 1, 't').ellipse(x + 5, 115, 6, 4, 'e', '3', 'E')
  g.outline()
  return g.toPixels()
}

/** The Avatar Studio: a small pink-roofed boutique with a big shop window. 4 tiles wide. */
function studio(): Pixels {
  const W = 64
  const H = 80
  const g = new Grid(W, H)
  // rounded roof
  g.poly([[4, 6], [60, 6], [64, 26], [0, 26]], 'q')
  g.ellipse(32, 8, 28, 7, 'q', undefined, '5')
  g.poly([[0, 20], [64, 20], [64, 26], [0, 26]], 'Q')
  g.rect(0, 22, 63, 23, 'h')
  // facade
  g.rect(0, 26, 63, H - 1, 'c').rect(52, 27, 63, H - 1, 'C')
  // sign
  g.rect(10, 30, 53, 40, 'q').rect(10, 39, 53, 40, 'Q')
  const label = 'STUDIO'
  text(g, Math.floor((W - textWidth(label)) / 2), 33, label, 'h')
  // shop window (right) and door (column 1 → x 16–31)
  g.rect(36, 46, 58, 70, '7').rect(37, 47, 57, 69, 'b').rect(37, 47, 57, 52, 'h')
  g.rect(42, 58, 44, 69, 'q').rect(50, 56, 52, 69, 'y')
  g.rect(16, 46, 31, H - 1, '9').rect(18, 48, 29, H - 1, 'k').rect(23, 48, 24, H - 1, 'Q')
  g.rect(26, 62, 27, 64, 'y')
  // awning stripes
  for (let x = 0; x < 64; x += 8) g.rect(x, 41, x + 3, 44, 'q').rect(x + 4, 41, x + 7, 44, 'h')
  g.outline()
  return g.toPixels()
}

/** A round fountain on a 2×2 footprint: stone basin, water and a jet. */
function fountain(): Pixels {
  const g = new Grid(32, 40)
  g.ellipse(15.5, 30, 15.5, 9, 'Z', 'z', 'x')
  g.ellipse(15.5, 29, 12.5, 6.5, 'i', 'I')
  g.ellipse(15.5, 27, 4, 2, 'Z', 'z')
  g.rect(14, 12, 17, 27, 'W').rect(16, 12, 17, 27, 'b')
  g.ellipse(15.5, 9, 6, 4, 'W', 'b', 'h')
  for (const [x, y] of [[8, 14], [23, 14], [5, 20], [26, 20]]) g.set(x, y, 'W')
  g.set(11, 28, 'h').set(12, 28, 'h').set(20, 31, 'h')
  g.outline()
  return g.toPixels()
}

export const structureArt = { tower: tower(), studio: studio(), fountain: fountain() } as const
export type StructureKind = keyof typeof structureArt
