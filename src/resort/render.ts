/**
 * The resort's 2.5D renderer (browser only).
 *
 * The floor is drawn like a tilted camera looking down at the map: each screen row samples one
 * row of a pre-rendered top-down ground image, scaled by its distance ("Mode 7"). Anything that
 * stands up — buildings, trees, walls, people — is an upright sprite placed with the same
 * projection, so it shrinks toward the back and overlaps correctly when sorted by depth.
 *
 * Projection (a homography, so straight lines stay straight):
 *   u = wy − camY,  scale = D / (D − u·T),  sx = W/2 + (wx − camX)·scale,  sy = H·FOCUS + u·scale·C
 */
import { hexToRgba, type Palette, type Pixels } from '../sprites/pixels'
import { overworldOverride } from '../sprites/assets'
import { overworldFor, OW_W, OW_WORLD, type Facing } from '../sprites/overworld'
import { paletteFor, type Appearance } from '../sprites/character'
import { creatureArtHi } from '../sprites/creatures'
import { flipX } from '../sprites/raster'
import { tiles, tilePalette, TILE } from './tiles'
import { structureArt } from './structures'
import { size, tileAt, type ResortMap } from './maps'
import { drawHorizon, drawSky, drawWeatherOverlay, type SkyState } from './sky'

export const VIEW_W = 256
/** Default view height; the actual height follows the screen's shape (taller screens see further). */
export const VIEW_H = 192
/** Internal resolution multiplier, so scaled sprites keep crisp pixels. */
export const RES = 4
/** The horizon-ish row where the camera's focus sits, as a fraction of the view height. */
const FOCUS = 0.8
const D = 230
const T = 0.8
const C = 0.74
/** Tiles of padding around each map (edge tiles repeated) so the far distance is never empty. */
const PAD = 16
/** The floor texture is pre-scaled so filtering keeps the pixel art crisp up close. */
const GROUND_RES = 2
/** Outdoors, the ground stops this many tiles past the north edge; the sky starts there. */
const NORTH_PAD = 1

export interface Camera {
  x: number
  y: number
}

export function project(cam: Camera, wx: number, wy: number, vh = VIEW_H) {
  const u = wy - cam.y
  const s = D / (D - u * T)
  return { x: VIEW_W / 2 + (wx - cam.x) * s, y: vh * FOCUS + u * s * C, s }
}

/** Largest scale anything is drawn at; past this the point is practically under the camera. */
const MAX_SCALE = 4
/**
 * Whether a projected ground point can be drawn. The projection is a perspective divide: points
 * more than D/T (~288px) south of the camera have a negative or exploding scale, so anything
 * standing there (a regular on the beach while you're up by the tower) must be skipped rather
 * than drawn with a negative size.
 */
export function inView(p: { y: number; s: number }, vh = VIEW_H): boolean {
  return p.s > 0.2 && p.s < MAX_SCALE && p.y < vh + 60
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
      if (m.outdoor && ty < -NORTH_PAD) continue
      const ch = tileAt(m, Math.max(0, Math.min(w - 1, tx)), Math.max(0, Math.min(h - 1, ty)))
      const def = tiles[ch] ?? tiles.X
      const v = !(frame && def.frame2) && def.variant ? def.variant(tx, ty) : null
      const px = frame && def.frame2 ? def.frame2 : (v?.px ?? def.px)
      ctx.drawImage(pixelCanvas(px, tilePalette, `tile:${ch}:${frame && def.frame2 ? 1 : 0}:${v?.id ?? ''}`), (tx + PAD) * TILE * GROUND_RES, (ty + PAD) * TILE * GROUND_RES, TILE * GROUND_RES, TILE * GROUND_RES)
    }
  // a one-pixel curb where paving meets grass, so the two read as separate surfaces as in BW
  // towns rather than a hard colour change
  if (m.outdoor) {
    ctx.fillStyle = tilePalette.P
    const at = (x: number, y: number) => tileAt(m, Math.max(0, Math.min(w - 1, x)), Math.max(0, Math.min(h - 1, y)))
    const R = GROUND_RES
    for (let ty = 0; ty < h; ty++)
      for (let tx = 0; tx < w; tx++) {
        if (at(tx, ty) !== ':') continue
        const ox = (tx + PAD) * TILE * R
        const oy = (ty + PAD) * TILE * R
        if (at(tx, ty - 1) === ',') ctx.fillRect(ox, oy, TILE * R, R)
        if (at(tx, ty + 1) === ',') ctx.fillRect(ox, oy + (TILE - 1) * R, TILE * R, R)
        if (at(tx - 1, ty) === ',') ctx.fillRect(ox, oy, R, TILE * R)
        if (at(tx + 1, ty) === ',') ctx.fillRect(ox + (TILE - 1) * R, oy, R, TILE * R)
      }
  }
  groundCache.set(key, c)
  return c
}

