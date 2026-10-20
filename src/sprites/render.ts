import type { Palette, Pixels } from './pixels'

const cache = new WeakMap<Pixels, WeakMap<Palette, string>>()

/** Renders pixel data to a 1× PNG data URL (cached). Scale it up in CSS with `image-rendering: pixelated`. */
export function pixelsToDataUrl(pixels: Pixels, palette: Palette): string {
  let byPalette = cache.get(pixels)
  if (!byPalette) cache.set(pixels, (byPalette = new WeakMap()))
  const hit = byPalette.get(palette)
  if (hit) return hit

  const w = pixels[0]?.length ?? 0
  const h = pixels.length
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  for (let y = 0; y < h; y++) {
    const row = pixels[y]
    for (let x = 0; x < w; x++) {
      const ch = row[x]
      if (ch === '.' || !palette[ch]) continue
      ctx.fillStyle = palette[ch]
      ctx.fillRect(x, y, 1, 1)
    }
  }
  const url = canvas.toDataURL('image/png')
  byPalette.set(palette, url)
  return url
}
