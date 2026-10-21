/**
 * Battle platforms, as in Gen V: an opaque disc of the ground the battle is on, with a lit
 * centre, a darker ring and a lighter lip (and, on grass, tufts along the back rim), drawn as
 * pixel art and stretched nearest-neighbour onto the battle field. Measured against Pokémon
 * White 2 battle footage (docs/GEN5-TIMING.md has the reference frames).
 */
import { Grid } from './raster.ts'
import type { Palette, Pixels } from './pixels.ts'

export type PlatformKind = 'grass' | 'stone' | 'floor'
export const PLATFORM_W = 128
export const PLATFORM_H = 32

const PALETTES: Record<PlatformKind, Palette> = {
  grass: { A: '#8cc85a', B: '#4e8e3a', C: '#6aaa48', D: '#a4d672', E: '#3c7430' },
  stone: { A: '#d4d8de', B: '#8a909c', C: '#b0b5bf', D: '#e4e7ec', E: '#979dab' },
  floor: { A: '#f0e8d6', B: '#b3a58a', C: '#d9cdb4', D: '#fbf6ea', E: '#c4b69a' },
}

export function platformArt(kind: PlatformKind): { pixels: Pixels; palette: Palette } {
  const g = new Grid(PLATFORM_W, PLATFORM_H)
  const cx = 64
  // lip, the darker ring inside it, the field, and the lit centre (offset up, toward the light)
  g.ellipse(cx, 16, 62, 14.5, 'A')
  g.ellipse(cx, 16.6, 58, 12.6, 'B')
  g.ellipse(cx, 16.2, 54, 11, 'C')
  g.ellipse(cx - 4, 13.6, 34, 5.6, 'D')
  const top = (x: number) => Math.round(16 - 14.5 * Math.sqrt(Math.max(0, 1 - ((x - cx) / 62) ** 2)))
  if (kind === 'grass') {
    // tufts poking up along the back rim, and a scatter of darker blades in the field
    for (let x = 5; x < PLATFORM_W - 4; x += 4) {
      const t = top(x)
      const h = x % 12 === 1 ? 3 : 2
      for (let i = 1; i <= h; i++) g.set(x + (i === h ? 1 : 0), t - i + 1, i === h ? 'A' : 'E')
    }
    for (const [x, y] of [[30, 18], [44, 22], [58, 20], [76, 23], [90, 19], [100, 15], [38, 12], [84, 13], [66, 25], [24, 15], [106, 20]]) g.set(x, y, 'E').set(x + 1, y - 1, 'E')
  } else if (kind === 'stone') {
    // paving seams following the curve of the disc
    for (const ry of [6, 9.5]) for (let x = 14; x < 114; x++) {
      const dx = (x - cx) / (ry * 5.4)
      if (Math.abs(dx) >= 1 || x % 9 === 0) continue
      g.set(x, Math.round(16.2 + ry * Math.sqrt(1 - dx * dx)), 'E')
    }
    for (const x of [34, 52, 76, 94]) g.set(x, 19, 'E').set(x, 20, 'E')
  } else {
    // a polished floor: a sheen across the lit side and a fine seam ring
    for (let x = 40; x < 74; x++) if (x % 3) g.set(x, 11, 'A')
    for (let x = 20; x < 108; x++) {
      const dx = (x - cx) / 46
      if (Math.abs(dx) < 1 && x % 5) g.set(x, Math.round(16.2 + 8.4 * Math.sqrt(1 - dx * dx)), 'E')
    }
  }
  return { pixels: g.toPixels(), palette: PALETTES[kind] }
}
