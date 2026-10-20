/**
 * The resort's 2.5D renderer (browser only).
 *
 * The floor is drawn like a tilted camera looking down at the map: each screen row samples one
 * row of a pre-rendered top-down ground image, scaled by its distance ("Mode 7"). Anything that
 * stands up — buildings, trees, walls, people — is an upright sprite placed with the same
 * projection, so it shrinks toward the back and overlaps correctly when sorted by depth.
 *
 * Projection (a homography, so straight lines stay straight):
 *   u = wy − camY,  scale = D / (D − u·T),  sx = W/2 + (wx − camX)·scale,  sy = Y0 + u·scale·C
 */
import { hexToRgba, type Palette, type Pixels } from '../sprites/pixels'
import { overworldFor, OW_W, OW_WORLD, type Facing } from '../sprites/overworld'
import { paletteFor, type Appearance } from '../sprites/character'
import { creatureArtHi } from '../sprites/creatures'
import { flipX } from '../sprites/raster'
import { tiles, tilePalette, TILE } from './tiles'
import { structureArt } from './structures'
import { size, tileAt, type ResortMap } from './maps'

export const VIEW_W = 256
export const VIEW_H = 192
/** Internal resolution multiplier, so scaled sprites keep crisp pixels. */
export const RES = 4
const Y0 = 138
const D = 230
const T = 0.7
const C = 0.74
/** Tiles of padding around each map (edge tiles repeated) so the far distance is never empty. */
const PAD = 16
/** The floor texture is pre-scaled so filtering keeps the pixel art crisp up close. */
const GROUND_RES = 2

export interface Camera {
  x: number
  y: number
}

export function project(cam: Camera, wx: number, wy: number) {
  const u = wy - cam.y
  const s = D / (D - u * T)
  return { x: VIEW_W / 2 + (wx - cam.x) * s, y: Y0 + u * s * C, s }
}

/* ---------------- pixel art → canvas ---------------- */

const canvasCache = new Map<string, HTMLCanvasElement>()
export function pixelCanvas(px: Pixels, pal: Palette, key: string): HTMLCanvasElement {
  let c = canvasCache.get(key)
  if (c) return c
  c = document.createElement('canvas')
  c.width = px[0].length
  c.height = px.length
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(c.width, c.height)
  px.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return
      img.data.set(hexToRgba(pal[ch]), (y * c!.width + x) * 4)
    }),
  )
  ctx.putImageData(img, 0, 0)
  canvasCache.set(key, c)
  return c
}

const groundCache = new Map<string, HTMLCanvasElement>()
function ground(m: ResortMap, frame: 0 | 1): HTMLCanvasElement {
  const key = `${m.id}:${frame}`
  let c = groundCache.get(key)
  if (c) return c
  const { w, h } = size(m)
  c = document.createElement('canvas')
  c.width = (w + PAD * 2) * TILE * GROUND_RES
  c.height = (h + PAD * 2) * TILE * GROUND_RES
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  for (let ty = -PAD; ty < h + PAD; ty++)
    for (let tx = -PAD; tx < w + PAD; tx++) {
      if (!m.outdoor && (tx < 0 || ty < 0 || tx >= w || ty >= h)) continue
      const ch = tileAt(m, Math.max(0, Math.min(w - 1, tx)), Math.max(0, Math.min(h - 1, ty)))
      const def = tiles[ch] ?? tiles.X
      const px = frame && def.frame2 ? def.frame2 : def.px
      ctx.drawImage(pixelCanvas(px, tilePalette, `tile:${ch}:${frame && def.frame2 ? 1 : 0}`), (tx + PAD) * TILE * GROUND_RES, (ty + PAD) * TILE * GROUND_RES, TILE * GROUND_RES, TILE * GROUND_RES)
    }
  groundCache.set(key, c)
  return c
}

const characterCache = new Map<string, Record<Facing, HTMLCanvasElement[]>>()
export function characterFrames(look: Appearance): Record<Facing, HTMLCanvasElement[]> {
  const key = JSON.stringify(look)
  let hit = characterCache.get(key)
  if (!hit) {
    const ow = overworldFor(look)
    const pal = paletteFor(look)
    hit = Object.fromEntries((Object.keys(ow) as Facing[]).map((f) => [f, ow[f].map((px, i) => pixelCanvas(px, pal, `ow:${key}:${f}:${i}`))])) as Record<Facing, HTMLCanvasElement[]>
    characterCache.set(key, hit)
  }
  return hit
}

/* ---------------- drawing ---------------- */

export interface Actor {
  look: Appearance
  facing: Facing
  frame: number
  /** world position of the feet, in pixels */
  x: number
  y: number
}

/** A party creature walking behind its trainer. */
export interface CreatureActor {
  id: string
  facing: Facing
  x: number
  y: number
  /** hop height in world pixels while walking */
  hop: number
  /** 0 or 1: resting breath frame */
  breath: number
}

/** Creature art faces left; facing right flips it. Two breathing frames each. */
function creatureFrames(id: string, flipped: boolean, breath: number): HTMLCanvasElement {
  const art = creatureArtHi[id]
  const split = Math.round(art.pixels.length * 0.62)
  const base = breath ? art.pixels.map((row, y) => (y + 2 < split ? art.pixels[y + 2] : y < split ? art.pixels[split] : row)) : art.pixels
  return pixelCanvas(flipped ? flipX(base) : base, art.palette, `cr:${id}:${flipped}:${breath}`)
}
/** World size of a following creature (its 80px art is drawn at this fraction). */
const CREATURE_WORLD = 0.3

