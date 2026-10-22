/**
 * Pokédex habitats: for each entry, a 256×192 pixel-art scene of where that side of Aaryan lives
 * (a courtroom, a lab, a pitch, a DJ booth…), with him in it, dressed and posed for it, as the
 * entry's "creature" — the way a BW Pokédex shows a Pokémon in its habitat. Original art drawn in
 * code with habitat-kit.ts; Aaryan is the site's own character model (character.ts) at 1:1, so
 * the scene and the figure share one pixel grid. Some scenes have a few frames of quiet motion
 * (water, lights, a screen) that the Pokédex cycles slowly (never with reduced motion).
 */
import type { Appearance } from './character.ts'
import { signature } from '../content/aaryan.ts'
import { bookshelf, boards, box, bunting, darken, desk, HAB_H, HAB_W, INK, monitor, poster, rng, Scene, shadow, tiles, trainer, wall, windowFrame } from './habitat-kit.ts'

export { HAB_H, HAB_W }

export type HabitatId =
  | 'harbour' | 'courtroom' | 'review' | 'lab' | 'stall' | 'campus' | 'pitch' | 'oval'
  | 'club' | 'bedroom' | 'street' | 'library' | 'den' | 'chambers' | 'hall'

export interface Habitat {
  /** what the place is, for the Pokédex's HABITAT line */
  label: string
  /** a sentence describing the picture, for screen readers */
  alt: string
  /** frames of quiet motion (1 = still) */
  frames: number
  draw: (s: Scene, frame: number) => void
}

/** Aaryan, dressed for the scene: his usual look with the clothes and extras changed. */
const me = (o: Partial<Appearance>): Appearance => ({ ...signature, ...o })

type Pt = [number, number]

/* ---------------- things he holds ---------------- */

function flagOnPole(s: Scene, [hx, hy]: Pt, top: number, wave: number) {
  s.rect(hx - 1, top, 3, hy - top + 4, INK).rect(hx, top + 1, 1, hy - top + 2, '#c8a060')
  const w = wave ? 1 : -1
  s.poly([[hx + 1, top + 1], [hx + 24, top + 3 + w], [hx + 23, top + 14 + w], [hx + 1, top + 15]], INK)
  s.poly([[hx + 2, top + 2], [hx + 22, top + 4 + w], [hx + 21, top + 13 + w], [hx + 2, top + 14]], '#f8c838')
  s.rect(hx + 6, top + 6, 10, 2, '#e0383e').rect(hx + 6, top + 9, 7, 2, '#e0383e')
  s.ellipse(hx, top - 1, 2, 2, '#f8c838')
}

function guitarHeld(s: Scene, body: Pt, neckEnd: Pt) {
  const [bx, by] = body
  s.line(bx, by, neckEnd[0], neckEnd[1], INK).line(bx, by - 1, neckEnd[0], neckEnd[1] - 1, INK).line(bx, by + 1, neckEnd[0], neckEnd[1] + 1, INK)
  s.line(bx, by, neckEnd[0], neckEnd[1], '#6a3a1a')
  s.rect(neckEnd[0] - 3, neckEnd[1] - 3, 6, 5, INK).rect(neckEnd[0] - 2, neckEnd[1] - 2, 4, 3, '#3a2010')
  s.ellipse(bx + 4, by + 4, 14, 11, INK).ellipse(bx - 7, by - 3, 10, 8, INK)
  s.ellipse(bx + 4, by + 4, 13, 10, '#d88a3a').ellipse(bx - 7, by - 3, 9, 7, '#d88a3a')
  s.ellipse(bx + 5, by + 5, 9, 6, '#a0581e').ellipse(bx - 7, by - 2, 5, 4, '#a0581e')
  s.ellipse(bx - 2, by, 3.4, 3.4, INK)
  s.rect(bx + 8, by + 5, 7, 2, '#3a2010')
  s.line(bx - 4, by - 2, neckEnd[0] + 2, neckEnd[1] + 1, '#e8d8b0')
}

function cameraHeld(s: Scene, [cx, cy]: Pt) {
  box(s, cx - 9, cy - 6, 18, 12, { fill: '#2a2a33', light: '#4a4a56', shade: '#1a1a22' }, 1)
  s.rect(cx - 6, cy - 9, 6, 4, INK).rect(cx - 5, cy - 8, 4, 2, '#3a3a46')
  s.ellipse(cx + 1, cy, 5, 5, INK).ellipse(cx + 1, cy, 4, 4, '#5a6a8a').ellipse(cx, cy - 1, 1.6, 1.6, '#c8e0f8')
  s.set(cx + 6, cy - 4, '#e0383e')
}

function bookHeld(s: Scene, [cx, cy]: Pt) {
  s.poly([[cx - 13, cy - 4], [cx, cy - 2], [cx + 13, cy - 4], [cx + 13, cy + 6], [cx, cy + 8], [cx - 13, cy + 6]], INK)
  s.poly([[cx - 12, cy - 3], [cx, cy - 1], [cx, cy + 6], [cx - 12, cy + 5]], '#f8f4e6').poly([[cx + 1, cy - 1], [cx + 12, cy - 3], [cx + 12, cy + 5], [cx + 1, cy + 6]], '#eee8d4')
  for (let i = 0; i < 3; i++) s.line(cx - 10, cy + i * 2, cx - 3, cy + 1 + i * 2, '#9a9284').line(cx + 3, cy + 1 + i * 2, cx + 10, cy + i * 2, '#9a9284')
  s.rect(cx - 13, cy + 6, 26, 2, '#a02838')
}

function controllerHeld(s: Scene, [cx, cy]: Pt) {
  s.ellipse(cx - 7, cy + 1, 6, 5, INK).ellipse(cx + 7, cy + 1, 6, 5, INK).rect(cx - 8, cy - 4, 16, 8, INK)
  s.ellipse(cx - 7, cy + 1, 5, 4, '#4a4e5c').ellipse(cx + 7, cy + 1, 5, 4, '#4a4e5c').rect(cx - 7, cy - 3, 14, 6, '#4a4e5c')
  s.rect(cx - 9, cy - 1, 3, 1, '#c8ccd8').rect(cx - 8, cy - 2, 1, 3, '#c8ccd8')
  s.set(cx + 7, cy - 2, '#e0383e').set(cx + 9, cy, '#3a8ae0').set(cx + 5, cy, '#5ac85a').set(cx + 7, cy + 2, '#f8c838')
}

function clipboardHeld(s: Scene, [cx, cy]: Pt) {
  box(s, cx - 8, cy - 11, 16, 21, { fill: '#b8864a', shade: '#8a5e30' }, 1)
  s.rect(cx - 6, cy - 8, 12, 16, '#f8f6ee')
  for (let i = 0; i < 5; i++) s.rect(cx - 5, cy - 6 + i * 3, i % 2 ? 7 : 9, 1, '#8a90a0')
  s.rect(cx - 3, cy - 12, 6, 3, '#9aa0ac')
}

function flaskHeld(s: Scene, [cx, cy]: Pt, frame: number) {
  s.poly([[cx - 2, cy - 14], [cx + 2, cy - 14], [cx + 2, cy - 7], [cx + 8, cy + 4], [cx - 8, cy + 4], [cx - 2, cy - 7]], INK)
  s.poly([[cx - 1, cy - 13], [cx + 1, cy - 13], [cx + 1, cy - 6], [cx + 7, cy + 3], [cx - 7, cy + 3], [cx - 1, cy - 6]], '#dff2f4')
  s.poly([[cx - 4, cy - 2], [cx + 4, cy - 2], [cx + 7, cy + 3], [cx - 7, cy + 3]], '#5ad8a0')
  const b = [[-2, -4], [2, -7], [0, -10]][frame % 3]
  s.set(cx + b[0], cy + b[1], '#5ad8a0').set(cx - b[0] + 1, cy + b[1] + 3, '#9af0c8')
  s.set(cx - 3, cy - 1, '#ffffff')
}

