/**
 * Parametric character model, Black/White-style.
 *
 * One `Appearance` (skin, hair, eyes, face, clothes, accessories) renders to:
 *   - an 80×120 battle sprite split into layers (back hair, legs, torso, arms, head) so the UI can
 *     animate each part independently like BW's idle loops;
 *   - a flattened frame (cards, thumbnails, exports).
 * Aaryan's sprites and every visitor's custom avatar come from this same model.
 * Coordinates are continuous (pixel x covers [x, x+1)), so the figure is symmetric about x = 40.
 * Light comes from the upper left: shading falls on the right of every shape.
 * Pure TypeScript (no DOM) so tests and the export script can use it.
 */
import { Grid, HiGrid, type Raster } from './raster.ts'
import type { Palette, Pixels } from './pixels.ts'

export const CHAR_W = 80
export const CHAR_H = 120
/** Head-and-shoulders crop used for portraits and avatar icons. */
export const PORTRAIT = { x: 20, y: 2, w: 40, h: 46 } as const

/* ---------------- Options ---------------- */

export const SKINS = {
  porcelain: ['#f8e0cc', '#e2bca0', '#fff0e4'],
  light: ['#f0c8a0', '#d6a47c', '#fbe0c4'],
  tan: ['#d9a679', '#b98256', '#ecc39c'],
  brown: ['#b9805a', '#8f5c3e', '#d49a70'],
  deep: ['#8a5a3c', '#66402a', '#a8724e'],
  dark: ['#5e3a26', '#44281a', '#7a4e36'],
} as const
export const HAIR_COLOURS = {
  black: ['#241c1e', '#100c10', '#4a3c3e'],
  darkBrown: ['#3a2620', '#22140f', '#5e4034'],
  brown: ['#6a4028', '#4a2a18', '#946040'],
  auburn: ['#8a3a20', '#5e2412', '#b85c34'],
  blonde: ['#e0b850', '#b08a30', '#f6dc8c'],
  platinum: ['#e4e0d8', '#b4b0a8', '#ffffff'],
  blue: ['#3a5ad0', '#24388a', '#6a8af0'],
  pink: ['#e070a0', '#a84070', '#f8a4c8'],
} as const
export const CLOTH_COLOURS = {
  white: ['#f6f6f2', '#c9cdd9', '#ffffff'],
  black: ['#2a2a33', '#18181f', '#46465a'],
  grey: ['#8a90a0', '#646a78', '#b0b6c4'],
  red: ['#d12f3c', '#8e1f2b', '#f05a64'],
  maroon: ['#6a2430', '#46141e', '#8e3a46'],
  brown: ['#4a3024', '#2e1c14', '#6a4636'],
  navy: ['#26345e', '#161f3c', '#3e4e84'],
  blue: ['#3a7fe0', '#24529a', '#70a8f8'],
  teal: ['#1f8a8a', '#11585a', '#4ab4b0'],
  green: ['#2f8a4c', '#1c5c30', '#56b070'],
  yellow: ['#f4c838', '#c09418', '#fce07c'],
  lavender: ['#a890e0', '#7860b0', '#cab8f4'],
  pink: ['#f090b0', '#c0607e', '#fab8cc'],
  orange: ['#f07828', '#b04e14', '#f8a060'],
  tan: ['#c8a878', '#9a7c50', '#e4c89c'],
} as const
export const EYE_COLOURS = { brown: '#5a3220', dark: '#1c1a24', blue: '#2a64c8', green: '#2a8a4c' } as const

export { HAIR_STYLES, EYE_STYLES, FACES, TOPS, HATS, BOTTOMS, SHOES, ACCESSORIES, MAX_ACCESSORIES } from '../../supabase/functions/_shared/appearance.ts'
import type { AppearanceData } from '../../supabase/functions/_shared/appearance.ts'

export type SkinId = keyof typeof SKINS
export type HairColourId = keyof typeof HAIR_COLOURS
export type ClothColourId = keyof typeof CLOTH_COLOURS
export type EyeColourId = keyof typeof EYE_COLOURS

export type Appearance = AppearanceData

/* ---------------- Palette ---------------- */

function darken(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function paletteFor(a: Appearance): Palette {
  const sk = SKINS[a.skin]
  const hr = HAIR_COLOURS[a.hairColour]
  const tp = CLOTH_COLOURS[a.topColour]
  const ac = CLOTH_COLOURS[a.accentColour]
  const bt = CLOTH_COLOURS[a.bottomColour]
  const sh = CLOTH_COLOURS[a.shoeColour]
  const ht = CLOTH_COLOURS[a.hatColour]
  return {
    K: '#1c1a24', // outline
    S: sk[0], s: sk[1], T: sk[2], O: darken(sk[1], 0.82),
    H: hr[0], j: hr[1], h: hr[2],
    A: tp[0], a: tp[1], Q: tp[2],
    R: ac[0], r: ac[1], q: ac[2],
    B: bt[0], b: bt[1], P: bt[2],
    F: sh[0], f: sh[1], e: sh[2],
    Y: ht[0], y: ht[1],
    G: '#f4f4ee', g: '#c8ccd8', // white shirt / soles
    V: '#34343e', v: '#22222a', // dark shirt under a suit
    E: EYE_COLOURS[a.eyeColour],
    W: '#ffffff',
    L: '#c4dcf0', // lens tint
    l: '#7896b4',
    X: '#e2e8f0', // silver
    x: '#98a2b4',
    D: '#e0b040', // gold (crests)
    Z: '#2a2a33', // dark accessory
    z: '#46465a',
    M: '#8a4a40', // mouth
    U: '#8cb8e8', u: '#5a88c0', // school blazer piping
    N: '#f070b0', J: '#4aa0f0', I: '#58c870', C: '#f8d040', // paint-powder splashes
  }
}

/* ---------------- Drawing helpers (continuous coordinates) ---------------- */

export type Pt = [number, number]

/** Filled ellipse; `shade` on the right/bottom-right, `light` on the upper-left rim. */
export function oval(g: Raster, cx: number, cy: number, rx: number, ry: number, ch: string, shade?: string, light?: string, shadeAt = 0.45) {
  g.sample(cx - rx - 1, cy - ry - 1, cx + rx, cy + ry, (px, py) => {
    const dx = (px - cx) / rx
    const dy = (py - cy) / ry
    if (dx * dx + dy * dy > 1) return null
    if (shade && dx * 0.85 + dy * 0.35 > shadeAt) return shade
    if (light && dx * 0.6 + dy * 0.8 < -0.72) return light
    return ch
  })
}

/**
 * A tapered capsule from p0 (radius r0) to p1 (radius r1), shaded on its right side. With `cut`,
 * the p1 end is squared off instead of rounded (a sleeve's hem).
 */
export function capsule(g: Raster, p0: Pt, p1: Pt, r0: number, r1: number, ch: string, shade?: string, light?: string, cut = false) {
  const [x0, y0] = p0
  const [x1, y1] = p1
  const vx = x1 - x0
  const vy = y1 - y0
  const len2 = vx * vx + vy * vy || 1
  const r = Math.max(r0, r1)
  g.sample(Math.min(x0, x1) - r - 1, Math.min(y0, y1) - r - 1, Math.max(x0, x1) + r, Math.max(y0, y1) + r, (px, py) => {
    const raw = ((px - x0) * vx + (py - y0) * vy) / len2
    if (cut && raw > 1) return null
    const t = Math.max(0, Math.min(1, raw))
    const cx = x0 + vx * t
    const cy = y0 + vy * t
    const rr = r0 + (r1 - r0) * t
    if (Math.hypot(px - cx, py - cy) > rr) return null
    // how far toward the right-hand rim this point sits (-1 … 1)
    const side = (px - cx) / rr
    if (shade && side > 0.3) return shade
    if (light && side < -0.7) return light
    return ch
  })
}

export function chain(g: Raster, pts: Pt[], a = 'X', b = 'x') {
  let i = 0
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, y0] = pts[k]
    const [x1, y1] = pts[k + 1]
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)))
    for (let s = 0; s <= n; s++) g.set(Math.floor(x0 + ((x1 - x0) * s) / n), Math.floor(y0 + ((y1 - y0) * s) / n), i++ % 2 ? b : a)
  }
}

