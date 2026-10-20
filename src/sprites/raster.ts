/**
 * Tiny pixel-art raster: draw filled shapes onto a character grid, then auto-outline.
 * Used for the battle creatures so nine sprites stay consistent and editable.
 * Pure (no DOM) so tests and the PNG export script can use it.
 */
import type { Pixels } from './pixels.ts'

export class Grid {
  readonly w: number
  readonly h: number
  private cells: string[][]

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.cells = Array.from({ length: h }, () => Array<string>(w).fill('.'))
  }

  set(x: number, y: number, ch: string) {
    x = Math.round(x)
    y = Math.round(y)
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y][x] = ch
    return this
  }
  get(x: number, y: number): string {
    return this.cells[y]?.[x] ?? '.'
  }

  /** Filled ellipse. `shade` colours the lower-right part; `light` the upper-left rim. */
  ellipse(cx: number, cy: number, rx: number, ry: number, ch: string, shade?: string, light?: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - (cx + 0.5)) / (rx + 0.5)
        const dy = (y + 0.5 - (cy + 0.5)) / (ry + 0.5)
        if (dx * dx + dy * dy > 1) continue
        let c = ch
        if (shade && dx * 0.6 + dy > 0.55) c = shade
        else if (light && dx * 0.5 + dy < -0.7) c = light
        this.set(x, y, c)
      }
    return this
  }

  rect(x0: number, y0: number, x1: number, y1: number, ch: string) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, ch)
    return this
  }

  /** Filled polygon (even-odd rule), sampled at pixel centres. */
  poly(points: Array<[number, number]>, ch: string) {
    const ys = points.map((p) => p[1])
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
      for (let x = 0; x < this.w; x++) {
        const px = x + 0.5
        const py = y + 0.5
        let inside = false
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i]
          const [xj, yj] = points[j]
          if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
        }
        if (inside) this.set(x, y, ch)
      }
    return this
  }

  /** Thick line. */
  line(x0: number, y0: number, x1: number, y1: number, ch: string, thick = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps
      const y = y0 + ((y1 - y0) * i) / steps
      for (let oy = 0; oy < thick; oy++) for (let ox = 0; ox < thick; ox++) this.set(Math.round(x) + ox, Math.round(y) + oy, ch)
    }
    return this
  }

  /** Paint exact pixels from strings, starting at (x, y). '.' is skipped. */
  stamp(x: number, y: number, rows: string[]) {
    rows.forEach((r, dy) => [...r].forEach((c, dx) => c !== '.' && this.set(x + dx, y + dy, c)))
    return this
  }

  /** Mirror the left half onto the right (for symmetric creatures). */
  mirrorLeft() {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w / 2; x++) this.cells[y][this.w - 1 - x] = this.cells[y][x]
    return this
  }

  /** Draw an outline in `ch` around every filled region (4-neighbour). */
  outline(ch = 'K') {
    const add: Array<[number, number]> = []
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.cells[y][x] !== '.') continue
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = this.get(x + dx, y + dy); return c !== '.' && c !== ch })) add.push([x, y])
      }
    add.forEach(([x, y]) => (this.cells[y][x] = ch))
    return this
  }

  toPixels(): Pixels {
    return this.cells.map((r) => r.join(''))
  }
}

export function flipX(px: Pixels): Pixels {
  return px.map((r) => [...r].reverse().join(''))
}

/**
 * The same drawing API as Grid, but every shape is rasterised at `k`× resolution while the
 * outline stays one real pixel thick. Lets art written for a small grid render with smoother
 * curves and finer linework at a larger size.
 */
export class HiGrid {
  readonly w: number
  readonly h: number
  readonly k: number
  private g: Grid

  constructor(w: number, h: number, k: number) {
    this.w = w
    this.h = h
    this.k = k
    this.g = new Grid(w * k, h * k)
  }

  private c(v: number) {
    return v * this.k + (this.k - 1) / 2
  }

  set(x: number, y: number, ch: string) {
    const k = this.k
    x = Math.round(x)
    y = Math.round(y)
    this.g.rect(x * k, y * k, x * k + k - 1, y * k + k - 1, ch)
    return this
  }
  get(x: number, y: number): string {
    return this.g.get(Math.round(x) * this.k, Math.round(y) * this.k)
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, ch: string, shade?: string, light?: string) {
    this.g.ellipse(this.c(cx), this.c(cy), (rx + 0.5) * this.k - 0.5, (ry + 0.5) * this.k - 0.5, ch, shade, light)
    return this
  }
  rect(x0: number, y0: number, x1: number, y1: number, ch: string) {
    const k = this.k
    this.g.rect(x0 * k, y0 * k, x1 * k + k - 1, y1 * k + k - 1, ch)
    return this
  }
  poly(points: Array<[number, number]>, ch: string) {
    this.g.poly(
      points.map(([x, y]) => [x * this.k, y * this.k]),
      ch,
    )
    return this
  }
  line(x0: number, y0: number, x1: number, y1: number, ch: string, thick = 1) {
    const k = this.k
    this.g.line(x0 * k, y0 * k, x1 * k, y1 * k, ch, thick * k)
    return this
  }
  stamp(x: number, y: number, rows: string[]) {
    rows.forEach((r, dy) => [...r].forEach((c, dx) => c !== '.' && this.set(x + dx, y + dy, c)))
    return this
  }
  mirrorLeft() {
    this.g.mirrorLeft()
    return this
  }
  outline(ch = 'K') {
    this.g.outline(ch)
    return this
  }
  toPixels(): Pixels {
    return this.g.toPixels()
  }
}
