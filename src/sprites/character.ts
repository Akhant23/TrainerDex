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
import { Grid } from './raster.ts'
import type { Palette, Pixels } from './pixels.ts'

export const CHAR_W = 80
export const CHAR_H = 120
/** Head-and-shoulders crop used for portraits and avatar icons. */
export const PORTRAIT = { x: 20, y: 0, w: 40, h: 46 } as const

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
  }
}

/* ---------------- Drawing helpers (continuous coordinates) ---------------- */

type Pt = [number, number]

/** Filled ellipse; `shade` on the right/bottom-right, `light` on the upper-left rim. */
function oval(g: Grid, cx: number, cy: number, rx: number, ry: number, ch: string, shade?: string, light?: string, shadeAt = 0.45) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx
      const dy = (y + 0.5 - cy) / ry
      if (dx * dx + dy * dy > 1) continue
      let c = ch
      if (shade && dx * 0.85 + dy * 0.35 > shadeAt) c = shade
      else if (light && dx * 0.6 + dy * 0.8 < -0.72) c = light
      g.set(x, y, c)
    }
}

/** A tapered capsule from p0 (radius r0) to p1 (radius r1), shaded on its right side. */
function capsule(g: Grid, p0: Pt, p1: Pt, r0: number, r1: number, ch: string, shade?: string, light?: string) {
  const [x0, y0] = p0
  const [x1, y1] = p1
  const vx = x1 - x0
  const vy = y1 - y0
  const len2 = vx * vx + vy * vy || 1
  const r = Math.max(r0, r1)
  for (let y = Math.floor(Math.min(y0, y1) - r); y <= Math.ceil(Math.max(y0, y1) + r); y++)
    for (let x = Math.floor(Math.min(x0, x1) - r); x <= Math.ceil(Math.max(x0, x1) + r); x++) {
      const px = x + 0.5
      const py = y + 0.5
      const t = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / len2))
      const cx = x0 + vx * t
      const cy = y0 + vy * t
      const rr = r0 + (r1 - r0) * t
      const d = Math.hypot(px - cx, py - cy)
      if (d > rr) continue
      // how far toward the right-hand rim this pixel sits (-1 … 1)
      const side = (px - cx) / rr
      let c = ch
      if (shade && side > 0.3) c = shade
      else if (light && side < -0.7) c = light
      g.set(x, y, c)
    }
}

function chain(g: Grid, pts: Pt[], a = 'X', b = 'x') {
  let i = 0
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, y0] = pts[k]
    const [x1, y1] = pts[k + 1]
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)))
    for (let s = 0; s <= n; s++) g.set(Math.floor(x0 + ((x1 - x0) * s) / n), Math.floor(y0 + ((y1 - y0) * s) / n), i++ % 2 ? b : a)
  }
}

const M = (x: number) => 80 - x // mirror about the centre line
const mirrorRow = (r: string) => [...r].reverse().join('')

/* ---------------- Layers ---------------- */

export type ArmPose = 'idle' | 'raised'
export interface CharacterLayers {
  hairBack: Pixels
  legs: Pixels
  torso: Pixels
  armBack: Pixels
  armFront: Pixels
  head: Pixels
  headBlink: Pixels
}

const UNTUCKED = new Set<Appearance['top']>(['tee', 'jersey', 'hoodie', 'jacket', 'tank'])
const BLAZERS = new Set<Appearance['top']>(['blazer', 'suit', 'school'])