const M = (x: number) => 80 - x // mirror about the centre line

/** Resolution the layers are rasterised at: 1 = 80×120, 2 = 160×240 (same art, finer pixels). */
let K = 1
const canvas = (): Raster => (K === 1 ? new Grid(CHAR_W, CHAR_H) : new HiGrid(CHAR_W, CHAR_H, K))
/** Run a renderer at k× resolution. */
export function atResolution<T>(k: number, fn: () => T): T {
  const prev = K
  K = k
  try {
    return fn()
  } finally {
    K = prev
  }
}
const mirrorRow = (r: string) => [...r].reverse().join('')

/* ---------------- Layers ---------------- */

export type ArmPose = 'idle' | 'raised' | 'point'

/** How a hand is drawn at the end of an articulated arm. */
export type HandShape = 'relaxed' | 'fist' | 'open' | 'pointOut' | 'pocket' | 'hooked' | 'hidden'
/** An arm placed by its elbow and wrist (base pixels); the shoulder is fixed per side. */
export interface ArmSpec {
  el: Pt
  wr: Pt
  hand: HandShape
}
/**
 * One frame of a gesture. Anything left out keeps the standing idle: the back arm relaxed, the
 * front hand in its pocket, eyes open, the appearance's own mouth.
 */
export interface PoseFrame {
  back?: ArmSpec
  front?: ArmSpec
  /** draw the arms behind the head and back hair (hands behind the head) */
  armsBehind?: boolean
  eyes?: 'open' | 'down' | 'closed'
  mouth?: Appearance['face']
  /** raise the right brow (a smirk) */
  brow?: 'up'
  /** hair being ruffled: which set of tufts is lifted */
  ruffle?: 0 | 1 | 2
  /** extra head dip in pixels (glancing down) */
  tilt?: number
}
export interface CharacterLayers {
  hairBack: Pixels
  legs: Pixels
  torso: Pixels
  armBack: Pixels
  armFront: Pixels
  head: Pixels
  headBlink: Pixels
}

const UNTUCKED = new Set<Appearance['top']>(['tee', 'splash', 'jersey', 'hoodie', 'jacket', 'tank'])
const TEES = new Set<Appearance['top']>(['tee', 'splash', 'jersey'])
const BLAZERS = new Set<Appearance['top']>(['blazer', 'suit', 'school'])

function hairBack(a: Appearance): Pixels {
  const g = canvas()
  switch (a.hair) {
    case 'wavy':
      oval(g, 40, 14, 13, 11.5, 'H', 'j', 'h')
      oval(g, 29, 19, 3.5, 5, 'H', 'j')
      oval(g, 51, 19, 3.5, 5, 'j')
      break
    case 'mullet':
      // the wavy top, plus a modern mullet: longer, layered hair at the nape
      oval(g, 40, 14, 13, 11.5, 'H', 'j', 'h')
      g.poly([[33, 22], [47, 22], [48.6, 30], [48, 38], [45.5, 35.5], [43, 39], [40, 36.5], [37, 39], [34.5, 35.5], [32, 38], [31.4, 30]], 'H')
      g.poly([[44, 22], [47, 22], [48.6, 30], [48, 38], [45.5, 35.5], [44.5, 30]], 'j')
      g.line(33, 30, 33.5, 36, 'h').line(36, 32, 36.5, 37, 'j')
      break
    case 'curtains':
      oval(g, 40, 14, 12.5, 11, 'H', 'j', 'h')
      g.poly([[28, 14], [52, 14], [52.5, 27], [27.5, 27]], 'H')
      g.poly([[46, 14], [52, 14], [52.5, 27], [47, 27]], 'j')
      break
    case 'curly':
      oval(g, 40, 15, 15.5, 13.5, 'H', 'j', 'h')
      for (const [x, y] of [[26, 22], [54, 22], [27, 10], [53, 10], [40, 2.5], [32, 4], [48, 4]]) oval(g, x, y, 4.2, 4.2, 'H', 'j')
      break
    case 'long':
      oval(g, 40, 15, 13, 12, 'H', 'j', 'h')
      g.poly([[27, 16], [53, 16], [55, 52], [25, 52]], 'H')
      g.poly([[47, 16], [53, 16], [55, 52], [49, 52]], 'j')
      break
    case 'bun':
      oval(g, 40, 15, 11.5, 11, 'H', 'j')
      oval(g, 40, 4, 5, 4, 'H', 'j', 'h')
      break
    default:
      oval(g, 40, 15, 11.5, 11, 'H', 'j')
  }
  clipUnderHat(g, a)
  return g.outline().toPixels()
}

/** Hats sit on top of the hair: nothing of the hair pokes out above the brim. */
export const HAT_BRIM: Partial<Record<Appearance['hat'], number>> = { cap: 12, beanie: 12, bucket: 11 }
function clipUnderHat(g: Raster, a: Appearance) {
  const brim = HAT_BRIM[a.hat]
  if (brim === undefined) return
  for (let y = 0; y < brim; y++) for (let x = 0; x < CHAR_W; x++) if ('Hjh'.includes(g.get(x, y))) g.set(x, y, '.')
}

