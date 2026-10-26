import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { navigate } from '../app/router'
import { medals } from '../content/medals'
import { shinySignature, signature, towerStages } from '../content/aaryan'
import { staff } from '../resort/npcs'
import { regulars } from '../resort/regulars'
import { habitatIds, paintHabitat, type HabitatId } from '../sprites/habitats'
import { HAB_H, HAB_W } from '../sprites/habitat-kit'
import { blocked, CASES, CURATOR, DOOR, ENTRANCE, hall, nearestFloor, pathTo, PODIUM, slotOf, standFor, type Case } from '../resort/medalHall'
import { cameraYToShow, drawWorld, pixelCanvas, RES, unproject, VIEW_H, VIEW_W, type Actor, type Camera, type CreatureActor, type WorldItem } from '../resort/render'
import { structureArt } from '../resort/structures'
import { tilePalette, tiles, TILE } from '../resort/tiles'
import type { Spot } from '../resort/maps'
import { MEDAL_TIER_COLOURS, medalPixels } from '../sprites/medalArt'
import { strideFrame, type Facing } from '../sprites/overworld'
import { paletteFor, PORTRAIT, renderFlat, type Appearance } from '../sprites/character'
import { creatureArt } from '../sprites/creatures'
import { crop, type Palette, type Pixels } from '../sprites/pixels'
import { useSettings } from '../systems/settings'
import { DialogueBox } from '../ui/DialogueBox'

/** Aaryan's partner walks a step behind him, as on the main menu's platform. */
const PARTNER = 'gavelion'
const WALK_MS = 170
/** The camera holds still, the whole hall in view like a diorama: the front wall on the view's bottom edge. */
const camFor = (vh: number): Camera => ({ x: 7 * TILE, y: cameraYToShow(hall.rows.length * TILE, vh) })
/** The hall's walls: the back wall's art (from the resort's tiles) runs this high; above it the wallpaper goes on up. */
const WALL_TOP = 88
const HALL_W = hall.rows[0].length * TILE
const curatorLook: Appearance = { ...staff.find((s) => s.id === 'receptionist')!.look, hair: 'bun', hairColour: 'auburn', topColour: 'red' }

/* ---------------- the display cases' art (art pixels = world pixels) ---------------- */

const VELVET = { gold: ['#6a1830', '#4a1022'], silver: ['#22305e', '#18224a'], bronze: ['#1e4a34', '#143424'] } as const
const WOOD = { dark: '#5e3c20', mid: '#8a5a32', light: '#b07a44', ink: '#1c1a24' }
const SLOT_H = 17
const CORNICE = 4
const BASE = 7

/** A case's art size, and where slot (col, row) sits in it. */
function caseGeom(c: Case) {
  const w = c.cols * TILE
  const crown = c.tier === 'gold' ? 6 : 0
  const h = crown + CORNICE + c.rows * SLOT_H + 1 + BASE
  const pitch = (w - 4) / c.cols
  return { w, h, crown, slot: (col: number, row: number) => ({ x: 2 + Math.floor(col * pitch + (pitch - 14) / 2), y: crown + CORNICE + row * SLOT_H + 1, w: 14, h: 16 }) }
}

