/**
 * The Pokédex's rare "wild Aaryan" encounter, one painted scene per line of it: he turns up in
 * the tall grass of a route, is found hunting his room for his phone charger, checks his watch at
 * his desk with a deadline on the screen, and is gone in a puff of dust. Drawn with the Pokédex
 * habitats' kit (habitat-kit.ts), at the same 256×192 size and on the same pixel grid as the
 * character, with a frame or two of motion (grass, a blinking battery, a ticking clock).
 */
import type { Appearance, PoseFrame } from './character.ts'
import { signature } from '../content/aaryan.ts'
import { boards, box, darken, desk, INK, poster, rng, Scene, shadow, trainer, wall, windowFrame } from './habitat-kit.ts'

export type EncounterScene = 'wild' | 'charger' | 'deadline' | 'fled'

export interface EncounterArt {
  /** a sentence describing the picture, for screen readers */
  alt: string
  /** frames of motion (cycled slowly; still with reduced motion) */
  frames: number
  draw: (s: Scene, frame: number) => void
}

const me = (o: Partial<Appearance> = {}): Appearance => ({ ...signature, ...o })
/** At home of an evening: hoodie and joggers, glasses and watch on. */
const atHome = me({ top: 'hoodie', topColour: 'navy', accentColour: 'white', bottom: 'jeans', bottomColour: 'grey', accessories: ['glasses', 'watch'] })

/* ---------------- the route ---------------- */

/** A Gen V route: sky, a line of trees, a field, a dirt path running up it. */
function route(s: Scene, frame: number) {
  s.bands(0, 84, ['#76bdf0', '#88c6f2', '#9ccff4', '#b2daf6', '#c6e4f6'])
  // a couple of clouds, drifting a pixel a frame
  for (const [cx, cy, r] of [[52, 22, 9], [196, 34, 7]] as const) {
    const x = cx + frame
    s.ellipse(x, cy, r * 1.8, r, '#ffffff').ellipse(x - r, cy + 2, r, r * 0.7, '#ffffff').ellipse(x + r * 1.2, cy + 2, r * 1.1, r * 0.7, '#ffffff')
    s.rect(x - r * 2, cy + r * 0.6, r * 4, 1, '#d8ecf8')
  }
  // far hills, then the tree line
  s.poly([[0, 84], [0, 70], [40, 62], [90, 70], [140, 60], [200, 68], [256, 60], [256, 84]], '#8cc8a0')
  for (let x = -8; x < 270; x += 18) {
    const y = 78 + ((x * 7) % 5)
    s.ellipse(x, y, 13, 11, INK).ellipse(x, y, 12, 10, '#2f7a4a').ellipse(x - 3, y - 3, 7, 5, '#45965a')
  }
  // the field, with a texture of grass flecks
  s.bands(84, 192, ['#6cc05a', '#66b854', '#60b04e', '#5aa84a'])
  const r = rng(7)
  for (let i = 0; i < 260; i++) s.set(Math.floor(r() * 256), 88 + Math.floor(r() * 100), r() < 0.5 ? '#4e9a42' : '#82d06a')
  // the path, widening towards you
  s.poly([[112, 86], [140, 86], [196, 192], [60, 192]], '#c8a868')
  s.poly([[114, 86], [138, 86], [190, 192], [66, 192]], '#dcbc7c')
  for (let i = 0; i < 40; i++) s.set(80 + Math.floor(r() * 96), 100 + Math.floor(r() * 90), '#c4a464')
}

/**
 * A patch of tall grass, BW-style: rows of pointed blades, dark at the roots and light at the
 * tips, swaying a pixel between frames. Rows are drawn back to front, so a figure drawn between
 * calls is half hidden in it.
 */
function tallGrass(s: Scene, x0: number, x1: number, rows: number[], frame: number) {
  for (const y of rows) {
    // the body of the patch, solid down to the next row, so nothing shows through it
    s.rect(x0, y - 4, x1 - x0, 18, '#2a8238')
    s.dither(x0, y - 4, x1 - x0, 18, '#24742f', frame)
    for (let x = x0; x < x1; x += 7) {
      const lean = ((x + y) / 7 + frame) % 2 ? 1 : -1
      s.poly([[x, y], [x + 3 + lean, y - 13], [x + 7, y]], INK)
      s.poly([[x + 1, y], [x + 3 + lean, y - 11], [x + 6, y]], '#2e8c3c')
      s.poly([[x + 2, y - 2], [x + 3 + lean, y - 10], [x + 4, y - 2]], '#56b44a')
    }
    s.rect(x0, y, x1 - x0, 3, '#25702f')
  }
}