function legs(a: Appearance): Pixels {
  const g = canvas()
  const bare = a.bottom === 'shorts' || a.bottom === 'skirt'
  const hipL: Pt = [34.6, 74]
  const kneeL: Pt = [34, 92]
  const ankleL: Pt = [33.8, 106]
  const hipR: Pt = [M(34.6), 74]
  const kneeR: Pt = [M(34), 92]
  const ankleR: Pt = [M(33.8), 106]

  // skin below shorts / skirt
  if (bare) {
    for (const [k, an] of [[kneeL, ankleL], [kneeR, ankleR]] as Array<[Pt, Pt]>) {
      capsule(g, [k[0], 84], k, 4.4, 4.4, 'S', 's')
      capsule(g, k, an, 4.2, 3.2, 'S', 's')
    }
  }
  // trousers / shorts / skirt
  if (a.bottom === 'skirt') {
    g.poly([[29, 64], [51, 64], [56, 86], [24, 86]], 'B')
    g.poly([[44, 64], [51, 64], [56, 86], [47, 86]], 'b')
  } else {
    const end = bare ? 85 : 106
    const clip = (p: Pt): Pt => [p[0], Math.min(p[1], end)]
    for (const [h, k, an] of [[hipL, kneeL, ankleL], [hipR, kneeR, ankleR]] as Array<[Pt, Pt, Pt]>) {
      capsule(g, h, clip(k), 6, 4.9, 'B', 'b', 'P')
      if (!bare) capsule(g, k, an, 4.9, a.bottom === 'joggers' ? 4 : 4.6, 'B', 'b', 'P')
    }
    if (bare) {
      // shorts flare a little at the hem
      g.poly([[28, 76], [40, 76], [41, 86], [27.5, 86]], 'B')
      g.poly([[40, 76], [52, 76], [52.5, 86], [39, 86]], 'B')
      g.poly([[46, 76], [52, 76], [52.5, 86], [47, 86]], 'b')
    }
    g.poly([[29, 64], [51, 64], [52, 78], [28, 78]], 'B')
    g.poly([[45, 64], [51, 64], [52, 78], [46, 78]], 'b')
  }

  // shoes
  for (const side of [0, 1]) {
    const cx = side ? 46.8 : 33.2
    const toe = side ? 1.2 : -1.2
    if (a.shoes === 'boots') capsule(g, [cx, 101], [cx, 108], 5, 5, 'F', 'f')
    if (bare && a.shoes === 'sneakers') g.rect(Math.floor(cx - 3), 104, Math.floor(cx + 3), 106, 'G')
    oval(g, cx + toe, 110.5, 6.8, 3.8, 'F', 'f', 'e')
    const sole = a.shoes === 'formal' ? 'K' : a.shoes === 'sneakers' ? 'G' : 'f'
    g.rect(Math.floor(cx + toe - 7), 113, Math.ceil(cx + toe + 6), 114, sole)
  }
  g.outline()

  // details over the outline
  const isTrousers = a.bottom !== 'skirt' && !bare
  if (isTrousers) {
    // inner-leg crease and centre seam
    g.line(40, 78, 40, 82, 'b')
    if (a.bottom === 'slacks') {
      g.line(34, 79, 34, 104, 'b').line(46, 79, 46, 104, 'b')
    }
    if (a.bottom === 'jeans') {
      g.line(30, 80, 31, 104, 'b').line(50, 80, 49, 104, 'b')
      g.stamp(31, 68, ['bbbb', '...b']).stamp(45, 68, ['bbbb', 'b...'])
    }
    if (a.bottom === 'joggers') {
      // elastic cuffs + drawstring + side stripe
      g.rect(30, 102, 38, 103, 'b').rect(42, 102, 50, 103, 'b')
      g.line(29, 72, 30, 100, 'P').line(51, 72, 50, 100, 'b')
      g.set(38, 66, 'G').set(38, 67, 'G').set(42, 66, 'G').set(42, 67, 'G').set(37, 68, 'G').set(43, 68, 'G')
    }
  }
  if (a.bottom === 'shorts') g.line(29, 84, 39, 84, 'b').line(41, 84, 51, 84, 'b')
  // pocket opening where the front hand tucks in
  if (a.bottom !== 'skirt') g.line(47, 67, 51, 72, 'K')
  // belt (hidden under untucked tops and blazers, visible with a tucked shirt)
  g.rect(29, 64, 50, 66, 'Z').rect(38, 64, 41, 66, 'X').set(39, 65, 'x').set(40, 65, 'x')
  // sneaker details
  if (a.shoes === 'sneakers')
    for (const cx of [32, 48]) {
      g.set(cx - 1, 108, 'G').set(cx + 1, 108, 'G').set(cx, 109, 'G')
      g.line(cx - 5, 112, cx + 4, 112, 'g')
    }
  if (a.shoes === 'formal') for (const cx of [31, 49]) g.set(cx, 109, 'X').set(cx + 1, 109, 'W')
  // belt chain loops from the front belt loop to the back pocket
  if (a.accessories.includes('beltchain')) chain(g, [[47, 66], [48, 72], [50, 77], [52.5, 79], [54, 76], [53.5, 70]])
  return g.toPixels()
}

function tie(g: Raster, school: boolean) {
  g.rect(39, 37, 40, 39, 'R').set(38, 38, 'R').set(41, 38, 'r')
  g.poly([[38.6, 40], [41.4, 40], [42.4, 55], [40, 58], [37.6, 55]], 'R')
  g.poly([[40, 40], [41.4, 40], [42.4, 55], [40, 58]], 'r')
  void school
}

function torso(a: Appearance): Pixels {
  const g = canvas()
  // neck (under the chin's shadow)
  g.rect(36, 28, 43, 37, 'S').rect(41, 28, 43, 37, 's').rect(36, 30, 43, 31, 'O')

  const blazer = BLAZERS.has(a.top)
  const hem = blazer ? 72 : UNTUCKED.has(a.top) ? 68 : 64
  if (a.top === 'hoodie') oval(g, 40, 37, 10.5, 3.5, 'a') // hood behind the neck
  if (a.top === 'tank') {
    g.poly([[31, 37], [49, 37], [51.5, 47], [51.5, hem], [28.5, hem], [28.5, 47]], 'A')
    g.poly([[44, 37], [49, 37], [51.5, 47], [51.5, hem], [46, hem]], 'a')
    oval(g, 29, 41, 4.4, 4.6, 'S', 's')
    oval(g, 51, 41, 4.4, 4.6, 'S', 's')
    g.poly([[33, 37], [47, 37], [44, 42], [36, 42]], 'S')
  } else {
    g.poly([[29, 37], [51, 37], [53, 45], [51.6, 56], [52, hem], [28, hem], [28.4, 56], [27, 45]], 'A')
    g.poly([[45, 37], [51, 37], [53, 45], [51.6, 56], [52, hem], [46, hem]], 'a')
    g.rect(29, 41, 30, hem - 4, 'Q')
    oval(g, 29.2, 41, 4.6, 4.4, 'A', undefined, 'Q')
    oval(g, 50.8, 41, 4.6, 4.4, 'A', 'a')
    // cloth folds under the chest and at the waist
    g.line(33, 57, 36, 54, 'a').line(44, 60, 47, 56, 'a')
  }

  // the front opening of shirts and blazers
  const inner = a.top === 'suit' ? 'V' : 'G'
  if (blazer) {
    g.poly([[35, 37], [45, 37], [40, 55]], inner)
    if (a.top === 'suit') g.poly([[40, 37], [45, 37], [40, 55]], 'v')
    else g.poly([[42, 40], [45, 37], [40.5, 55]], 'g')
    tie(g, a.top === 'school')
  }
  if (a.top === 'shirt') tie(g, false)
  if (a.top === 'jacket') g.poly([[35, 37], [45, 37], [40, 47]], 'G')
  if (a.top === 'hoodie') {
    g.rect(33, 57, 47, 64, 'a')
    g.rect(28, 66, 51, 67, 'a')
  }
  if (a.accessories.includes('scarf')) {
    capsule(g, [34, 35], [46, 35], 3, 3, 'R', 'r', 'q')
    capsule(g, [44, 36], [45, 50], 2.6, 2.4, 'R', 'r')
  }
  if (a.accessories.includes('bag')) {
    g.rect(46, 59, 56, 68, 'Z')
    g.rect(52, 59, 56, 68, 'z')
  }
  g.outline()

  // ---- details over the outline ----
  switch (a.top) {
    case 'tee':
    case 'splash':
    case 'jersey':
      // crew neck
      g.stamp(34, 36, ['K..........K', '.K........K.', '..KKKKKKKK..'])
      if (a.top === 'jersey') {
        g.stamp(34, 36, ['R..........R', '.R........R.', '..RRRRRRRR..'])
        g.line(28, 50, 28, hem - 1, 'R').line(52, 50, 52, hem - 1, 'r')
        // flame print, as on the reference jersey
        g.stamp(31, 46, ['R......', 'rR.....', '.RR..R.', '.rRRrR.', '..RRRR.', '..rRRR.', '...RRr.', '...rR..', '....R..'])
      } else if (a.top === 'splash') {
        // paint-powder splashes, as at a colour run
        const spots: Array<[number, number, string]> = [[32, 44, 'N'], [44, 41, 'J'], [37, 52, 'I'], [47, 55, 'N'], [31, 60, 'C'], [42, 62, 'J'], [49, 47, 'C'], [35, 40, 'I']]
        for (const [x, y, c] of spots) g.rect(x, y, x + 1, y + 1, c).set(x + 2, y + 1, c).set(x, y + 2, c)
      } else {
        // small crest print in the accent colour (plain if accent = top colour)
        g.stamp(36, 44, ['.RRRRRR.', 'RRqRRqRR', 'RRRDDRRR', 'RRRDDRRR', '.RRRRRR.', '..rRRr..', '...rr...'])
      }
      break
    case 'hoodie':
      g.line(37, 38, 36, 47, 'G').line(43, 38, 44, 47, 'G')
      g.line(33, 57, 47, 57, 'K').line(33, 57, 33, 64, 'K').line(47, 57, 47, 64, 'K')
      break
    case 'jacket':
      g.line(40, 47, 40, hem - 1, 'K')
      g.line(35, 37, 40, 47, 'K').line(45, 37, 40, 47, 'K')
      g.line(41, 49, 41, hem - 1, 'X')
      break
    case 'shirt':
      // collar points + placket and buttons
      g.stamp(34, 36, ['KKKK....KKKK', '.KAAK..KAAK.', '..KAAKKAAK..', '...KK..KK...'])
      for (let y = 59; y < hem; y += 4) g.set(40, y, 'Q')
      g.line(40, 58, 40, hem - 1, 'a')
      break
    case 'blazer':
    case 'suit':
    case 'school': {
      const edge = a.top === 'school' ? 'U' : 'K'
      // lapels
      g.line(35, 37, 39, 55, edge).line(45, 37, 41, 55, edge)
      g.line(34, 38, 36, 46, 'a').line(46, 38, 44, 46, 'a')
      g.stamp(34, 36, ['K..........K', '.K........K.'])
      // buttons + hem
      g.set(40, 60, 'K').set(40, 65, 'K')
      if (a.top === 'school') {
        // blue piping round the hem, cut away below the button so the shirt and black belt show
        g.line(28, hem - 1, 52, hem - 1, 'U')
        g.poly([[40, 61], [44.5, hem], [35.5, hem]], 'G')
        for (let y = 64; y < hem; y++) for (let x = 30; x < 50; x++) if (g.get(x, y) === 'G') g.set(x, y, '.')
        g.line(40, 61, 35, hem - 1, 'U').line(40, 61, 45, hem - 1, 'U')
        // crest pocket
        g.stamp(30, 46, ['UUUUUU', 'U.DD.U', 'U.DX.U', 'U.DD.U', '.U..U.', '..UU..'])
      } else {
        g.line(40, 56, 40, hem - 1, 'K')
        g.line(30, 62, 35, 62, 'K').line(45, 62, 50, 62, 'K')
      }
      break
    }
    case 'tank':
      g.line(33, 37, 36, 42, 'K').line(47, 37, 44, 42, 'K')
      break
  }
  if (a.accessories.includes('chain')) {
    chain(g, [[36, 37], [38, 41], [40, 43], [42, 41], [44, 37]])
    g.rect(39, 44, 40, 45, 'X').set(40, 45, 'x')
  }
  if (a.accessories.includes('bag')) {
    // strap from the left shoulder to the bag on the right hip
    g.line(31, 38, 48, 59, 'Z', 2)
    g.line(48, 63, 54, 63, 'X')
  }
  if (a.accessories.includes('headphones')) {
    g.line(32, 35, 48, 35, 'Z')
    oval(g, 31.5, 36.5, 2.6, 3.2, 'Z', 'z')
    oval(g, 48.5, 36.5, 2.6, 3.2, 'Z', 'z')
    g.set(31, 35, 'R').set(48, 35, 'R')
  }
  return g.toPixels()
}