const caseCache = new Map<string, HTMLCanvasElement>()
/** One case: a wooden cabinet with a velvet back and glass front, medals on their shelves (dark outlines for those still to earn). */
function caseArt(c: Case, earned: ReadonlySet<string>, selected: number, blink: boolean, sparkle: number): HTMLCanvasElement {
  const key = `${c.tier}:${c.medals.map((m) => (earned.has(m.id) ? 1 : 0)).join('')}:${selected}:${blink}:${sparkle}`
  const hit = caseCache.get(key)
  if (hit) return hit
  const { w, h, crown, slot } = caseGeom(c)
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const g = cv.getContext('2d')!
  const rect = (x: number, y: number, rw: number, rh: number, col: string) => ((g.fillStyle = col), g.fillRect(x, y, rw, rh))
  const [velvet, velvetShade] = VELVET[c.tier]
  const metal = MEDAL_TIER_COLOURS[c.tier]
  // a little crown of gold on the gold case
  if (crown) {
    rect(w / 2 - 6, crown - 2, 12, 2, WOOD.ink)
    for (const [x, ht] of [[w / 2 - 6, 4], [w / 2 - 1, 6], [w / 2 + 4, 4]] as const) {
      rect(x - 1, crown - ht, 3, ht, WOOD.ink)
      rect(x, crown - ht + 1, 1, ht - 1, metal.A)
    }
    rect(w / 2 - 5, crown - 1, 10, 1, metal.A)
  }
  // the cabinet: an ink outline, wooden frame, cornice lit along the top
  rect(0, crown, w, h - crown, WOOD.ink)
  rect(1, crown + 1, w - 2, h - crown - 2, WOOD.mid)
  rect(1, crown + 1, w - 2, 1, WOOD.light)
  rect(1, crown + CORNICE - 1, w - 2, 1, WOOD.dark)
  // the velvet back, shaded under the cornice, with a shelf under each row
  const inner = { x: 2, y: crown + CORNICE, w: w - 4, h: c.rows * SLOT_H + 1 }
  rect(inner.x, inner.y, inner.w, inner.h, velvet)
  rect(inner.x, inner.y, inner.w, 2, velvetShade)
  for (let r = 1; r <= c.rows; r++) {
    const y = inner.y + r * SLOT_H - 1
    rect(inner.x, y, inner.w, 1, WOOD.light)
    rect(inner.x, y + 1, inner.w, 1, WOOD.dark)
  }
  // the medals
  c.medals.forEach((m, i) => {
    const s = slot(i % c.cols, Math.floor(i / c.cols))
    const have = earned.has(m.id)
    const pal: Record<string, string> = { K: WOOD.ink, R: '#e0383e', B: '#3a6fd0', ...metal }
    medalPixels.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return
        rect(s.x + x, s.y + y, 1, 1, have ? pal[ch] : ch === 'K' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.28)')
      }),
    )
    // a glint that travels from medal to medal
    if (have && sparkle === i) {
      rect(s.x + 11, s.y + 6, 1, 3, '#ffffff')
      rect(s.x + 10, s.y + 7, 3, 1, '#ffffff')
    }
  })
  // the medal picked on the bottom screen: blinking gold corners round its slot
  const sel = c.medals.findIndex((m) => medals[selected]?.id === m.id)
  if (sel >= 0 && blink) {
    const s = slot(sel % c.cols, Math.floor(sel / c.cols))
    const [x0, y0, x1, y1] = [s.x - 1, s.y - 1, s.x + s.w, s.y + s.h - 1]
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) {
      rect(x, y, 1, 1, '#ffe14a')
      rect(x + dx, y, 1, 1, '#ffe14a')
      rect(x, y + dy, 1, 1, '#ffe14a')
    }
  }
  // the glass: two pale streaks across the front
  g.fillStyle = 'rgba(255,255,255,0.16)'
  for (const off of [4, 9]) {
    g.beginPath()
    g.moveTo(inner.x + off, inner.y)
    g.lineTo(inner.x + off + 3, inner.y)
    g.lineTo(inner.x + off - 7, inner.y + inner.h)
    g.lineTo(inner.x + off - 10, inner.y + inner.h)
    g.closePath()
    g.fill()
  }
  // the plinth, with a brass plate in the tier's metal
  const by = inner.y + inner.h
  rect(1, by, w - 2, BASE - 1, WOOD.dark)
  rect(1, by, w - 2, 1, WOOD.light)
  rect(w / 2 - 5, by + 2, 10, 3, WOOD.ink)
  rect(w / 2 - 4, by + 2, 8, 2, metal.A)
  rect(w / 2 - 4, by + 2, 8, 1, metal.W)
  caseCache.set(key, cv)
  return cv
}

/** The podium: a marble plinth with gold trim, the newest medal hovering over it in a glow. */
const PODIUM_W = PODIUM.w * TILE
const PODIUM_H = 22
let podiumCanvas: HTMLCanvasElement | undefined
function podiumArt(): HTMLCanvasElement {
  if (podiumCanvas) return podiumCanvas
  const cv = document.createElement('canvas')
  cv.width = PODIUM_W
  cv.height = PODIUM_H
  const g = cv.getContext('2d')!
  const rect = (x: number, y: number, rw: number, rh: number, col: string) => ((g.fillStyle = col), g.fillRect(x, y, rw, rh))
  rect(2, 0, PODIUM_W - 4, PODIUM_H, WOOD.ink)
  rect(0, PODIUM_H - 6, PODIUM_W, 6, WOOD.ink)
  rect(3, 1, PODIUM_W - 6, 4, '#f4f2fa')
  rect(3, 5, PODIUM_W - 6, PODIUM_H - 11, '#d6dce8')
  rect(PODIUM_W - 10, 5, 7, PODIUM_H - 11, '#a8b0c4')
  rect(3, 5, PODIUM_W - 6, 1, '#e0b030')
  rect(1, PODIUM_H - 5, PODIUM_W - 2, 4, '#c8a018')
  rect(1, PODIUM_H - 5, PODIUM_W - 2, 1, '#f8d040')
  // a red velvet cushion on top
  rect(8, 0, PODIUM_W - 16, 2, '#c83c48')
  podiumCanvas = cv
  return cv
}

function medalCanvas(index: number): HTMLCanvasElement {
  const m = medals[index]
  return pixelCanvas(medalPixels, { K: '#1c1a24', R: '#e0383e', B: '#3a6fd0', ...MEDAL_TIER_COLOURS[m.tier] }, `medal:${m.tier}`)
}

type Proj = (wx: number, wy: number) => { x: number; y: number; s: number }
const backWall = () => pixelCanvas(tiles.X.prop!.px, tilePalette, 'prop:X')