function wild(s: Scene, frame: number) {
  route(s, frame)
  tallGrass(s, 70, 190, [150], frame)
  shadow(s, 128, 186, 14)
  const hands = trainer(s, me(), { front: { el: [61, 36], wr: [63, 22], hand: 'open' }, mouth: 'grin', brow: 'up' }, 128, 186)
  tallGrass(s, 56, 204, [166, 180, 194], frame)
  // the "!" of a sudden encounter, over his head
  const bx = hands.right + 6
  const by = hands.top - 4
  s.ellipse(bx + 6, by + 7, 9, 9, INK).ellipse(bx + 6, by + 7, 8, 8, '#ffffff').poly([[bx, by + 12], [bx - 4, by + 18], [bx + 4, by + 14]], '#ffffff')
  s.rect(bx + 5, by + 2, 3, 7, '#e0383e').rect(bx + 5, by + 11, 3, 2, '#e0383e')
}

function fled(s: Scene, frame: number) {
  route(s, frame)
  tallGrass(s, 70, 190, [150], frame)
  // the grass he went through, flattened in a line off to the right
  s.poly([[128, 172], [256, 150], [256, 160], [128, 182]], '#4ea044')
  tallGrass(s, 56, 204, [166, 180, 194], frame)
  // a puff of dust where he stood, thinning out
  const k = frame ? 0.8 : 1
  for (const [dx, dy, r] of [[0, 0, 16], [-16, 8, 11], [16, 6, 12], [6, -12, 10], [-8, -8, 9]] as const) s.ellipse(128 + dx, 160 + dy, r * k + 1, r * k * 0.8 + 1, INK)
  for (const [dx, dy, r] of [[0, 0, 16], [-16, 8, 11], [16, 6, 12], [6, -12, 10], [-8, -8, 9]] as const) s.ellipse(128 + dx, 160 + dy, r * k, r * k * 0.8, '#efe6d2')
  s.ellipse(122, 154, 6 * k, 4 * k, '#ffffff')
  // speed lines, off he goes
  for (const [y, len] of [[140, 40], [152, 56], [164, 34]] as const) s.rect(152 + frame * 6, y, len, 2, '#ffffff').rect(152 + frame * 6, y + 2, len, 1, '#c8dcc0')
}

/* ---------------- his room ---------------- */

function room(s: Scene, frame: number) {
  wall(s, 120, '#3e4c7a', '#2e3a60', 5)
  // the night outside, a moon and a few stars
  windowFrame(s, 98, 16, 58, 52, ['#141a3a', '#1c2448', '#242e56'], { fill: '#d8c8a8', light: '#f0e4c8', shade: '#a89878' }, (x, y, w) => {
    s.ellipse(x + w - 12, y + 12, 6, 6, '#f4f0d0').ellipse(x + w - 9, y + 10, 5, 5, '#1c2448')
    for (const [dx, dy] of [[6, 8], [20, 22], [30, 6], [12, 30]]) s.set(x + dx, y + dy, '#f4f0d0')
  })
  poster(s, 176, 22, 36, 46, '#e0383e', (x, y, w) => {
    s.ellipse(x + w / 2, y + 20, 11, 11, '#1a1a24').ellipse(x + w / 2, y + 20, 3, 3, '#e0383e')
    s.rect(x + 4, y + 36, w - 8, 3, '#f8c838')
  })
  poster(s, 220, 30, 28, 34, '#2a8a7a', (x, y, w) => s.poly([[x + 5, y + 28], [x + w / 2, y + 6], [x + w - 5, y + 28]], '#f4f0e8'))
  // fairy lights along the top, twinkling
  for (let i = 0; i < 26; i++) {
    const x = 6 + i * 10
    const y = 7 + Math.round(Math.sin(i / 2.4) * 3)
    s.set(x, y - 1, INK).ellipse(x, y + 2, 1.6, 1.6, (i + frame) % 3 === 0 ? '#fff4b0' : ['#f8c838', '#f86a6a', '#6ad0f8'][i % 3])
  }
  boards(s, 120, '#a0683c', '#946034', '#6a4224', 2)
  s.ellipse(150, 170, 64, 14, '#c84a5a').ellipse(150, 170, 56, 10, '#d8606a')
}