function batOnShoulder(s: Scene, [hx, hy]: Pt) {
  s.line(hx, hy + 2, hx - 6, hy - 6, INK).line(hx + 1, hy + 2, hx - 5, hy - 6, '#3a2a1a')
  s.poly([[hx - 6, hy - 5], [hx - 9, hy - 9], [hx - 26, hy - 30], [hx - 22, hy - 33], [hx - 4, hy - 9]], INK)
  s.poly([[hx - 7, hy - 7], [hx - 24, hy - 30], [hx - 22, hy - 31], [hx - 5, hy - 9]], '#ecdcaa')
  s.line(hx - 9, hy - 10, hx - 22, hy - 28, '#c8b07a')
}

function ball(s: Scene, cx: number, cy: number) {
  s.ellipse(cx, cy, 6, 6, INK).ellipse(cx, cy, 5, 5, '#f8f8f4')
  s.rect(cx - 1, cy - 1, 3, 3, INK).rect(cx - 5, cy - 2, 2, 2, INK).rect(cx + 3, cy + 1, 2, 2, INK).rect(cx - 2, cy + 3, 2, 2, INK)
  s.set(cx - 2, cy - 3, '#ffffff')
}

/* ---------------- scenes ---------------- */

const sky = (s: Scene, y1: number, cols: string[]) => s.bands(0, y1, cols)

function harbour(s: Scene, frame: number) {
  sky(s, 98, ['#2c2a5c', '#463876', '#6e4486', '#a2507e', '#d06c64', '#ec965c', '#f6c07a'])
  s.ellipse(186, 98, 15, 15, '#fbe2a6').ellipse(186, 98, 11, 11, '#fff0c8')
  // the city across the water, lights coming on
  const r = rng(11)
  for (let x = 128; x < 256; x += 7 + Math.floor(r() * 5)) {
    const h = 10 + Math.floor(r() * 26)
    s.rect(x, 98 - h, 7, h, '#3c3060')
    for (let y = 98 - h + 3; y < 96; y += 4) if (r() < 0.45) s.set(x + 2 + Math.floor(r() * 3), y, '#f8d880')
  }
  // the bridge: an arch over the deck, granite pylons at each end
  for (let i = 0; i <= 200; i++) {
    const t = i / 200
    const x = 14 + t * 104
    const y = 86 - Math.sin(t * Math.PI) * 28
    s.rect(x, y, 1, 3, '#2a2444')
    s.set(x, 86 - Math.sin(t * Math.PI) * 20, '#2a2444')
    if (i % 12 === 0) s.line(x, y, x, 86, '#3a3254')
  }
  s.rect(10, 85, 116, 3, '#2a2444')
  box(s, 6, 70, 12, 28, { fill: '#5a4c6a', light: '#7a6a86', shade: '#3e3450' }, 2)
  box(s, 116, 70, 12, 28, { fill: '#5a4c6a', light: '#7a6a86', shade: '#3e3450' }, 2)
  // the Opera House: white sails on their podium
  box(s, 146, 92, 74, 8, { fill: '#c8a888', shade: '#a08868' }, 1)
  for (const [x0, w, h] of [[150, 18, 18], [164, 22, 26], [184, 18, 20], [198, 14, 13]] as const) {
    s.poly([[x0, 93], [x0 + w * 0.35, 93 - h], [x0 + w, 93]], INK)
    s.poly([[x0 + 1, 92], [x0 + w * 0.35, 94 - h], [x0 + w - 1, 92]], '#f6f2ea')
    s.poly([[x0 + w * 0.35, 94 - h], [x0 + w - 1, 92], [x0 + w * 0.55, 92]], '#d6d0dc')
  }
  // the harbour, the sunset rippling across it
  s.bands(98, 138, ['#4a4a8e', '#38407c', '#2c346a', '#262e5e'])
  for (let y = 100; y < 138; y += 3) {
    const sh = (y * 7 + frame * 5) % 11
    s.rect(176 - (y - 98) * 0.6 + sh, y, 16 + (y - 98) * 0.5, 1, y % 2 ? '#f6b870' : '#e8905a')
    s.rect(30 + ((y * 13 + frame * 9) % 70), y + 1, 8, 1, '#5a5aa2')
  }
  // the harbour wall and the park
  s.rect(0, 136, s.w, 6, '#d2a874').rect(0, 136, s.w, 1, '#ecc898').rect(0, 141, s.w, 1, INK)
  s.bands(142, 192, ['#5a9a44', '#4e8e3c', '#468436'])
  const g = rng(5)
  for (let i = 0; i < 120; i++) s.set(Math.floor(g() * 256), 144 + Math.floor(g() * 48), g() < 0.5 ? '#6aac50' : '#3c7830')
  // a bench along the wall
  box(s, 186, 154, 52, 5, { fill: '#a8703e', light: '#c88a52', shade: '#7a4e2a' }, 1)
  box(s, 186, 146, 52, 5, { fill: '#a8703e', light: '#c88a52', shade: '#7a4e2a' }, 1)
  for (const x of [190, 230]) s.rect(x, 158, 3, 12, INK).rect(x + 1, 158, 1, 11, '#4a4a54')
  // a gum tree: pale trunk, sage leaves
  s.poly([[30, 192], [52, 192], [46, 120], [50, 80], [42, 80], [38, 120]], INK)
  s.poly([[32, 191], [50, 191], [44, 120], [47, 82], [44, 82], [40, 120]], '#e4dccc')
  s.poly([[44, 191], [50, 191], [44, 120], [47, 82], [45, 82]], '#bcae98')
  s.line(44, 110, 70, 86, INK).line(44, 109, 69, 86, '#d8ceb8')
  for (const [cx, cy, rx, ry] of [[22, 30, 30, 22], [62, 22, 30, 20], [84, 60, 22, 16], [30, 70, 24, 16], [56, 52, 26, 18]] as const) s.ellipse(cx, cy, rx + 1, ry + 1, INK)
  for (const [cx, cy, rx, ry] of [[22, 30, 30, 22], [62, 22, 30, 20], [84, 60, 22, 16], [30, 70, 24, 16], [56, 52, 26, 18]] as const) {
    s.ellipse(cx, cy, rx, ry, '#4e7a5a').ellipse(cx - 3, cy - 3, rx * 0.7, ry * 0.6, '#6a9a72')
    s.dither(cx - rx * 0.5, cy - ry * 0.5, rx * 0.6, ry * 0.4, '#86b48a')
  }
  shadow(s, 128, 184, 14)
  trainer(s, me({}), { front: { el: [61, 36], wr: [62, 22], hand: 'open' }, mouth: 'grin' }, 128, 184)
}