/** Sleeve colours: upper arm, forearm, and the cuff at the wrist. */
function sleeves(a: Appearance): { upper: [string, string]; lower: [string, string]; cuff?: string } {
  const skin: [string, string] = ['S', 's']
  const cloth: [string, string] = ['A', 'a']
  if (a.top === 'tank') return { upper: skin, lower: skin }
  if (TEES.has(a.top)) return { upper: cloth, lower: skin }
  if (BLAZERS.has(a.top)) return { upper: cloth, lower: cloth, cuff: a.top === 'suit' ? 'V' : 'G' }
  return { upper: cloth, lower: cloth, cuff: a.top === 'hoodie' ? 'a' : undefined }
}

function hand(g: Raster, cx: number, cy: number, mirror: boolean) {
  oval(g, cx, cy, 3, 3.6, 'S', 's', 'T')
  // thumb on the inside, a knuckle line
  g.set(Math.floor(mirror ? cx - 3 : cx + 2.5), Math.floor(cy - 1.5), 'S')
  g.set(Math.floor(cx - 1), Math.floor(cy + 1), 's').set(Math.floor(cx), Math.floor(cy + 1), 's')
}

/** The fixed arm poses (idle, VS point, victory fist), as articulated specs. */
const ARM_POSES: Record<ArmPose, { back: ArmSpec; front: ArmSpec }> = {
  // the far arm hangs relaxed close to the body with a soft bend; the near hand hooks a thumb in the pocket
  idle: { back: { el: [25.4, 54], wr: [25.8, 65.5], hand: 'relaxed' }, front: { el: [56.4, 53], wr: [51.6, 64], hand: 'hooked' } },
  // VS screen: arm thrust out to the side, finger pointing at the challenger
  point: { back: { el: [25.4, 54], wr: [25.8, 65.5], hand: 'relaxed' }, front: { el: [61, 44], wr: [69.5, 41], hand: 'pointOut' } },
  // fist pump
  raised: { back: { el: [25.4, 54], wr: [25.8, 65.5], hand: 'relaxed' }, front: { el: [59.5, 32], wr: [58, 22.5], hand: 'fist' } },
}

function arm(a: Appearance, side: 'back' | 'front', pose: ArmPose): Pixels {
  return armAt(a, side, ARM_POSES[pose][side])
}

const lerpPt = (p: Pt, q: Pt, k: number): Pt => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]
/** How far down the upper arm a short sleeve reaches. */
const SLEEVE_END = 0.55

/**
 * One arm, shoulder → elbow → wrist, built the same way in every pose and view so it never
 * changes thickness between frames: a rounded deltoid that sits into the torso, an upper arm that
 * narrows to the elbow, a forearm that swells just below the elbow and slims to the wrist (so the
 * hand reads as a hand rather than the end of a tube), and clothes that follow it: a short sleeve
 * hugging the top of the upper arm with bare skin below, or a long sleeve with a cuff at the wrist.
 * Call `limbHem` after outlining to draw the short sleeve's hem across the arm.
 */
function limb(g: Raster, a: Appearance, sh: Pt, el: Pt, wr: Pt) {
  const { lower, cuff } = sleeves(a)
  const short = TEES.has(a.top)
  const up: [string, string] = short || a.top === 'tank' ? ['S', 's'] : ['A', 'a']
  oval(g, sh[0], sh[1], 4.7, 4.5, up[0], up[1])
  capsule(g, sh, el, 4.4, 3.6, up[0], up[1])
  const swell = lerpPt(el, wr, 0.3)
  capsule(g, el, swell, 3.6, 3.7, lower[0], lower[1])
  capsule(g, swell, wr, 3.7, 2.8, lower[0], lower[1])
  if (short) capsule(g, sh, lerpPt(sh, el, SLEEVE_END), 5, 4.6, 'A', 'a', 'Q', true)
  if (cuff) {
    const len = Math.hypot(wr[0] - el[0], wr[1] - el[1]) || 1
    const [dx, dy] = [(wr[0] - el[0]) / len, (wr[1] - el[1]) / len]
    const c: Pt = [wr[0] - dx * 1.2, wr[1] - dy * 1.2]
    g.line(c[0] - dy * 3.2, c[1] + dx * 3.2, c[0] + dy * 3.2, c[1] - dx * 3.2, cuff, 1.4)
  }
}