/** Draw one frame of the map with its actors. */
export function drawWorld(ctx: CanvasRenderingContext2D, m: ResortMap, cam: Camera, actors: Actor[], now: number, creatures: CreatureActor[] = []) {
  const outdoor = !!m.outdoor
  const { w, h } = size(m)
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = outdoor ? '#bfe4f8' : '#101018'
  ctx.fillRect(0, 0, VIEW_W * RES, VIEW_H * RES)

  // floor, one screen row at a time (filtered, like a textured 3D floor, so it doesn't shimmer)
  const g = ground(m, Math.floor(now / 600) % 2 === 1 ? 1 : 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'low'
  for (let sy = 0; sy < VIEW_H * RES; sy++) {
    const v = ((sy + 0.5) / RES - Y0) / (C * D)
    const den = 1 + v * T
    if (den <= 0.05) continue
    const u = (v * D) / den
    const s = D / (D - u * T)
    const srcY = Math.floor((cam.y + u + PAD * TILE) * GROUND_RES)
    if (srcY < 0 || srcY >= g.height) continue
    const srcW = (VIEW_W / s) * GROUND_RES
    ctx.drawImage(g, (cam.x - VIEW_W / 2 / s + PAD * TILE) * GROUND_RES, srcY, srcW, 1, 0, sy, VIEW_W * RES, 1)
  }
  ctx.imageSmoothingEnabled = false
  // a little haze toward the back
  const haze = ctx.createLinearGradient(0, 0, 0, VIEW_H * RES * 0.45)
  haze.addColorStop(0, outdoor ? 'rgba(220,240,255,0.45)' : 'rgba(0,0,0,0.45)')
  haze.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = haze
  ctx.fillRect(0, 0, VIEW_W * RES, VIEW_H * RES * 0.45)

  // everything that stands up, sorted back to front
  type Item = { depth: number; draw: () => void }
  const items: Item[] = []
  const sprite = (img: HTMLCanvasElement, bx: number, by: number, anchorX: number, ws = 1) => {
    const p = project(cam, bx, by)
    if (p.s <= 0.2) return
    const dw = img.width * ws * p.s * RES
    const dh = img.height * ws * p.s * RES
    const dx = (p.x - anchorX * ws * p.s) * RES
    const dy = p.y * RES - dh
    if (dx > VIEW_W * RES || dx + dw < 0 || dy > VIEW_H * RES || dy + dh < 0) return
    ctx.drawImage(img, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh))
  }
  const shadow = (bx: number, by: number, rx: number) => {
    const p = project(cam, bx, by)
    ctx.fillStyle = 'rgba(20,24,40,0.28)'
    ctx.beginPath()
    ctx.ellipse(p.x * RES, p.y * RES, rx * p.s * RES, rx * 0.42 * p.s * C * RES, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // only tiles that can be on screen
  const y0 = Math.max(0, Math.floor((cam.y - 320) / TILE))
  const y1 = Math.min(h - 1, Math.ceil((cam.y + 70) / TILE))
  const x0 = Math.max(0, Math.floor((cam.x - 260) / TILE))
  const x1 = Math.min(w - 1, Math.ceil((cam.x + 260) / TILE))
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) {
      const def = tiles[tileAt(m, tx, ty)]
      if (!def?.prop) continue
      if (def.wall) {
        // walls only face you where there is open floor in front of them
        const front = tiles[tileAt(m, tx, ty + 1)]
        if (ty + 1 >= h || !front || front.wall || front.solid && !front.prop) continue
      }
      const prop = def.prop
      const img = pixelCanvas(prop.px, tilePalette, `prop:${tileAt(m, tx, ty)}`)
      const bx = tx * TILE + 8
      const by = (ty + 1) * TILE
      items.push({ depth: by, draw: () => (!def.wall && shadow(bx, by - 2, 7), sprite(img, bx, by, prop.anchorX)) })
    }
  for (const st of m.structures ?? []) {
    const art = structureArt[st.kind]
    const img = pixelCanvas(art, tilePalette, `structure:${st.kind}`)
    const by = (st.y + st.d) * TILE
    items.push({ depth: by, draw: () => sprite(img, st.x * TILE, by, 0) })
  }
  for (const a of actors) {
    const img = characterFrames(a.look)[a.facing][a.frame]
    items.push({ depth: a.y, draw: () => (shadow(a.x, a.y, 7), sprite(img, a.x, a.y + 1, OW_W / 2, OW_WORLD)) })
  }
  for (const c of creatures) {
    if (!creatureArtHi[c.id]) continue
    const img = creatureFrames(c.id, c.facing === 'right', c.breath)
    items.push({ depth: c.y, draw: () => (shadow(c.x, c.y, 6), sprite(img, c.x, c.y + 2 - c.hop, img.width / 2, CREATURE_WORLD)) })
  }
  items.sort((p, q) => p.depth - q.depth).forEach((i) => i.draw())
}

/** Where to aim the camera so the map edges don't swing too far into view. */
export function cameraFor(m: ResortMap, fx: number, fy: number): Camera {
  const { w, h } = size(m)
  const mw = w * TILE
  const mh = h * TILE
  const x = mw <= 200 ? mw / 2 : Math.max(100, Math.min(mw - 100, fx))
  const y = mh <= 150 ? mh / 2 + 34 : Math.max(96, Math.min(mh - 40, fy))
  return { x, y }
}