function courtroom(s: Scene) {
  // cream plaster above dark panelling, the court's arms over the bench
  s.rect(0, 0, s.w, 50, '#e6dcc2').rect(0, 46, s.w, 4, '#c8b48c')
  s.rect(0, 50, s.w, 70, '#6e4228')
  for (let x = 2; x < 256; x += 32) {
    box(s, x, 56, 28, 56, { fill: '#7e4e30', light: '#9a6842', shade: '#5a3420' }, 2)
    s.rect(x + 6, 62, 16, 44, '#734630')
  }
  // the arms: crowned shield with a supporter each side (simplified)
  s.ellipse(128, 22, 15, 16, INK)
  s.poly([[114, 10], [142, 10], [142, 26], [128, 38], [114, 26]], INK)
  s.poly([[116, 12], [140, 12], [140, 25], [128, 35], [116, 25]], '#d8a838')
  s.rect(127, 12, 2, 22, '#a87818').rect(116, 22, 24, 2, '#a87818')
  s.poly([[120, 10], [123, 4], [128, 8], [133, 4], [136, 10]], '#d8a838')
  s.ellipse(104, 26, 6, 10, INK).ellipse(104, 26, 5, 9, '#9a6a3a').ellipse(152, 26, 6, 10, INK).ellipse(152, 26, 5, 9, '#8a6a4a')
  // the judge's chair and the raised bench
  box(s, 110, 34, 36, 36, { fill: '#6a1e22', light: '#8a2e30', shade: '#4a1418' }, 2)
  box(s, 30, 62, 196, 58, { fill: '#6a3a22', light: '#8a5232', shade: '#4a2616' }, 3)
  box(s, 26, 58, 204, 7, { fill: '#8a5030', light: '#a86a40', shade: '#6a3a22' }, 1)
  for (let x = 40; x < 220; x += 38) box(s, x, 72, 30, 40, { fill: '#5e321e', light: '#7a462a', shade: '#46240f' }, 2)
  // the gavel on its block
  box(s, 168, 52, 14, 5, { fill: '#5a3420' }, 0)
  s.rect(170, 47, 10, 4, INK).rect(171, 48, 8, 2, '#8a5a2a').rect(174, 51, 2, 3, '#8a5a2a')
  // carpet
  s.rect(0, 120, s.w, 72, '#7a2a32')
  for (let y = 124; y < 192; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < 256; x += 16) s.rect(x, y, 2, 2, '#9a3a40')
  // him at the bar table, on his feet: "Objection!"
  trainer(s, me({ top: 'suit', topColour: 'navy', accentColour: 'white', bottom: 'slacks', bottomColour: 'navy', shoes: 'formal', accessories: ['glasses', 'watch'] }), { front: { el: [61, 44], wr: [69.5, 41], hand: 'pointOut' }, mouth: 'grin', brow: 'up' }, 104, 186)
  // the bar table across the front: folders, a brief in pink tape, a water jug
  box(s, -4, 150, 264, 8, { fill: '#8a5232', light: '#a86a42', shade: '#6a3c22' }, 2)
  box(s, 4, 157, 248, 40, { fill: '#5e341e', light: '#7a462a', shade: '#46240f' }, 3)
  box(s, 20, 140, 34, 11, { fill: '#e8e2d0', shade: '#c4bca6' }, 1)
  s.rect(20, 144, 34, 2, '#e05a8a')
  box(s, 150, 142, 30, 9, { fill: '#3a5a9a', light: '#5a7aba', shade: '#2a4070' }, 1)
  box(s, 154, 136, 24, 7, { fill: '#c8a040', shade: '#a07820' }, 1)
  box(s, 206, 132, 12, 19, { fill: '#cfe6f2', light: '#ffffff', shade: '#9ac0d8' }, 1)
  s.rect(208, 140, 8, 9, '#8ac0e0')
  box(s, 222, 141, 7, 10, { fill: '#cfe6f2', shade: '#9ac0d8' }, 1)
}

function review(s: Scene, frame: number) {
  wall(s, 112, '#d4d8e2', '#aab0bc', 5)
  // a big window on the city
  windowFrame(s, 134, 10, 116, 90, ['#86c0ea', '#9ccdf0', '#b4dbf4', '#cce6f6'], { fill: '#e8ecf2', light: '#ffffff', shade: '#b0b8c4' }, (x, y, w, h) => {
    const r = rng(7)
    for (let bx = x; bx < x + w; bx += 9 + Math.floor(r() * 6)) {
      const bh = 26 + Math.floor(r() * 50)
      s.rect(bx, y + h - bh, 9, bh, r() < 0.5 ? '#7a8ca4' : '#90a2b8')
      for (let wy = y + h - bh + 3; wy < y + h - 2; wy += 4) s.rect(bx + 2, wy, 5, 1, '#c4d4e4')
    }
  })
  tiles(s, 112, '#5c6678', '#56606f', '#4a5262')
  // the review desk: two screens of documents, a coding pane, a highlight moving down the list
  const doc = (x: number, y: number, w: number, h: number, hi: number) => {
    s.rect(x, y, w, h, '#eef0f4').rect(x, y, w, 4, '#3a5aa0')
    for (let i = 0; i < 7; i++) {
      const ry = y + 6 + i * 4
      if (i === hi) s.rect(x + 1, ry - 1, w - 2, 3, '#f8e078')
      s.rect(x + 2, ry, w - 12, 1, '#9aa2b4')
      s.rect(x + w - 7, ry - 1, 3, 3, i % 3 === 1 ? '#e0484e' : '#4ab05a')
    }
  }
  desk(s, 6, 128, 124, 48, { fill: '#e6e2da', light: '#f6f4ee', shade: '#bcb6aa' })
  monitor(s, 14, 88, 50, 36, (x, y, w, h) => doc(x, y, w, h, frame % 7))
  monitor(s, 70, 88, 50, 36, (x, y, w, h) => {
    s.rect(x, y, w, h, '#f6f6f2').rect(x, y, w, 4, '#5a6a80')
    for (let i = 0; i < 6; i++) s.rect(x + 3, y + 7 + i * 4, w - 8 - ((i * 5) % 12), 1, '#6a7080')
    s.rect(x + 3, y + 7 + ((frame * 2) % 6) * 4 - 1, 2, 3, '#3a5aa0')
  })
  box(s, 30, 124, 42, 5, { fill: '#3a3c48', light: '#5a5e6c' }, 0)
  box(s, 82, 124, 8, 5, { fill: '#3a3c48' }, 0)
  box(s, 104, 116, 9, 10, { fill: '#f4f0e8', shade: '#c8c0b0' }, 1)
  s.rect(106, 117, 5, 2, '#5a3a22')
  // archive boxes of documents
  for (const [x, y] of [[198, 150], [226, 150], [210, 128]] as const) {
    box(s, x, y, 28, 24, { fill: '#c8a878', light: '#e0c494', shade: '#a08458' }, 2)
    s.rect(x + 9, y + 8, 10, 4, '#f4ecd8').frame(x + 9, y + 8, 10, 4, INK)
  }
  shadow(s, 160, 186, 14)
  trainer(s, me({ top: 'shirt', topColour: 'white', accentColour: 'navy', bottom: 'slacks', bottomColour: 'grey', shoes: 'formal', accessories: ['glasses', 'watch'] }), { back: { el: [24, 50], wr: [30, 44], hand: 'fist' }, mouth: 'calm' }, 160, 186)
}

function lab(s: Scene, frame: number) {
  wall(s, 118, '#e2eeec', '#b8ccc8', 4)
  // tiled lower wall
  s.rect(0, 74, s.w, 40, '#cfe2de')
  for (let y = 74; y < 114; y += 8) s.rect(0, y, s.w, 1, '#b4ccc6')
  for (let x = 0; x < 256; x += 10) s.rect(x, 74, 1, 40, '#b4ccc6')
  // fume hood
  box(s, 6, 14, 70, 104, { fill: '#c4ccd2', light: '#e2e8ec', shade: '#9aa4ac' }, 2)
  s.rect(12, 30, 58, 50, '#2e3a42').rect(12, 30, 58, 2, '#8ab0c0')
  for (const [x, c] of [[22, '#e86a6a'], [38, '#6ab0e8'], [54, '#e8c86a']] as const) {
    s.rect(x, 62, 6, 16, '#d8eef2').frame(x - 1, 61, 8, 18, INK).rect(x, 70, 6, 8, c)
  }
  s.dither(12, 30, 58, 50, '#3a4a54', frame)
  // a double helix poster
  poster(s, 92, 14, 34, 48, '#1e2a4a', (x, y, w, h) => {
    for (let i = 0; i < h; i++) {
      const a = Math.sin(i / 4) * (w / 2 - 4)
      s.set(x + w / 2 + a, y + i, '#6ae0c8').set(x + w / 2 - a, y + i, '#e06ab0')
      if (i % 4 === 0) s.line(x + w / 2 - a, y + i, x + w / 2 + a, y + i, '#8a9ac0')
    }
  })
  // a shelf of reagents
  box(s, 150, 40, 100, 5, { fill: '#9aa4ac', light: '#c4ccd2' }, 1)
  const r = rng(4)
  for (let x = 154; x < 244; x += 9) {
    const h = 10 + Math.floor(r() * 8)
    const c = ['#6ac8a0', '#e8a04a', '#8a6ae0', '#e86a6a', '#f4f0e8'][Math.floor(r() * 5)]
    box(s, x, 40 - h, 7, h, { fill: '#e6f0f2', shade: '#b8c8cc' }, 1)
    s.rect(x + 1, 40 - h + Math.floor(h / 2), 5, Math.ceil(h / 2) - 1, c)
  }
  tiles(s, 118, '#e8eceb', '#dfe4e2', '#c4cccb')
  // him behind the bench, holding a flask up to the light
  const hands = trainer(s, me({ top: 'blazer', topColour: 'white', accentColour: 'teal', bottom: 'slacks', bottomColour: 'navy', shoes: 'formal', accessories: ['glasses'] }), { front: { el: [60, 46], wr: [58, 35], hand: 'fist' }, mouth: 'smile' }, 140, 190)
  // the bench: black epoxy top, white cabinets; a microscope, a tube rack, a beaker
  box(s, -4, 146, 264, 7, { fill: '#2a3640', light: '#46545e', shade: '#1e282e' }, 1)
  box(s, 0, 152, 256, 44, { fill: '#e6eae8', light: '#ffffff', shade: '#c0c8c6' }, 2)
  for (let x = 6; x < 256; x += 42) {
    s.frame(x, 158, 38, 30, '#aab4b2')
    s.rect(x + 16, 162, 6, 2, '#8a9492')
  }
  box(s, 196, 118, 8, 28, { fill: '#3e4a56', light: '#5a6876' }, 1)
  box(s, 190, 140, 26, 7, { fill: '#3e4a56', light: '#5a6876' }, 1)
  box(s, 200, 112, 18, 8, { fill: '#3e4a56', light: '#5a6876' }, 1)
  s.rect(212, 120, 4, 12, '#5a6876').frame(211, 119, 6, 14, INK)
  box(s, 26, 136, 44, 11, { fill: '#c4ccd2', light: '#e2e8ec' }, 1)
  for (let i = 0; i < 5; i++) {
    const x = 30 + i * 8
    s.rect(x, 122, 4, 16, '#e6f4f6').frame(x - 1, 121, 6, 18, INK)
    s.rect(x, 130 - (i % 3) * 3, 4, 8 + (i % 3) * 3, ['#e86a6a', '#6ab0e8', '#6ac8a0', '#e8c86a', '#a86ae0'][i])
  }
  box(s, 86, 128, 18, 19, { fill: '#dff2f4', shade: '#b8d4d8' }, 1)
  s.rect(88, 136, 14, 9, '#e8a04a')
  flaskHeld(s, hands.front, frame)
}