/** A short sleeve's hem, across the arm where the sleeve ends (after outlining). */
function limbHem(g: Raster, a: Appearance, sh: Pt, el: Pt) {
  if (!TEES.has(a.top)) return
  const len = Math.hypot(el[0] - sh[0], el[1] - sh[1]) || 1
  const [dx, dy] = [(el[0] - sh[0]) / len, (el[1] - sh[1]) / len]
  const e = lerpPt(sh, el, SLEEVE_END - 0.6 / len)
  g.line(e[0] - dy * 3.8, e[1] + dx * 3.8, e[0] + dy * 3.8, e[1] - dx * 3.8, a.top === 'jersey' ? 'R' : 'a', 1)
}

/** Shoulder positions shared by every arm pose, so gestures keep the same build as the idle. */
const SHOULDER: Record<'back' | 'front', Pt> = { back: [29.2, 41], front: [51.4, 41] }

/**
 * An arm in any position: shoulder → elbow → wrist capsules with the same widths, sleeve cap,
 * cuff and outline as the idle arms, and a hand shape at the wrist.
 */
function armAt(a: Appearance, side: 'back' | 'front', spec: ArmSpec): Pixels {
  const g = canvas()
  const sh = SHOULDER[side]
  const { el, wr } = spec
  const len = Math.hypot(wr[0] - el[0], wr[1] - el[1]) || 1
  const dir: Pt = [(wr[0] - el[0]) / len, (wr[1] - el[1]) / len]
  const perp: Pt = [-dir[1], dir[0]]
  const at = (d: number, o = 0): Pt => [wr[0] + dir[0] * d + perp[0] * o, wr[1] + dir[1] * d + perp[1] * o]
  limb(g, a, sh, el, wr)
  const [hx, hy] = at(3)
  switch (spec.hand) {
    case 'relaxed':
      hand(g, hx, hy, side === 'front')
      break
    case 'fist':
      oval(g, hx, hy, 3.4, 3.6, 'S', 's', 'T')
      break
    case 'open': {
      // an upright open palm, laid out on the design grid: four fingers with a pixel between
      // each (the outline fills those gaps, so the fingers read as separate) and the thumb
      // on the side nearer the face
      const thumbLeft = side === 'front'
      const rows = ['S.S.S.S', 'S.S.S.S', 'S.S.S.S', 'SSSSSSS', 'SSSSSSS', 'SSSSSS.', '.SSSS..']
      const palm = thumbLeft ? rows : rows.map(mirrorRow)
      const x0 = Math.round(hx - 3)
      const y0 = Math.round(hy - 5)
      g.stamp(x0, y0, palm)
      g.stamp(thumbLeft ? x0 - 2 : x0 + 7, y0 + 3, ['SS', 'SS'])
      break
    }
    case 'pointOut': {
      // a fist with the index finger stretched on along the forearm, out at the viewer
      oval(g, hx, hy, 3.4, 3.4, 'S', 's', 'T')
      const [f0, f1] = [at(4.4, -0.6), at(9, -0.6)]
      g.line(f0[0], f0[1], f1[0], f1[1], 'S', 1.6)
      break
    }
    case 'hooked': {
      // the hand is in the pocket; only the thumb hooks over its edge
      const [t0, t1] = [at(1.4, -0.4), at(3.6, -0.4)]
      g.line(t0[0], t0[1], t1[0], t1[1], 'S', 2.4)
      break
    }
    case 'pocket':
    case 'hidden':
      break
  }
  g.outline()
  limbHem(g, a, sh, el)
  if (spec.hand === 'fist') {
    // knuckle creases across the fist
    for (const d of [2.4, 4]) {
      const [k0, k1] = [at(d, 2), at(d, -2)]
      g.line(k0[0], k0[1], k1[0], k1[1], 's', 1)
    }
  }
  if (spec.hand === 'pocket') {
    // the pocket's lip across the wrist: the hand is inside
    const [p0, p1] = [at(-0.4, 4.2), at(-0.4, -4.2)]
    g.line(p0[0], p0[1], p1[0], p1[1], 'K', 1)
  }
  if (spec.hand === 'pointOut') {
    const [tx, ty] = at(8.6, -0.6)
    g.set(Math.round(tx), Math.round(ty), 'T')
  }
  if (spec.hand === 'open') g.set(Math.round(hx - 1), Math.round(hy), 's').set(Math.round(hx), Math.round(hy + 1), 's')
  if (side === 'front' && a.accessories.includes('watch')) {
    const [w0, w1] = [at(-2.2, 3.2), at(-2.2, -3.2)]
    g.line(w0[0], w0[1], w1[0], w1[1], 'Z', 1.2)
  }
  if (side === 'back' && a.accessories.includes('bracelet')) {
    const [b0, b1] = [at(-2, 3.2), at(-2, -3.2)]
    g.line(b0[0], b0[1], b1[0], b1[1], 'X', 1)
  }
  return g.toPixels()
}

const EYES: Record<Appearance['eyes'], string[]> = {
  soft: ['.KKK', 'KWEE', 'KEEE', '.EEK', '..K.'],
  round: ['.KKK.', 'KWEEK', 'KEEEK', 'KEEEK', '.KKK.'],
  sharp: ['KKKKK', '.KWEE', '.KEEK', '..KK.'],
  wide: ['KKKK', 'KWEE', 'KEEE', 'KEEE', 'KKKK'],
}
const MOUTHS: Record<Appearance['face'], string[]> = {
  smile: ['K...K', '.KKK.'],
  grin: ['KKKKK', 'KWWWK', '.KMK.'],
  smirk: ['....K', '.KKK.'],
  calm: ['.KKK.'],
}