/* ---------------- pictures on the walls ---------------- */

/** A picture in a gilt frame, at art resolution: `paint` draws the picture itself into the inside (w × h). */
const framedCache = new Map<string, HTMLCanvasElement>()
function framedWith(key: string, aw: number, ah: number, mat: string, paint: (g: CanvasRenderingContext2D, x: number, y: number) => void): HTMLCanvasElement {
  const hit = framedCache.get(key)
  if (hit) return hit
  const F = 6
  const [w, h] = [aw + F * 2, ah + F * 2]
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const g = cv.getContext('2d')!
  const rect = (x: number, y: number, rw: number, rh: number, col: string) => ((g.fillStyle = col), g.fillRect(x, y, rw, rh))
  // the frame: an ink edge, gilt with a lit top-left and a shaded bottom-right, an ink inner line
  rect(0, 0, w, h, WOOD.ink)
  rect(1, 1, w - 2, h - 2, '#c8a018')
  rect(1, 1, w - 2, 2, '#f8d040')
  rect(1, 1, 2, h - 2, '#f8d040')
  rect(1, h - 3, w - 2, 2, '#9a7410')
  rect(w - 3, 1, 2, h - 2, '#9a7410')
  for (const [x, y] of [[2, 2], [w - 4, 2], [2, h - 4], [w - 4, h - 4]]) rect(x, y, 2, 2, '#fff2a8')
  rect(F - 1, F - 1, w - F * 2 + 2, h - F * 2 + 2, WOOD.ink)
  // the mat, a little lighter at the top, then the picture
  rect(F, F, w - F * 2, h - F * 2, mat)
  rect(F, F, w - F * 2, Math.round((h - F * 2) / 3), mixWhite(mat))
  paint(g, F, F)
  framedCache.set(key, cv)
  return cv
}
function framed(key: string, art: Pixels, pal: Palette, mat: string): HTMLCanvasElement {
  return framedWith(key, art[0].length, art.length, mat, (g, x0, y0) =>
    art.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return
        g.fillStyle = pal[ch]
        g.fillRect(x0 + x, y0 + y, 1, 1)
      }),
    ),
  )
}
const mixWhite = (h: string) => `#${[1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * 0.7 + 255 * 0.3).toString(16).padStart(2, '0')).join('')}`

const portraitOf = (look: Appearance) => crop(renderFlat(look), PORTRAIT.x, PORTRAIT.y, PORTRAIT.w, PORTRAIT.h)
/** A Pokédex habitat as a small landscape painting (the scene scaled down, softly, like brushwork). */
function landscape(id: HabitatId, mat: string): HTMLCanvasElement {
  return framedWith(`habitat:${id}`, 64, 48, mat, (g, x, y) => {
    const src = document.createElement('canvas')
    src.width = HAB_W
    src.height = HAB_H
    src.getContext('2d')!.putImageData(new ImageData(paintHabitat(id, 0).toRGBA() as Uint8ClampedArray<ArrayBuffer>, HAB_W, HAB_H), 0, 0)
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    g.drawImage(src, x, y, 64, 48)
  })
}

const MATS = ['#8cc4ec', '#f0d898', '#b8e0b0', '#e8c0d8', '#a8b8d8', '#e8d8b0', '#d8b0b8', '#b0d8d0']
/**
 * Everything on the walls, in hanging order: Aaryan (and his shiny look), his partners and the
 * other creatures, his past selves from the tower, the resort's regulars and staff, and a few
 * landscapes of the Pokédex habitats. Built on first use (the hall's own chunk).
 */
let gallery: HTMLCanvasElement[] | undefined
function galleryPictures(): HTMLCanvasElement[] {
  if (gallery) return gallery
  const people: Array<[string, Appearance]> = [
    ['aaryan', signature],
    ...towerStages.map((st) => [`stage:${st.id}`, st.look] as [string, Appearance]),
    ['aaryan-shiny', shinySignature],
    ...regulars.map((r) => [`regular:${r.id}`, r.look] as [string, Appearance]),
    ...staff.map((st) => [`staff:${st.id}`, st.look] as [string, Appearance]),
  ]
  const creatures = Object.keys(creatureArt)
  const scenes = habitatIds.slice(0, 6)
  const out: HTMLCanvasElement[] = []
  // interleave the three kinds, so no wall is all faces or all creatures
  for (let i = 0; out.length < people.length + creatures.length + scenes.length; i++) {
    const mat = MATS[i % MATS.length]
    if (i < creatures.length) out.push(framed(`creature:${creatures[i]}`, creatureArt[creatures[i]].pixels, creatureArt[creatures[i]].palette, mat))
    if (i < people.length) out.push(framed(`person:${people[i][0]}`, portraitOf(people[i][1]), paletteFor(people[i][1]), MATS[(i + 3) % MATS.length]))
    if (i < scenes.length) out.push(landscape(scenes[i], '#3a3448'))
  }
  gallery = out
  return out
}