function stall(s: Scene, frame: number) {
  sky(s, 70, ['#8ac8f0', '#9ed2f2', '#b4dcf4'])
  // a brick campus building behind
  box(s, -2, 16, 260, 96, { fill: '#b46a48', light: '#c8805a', shade: '#8a4e34' }, 3)
  for (let y = 20; y < 110; y += 4) for (let x = (y / 4) % 2 ? 0 : 6; x < 256; x += 12) s.rect(x, y, 1, 3, '#9a5838')
  for (let x = 12; x < 256; x += 34) box(s, x, 28, 18, 26, { fill: '#8ac0e0', light: '#c4e2f4', shade: '#5a8ab0' }, 1)
  tiles(s, 112, '#cdc6b8', '#c4bcae', '#aaa292')
  // the gazebo: striped canopy on poles
  for (const x of [22, 230]) s.rect(x, 40, 4, 112, INK).rect(x + 1, 40, 2, 112, '#d8dce4')
  s.poly([[6, 46], [40, 18], [216, 18], [250, 46]], INK)
  for (let i = 0; i < 10; i++) {
    const t0 = i / 10
    const t1 = (i + 1) / 10
    s.poly([[7 + 242 * t0, 45], [41 + 174 * t0, 19], [41 + 174 * t1, 19], [7 + 242 * t1, 45]], i % 2 ? '#f4f0e8' : '#e0383e')
  }
  for (let x = 8; x < 250; x += 12) s.poly([[x, 46], [x + 12, 46], [x + 6, 51 + (frame + x / 12) % 2]], (x / 12) % 2 ? '#e0383e' : '#f4f0e8')
  // merch on a rail: tees and a hoodie
  s.rect(40, 62, 92, 2, INK)
  for (const [x, c] of [[44, '#7a1e2e'], [66, '#2a3a6a'], [88, '#e8b830'], [110, '#7a1e2e']] as const) {
    s.poly([[x, 66], [x + 6, 64], [x + 14, 64], [x + 20, 66], [x + 20, 72], [x + 16, 72], [x + 16, 90], [x + 4, 90], [x + 4, 72], [x, 72]], INK)
    s.poly([[x + 1, 67], [x + 6, 65], [x + 14, 65], [x + 19, 67], [x + 19, 71], [x + 15, 71], [x + 15, 89], [x + 5, 89], [x + 5, 71], [x + 1, 71]], c)
    s.rect(x + 8, 72, 4, 4, '#f4f0e8')
  }
  // a poster board: the latest campaign
  box(s, 160, 56, 54, 40, { fill: '#f4f0e8', shade: '#c8c0b0' }, 1)
  s.rect(164, 60, 46, 14, '#2a3a6a').rect(168, 64, 20, 3, '#f8c838').rect(168, 69, 30, 2, '#f4f0e8')
  for (let i = 0; i < 3; i++) s.rect(166, 78 + i * 5, 40 - i * 8, 2, '#8a90a0')
  // him behind the table, showing it off
  trainer(s, me({ top: 'hoodie', topColour: 'maroon', accentColour: 'white', bottom: 'jeans', bottomColour: 'navy', accessories: ['glasses', 'watch'] }), { front: { el: [61, 48], wr: [67, 42], hand: 'open' }, mouth: 'grin' }, 150, 190)
  // the table: cloth, stacks of folded merch, a SOLD OUT sign
  box(s, 0, 146, 256, 50, { fill: '#2a3a6a', light: '#3e5088', shade: '#1e2a4e' }, 3)
  s.rect(0, 152, 256, 2, '#f8c838')
  for (const [x, c] of [[16, '#7a1e2e'], [44, '#e8b830'], [72, '#2a3a6a'], [196, '#7a1e2e']] as const)
    for (let k = 0; k < 3; k++) box(s, x, 138 - k * 5, 24, 6, { fill: c, light: darken(c, 1.3), shade: darken(c) }, 1)
  box(s, 214, 116, 34, 24, { fill: '#e0383e', light: '#f05a5a', shade: '#a02028' }, 1)
  s.rect(219, 122, 24, 3, '#f8f6ee').rect(219, 129, 18, 3, '#f8f6ee')
  s.rect(230, 140, 2, 8, INK)
}

function campus(s: Scene, frame: number) {
  sky(s, 104, ['#7ec0ee', '#94cbf0', '#aad6f2', '#c0e0f4', '#d2e8f4'])
  // sandstone building with arches
  box(s, 40, 26, 176, 84, { fill: '#d8b880', light: '#ecd09a', shade: '#b8985e' }, 3)
  box(s, 36, 20, 184, 9, { fill: '#c8a868', light: '#e0c080', shade: '#a8884c' }, 1)
  for (let x = 50; x < 206; x += 26) {
    s.rect(x, 60, 18, 50, INK).ellipse(x + 9, 60, 9, 8, INK)
    s.rect(x + 1, 60, 16, 50, '#5a4a3a').ellipse(x + 9, 60, 8, 7, '#5a4a3a')
    box(s, x + 2, 34, 14, 16, { fill: '#7a9ab8', light: '#a8c4dc', shade: '#5a7a98' }, 1)
  }
  // grass and the main walkway running back
  s.rect(0, 104, s.w, 88, '#5a9a46')
  const g = rng(9)
  for (let i = 0; i < 160; i++) s.set(Math.floor(g() * 256), 106 + Math.floor(g() * 86), g() < 0.5 ? '#6aac52' : '#4a8a3a')
  s.poly([[100, 106], [156, 106], [236, 192], [20, 192]], INK)
  s.poly([[101, 107], [155, 107], [234, 192], [22, 192]], '#cfc8bc')
  for (let y = 112; y < 192; y += 6 + Math.floor((y - 106) / 12)) {
    const t = (y - 106) / 86
    s.line(101 - 80 * t, y, 155 + 80 * t, y, '#b8b0a4')
  }
  // big fig trees either side
  for (const [cx, cy] of [[10, 52], [246, 50]] as const) {
    s.rect(cx - 5, 70, 12, 50, INK).rect(cx - 4, 70, 10, 50, '#6a4a32')
    s.ellipse(cx, cy, 44, 34, INK).ellipse(cx, cy, 43, 33, '#2e6a36').ellipse(cx - 6, cy - 6, 30, 22, '#3e8044')
    s.dither(cx - 20, cy - 18, 30, 14, '#5a9a52')
  }
  // O-Week bunting between them
  bunting(s, 30, 14, 226, 14, ['#f8c838', '#e0383e', '#3a7fe0', '#4fa850'], 14, frame)
  // a couple of first-years further down the walkway
  for (const [x, y, c] of [[118, 120, '#e0383e'], [142, 124, '#3a7fe0']] as const) {
    s.rect(x, y, 4, 9, INK).rect(x + 1, y + 1, 2, 4, c).rect(x + 1, y - 4, 2, 4, '#2a1a12').rect(x + 1, y + 5, 2, 3, '#2a2a44')
  }
  shadow(s, 120, 186, 14)
  const hands = trainer(s, me({ top: 'tee', topColour: 'teal', accentColour: 'white', bottom: 'jeans', bottomColour: 'navy', accessories: ['glasses', 'watch', 'bag'] }), { front: { el: [59.5, 32], wr: [58, 22.5], hand: 'fist' }, mouth: 'grin' }, 120, 186)
  flagOnPole(s, hands.front, hands.top - 18, frame)
}