const characterCache = new Map<string, Record<Facing, HTMLCanvasElement[]>>()
export function characterFrames(look: Appearance): Record<Facing, HTMLCanvasElement[]> {
  const drawn = overworldOverride(look)
  if (drawn) return drawn
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
export function creatureFrames(id: string, flipped: boolean, breath: number): HTMLCanvasElement {
  const art = creatureArtHi[id]
  const split = Math.round(art.pixels.length * 0.62)
  const base = breath ? art.pixels.map((row, y) => (y + 2 < split ? art.pixels[y + 2] : y < split ? art.pixels[split] : row)) : art.pixels
  return pixelCanvas(flipped ? flipX(base) : base, art.palette, `cr:${id}:${flipped}:${breath}`)
}
/** World size of a following creature (its 80px art is drawn at this fraction). */
const CREATURE_WORLD = 0.3

/** Draw one frame of the map with its actors. */
export interface WorldExtras {
  /** sky, weather and time of day (outdoor maps) */
  sky?: SkyState
  /** drawn in the sky band, in front of clouds and hills but behind everything standing on the map (creatures flying overhead) */
  skyLayer?: (ctx: CanvasRenderingContext2D, horizonY: number) => void
  /** extra things that stand on the map and depth-sort with buildings and people (trainers landing or surfing in) */
  items?: (proj: (wx: number, wy: number) => { x: number; y: number; s: number }) => WorldItem[]
}

/** Something drawn in the depth-sorted pass: `depth` is its world y on the ground. */
export interface WorldItem {
  depth: number
  draw: (ctx: CanvasRenderingContext2D) => void
}

/** Where the world draws a walker's feet: one world pixel below their spot. */
export const FEET_DY = 1
/** A walker's shadow, world px across. */
export const WALKER_SHADOW = 7

/**
 * A soft contact shadow on the ground at canvas point (x, y), `r` world px across at scale `s`
 * (the projected scale). The same one under every walker and prop.
 */
export function groundShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, s: number, alpha = 0.28) {
  ctx.fillStyle = `rgba(20,24,40,${alpha})`
  ctx.beginPath()
  ctx.ellipse(x, y, r * s * RES, r * 0.42 * s * C * RES, 0, 0, Math.PI * 2)
  ctx.fill()
}