/** One hung picture: where on which wall, its bottom edge's height and its width (world px). */
interface Hung {
  wall: 'back' | 'left' | 'right'
  /** x along the back wall, or depth along a side wall (its left/back edge) */
  at: number
  hang: number
  width: number
  pic: number
}
/** How high the walls are hung (world px): rows up to here, past the top of the tallest view. */
const HANG_TOP = 300
/**
 * The hang, salon-style, filling every wall to the ceiling: above the back wall, four columns
 * between the lamp cords, rows alternating one larger picture and two smaller; on each side wall,
 * four columns above the dado rail. Pictures are taken from the gallery in turn.
 */
const HANG: Hung[] = (() => {
  const out: Hung[] = []
  let n = 0
  const aspect = 1.12 // a picture's height for its width, near enough for spacing the rows
  for (let col = 0; col < 4; col++) {
    let hang = WALL_TOP + 8
    for (let row = 0; hang < HANG_TOP; row++) {
      const x0 = col * 56 + 4
      if ((row + col) % 2 === 0) {
        out.push({ wall: 'back', at: x0 + 9, hang, width: 30, pic: n++ })
        hang += 30 * aspect + 7
      } else {
        out.push({ wall: 'back', at: x0, hang, width: 22, pic: n++ })
        out.push({ wall: 'back', at: x0 + 26, hang, width: 22, pic: n++ })
        hang += 22 * aspect + 7
      }
    }
  }
  for (const wall of ['left', 'right'] as const)
    for (let col = 0; col < 4; col++) {
      let hang = WALL_TOP - 36
      for (let row = 0; hang < HANG_TOP; row++) {
        const w = (row + col) % 3 === 0 ? 26 : 22
        out.push({ wall, at: 38 + col * 30 + (26 - w) / 2, hang, width: w, pic: n++ })
        hang += w * aspect + 8
      }
    }
  return out
})()

/** The hall's shell: back wall and wallpaper up to the ceiling, and the side walls (in view px; drawn at RES). */
function drawShell(c: CanvasRenderingContext2D, proj: Proj, vh: number) {
  const R = RES
  const back = 2 * TILE
  const front = hall.rows.length * TILE
  const b0 = proj(0, back)
  const b1 = proj(HALL_W, back)
  // wallpaper above the wall art, up past the top of the view, with a pinstripe and a crown moulding
  const top = b0.y - WALL_TOP * b0.s
  c.fillStyle = '#c9d0de'
  c.fillRect(Math.round(b0.x * R), 0, Math.round((b1.x - b0.x) * R), Math.ceil(top * R) + 1)
  c.fillStyle = '#bcc4d4'
  for (let x = 4; x < HALL_W; x += 8) c.fillRect(Math.round((b0.x + x * b0.s) * R), 0, Math.max(1, Math.round(b0.s * R)), Math.round(top * R))
  c.fillStyle = '#8a92a8'
  c.fillRect(Math.round(b0.x * R), Math.round((top - 3 * b0.s) * R), Math.round((b1.x - b0.x) * R), Math.round(3 * b0.s * R))
  c.fillStyle = '#e8ecf4'
  c.fillRect(Math.round(b0.x * R), Math.round((top - 3 * b0.s) * R), Math.round((b1.x - b0.x) * R), Math.max(1, Math.round(b0.s * R)))
  // the back wall's own art in every column, corners included
  const wall = backWall()
  for (let tx = 0; tx < hall.rows[0].length; tx++) {
    const p = proj(tx * TILE, back)
    const x0 = Math.round(p.x * R)
    const y0 = Math.round((p.y - wall.height * p.s) * R)
    c.drawImage(wall, x0, y0, Math.round((p.x + TILE * p.s) * R) - x0, Math.round(p.y * R) - y0)
  }
  // the side walls: from the back corner to the front, floor to ceiling, a shade darker (they face
  // across the room, not toward you), with the same skirting, dado and crown lines
  for (const [x, dir] of [[0, 1], [HALL_W, -1]] as const) {
    const pb = proj(x, back)
    const pf = proj(x, front + TILE * 2)
    const quad = (hb: number, hf: number, h2b: number, h2f: number, fill: string) => {
      c.fillStyle = fill
      c.beginPath()
      c.moveTo(pb.x * R, (pb.y - hb * pb.s) * R)
      c.lineTo(pf.x * R, (pf.y - hf * pf.s) * R)
      c.lineTo(pf.x * R, (pf.y - h2f * pf.s) * R)
      c.lineTo(pb.x * R, (pb.y - h2b * pb.s) * R)
      c.closePath()
      c.fill()
    }
    const tall = vh * 3
    quad(0, 0, tall, tall, dir > 0 ? '#aeb6c8' : '#a4acc0')
    quad(0, 0, 6, 6, '#6c7488')
    quad(WALL_TOP - 44, WALL_TOP - 44, WALL_TOP - 42, WALL_TOP - 42, '#8a92a8')
    quad(WALL_TOP - 3, WALL_TOP - 3, WALL_TOP, WALL_TOP, '#8a92a8')
  }
  // the pictures, hung to the ceiling: flat on the back wall, skewed along the side walls
  c.imageSmoothingEnabled = false
  const pics = galleryPictures()
  for (const hp of HANG) {
    const img = pics[hp.pic % pics.length]
    const ww = hp.width
    const wh = (img.height / img.width) * ww
    if (hp.wall === 'back') {
      const p = proj(hp.at, back)
      const [w, h] = [ww * p.s, wh * p.s]
      const x0 = Math.round(p.x * R)
      const y0 = Math.round((p.y - hp.hang * p.s - h) * R)
      if (y0 + h * R < 0) continue
      c.fillStyle = 'rgba(20,24,40,0.25)'
      c.fillRect(x0 + Math.round(p.s * R), y0 + Math.round(p.s * R), Math.round(w * R), Math.round(h * R))
      c.drawImage(img, x0, y0, Math.round(w * R), Math.round(h * R))
      continue
    }
    // a side wall: the picture runs along the wall from depth `at` (back) to `at + width` (front)
    const x = hp.wall === 'right' ? HALL_W : 0
    const pb = proj(x, hp.at)
    const pf = proj(x, hp.at + ww)
    const top = (q: { x: number; y: number; s: number }) => ({ x: q.x * R, y: (q.y - (hp.hang + wh) * q.s) * R })
    const tb = top(pb)
    const tf = top(pf)
    if (tb.y + wh * pb.s * R < 0 && tf.y + wh * pf.s * R < 0) continue
    c.save()
    c.setTransform((tf.x - tb.x) / img.width, (tf.y - tb.y) / img.width, 0, (wh * pb.s * R) / img.height, tb.x, tb.y)
    c.drawImage(img, 0, 0)
    // the side walls face across the room: the pictures on them catch a little less light
    c.fillStyle = 'rgba(20,24,40,0.12)'
    c.fillRect(0, 0, img.width, img.height)
    c.restore()
  }
}