/** His bed against the left wall: headboard, a rumpled duvet, a pillow flipped over in the search. */
function bed(s: Scene) {
  box(s, 2, 82, 12, 92, { fill: '#7a4a2a', light: '#9a6440', shade: '#5a321c' }, 2)
  box(s, 6, 122, 92, 46, { fill: '#7a4a2a', light: '#9a6440', shade: '#5a321c' }, 2)
  s.rect(10, 112, 86, 16, INK).rect(11, 113, 84, 14, '#f0eef6')
  // the duvet, thrown back
  s.poly([[30, 112], [96, 110], [98, 130], [26, 132]], INK)
  s.poly([[31, 113], [95, 111], [96, 129], [28, 131]], '#5a7ac8')
  for (let x = 36; x < 94; x += 12) s.line(x, 112, x - 2, 130, '#4a68b0')
  // the pillow, thrown down the foot of the bed in the search
  s.ellipse(82, 118, 13, 6, INK).ellipse(82, 118, 12, 5, '#f8f6fc').rect(73, 118, 18, 1, '#dcd8e8')
}

/** A phone face up on the bed, its battery flashing red. */
function deadPhone(s: Scene, x: number, y: number, frame: number) {
  box(s, x, y, 12, 18, { fill: '#1e1e26', light: '#3a3a46', shade: '#121218' }, 1)
  s.rect(x + 2, y + 2, 8, 13, frame ? '#2a2e3a' : '#3a1418')
  // the battery icon, nearly empty
  s.frame(x + 3, y + 6, 6, 4, frame ? '#5a5e6c' : '#f86a6a').set(x + 9, y + 7, frame ? '#5a5e6c' : '#f86a6a').set(x + 9, y + 8, frame ? '#5a5e6c' : '#f86a6a')
  if (!frame) s.rect(x + 4, y + 7, 1, 2, '#e0383e')
}

/** The charger, of course, under the bed the whole time: a white lead and its plug poking out. */
function charger(s: Scene, frame: number) {
  room(s, frame)
  bed(s)
  deadPhone(s, 44, 114, frame)
  s.rect(60, 170, 30, 2, '#f4f4f8').rect(60, 172, 30, 1, '#c8c8d4')
  box(s, 88, 167, 8, 7, { fill: '#f4f4f8', light: '#ffffff', shade: '#c8c8d4' }, 1)
  s.rect(96, 169, 2, 1, '#a8a8b4').rect(96, 171, 2, 1, '#a8a8b4')
  // an empty socket on the wall, and the drawer he's already turned out
  box(s, 228, 96, 14, 12, { fill: '#f0eee6', light: '#ffffff', shade: '#c8c4b8' }, 1)
  s.rect(231, 99, 2, 4, INK).rect(237, 99, 2, 4, INK)
  box(s, 200, 120, 50, 54, { fill: '#8a5a34', light: '#a8744a', shade: '#663f22' }, 2)
  box(s, 196, 128, 52, 14, { fill: '#9a6a40', light: '#b8845a', shade: '#704626' }, 1)
  for (const [x, c] of [[202, '#e0383e'], [210, '#f8c838'], [220, '#3a8ae0'], [232, '#f4f0e8']] as const) s.rect(x, 124, 7, 4, c)
  // and a sock on the floor for good measure
  s.poly([[172, 180], [184, 180], [186, 186], [176, 188]], INK).poly([[173, 181], [183, 181], [184, 185], [177, 186]], '#e8e4dc')
  shadow(s, 138, 186, 14)
  const pose: PoseFrame = { front: { el: [62, 32], wr: [55, 13], hand: 'open' }, ruffle: 1, eyes: 'down', mouth: 'calm', tilt: 1 }
  const hands = trainer(s, atHome, pose, 138, 186)
  // question marks, bobbing over his head
  const qx = hands.left - 6
  const qy = hands.top + (frame ? 2 : 0)
  for (const [dx, dy] of [[0, 0], [14, -8]] as const) {
    s.rect(qx + dx, qy + dy, 5, 2, '#ffffff').rect(qx + dx + 4, qy + dy + 1, 2, 4, '#ffffff').rect(qx + dx + 2, qy + dy + 4, 3, 2, '#ffffff').rect(qx + dx + 2, qy + dy + 8, 2, 2, '#ffffff')
  }
}

/* ---------------- his desk, late ---------------- */

