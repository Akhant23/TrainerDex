/**
 * A badge's trophy, for its full entry on the Trainer Card: a gold cup with two handles, the badge's
 * emblem at twice its size on a cream medallion on the front, a knotted stem, and a wooden plinth with
 * an engraved brass nameplate. 96×128 art, drawn in code like every sprite here: flat colours, an ink
 * outline, the metal lit from the upper left with a highlight streak and a deep shade on the right.
 *
 * The emblem keeps the badge's own colours under its own palette keys (E e Q C), so it never takes on
 * the trophy's gold. `TROPHY_GLINTS` are spots on the metal where polishing sparkles appear.
 */
import { Grid } from './raster.ts'
import type { Palette, Pixels } from './pixels.ts'

export const TROPHY_W = 96
export const TROPHY_H = 128

/** Sparkle spots on the metal (art pixels): the rim, the handles, the bowl's highlight, the knot, the nameplate. */
export const TROPHY_GLINTS: Array<[number, number]> = [
  [22, 12],
  [74, 11],
  [7, 28],
  [89, 36],
  [24, 46],
  [56, 75],
  [40, 100],
  [68, 15],
]

export function trophyArt(emblem: Pixels, emblemPalette: Palette): { pixels: Pixels; palette: Palette } {
  const g = new Grid(TROPHY_W, TROPHY_H)
  const cx = 47.5

  // the handles: thick gold rings either side of the bowl
  for (const [hx, side] of [[11, -1], [84, 1]] as const) {
    g.ellipse(hx, 34, 10, 15, 'A', 'a', 'W')
    g.ellipse(hx + side * 0.5, 34, 5, 9.5, '.')
  }
  // the bowl: rim at y 14, curving down to the stem
  const pts: Array<[number, number]> = []
  for (let x = 13; x <= 82; x++) pts.push([x, 14])
  for (let x = 82; x >= 13; x--) {
    const t = (x - cx) / 34.5
    pts.push([x, 14 + 52 * Math.sqrt(Math.max(0, 1 - t * t))])
  }
  g.poly(pts, 'A')
  // metal shading: a deep band down the right, a mid shade, a bright streak on the left
  g.sample(13, 14, 82, 66, (x, y) => {
    if (g.get(Math.round(x), Math.round(y)) !== 'A') return null
    const t = (x - cx) / 34.5
    if (t > 0.72) return 'd'
    if (t > 0.42) return 'a'
    if (t > -0.74 && t < -0.6) return 'W'
    if (t <= -0.82) return 'a'
    return null
  })
  // the rim, seen a little from above, and the dark inside of the cup
  g.ellipse(cx, 14, 35.5, 5.5, 'A', 'a', 'W')
  g.ellipse(cx, 13.4, 31, 3.4, 'd')
  g.ellipse(cx, 12.8, 27, 2, 'a')
  // the medallion: a gold ring round a cream plate, the badge's emblem at 2× on it, centred on the
  // plate by the pixels it actually draws (badge art isn't always centred in its 16×16 square)
  const cy = 38
  g.ellipse(cx, cy, 21, 21, 'a', 'd', 'A')
  g.ellipse(cx, cy, 18.5, 18.5, 'P', 'p')
  const drawn = emblem.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === '.' ? [] : [[x, y] as const])))
  const [ex0, ex1] = [Math.min(...drawn.map((p) => p[0])), Math.max(...drawn.map((p) => p[0]))]
  const [ey0, ey1] = [Math.min(...drawn.map((p) => p[1])), Math.max(...drawn.map((p) => p[1]))]
  // the emblem's top-left corner, on whole pixels, so its middle lands on the plate's middle
  const left = Math.round(cx + 0.5 - (ex1 - ex0 + 1))
  const top = Math.round(cy - (ey1 - ey0 + 1))
  for (const [x, y] of drawn) {
    const ch = emblem[y][x]
    const k = ch === 'K' ? 'K' : ch === 'A' ? 'E' : ch === 'a' ? 'e' : ch === 'W' ? 'Q' : ch === 'C' ? 'C' : 'K'
    const px = left + (x - ex0) * 2
    const py = top + (y - ey0) * 2
    g.rect(px, py, px + 1, py + 1, k)
  }
  // the stem: a collar under the bowl, a knot, a flare to the base
  g.rect(42, 64, 53, 70, 'A').rect(50, 64, 53, 70, 'a').rect(42, 64, 43, 70, 'W')
  g.ellipse(cx, 75, 10, 4.5, 'A', 'a', 'W')
  g.poly([[42, 78], [53, 78], [58, 86], [37, 86]], 'A')
  g.poly([[50, 78], [53, 78], [58, 86], [52, 86]], 'a')
  g.ellipse(cx, 87, 22, 4, 'A', 'a', 'W')
  // the plinth: polished wood with a lit top bevel, a brass nameplate, a darker foot
  g.rect(22, 90, 73, 118, 'B').rect(22, 90, 73, 92, 'L').rect(66, 93, 73, 118, 'b')
  g.rect(31, 98, 64, 109, 'A').rect(31, 98, 64, 99, 'W').rect(31, 108, 64, 109, 'a')
  for (const y of [102, 105]) g.rect(36, y, 59, y, 'a')
  g.rect(18, 118, 77, 125, 'b').rect(18, 118, 77, 119, 'B')
  g.outline()
  // a couple of hard glints on the rim and the bowl (after the outline, so they stay crisp)
  for (const [x, y] of [[20, 13], [21, 13], [25, 30], [25, 31], [25, 32], [19, 44]]) if (g.get(x, y) !== '.') g.set(x, y, 'h')

  return {
    pixels: g.toPixels(),
    palette: {
      K: '#1c1a24',
      A: '#f0c040',
      a: '#c08a18',
      d: '#7a5408',
      W: '#fff3b0',
      h: '#ffffff',
      P: '#f8f2dc',
      p: '#e2d6b2',
      B: '#7a4230',
      b: '#4e2a1e',
      L: '#a0624a',
      E: emblemPalette.A,
      e: emblemPalette.a,
      Q: emblemPalette.W,
      C: emblemPalette.C,
    },
  }
}
