/**
 * A small pixel-painting kit for the Pokédex habitats (habitats.ts): one 256×192 scene (the DS top
 * screen) painted pixel by pixel into a plain buffer, so the same code draws in the browser and in
 * tests. Everything is on one pixel grid with the characters (drawn at 1:1, 80×120), filled with
 * flat colours, BW-style: a dark ink outline round objects, a light edge top-left and a shade band
 * bottom-right, the odd dither for texture. No smoothing, no gradients other than stepped bands.
 */
import { paletteFor, renderPose, type Appearance, type PoseFrame } from './character.ts'
import { hexToRgba } from './pixels.ts'
import { flipX } from './raster.ts'

export const HAB_W = 256
export const HAB_H = 192
export const INK = '#26232f'

type Pt = [number, number]

/** A seeded random number generator, so a scene's scattered details are the same every time. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

export class Scene {
  readonly w = HAB_W
  readonly h = HAB_H
  readonly px: string[] = new Array(HAB_W * HAB_H).fill('')

  set(x: number, y: number, c: string) {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return this
    this.px[iy * this.w + ix] = c
    return this
  }
  get(x: number, y: number) {
    return this.px[Math.round(y) * this.w + Math.round(x)] ?? ''
  }
  /** Filled rectangle, x/y/w/h in whole pixels. */
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) this.set(xx, yy, c)
    return this
  }
  /** A one-pixel rectangle outline. */
  frame(x: number, y: number, w: number, h: number, c: string) {
    this.rect(x, y, w, 1, c).rect(x, y + h - 1, w, 1, c).rect(x, y, 1, h, c).rect(x + w - 1, y, 1, h, c)
    return this
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c)
    return this
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.set(x, y, c)
    return this
  }
  /** Filled polygon (even-odd), sampled at pixel centres. */
  poly(pts: Pt[], c: string) {
    const ys = pts.map((p) => p[1])
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs: number[] = []
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i]
        const [bx, by] = pts[(i + 1) % pts.length]
        if (ay <= y + 0.5 !== by <= y + 0.5) xs.push(ax + ((y + 0.5 - ay) * (bx - ax)) / (by - ay))
      }
      xs.sort((a, b) => a - b)
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x++) this.set(x, y, c)
    }
    return this
  }
  /** Checkerboard dither over a rectangle (every other pixel), for texture and soft shading. */
  dither(x: number, y: number, w: number, h: number, c: string, phase = 0) {
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) if ((xx + yy + phase) % 2 === 0) this.set(xx, yy, c)
    return this
  }
  /** Horizontal stepped bands from y0 to y1, top colour first (a hand-painted sky or wall). */
  bands(y0: number, y1: number, colours: string[]) {
    const at = (i: number) => y0 + Math.round((i * (y1 - y0)) / colours.length)
    colours.forEach((c, i) => this.rect(0, at(i), this.w, at(i + 1) - at(i), c))
    // a dithered seam where each band starts, so they blend like BW backdrops rather than stripe
    for (let i = 1; i < colours.length; i++) this.dither(0, at(i), this.w, 1, colours[i - 1])
    return this
  }
  /** Paint a sprite (rows of palette keys, '.' clear) with its top-left at (x, y). */
  stamp(pixels: string[], palette: Record<string, string>, x: number, y: number) {
    pixels.forEach((r, dy) => [...r].forEach((ch, dx) => ch !== '.' && palette[ch] && this.set(x + dx, y + dy, palette[ch])))
    return this
  }
  toRGBA(): Uint8ClampedArray {
    const out = new Uint8ClampedArray(this.w * this.h * 4)
    this.px.forEach((c, i) => {
      if (c) out.set(hexToRgba(c), i * 4)
    })
    return out
  }
}

/* ---------------- furniture and fittings ---------------- */

export interface Mat {
  fill: string
  light?: string
  shade?: string
}

/** A solid object: ink outline, flat fill, a light edge top-left and a shade band bottom-right. */
export function box(s: Scene, x: number, y: number, w: number, h: number, m: Mat, shadeW = 2) {
  s.rect(x, y, w, h, INK)
  s.rect(x + 1, y + 1, w - 2, h - 2, m.fill)
  if (m.light) s.rect(x + 1, y + 1, w - 2, 1, m.light).rect(x + 1, y + 1, 1, h - 2, m.light)
  if (m.shade) s.rect(x + 1, y + h - 1 - shadeW, w - 2, shadeW, m.shade).rect(x + w - 1 - shadeW, y + 1, shadeW, h - 2, m.shade)
  return s
}

/** A soft contact shadow on the floor under something: what's there, a step darker, dithered. */
export function shadow(s: Scene, cx: number, y: number, rx: number) {
  for (let yy = -2; yy <= 2; yy++)
    for (let xx = -rx; xx <= rx; xx++) if ((xx / rx) ** 2 + (yy / 2.6) ** 2 <= 1 && (xx + yy) % 2 === 0) s.set(cx + xx, y + yy, darken(s.get(cx + xx, y + yy)))
  return s
}