function frontHair(g: Raster, a: Appearance) {
  // the fringe stays above the brows so eyes and glasses read clearly
  const cap = () => oval(g, 40, 10, 11.6, 6.2, 'H', 'j', 'h')
  const temples = () => {
    g.poly([[28.5, 9], [33, 10], [32.6, 19], [30.6, 21], [28.6, 17]], 'H')
    g.poly([[51.5, 9], [47, 10], [47.4, 19], [49.4, 21], [51.4, 17]], 'j')
  }
  switch (a.hair) {
    case 'wavy':
    case 'mullet':
      cap()
      temples()
      for (const [x, y, r] of [[32, 7, 4.6], [38.5, 4.6, 5.2], [45.5, 5.6, 4.8], [50.5, 10.5, 3.4], [29.5, 11, 3.4]] as const) oval(g, x, y, r, r, 'H', 'j', 'h')
      // a fringe sweeping across the forehead
      g.poly([[33, 8], [46, 9], [41, 15.6], [37.5, 14], [34, 16]], 'H')
      g.line(42, 6, 38, 14, 'j').line(47, 8, 45, 14, 'j').line(36, 9, 34, 15, 'j')
      g.line(33, 6, 38, 4, 'h').set(44, 4, 'h').set(45, 4, 'h')
      break
    case 'curtains':
      // a crown, then two curtains parted in the middle so the forehead shows between them
      oval(g, 40, 7, 11.6, 4.6, 'H', 'j', 'h')
      g.poly([[40.2, 5], [29, 7], [27.8, 16], [28.4, 24], [31.2, 27.5], [32, 19], [34, 13.5], [37.5, 10], [40.2, 8.5]], 'H')
      g.poly([[39.8, 5], [51, 7], [52.2, 16], [51.6, 24], [48.8, 27.5], [48, 19], [46, 13.5], [42.5, 10], [39.8, 8.5]], 'H')
      g.poly([[44, 6], [51, 7], [52.2, 16], [51.6, 24], [48.8, 27.5], [48, 19], [46.5, 12]], 'j')
      // strands
      g.line(36, 6, 30, 15, 'h').line(33, 8, 29, 19, 'j').line(38, 7, 34, 11, 'h')
      g.line(44, 7, 50, 15, 'j').line(47, 8, 51, 20, 'j')
      break
    case 'short':
      cap()
      temples()
      g.poly([[30, 10], [50, 10], [48, 14], [32, 14]], 'H')
      g.line(34, 6, 39, 5, 'h')
      break
    case 'spiky':
      cap()
      temples()
      for (const x of [30, 35, 40, 45, 50]) g.poly([[x - 4, 10], [x + 4, 10], [x + (x < 40 ? -3 : x > 40 ? 3 : 0), -1]], x > 42 ? 'j' : 'H')
      g.poly([[30, 9], [50, 9], [46, 15], [34, 15]], 'H')
      break
    case 'curly':
      cap()
      for (const x of [30, 35, 40, 45, 50]) oval(g, x, 11, 3.4, 3.4, 'H', 'j', 'h')
      break
    case 'long':
      cap()
      g.poly([[28, 9], [33, 9], [31.5, 36], [27.5, 38]], 'H')
      g.poly([[52, 9], [47, 9], [48.5, 36], [52.5, 38]], 'j')
      break
    case 'bun':
      oval(g, 40, 10.5, 11.4, 5.8, 'H', 'j', 'h')
      g.line(40, 5, 40, 9, 'j')
      break
    case 'buzz':
      oval(g, 40, 11, 10.4, 5.8, 'j', undefined, 'H')
      for (let x = 32; x < 49; x += 3) g.set(x, 8, 'H')
      break
  }
}

function hat(g: Raster, a: Appearance) {
  switch (a.hat) {
    case 'cap':
      oval(g, 40, 8.6, 11.6, 6.6, 'Y', 'y')
      g.poly([[29, 12.5], [51, 12.5], [55, 15.5], [31, 15.5]], 'y')
      g.set(40, 2, 'y')
      break
    case 'beanie':
      oval(g, 40, 9, 12, 7.2, 'Y', 'y')
      g.rect(28, 12, 51, 15, 'y')
      for (let x = 30; x < 51; x += 3) g.line(x, 12, x, 15, 'Y')
      break
    case 'bucket':
      g.poly([[31, 1.5], [49, 1.5], [51.5, 11], [28.5, 11]], 'Y')
      g.poly([[44, 1.5], [49, 1.5], [51.5, 11], [46, 11]], 'y')
      oval(g, 40, 12.6, 15.4, 3, 'y')
      break
    case 'headband':
      g.rect(29, 11, 50, 13, 'Y')
      break
  }
}

function head(a: Appearance, blink: boolean, f: PoseFrame = {}): Pixels {
  const g = canvas()
  // ears
  oval(g, 30.6, 20.5, 1.9, 2.9, 'S', 's')
  oval(g, 49.4, 20.5, 1.9, 2.9, 's')
  // face + jaw, shaded down the right cheek
  oval(g, 40, 19.5, 9.3, 10, 'S', undefined, 'T')
  g.poly([[30.8, 19], [49.2, 19], [47.8, 26], [43.6, 30.6], [40, 31.6], [36.4, 30.6], [32.2, 26]], 'S')
  for (let y = 12; y <= 30; y++) for (let x = 46; x <= 49; x++) if (g.get(x, y) === 'S') g.set(x, y, 's')
  frontHair(g, a)
  if (f.ruffle && a.hair !== 'buzz') {
    // a hand in the hair lifts a few tufts; they settle as the hand moves
    const tufts: Array<Array<[number, number]>> =
      f.ruffle === 1
        ? [[[34, 6], [36, -1], [39, 5]], [[42, 4], [45, -2], [47, 4]]]
        : [[[37, 5], [40, -2], [42, 4]], [[45, 5], [49, 0], [49.5, 6]]]
    for (const t of tufts) g.poly(t, 'H')
  }
  clipUnderHat(g, a)
  hat(g, a)
  g.outline()

  // face details
  const closed = blink || f.eyes === 'closed'
  const base = EYES[a.eyes]
  // glancing down: a heavy upper lid over the lower half of the eye
  const down = ['.'.repeat(base[0].length), 'K'.repeat(base[0].length), ...base.slice(2)]
  const eye = closed ? ['....', '....', 'KKKK', '.KK.'] : f.eyes === 'down' ? down : base
  const ew = eye[0].length
  g.stamp(37 - ew, 18, eye)
  g.stamp(43, 18, eye.map(mirrorRow))
  if (!closed) {
    g.line(33, 16, 34, 16, 'j').line(35, 15, 36, 15, 'j')
    const lift = f.brow === 'up' ? 1 : 0
    g.line(46, 16 - lift, 45, 16 - lift, 'j').line(44, 15 - lift, 43, 15 - lift, 'j')
  }
  // nose + mouth
  g.set(40, 23, 's').set(40, 24, 'O').set(39, 24, 's')
  const mouth = MOUTHS[f.mouth ?? a.face]
  g.stamp(38, 27, mouth)
  if (a.accessories.includes('earring')) {
    // a silver stud on each ear
    g.set(30, 23, 'X').set(30, 24, 'x').set(49, 23, 'X').set(49, 24, 'x')
  }
  if (a.accessories.includes('glasses')) {
    // bold rectangular frames that sit around the eyes, with a glint on each lens
    for (const x0 of [31, 42]) {
      g.rect(x0, 16, x0 + 7, 16, 'K').rect(x0, 23, x0 + 7, 23, 'K')
      g.rect(x0, 17, x0, 22, 'K').rect(x0 + 7, 17, x0 + 7, 22, 'K')
      g.set(x0 + 6, 17, 'W').set(x0 + 5, 17, 'L')
    }
    g.rect(39, 18, 41, 18, 'K')
    g.set(30, 17, 'K').set(50, 17, 'K')
  }
  if (a.accessories.includes('sunglasses')) {
    g.rect(31, 17, 48, 17, 'K')
    g.rect(32, 18, 38, 21, 'K').rect(42, 18, 48, 21, 'K')
    g.set(33, 18, 'l').set(34, 19, 'l').set(43, 18, 'l').set(44, 19, 'l')
  }
  return g.toPixels()
}

/**
 * BW trainers carry their heads low: the chin tucks almost onto the collar, so only a sliver of
 * neck shows under the jaw's shadow. The head, hair and hat layers are drawn in a shared space
 * and dropped this many pixels onto the shoulders (scaled with the resolution).
 */
export const NECK_DROP = 3
function seat(px: Pixels, extra = 0): Pixels {
  const n = (NECK_DROP + extra) * K
  const blank = '.'.repeat(px[0].length)
  return [...Array.from({ length: n }, () => blank), ...px.slice(0, px.length - n)]
}

export function renderLayers(a: Appearance, pose: ArmPose = 'idle', f?: PoseFrame): CharacterLayers {
  const tilt = f?.tilt ?? 0
  return {
    hairBack: seat(hairBack(a), tilt),
    legs: legs(a),
    torso: torso(a),
    armBack: f?.back ? armAt(a, 'back', f.back) : arm(a, 'back', 'idle'),
    armFront: f?.front ? armAt(a, 'front', f.front) : arm(a, 'front', pose),
    head: seat(head(a, false, f), tilt),
    headBlink: seat(head(a, true, f), tilt),
  }
}

