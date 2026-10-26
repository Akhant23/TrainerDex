/**
 * The building around an indoor map (browser only). An indoor map is only its floor and the wall
 * along its back row, so without this the camera sees black above the wall and either side of the
 * floor. The shell fills that in the way a BW interior reads: the back wall carried across the full
 * width (corners included), what rises above it, and the two side walls running to the front,
 * drawn first so everything standing on the map is in front of it.
 *
 * The Battle Tower's style is a modern battle facility: steel-and-glass. Above the wall art a band
 * of tall windows looks out on the Sydney skyline (its colours follow the resort's time of day),
 * steel mullions between the panes, a ceiling with recessed light strips over it; the side walls are
 * pale panelling with seams, a lit LED strip and a dark skirting.
 */
import { sydney, type Silhouette } from '../sprites/skyline'
import { pixelCanvas, RES } from './render'
import { size, type ResortMap } from './maps'
import { tilePalette, tiles, TILE } from './tiles'
import type { SkyState } from './sky'

type Proj = (wx: number, wy: number) => { x: number; y: number; s: number }

/** The back wall's art (resort tiles) is this tall; the shell carries on above it. */
const WALL_TOP = 88
/** The window band above the wall: from just over the wall's crown to the ceiling. */
const GLASS_FROM = WALL_TOP + 4
const GLASS_H = 72
/** The front wall's face: the base colour under a tower map's floor (drawWorld fills with it). */
export const TOWER_FRONT = '#3a4258'

const GLASS: Record<SkyState['phase'], { sky: [string, string]; city: string; lit: boolean }> = {
  dawn: { sky: ['#f0a8a0', '#ffe4bc'], city: '#6a5a7a', lit: false },
  day: { sky: ['#5ea8e8', '#d4f0ff'], city: '#7a8ca8', lit: false },
  dusk: { sky: ['#5a4a9a', '#ff9e70'], city: '#3e3456', lit: true },
  night: { sky: ['#0c1430', '#26346a'], city: '#141c34', lit: true },
}

let city: Silhouette | undefined
const cache = new Map<string, HTMLCanvasElement>()
/** The view through the windows: sky and the far city, one 256×GLASS_H art-pixel strip per time of day. */
function cityStrip(phase: SkyState['phase']): HTMLCanvasElement {
  const hit = cache.get(phase)
  if (hit) return hit
  city ??= sydney()
  const g = GLASS[phase]
  const cv = document.createElement('canvas')
  cv.width = city.w
  cv.height = GLASS_H
  const c = cv.getContext('2d')!
  const grad = c.createLinearGradient(0, 0, 0, GLASS_H)
  grad.addColorStop(0, g.sky[0])
  grad.addColorStop(1, g.sky[1])
  c.fillStyle = grad
  c.fillRect(0, 0, cv.width, cv.height)
  const top = GLASS_H - city.h
  for (let y = 0; y < city.h; y++)
    for (let x = 0; x < city.w; x++) {
      const i = y * city.w + x
      if (!city.body[i]) continue
      c.fillStyle = g.lit && city.lights[i] ? '#ffe7a0' : g.city
      c.fillRect(x, top + y, 1, 1)
    }
  cache.set(phase, cv)
  return cv
}

/** Fill a quad on a side wall: from depth d0 to d1 along wall x, heights h0..h1 (world px). */
function sideQuad(c: CanvasRenderingContext2D, proj: Proj, x: number, d0: number, d1: number, h0: number, h1: number, fill: string) {
  const [a, b] = [proj(x, d0), proj(x, d1)]
  c.fillStyle = fill
  c.beginPath()
  c.moveTo(a.x * RES, (a.y - h0 * a.s) * RES)
  c.lineTo(b.x * RES, (b.y - h0 * b.s) * RES)
  c.lineTo(b.x * RES, (b.y - h1 * b.s) * RES)
  c.lineTo(a.x * RES, (a.y - h1 * a.s) * RES)
  c.closePath()
  c.fill()
}

