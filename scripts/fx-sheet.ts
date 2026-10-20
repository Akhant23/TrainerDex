/**
 * Renders every battle move animation to contact sheets in sprites-export/fx-<type>.png: one row
 * per move, frames across (anticipation → travel → impact → aftermath), over the real battle
 * sprites. Uses a tiny pixel-exact software canvas, so it runs in Node without a browser.
 *
 *   node scripts/fx-sheet.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { RECIPES, recipeLength, seeded, whiff, type FxEnv, type Layer } from '../src/battle/fx.ts'
import { moves, type MoveId } from '../src/battle/data.ts'
import { creatureArtHi } from '../src/sprites/creatures.ts'
import { hexToRgba, type Palette, type Pixels } from '../src/sprites/pixels.ts'

/* ---------------- a minimal software canvas ---------------- */

type M = [number, number, number, number, number, number]
const mul = (m: M, n: M): M => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]
const apply = (m: M, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
const invert = (m: M): M => {
  const d = m[0] * m[3] - m[1] * m[2]
  return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]
}
function parseColour(c: string): [number, number, number, number] {
  if (c.startsWith('#')) return hexToRgba(c)
  const m = c.match(/rgba?\(([^)]+)\)/)
  if (!m) return [0, 0, 0, 255]
  const p = m[1].split(',').map((v) => parseFloat(v))
  return [p[0], p[1], p[2], Math.round((p[3] ?? 1) * 255)]
}

class SoftCanvas {
  width = 0
  height = 0
  data = new Uint8ClampedArray(0)
  private ctx?: SoftCtx
  getContext() {
    if (this.data.length !== this.width * this.height * 4) this.data = new Uint8ClampedArray(this.width * this.height * 4)
    return (this.ctx ??= new SoftCtx(this))
  }
}

class SoftCtx {
  fillStyle = '#000000'
  globalAlpha = 1
  imageSmoothingEnabled = false
  private m: M = [1, 0, 0, 1, 0, 0]
  private stack: Array<{ m: M; a: number; f: string }> = []
  private c: SoftCanvas
  constructor(c: SoftCanvas) {
    this.c = c
  }
  save() {
    this.stack.push({ m: this.m, a: this.globalAlpha, f: this.fillStyle })
  }
  restore() {
    const s = this.stack.pop()
    if (s) [this.m, this.globalAlpha, this.fillStyle] = [s.m, s.a, s.f]
  }
  translate(x: number, y: number) {
    this.m = mul(this.m, [1, 0, 0, 1, x, y])
  }
  scale(x: number, y: number) {
    this.m = mul(this.m, [x, 0, 0, y, 0, 0])
  }
  rotate(a: number) {
    const c = Math.round(Math.cos(a) * 1e6) / 1e6
    const s = Math.round(Math.sin(a) * 1e6) / 1e6
    this.m = mul(this.m, [c, s, -s, c, 0, 0])
  }
  private blend(x: number, y: number, [r, g, b, a]: [number, number, number, number]) {
    if (x < 0 || y < 0 || x >= this.c.width || y >= this.c.height) return
    const i = (y * this.c.width + x) * 4
    const k = (a / 255) * this.globalAlpha
    const d = this.c.data
    d[i] = d[i] * (1 - k) + r * k
    d[i + 1] = d[i + 1] * (1 - k) + g * k
    d[i + 2] = d[i + 2] * (1 - k) + b * k
    d[i + 3] = Math.min(255, d[i + 3] + k * 255)
  }
  private region(x: number, y: number, w: number, h: number, each: (lx: number, ly: number, dx: number, dy: number) => void) {
    const pts = [apply(this.m, x, y), apply(this.m, x + w, y), apply(this.m, x, y + h), apply(this.m, x + w, y + h)]
    const x0 = Math.floor(Math.min(...pts.map((p) => p[0])))
    const x1 = Math.ceil(Math.max(...pts.map((p) => p[0])))
    const y0 = Math.floor(Math.min(...pts.map((p) => p[1])))
    const y1 = Math.ceil(Math.max(...pts.map((p) => p[1])))
    const inv = invert(this.m)
    for (let dy = y0; dy < y1; dy++)
      for (let dx = x0; dx < x1; dx++) {
        const [lx, ly] = apply(inv, dx + 0.5, dy + 0.5)
        if (lx < x || ly < y || lx >= x + w || ly >= y + h) continue
        each(lx, ly, dx, dy)
      }
  }
  fillRect(x: number, y: number, w: number, h: number) {
    const col = parseColour(this.fillStyle)
    this.region(x, y, w, h, (_lx, _ly, dx, dy) => this.blend(dx, dy, col))
  }
  clearRect() {
    this.c.data.fill(0)
  }
  drawImage(img: SoftCanvas, ...a: number[]) {
    const [sx, sy, sw, sh, dx, dy, dw, dh] = a.length === 4 ? [0, 0, img.width, img.height, a[0], a[1], a[2], a[3]] : (a as [number, number, number, number, number, number, number, number])
    this.region(dx, dy, dw, dh, (lx, ly, ddx, ddy) => {
      const px = Math.floor(sx + ((lx - dx) / dw) * sw)
      const py = Math.floor(sy + ((ly - dy) / dh) * sh)
      const i = (py * img.width + px) * 4
      if (img.data[i + 3] === 0) return
      this.blend(ddx, ddy, [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]])
    })
  }
}
;(globalThis as { document?: unknown }).document = { createElement: () => new SoftCanvas() }