/* Single layers for posed frames, so a renderer can cache each part separately (an arm by its
   position, a head by its expression) instead of re-rendering the whole figure per frame. */
export function renderArmLayer(a: Appearance, side: 'back' | 'front', spec?: ArmSpec, pose: ArmPose = 'idle'): Pixels {
  return spec ? armAt(a, side, spec) : arm(a, side, side === 'back' ? 'idle' : pose)
}
export function renderHeadLayer(a: Appearance, blink: boolean, f: PoseFrame = {}): Pixels {
  return seat(head(a, blink, f), f.tilt ?? 0)
}
export function renderHairBackLayer(a: Appearance, tilt = 0): Pixels {
  return seat(hairBack(a), tilt)
}

/** Stack a posed frame into one image, putting the arms behind the head when the pose asks. */
export function renderPose(a: Appearance, f: PoseFrame): Pixels {
  const l = renderLayers(a, 'idle', f)
  return flatten(f.armsBehind ? [l.armBack, l.armFront, l.hairBack, l.legs, l.torso, l.head] : LAYER_ORDER.map((k) => l[k]))
}

/** Stack layers into one frame (later layers win). */
export function flatten(layers: Pixels[]): Pixels {
  const h = layers[0].length
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: layers[0][0].length }, (_, x) => {
      for (let i = layers.length - 1; i >= 0; i--) {
        const c = layers[i][y][x]
        if (c !== '.') return c
      }
      return '.'
    }).join(''),
  )
}

export const LAYER_ORDER: Array<keyof CharacterLayers> = ['hairBack', 'legs', 'torso', 'armBack', 'armFront', 'head']

export function renderFlat(a: Appearance, pose: ArmPose = 'idle'): Pixels {
  const l = renderLayers(a, pose)
  return flatten(LAYER_ORDER.map((k) => l[k]))
}

/* ---------------- Back view (your trainer at the start of a battle) ---------------- */

/**
 * The trainer seen from behind, as in BW when you send out your first creature. `throwing`
 * raises the right arm with a ball in hand.
 */
export function renderBack(a: Appearance, throwing = false): Pixels {
  const g = canvas()
  const blazer = BLAZERS.has(a.top)
  const hem = blazer ? 72 : UNTUCKED.has(a.top) ? 68 : 64
  // neck
  g.rect(36, 28, 43, 37, 's').rect(36, 28, 39, 37, 'S')
  // back of the torso
  if (a.top === 'tank') {
    g.poly([[31, 37], [49, 37], [51.5, 47], [51.5, hem], [28.5, hem], [28.5, 47]], 'A')
    oval(g, 29, 41, 4.4, 4.6, 'S', 's')
    oval(g, 51, 41, 4.4, 4.6, 'S', 's')
  } else {
    g.poly([[29, 37], [51, 37], [53, 45], [51.6, 56], [52, hem], [28, hem], [28.4, 56], [27, 45]], 'A')
    g.poly([[45, 37], [51, 37], [53, 45], [51.6, 56], [52, hem], [46, hem]], 'a')
    oval(g, 29.2, 41, 4.6, 4.4, 'A', undefined, 'Q')
    oval(g, 50.8, 41, 4.6, 4.4, 'A', 'a')
  }
  if (a.top === 'hoodie') oval(g, 40, 40, 9, 5, 'a', undefined, 'A')
  g.outline()
  if (a.top === 'jersey') {
    // the number 7 across the back
    g.stamp(35, 44, ['RRRRRRRRRR', 'RRRRRRRRRR', '.......RR.', '......RR..', '.....RR...', '....RR....', '....RR....', '...RR.....', '...RR.....', '...RR.....'])
    g.line(28, 50, 28, hem - 1, 'R').line(52, 50, 52, hem - 1, 'r')
  }
  if (blazer) g.line(40, 60, 40, hem - 1, a.top === 'school' ? 'U' : 'K')
  if (a.top === 'school') g.line(28, hem - 1, 52, hem - 1, 'U')
  if (a.accessories.includes('bag')) g.line(49, 38, 32, 59, 'Z', 2)

  // head from behind: all hair, ears showing
  const head = canvas()
  oval(head, 30.6, 20.5, 1.9, 2.9, 'S', 's')
  oval(head, 49.4, 20.5, 1.9, 2.9, 's')
  const big = a.hair === 'wavy' || a.hair === 'mullet' || a.hair === 'curly' || a.hair === 'curtains'
  oval(head, 40, 16, big ? 12.5 : 11.5, big ? 13 : 12, a.hair === 'buzz' ? 'j' : 'H', 'j', a.hair === 'buzz' ? undefined : 'h')
  if (a.hair === 'mullet')
    head.poly([[31, 20], [49, 20], [50, 30], [49, 38], [46, 35.5], [43, 39.5], [40, 37], [37, 39.5], [34, 35.5], [31, 38], [30, 30]], 'H')
  if (a.hair === 'long') head.poly([[27, 16], [53, 16], [55, 52], [25, 52]], 'H')
  if (a.hair === 'bun') oval(head, 40, 5, 5, 4, 'H', 'j', 'h')
  if (a.hair === 'curly') for (const [x, y] of [[29, 10], [51, 10], [40, 4], [28, 22], [52, 22]]) oval(head, x, y, 4, 4, 'H', 'j')
  if (a.hair === 'spiky') for (const x of [31, 36, 40, 44, 49]) head.poly([[x - 4, 9], [x + 4, 9], [x, -1]], 'H')
  clipUnderHat(head, a)
  hat(head, a)
  head.outline()
  if (a.hair !== 'buzz') head.line(37, 8, 35, 24, 'j').line(43, 9, 45, 25, 'j').line(40, 5, 40, 12, 'h')
  if (a.accessories.includes('earring')) head.set(30, 23, 'X').set(49, 23, 'X')

  // arms: the left one relaxed, the right one relaxed or winding up a throw
  const left = arm(a, 'back', 'idle')
  let right: Pixels
  if (throwing) {
    const r = canvas()
    limb(r, a, [50.8, 41], [60, 33], [62, 21.5])
    oval(r, 62, 17.5, 3.6, 3.8, 'S', 's')
    // the ball, red over white
    oval(r, 64, 12, 4.6, 4.6, 'G', 'g')
    r.poly([[59.4, 12], [68.6, 12], [67, 8], [61, 8]], 'R')
    oval(r, 64, 9.5, 4, 2.8, 'R', 'r')
    r.outline()
    limbHem(r, a, [50.8, 41], [60, 33])
    r.line(59, 12, 69, 12, 'K').set(64, 12, 'W')
    right = r.toPixels()
  } else right = left.map((row) => [...row].reverse().join(''))
  return flatten([legs(a), g.toPixels(), left, right, seat(head.toPixels())])
}

/* ---------------- Side view ---------------- */