function pitch(s: Scene, frame: number) {
  sky(s, 40, ['#3a6ac0', '#4e80cc', '#6896d8'])
  // the stand: roof, tiers of crowd
  box(s, -4, 18, 264, 8, { fill: '#5a5e6c', light: '#7a7e8c', shade: '#3e424e' }, 1)
  s.rect(0, 26, s.w, 70, '#3a3e4c')
  const r = rng(21)
  for (let y = 30; y < 94; y += 4) {
    s.rect(0, y + 3, s.w, 1, '#2a2e3a')
    for (let x = (y / 4) % 2 ? 1 : 3; x < 256; x += 4) {
      const c = ['#e0383e', '#f4f0e8', '#3a7fe0', '#f8c838', '#e8a070', '#2a2a33'][Math.floor(r() * 6)]
      s.rect(x, y + ((x + frame * 4 + y) % 7 === 0 ? 0 : 1), 2, 2, c)
    }
  }
  // floodlights
  for (const x of [6, 240]) {
    s.rect(x + 3, 4, 3, 22, INK)
    box(s, x - 2, 0, 14, 8, { fill: '#e8ecf2', light: '#ffffff', shade: '#a8b0bc' }, 1)
  }
  s.rect(0, 96, s.w, 6, '#2a6a3a').rect(0, 96, s.w, 1, '#f4f0e8')
  // the pitch, mown in stripes
  let y = 102
  for (let i = 0; y < 192; i++) {
    const h = 6 + i * 2
    s.rect(0, y, s.w, h, i % 2 ? '#3e9238' : '#4aa242')
    y += h
  }
  s.rect(0, 108, s.w, 2, '#f4f8f0')
  // the goal, net and all
  for (let gx = 192; gx < 252; gx += 4) s.line(gx, 72, gx + 6, 106, '#d8e0e4')
  for (let gy = 74; gy < 106; gy += 4) s.line(192 + (gy - 72) * 0.18, gy, 252, gy, '#d8e0e4')
  s.rect(190, 68, 64, 4, INK).rect(190, 68, 4, 46, INK).rect(250, 68, 4, 46, INK)
  s.rect(191, 69, 62, 2, '#ffffff').rect(191, 69, 2, 44, '#ffffff').rect(251, 69, 2, 44, '#ffffff')
  shadow(s, 116, 186, 14)
  trainer(s, me({ top: 'jersey', topColour: 'white', accentColour: 'red', bottom: 'shorts', bottomColour: 'black', accessories: ['glasses'] }), { front: { el: [59.5, 32], wr: [58, 22.5], hand: 'fist' }, mouth: 'grin' }, 116, 186)
  ball(s, 152, 180)
}

function oval(s: Scene) {
  sky(s, 88, ['#7ab8ec', '#8ec4ee', '#a6d0f2', '#bcdcf4', '#cce4f4'])
  // a line of trees and the pavilion behind the boundary
  for (let x = -10; x < 270; x += 22) s.ellipse(x, 74, 16, 12, INK).ellipse(x, 74, 15, 11, '#3e7a44').ellipse(x - 3, 71, 9, 6, '#4e8e52')
  box(s, 24, 46, 96, 40, { fill: '#f2efe6', light: '#ffffff', shade: '#c8c2b4' }, 2)
  s.poly([[18, 48], [72, 30], [126, 48]], INK).poly([[21, 47], [72, 32], [123, 47]], '#3a7a4a')
  for (let x = 32; x < 116; x += 14) box(s, x, 58, 10, 16, { fill: '#5a7a9a', light: '#8aaac8' }, 1)
  box(s, 140, 50, 60, 36, { fill: '#f4f4f0', light: '#ffffff', shade: '#c8c8c0' }, 2)
  s.rect(0, 86, s.w, 106, '#68aa48')
  // the white picket boundary fence
  s.rect(0, 92, s.w, 2, INK).rect(0, 99, s.w, 2, INK)
  for (let x = 0; x < 256; x += 5) s.rect(x, 86, 3, 18, INK).rect(x + 1, 87, 1, 16, '#f6f6f2')
  // the oval, mown in a broad pattern, and the pitch with its stumps
  for (let yy = 104; yy < 192; yy += 10) s.rect(0, yy, s.w, 5, '#74b452')
  s.poly([[176, 108], [214, 108], [250, 192], [180, 192]], '#d8c890')
  s.rect(180, 116, 30, 1, '#f4f4ec').rect(186, 174, 50, 1, '#f4f4ec')
  for (const x of [192, 196, 200]) s.rect(x, 96, 2, 20, INK).rect(x, 97, 1, 18, '#f6f2e4')
  s.rect(191, 96, 11, 1, '#c8a060')
  // a bucket of balls and a cone: coaching
  box(s, 40, 166, 18, 16, { fill: '#e8b830', light: '#f8d060', shade: '#b88810' }, 1)
  for (const x of [43, 49, 54]) s.ellipse(x, 165, 3, 2.4, INK).ellipse(x, 165, 2.4, 2, '#c8282e')
  s.poly([[226, 186], [234, 168], [242, 186]], INK).poly([[228, 185], [234, 170], [240, 185]], '#f08a2a')
  shadow(s, 120, 186, 14)
  const hands = trainer(s, me({ top: 'tee', topColour: 'white', accentColour: 'white', bottom: 'slacks', bottomColour: 'white', hat: 'cap', hatColour: 'navy', accessories: ['glasses', 'watch'] }), { front: { el: [62, 40], wr: [57, 30], hand: 'fist' }, mouth: 'smile' }, 120, 186)
  batOnShoulder(s, hands.front)
}

