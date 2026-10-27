/**
 * The Pokédex's rare "wild Aaryan" encounter, one painted scene per line of it: he turns up in
 * the tall grass of a route, is found hunting his room for his phone charger, checks his watch at
 * his desk with a deadline on the screen, and is gone in a puff of dust. Drawn with the Pokédex
 * habitats' kit (habitat-kit.ts), at the same 256×192 size and on the same pixel grid as the
 * character. Each is a short loop of 8–12 frames: he waves, scratches his head and shrugs, checks
 * his watch and sweats, and runs off up the path, while the grass sways, the battery flashes, the
 * clock's second hand sweeps and the mug steams.
 */
import type { Appearance, PoseFrame, Pt } from './character.ts'
import { signature } from '../content/aaryan.ts'
import { boards, box, darken, desk, INK, monitor, poster, rng, Scene, shadow, trainer, wall, windowFrame } from './habitat-kit.ts'

export type EncounterScene = 'wild' | 'charger' | 'deadline' | 'valorant' | 'fled'

export interface EncounterArt {
  /** a sentence describing the picture, for screen readers */
  alt: string
  /** frames in the scene's loop */
  frames: number
  /** how long each frame shows */
  ms: number
  /** the frame that tells the story on its own (shown with reduced motion) */
  rest: number
  draw: (s: Scene, frame: number) => void
}

/** A gentle -1..1 drift over a loop of `n` frames, back where it started on the last. */
const drift = (f: number, n: number, amp = 1) => Math.round(Math.sin((f / n) * 2 * Math.PI) * amp)

const me = (o: Partial<Appearance> = {}): Appearance => ({ ...signature, ...o })
/** At home of an evening: hoodie and joggers, glasses and watch on. */
const atHome = me({ top: 'hoodie', topColour: 'navy', accentColour: 'white', bottom: 'jeans', bottomColour: 'grey', accessories: ['glasses', 'watch'] })

/* ---------------- the route ---------------- */

