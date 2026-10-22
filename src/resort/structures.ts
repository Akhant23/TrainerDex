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
  C: ['.##', '#..', '#..', '#..', '.##'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['#.#', '###', '###', '###', '#.#'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  '-': ['...', '...', '###', '...', '...'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '0': ['.#.', '#.#', '#.#', '#.#', '.#.'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '##.', '#.#', '.#.'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['.#.', '#.#', '.#.', '#.#', '.#.'],
  '9': ['.#.', '#.#', '.##', '..#', '##.'],
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

/* ---------------- BW-style houses: a big sloped roof, a sign and a door ---------------- */

interface HouseOpts {
  tiles: number
  /** roof [base, shade, light] palette keys */
  roof: [string, string, string]
  wall: [string, string]
  /** tile column (0-based) the door sits in — must match the door tile on the map */
  door: number
  label: string
  chimney?: boolean
}

function house(o: HouseOpts): Pixels {
  const W = o.tiles * 16
  const roofH = 40
  const H = roofH + 40
  const g = new Grid(W, H)
  const [rb, rs, rl] = o.roof
  // roof: a sloped plane seen from above, shingle rows, a light ridge and dark eaves
  g.poly([[4, 2], [W - 4, 2], [W, roofH], [0, roofH]], rb)
  g.poly([[W * 0.62, 2], [W - 4, 2], [W, roofH], [W * 0.66, roofH]], rs)
  for (let y = 8; y < roofH; y += 6) {
    const inset = 4 - (4 * y) / roofH
    for (let x = Math.ceil(inset); x < W - inset; x++) if (g.get(x, y) !== '.') g.set(x, y, rs)
  }
  g.rect(5, 2, W - 6, 4, rl)
  if (o.chimney) g.rect(W - 22, 0, W - 14, 10, 'T').rect(W - 22, 0, W - 14, 1, 'u')
  g.rect(0, roofH - 2, W - 1, roofH, '9')
  // facade
  const [wb, ws] = o.wall
  g.rect(1, roofH + 1, W - 2, H - 1, wb).rect(W - 10, roofH + 1, W - 2, H - 1, ws)
  g.rect(1, H - 3, W - 2, H - 1, '8')
  // windows either side of the door
  for (let c = 0; c < o.tiles; c++) {
    if (c === o.door) continue
    const x = c * 16 + 3
    g.rect(x, roofH + 16, x + 9, roofH + 27, '7').rect(x + 1, roofH + 17, x + 8, roofH + 26, 'b')
    g.rect(x + 1, roofH + 17, x + 8, roofH + 19, 'h').set(x + 2, roofH + 21, 'h')
    g.rect(x - 1, roofH + 28, x + 10, roofH + 29, ws)
  }
  // door with a little awning
  const dx = o.door * 16
  g.rect(dx + 1, roofH + 13, dx + 14, roofH + 15, rb).rect(dx + 1, roofH + 15, dx + 14, roofH + 15, rs)
  g.rect(dx + 3, roofH + 17, dx + 12, H - 2, '9').rect(dx + 4, roofH + 18, dx + 11, H - 2, 'z')
  g.rect(dx + 7, roofH + 18, dx + 8, H - 2, '9').set(dx + 10, roofH + 28, 'y')
  // name sign under the roof
  const tw = textWidth(o.label)
  const sx = Math.max(2, Math.floor((W - tw) / 2))
  g.rect(sx - 3, roofH + 3, sx + tw + 2, roofH + 11, '9').rect(sx - 2, roofH + 4, sx + tw + 1, roofH + 10, 'h')
  text(g, sx, roofH + 5, o.label, '9')
  g.outline()
  return g.toPixels()
}

/** A banner hung on a tower floor's back wall, themed to that stage of Aaryan's life. */
function banner(w: number, bg: [string, string], label: string, ink: string, deco: 'stars' | 'splash' | 'chandelier' | 'flags' | 'crown' | 'none', big = true): Pixels {
  const W = w * 16
  const H = 40
  const g = new Grid(W, H)
  g.rect(2, 6, W - 3, H - 8, bg[0]).rect(2, H - 10, W - 3, H - 8, bg[1])
  g.poly([[2, H - 8], [W / 2, H - 2], [W - 3, H - 8]], bg[1])
  const k = big ? 2 : 1
  const tw = textWidth(label) * k
  const sx = Math.floor((W - tw) / 2)
  const tmp = new Grid(textWidth(label), 5)
  text(tmp, 0, 0, label, ink)
  tmp.toPixels().forEach((row, y) => [...row].forEach((c, x) => c !== '.' && g.rect(sx + x * k, (big ? 14 : 17) + y * k, sx + x * k + k - 1, (big ? 14 : 17) + y * k + k - 1, c)))
  const dots = (pts: Array<[number, number, string]>) => pts.forEach(([x, y, c]) => g.rect(x, y, x + 1, y + 1, c))
  if (deco === 'stars') dots([[6, 9, 'y'], [W - 9, 9, 'y'], [8, 26, 'h'], [W - 11, 26, 'h']])
  if (deco === 'splash') dots([[6, 9, 'q'], [14, 26, 'b'], [W - 10, 10, 'y'], [W - 16, 25, 'e'], [W / 2, 8, 'r']])
  if (deco === 'flags') for (let x = 4; x < W - 4; x += 8) g.poly([[x, 6], [x + 6, 6], [x + 3, 11]], x % 16 ? 'y' : 'r')
  if (deco === 'crown') g.poly([[W / 2 - 8, 11], [W / 2 - 8, 4], [W / 2 - 4, 8], [W / 2, 2], [W / 2 + 4, 8], [W / 2 + 8, 4], [W / 2 + 8, 11]], 'y')
  g.rect(0, 2, W - 1, 4, '9')
  if (deco === 'chandelier') for (const cx of [10, W - 11]) g.rect(cx - 4, 7, cx + 4, 8, 'y').set(cx - 3, 10, 'h').set(cx, 11, 'h').set(cx + 3, 10, 'h')
  g.outline()
  return g.toPixels()
}

export const structureArt = {
  tower: tower(),
  studio: studio(),
  fountain: fountain(),
  home: house({ tiles: 6, roof: ['H', 'J', 'L'], wall: ['c', 'C'], door: 3, label: 'HOME', chimney: true }),
  lab: house({ tiles: 6, roof: ['V', 'U', 'F'], wall: ['x', 'X'], door: 2, label: 'DEX LAB' }),
  pc: house({ tiles: 5, roof: ['r', 'R', '4'], wall: ['x', 'X'], door: 2, label: 'PC CENTRE' }),
  gallery: house({ tiles: 5, roof: ['q', 'Q', '5'], wall: ['c', 'C'], door: 2, label: 'GALLERY' }),
  card: house({ tiles: 5, roof: ['y', 'Y', 'a'], wall: ['c', 'C'], door: 2, label: 'CARD HALL' }),
  post: house({ tiles: 4, roof: ['B', '7', 'b'], wall: ['x', 'X'], door: 1, label: 'PAGER' }),
  // tower floors: a stage banner and a year plaque on each back wall
  bannerSchool: banner(5, ['2', '9'], 'SBHS', 'h', 'stars'),
  bannerFirstYear: banner(5, ['h', 'x'], 'O-WEEK', 'q', 'splash'),
  bannerMarketing: banner(5, ['M', 'm'], 'LAW BALL', 'y', 'chandelier'),
  bannerTours: banner(5, ['y', 'Y'], 'TOURS', '9', 'flags'),
  bannerChampion: banner(5, ['a', 'A'], 'CHAMPION', 'M', 'crown'),
  yearSchool: banner(5, ['2', '9'], '2017-2022', 'h', 'none', false),
  yearFirstYear: banner(5, ['h', 'x'], '2023', 'q', 'none', false),
  yearMarketing: banner(5, ['M', 'm'], '2024-2025', 'y', 'none', false),
  yearTours: banner(5, ['y', 'Y'], '2025-2026', '9', 'none', false),
  yearChampion: banner(5, ['a', 'A'], 'NOW', 'M', 'none', false),
  // the Medal Box's hall
  bannerMedals: banner(6, ['M', 'm'], 'MEDAL HALL', 'y', 'stars'),
} as const
export type StructureKind = keyof typeof structureArt