function club(s: Scene, frame: number) {
  s.bands(0, 192, ['#08061a', '#0e0a22', '#140e2c', '#180f30', '#1a1034'])
  // an LED wall behind the booth, its pattern shifting
  for (let y = 30; y < 110; y += 6)
    for (let x = 30; x < 226; x += 6) {
      const on = Math.sin(x / 18 + y / 14 + frame * 1.6) > 0.35
      s.rect(x, y, 5, 5, on ? ['#c040e0', '#4080f0', '#e04080', '#40d0c0'][(Math.floor(x / 30) + frame) % 4] : '#1e1640')
    }
  // a lighting truss and beams sweeping down
  s.rect(0, 8, s.w, 4, INK).rect(0, 9, s.w, 2, '#4a4a5a')
  for (let i = 0; i < 6; i++) {
    const x = 20 + i * 44
    s.rect(x - 3, 11, 7, 5, INK).rect(x - 2, 12, 5, 3, ['#f04080', '#40c0f0', '#f0e040'][i % 3])
    const ang = Math.sin(frame * 1.3 + i) * 0.6
    for (let y = 16; y < 150; y += 1) {
      const cx = x + (y - 16) * ang
      if ((y + i) % 2) s.set(cx, y, ['#f04080', '#40c0f0', '#f0e040'][i % 3]).set(cx + 1, y + 1, ['#a02860', '#2880a0', '#a09028'][i % 3])
    }
  }
  // speaker stacks
  for (const x of [4, 212]) {
    for (const y of [96, 136]) {
      box(s, x, y, 40, 40, { fill: '#1c1c24', light: '#34343e', shade: '#121218' }, 2)
      s.ellipse(x + 20, y + 20, 13, 13, INK).ellipse(x + 20, y + 20, 11, 11, '#2a2a34').ellipse(x + 20, y + 20, 4, 4, '#44444e')
    }
  }
  // him behind the decks, a hand on his headphones
  trainer(s, me({ top: 'tee', topColour: 'black', accentColour: 'white', bottom: 'jeans', bottomColour: 'black', accessories: ['glasses', 'headphones', 'chain'] }), { front: { el: [61, 38], wr: [55, 25], hand: 'fist' }, back: { el: [22, 54], wr: [28, 60], hand: 'fist' }, mouth: 'smirk' }, 128, 194)
  // the booth: two decks and a mixer, a strip of light along its front
  box(s, 44, 140, 168, 56, { fill: '#1e1a2c', light: '#34304a', shade: '#141020' }, 3)
  s.rect(48, 150, 160, 2, ['#c040e0', '#40c0f0', '#e04080', '#40d0c0'][frame % 4])
  box(s, 40, 132, 176, 9, { fill: '#2a2638', light: '#46405a' }, 1)
  for (const x of [72, 184]) {
    s.ellipse(x, 133, 18, 5, INK).ellipse(x, 133, 17, 4, '#2a2a34').ellipse(x, 133, 10, 2.6, '#c84060').ellipse(x, 133, 2, 1, '#e8e8f0')
  }
  box(s, 114, 126, 28, 9, { fill: '#3a3a48', light: '#5a5a6c' }, 1)
  for (let i = 0; i < 4; i++) s.rect(118 + i * 6, 128, 2, 4, i === frame % 4 ? '#f0e040' : '#8a8aa0')
}

function bedroom(s: Scene, frame: number) {
  wall(s, 120, '#3e4c7a', '#2e3a60', 5)
  // a night window, posters, fairy lights twinkling
  windowFrame(s, 176, 16, 62, 58, ['#141a3a', '#1c2448', '#242e56'], { fill: '#d8c8a8', light: '#f0e4c8', shade: '#a89878' }, (x, y, w) => {
    s.ellipse(x + w - 12, y + 12, 6, 6, '#f4f0d0')
    for (const [dx, dy] of [[6, 8], [20, 20], [34, 6], [12, 30]]) s.set(x + dx, y + dy, '#f4f0d0')
  })
  poster(s, 20, 18, 40, 52, '#e0383e', (x, y, w) => {
    s.ellipse(x + w / 2, y + 22, 12, 12, '#1a1a24').ellipse(x + w / 2, y + 22, 3, 3, '#e0383e')
    s.rect(x + 4, y + 40, w - 8, 3, '#f8c838')
  })
  poster(s, 70, 26, 34, 40, '#2a8a7a', (x, y, w) => {
    s.poly([[x + 6, y + 32], [x + w / 2, y + 6], [x + w - 6, y + 32]], '#f4f0e8')
  })
  for (let i = 0; i < 24; i++) {
    const x = 10 + i * 10
    const y = 8 + Math.round(Math.sin(i / 2.4) * 3)
    s.set(x, y - 1, INK).ellipse(x, y + 2, 1.6, 1.6, (i + frame) % 3 === 0 ? '#fff4b0' : ['#f8c838', '#f86a6a', '#6ad0f8'][i % 3])
  }
  boards(s, 120, '#a0683c', '#946034', '#6a4224', 2)
  s.ellipse(110, 168, 70, 16, '#c84a5a').ellipse(110, 168, 62, 12, '#d8606a')
  // an amp and a second guitar on its stand
  box(s, 14, 128, 54, 46, { fill: '#2a2626', light: '#443e3c', shade: '#1a1616' }, 2)
  s.rect(19, 135, 44, 26, '#3e3a36')
  for (let y = 136; y < 160; y += 2) s.rect(20, y, 42, 1, '#2a2622')
  s.rect(22, 165, 30, 3, '#c8a050')
  for (const x of [56, 60]) s.set(x, 166, '#e8e0d0')
  // the guitar's case, never far away, leaning on the wall
  s.poly([[206, 178], [236, 178], [240, 150], [232, 128], [234, 104], [226, 84], [214, 86], [210, 104], [214, 128], [204, 150]], INK)
  s.poly([[208, 176], [234, 176], [238, 150], [230, 128], [232, 105], [225, 87], [215, 88], [212, 105], [216, 128], [206, 150]], '#2a2630')
  s.poly([[212, 172], [216, 150], [222, 132], [220, 108], [218, 92]], '#3e3a46')
  s.rect(214, 148, 22, 2, '#5a5464').rect(222, 154, 6, 4, '#c8a050')
  shadow(s, 128, 186, 14)
  const hands = trainer(s, me({ top: 'tee', topColour: 'grey', accentColour: 'white', bottom: 'jeans', bottomColour: 'navy', accessories: ['glasses', 'watch', 'bracelet'] }), { back: { el: [20, 46], wr: [14, 40], hand: 'fist' }, front: { el: [58, 56], wr: [48, 60], hand: 'fist' }, eyes: 'down', mouth: 'smile' }, 128, 186)
  guitarHeld(s, [hands.front[0] - 6, hands.front[1] - 2], hands.back)
  // a note or two drifting up
  const ny = 40 - frame * 6
  s.rect(170, ny, 1, 8, '#f4f0e8').ellipse(168, ny + 8, 2.4, 2, '#f4f0e8').rect(170, ny, 4, 1, '#f4f0e8')
}

function street(s: Scene) {
  sky(s, 110, ['#f0a868', '#f4b874', '#f6c882', '#f8d892', '#fae4a6'])
  s.ellipse(150, 100, 22, 22, '#fff4cc')
  // the far end of the lane: low rooftops against the glow, the street running away into it
  const far = rng(19)
  for (let x = 60; x < 196; x += 8 + Math.floor(far() * 6)) {
    const h = 6 + Math.floor(far() * 12)
    s.rect(x, 110 - h, 9, h + 1, '#9a5a4a')
    if (far() < 0.6) s.set(x + 3, 112 - h, '#ffe0a0')
  }
  s.bands(110, 150, ['#b07858', '#a46e52', '#98664c', '#8c5e48'])
  for (let y = 114; y < 150; y += 7) s.rect(0, y, s.w, 1, '#80563f')
  // laneway buildings either side, warm windows
  box(s, -4, 18, 74, 140, { fill: '#7a4a3a', light: '#9a6048', shade: '#5a3428' }, 3)
  box(s, 186, 30, 74, 128, { fill: '#5a5470', light: '#746e8c', shade: '#423e56' }, 3)
  for (let y = 30; y < 140; y += 22) {
    for (const x of [8, 36]) box(s, x, y, 18, 14, { fill: '#f8d070', light: '#fff0b0', shade: '#d0a040' }, 1)
    for (const x of [198, 226]) box(s, x, y + 6, 18, 14, { fill: y % 44 ? '#f8d070' : '#3e3a52', light: '#fff0b0' }, 1)
  }
  // fairy lights strung across the lane
  for (let x = 70; x < 186; x += 2) s.set(x, 46 + Math.round(Math.sin(((x - 70) / 116) * Math.PI) * 10), INK)
  for (let x = 76; x < 182; x += 9) s.ellipse(x, 48 + Math.round(Math.sin(((x - 70) / 116) * Math.PI) * 10), 1.6, 1.6, '#fff0a0')
  // cobbled lane
  s.rect(0, 150, s.w, 42, '#8a7a6e')
  for (let y = 152; y < 192; y += 5) for (let x = (y / 5) % 2 ? 0 : 5; x < 256; x += 10) s.rect(x, y, 9, 4, '#9a8a7c').rect(x, y + 3, 9, 1, '#6e6056')
  // a street lamp
  s.rect(170, 70, 3, 86, INK).rect(171, 70, 1, 86, '#4a4a56')
  box(s, 164, 60, 15, 12, { fill: '#f8e8a0', light: '#ffffff', shade: '#d8b860' }, 1)
  shadow(s, 116, 186, 14)
  // him with the camera up, framing a shot
  const hands = trainer(s, me({ top: 'jacket', topColour: 'tan', accentColour: 'brown', bottom: 'jeans', bottomColour: 'navy', accessories: ['glasses', 'bag', 'watch'] }), { front: { el: [61, 42], wr: [53, 31], hand: 'fist' }, back: { el: [21, 42], wr: [29, 31], hand: 'fist' }, mouth: 'calm' }, 116, 186)
  cameraHeld(s, [(hands.front[0] + hands.back[0]) / 2, (hands.front[1] + hands.back[1]) / 2 - 2])
}