export function drawWorld(ctx: CanvasRenderingContext2D, m: ResortMap, cam: Camera, actors: Actor[], now: number, creatures: CreatureActor[] = [], vh = VIEW_H, extras: WorldExtras = {}) {
  const Y0 = vh * FOCUS
  const outdoor = !!m.outdoor
  const { w, h } = size(m)
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = outdoor ? '#bfe4f8' : '#101018'
  ctx.fillRect(0, 0, VIEW_W * RES, vh * RES)

  // sky down to where the ground ends, with distant hills on the horizon
  const sky = outdoor ? extras.sky : undefined
  if (sky) {
    const hz = project(cam, cam.x, -NORTH_PAD * TILE, vh)
    const hy = hz.s > 0 ? Math.round(hz.y * RES) : 0
    drawSky(ctx, VIEW_W * RES, hy, now, sky, RES)
    drawHorizon(ctx, VIEW_W * RES, hy, sky, RES)
    extras.skyLayer?.(ctx, hy)
  }

  // floor, one screen row at a time (filtered, like a textured 3D floor, so it doesn't shimmer)
  const g = ground(m, Math.floor(now / 600) % 2 === 1 ? 1 : 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'low'
  for (let sy = 0; sy < vh * RES; sy++) {
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
  // a little haze toward the back (indoors: shadow; outdoors without a sky: mist)
  if (!sky) {
    const haze = ctx.createLinearGradient(0, 0, 0, vh * RES * 0.45)
    haze.addColorStop(0, outdoor ? 'rgba(220,240,255,0.45)' : 'rgba(0,0,0,0.45)')
    haze.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = haze
    ctx.fillRect(0, 0, VIEW_W * RES, vh * RES * 0.45)
  }

  // everything that stands up, sorted back to front
  type Item = { depth: number; draw: () => void }
  const items: Item[] = []
  const sprite = (img: HTMLCanvasElement, bx: number, by: number, anchorX: number, ws = 1) => {
    const p = project(cam, bx, by, vh)
    if (!inView(p, vh)) return
    const dw = img.width * ws * p.s * RES
    const dh = img.height * ws * p.s * RES
    const dx = (p.x - anchorX * ws * p.s) * RES
    const dy = p.y * RES - dh
    if (dx > VIEW_W * RES || dx + dw < 0 || dy > vh * RES || dy + dh < 0) return
    // snap both edges (not the start and the size separately), so props in a row — counter
    // sections, wall panels — always meet exactly instead of leaving 1px seams between them
    const x0 = Math.round(dx)
    const y0 = Math.round(dy)
    ctx.drawImage(img, x0, y0, Math.round(dx + dw) - x0, Math.round(dy + dh) - y0)
  }
  const shadow = (bx: number, by: number, rx: number) => {
    const p = project(cam, bx, by, vh)
    if (!inView(p, vh)) return
    groundShadow(ctx, p.x * RES, p.y * RES, rx, p.s)
  }

  const lamps: Array<[number, number]> = []
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
      if (tileAt(m, tx, ty) === 'l' && inView(project(cam, bx, by, vh), vh)) lamps.push([bx, by])
      items.push({ depth: by, draw: () => (!def.wall && shadow(bx, by - 2, 7), sprite(img, bx, by, prop.anchorX)) })
    }
  // BW grounds its buildings with soft contact shading along the base: two stepped bands on the
  // ground in front of the footprint (flat steps, not a smooth gradient, to stay pixel-art)
  const contact = (x0: number, x1: number, by: number) => {
    for (const [d0, d1, alpha] of [[0, 2.5, 0.24], [2.5, 5, 0.12]] as const) {
      const q = [project(cam, x0 - 1, by + d0, vh), project(cam, x1 + 1, by + d0, vh), project(cam, x1 + 2, by + d1, vh), project(cam, x0 - 2, by + d1, vh)]
      if (!q.every((p) => inView(p, vh))) continue
      ctx.fillStyle = `rgba(20,24,40,${alpha})`
      ctx.beginPath()
      q.forEach((p, i) => (i ? ctx.lineTo(Math.round(p.x * RES), Math.round(p.y * RES)) : ctx.moveTo(Math.round(p.x * RES), Math.round(p.y * RES))))
      ctx.closePath()
      ctx.fill()
    }
  }
  for (const st of m.structures ?? []) {
    const art = structureArt[st.kind]
    const img = pixelCanvas(art, tilePalette, `structure:${st.kind}`)
    const by = (st.y + st.d) * TILE
    const grounded = m.outdoor && st.d > 1
    items.push({ depth: by, draw: () => (grounded && contact(st.x * TILE, (st.x + st.w) * TILE, by), sprite(img, st.x * TILE, by, 0)) })
  }
  const onMap = (x: number, y: number) => inView(project(cam, x, y, vh), vh)
  for (const a of actors) {
    if (!onMap(a.x, a.y)) continue
    const img = characterFrames(a.look)[a.facing][a.frame]
    items.push({ depth: a.y, draw: () => (shadow(a.x, a.y, WALKER_SHADOW), sprite(img, a.x, a.y + FEET_DY, OW_W / 2, OW_WORLD)) })
  }
  for (const c of creatures) {
    if (!creatureArtHi[c.id] || !onMap(c.x, c.y)) continue
    const img = creatureFrames(c.id, c.facing === 'right', c.breath)
    items.push({ depth: c.y, draw: () => (shadow(c.x, c.y, 6), sprite(img, c.x, c.y + 2 - c.hop, img.width / 2, CREATURE_WORLD)) })
  }
  for (const it of extras.items?.((wx, wy) => project(cam, wx, wy, vh)) ?? []) items.push({ depth: it.depth, draw: () => it.draw(ctx) })

  try {
    items.sort((p, q) => p.depth - q.depth).forEach((i) => i.draw())
  } finally {
    // time of day + weather over everything, then lamps glowing through the dark. This pass
    // always runs, so one bad sprite can never leave a frame without its night lighting.
    ctx.globalCompositeOperation = 'source-over'
    if (sky) {
      const glow = drawWeatherOverlay(ctx, VIEW_W * RES, vh * RES, now, sky, RES)
      if (glow > 0) {
        ctx.globalCompositeOperation = 'lighter'
        for (const [bx, by] of lamps) {
          const p = project(cam, bx, by, vh)
          const x = p.x * RES
          const y = (p.y - 36 * p.s) * RES
          const r = 26 * p.s * RES
          const gr = ctx.createRadialGradient(x, y, 0, x, y, r)
          gr.addColorStop(0, `rgba(255,220,120,${0.55 * glow})`)
          gr.addColorStop(1, 'rgba(255,220,120,0)')
          ctx.fillStyle = gr
          ctx.fillRect(x - r, y - r, r * 2, r * 2)
        }
        ctx.globalCompositeOperation = 'source-over'
      }
    }
  }
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