/** A colour a step darker (for shadows painted over whatever is there). */
export function darken(hex: string, k = 0.72): string {
  if (!hex || hex[0] !== '#') return hex
  const n = parseInt(hex.slice(1, 7), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)))
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')
}

/** A wall from the top down to y, with a skirting board along the bottom. */
export function wall(s: Scene, y: number, base: string, trim: string, skirt = 6) {
  s.rect(0, 0, s.w, y, base)
  s.rect(0, y - skirt, s.w, skirt, trim).rect(0, y - skirt, s.w, 1, INK).rect(0, y - 1, s.w, 1, darken(trim))
  return s
}

/** Floorboards from y down: rows getting taller toward you, staggered joints, a little grain. */
export function boards(s: Scene, y: number, light: string, dark: string, seam: string, seed = 1) {
  const r = rng(seed)
  let yy = y
  let row = 0
  while (yy < s.h) {
    const hgt = 5 + row * 1.6
    s.rect(0, yy, s.w, hgt, row % 2 ? dark : light)
    s.rect(0, yy, s.w, 1, seam)
    const len = 40 + row * 10
    for (let x = (row * 23) % len; x < s.w; x += len) s.rect(x, yy, 1, hgt, seam)
    for (let i = 0; i < 6; i++) s.rect(Math.floor(r() * s.w), yy + 2 + Math.floor(r() * (hgt - 3)), 6 + Math.floor(r() * 8), 1, darken(row % 2 ? dark : light, 0.9))
    yy += hgt
    row++
  }
  return s
}

/** Square floor tiles from y down, two tones, rows growing toward you. */
export function tiles(s: Scene, y: number, a: string, b: string, grout: string) {
  let yy = y
  let row = 0
  while (yy < s.h) {
    const hgt = 6 + row * 2
    const wdt = 14 + row * 4
    for (let x = -((row * 7) % wdt), i = 0; x < s.w; x += wdt, i++) s.rect(x, yy, wdt, hgt, (i + row) % 2 ? a : b)
    s.rect(0, yy, s.w, 1, grout)
    for (let x = -((row * 7) % wdt); x < s.w; x += wdt) s.rect(x, yy, 1, hgt, grout)
    yy += hgt
    row++
  }
  return s
}

/** A window: frame, sky (bands), panes and a glint. `view` paints what's outside. */
export function windowFrame(s: Scene, x: number, y: number, w: number, h: number, sky: string[], frameMat: Mat, view?: (x: number, y: number, w: number, h: number) => void) {
  box(s, x, y, w, h, frameMat, 1)
  const ix = x + 3
  const iy = y + 3
  const iw = w - 6
  const ih = h - 6
  const step = ih / sky.length
  sky.forEach((c, i) => s.rect(ix, iy + Math.round(i * step), iw, Math.ceil(step), c))
  view?.(ix, iy, iw, ih)
  // mullions
  s.rect(x + Math.floor(w / 2) - 1, y + 2, 2, h - 4, frameMat.fill).rect(x + 2, y + Math.floor(h / 2) - 1, w - 4, 2, frameMat.fill)
  // a diagonal glint on the glass
  for (let i = 0; i < Math.min(iw, ih) / 3; i++) s.set(ix + 3 + i, iy + 8 - i + 6, '#ffffff').set(ix + 4 + i, iy + 8 - i + 6, '#ffffff')
  return s
}

/** A bookshelf packed with books of mixed heights and colours (seeded). */
export function bookshelf(s: Scene, x: number, y: number, w: number, h: number, wood: Mat, spines: string[], seed = 3, shelf = 20) {
  box(s, x, y, w, h, wood, 2)
  const r = rng(seed)
  for (let sy = y + 3; sy + shelf <= y + h - 3; sy += shelf) {
    s.rect(x + 3, sy + shelf - 3, w - 6, 3, wood.shade ?? darken(wood.fill)).rect(x + 3, sy + shelf - 3, w - 6, 1, INK)
    let bx = x + 4
    while (bx < x + w - 6) {
      const bw = 2 + Math.floor(r() * 3)
      const bh = shelf - 6 - Math.floor(r() * 5)
      if (r() < 0.08) {
        bx += bw + 1
        continue
      }
      const c = spines[Math.floor(r() * spines.length)]
      s.rect(bx, sy + shelf - 3 - bh, bw, bh, c).rect(bx, sy + shelf - 3 - bh, bw, 1, darken(c, 1.25)).rect(bx + bw - 1, sy + shelf - 3 - bh, 1, bh, darken(c))
      if (r() < 0.4) s.rect(bx, sy + shelf - 3 - bh + 3, bw, 1, '#e8d8a0')
      bx += bw
    }
  }
  return s
}