/** A Gen V route: sky, a line of trees, a field, a dirt path running up it. */
function route(s: Scene, cloud: number) {
  s.bands(0, 84, ['#76bdf0', '#88c6f2', '#9ccff4', '#b2daf6', '#c6e4f6'])
  // a couple of clouds, drifting back and forth a pixel or two
  for (const [cx, cy, r, k] of [[52, 22, 9, 1], [196, 34, 7, -1]] as const) {
    const x = cx + cloud * k
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

/** The wave: the wrist swings out and back over a beat of four frames, the elbow held. */
const WAVE: Pt[] = [
  [63, 22],
  [67, 24],
  [63, 22],
  [58, 23],
]
/** The "!" pops up, overshoots and settles, then bobs on the beat. */
const POP = [-4, -1, 0, 0, -1, 0, 0, 0]

/** Eight frames: he waves from the grass, grinning, the "!" popping up and the grass swaying. */
function wild(s: Scene, f: number) {
  route(s, drift(f, 8))
  tallGrass(s, 70, 190, [150], f >> 1)
  shadow(s, 128, 186, 14)
  const pose: PoseFrame = { front: { el: [61, 36], wr: WAVE[f % 4], hand: 'open' }, mouth: f < 5 ? 'grin' : 'smile', brow: 'up', eyes: f === 6 ? 'closed' : 'open' }
  const hands = trainer(s, me(), pose, 128, 186)
  tallGrass(s, 56, 204, [166, 180, 194], (f >> 1) + 1)
  // the "!" of a sudden encounter, over his head
  const bx = hands.right + 6
  const by = hands.top - 4 + POP[f]
  s.ellipse(bx + 6, by + 7, 9, 9, INK).ellipse(bx + 6, by + 7, 8, 8, '#ffffff').poly([[bx, by + 12], [bx - 4, by + 18], [bx + 4, by + 14]], '#ffffff')
  s.rect(bx + 5, by + 2, 3, 7, '#e0383e').rect(bx + 5, by + 11, 3, 2, '#e0383e')
  // a little burst of lines as it lands
  if (f < 2) for (const [dx, dy, w, h] of [[-6, 2, 3, 1], [17, 2, 3, 1], [5, -6, 1, 3], [-4, -4, 2, 1], [15, -4, 2, 1]] as const) s.rect(bx + dx, by + dy, w, h, '#ffffff')
}

/**
 * Him, a dozen pixels tall and seen from behind, legging it up the path towards the trees: the
 * back of his head, the white jersey with its red stripe, arms and legs pumping on `stride`.
 */
function runner(s: Scene, x: number, y: number, stride: number) {
  const [la, ra] = stride ? [-1, 1] : [1, -1]
  // arms swing opposite the legs, behind the body
  s.rect(x - 5, y - 10 + la, 3, 5, INK).rect(x + 3, y - 10 + ra, 3, 5, INK)
  s.rect(x - 4, y - 9 + la, 1, 3, '#8a5a3a').rect(x + 4, y - 9 + ra, 1, 3, '#8a5a3a')
  // legs, one lifted
  s.rect(x - 3, y - 5, 3, 5 - (stride ? 2 : 0), INK).rect(x + 1, y - 5, 3, 5 - (stride ? 0 : 2), INK)
  s.rect(x - 2, y - 5, 1, 4 - (stride ? 2 : 0), '#2a2a34').rect(x + 2, y - 5, 1, 4 - (stride ? 0 : 2), '#2a2a34')
  // jersey, then the back of his head
  s.rect(x - 3, y - 11, 7, 7, INK).rect(x - 2, y - 10, 5, 5, '#f6f6f2').rect(x - 2, y - 8, 5, 1, '#e0383e')
  s.rect(x - 2, y - 15, 5, 5, INK).rect(x - 1, y - 14, 3, 3, '#1c1418').set(x, y - 11, '#8a5a3a')
}

/** The dust's size over the loop: billowing out, then thinning away to where it started. */
const PUFF = [0.6, 0.75, 0.88, 0.97, 1, 0.92, 0.8, 0.68]

/** Eight frames: the dust where he stood billows out and thins; far up the path, he's away. */
function fled(s: Scene, f: number) {
  route(s, drift(f, 8))
  // him, small and getting smaller, nearly at the tree line
  runner(s, 132 + f * 2, 112 - f * 2, f % 2)
  tallGrass(s, 70, 190, [150], f >> 1)
  // the grass he went through, flattened in a line off to the right
  s.poly([[128, 172], [256, 150], [256, 160], [128, 182]], '#4ea044')
  tallGrass(s, 56, 204, [166, 180, 194], (f >> 1) + 1)
  // a puff of dust where he stood, billowing, drifting up and thinning away
  const k = PUFF[f]
  const rise = drift(f, 8, 2) + 2
  const puffs = [[0, 0, 16], [-16, 8, 11], [16, 6, 12], [6, -12, 10], [-8, -8, 9]] as const
  for (const [dx, dy, r] of puffs) s.ellipse(128 + dx * k, 160 + dy * k - rise, r * k + 1, r * k * 0.8 + 1, INK)
  for (const [dx, dy, r] of puffs) s.ellipse(128 + dx * k, 160 + dy * k - rise, r * k, r * k * 0.8, f < 5 ? '#efe6d2' : '#e4dccb')
  s.ellipse(122, 154 - rise, 6 * k, 4 * k, '#ffffff')
  for (const [dx, dy] of [[-26, -4], [30, -10], [-20, -18], [24, 8]] as const) if ((f + dx + 30) % 3 === 0) s.rect(128 + dx * k, 160 + dy - rise, 2, 2, '#efe6d2')
  // speed lines streaking off after him
  for (const [y, len] of [[140, 40], [152, 56], [164, 34]] as const) {
    const x = 150 + f * 7
    const l = Math.max(6, len - f * 4)
    s.rect(x, y, l, 2, '#ffffff').rect(x, y + 2, l, 1, '#c8dcc0')
  }
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

/**
 * Eight frames: he scratches his head (the hand working back and forth, the hair ruffling), then
 * gives up and shrugs, while the phone flashes its red battery and the "?"s bob. The charger,
 * of course, is under the bed the whole time: a white lead and its plug poking out.
 */
const SCRATCH: Array<{ wr: Pt; ruffle: 0 | 1 | 2 }> = [
  { wr: [55, 13], ruffle: 1 },
  { wr: [58, 15], ruffle: 2 },
  { wr: [55, 13], ruffle: 1 },
  { wr: [58, 15], ruffle: 2 },
  { wr: [55, 13], ruffle: 1 },
]
function charger(s: Scene, f: number) {
  room(s, f >> 1)
  bed(s)
  deadPhone(s, 44, 114, f % 4 < 2 ? 0 : 1)
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
  const scratch = SCRATCH[f]
  const pose: PoseFrame = scratch
    ? { front: { el: [62, 32], wr: scratch.wr, hand: 'open' }, ruffle: scratch.ruffle, eyes: 'down', mouth: 'calm', tilt: 1 }
    : // the shrug: both hands out, palms up, brows raised
      { back: { el: [16, 56], wr: [8, 48], hand: 'open' }, front: { el: [64, 56], wr: [72, 48], hand: 'open' }, eyes: f === 6 ? 'closed' : 'open', mouth: 'calm', brow: 'up' }
  const hands = trainer(s, atHome, pose, 138, 186)
  // question marks, bobbing over his head out of step with each other
  const qx = hands.left - 6
  for (const [dx, dy, phase] of [[0, 0, 0], [14, -8, 4]] as const) {
    const y = hands.top + dy + drift(f + phase, 8, 2)
    const x = qx + dx
    s.rect(x, y, 5, 2, '#ffffff').rect(x + 4, y + 1, 2, 4, '#ffffff').rect(x + 2, y + 4, 3, 2, '#ffffff').rect(x + 2, y + 8, 2, 2, '#ffffff')
  }
  // a third pops up while he shrugs
  if (!scratch) {
    const x = hands.right + 4
    const y = hands.top + 2 - (f - 5) * 2
    s.rect(x, y, 5, 2, '#f8c838').rect(x + 4, y + 1, 2, 4, '#f8c838').rect(x + 2, y + 4, 3, 2, '#f8c838').rect(x + 2, y + 8, 2, 2, '#f8c838')
  }
}

/* ---------------- his desk, late ---------------- */

/**
 * Twelve frames: his wrist comes up, he stares at the watch while the clock's second hand sweeps
 * round and a bead of sweat runs down, looks up in alarm, and the arm drops, to check again.
 */
const CHECK: Array<{ el: Pt; wr: Pt } | null> = [
  { el: [62, 58], wr: [58, 64] },
  { el: [63, 55], wr: [53, 55] },
  { el: [63, 52], wr: [47, 47] },
  { el: [63, 52], wr: [47, 47] },
  { el: [63, 52], wr: [47, 47] },
  { el: [63, 52], wr: [47, 47] },
  { el: [63, 52], wr: [47, 47] },
  { el: [63, 52], wr: [47, 47] },
  { el: [63, 52], wr: [47, 47] },
  { el: [63, 52], wr: [47, 47] },
  { el: [63, 55], wr: [53, 55] },
  null,
]
function deadline(s: Scene, frame: number) {
  const f = frame
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
  const minute = ((56 + (f >= 6 ? 1 : 0)) / 60) * 2 * Math.PI
  const second = (f / 12) * 2 * Math.PI
  s.line(cx, cy, cx - 3, cy - 7, INK).line(cx, cy, cx + Math.round(Math.sin(minute) * 10), cy - Math.round(Math.cos(minute) * 10), INK)
  s.line(cx, cy, cx + Math.round(Math.sin(second) * 11), cy - Math.round(Math.cos(second) * 11), '#e0383e').set(cx, cy, '#e0383e')
  boards(s, 124, '#7a5232', '#6e4a2c', '#4e321c', 3)
  // the desk: laptop open on a document marked DUE in red, books with sticky notes, a mug
  desk(s, 150, 118, 100, 62, { fill: '#8a6440', light: '#a87e56', shade: '#664828' })
  s.poly([[176, 116], [234, 116], [238, 120], [172, 120]], INK).poly([[177, 117], [233, 117], [236, 119], [174, 119]], '#b8bcc8')
  box(s, 180, 80, 50, 37, { fill: '#2a2c36', light: '#44465a', shade: '#1a1c24' }, 1)
  s.rect(183, 83, 44, 31, '#f4f6fa')
  s.rect(186, 86, 38, 5, '#e0383e').rect(188, 87, 12, 3, '#ffffff')
  for (let y = 94; y < 112; y += 3) s.rect(186, y, 18 + ((y * 5) % 20), 1, '#a8acb8')
  // the cursor blinking where the document stops
  if (f % 4 < 2) s.rect(205, 109, 1, 3, INK)
  for (const [y, c] of [[108, '#3a7fe0'], [102, '#4aa242'], [96, '#a02838']] as const) box(s, 154, y, 22, 6, { fill: c, light: '#ffffff', shade: darken(c) }, 1)
  s.rect(170, 94, 5, 4, '#f8e858').rect(158, 100, 5, 4, '#f86ab0')
  box(s, 240, 104, 8, 12, { fill: '#e8e4dc', light: '#ffffff', shade: '#b8b4ac' }, 1)
  s.rect(248, 107, 2, 5, INK)
  // steam curling up off the mug
  for (let i = 0; i < 3; i++) {
    const y = 101 - ((f + i * 4) % 12)
    if (y > 92) s.set(243 + drift(f + i * 3, 6), y, '#d8dce8').set(244 + drift(f + i * 3 + 2, 6), y - 1, '#c8ccd8')
  }
  shadow(s, 102, 186, 14)
  // checking his watch: the wrist turned up in front of his face
  const arm = CHECK[f]
  const looking = arm !== null && f >= 2 && f <= 9
  const pose: PoseFrame = {
    ...(arm ? { front: { ...arm, hand: 'fist' as const } } : {}),
    eyes: looking ? 'down' : 'open',
    mouth: 'calm',
    brow: f >= 7 ? 'up' : undefined,
    tilt: looking ? 2 : 0,
  }
  const hands = trainer(s, atHome, pose, 102, 186)
  // a bead of sweat, running down once it's sunk in how late it is
  if (f >= 5) {
    const sx = hands.left + 4
    const sy = hands.top + 8 + (f - 5) * 2
    s.poly([[sx, sy], [sx - 2, sy + 4], [sx + 2, sy + 4]], INK).ellipse(sx, sy + 5, 3, 3, INK)
    s.poly([[sx, sy + 1], [sx - 1, sy + 4], [sx + 1, sy + 4]], '#a8d8f8').ellipse(sx, sy + 5, 2, 2, '#a8d8f8').set(sx - 1, sy + 4, '#ffffff')
  }
  // shock lines round his head as it sinks in
  if (f >= 7 && f <= 10) {
    const cx = (hands.left + hands.right) / 2
    const top = hands.top - 3 - (f === 7 ? 0 : 1)
    s.line(cx - 22, top + 4, cx - 18, top + 8, '#ffffff').line(cx - 16, top - 4, cx - 13, top + 1, '#ffffff')
    s.line(cx, top - 9, cx, top - 4, '#ffffff')
    s.line(cx + 22, top + 4, cx + 18, top + 8, '#ffffff').line(cx + 16, top - 4, cx + 13, top + 1, '#ffffff')
  }
}

/* ---------------- his gaming setup, mid-match ---------------- */

/** RGB: the strip, fans and keys run through these a step a frame. */
const RGB = ['#ff4a6e', '#ff8a3a', '#f8d838', '#4ae08a', '#3ad8f0', '#5a7aff', '#b05aff', '#ff4ad0']
const rgb = (i: number) => RGB[((i % RGB.length) + RGB.length) % RGB.length]

/**
 * The monitor's picture: a generic tactical shooter, not any game's own art. A sunlit wall and a
 * doorway, an enemy (outlined red) peeking out of it, the crosshair on them, a muzzle flash and a
 * kill-feed line when the shot lands, and the HUD: a round timer between two scores, health, ammo.
 */
function shooter(s: Scene, x: number, y: number, w: number, h: number, f: number) {
  s.rect(x, y, w, h * 0.45, '#f0b878').rect(x, y + h * 0.3, w, h * 0.15, '#f4c890')
  s.rect(x, y + h * 0.45, w, h * 0.55, '#a8784a')
  // a wall with a doorway, and a crate
  s.rect(x + 6, y + 10, w - 20, h * 0.62, '#e0c8a0').rect(x + 6, y + 10, w - 20, 2, '#f4e4c8')
  s.rect(x + w / 2 - 6, y + 18, 12, h * 0.62 - 8, '#3a2a2a')
  s.rect(x + 10, y + h - 20, 12, 10, '#8a5a30').frame(x + 10, y + h - 20, 12, 10, '#5a3a1a')
  // the enemy, leaning out of the doorway, outlined red
  const peek = [0, 1, 2, 2, 2, 1, 0, 0][f]
  if (f < 5) {
    const ex = x + w / 2 - 3 + peek
    s.rect(ex - 1, y + 21, 7, 4, '#e0383e').rect(ex - 1, y + 25, 7, 10, '#e0383e')
    s.rect(ex, y + 22, 5, 3, '#2a2030').rect(ex, y + 26, 5, 8, '#4a3a5a')
  }
  // the crosshair, tracking onto them, and the shot
  const cx = x + w / 2 + [4, 3, 2, 1, 1, 0, 0, 1][f]
  const cy = y + 28
  for (const [dx, dy, ww, hh] of [[-4, 0, 3, 1], [2, 0, 3, 1], [0, -4, 1, 3], [0, 2, 1, 3]] as const) s.rect(cx + dx, cy + dy, ww, hh, '#40f0d0')
  if (f === 3 || f === 4) s.ellipse(x + w - 14, y + h - 8, 5, 4, '#fff4b0').ellipse(x + w - 14, y + h - 8, 3, 2, '#ffffff')
  // the gun, bottom right
  s.poly([[x + w - 22, y + h], [x + w - 10, y + h - 12], [x + w, y + h - 10], [x + w, y + h]], '#2a2c36').rect(x + w - 16, y + h - 9, 8, 2, '#5a5e6c')
  // HUD: scores either side of the round timer, a kill-feed line, health and ammo
  s.rect(x + w / 2 - 14, y + 1, 9, 5, '#2ad0b0').rect(x + w / 2 + 5, y + 1, 9, 5, '#e0383e').rect(x + w / 2 - 4, y + 1, 8, 5, '#101420')
  s.rect(x + w / 2 - 3, y + 3, 6 - (f >> 1), 1, '#ffffff')
  if (f >= 4) s.rect(x + w - 26, y + 9, 22, 4, 'rgba(16,20,32,1)').rect(x + w - 25, y + 10, 8, 2, '#2ad0b0').rect(x + w - 13, y + 10, 8, 2, '#e0383e')
  s.rect(x + 3, y + h - 6, 18, 3, '#101420').rect(x + 4, y + h - 5, 16, 1, '#f4f6fa')
  for (let i = 0; i < 6 - (f >= 4 ? 1 : 0); i++) s.rect(x + w - 30 + i * 3, y + h - 6, 2, 4, '#f4f6fa')
}

/** Big letters in neon tube: "GG" on the wall, flickering on one frame. */
function neonGG(s: Scene, x: number, y: number, f: number) {
  const c = f === 6 ? '#7a3a6a' : '#ff6ad8'
  const glow = f === 6 ? '#3a2a4a' : '#5a2a6a'
  for (const ox of [0, 16]) {
    const g = (cx: number, col: string, d: number) => {
      s.rect(cx - d, y - d, 12 + d * 2, 2 + d * 2, col).rect(cx - d, y - d, 2 + d * 2, 14 + d * 2, col)
      s.rect(cx - d, y + 12 - d, 12 + d * 2, 2 + d * 2, col).rect(cx + 10 - d, y + 7 - d, 2 + d * 2, 7 + d * 2, col).rect(cx + 6 - d, y + 7 - d, 6 + d * 2, 2 + d * 2, col)
    }
    g(x + ox, glow, 1)
    g(x + ox, c, 0)
  }
}

/**
 * Eight frames: headset on, mid-match, his hand on the mouse clicking away as he lines up the
 * shot, then he turns round, caught, hands up with a guilty grin. The PC's fans and the LED
 * strip cycle through their colours, the neon "GG" buzzes, and his chair is rolled back.
 */
function valorant(s: Scene, f: number) {
  wall(s, 122, '#2a2346', '#1e1834', 5)
  // the LED strip along the ceiling, colours running along it
  for (let x = 0; x < 256; x += 4) s.rect(x, 4, 4, 2, rgb((x >> 3) + f)).rect(x, 6, 4, 2, '#1e1834')
  s.dither(0, 8, 256, 6, rgb(f + 3), f)
  neonGG(s, 20, 30, f)
  poster(s, 66, 24, 30, 40, '#14182c', (x, y, w) => {
    s.ellipse(x + w / 2, y + 16, 9, 9, '#e0383e').ellipse(x + w / 2, y + 16, 7, 7, '#14182c')
    s.rect(x + w / 2 - 1, y + 5, 2, 22, '#e0383e').rect(x + 5, y + 15, w - 10, 2, '#e0383e')
    s.rect(x + 5, y + 31, w - 10, 3, '#f4f0e8')
  })
  boards(s, 122, '#4a3a52', '#42344a', '#2a2034', 3)
  // the desk: black top, an RGB glow underneath
  s.rect(116, 124, 138, 8, rgb(f + 5)).dither(116, 124, 138, 8, '#1e1834', 0)
  desk(s, 118, 114, 136, 64, { fill: '#24242e', light: '#3a3a48', shade: '#16161e' }, false)
  monitor(s, 132, 46, 92, 58, (x, y, w, h) => shooter(s, x, y, w, h, f), '#1e1e26')
  // the PC: a glass side, three fans cycling through the colours
  box(s, 228, 62, 24, 52, { fill: '#1a1a22', light: '#34343e', shade: '#101016' }, 1)
  s.rect(231, 65, 18, 46, '#0c0c12')
  for (let i = 0; i < 3; i++) {
    const c = rgb(f + i * 2)
    s.ellipse(240, 72 + i * 14, 6, 6, c).ellipse(240, 72 + i * 14, 4, 4, '#0c0c12').rect(239, 68 + i * 14 + ((f + i) % 2) * 2, 2, 5, c)
  }
  // keyboard with a wave of RGB across its keys, mousepad and mouse
  box(s, 160, 108, 46, 7, { fill: '#18181e', light: '#2a2a34', shade: '#0c0c10' }, 1)
  for (let k = 0; k < 10; k++) s.rect(162 + k * 4, 110, 3, 2, rgb(k + f)).rect(162 + k * 4, 113, 3, 1, rgb(k + f + 1))
  s.rect(124, 110, 30, 5, '#2a1e3a').rect(124, 110, 30, 1, rgb(f))
  const click = f < 4 && f % 2 === 1
  box(s, 136, 107 + (click ? 1 : 0), 7, 6, { fill: '#2a2a34', light: '#4a4a5a', shade: '#18181e' }, 1)
  s.set(139, 108 + (click ? 1 : 0), rgb(f + 2))
  // his chair, rolled back from the desk when he jumped up
  box(s, 14, 70, 30, 56, { fill: '#2a2a34', light: '#3e3e4c', shade: '#1a1a22' }, 2)
  s.rect(20, 76, 4, 44, '#e0383e').rect(34, 76, 4, 44, '#e0383e')
  box(s, 10, 124, 38, 10, { fill: '#2a2a34', light: '#3e3e4c', shade: '#1a1a22' }, 1)
  s.rect(27, 134, 4, 30, '#18181e').rect(12, 162, 34, 3, '#18181e')
  for (const wx of [12, 28, 44]) s.ellipse(wx, 168, 3, 3, INK).ellipse(wx, 168, 2, 2, '#3a3a46')
  shadow(s, 100, 186, 14)
  // in the match (clicking, eyes on the screen), then caught: hands up, a guilty grin
  const caught = f >= 4
  const pose: PoseFrame = caught
    ? { back: { el: [16, 48], wr: [12, 34], hand: 'open' }, front: { el: [64, 48], wr: [68, 34], hand: 'open' }, mouth: 'grin', brow: 'up', eyes: f === 7 ? 'closed' : 'open' }
    : { front: { el: [64, 52], wr: [74, 56 + (click ? 1 : 0)], hand: 'fist' }, eyes: 'down', mouth: 'calm', tilt: 1 }
  const hands = trainer(s, atHome, pose, 100, 186)
  // the headset (white, so it reads on his hair and the dark wall): a band arching over the top
  // of his head, cups against his ears with an RGB stripe, and the mic swung down by his mouth
  const hx = Math.round((hands.left + hands.right) / 2)
  const ht = hands.top + (caught ? 0 : 1)
  const band: Array<[number, number, number, number]> = [
    [hx - 8, ht - 3, 16, 2],
    [hx - 12, ht - 2, 5, 2],
    [hx + 7, ht - 2, 5, 2],
    [hx - 15, ht, 4, 3],
    [hx + 11, ht, 4, 3],
    [hx - 17, ht + 2, 3, 12],
    [hx + 14, ht + 2, 3, 12],
  ]
  for (const [x, y, w, h] of band) s.rect(x - 1, y - 1, w + 2, h + 2, INK)
  for (const [x, y, w, h] of band) s.rect(x, y, w, h, '#e8e8f0')
  for (const side of [-1, 1]) {
    const cx = side < 0 ? hx - 21 : hx + 14
    s.rect(cx - 1, ht + 11, 9, 13, INK).rect(cx, ht + 12, 7, 11, '#e8e8f0').rect(cx + (side < 0 ? 0 : 5), ht + 13, 2, 9, '#b8bccc')
    s.rect(cx + (side < 0 ? 1 : 4), ht + 14, 2, 7, rgb(f + 4))
  }
  s.line(hx - 15, ht + 23, hx - 7, ht + 30, INK).line(hx - 14, ht + 23, hx - 7, ht + 29, '#b8bccc').rect(hx - 8, ht + 29, 3, 2, INK)
  // caught: the "!" pops up, and a bead of sweat
  if (caught) {
    const bx = hands.right + 8
    const by = hands.top - 8 + [-3, 0, 0, -1][f - 4]
    s.ellipse(bx + 6, by + 7, 9, 9, INK).ellipse(bx + 6, by + 7, 8, 8, '#ffffff').poly([[bx, by + 12], [bx - 4, by + 18], [bx + 4, by + 14]], '#ffffff')
    s.rect(bx + 5, by + 2, 3, 7, '#e0383e').rect(bx + 5, by + 11, 3, 2, '#e0383e')
    const sx = hx + 11
    const sy = hands.top + 7 + (f - 4)
    s.poly([[sx, sy], [sx - 2, sy + 4], [sx + 2, sy + 4]], INK).ellipse(sx, sy + 5, 3, 3, INK)
    s.poly([[sx, sy + 1], [sx - 1, sy + 4], [sx + 1, sy + 4]], '#a8d8f8').ellipse(sx, sy + 5, 2, 2, '#a8d8f8').set(sx - 1, sy + 4, '#ffffff')
  }
}

export const ENCOUNTER_ART: Record<EncounterScene, EncounterArt> = {
  wild: { alt: 'Aaryan standing in the tall grass of a route, waving and grinning, an exclamation mark popping up over his head: a wild encounter.', frames: 8, ms: 150, rest: 2, draw: wild },
  charger: {
    alt: 'Aaryan in his bedroom at night scratching his head, then shrugging, the bed turned over and his phone flashing a red battery, the charger lead poking out from under the bed.',
    frames: 8,
    ms: 170,
    rest: 0,
    draw: charger,
  },
  deadline: { alt: 'Aaryan at his desk late at night raising his wrist to check his watch, sweating, a document marked due on the laptop and the clock nearly at midnight.', frames: 12, ms: 180, rest: 6, draw: deadline },
  valorant: {
    alt: 'Aaryan in a headset at his gaming PC late at night, mid-match in a shooter on the big monitor, then turning round caught, hands up with a guilty grin, the RGB lights cycling.',
    frames: 8,
    ms: 170,
    rest: 5,
    draw: valorant,
  },
  fled: { alt: 'The tall grass where Aaryan stood, now empty, a puff of dust and a flattened trail where he ran off, and him tiny in the distance running up the path.', frames: 8, ms: 150, rest: 2, draw: fled },
}

/** What he might be caught doing: each encounter shows one of these, between appearing and fleeing. */
export const VIGNETTES = ['charger', 'deadline', 'valorant'] as const
export type Vignette = (typeof VIGNETTES)[number]

/** An encounter's three scenes, one per line: he appears, the vignette, he flees. */
export const encounterScenes = (v: Vignette): readonly EncounterScene[] => ['wild', v, 'fled']

/** Every scene, for previews and tests. */
export const ENCOUNTER_SCENES: readonly EncounterScene[] = ['wild', ...VIGNETTES, 'fled']

/** One frame of an encounter scene. */
export function paintEncounter(id: EncounterScene, frame = 0): Scene {
  const s = new Scene()
  ENCOUNTER_ART[id].draw(s, frame % ENCOUNTER_ART[id].frames)
  return s
}
