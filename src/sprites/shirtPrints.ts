/**
 * Printed shirts for the Photo Album's pixel scenes: the particular jerseys and tees people wear in
 * the photos (a spider jersey, a web-print tee, striped kits, an anime jersey), which the avatar
 * builder's tops don't cover and shouldn't (they're one-off outfits, not avatar options).
 *
 * A scene renders the wearer in a plain tee and then paints the print over the shirt's cloth
 * pixels, layer by layer (so arms in front of the body stay in front): the torso gets the print's
 * pattern, the short sleeves its sleeve colours and cuffs, and optionally the forearms a long
 * undershirt sleeve and the hands gloves. Patterns are written in the character's base coordinates
 * (80×120), so they land the same at any density.
 */
import { ARM_POSES, flatten, LAYER_ORDER, renderLayers, SHOULDER, SLEEVE_END, type Appearance, type ArmSpec, type PoseFrame, type Pt } from './character.ts'
import type { Palette, Pixels } from './pixels.ts'

export type ShirtPrint = 'spiderJersey' | 'webTee' | 'webStripes' | 'redStripes' | 'animeJersey'

/** What a scene's character is wearing beyond their Appearance. */
export interface Outfit {
  print?: ShirtPrint
  /** a long-sleeved undershirt showing below the short sleeves */
  underSleeves?: 'black'
  gloves?: 'white'
}

type Col = 'white' | 'navy' | 'black' | 'red' | 'yellow' | 'pink' | 'petal' | 'sky' | 'blue'
/** Each print colour as [lit, shaded] palette keys (the white is the character palette's own G/g). */
const KEYS: Record<Col, [string, string]> = {
  white: ['G', 'g'],
  navy: ['1', '2'],
  black: ['3', '4'],
  red: ['5', '6'],
  yellow: ['7', '8'],
  pink: ['9', '0'],
  petal: ['!', '@'],
  sky: ['#', '$'],
  blue: ['%', '^'],
}
/** The print colours, to merge into the wearer's palette. */
export const PRINT_PALETTE: Palette = {
  '1': '#2c3f7a', '2': '#1e2c5a',
  '3': '#26242e', '4': '#16141c',
  '5': '#d8303a', '6': '#a01e2a',
  '7': '#f2c838', '8': '#c89a18',
  '9': '#f0507e', '0': '#c03460',
  '!': '#f8b4c8', '@': '#e08aa4',
  '#': '#dceef8', '$': '#a8c8e0',
  '%': '#3a6fd0', '^': '#28509c',
}

/* ---------------- pattern helpers (base coordinates) ---------------- */