/** A desk: top slab with an edge and legs (or a modesty panel). */
export function desk(s: Scene, x: number, y: number, w: number, h: number, top: Mat, panel = true) {
  box(s, x, y, w, 6, top, 1)
  if (panel) box(s, x + 3, y + 5, w - 6, h - 5, { fill: top.shade ?? darken(top.fill), shade: darken(top.shade ?? darken(top.fill)) }, 2)
  else {
    box(s, x + 3, y + 5, 4, h - 5, { fill: top.shade ?? darken(top.fill) }, 0)
    box(s, x + w - 7, y + 5, 4, h - 5, { fill: top.shade ?? darken(top.fill) }, 0)
  }
  return s
}

/** A monitor on a stand, its screen painted by `screen`. */
export function monitor(s: Scene, x: number, y: number, w: number, h: number, screen: (x: number, y: number, w: number, h: number) => void, body = '#3a3c48') {
  box(s, x, y, w, h, { fill: body, light: '#5a5e6c', shade: '#2a2c36' }, 1)
  s.rect(x + 2, y + 2, w - 4, h - 4, '#101420')
  screen(x + 2, y + 2, w - 4, h - 4)
  box(s, x + w / 2 - 3, y + h, 6, 4, { fill: body }, 0)
  box(s, x + w / 2 - 8, y + h + 3, 16, 3, { fill: body }, 0)
  return s
}

/** A pot plant: leaves in clumps over a pot. */
export function plant(s: Scene, x: number, y: number, size = 1, leaf = ['#3a8a4a', '#2a6a3a', '#5aaa5a'], pot: Mat = { fill: '#c86a3a', light: '#e08a5a', shade: '#9a4a2a' }) {
  const k = size
  box(s, x - 7 * k, y - 10 * k, 14 * k, 10 * k, pot, 1)
  for (const [dx, dy, r] of [[-6, -16, 6], [5, -18, 6], [0, -24, 7], [-3, -30, 5], [6, -28, 5]] as const) {
    s.ellipse(x + dx * k, y + dy * k, r * k + 1, r * k * 0.8 + 1, INK)
  }
  for (const [dx, dy, r] of [[-6, -16, 6], [5, -18, 6], [0, -24, 7], [-3, -30, 5], [6, -28, 5]] as const) {
    s.ellipse(x + dx * k, y + dy * k, r * k, r * k * 0.8, leaf[1])
    s.ellipse(x + dx * k - 1, y + dy * k - 1, r * k * 0.6, r * k * 0.5, leaf[0])
    s.set(x + dx * k - 2, y + dy * k - 2, leaf[2])
  }
  return s
}

/** A framed poster or picture. */
export function poster(s: Scene, x: number, y: number, w: number, h: number, bg: string, paint?: (x: number, y: number, w: number, h: number) => void) {
  box(s, x, y, w, h, { fill: '#e8e0cc', shade: '#c0b8a0' }, 1)
  s.rect(x + 2, y + 2, w - 4, h - 4, bg)
  paint?.(x + 2, y + 2, w - 4, h - 4)
  return s
}

/** A string of triangular pennants across the scene, sagging between two points. */
export function bunting(s: Scene, x0: number, y0: number, x1: number, y1: number, colours: string[], sag = 8, wave = 0) {
  const n = Math.round((x1 - x0) / 9)
  for (let i = 0; i <= (x1 - x0); i++) {
    const t = i / (x1 - x0)
    s.set(x0 + i, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag, INK)
  }
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag + 1
    const sw = ((k + wave) % 2) * 1
    s.poly([[x - 3, y], [x + 4, y], [x + 0.5 + sw, y + 7]], INK)
    s.poly([[x - 2, y + 1], [x + 3, y + 1], [x + 0.5 + sw, y + 5.5]], colours[k % colours.length])
  }
  return s
}

/* ---------------- the trainer ---------------- */

/**
 * Aaryan (or anyone) at 1:1 on the scene's grid, his feet on (x, feetY). `flip` faces him the other
 * way. Returns where his hands are (scene pixels) so props can be put in them.
 */
export function trainer(s: Scene, look: Appearance, pose: PoseFrame, x: number, feetY: number, flip = false) {
  const px = renderPose(look, pose)
  const art = flip ? flipX(px) : px
  const ox = Math.round(x - 40)
  const oy = Math.round(feetY - 115)
  s.stamp(art, paletteFor(look), ox, oy)
  const hand = (spec: { el: Pt; wr: Pt } | undefined, fallback: Pt): Pt => {
    if (!spec) return [ox + (flip ? 80 - fallback[0] : fallback[0]), oy + fallback[1]]
    const len = Math.hypot(spec.wr[0] - spec.el[0], spec.wr[1] - spec.el[1]) || 1
    const hx = spec.wr[0] + ((spec.wr[0] - spec.el[0]) / len) * 2.8
    const hy = spec.wr[1] + ((spec.wr[1] - spec.el[1]) / len) * 2.8
    return [ox + (flip ? 80 - hx : hx), oy + hy]
  }
  return { front: hand(pose.front, [52, 66]), back: hand(pose.back, [26, 68]), top: oy + 3, left: ox + 21, right: ox + 60 }
}
