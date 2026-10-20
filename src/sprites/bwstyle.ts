/**
 * Black/White-style finishing for creature sprites.
 *
 * Gen V sprites don't use one flat black line around everything: the outline takes a dark shade
 * of the colour it borders ("selective outlining"), a little lighter on the lit upper-left side
 * and darkest along the bottom and right. Builders outline with the marker key OUTLINE_KEY; this
 * pass replaces each marker pixel with a tinted ink made from its neighbours, and leaves
 * deliberate ink (eyes, mouths, the 'K' key) pure.
 */
import type { Palette, Pixels } from './pixels.ts'

export const OUTLINE_KEY = 'k'
const INK = '#141020'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}
function mix(a: string, b: string, k: number): string {
  const pa = hexToRgb(a)
  const pb = hexToRgb(b)
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join('')}`
}

/** Replace outline markers with tinted ink; returns new pixels and an extended palette. */
export function selectiveOutline(pixels: Pixels, palette: Palette): { pixels: Pixels; palette: Palette } {
  const h = pixels.length
  const w = pixels[0]?.length ?? 0
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : pixels[y][x])
  const out = pixels.map((r) => [...r])
  const pal: Palette = { ...palette }
  // reuse tints already in the palette (a species' front, back and flight frames share one)
  const keys = new Map<string, string>()
  let next = 0x100
  for (const [key, hex] of Object.entries(palette))
    if (key.charCodeAt(0) >= 0x100) {
      keys.set(hex, key)
      next = Math.max(next, key.charCodeAt(0) + 1)
    }
  const keyFor = (hex: string) => {
    let k = keys.get(hex)
    if (!k) {
      k = String.fromCharCode(next++)
      keys.set(hex, k)
      pal[k] = hex
    }
    return k
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (pixels[y][x] !== OUTLINE_KEY) continue
      // the colour this outline pixel borders
      const count = new Map<string, number>()
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const c = at(x + dx, y + dy)
          if (c === '.' || c === OUTLINE_KEY || c === 'K' || !(c in palette)) continue
          count.set(c, (count.get(c) ?? 0) + (dx === 0 || dy === 0 ? 2 : 1))
        }
      let best = ''
      let n = 0
      for (const [c, v] of count) if (v > n) [best, n] = [c, v]
      if (!best) {
        out[y][x] = 'K'
        continue
      }
      // lit from the upper left: outlines facing up/left stay a touch lighter
      const litSide = at(x - 1, y) === '.' || at(x, y - 1) === '.'
      const shadeSide = at(x + 1, y) === '.' || at(x, y + 1) === '.'
      const k = shadeSide && !litSide ? 0.82 : litSide && !shadeSide ? 0.6 : 0.72
      out[y][x] = keyFor(mix(palette[best], INK, k))
    }
  pal.K ??= INK
  return { pixels: out.map((r) => r.join('')), palette: pal }
}
