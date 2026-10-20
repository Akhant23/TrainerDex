/**
 * Pure pixel-art helpers (no DOM) — shared by the browser renderer, the tests and
 * the PNG export script.
 *
 * A sprite is a list of equal-length strings; each character is a palette key and
 * '.' is transparent.
 */
export type Pixels = string[]
export type Palette = Record<string, string>

/** Build rows from [startColumn, content] pairs so art can be written without counting dots. */
export function fromSpans(width: number, spans: ReadonlyArray<readonly [number, string]>): Pixels {
  return spans.map(([start, content]) => pad('.'.repeat(start) + content, width))
}

export function pad(row: string, width: number): string {
  return row.length >= width ? row.slice(0, width) : row + '.'.repeat(width - row.length)
}

/** Paint `spans` ([row, startColumn, content]) over a copy of `base`. '.' in content is left as-is. */
export function overlay(base: Pixels, spans: ReadonlyArray<readonly [number, number, string]>): Pixels {
  const out = base.map((r) => r.split(''))
  for (const [row, start, content] of spans) {
    for (let i = 0; i < content.length; i++) {
      if (content[i] !== '.' && out[row] && start + i < out[row].length) out[row][start + i] = content[i]
    }
  }
  return out.map((r) => r.join(''))
}

/** Set exact pixels, including '.' (erase). */
export function setPixels(base: Pixels, spans: ReadonlyArray<readonly [number, number, string]>): Pixels {
  const out = base.map((r) => r.split(''))
  for (const [row, start, content] of spans) {
    for (let i = 0; i < content.length; i++) if (out[row]) out[row][start + i] = content[i]
  }
  return out.map((r) => r.join(''))
}

export function crop(base: Pixels, x: number, y: number, w: number, h: number): Pixels {
  return base.slice(y, y + h).map((r) => pad(r.slice(x, x + w), w))
}

export function mirror(base: Pixels): Pixels {
  return base.map((r) => r.split('').reverse().join(''))
}

/** Returns a list of problems (empty = valid). Used by tests. */
export function validate(pixels: Pixels, palette: Palette, width: number, height: number): string[] {
  const errors: string[] = []
  if (pixels.length !== height) errors.push(`expected ${height} rows, got ${pixels.length}`)
  pixels.forEach((row, y) => {
    if (row.length !== width) errors.push(`row ${y}: expected width ${width}, got ${row.length}`)
    for (const ch of row) if (ch !== '.' && !(ch in palette)) errors.push(`row ${y}: unknown colour key '${ch}'`)
  })
  return errors
}

export function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255]
}