function library(s: Scene, frame: number) {
  wall(s, 120, '#5a3a2e', '#3e281e', 5)
  const spines = ['#7a1e2e', '#2a4a7a', '#3a6a3a', '#c8a040', '#5a2a5a', '#a0582a', '#e8dcc0']
  bookshelf(s, -4, 4, 92, 130, { fill: '#6a4228', light: '#8a5a38', shade: '#4a2c18' }, spines, 5)
  bookshelf(s, 168, 4, 92, 130, { fill: '#6a4228', light: '#8a5a38', shade: '#4a2c18' }, spines, 8)
  // a window with rain running down it
  windowFrame(s, 96, 16, 64, 64, ['#4a5a78', '#56668a', '#62729a'], { fill: '#6a4228', light: '#8a5a38', shade: '#4a2c18' }, (x, y, w, h) => {
    for (let i = 0; i < 9; i++) {
      const rx = x + ((i * 13 + 3) % w)
      const ry = y + ((i * 17 + frame * 9) % h)
      s.rect(rx, ry, 1, 4, '#a8b8d8')
    }
  })
  boards(s, 120, '#7a4e30', '#704628', '#4e301a', 4)
  s.ellipse(128, 170, 92, 18, '#7a2a3a').ellipse(128, 170, 84, 14, '#8a3a46')
  for (let x = 48; x < 210; x += 8) s.set(x, 170, '#c8a040')
  // a reading lamp's warm pool of light
  s.rect(198, 98, 3, 52, INK).rect(199, 98, 1, 52, '#c8a040')
  s.poly([[188, 98], [211, 98], [206, 86], [193, 86]], INK).poly([[190, 97], [209, 97], [205, 87], [194, 87]], '#e8c060')
  for (let y = 99; y < 150; y++) for (let x = 200 - (y - 99) * 0.5; x < 200 + (y - 99) * 0.5; x++) if ((x + y) % 3 === 0) s.set(x, y, '#f0d890')
  // a green leather armchair
  box(s, 210, 130, 44, 44, { fill: '#2e5a3a', light: '#3e7a4c', shade: '#1e3e28' }, 3)
  box(s, 204, 146, 14, 30, { fill: '#2e5a3a', light: '#3e7a4c', shade: '#1e3e28' }, 2)
  shadow(s, 116, 186, 14)
  const hands = trainer(s, me({ top: 'hoodie', topColour: 'green', accentColour: 'white', bottom: 'joggers', bottomColour: 'black', accessories: ['glasses'] }), { front: { el: [57, 54], wr: [48, 49], hand: 'fist' }, back: { el: [23, 54], wr: [32, 49], hand: 'fist' }, eyes: 'down', mouth: 'calm' }, 116, 186)
  bookHeld(s, [(hands.front[0] + hands.back[0]) / 2, (hands.front[1] + hands.back[1]) / 2 - 2])
}

function den(s: Scene, frame: number) {
  s.bands(0, 120, ['#1e1630', '#241a3a', '#2a1e42', '#2e2248'])
  // an LED strip glowing along the top of the wall
  s.rect(0, 6, s.w, 2, frame % 2 ? '#e040c0' : '#40c0e0')
  s.dither(0, 8, s.w, 6, frame % 2 ? '#5a2a6a' : '#2a4a6a')
  // shelf of consoles and figures
  box(s, 150, 34, 96, 5, { fill: '#3a3048', light: '#54486a' }, 1)
  for (const [x, c, w, h] of [[156, '#e0383e', 8, 12], [170, '#f8c838', 6, 10], [184, '#3a7fe0', 12, 8], [204, '#5ac85a', 8, 14], [222, '#e8e8f0', 16, 9]] as const) box(s, x, 34 - h, w, h, { fill: c, light: darken(c, 1.3), shade: darken(c) }, 1)
  poster(s, 160, 52, 30, 40, '#2a2a4a', (x, y, w) => {
    s.ellipse(x + w / 2, y + 14, 8, 8, '#f8c838').rect(x + 6, y + 28, w - 12, 3, '#e0383e')
  })
  // the TV and a game in progress
  monitor(s, 14, 34, 120, 76, (x, y, w, h) => {
    s.rect(x, y, w, h, '#5aa0e8')
    s.rect(x, y + h - 14, w, 14, '#8a5a2a').rect(x, y + h - 14, w, 3, '#5ac85a')
    for (let bx = x + 6; bx < x + w; bx += 22) box(s, bx, y + h - 34, 12, 10, { fill: '#c8783a', light: '#e8984a', shade: '#8a4a1a' }, 1)
    for (let i = 0; i < 3; i++) s.ellipse(x + 20 + i * 30 - frame * 4, y + 18, 3, 3, '#f8d838')
    const px = x + 30 + frame * 6
    s.rect(px, y + h - 24, 6, 10, INK).rect(px + 1, y + h - 23, 4, 4, '#e0383e').rect(px + 1, y + h - 19, 4, 4, '#3a5ae0')
    s.ellipse(x + w - 20, y + 12, 9, 5, '#f4f8fc')
  }, '#1a1a22')
  box(s, 30, 116, 88, 10, { fill: '#2a2236', light: '#3e3450' }, 1)
  box(s, 42, 108, 22, 8, { fill: '#e8e8f0', light: '#ffffff', shade: '#a8a8b8' }, 1)
  tiles(s, 120, '#3a3048', '#352c42', '#2a2236')
  // a beanbag
  s.ellipse(222, 172, 30, 18, INK).ellipse(222, 172, 29, 17, '#c8406a').ellipse(216, 166, 18, 9, '#e0587e')
  shadow(s, 168, 186, 14)
  const hands = trainer(s, me({ top: 'hoodie', topColour: 'black', accentColour: 'red', bottom: 'joggers', bottomColour: 'grey', accessories: ['glasses', 'headphones'] }), { front: { el: [57, 56], wr: [47, 56], hand: 'fist' }, back: { el: [23, 56], wr: [33, 56], hand: 'fist' }, mouth: 'grin' }, 168, 186, true)
  controllerHeld(s, [(hands.front[0] + hands.back[0]) / 2, (hands.front[1] + hands.back[1]) / 2])
}