/* ---------------- PNG ---------------- */

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (b: Buffer) => {
  let c = 0xffffffff
  for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(w: number, h: number, rgba: Uint8ClampedArray) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1)
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

/* ---------------- the sheets ---------------- */

const W = 176
const H = 150
const SCALE = 2
const FRAMES = [0.12, 0.3, 0.5, 'impact', 'after', 0.85] as const

function paintPixels(out: Uint8ClampedArray, ow: number, px: Pixels, pal: Palette, cx: number, by: number, s: number) {
  const w = px[0].length
  const h = px.length
  for (let y = 0; y < h * s; y++)
    for (let x = 0; x < w * s; x++) {
      const ch = px[Math.floor(y / s)][Math.floor(x / s)]
      if (ch === '.') continue
      const X = Math.round(cx - (w * s) / 2 + x)
      const Y = Math.round(by - h * s + y)
      if (X < 0 || Y < 0 || X >= ow) continue
      const [r, g, b] = hexToRgba(pal[ch])
      const i = (Y * ow + X) * 4
      out.set([r, g, b, 255], i)
    }
}

const byType = new Map<string, MoveId[]>()
for (const id of Object.keys(RECIPES) as MoveId[]) {
  const t = moves[id].type
  byType.set(t, [...(byType.get(t) ?? []), id])
}

mkdirSync('sprites-export', { recursive: true })
for (const [type, ids] of byType) {
  const cols = FRAMES.length
  const SW = W * cols * SCALE
  const SH = H * ids.length * SCALE
  const sheet = new Uint8ClampedArray(SW * SH * 4)
  ids.forEach((id, row) => {
    const recipe = RECIPES[id]
    const env: FxEnv = { from: [0.26 * W, 0.68 * H], to: [0.7 * W, 0.32 * H], W, H, side: 0, missed: false, rand: seeded(1) }
    const layers: Layer[] = recipe.layers(env)
    const total = recipeLength(recipe, env)
    FRAMES.forEach((f, col) => {
      const t = f === 'impact' ? recipe.impact + 30 : f === 'after' ? recipe.impact + 160 : f * total
      const c = new SoftCanvas()
      c.width = W
      c.height = H
      const ctx = c.getContext()
      // field: sky-ish backdrop, platforms, the two creatures
      ctx.fillStyle = '#b8d8f0'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#d8e8c8'
      ctx.fillRect(0, H * 0.45, W, H)
      const bg = c.data
      paintPixels(bg, W, creatureArtHi.hootour.pixels, creatureArtHi.hootour.palette, 0.7 * W, 0.47 * H, 0.5)
      paintPixels(bg, W, creatureArtHi.riffin.back, creatureArtHi.riffin.palette, 0.26 * W, 0.92 * H, 1)
      for (const l of layers) {
        if (t < l.t0 || t > l.t0 + l.dur) continue
        ctx.save()
        l.draw(ctx as unknown as CanvasRenderingContext2D, Math.min(1, (t - l.t0) / l.dur), env)
        ctx.restore()
      }
      // label strip
      for (let y = 0; y < H * SCALE; y++)
        for (let x = 0; x < W * SCALE; x++) {
          const si = (Math.floor(y / SCALE) * W + Math.floor(x / SCALE)) * 4
          const di = ((row * H * SCALE + y) * SW + col * W * SCALE + x) * 4
          sheet.set([bg[si], bg[si + 1], bg[si + 2], 255], di)
        }
    })
  })
  writeFileSync(`sprites-export/fx-${type.toLowerCase()}.png`, png(SW, SH, sheet))
  console.log(`fx-${type.toLowerCase()}: ${ids.join(', ')}`)
}
void whiff