/** A brass pendant lamp hung from the ceiling over a case, and the warm cone of light it throws onto it. */
function drawLamp(c: CanvasRenderingContext2D, at: { x: number; y: number; s: number }, base: { x: number; y: number; s: number }, width: number) {
  const R = RES
  const h = 104
  const x = at.x * R
  const y = (at.y - h * at.s) * R
  const u = at.s * R
  // the light first, so the lamp sits on top of it
  c.globalCompositeOperation = 'lighter'
  const cone = c.createLinearGradient(0, y, 0, base.y * R)
  cone.addColorStop(0, 'rgba(255,232,170,0.20)')
  cone.addColorStop(1, 'rgba(255,232,170,0.04)')
  c.fillStyle = cone
  c.beginPath()
  c.moveTo(x - 4 * u, y + 4 * u)
  c.lineTo(x + 4 * u, y + 4 * u)
  c.lineTo(x + (width / 2 + 2) * base.s * R, base.y * R)
  c.lineTo(x - (width / 2 + 2) * base.s * R, base.y * R)
  c.closePath()
  c.fill()
  c.globalCompositeOperation = 'source-over'
  // the cord up to the ceiling, the shade, the bulb
  c.fillStyle = '#3a3448'
  c.fillRect(Math.round(x - 0.5 * u), 0, Math.max(1, Math.round(u)), Math.round(y - 3 * u))
  c.fillStyle = '#1c1a24'
  c.beginPath()
  c.moveTo(x - 3 * u, y - 4 * u)
  c.lineTo(x + 3 * u, y - 4 * u)
  c.lineTo(x + 6 * u, y + 2 * u)
  c.lineTo(x - 6 * u, y + 2 * u)
  c.closePath()
  c.fill()
  c.fillStyle = '#c8a018'
  c.beginPath()
  c.moveTo(x - 2 * u, y - 3 * u)
  c.lineTo(x + 2 * u, y - 3 * u)
  c.lineTo(x + 5 * u, y + 1 * u)
  c.lineTo(x - 5 * u, y + 1 * u)
  c.closePath()
  c.fill()
  c.fillStyle = '#f8d040'
  c.fillRect(Math.round(x - 2 * u), Math.round(y - 3 * u), Math.round(2 * u), Math.round(1 * u))
  c.fillStyle = '#fff6c8'
  c.fillRect(Math.round(x - 2 * u), Math.round(y + 1 * u), Math.round(4 * u), Math.round(1.5 * u))
}

/* ---------------- the room ---------------- */

type Hit = { x: number; y: number; w: number; h: number; on: () => void }
interface Walker {
  x: number
  y: number
  facing: Facing
  moving: null | { fx: number; fy: number; tx: number; ty: number; t0: number }
}

/**
 * The Medal Box's top screen: the Medal Hall, walkable like the Battle Resort. Picking a medal on
 * the bottom screen walks Aaryan to its slot in the case; tapping the floor walks him there,
 * tapping a medal in a case picks it, the podium shows the newest medal, the curator talks, and
 * the door mat leads back out to the menu.
 */