function chambers(s: Scene, frame: number) {
  s.rect(0, 0, s.w, 130, '#2e4236')
  for (let x = 0; x < 256; x += 8) s.rect(x, 0, 1, 130, '#2a3c30')
  // law reports in matching bindings
  bookshelf(s, -4, 6, 104, 118, { fill: '#5a3420', light: '#7a4a2e', shade: '#3e2214' }, ['#7a1e2e', '#7a1e2e', '#2a3a6a', '#2e5a3a'], 13, 22)
  // a night window on the city
  windowFrame(s, 150, 14, 90, 72, ['#0e1430', '#141c3e', '#1a244c'], { fill: '#5a3420', light: '#7a4a2e', shade: '#3e2214' }, (x, y, w, h) => {
    const r = rng(3)
    for (let bx = x; bx < x + w; bx += 8 + Math.floor(r() * 5)) {
      const bh = 18 + Math.floor(r() * 40)
      s.rect(bx, y + h - bh, 8, bh, '#242c4e')
      for (let wy = y + h - bh + 3; wy < y + h; wy += 4) if (r() < 0.4) s.set(bx + 2 + Math.floor(r() * 4), wy, '#f8d880')
    }
  })
  s.rect(0, 124, s.w, 68, '#3a2a22')
  // him at the desk, typing, the draft on a screen to one side growing line by line
  monitor(s, 112, 98, 56, 40, (x, y, w) => {
    s.rect(x, y, w, 36, '#f6f6f2').rect(x, y, w, 4, '#5a6a80')
    for (let i = 0; i <= frame + 3; i++) s.rect(x + 3, y + 7 + i * 4, i === frame + 3 ? 14 + frame * 8 : w - 8 - ((i * 7) % 14), 1, '#5a6070')
  })
  trainer(s, me({ top: 'shirt', topColour: 'white', accentColour: 'maroon', bottom: 'slacks', bottomColour: 'black', shoes: 'formal', accessories: ['glasses', 'watch'] }), { front: { el: [58, 56], wr: [52, 63], hand: 'fist' }, back: { el: [22, 56], wr: [28, 63], hand: 'fist' }, eyes: 'down', mouth: 'calm' }, 84, 188)
  box(s, -4, 150, 264, 9, { fill: '#7a4a2a', light: '#9a6238', shade: '#5a3420' }, 2)
  box(s, 6, 158, 244, 40, { fill: '#5a3420', light: '#744428', shade: '#40220f' }, 3)
  box(s, 66, 145, 40, 6, { fill: '#3a3c48', light: '#5a5e6c' }, 1)
  for (let x = 69; x < 104; x += 3) s.set(x, 147, '#8a8ea0')
  // a banker's lamp
  s.rect(204, 124, 3, 26, INK).rect(205, 124, 1, 26, '#c8a040')
  s.poly([[190, 124], [222, 124], [218, 114], [194, 114]], INK).poly([[192, 123], [220, 123], [216, 115], [196, 115]], '#2e8a4a')
  box(s, 196, 146, 20, 5, { fill: '#c8a040', light: '#e8c860' }, 1)
  // briefs tied in pink tape, a coffee
  for (let k = 0; k < 4; k++) {
    box(s, 140, 142 - k * 7, 46, 8, { fill: '#f0eadc', shade: '#c8c0ac' }, 1)
    s.rect(160, 142 - k * 7, 3, 8, '#e86a9a')
  }
  box(s, 14, 138, 10, 12, { fill: '#f4f0e8', shade: '#c8c0b0' }, 1)
  s.rect(16, 139, 6, 2, '#5a3a22')
}

function hall(s: Scene) {
  s.rect(0, 0, s.w, 112, '#2e2a4a')
  for (let x = 0; x < 256; x += 24) s.rect(x, 0, 2, 112, '#26223e')
  // the society's banner over the stage, and the screen
  box(s, 28, 8, 200, 24, { fill: '#e0383e', light: '#f05a5a', shade: '#a02028' }, 2)
  s.rect(40, 14, 40, 4, '#f8c838').rect(40, 21, 60, 3, '#f4f0e8').rect(170, 12, 46, 14, '#f4f0e8').ellipse(193, 19, 5, 5, '#e0383e')
  box(s, 72, 36, 112, 46, { fill: '#e8ecf2', light: '#ffffff', shade: '#b8c0cc' }, 1)
  s.rect(80, 44, 48, 4, '#3a5aa0').rect(80, 52, 90, 2, '#8a90a0').rect(80, 57, 80, 2, '#8a90a0').rect(80, 62, 70, 2, '#8a90a0')
  // the stage and the panel table with its microphones
  box(s, -4, 96, 264, 22, { fill: '#5a3a28', light: '#7a5236', shade: '#3e2618' }, 3)
  box(s, 56, 80, 144, 18, { fill: '#2a3a6a', light: '#3e5088', shade: '#1e2a4e' }, 2)
  for (const x of [84, 128, 172]) {
    s.rect(x, 70, 2, 11, INK).rect(x - 2, 68, 6, 4, INK)
    box(s, x - 8, 60, 18, 20, { fill: '#3a3a46', light: '#54546a' }, 1)
  }
  boards(s, 118, '#8a6a4a', '#806242', '#5a4228', 6)
  // the audience, from behind: rows of chairs and heads
  for (const [y, n, sz] of [[150, 9, 1], [172, 7, 1.25]] as const) {
    for (let i = 0; i < n; i++) {
      const x = 14 + i * (240 / n) + ((y / 2) % 2) * 8
      box(s, x - 9 * sz, y, 18 * sz, 22 * sz, { fill: '#3a3a4a', light: '#54546a', shade: '#262632' }, 1)
      s.ellipse(x, y - 4 * sz, 6 * sz, 7 * sz, INK).ellipse(x, y - 4 * sz, 5 * sz, 6 * sz, ['#2a1a12', '#5a3a22', '#1a1a20', '#a06a3a'][i % 4])
    }
  }
  // him at the side of the room, running it: clipboard in hand
  const hands = trainer(s, me({ top: 'blazer', topColour: 'navy', accentColour: 'white', bottom: 'slacks', bottomColour: 'grey', shoes: 'formal', accessories: ['glasses', 'watch'] }), { front: { el: [60, 52], wr: [53, 47], hand: 'fist' }, mouth: 'grin' }, 214, 176)
  clipboardHeld(s, [hands.front[0] - 3, hands.front[1] - 4])
}

export const HABITATS: Record<HabitatId, Habitat> = {
  harbour: { label: 'Sydney Harbour', alt: 'Aaryan waving in a harbourside park at dusk, the Harbour Bridge and the Opera House across the water.', frames: 2, draw: harbour },
  courtroom: { label: 'Courtroom', alt: 'Aaryan in a suit at the bar table of a wood-panelled courtroom, pointing: objection.', frames: 1, draw: courtroom },
  review: { label: 'Review floor', alt: 'Aaryan in a shirt and tie beside a desk of document-review screens, the city through the window.', frames: 4, draw: review },
  lab: { label: 'Biotech lab', alt: 'Aaryan in a white coat behind a lab bench, holding a flask up to the light, a microscope and test tubes beside him.', frames: 3, draw: lab },
  stall: { label: 'Society stall', alt: 'Aaryan in a society hoodie behind a merch stall under a striped canopy, a sold-out sign on the table.', frames: 2, draw: stall },
  campus: { label: 'Main walkway', alt: 'Aaryan holding up a tour flag on a campus walkway under O-Week bunting, sandstone arches behind.', frames: 2, draw: campus },
  pitch: { label: 'Football pitch', alt: 'Aaryan in the number 7 jersey on a football pitch, fist raised, the goal and a full stand behind.', frames: 2, draw: pitch },
  oval: { label: 'Cricket oval', alt: 'Aaryan in whites and a cap with a bat on his shoulder at the nets of a cricket oval, a bucket of balls beside him.', frames: 1, draw: oval },
  club: { label: 'DJ booth', alt: 'Aaryan in headphones behind the decks of a DJ booth, beams of light and an LED wall behind him.', frames: 4, draw: club },
  bedroom: { label: 'Music corner', alt: 'Aaryan playing an acoustic guitar in his room, an amp, posters and fairy lights around him.', frames: 3, draw: bedroom },
  street: { label: 'Golden-hour lane', alt: 'Aaryan raising a camera in a laneway at golden hour, warm windows and fairy lights around him.', frames: 1, draw: street },
  library: { label: 'Reading nook', alt: 'Aaryan reading a book between tall bookshelves, rain on the window and a lamp glowing by an armchair.', frames: 2, draw: library },
  den: { label: 'Gaming den', alt: 'Aaryan with a controller in front of a TV mid-game, a beanbag and a shelf of consoles in the glow of an LED strip.', frames: 3, draw: den },
  chambers: { label: 'Chambers', alt: 'Aaryan typing at a desk in chambers at night: briefs tied in pink tape, a green banker’s lamp, law reports on the shelves.', frames: 3, draw: chambers },
  hall: { label: 'Society event', alt: 'Aaryan with a clipboard at the side of a hall during a society panel, the audience seen from behind.', frames: 1, draw: hall },
}

/** Paint one frame of a habitat into a fresh scene. */
export function paintHabitat(id: HabitatId, frame = 0): Scene {
  const s = new Scene()
  HABITATS[id].draw(s, frame % HABITATS[id].frames)
  return s
}

export const habitatIds = Object.keys(HABITATS) as HabitatId[]