function hairBack(a: Appearance): Pixels {
  const g = new Grid(CHAR_W, CHAR_H)
  switch (a.hair) {
    case 'wavy':
      oval(g, 40, 14, 13, 11.5, 'H', 'j', 'h')
      oval(g, 29, 19, 3.5, 5, 'H', 'j')
      oval(g, 51, 19, 3.5, 5, 'j')
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
  return g.outline().toPixels()
}

function legs(a: Appearance): Pixels {
  const g = new Grid(CHAR_W, CHAR_H)
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

function tie(g: Grid, school: boolean) {
  g.rect(39, 37, 40, 39, 'R').set(38, 38, 'R').set(41, 38, 'r')
  g.poly([[38.6, 40], [41.4, 40], [42.4, 55], [40, 58], [37.6, 55]], 'R')
  g.poly([[40, 40], [41.4, 40], [42.4, 55], [40, 58]], 'r')
  if (school) for (let y = 42; y < 56; y += 4) g.set(39, y, 'D').set(40, y + 2, 'D')
}

function torso(a: Appearance): Pixels {
  const g = new Grid(CHAR_W, CHAR_H)
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
    case 'jersey':
      // crew neck
      g.stamp(34, 36, ['K..........K', '.K........K.', '..KKKKKKKK..'])
      if (a.top === 'jersey') {
        g.stamp(34, 36, ['R..........R', '.R........R.', '..RRRRRRRR..'])
        g.line(28, 50, 28, hem - 1, 'R').line(52, 50, 52, hem - 1, 'r')
        // flame print, as on the reference jersey
        g.stamp(31, 46, ['R......', 'rR.....', '.RR..R.', '.rRRrR.', '..RRRR.', '..rRRR.', '...RRr.', '...rR..', '....R..'])
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
      const edge = a.top === 'school' ? 'G' : 'K'
      // lapels
      g.line(35, 37, 39, 55, edge).line(45, 37, 41, 55, edge)
      g.line(34, 38, 36, 46, 'a').line(46, 38, 44, 46, 'a')
      g.stamp(34, 36, ['K..........K', '.K........K.'])
      // buttons + hem
      g.set(40, 60, 'K').set(40, 65, 'K')
      if (a.top === 'school') {
        g.line(28, hem - 1, 52, hem - 1, 'G')
        g.line(40, 56, 40, hem - 1, 'G')
        // crest pocket
        g.stamp(30, 46, ['GGGGGG', 'G.DD.G', 'G.DX.G', 'G.DD.G', '.G..G.', '..GG..'])
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
  if (a.top === 'tee' || a.top === 'jersey') return { upper: cloth, lower: skin }
  if (BLAZERS.has(a.top)) return { upper: cloth, lower: cloth, cuff: a.top === 'suit' ? 'V' : 'G' }
  return { upper: cloth, lower: cloth, cuff: a.top === 'hoodie' ? 'a' : undefined }
}

function hand(g: Grid, cx: number, cy: number, mirror: boolean) {
  oval(g, cx, cy, 3, 3.6, 'S', 's', 'T')
  // thumb on the inside, a knuckle line
  g.set(Math.floor(mirror ? cx - 3 : cx + 2.5), Math.floor(cy - 1.5), 'S')
  g.set(Math.floor(cx - 1), Math.floor(cy + 1), 's').set(Math.floor(cx), Math.floor(cy + 1), 's')
}

function arm(a: Appearance, side: 'back' | 'front', pose: ArmPose): Pixels {
  const g = new Grid(CHAR_W, CHAR_H)
  const { upper, lower, cuff } = sleeves(a)
  const tee = a.top === 'tee' || a.top === 'jersey'

  if (side === 'back') {
    // relaxed arm with a soft elbow bend
    const sh: Pt = [29.2, 41]
    const el: Pt = [25.8, 55]
    const wr: Pt = [26.4, 66]
    capsule(g, sh, el, 4.6, 3.8, upper[0], upper[1])
    capsule(g, el, wr, 3.8, 3.0, lower[0], lower[1])
    if (tee) capsule(g, sh, [26.6, 49], 5, 4.5, 'A', 'a', 'Q') // short sleeve sits a little wider than the arm
    if (cuff) g.rect(23, 64, 29, 65, cuff)
    hand(g, 26.8, 69.6, false)
    g.outline()
    if (tee) g.line(23, 50, 30, 51, a.top === 'jersey' ? 'R' : 'a')
    if (a.accessories.includes('bracelet')) {
      g.line(23, 64, 30, 65, 'X').line(23, 66, 30, 67, 'x')
      g.set(25, 64, 'W')
    }
    return g.toPixels()
  }

  if (pose === 'raised') {
    // fist pump
    const sh: Pt = [51.4, 41]
    const el: Pt = [59.5, 32]
    const wr: Pt = [58, 22]
    capsule(g, sh, el, 4.6, 3.8, upper[0], upper[1])
    capsule(g, el, wr, 3.8, 3.1, lower[0], lower[1])
    if (tee) capsule(g, sh, [56, 36], 5, 4.5, 'A', 'a', 'Q')
    if (cuff) g.rect(55, 22, 61, 23, cuff)
    oval(g, 57.8, 18, 3.8, 4, 'S', 's', 'T')
    g.outline()
    g.line(55, 17, 60, 17, 's').line(55, 19, 60, 19, 's')
    if (a.accessories.includes('watch')) g.rect(55, 22, 61, 23, 'Z').set(56, 22, 'X').set(57, 22, 'X')
    return g.toPixels()
  }

  // front arm: hand tucked in the pocket, elbow out
  const sh: Pt = [51.4, 41]
  const el: Pt = [56.4, 53]
  const wr: Pt = [51.6, 64]
  capsule(g, sh, el, 4.6, 3.8, upper[0], upper[1])
  capsule(g, el, wr, 3.8, 3.0, lower[0], lower[1])
  if (tee) capsule(g, sh, [54.4, 48.5], 5, 4.5, 'A', 'a', 'Q')
  if (cuff) g.rect(48, 62, 53, 63, cuff)
  // the thumb hooks over the pocket edge
  g.rect(50, 66, 52, 68, 'S').set(52, 68, 's')
  g.outline()
  if (tee) g.line(50, 50, 59, 48, a.top === 'jersey' ? 'R' : 'a')
  if (a.accessories.includes('watch')) {
    g.line(48, 61, 54, 63, 'Z').line(48, 62, 54, 64, 'Z')
    g.set(51, 62, 'X').set(52, 62, 'X').set(51, 63, 'W')
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

function frontHair(g: Grid, a: Appearance) {
  // the fringe stays above the brows so eyes and glasses read clearly
  const cap = () => oval(g, 40, 10, 11.6, 6.2, 'H', 'j', 'h')
  const temples = () => {
    g.poly([[28.5, 9], [33, 10], [32.6, 19], [30.6, 21], [28.6, 17]], 'H')
    g.poly([[51.5, 9], [47, 10], [47.4, 19], [49.4, 21], [51.4, 17]], 'j')
  }
  switch (a.hair) {
    case 'wavy':
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

function hat(g: Grid, a: Appearance) {
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

function head(a: Appearance, blink: boolean): Pixels {
  const g = new Grid(CHAR_W, CHAR_H)
  // ears
  oval(g, 30.6, 20.5, 1.9, 2.9, 'S', 's')
  oval(g, 49.4, 20.5, 1.9, 2.9, 's')
  // face + jaw, shaded down the right cheek
  oval(g, 40, 19.5, 9.3, 10, 'S', undefined, 'T')
  g.poly([[30.8, 19], [49.2, 19], [47.8, 26], [43.6, 30.6], [40, 31.6], [36.4, 30.6], [32.2, 26]], 'S')
  for (let y = 12; y <= 30; y++) for (let x = 46; x <= 49; x++) if (g.get(x, y) === 'S') g.set(x, y, 's')
  frontHair(g, a)
  hat(g, a)
  g.outline()

  // face details
  const eye = blink ? ['....', '....', 'KKKK', '.KK.'] : EYES[a.eyes]
  const ew = eye[0].length
  g.stamp(37 - ew, 18, eye)
  g.stamp(43, 18, eye.map(mirrorRow))
  if (!blink) {
    g.line(33, 16, 34, 16, 'j').line(35, 15, 36, 15, 'j')
    g.line(46, 16, 45, 16, 'j').line(44, 15, 43, 15, 'j')
  }
  // nose + mouth
  g.set(40, 23, 's').set(40, 24, 'O').set(39, 24, 's')
  const mouth = MOUTHS[a.face]
  g.stamp(38, 27, mouth)
  if (a.accessories.includes('earring')) {
    // a silver stud on each ear
    g.set(30, 23, 'X').set(30, 24, 'x').set(49, 23, 'X').set(49, 24, 'x')
  }
  if (a.accessories.includes('glasses')) {
    // slim rectangular frames: bold top rim, clear lenses, a fine lower rim and a glint
    for (const x0 of [32, 42]) {
      g.rect(x0, 17, x0 + 5, 17, 'K')
      g.set(x0, 18, 'K').set(x0, 19, 'K').set(x0 + 5, 18, 'K').set(x0 + 5, 19, 'K')
      g.rect(x0 + 1, 22, x0 + 4, 22, 'l')
      g.set(x0 + 4, 18, 'W')
    }
    g.rect(38, 18, 41, 18, 'K')
    g.set(31, 18, 'K').set(48, 18, 'K')
  }
  if (a.accessories.includes('sunglasses')) {
    g.rect(31, 17, 48, 17, 'K')
    g.rect(32, 18, 38, 21, 'K').rect(42, 18, 48, 21, 'K')
    g.set(33, 18, 'l').set(34, 19, 'l').set(43, 18, 'l').set(44, 19, 'l')
  }
  return g.toPixels()
}

export function renderLayers(a: Appearance, pose: ArmPose = 'idle'): CharacterLayers {
  return {
    hairBack: hairBack(a),
    legs: legs(a),
    torso: torso(a),
    armBack: arm(a, 'back', 'idle'),
    armFront: arm(a, 'front', pose),
    head: head(a, false),
    headBlink: head(a, true),
  }
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