/** The trainer in profile, facing right: for turnarounds and side-on moments. */
export function renderSide(a: Appearance): Pixels {
  const blazer = BLAZERS.has(a.top)
  const hem = blazer ? 72 : UNTUCKED.has(a.top) ? 68 : 64
  const bare = a.bottom === 'shorts' || a.bottom === 'skirt'

  // legs: the far leg a step behind and in shadow, the near leg in front
  const legs = canvas()
  for (const [hx, fx, far] of [[37, 35, true], [42, 44, false]] as const) {
    const top: Pt = [hx, 72]
    const knee: Pt = [hx + (far ? -1 : 1), 92]
    const ankle: Pt = [fx, 106]
    const col = far ? 'b' : 'B'
    if (bare) {
      capsule(legs, top, [knee[0], 85], 5.6, 4.8, col, 'b')
      capsule(legs, [knee[0], 84], ankle, 4.2, 3.2, far ? 's' : 'S', 's')
    } else {
      capsule(legs, top, knee, 5.6, 4.8, col, 'b', far ? undefined : 'P')
      capsule(legs, knee, ankle, 4.8, a.bottom === 'joggers' ? 4 : 4.4, col, 'b')
    }
    oval(legs, fx + 3, 110.5, 7.5, 3.6, far ? 'f' : 'F', 'f', far ? undefined : 'e')
    legs.rect(Math.floor(fx - 4), 113, Math.ceil(fx + 10), 114, a.shoes === 'formal' ? 'K' : a.shoes === 'sneakers' ? 'G' : 'f')
  }
  if (a.bottom === 'skirt') legs.poly([[31, 64], [49, 64], [53, 86], [28, 86]], 'B')
  legs.poly([[31, 64], [49, 64], [50, 78], [30, 78]], 'B')
  legs.outline()
  legs.rect(32, 64, 48, 66, 'Z')
  if (a.accessories.includes('beltchain')) chain(legs, [[46, 66], [47, 72], [44, 77], [41, 74], [40, 68]])

  // torso in profile: chest to the right, back to the left
  const body = canvas()
  body.rect(37, 28, 43, 37, 'S').rect(37, 28, 39, 37, 's')
  body.poly([[31, 37], [47, 37], [50, 46], [49.5, 58], [49, hem], [31, hem], [30, 56], [29.5, 45]], 'A')
  body.poly([[31, 37], [36, 37], [34.5, 56], [35, hem], [31, hem], [30, 56], [29.5, 45]], 'a')
  if (a.top === 'hoodie') oval(body, 33, 39, 4.5, 4, 'a')
  if (a.accessories.includes('bag')) body.rect(27, 58, 33, 67, 'Z')
  body.outline()
  if (a.top === 'jersey') body.line(48, 46, 49, hem - 1, 'R').stamp(44, 36, ['RRRR'])
  if (blazer) {
    body.poly([[44, 37], [47.5, 37], [47.5, 52]], a.top === 'suit' ? 'V' : 'G')
    body.line(47, 39, 47, 55, 'R')
    body.line(44, 37, 48, 54, a.top === 'school' ? 'U' : 'K')
  }
  if (a.top === 'shirt') body.line(48, 39, 48, 55, 'R')
  if (a.accessories.includes('chain')) chain(body, [[42, 37], [46, 42], [47, 44]])

  // the near arm hangs at the side with a soft bend
  const armG = canvas()
  limb(armG, a, [39.5, 40.5], [38.6, 54], [41, 65])
  oval(armG, 41.8, 68.5, 3.1, 3.7, 'S', 's', 'T')
  armG.outline()
  limbHem(armG, a, [39.5, 40.5], [38.6, 54])
  if (a.accessories.includes('watch')) armG.rect(38, 62, 43, 63, 'Z').set(42, 62, 'X')
  if (a.accessories.includes('bracelet')) armG.rect(38, 62, 43, 62, 'X')

  // head in profile: the back of the skull is hair, the face reaches forward to the nose
  const h = canvas()
  const hairC = a.hair === 'buzz' ? 'j' : 'H'
  const shine = a.hair === 'buzz' ? undefined : 'h'
  const big = a.hair === 'wavy' || a.hair === 'mullet' || a.hair === 'curly' || a.hair === 'curtains'
  oval(h, 37, 15, big ? 13 : 12, big ? 13 : 12, hairC, 'j', shine)
  if (a.hair === 'mullet') h.poly([[25, 16], [36, 18], [37, 30], [35, 37], [32, 35], [29, 38], [27, 33], [25.5, 26]], 'H')
  if (a.hair === 'long' || a.hair === 'curtains') h.poly([[25, 14], [36, 14], [37, a.hair === 'long' ? 50 : 30], [26, a.hair === 'long' ? 50 : 28]], 'H')
  if (a.hair === 'bun') oval(h, 28, 7, 5, 4.5, 'H', 'j', 'h')
  if (a.hair === 'curly') for (const [x, y] of [[26, 9], [25, 20], [31, 3], [40, 2], [48, 5]]) oval(h, x, y, 4.2, 4.2, 'H', 'j')
  // face: forehead, nose, lips and chin, with the jaw running back to the ear
  oval(h, 45, 19, 8, 10, 'S', undefined, 'T')
  h.poly([[38, 22], [52, 22], [52.5, 27], [50, 31.5], [45, 32.5], [40, 30]], 'S')
  h.poly([[51.5, 17], [55.5, 23.5], [51.5, 25]], 'S')
  h.poly([[38, 24], [43, 30], [45, 32.5], [40, 30.5]], 's')
  // the ear, just behind the middle of the head
  oval(h, 39.5, 21, 2.3, 3.2, 'S', 's')
  h.set(39, 21, 's').set(39, 22, 's')
  // hair over the top, swept forward over the brow, with a sideburn in front of the ear
  if (a.hair !== 'buzz') {
    oval(h, 39, 8.5, 13, 6.5, hairC, 'j', shine)
    h.poly([[30, 5], [50, 4], [54, 9], [53, 14], [50, 12], [47, 15], [44, 12], [42, 16.5], [41, 20], [39, 15], [34, 14]], hairC)
    if (a.hair === 'wavy' || a.hair === 'mullet') for (const [x, y] of [[33, 2], [41, 1], [48, 3]]) oval(h, x, y, 4.4, 3.4, 'H', 'j', 'h')
  }
  if (a.hair === 'spiky') for (const x of [30, 37, 44]) h.poly([[x - 4, 6], [x + 5, 6], [x + 6, -2]], 'H')
  clipUnderHat(h, a)
  switch (a.hat) {
    case 'cap':
      oval(h, 39, 8.6, 12.6, 6.6, 'Y', 'y')
      h.poly([[46, 11], [60, 13], [59, 15.5], [46, 14.5]], 'y')
      break
    case 'beanie':
      oval(h, 39, 9, 13, 7.2, 'Y', 'y')
      h.rect(26, 12, 51, 15, 'y')
      break
    case 'bucket':
      h.poly([[30, 1.5], [48, 1.5], [50.5, 11], [27.5, 11]], 'Y')
      oval(h, 39, 12.6, 16, 2.6, 'y')
      break
    case 'headband':
      h.rect(27, 11, 51, 13, 'Y')
      break
  }
  h.outline()
  // eye, brow, mouth
  const eye = EYES[a.eyes]
  h.stamp(47, 18, eye.map((r) => r.slice(0, 3)))
  h.line(46, 15, 50, 15, 'j')
  h.stamp(49, 27, a.face === 'grin' ? ['KKK', 'WWK'] : a.face === 'calm' ? ['KKK'] : ['K..', '.KK'])
  if (a.accessories.includes('earring')) h.set(39, 24, 'X')
  if (a.accessories.includes('glasses')) {
    h.rect(45, 16, 51, 16, 'K').rect(45, 23, 51, 23, 'K').rect(45, 17, 45, 22, 'K').rect(51, 17, 51, 22, 'K')
    h.line(41, 18, 45, 17, 'K')
    h.set(50, 17, 'W')
  }
  if (a.accessories.includes('sunglasses')) h.rect(45, 17, 52, 21, 'K').line(41, 18, 45, 17, 'K').set(47, 18, 'l')
  if (a.accessories.includes('headphones')) oval(h, 39.5, 21, 3.5, 4, 'Z', 'z')

  return flatten([legs.toPixels(), body.toPixels(), armG.toPixels(), seat(h.toPixels())])
}