/** Draw the tower shell round map `m` (the back wall's foot is the front edge of its second row). */
export function drawTowerShell(c: CanvasRenderingContext2D, m: ResortMap, proj: Proj, vh: number, sky?: SkyState) {
  const R = RES
  const { w, h } = size(m)
  const W = w * TILE
  const back = 2 * TILE
  const front = (h + 2) * TILE
  const b0 = proj(0, back)
  const s = b0.s
  const X = (wx: number) => Math.round((b0.x + wx * s) * R)
  const Y = (hgt: number) => Math.round((b0.y - hgt * s) * R)
  const tall = vh * 4

  // a lit lip along the floor's front edge, over the front wall's face (drawWorld's base fill,
  // TOWER_FRONT), so the strip the camera shows past the floor reads as the building, not as black
  const f0 = proj(0, h * TILE)
  const f1 = proj(W, h * TILE)
  c.fillStyle = '#6a7490'
  c.fillRect(Math.round(f0.x * R), Math.round(f0.y * R), Math.round((f1.x - f0.x) * R), Math.round(2 * f0.s * R))

  // the side walls first (the back wall overlaps their far ends)
  for (const [x, lit] of [[0, '#b8c2d4'], [W, '#aeb8cc']] as const) {
    sideQuad(c, proj, x, back, front, 0, tall, lit)
    // panel seams along the wall, a lit strip at shoulder height, a dark skirting, the ceiling line
    for (let d = back + 20; d < front; d += 20) {
      const [p, q] = [proj(x, d), proj(x, d + 1.2)]
      c.fillStyle = '#98a2b8'
      c.beginPath()
      c.moveTo(p.x * R, (p.y - 6 * p.s) * R)
      c.lineTo(q.x * R, (q.y - 6 * q.s) * R)
      c.lineTo(q.x * R, (q.y - (GLASS_FROM + GLASS_H) * q.s) * R)
      c.lineTo(p.x * R, (p.y - (GLASS_FROM + GLASS_H) * p.s) * R)
      c.closePath()
      c.fill()
    }
    sideQuad(c, proj, x, back, front, 0, 6, '#4a5268')
    sideQuad(c, proj, x, back, front, 52, 55, '#e8f4ff')
    sideQuad(c, proj, x, back, front, 55, 56, '#7ac8f0')
    sideQuad(c, proj, x, back, front, GLASS_FROM + GLASS_H, tall, '#5a6378')
  }

  // above the wall: the window band, steel mullions, a transom, then the ceiling with light strips.
  // All of it stays inside the back wall's width: the city strip is tiled 256 px at a time and the
  // reflections slant, so unclipped they ran past the corner and over the side wall's top
  const strip = cityStrip(sky?.phase ?? 'day')
  const gTop = Y(GLASS_FROM + GLASS_H)
  const gBot = Y(GLASS_FROM)
  c.imageSmoothingEnabled = false
  c.save()
  c.beginPath()
  c.rect(X(0), 0, X(W) - X(0), Y(WALL_TOP))
  c.clip()
  for (let x = 0; x < W; x += strip.width) c.drawImage(strip, X(x), gTop, X(x + strip.width) - X(x), gBot - gTop)
  c.fillStyle = 'rgba(255,255,255,0.10)'
  for (let x = 6; x < W; x += 32) {
    // a pale reflection slanting across each pane
    c.beginPath()
    c.moveTo(X(x), gBot)
    c.lineTo(X(x + 6), gBot)
    c.lineTo(X(x + 18), gTop)
    c.lineTo(X(x + 12), gTop)
    c.closePath()
    c.fill()
  }
  c.fillStyle = '#3a4258'
  for (let x = 0; x <= W; x += 32) c.fillRect(X(x) - Math.round(2 * s * R), gTop, Math.round(4 * s * R), gBot - gTop)
  c.fillRect(X(0), Y(GLASS_FROM + GLASS_H * 0.62) - Math.round(s * R), X(W) - X(0), Math.round(2 * s * R))
  c.fillStyle = '#5a6378'
  c.fillRect(X(0), gBot, X(W) - X(0), Y(WALL_TOP) - gBot)
  c.fillStyle = '#2c3346'
  c.fillRect(X(0), 0, X(W) - X(0), gTop)
  c.fillStyle = '#434c64'
  c.fillRect(X(0), gTop - Math.round(4 * s * R), X(W) - X(0), Math.round(4 * s * R))
  for (let x = 12; x < W - 8; x += 40) {
    c.fillStyle = '#f2f8ff'
    c.fillRect(X(x), gTop - Math.round(10 * s * R), Math.round(22 * s * R), Math.round(2.4 * s * R))
    c.fillStyle = 'rgba(200,232,255,0.18)'
    c.fillRect(X(x) - Math.round(4 * s * R), gTop - Math.round(8 * s * R), Math.round(30 * s * R), Math.round(6 * s * R))
  }
  c.restore()

  // the back wall's own art in every column, the corners included (the map's own wall props, the
  // PC and the lift, are drawn over it in the depth pass)
  const wall = pixelCanvas(tiles.X.prop!.px, tilePalette, 'prop:X')
  for (let tx = 0; tx < w; tx++) {
    const p = proj(tx * TILE, back)
    const x0 = Math.round(p.x * R)
    const y0 = Math.round((p.y - wall.height * p.s) * R)
    c.drawImage(wall, x0, y0, Math.round((p.x + TILE * p.s) * R) - x0, Math.round(p.y * R) - y0)
  }
}