export default function MedalHall({ focus, earned, onPick }: { focus: number; earned: Partial<Record<string, string>>; onPick: (i: number) => void }) {
  const { sfx, reducedMotion } = useSettings()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewH = useRef(VIEW_H)
  const [dialogue, setDialogue] = useState<string[] | null>(null)
  const [fade, setFade] = useState(false)
  const me = useRef<Walker & { path: Spot[]; face?: Facing; then?: () => void; idleAt: number }>({ ...ENTRANCE, moving: null, path: [], idleAt: 0 })
  const pet = useRef<Walker>({ x: ENTRANCE.x - 1, y: ENTRANCE.y, facing: 'up', moving: null })
  const hits = useRef<Hit[]>([])
  const steps = useRef(0)
  const state = useRef({ focus, earned, reducedMotion, busy: false })
  state.current = { focus, earned, reducedMotion, busy: !!dialogue || fade }

  // the view gets taller (sees more of the hall) when the screen is taller than 4:3
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const fit = () => {
      const aspect = c.clientWidth ? Math.min(1.5, Math.max(0.6, c.clientHeight / c.clientWidth)) : 0.75
      viewH.current = Math.round(VIEW_W * aspect)
      c.height = viewH.current * RES
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(c)
    return () => ro.disconnect()
  }, [])

  /** Walk to a tile (by the shortest way round), then face `face` and do `then`. */
  const walkTo = (to: Spot, face?: Facing, then?: () => void) => {
    const m = me.current
    const from = m.moving ? { x: m.moving.tx, y: m.moving.ty } : m
    const path = pathTo(from, to)
    if (!path.length && (from.x !== to.x || from.y !== to.y)) return sfx('bump')
    Object.assign(m, { path, face, then })
    if (!path.length && !m.moving) arrive()
  }
  const arrive = () => {
    const m = me.current
    if (m.face) m.facing = m.face
    m.idleAt = performance.now()
    const then = m.then
    m.then = undefined
    m.face = undefined
    if (DOOR.some((d) => d.x === m.x && d.y === m.y)) {
      sfx('back')
      setFade(true)
      window.setTimeout(() => navigate('/'), reducedMotion ? 0 : 260)
      return
    }
    then?.()
  }
  const ctl = useRef({ walkTo, arrive })
  ctl.current = { walkTo, arrive }

  // picking a medal (on either screen) walks him over to look at it
  useEffect(() => {
    const s = standFor(focus)
    ctl.current.walkTo(s, s.facing)
  }, [focus])

  const talkToCurator = () => {
    const n = Object.keys(state.current.earned).length
    sfx('select')
    setDialogue([
      'CURATOR: Welcome to the Medal Hall! Every medal earned around the site goes on display here.',
      `CURATOR: ${n} of ${medals.length} so far. ${n === medals.length ? 'The whole collection. Remarkable!' : 'The dark outlines are the ones still out there to find.'}`,
      'CURATOR: Medals are kept in this browser only, so the collection stays with this device.',
    ])
  }
  const lookAtPodium = () => {
    const latest = latestMedal(state.current.earned)
    sfx('select')
    setDialogue(latest < 0 ? ['The podium is waiting for the first medal.'] : [`On the podium: the newest medal, ${medals[latest].name}.`, medals[latest].description])
  }

  // dev only: where Aaryan is and where he's headed (window.__hallMe), for QA
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __hallMe?: () => unknown }).__hallMe = () => ({ ...me.current, pet: pet.current, hits: hits.current.map((h) => ({ x: h.x, y: h.y, w: h.w, h: h.h })) })
  }, [])

  /* ----- the render loop ----- */
  useEffect(() => {
    let raf = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const vh = viewH.current
      const { focus: sel, earned: got, reducedMotion: still } = state.current
      const have = new Set(Object.keys(got))
      const m = me.current
      const pt = pet.current

      // stepping
      if (m.moving && now - m.moving.t0 >= WALK_MS) {
        m.x = m.moving.tx
        m.y = m.moving.ty
        m.moving = null
        if (!m.path.length) ctl.current.arrive()
      }
      if (pt.moving && now - pt.moving.t0 >= WALK_MS) {
        pt.x = pt.moving.tx
        pt.y = pt.moving.ty
        pt.moving = null
      }
      if (!m.moving && m.path.length) {
        const n = m.path.shift()!
        if (blocked(n.x, n.y)) m.path = []
        else {
          m.facing = n.x > m.x ? 'right' : n.x < m.x ? 'left' : n.y > m.y ? 'down' : 'up'
          m.moving = { fx: m.x, fy: m.y, tx: n.x, ty: n.y, t0: now }
          steps.current++
          // the partner steps into the tile he just left
          if (pt.x !== m.x || pt.y !== m.y) {
            pt.facing = pt.x < m.x ? 'right' : pt.x > m.x ? 'left' : pt.y < m.y ? 'down' : 'up'
            pt.moving = { fx: pt.x, fy: pt.y, tx: m.x, ty: m.y, t0: now }
          }
        }
      }
      // left alone for a while, he glances along the cases
      if (!m.moving && !m.path.length && !still && now - m.idleAt > 5000) {
        m.facing = (['left', 'up', 'right', 'up'] as const)[Math.floor(now / 5000) % 4]
        m.idleAt = now - 2500
      }
      const at = (w: Walker) => {
        const k = w.moving ? Math.min(1, (now - w.moving.t0) / WALK_MS) : 0
        return { x: ((w.moving ? w.moving.fx + (w.moving.tx - w.moving.fx) * k : w.x) * TILE) + 8, y: ((w.moving ? w.moving.fy + (w.moving.ty - w.moving.fy) * k : w.y) * TILE) + 14, k }
      }
      const mp = at(m)
      const pp = at(pt)
      const actors: Actor[] = [
        { look: curatorLook, facing: CURATOR.facing, frame: 0, x: CURATOR.x * TILE + 8, y: CURATOR.y * TILE + 14 },
        { look: signature, facing: m.facing, frame: m.moving ? strideFrame(mp.k, steps.current) : 0, x: mp.x, y: mp.y },
      ]
      const creatures: CreatureActor[] = [{ id: PARTNER, facing: pt.facing, x: pp.x, y: pp.y - 1, hop: pt.moving ? Math.sin(pp.k * Math.PI) * 3 : 0, breath: pt.moving || still ? 0 : Math.floor(now / 520) % 2 }]

      const blink = still || Math.floor(now / 400) % 2 === 0
      const sparkleTick = still ? -1 : Math.floor(now / 260)
      const newHits: Hit[] = []
      const items = (proj: (wx: number, wy: number) => { x: number; y: number; s: number }): WorldItem[] => {
        const out: WorldItem[] = []
        // the room itself, behind everything: the back wall across its full width (corners too) with
        // the wallpaper carried on up to the ceiling, and the two side walls running to the front
        out.push({ depth: -1, draw: (c) => drawShell(c, proj, vh) })
        // a brass pendant lamp over each case, its light falling on the glass
        for (const c of CASES) {
          const lx = (c.x + c.cols / 2) * TILE
          const ly = (c.y + 1) * TILE + 10
          out.push({ depth: ly, draw: (c2) => drawLamp(c2, proj(lx, ly), proj(lx, (c.y + 1) * TILE), c.cols * TILE) })
        }
        // an upright picture standing on the floor at (bx, by), its left edge at bx, lifted `lift` world px
        const stand = (img: HTMLCanvasElement, bx: number, by: number, lift = 0) => {
          const p = proj(bx, by)
          const w = img.width * p.s
          const h = img.height * p.s
          return { x: p.x, y: p.y - h - lift * p.s, w, h, s: p.s, draw: (c: CanvasRenderingContext2D) => { const x0 = Math.round(p.x * RES); const y0 = Math.round((p.y - h - lift * p.s) * RES); c.drawImage(img, x0, y0, Math.round((p.x + w) * RES) - x0, Math.round((p.y - lift * p.s) * RES) - y0) } }
        }
        // the banner high on the back wall
        const banner = stand(pixelCanvas(structureArt.bannerMedals, tilePalette, 'structure:bannerMedals'), 4 * TILE, 2 * TILE, 44)
        out.push({ depth: 2 * TILE + 0.5, draw: banner.draw })
        // the cases, each with its medals clickable
        for (const c of CASES) {
          const n = c.medals.length
          const sparkle = sparkleTick < 0 ? -1 : (sparkleTick + CASES.indexOf(c) * 3) % (n + 4)
          const art = caseArt(c, have, sel, blink, sparkle)
          const by = (c.y + 1) * TILE
          const r = stand(art, c.x * TILE, by)
          const g = caseGeom(c)
          c.medals.forEach((md, i) => {
            const s = g.slot(i % c.cols, Math.floor(i / c.cols))
            const idx = medals.findIndex((x) => x.id === md.id)
            newHits.push({ x: r.x + (s.x - 1) * r.s, y: r.y + (s.y - 1) * r.s, w: (s.w + 2) * r.s, h: (s.h + 2) * r.s, on: () => (sfx('cursor'), onPick(idx)) })
          })
          out.push({
            depth: by - 0.5,
            draw: (ctx2) => {
              // a soft shadow on the floor in front, then the case
              const q = proj(c.x * TILE, by)
              ctx2.fillStyle = 'rgba(20,24,40,0.22)'
              ctx2.fillRect(Math.round(q.x * RES), Math.round(q.y * RES), Math.round(c.cols * TILE * q.s * RES), Math.round(3 * q.s * RES))
              r.draw(ctx2)
            },
          })
        }
        // the podium and the newest medal over it
        const latest = latestMedal(got)
        const pb = (PODIUM.y + 1) * TILE
        const pod = stand(podiumArt(), PODIUM.x * TILE, pb)
        newHits.push({ x: pod.x, y: pod.y - 24 * pod.s, w: pod.w, h: pod.h + 24 * pod.s, on: () => ctl.current.walkTo({ x: PODIUM.x + (me.current.x <= PODIUM.x ? 0 : 1), y: PODIUM.y + 1 }, 'up', lookAtPodium) })
        out.push({
          depth: pb - 0.5,
          draw: (ctx2) => {
            pod.draw(ctx2)
            const bob = still ? 0 : Math.round(Math.sin(now / 420))
            if (latest >= 0) {
              const img = medalCanvas(latest)
              const md = stand(img, PODIUM.x * TILE + PODIUM_W / 2 - 7, pb, PODIUM_H + 3 + bob)
              // a halo behind it
              const cx = (md.x + md.w / 2) * RES
              const cy = (md.y + md.h * 0.62) * RES
              const glow = ctx2.createRadialGradient(cx, cy, 0, cx, cy, 16 * md.s * RES)
              glow.addColorStop(0, 'rgba(255,236,150,0.55)')
              glow.addColorStop(1, 'rgba(255,236,150,0)')
              ctx2.fillStyle = glow
              ctx2.fillRect(cx - 16 * md.s * RES, cy - 16 * md.s * RES, 32 * md.s * RES, 32 * md.s * RES)
              md.draw(ctx2)
            }
          },
        })
        // the curator: tap to talk
        const cp = proj(CURATOR.x * TILE + 8, CURATOR.y * TILE + 14)
        newHits.push({ x: cp.x - 8 * cp.s, y: cp.y - 32 * cp.s, w: 16 * cp.s, h: 32 * cp.s, on: () => ctl.current.walkTo({ x: CURATOR.x + 1, y: CURATOR.y }, 'left', talkToCurator) })
        // over everything: a soft vignette
        out.push({
          depth: 1e6,
          draw: (ctx2) => {
            const W = VIEW_W * RES
            const H = vh * RES
            const v = ctx2.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, W * 0.75)
            v.addColorStop(0, 'rgba(10,8,24,0)')
            v.addColorStop(1, 'rgba(10,8,24,0.38)')
            ctx2.fillStyle = v
            ctx2.fillRect(0, 0, W, H)
          },
        })
        return out
      }
      drawWorld(ctx, hall, camFor(vh), actors, now, creatures, vh, { items })
      hits.current = newHits
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // the loop reads everything that changes through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (state.current.busy) return
    const r = e.currentTarget.getBoundingClientRect()
    const vx = ((e.clientX - r.left) / r.width) * VIEW_W
    const vy = ((e.clientY - r.top) / r.height) * viewH.current
    // things first (the frontmost: the last drawn), then the floor
    const hit = [...hits.current].reverse().find((h) => vx >= h.x && vx <= h.x + h.w && vy >= h.y && vy <= h.y + h.h)
    if (hit) return hit.on()
    const g = unproject(camFor(viewH.current), vx, vy, viewH.current)
    if (!g) return
    const tx = Math.floor(g.x / TILE)
    const ty = Math.floor(g.y / TILE)
    if (DOOR.some((d) => d.x === tx && d.y === ty)) return ctl.current.walkTo({ x: tx, y: ty }, 'down')
    const to = blocked(tx, ty) ? nearestFloor(tx, ty) : { x: tx, y: ty }
    if (to) ctl.current.walkTo(to)
  }

  const s = slotOf(focus)
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0c0a18]">
      <canvas
        ref={canvasRef}
        width={VIEW_W * RES}
        height={VIEW_H * RES}
        onPointerDown={onPointerDown}
        className="pixelated block h-full w-full cursor-pointer touch-none"
        role="img"
        aria-label={`The Medal Hall: display cases of gold, silver and bronze medals. Aaryan is looking at the ${s.c.tier} case. Tap the floor to walk, or a medal to look at it.`}
      />
      <p className="font-display text-outline pointer-events-none absolute right-[3%] bottom-[3%] m-0 text-[clamp(10px,2.5cqi,14px)] text-paper/90">TAP A MEDAL OR THE FLOOR</p>
      <div className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-200 ${fade ? 'opacity-100' : 'opacity-0'}`} />
      {dialogue && (
        <div className="absolute inset-x-[2%] bottom-[2%] [container-type:inline-size]">
          <DialogueBox className="w-full" lines={dialogue} onDone={() => setDialogue(null)} />
        </div>
      )}
    </div>
  )
}

/** The most recently earned medal's index, or -1 if none yet. */
function latestMedal(earned: Partial<Record<string, string>>): number {
  let best = -1
  let at = -Infinity
  medals.forEach((m, i) => {
    const t = earned[m.id] ? Date.parse(earned[m.id]!) : NaN
    if (!Number.isNaN(t) && t >= at) {
      at = t
      best = i
    }
  })
  return best
}