const CX = 40
/** Distance from p to the segment a–b. */
function seg(p: Pt, a: Pt, b: Pt): number {
  const [vx, vy] = [b[0] - a[0], b[1] - a[1]]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy || 1)))
  return Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vy * t)
}
const near = (p: Pt, path: Pt[], w: number) => path.some((a, i) => i > 0 && seg(p, path[i - 1], a) < w)
const mirror = (path: Pt[]): Pt[] => path.map(([x, y]) => [2 * CX - x, y])
const inEllipse = (p: Pt, cx: number, cy: number, rx: number, ry: number) => ((p[0] - cx) / rx) ** 2 + ((p[1] - cy) / ry) ** 2 < 1
/** A spider's web centred on (cx, cy): spokes every 30° and rings that sag between them. */
function web(p: Pt, cx: number, cy: number, w: number): boolean {
  const [dx, dy] = [p[0] - cx, p[1] - cy]
  const r = Math.hypot(dx, dy)
  if (r < 1) return false
  const th = Math.atan2(dy, dx)
  const spoke = Math.PI / 6
  const off = Math.abs(((th % spoke) + spoke * 1.5) % spoke - spoke / 2)
  if (Math.sin(off) * r < w) return true
  const sag = r * (1 + 0.07 * Math.cos(th * 12))
  return [4.5, 8.5, 12.5, 16.5, 20.5, 24.5].some((R) => Math.abs(sag - R) < w)
}
/** A V-neck: inside it, `inner`; a band round it, `trim` (null: no collar there). */
function vneck(p: Pt, depth: number, half: number, inner: Col, trim: Col): Col | null {
  const d = Math.abs(p[0] - CX)
  if (d > half + 1.2) return null
  const edge = 36.6 + (half - d) * (depth / half)
  if (p[1] < edge - 1.1) return inner
  if (p[1] < edge) return trim
  return null
}
const hash = (x: number, y: number) => {
  let n = Math.imul(Math.floor(x), 374761393) + Math.imul(Math.floor(y), 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

// the spider on the white jersey: a navy body and head, legs reaching up to the shoulders and down to the hem
const SPIDER_LEGS: Pt[][] = [
  [[39, 46], [34.5, 41.5], [31.5, 37.6]],
  [[39, 47.6], [33.5, 45.8], [29.4, 46.5]],
  [[39, 50.5], [34, 53.6], [31, 60]],
  [[39.5, 52], [36, 57.5], [34.6, 65]],
]
// a small spider emblem on the web tee
const EMBLEM_LEGS: Pt[][] = [
  [[39.2, 45.6], [36.8, 43.2], [36, 41]],
  [[39.2, 46.8], [36.4, 46.2], [35.2, 47.4]],
  [[39.2, 48.4], [36.6, 50.2], [36, 52.4]],
]

/** The torso's pattern: the colour at base point p (for the shirt's cloth pixels). */
const TORSO: Record<ShirtPrint, (p: Pt) => Col> = {
  // white with navy side panels, a navy V-neck and a big navy spider across the chest
  spiderJersey: (p) => {
    const v = vneck(p, 4.5, 4, 'navy', 'navy')
    if (v) return v
    if (p[0] < 30.6 || p[0] > 49.4) return 'navy'
    if (inEllipse(p, CX, 49, 2.5, 4.6) || inEllipse(p, CX, 43.4, 1.7, 1.5)) return 'navy'
    if (SPIDER_LEGS.some((l) => near(p, l, 0.75) || near(p, mirror(l), 0.75))) return 'navy'
    return 'white'
  },
  // a white compression tee drawn all over with a black web, a black spider on the chest, a black panel low on one side
  webTee: (p) => {
    if (inEllipse(p, CX, 47.4, 1.5, 2.8) || inEllipse(p, CX, 43.8, 1.1, 1)) return 'black'
    if (EMBLEM_LEGS.some((l) => near(p, l, 0.42) || near(p, mirror(l), 0.42))) return 'black'
    if (p[0] < 30.4 && p[1] > 56) return 'black'
    return web(p, CX, 45, 0.3) ? 'black' : 'white'
  },
  // a kit in red and navy stripes, a fine web over it, a navy V-neck and a round yellow sponsor badge
  webStripes: (p) => {
    const v = vneck(p, 4, 3.6, 'black', 'navy')
    if (v) return v
    if (inEllipse(p, CX, 55, 3.4, 3.4)) return 'yellow'
    const stripe = Math.floor((p[0] - CX + 1.8) / 3.6) % 2 === 0 ? 'navy' : 'red'
    return web(p, CX, 44, 0.24) ? (stripe === 'red' ? 'navy' : 'red') : stripe
  },
  // black with thin red diagonal stripes, a red crew collar; the upper right of the chest left plain
  redStripes: (p) => {
    if (p[1] < 38.4 && Math.abs(p[0] - CX) < 6) return 'red'
    if (p[0] > 43 && p[1] < 56) return 'black'
    return ((p[0] * 0.75 + p[1]) % 3.2 + 3.2) % 3.2 < 1 ? 'red' : 'black'
  },
  // white fading to sky blue, pink raglan shoulders, a white V-neck trimmed blue, a pink script
  // logo, falling petals and a big cartoon face (yellow hair in buns, round red eyes)
  animeJersey: (p) => {
    const v = vneck(p, 4, 3.4, 'white', 'blue')
    if (v) return v
    const d = Math.abs(p[0] - CX)
    if (p[1] < 47 && d > 5 + (p[1] - 37) * 1.05) return 'pink'
    if (inEllipse(p, 37.6, 58.2, 0.9, 1.1) || inEllipse(p, 42.4, 58.2, 0.9, 1.1)) return 'red'
    if (inEllipse(p, CX, 60, 3.6, 2.8)) return 'petal'
    if (inEllipse(p, CX, 58.5, 6.4, 5.6) || inEllipse(p, 34.6, 52.6, 1.8, 1.8) || inEllipse(p, 45.4, 52.6, 1.8, 1.8)) return 'yellow'
    if (Math.abs(p[1] - 46.2 - Math.sin(p[0] * 2.2) * 0.7) < 0.55 && d < 6.5) return 'pink'
    if (hash(p[0] * 0.9, p[1] * 0.9) < 0.035) return 'petal'
    return p[1] < 51 ? 'white' : 'sky'
  },
}

/** A short sleeve's colour, `t` of the way from the shoulder to the elbow (the sleeve ends at SLEEVE_END). */
const SLEEVE: Record<ShirtPrint, (t: number) => Col> = {
  spiderJersey: (t) => (t < 0.22 ? 'navy' : 'white'),
  webTee: () => 'white',
  webStripes: (t) => (t > SLEEVE_END - 0.1 ? 'navy' : 'red'),
  redStripes: (t) => (t > SLEEVE_END - 0.1 ? 'red' : 'black'),
  animeJersey: (t) => (t > SLEEVE_END - 0.07 ? 'blue' : t > SLEEVE_END - 0.13 ? 'white' : 'pink'),
}

/* ---------------- painting ---------------- */

function paint(layer: Pixels, fn: (p: Pt, ch: string) => string | null): Pixels {
  const k = layer[0].length / 80
  return layer.map((row, y) =>
    [...row]
      .map((ch, x) => {
        if (ch === '.' || ch === 'K') return ch
        return fn([(x + 0.5) / k, (y + 0.5) / k], ch) ?? ch
      })
      .join(''),
  )
}
const key = (c: Col, shade: boolean) => KEYS[c][shade ? 1 : 0]

/** Where the plain tee's little accent-colour crest is printed: the print goes over it. */
const onCrest = (p: Pt) => p[0] >= 36 && p[0] < 44 && p[1] >= 44 && p[1] < 51

function paintTorso(layer: Pixels, print: ShirtPrint): Pixels {
  return paint(layer, (p, ch) => ('AaQc'.includes(ch) || ('RqrD'.includes(ch) && onCrest(p)) ? key(TORSO[print](p), ch === 'a' || ch === 'c' || ch === 'r') : null))
}

/** A sleeve, an undershirt's long sleeve and a glove, along one arm (shoulder → elbow → wrist). */
function paintArm(layer: Pixels, side: 'back' | 'front', spec: ArmSpec, o: Outfit): Pixels {
  const sh = SHOULDER[side]
  const { el, wr } = spec
  const along = (p: Pt, a: Pt, b: Pt) => ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 || 1)
  return paint(layer, (p, ch) => {
    const shade = 'aqs'.includes(ch)
    if ('AaQ'.includes(ch)) return o.print ? key(SLEEVE[o.print](Math.max(0, along(p, sh, el))), shade) : null
    if (!'SsT'.includes(ch)) return null
    // skin on the arm itself (not the hand past the wrist) is under a long sleeve
    const onArm = (seg(p, sh, el) < 4.6 || seg(p, el, wr) < 3.8) && along(p, el, wr) < 0.9
    if (onArm && o.underSleeves) return key('black', shade)
    if (!onArm && o.gloves) return key('white', shade)
    return null
  })
}

/** A posed character in an outfit: the plain render, with the outfit painted over its shirt and arms. */
export function renderOutfit(a: Appearance, f: PoseFrame, o: Outfit): Pixels {
  const l = renderLayers(a, 'idle', f)
  if (o.print) l.torso = paintTorso(l.torso, o.print)
  l.armBack = paintArm(l.armBack, 'back', f.back ?? ARM_POSES.idle.back, o)
  l.armFront = paintArm(l.armFront, 'front', f.front ?? ARM_POSES.idle.front, o)
  return flatten(LAYER_ORDER.map((k) => l[k]))
}