function deadline(s: Scene, frame: number) {
  wall(s, 124, '#2e3858', '#222a46', 5)
  // the city outside at night
  windowFrame(s, 14, 16, 70, 58, ['#0e1430', '#141a3a', '#1a2246'], { fill: '#c8b898', light: '#e4d6b6', shade: '#988870' }, (x, y, w, h) => {
    const r = rng(11)
    for (let bx = x + 2; bx < x + w - 4; bx += 9) {
      const bh = 12 + Math.floor(r() * 26)
      s.rect(bx, y + h - bh, 8, bh, '#232a4a')
      for (let wy = y + h - bh + 3; wy < y + h - 2; wy += 4) if (r() < 0.45) s.set(bx + 2 + Math.floor(r() * 4), wy, '#ffe08a')
    }
  })
  // a wall calendar with the day ringed in red, and a clock a few minutes off midnight
  box(s, 118, 22, 40, 44, { fill: '#f4f0e6', light: '#ffffff', shade: '#c8c0b0' }, 1)
  s.rect(118, 22, 40, 8, '#e0383e')
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) s.rect(121 + c * 6, 33 + r * 8, 4, 5, '#d8d2c4')
  s.frame(138, 48, 8, 9, '#e0383e').frame(139, 49, 6, 7, '#e0383e')
  const [cx, cy] = [200, 42]
  s.ellipse(cx, cy, 15, 15, INK).ellipse(cx, cy, 14, 14, '#f8f6ee').ellipse(cx, cy, 13, 13, '#ffffff')
  for (let i = 0; i < 12; i++) s.set(cx + Math.round(Math.sin((i / 12) * 2 * Math.PI) * 11), cy - Math.round(Math.cos((i / 12) * 2 * Math.PI) * 11), '#7a7e8c')
  const minute = ((55 + frame) / 60) * 2 * Math.PI
  s.line(cx, cy, cx - 3, cy - 7, INK).line(cx, cy, cx + Math.round(Math.sin(minute) * 10), cy - Math.round(Math.cos(minute) * 10), '#e0383e')
  boards(s, 124, '#7a5232', '#6e4a2c', '#4e321c', 3)
  // the desk: laptop open on a document marked DUE in red, books with sticky notes, a mug
  desk(s, 150, 118, 100, 62, { fill: '#8a6440', light: '#a87e56', shade: '#664828' })
  s.poly([[176, 116], [234, 116], [238, 120], [172, 120]], INK).poly([[177, 117], [233, 117], [236, 119], [174, 119]], '#b8bcc8')
  box(s, 180, 80, 50, 37, { fill: '#2a2c36', light: '#44465a', shade: '#1a1c24' }, 1)
  s.rect(183, 83, 44, 31, '#f4f6fa')
  s.rect(186, 86, 38, 5, '#e0383e').rect(188, 87, 12, 3, '#ffffff')
  for (let y = 94; y < 112; y += 3) s.rect(186, y, 18 + ((y * 5) % 20), 1, '#a8acb8')
  if (!frame) s.rect(205, 109, 1, 3, INK)
  for (const [y, c] of [[108, '#3a7fe0'], [102, '#4aa242'], [96, '#a02838']] as const) box(s, 154, y, 22, 6, { fill: c, light: '#ffffff', shade: darken(c) }, 1)
  s.rect(170, 94, 5, 4, '#f8e858').rect(158, 100, 5, 4, '#f86ab0')
  box(s, 240, 104, 8, 12, { fill: '#e8e4dc', light: '#ffffff', shade: '#b8b4ac' }, 1)
  s.rect(248, 107, 2, 5, INK)
  if (frame) for (const dx of [242, 245]) s.set(dx, 100, '#d8dce8').set(dx + 1, 98, '#d8dce8')
  shadow(s, 102, 186, 14)
  // checking his watch: the wrist turned up in front of his face
  const pose: PoseFrame = { front: { el: [63, 52], wr: [47, 47], hand: 'fist' }, eyes: 'down', mouth: 'calm', brow: 'up', tilt: 2 }
  const hands = trainer(s, atHome, pose, 102, 186)
  // a bead of sweat
  const sx = hands.left - 2
  const sy = hands.top + 12 + frame * 2
  s.poly([[sx, sy], [sx - 2, sy + 4], [sx + 2, sy + 4]], '#a8d8f8').ellipse(sx, sy + 5, 2, 2, '#a8d8f8').set(sx - 1, sy + 4, '#ffffff')
}

export const ENCOUNTER_ART: Record<EncounterScene, EncounterArt> = {
  wild: { alt: 'Aaryan standing in the tall grass of a route, waving, an exclamation mark over his head: a wild encounter.', frames: 2, draw: wild },
  charger: { alt: 'Aaryan in his bedroom at night scratching his head, the bed turned over and his phone flashing a red battery, the charger lead poking out from under the bed.', frames: 2, draw: charger },
  deadline: { alt: 'Aaryan at his desk late at night checking his watch, a document marked due on the laptop, the clock nearly at midnight.', frames: 2, draw: deadline },
  fled: { alt: 'The tall grass where Aaryan stood, now empty, a puff of dust and a flattened trail where he ran off.', frames: 2, draw: fled },
}

/** One frame of an encounter scene. */
export function paintEncounter(id: EncounterScene, frame = 0): Scene {
  const s = new Scene()
  ENCOUNTER_ART[id].draw(s, frame % ENCOUNTER_ART[id].frames)
  return s
}
