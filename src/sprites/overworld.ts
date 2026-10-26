/**
 * Overworld ("walking") sprites in the Black/White style, generated from any Appearance (same
 * palette keys as character.ts).
 *
 * Built to Gen V's compact overworld proportions, measured from Pokémon Black footage
 * (docs/GEN5-SPRITES.md): about 24 world px tall (1½ tiles) and 14–15 wide, the head and hair
 * about half the height and sitting straight on the shoulders, a short torso, stub arms with small
 * hands, short legs and solid shoes; the face is two tall eyes with a glint. A 1-world-px dark
 * outline (2 art px), with thinner lines where arms cross the body.
 *
 * The art is 48×64, twice the size it's shown at in the world (OW_WORLD = 0.5).
 * Directions: down / up / left / right; frames: stand, step A, step B. The two profiles share
 * their drawing but each shows its own side's details (the jersey's flames, a watch or bracelets).
 */
import { Grid, flipX, type Raster } from './raster.ts'
import type { Pixels } from './pixels.ts'
import { capsule, oval, type Appearance, type Pt } from './character.ts'

export type Facing = 'down' | 'up' | 'left' | 'right'
export const OW_W = 48
export const OW_H = 64
/** World pixels per art pixel. */
export const OW_WORLD = 0.5
type Step = 0 | 1 | 2
/** Which of the wearer's sides a profile shows (left-facing shows their left side). */
type Side = 'left' | 'right'

const TEES = new Set<Appearance['top']>(['tee', 'splash', 'jersey'])
const BLAZERS = new Set<Appearance['top']>(['blazer', 'suit', 'school'])
const bareLegs = (a: Appearance) => a.bottom === 'shorts' || a.bottom === 'skirt'
const has = (a: Appearance, x: Appearance['accessories'][number]) => a.accessories.includes(x)

/* ---------------- shared pieces ---------------- */

/** Body proportions shared by every view (art pixels), so the build never changes between directions. */
const SHOULDER_Y = 36 // the head sits straight on the shoulders: no neck, as in BW
const HEM_Y = 46
const HIP_Y = 46.5
const ANKLE_Y = 54.5
const FOOT_Y = 56.8

/**
 * The head is designed in its own space (the same hair, hat and face shapes for every view) and
 * rasterised into the sprite at Gen V proportions: wide and tall, its top about half the
 * character's height above the shoulders. This maps that space onto the sprite: x about the head's
 * centre line, y downward from the top of the head. Shapes are re-rasterised at the new size, not
 * scaled after drawing, so every outline stays one clean pixel.
 */
const HEAD_SX = 1.14
const HEAD_SY = 1.06
const HEAD_TOP = 13
/** Design-space head centre (for shapes written against it). */
const HEAD_Y = 13.5
/**
 * Where a head-space point lands in the sprite, for the face's pixel-sized marks (eyes, frames,
 * nose, earrings): they're placed on the head, so they follow its proportions, but drawn as fixed
 * little stamps so they stay crisp.
 */
const headX = (cx: number, x: number) => Math.round(cx + (x - cx) * HEAD_SX)
const headY = (y: number) => Math.round(HEAD_TOP + y * HEAD_SY)
/** The eyes in head space: either side of the centre line (front), toward the face (profile), and their top row. */
const EYE_DX = 3.7879
const EYE_PROFILE_DX = -5.1
const EYE_Y = 11.6
/** Where hats sit, in head space: hair above this row is clipped under a hat. */
const BRIM: Partial<Record<Appearance['hat'], number>> = { cap: 9, beanie: 9, bucket: 8 }

class HeadSpace implements Raster {
  readonly w = OW_W
  readonly h = OW_H
  private readonly g: Grid
  private readonly cx: number
  constructor(g: Grid, cx: number) {
    this.g = g
    this.cx = cx
  }
  private mx(x: number) {
    return this.cx + (x - this.cx) * HEAD_SX
  }
  private my(y: number) {
    return HEAD_TOP + y * HEAD_SY
  }
  private ix(x: number) {
    return this.cx + (x - this.cx) / HEAD_SX
  }
  private iy(y: number) {
    return (y - HEAD_TOP) / HEAD_SY
  }
  set(x: number, y: number, ch: string) {
    this.g.set(Math.round(this.mx(x)), Math.round(this.my(y)), ch)
    return this
  }
  get(x: number, y: number) {
    return this.g.get(Math.round(this.mx(x)), Math.round(this.my(y)))
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, ch: string, shade?: string, light?: string) {
    this.g.ellipse(this.mx(cx), this.my(cy), rx * HEAD_SX, ry * HEAD_SY, ch, shade, light)
    return this
  }
  rect(x0: number, y0: number, x1: number, y1: number, ch: string) {
    this.g.rect(Math.round(this.mx(x0)), Math.round(this.my(y0)), Math.round(this.mx(x1)), Math.round(this.my(y1)), ch)
    return this
  }
  poly(points: Array<[number, number]>, ch: string) {
    this.g.poly(points.map(([x, y]) => [this.mx(x), this.my(y)]), ch)
    return this
  }
  line(x0: number, y0: number, x1: number, y1: number, ch: string, thick = 1) {
    this.g.line(this.mx(x0), this.my(y0), this.mx(x1), this.my(y1), ch, thick)
    return this
  }
  stamp(x: number, y: number, rows: string[]) {
    this.g.stamp(Math.round(this.mx(x)), Math.round(this.my(y)), rows)
    return this
  }
  fine(x: number, y: number, lo: string[]) {
    return this.stamp(x, y, lo)
  }
  sample(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number) => string | null) {
    this.g.sample(this.mx(x0), this.my(y0), this.mx(x1), this.my(y1), (px, py) => fn(this.ix(px), this.iy(py)))
    return this
  }
  outline() {
    return this
  }
  toPixels() {
    return this.g.toPixels()
  }
}

const lerp = (p: Pt, q: Pt, k: number): Pt => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]

/**
 * Lay an arm layer over the body. The arm carries its own thin (one art pixel) outline, so where
 * it crosses the torso it reads as a separate limb; the body's final outline then thickens only
 * the outer silhouette, the BW way (heavy outer line, lighter inner lines).
 */
function stampOver(g: Grid, layer: Grid) {
  layer.toPixels().forEach((r, y) => [...r].forEach((c, x) => c !== '.' && g.set(x, y, c)))
}

/** Clip any hair that would poke out above a hat's brim (`extra` rows lower, in head space). */
function clipHair(g: Grid, a: Appearance, extra = 0) {
  const brim = BRIM[a.hat]
  if (brim === undefined) return
  const y1 = Math.round(HEAD_TOP + (brim + extra) * HEAD_SY)
  for (let y = 0; y < y1; y++) for (let x = 0; x < OW_W; x++) if ('Hjh'.includes(g.get(x, y))) g.set(x, y, '.')
}

function hat(g: Raster, a: Appearance, cx: number, facing: 'down' | 'up' | 'left') {
  switch (a.hat) {
    case 'cap':
      oval(g, cx, 6.5, 9.4, 5.6, 'Y', 'y')
      if (facing === 'down') g.poly([[cx - 8.5, 9.5], [cx + 8.5, 9.5], [cx + 8, 12], [cx - 8, 12]], 'y')
      if (facing === 'left') g.poly([[cx - 3, 9], [cx - 13, 10.5], [cx - 12.5, 12.5], [cx - 3, 11.5]], 'y')
      break
    case 'beanie':
      oval(g, cx, 6.5, 9.6, 6.2, 'Y', 'y')
      g.rect(cx - 9.5, 8.5, cx + 9.5, 11.5, 'y')
      for (let x = cx - 8; x < cx + 9; x += 3) g.line(x, 8.5, x, 11.5, 'Y')
      break
    case 'bucket':
      g.poly([[cx - 6, 0.5], [cx + 6, 0.5], [cx + 7.5, 8], [cx - 7.5, 8]], 'Y')
      g.poly([[cx + 3, 0.5], [cx + 6, 0.5], [cx + 7.5, 8], [cx + 4.5, 8]], 'y')
      oval(g, cx, 9.5, 11, 2.4, 'y')
      break
    case 'headband':
      g.rect(cx - 9, 8.5, cx + 9, 9.8, 'Y')
      break
  }
}

/**
 * A stub arm, as on BW walkers: short, a rounded shoulder, a slight taper and a small hand; a
 * short sleeve with a squared hem for tees (and the kit's stripes down the jersey's sleeve).
 */
function owArm(g: Grid, a: Appearance, sh: Pt, el: Pt, wr: Pt, handAt: Pt) {
  const skinArm = TEES.has(a.top) || a.top === 'tank'
  const c = skinArm ? 'S' : 'A'
  const d = skinArm ? 's' : 'a'
  oval(g, sh[0], sh[1], 2.6, 2.5, c, d)
  capsule(g, sh, el, 2.5, 2.2, c, d)
  capsule(g, el, wr, 2.2, 1.9, c, d)
  if (TEES.has(a.top)) capsule(g, sh, lerp(sh, el, 0.65), 2.9, 2.7, 'A', 'a', 'Q', true)
  if (a.top === 'jersey') {
    const e = lerp(sh, el, 0.6)
    const out = sh[0] < 24 ? -1 : sh[0] > 24 ? 1 : 0
    for (const o of out ? [0.4, 1.6] : [-0.6, 0.6]) g.line(sh[0] + (out ? out * o : o), sh[1] - 1.5, e[0] + (out ? out * o : o), e[1], 'R')
  }
  if (BLAZERS.has(a.top)) g.line(wr[0] - 1.4, wr[1], wr[0] + 1.4, wr[1], a.top === 'suit' ? 'V' : 'G')
  oval(g, handAt[0], handAt[1], 2, 2.1, 'S', 's')
}

/** Legs and shoes, front and back views: short and slightly apart, one lifts with each step. */
function legsFrontBack(g: Grid, a: Appearance, step: Step, cx: number) {
  const lift = (left: boolean) => (step === 1 && left) || (step === 2 && !left)
  for (const left of [true, false]) {
    const x = left ? cx - 3.2 : cx + 3.2
    const up = lift(left) ? 1.5 : 0
    if (bareLegs(a)) {
      capsule(g, [x, HIP_Y], [x, 49.5], 3.1, 2.9, 'B', 'b')
      capsule(g, [x, 50], [x, ANKLE_Y - up], 2.3, 2.1, 'S', 's')
    } else capsule(g, [x, HIP_Y], [x, ANKLE_Y - up], 3.1, 2.8, 'B', 'b', 'P')
    oval(g, x + (left ? -0.4 : 0.4), FOOT_Y - up, 3.4, 2.1, 'F', 'f', 'e')
    if (a.shoes === 'sneakers') g.rect(Math.floor(x - 3.2), 58.5 - up, Math.ceil(x + 2.8), 58.5 - up, 'G')
  }
  if (a.bottom === 'skirt') g.poly([[cx - 7.5, 44], [cx + 7.5, 44], [cx + 9.5, 50], [cx - 9.5, 50]], 'B')
  g.poly([[cx - 7.5, 44.5], [cx + 7.5, 44.5], [cx + 7.8, 48], [cx - 7.8, 48]], 'B')
}

/** The torso for the front and back views: compact, about as wide as the head. */
function torsoFrontBack(g: Grid, a: Appearance, cx: number) {
  const hem = BLAZERS.has(a.top) ? 47.5 : HEM_Y
  g.poly([[cx - 6.5, SHOULDER_Y], [cx + 6.5, SHOULDER_Y], [cx + 8.5, SHOULDER_Y + 2], [cx + 8, hem], [cx - 8, hem], [cx - 8.5, SHOULDER_Y + 2]], 'A')
  g.poly([[cx + 4, SHOULDER_Y], [cx + 6.5, SHOULDER_Y], [cx + 8.5, SHOULDER_Y + 2], [cx + 8, hem], [cx + 4.5, hem]], 'a')
  return hem
}

/** Torso and arms for the front and back views: compact, about as wide as the head. */
function bodyFrontBack(g: Grid, a: Appearance, step: Step, back: boolean) {
  const cx = 24
  legsFrontBack(g, a, step, cx)
  const hem = torsoFrontBack(g, a, cx)
  if (!back) {
    switch (a.top) {
      case 'jersey':
        // the Japan × Y-3 away kit, simplified to what survives at this size: dark red side
        // panels, a few flame strokes up the wearer's right side, the crest and the number
        g.rect(cx - 8, 39, cx - 7, hem, 'r').rect(cx + 7, 39, cx + 8, hem, 'r')
        g.line(cx - 6, hem, cx - 5, 40, 'R').line(cx - 4, hem, cx - 3.5, 42, 'q')
        g.stamp(cx - 1, 37, ['KK', 'KR'])
        g.stamp(cx - 1, 40, ['KK', '.K', '.K'])
        break
      case 'tee':
        g.rect(cx - 2, 38.5, cx + 1, 40.5, 'R').set(cx - 1, 39, 'D').set(cx, 39, 'D')
        break
      case 'splash':
        for (const [x, y, c] of [[cx - 5, 38, 'N'], [cx + 2, 37, 'J'], [cx - 2, 41, 'I'], [cx + 4, 43, 'C'], [cx - 6, 44, 'J']] as const) g.rect(x, y, x + 1, y + 1, c)
        break
      case 'hoodie':
        g.rect(cx - 4.5, 42, cx + 4.5, 45, 'a').set(cx - 2, 36.5, 'G').set(cx - 2, 37.5, 'G').set(cx + 2, 36.5, 'G').set(cx + 2, 37.5, 'G')
        break
      case 'jacket':
        g.poly([[cx - 2.5, SHOULDER_Y], [cx + 2.5, SHOULDER_Y], [cx, 39.5]], 'G')
        break
      case 'shirt':
        g.poly([[cx - 2.5, SHOULDER_Y], [cx + 2.5, SHOULDER_Y], [cx, 38]], 'Q').rect(cx - 0.5, 36.5, cx + 0.5, 44, 'R')
        break
      case 'blazer':
      case 'suit':
      case 'school':
        g.poly([[cx - 3.5, SHOULDER_Y], [cx + 3.5, SHOULDER_Y], [cx, 42]], a.top === 'suit' ? 'V' : 'G')
        g.rect(cx - 0.5, 36.5, cx + 0.5, 41.5, 'R')
        break
      case 'tank':
        g.rect(cx - 7, SHOULDER_Y, cx - 5, 37.5, 'S').rect(cx + 5, SHOULDER_Y, cx + 7, 37.5, 'S')
        break
    }
    if (has(a, 'scarf')) capsule(g, [cx - 5, 36.5], [cx + 5, 36.5], 1.8, 1.8, 'R', 'r')
    if (has(a, 'bag')) g.rect(cx + 6, 41, cx + 10, 46, 'Z').rect(cx + 9, 41, cx + 10, 46, 'z')
  }

  // stub arms hang at the sides, swinging a little with the step
  const swing = step === 0 ? 0 : step === 1 ? 1 : -1
  const arms = new Grid(OW_W, OW_H)
  for (const side of [-1, 1]) {
    const d = side === -1 ? swing : -swing
    const sh: Pt = [cx + side * 8.2, SHOULDER_Y + 2.5]
    const el: Pt = [cx + side * 9.6, 42 + d * 0.3]
    const wr: Pt = [cx + side * 9.4, 44.5 + d * 0.6]
    owArm(arms, a, sh, el, wr, [wr[0], wr[1] + 1.6])
  }
  arms.outline()
  if (TEES.has(a.top))
    for (const side of [-1, 1]) arms.line(cx + side * 7.6, 40, cx + side * 11, 40, a.top === 'jersey' ? 'c' : 'a')
  stampOver(g, arms)
}

function bodyDetails(g: Grid, a: Appearance, back: boolean) {
  const cx = 24
  if (back) {
    if (a.top === 'jersey') {
      g.stamp(cx - 2, 38, ['KKKK', '...K', '..K.', '..K.'])
      g.rect(cx - 8, 39, cx - 7, HEM_Y, 'r').rect(cx + 7, 39, cx + 8, HEM_Y, 'r')
      g.line(cx + 2, HEM_Y, cx + 5, 40, 'R').line(cx + 4, HEM_Y, cx + 6, 42, 'q')
    }
    if (has(a, 'bag')) g.line(cx + 8, 36.5, cx - 7, 44, 'Z')
    return
  }
  if (a.top === 'school') g.line(cx - 3.5, SHOULDER_Y, cx, 42, 'U').line(cx + 3.5, SHOULDER_Y, cx, 42, 'U').line(cx - 8, 46.5, cx + 8, 46.5, 'U')
  if (a.top === 'blazer' || a.top === 'suit') g.line(cx - 3.5, SHOULDER_Y, cx, 42, 'K').line(cx + 3.5, SHOULDER_Y, cx, 42, 'K')
  if (a.top === 'jacket') g.line(cx, 39.5, cx, 45, 'K')
  if (has(a, 'chain')) g.set(cx - 3, 36.5, 'X').set(cx - 2, 37.5, 'X').set(cx, 38, 'X').set(cx + 2, 37.5, 'X').set(cx + 3, 36.5, 'X')
  if (has(a, 'bag')) g.line(cx - 7, 36.5, cx + 7, 44, 'Z')
  if (has(a, 'headphones')) g.rect(cx - 5, 35.5, cx + 5, 35.5, 'Z').rect(cx - 6, 35.5, cx - 4, 37, 'Z').rect(cx + 4, 35.5, cx + 6, 37, 'Z')
  // the watch and bracelets on the wearer's own wrists (watch left, bracelets right)
  if (has(a, 'watch')) g.rect(cx + 8, 45, cx + 11, 45, 'Z')
  if (has(a, 'bracelet')) g.rect(cx - 11, 45, cx - 8, 45, 'X')
  if (has(a, 'beltchain')) g.set(cx + 5, 46.5, 'X').set(cx + 6, 47.5, 'X').set(cx + 7, 46.5, 'X')
  // the Champion pin: a gold dot with a glint, over the heart
  if (a.badge === 'champion') g.stamp(cx + 3, 39, ['DW', 'DD'])
}

/** Shoulder-blade-length and bigger styles need a little more volume around the head. */
const bigHair = (a: Appearance) => a.hair === 'wavy' || a.hair === 'mullet' || a.hair === 'curly' || a.hair === 'curtains'

/* ---------------- facing down ---------------- */

function down(a: Appearance, step: Step): Pixels {
  const g = new Grid(OW_W, OW_H)
  const cx = 24
  const h = new HeadSpace(g, cx)
  // hair behind the head (and the mullet at the nape)
  const big = bigHair(a)
  oval(h, cx, 11.5, big ? 9.6 : 9, big ? 9.8 : 9.2, a.hair === 'buzz' ? 'j' : 'H', 'j')
  if (a.hair === 'long') h.poly([[cx - 9.5, 12], [cx + 9.5, 12], [cx + 10, 28], [cx - 10, 28]], 'H')
  if (a.hair === 'mullet') h.poly([[cx - 7, 16], [cx + 7, 16], [cx + 7.5, 24], [cx - 7.5, 24]], 'H')
  if (a.hair === 'bun') oval(h, cx, 1.8, 3.5, 2.6, 'H', 'j', 'h')
  clipHair(g, a)
  bodyFrontBack(g, a, step, false)
  // a big round face, ears level with the eyes, shaded down its right side
  // ears tucked against the face (not sticking out past the hair)
  oval(h, cx - 7.8, HEAD_Y + 0.5, 1.2, 1.9, 'S', 's')
  oval(h, cx + 7.8, HEAD_Y + 0.5, 1.2, 1.9, 's')
  oval(h, cx, HEAD_Y, 7.8, 8.6, 'S', undefined, 'T')
  const shadeX = headX(cx, cx + 4.545)
  const edgeX = headX(cx, cx + 8.333)
  for (let y = 16; y < 38; y++) for (let x = shadeX; x <= edgeX; x++) if (g.get(x, y) === 'S') g.set(x, y, 's')
  fringeFront(h, a, cx)
  clipHair(g, a, 1)
  hat(h, a, cx, 'down')
  g.outline().thicken()
  // the BW face: two tall eyes with a glint (no brows, nose or mouth at this size)
  const eL = headX(cx, cx - EYE_DX) - 1
  const eR = headX(cx, cx + EYE_DX) - 1
  const eT = headY(EYE_Y)
  if (has(a, 'sunglasses')) {
    g.rect(eL - 2, eT, eL + 4, eT + 3, 'K').rect(eR - 2, eT, eR + 4, eT + 3, 'K').rect(eL + 4, eT, eR - 2, eT, 'K')
    g.set(eL - 1, eT, 'l').set(eR - 1, eT, 'l')
  } else {
    g.stamp(eL, eT, ['WK', 'KK', 'KK', 'KK']).stamp(eR, eT, ['KW', 'KK', 'KK', 'KK'])
    if (has(a, 'glasses')) {
      // bold frames survive at this size; the eyes sit inside them
      for (const x0 of [eL - 2, eR - 2]) g.rect(x0, eT - 1, x0 + 6, eT - 1, 'K').rect(x0, eT + 4, x0 + 6, eT + 4, 'K').rect(x0, eT, x0, eT + 3, 'K').rect(x0 + 6, eT, x0 + 6, eT + 3, 'K')
      g.rect(eL + 4, eT, eR - 2, eT, 'K')
    }
  }
  if (has(a, 'earring')) g.set(headX(cx, cx - 8.333), headY(16.07), 'X').set(headX(cx, cx + 8.333), headY(16.07), 'X')
  bodyDetails(g, a, false)
  return step === 0 ? g.toPixels() : shiftDown(g.toPixels(), 1)
}

function fringeFront(g: Raster, a: Appearance, cx: number) {
  const hairC = a.hair === 'buzz' ? 'j' : 'H'
  oval(g, cx, 7.5, a.hair === 'buzz' ? 8.4 : bigHair(a) ? 9.4 : 9, a.hair === 'buzz' ? 4.6 : 5.2, hairC, 'j', a.hair === 'buzz' ? undefined : 'h')
  switch (a.hair) {
    case 'wavy':
    case 'mullet':
      g.poly([[cx - 8.6, 7.5], [cx + 8.6, 7.5], [cx + 7.4, 12], [cx + 4, 10.5], [cx + 0.6, 12.5], [cx - 2.6, 10.5], [cx - 6, 12], [cx - 8.6, 11.5]], 'H')
      for (const [x, y, r] of [[cx - 5, 3.6, 2.6], [cx, 2.8, 2.9], [cx + 5, 3.6, 2.6]] as const) oval(g, x, y, r, r, 'H', 'j', 'h')
      g.line(cx + 3, 4.5, cx + 1, 11, 'j').line(cx - 4, 5, cx - 5.5, 10.5, 'j')
      break
    case 'curtains':
      g.poly([[cx, 3.5], [cx - 9.4, 5.5], [cx - 9.8, 17.5], [cx - 7.4, 19], [cx - 6, 11], [cx - 2, 7]], 'H')
      g.poly([[cx, 3.5], [cx + 9.4, 5.5], [cx + 9.8, 17.5], [cx + 7.4, 19], [cx + 6, 11], [cx + 2, 7]], 'j')
      g.line(cx, 3, cx, 6.5, 'K')
      break
    case 'spiky':
      for (const x of [cx - 7, cx - 3, cx + 1, cx + 5]) g.poly([[x - 2.6, 6.5], [x + 2.6, 6.5], [x + (x < cx ? -1.4 : 1.4), -0.5]], 'H')
      g.poly([[cx - 8.6, 7.5], [cx + 8.6, 7.5], [cx + 7.4, 11.5], [cx - 7.4, 11.5]], 'H')
      break
    case 'curly':
      for (let x = cx - 8; x <= cx + 8; x += 3) oval(g, x, 9.5, 2, 2, 'H', 'j', 'h')
      break
    case 'long':
      g.poly([[cx - 8.6, 7.5], [cx + 8.6, 7.5], [cx + 7.4, 11.5], [cx - 7.4, 11.5]], 'H')
      g.rect(cx - 10, 9, cx - 8, 22, 'H').rect(cx + 8, 9, cx + 10, 22, 'j')
      break
    case 'short':
      g.poly([[cx - 8.6, 7.5], [cx + 8.6, 7.5], [cx + 7.4, 11], [cx - 7.4, 11]], 'H')
      break
    case 'bun':
      g.line(cx, 4, cx, 8, 'j')
      break
  }
}

/* ---------------- facing up ---------------- */

function up(a: Appearance, step: Step): Pixels {
  const g = new Grid(OW_W, OW_H)
  const cx = 24
  const h = new HeadSpace(g, cx)
  bodyFrontBack(g, a, step, true)
  backOfHead(g, h, a, cx)
  g.outline().thicken()
  backHairLines(h, a, cx)
  bodyDetails(g, a, true)
  return step === 0 ? g.toPixels() : shiftDown(g.toPixels(), 1)
}

/**
 * The head from behind: ears, the back of the hair (a mullet down the neck, a long fall, a bun),
 * any hat. `turn` (−1 or 1) turns it three-quarters toward that side: only that side's ear shows.
 */
function backOfHead(g: Grid, h: HeadSpace, a: Appearance, cx: number, turn = 0) {
  if (a.top === 'hoodie') oval(g, cx, 36.5, 5.5, 2.2, 'a')
  if (turn <= 0) oval(h, cx - 7.8, HEAD_Y + 0.5, 1.2, 1.9, 'S', 's')
  if (turn >= 0) oval(h, cx + 7.8, HEAD_Y + 0.5, 1.2, 1.9, turn > 0 ? 'S' : 's', turn > 0 ? 's' : undefined)
  const hairC = a.hair === 'buzz' ? 'j' : 'H'
  const big = bigHair(a)
  oval(h, cx, 11.5, big ? 9.6 : 9, big ? 9.8 : 9.2, hairC, 'j', a.hair === 'buzz' ? undefined : 'h')
  if (a.hair === 'mullet') h.poly([[cx - 7.5, 15], [cx + 7.5, 15], [cx + 7.5, 23], [cx + 4, 22], [cx, 24], [cx - 4, 22], [cx - 7.5, 23]], 'H')
  if (a.hair === 'long') h.poly([[cx - 9.5, 12], [cx + 9.5, 12], [cx + 10, 28], [cx - 10, 28]], 'H')
  if (a.hair === 'bun') oval(h, cx, 2.5, 3.5, 2.8, 'H', 'j', 'h')
  if (a.hair === 'curly') for (let x = cx - 8; x <= cx + 8; x += 4) oval(h, x, 3.5, 2, 2, 'H', 'j')
  clipHair(g, a, 1)
  hat(h, a, cx, 'up')
}

/** Strands drawn into the back of the hair after outlining. */
function backHairLines(h: HeadSpace, a: Appearance, cx: number) {
  if (a.hair !== 'buzz') h.line(cx - 4, 5, cx - 3, 15, 'j').line(cx + 3, 5.5, cx + 4, 15, 'j')
}

/* ---------------- in profile ---------------- */

/**
 * The side view, drawn facing left. `side` is which of the wearer's sides faces the viewer: left
 * when they face left, right when this is mirrored to face right, so one-sided details (the
 * jersey's flames, the watch, the bracelets) land on the correct side instead of being mirrored.
 */
function profile(a: Appearance, step: Step, side: Side, ride = false): Pixels {
  const g = new Grid(OW_W, OW_H)
  const cx = 23
  const h = new HeadSpace(g, cx)
  const hip: Pt = [cx + 1, HIP_Y]
  // short legs in stride (or, riding, one leg bent over the mount's back: thigh forward, shin down)
  const legs: Array<[number, number]> = ride ? [] : step === 0 ? [[cx + 0.5, cx]] : step === 1 ? [[cx - 2, cx - 3.5], [cx + 3, cx + 4.5]] : [[cx - 1, cx - 1.5], [cx + 2, cx + 2.5]]
  if (ride) {
    const seat: Pt = [cx + 1, HIP_Y - 0.5]
    const knee: Pt = [cx - 4.5, 47.5]
    const ankle: Pt = [cx - 5, 52.5]
    if (bareLegs(a)) {
      capsule(g, seat, knee, 3.1, 2.9, 'B', 'b')
      capsule(g, knee, ankle, 2.3, 2.1, 'S', 's')
    } else {
      capsule(g, seat, knee, 3.1, 2.9, 'B', 'b', 'P')
      capsule(g, knee, ankle, 2.7, 2.5, 'B', 'b')
    }
    oval(g, ankle[0] - 1, 55, 3.4, 2.1, 'F', 'f', 'e')
  }
  for (const [kx, fx] of legs) {
    if (bareLegs(a)) {
      capsule(g, hip, [kx, 49.5], 3, 2.8, 'B', 'b')
      capsule(g, [kx, 50], [fx, ANKLE_Y], 2.2, 2, 'S', 's')
    } else capsule(g, hip, [fx, ANKLE_Y], 3, 2.7, 'B', 'b', 'P')
    oval(g, fx - 1, FOOT_Y, 3.6, 2.1, 'F', 'f', 'e')
    if (a.shoes === 'sneakers') g.rect(Math.floor(fx - 4.5), 58.5, Math.ceil(fx + 2), 58.5, 'G')
  }
  if (a.bottom === 'skirt') g.poly([[cx - 5, 44], [cx + 6.5, 44], [cx + 8, 50], [cx - 6.5, 50]], 'B')
  g.poly([[cx - 4.5, 44.5], [cx + 6, 44.5], [cx + 6.3, 48], [cx - 4.8, 48]], 'B')
  // torso in profile: compact, the chest a touch forward of the back
  const hem = BLAZERS.has(a.top) ? 47.5 : HEM_Y
  g.poly([[cx - 4.5, SHOULDER_Y], [cx + 4.5, SHOULDER_Y], [cx + 6, 38.5], [cx + 5.5, hem], [cx - 5.5, hem], [cx - 6.5, 40], [cx - 6, 38]], 'A')
  g.poly([[cx + 2, SHOULDER_Y], [cx + 4.5, SHOULDER_Y], [cx + 6, 38.5], [cx + 5.5, hem], [cx + 2.5, hem]], 'a')
  if (a.top === 'jersey') {
    g.rect(cx + 4, 39, cx + 5, hem, 'r')
    // the flames are on the wearer's right side only
    if (side === 'right') g.line(cx - 5, hem, cx - 4, 40, 'R').line(cx - 3, hem, cx - 3.5, 42, 'q')
  }
  if (BLAZERS.has(a.top)) g.poly([[cx - 4.5, SHOULDER_Y], [cx - 1.5, SHOULDER_Y], [cx - 5, 40]], a.top === 'suit' ? 'V' : 'G')
  if (has(a, 'bag')) g.rect(cx + 4.5, 40, cx + 8, 45, 'Z')
  // the head in profile, BW-style: the hair makes most of the silhouette (the crown, the whole back
  // of the head down to the nape, a sideburn in front of the ear) and the face is only its front
  // lower part, the fringe falling forward to just above the one eye
  const hairC = a.hair === 'buzz' ? 'j' : 'H'
  const big = bigHair(a)
  oval(h, cx + 1.5, 11.2, big ? 9.4 : 9, big ? 9.6 : 9.2, hairC, 'j')
  if (a.hair === 'mullet') h.poly([[cx + 1, 15], [cx + 10, 15], [cx + 10, 23], [cx + 6, 22], [cx + 2, 24]], 'H')
  if (a.hair === 'long') h.rect(cx + 1, 11, cx + 10, 27, 'H').rect(cx + 7, 11, cx + 10, 27, 'j')
  if (a.hair === 'bun') oval(h, cx + 8.5, 3, 3, 2.6, 'H', 'j')
  oval(h, cx - 2.6, 14.4, 6.3, 7.1, 'S', undefined, 'T')
  // the back of the head stays hair, down behind the ear to the nape (short hair sits closer)
  h.poly([[cx + 2.8, 6], [cx + 10, 8], [cx + 10.4, 14.5], [cx + 8, a.hair === 'buzz' ? 18 : 19.6], [cx + 3.2, a.hair === 'buzz' ? 17.5 : 19]], hairC)
  // the crown, and the fringe swept forward over the brow
  oval(h, cx + 1.5, 7.6, a.hair === 'buzz' ? 8.6 : 9, a.hair === 'buzz' ? 4.6 : 5.2, hairC, 'j', a.hair === 'buzz' ? undefined : 'h')
  if (a.hair !== 'buzz' && a.hair !== 'bun') h.poly([[cx - 9.6, 7], [cx + 1, 5.6], [cx - 0.5, 10.6], [cx - 3.8, 10.2], [cx - 6.6, 11.6], [cx - 9.8, 11]], 'H')
  if (a.hair === 'curtains') h.poly([[cx - 2.6, 8], [cx + 0.6, 8], [cx + 0.6, 16.5], [cx - 1.6, 16]], 'H')
  if (a.hair === 'spiky') for (const x of [cx - 4, cx + 1.5, cx + 7]) h.poly([[x - 2.6, 6], [x + 2.6, 6], [x + 2, -0.5]], 'H')
  // a sideburn in front of the ear, and the ear halfway back along the head
  if (a.hair !== 'buzz') h.poly([[cx + 0.4, 10], [cx + 2.8, 10], [cx + 2.6, 15.6], [cx + 1, 15.2]], hairC)
  oval(h, cx + 3.8, 14.4, 1.5, 2, 'S', 's')
  clipHair(g, a, 1)
  hat(h, a, cx + 2, 'left')
  // the near arm: a short stub swinging with the step (riding, it reaches forward to hold on)
  const arm = new Grid(OW_W, OW_H)
  const swing = step === 1 ? -2.5 : step === 2 ? 2.5 : 0
  const sh: Pt = [cx + 0.5, SHOULDER_Y + 2.5]
  const el: Pt = ride ? [cx - 2, 41] : [cx + 0.5 + swing * 0.4, 41.5]
  const wr: Pt = ride ? [cx - 5.5, 43] : [cx + 0.5 + swing * 0.8, 44.5]
  owArm(arm, a, sh, el, wr, ride ? [cx - 6.8, 43.5] : [wr[0], wr[1] + 1.6])
  arm.outline()
  if (TEES.has(a.top)) arm.line(cx - 2, 40, cx + 3, 40, a.top === 'jersey' ? 'c' : 'a')
  // watch on the wearer's left wrist, bracelets on the right
  if (!ride && side === 'left' && has(a, 'watch')) arm.rect(wr[0] - 1.4, wr[1], wr[0] + 1.4, wr[1], 'Z')
  if (!ride && side === 'right' && has(a, 'bracelet')) arm.rect(wr[0] - 1.4, wr[1], wr[0] + 1.4, wr[1], 'X')
  stampOver(g, arm)
  g.outline().thicken()
  // a nose bump in the profile line, and one tall eye
  const nose = headX(cx, cx - 9.4)
  const noseY = headY(15.4)
  g.set(nose, noseY, 'S').set(nose, noseY + 1, 's')
  // the ear, with an ink edge round its back (BW draws it as a small C against the hair)
  if (!['beanie', 'bucket'].includes(a.hat)) g.stamp(headX(cx, cx + 3.2), headY(12.9), ['SKK', 'SsK', 'SsK', 'SSK', '.K.'])
  const eye = headX(cx, cx + EYE_PROFILE_DX) - 1
  const eT = headY(EYE_Y)
  const ear = headX(cx, cx + 2.6)
  if (has(a, 'sunglasses')) g.rect(eye - 1, eT, eye + 4, eT + 3, 'K').line(eye + 4, eT, ear, eT, 'K')
  else {
    g.stamp(eye, eT, ['KW', 'KK', 'KK', 'KK'])
    if (has(a, 'glasses')) g.rect(eye - 2, eT - 1, eye + 4, eT - 1, 'K').rect(eye - 2, eT + 4, eye + 4, eT + 4, 'K').rect(eye - 2, eT, eye - 2, eT + 3, 'K').rect(eye + 4, eT, eye + 4, eT + 3, 'K').line(eye + 4, eT, ear, eT, 'K')
  }
  if (has(a, 'earring')) g.set(headX(cx, cx + 3.788), headY(16.96), 'X')
  return g.toPixels()
}

function shiftDown(px: Pixels, n: number): Pixels {
  const blank = '.'.repeat(px[0].length)
  return [...Array.from({ length: n }, () => blank), ...px.slice(0, px.length - n)]
}

export function overworldFor(a: Appearance): Record<Facing, [Pixels, Pixels, Pixels]> {
  const steps = [0, 1, 2] as const
  return {
    down: steps.map((s) => down(a, s)) as [Pixels, Pixels, Pixels],
    up: steps.map((s) => up(a, s)) as [Pixels, Pixels, Pixels],
    left: steps.map((s) => profile(a, s, 'left')) as [Pixels, Pixels, Pixels],
    // drawn showing the wearer's right side, then turned to face right
    right: steps.map((s) => flipX(profile(a, s, 'right'))) as [Pixels, Pixels, Pixels],
  }
}

/**
 * A trainer sitting astride a mount: one leg bent over its back, a hand forward holding on.
 * Facing right isn't the left rider mirrored: it's drawn showing the wearer's right side (the
 * jersey's flames, the bracelets) and then turned, so one-sided details stay on the correct side.
 */
export function riderFor(a: Appearance, facing: 'left' | 'right' = 'left'): Pixels {
  return facing === 'left' ? profile(a, 0, 'left', true) : flipX(profile(a, 0, 'right', true))
}
/** Where the rider's hips are in the riding sprite (art pixels): this point sits on the mount's saddle. */
export const RIDER_HIP: [number, number] = [24, 46]

/**
 * The rider seen from behind, astride a mount flying away: the back of the head and hair, the
 * back of the top (the jersey's number and the flames up the wearer's right side), arms reaching
 * forward to hold on (so only the shoulders and upper arms show past the body: the watch and
 * bracelets are out of sight), and legs either side of the mount's back with the shoes hanging
 * below. Same canvas and hip point as the side riders (RIDER_HIP). From behind the wearer's
 * right is on your right, so it's drawn as itself, never a mirror of anything.
 */
export function riderBackFor(a: Appearance): Pixels {
  const g = new Grid(OW_W, OW_H)
  const cx = 24
  const h = new HeadSpace(g, cx)
  // the arms go first: they reach forward past the body, which then covers the forearms and hands
  const arms = new Grid(OW_W, OW_H)
  for (const side of [-1, 1]) owArm(arms, a, [cx + side * 8.2, SHOULDER_Y + 2.5], [cx + side * 9.8, 42.5], [cx + side * 6, 44.5], [cx + side * 4.5, 45])
  arms.outline()
  if (TEES.has(a.top)) for (const side of [-1, 1]) arms.line(cx + side * 7.6, 40, cx + side * 11, 40, a.top === 'jersey' ? 'c' : 'a')
  stampOver(g, arms)
  // legs astride: thighs out over the mount's back, shins and shoes hanging down its sides
  for (const side of [-1, 1]) {
    const hip: Pt = [cx + side * 3, HIP_Y]
    const knee: Pt = [cx + side * 9, 49]
    const ankle: Pt = [cx + side * 9.5, 54]
    if (bareLegs(a)) {
      capsule(g, hip, knee, 3.1, 2.9, 'B', 'b')
      capsule(g, knee, ankle, 2.3, 2.1, 'S', 's')
    } else {
      capsule(g, hip, knee, 3.1, 2.9, 'B', 'b', 'P')
      capsule(g, knee, ankle, 2.7, 2.5, 'B', 'b')
    }
    // the heel and sole, from behind
    oval(g, ankle[0], 56, 2.6, 2, 'F', 'f', 'e')
  }
  if (a.bottom === 'skirt') g.poly([[cx - 8.5, 44], [cx + 8.5, 44], [cx + 10.5, 49], [cx - 10.5, 49]], 'B')
  g.poly([[cx - 7.5, 44.5], [cx + 7.5, 44.5], [cx + 8, 48.5], [cx - 8, 48.5]], 'B')
  torsoFrontBack(g, a, cx)
  backOfHead(g, h, a, cx)
  g.outline().thicken()
  backHairLines(h, a, cx)
  bodyDetails(g, a, true)
  return g.toPixels()
}

/**
 * The rider three-quarters from behind as the mount turns away, heading up-left (`h` −1) or
 * up-right (1): the head turned toward that side with its ear (and a glasses arm) showing, the
 * near arm reaching forward to hold on, the near leg down the mount's flank (the far one is out of
 * sight beyond it). The back of the top keeps its details where they are: from behind the wearer's
 * right is on your right whichever way they turn, so this is drawn per side, never mirrored.
 * Same canvas and hip point as the other riders.
 */
export function riderQuarterFor(a: Appearance, h: -1 | 1): Pixels {
  const g = new Grid(OW_W, OW_H)
  const cx = 24
  const hc = cx + h * 1.5
  const hs = new HeadSpace(g, hc)
  const arms = new Grid(OW_W, OW_H)
  owArm(arms, a, [cx + h * 8.2, SHOULDER_Y + 2.5], [cx + h * 11, 41.5], [cx + h * 9, 44], [cx + h * 7.5, 44.5])
  arms.outline()
  if (TEES.has(a.top)) arms.line(cx + h * 7.6, 40, cx + h * 11.5, 40, a.top === 'jersey' ? 'c' : 'a')
  stampOver(g, arms)
  const hip: Pt = [cx + h * 3, HIP_Y]
  const knee: Pt = [cx + h * 9.5, 49]
  const ankle: Pt = [cx + h * 10, 54]
  if (bareLegs(a)) {
    capsule(g, hip, knee, 3.1, 2.9, 'B', 'b')
    capsule(g, knee, ankle, 2.3, 2.1, 'S', 's')
  } else {
    capsule(g, hip, knee, 3.1, 2.9, 'B', 'b', 'P')
    capsule(g, knee, ankle, 2.7, 2.5, 'B', 'b')
  }
  oval(g, ankle[0] + h * 0.6, 56, 2.8, 2, 'F', 'f', 'e')
  if (a.bottom === 'skirt') g.poly([[cx - 8.5, 44], [cx + 8.5, 44], [cx + h * 10.5, 49], [cx - h * 6, 49]], 'B')
  g.poly([[cx - 7.5, 44.5], [cx + 7.5, 44.5], [cx + h * 8, 48.5], [cx - h * 6.5, 48.5]], 'B')
  torsoFrontBack(g, a, cx)
  backOfHead(g, hs, a, hc, h)
  g.outline().thicken()
  backHairLines(hs, a, hc)
  bodyDetails(g, a, true)
  // the arm of the glasses, from the near ear forward
  if (has(a, 'glasses') || has(a, 'sunglasses')) g.line(hc + h * 8.333 * HEAD_SX, HEAD_TOP + 10.71 * HEAD_SY, hc + h * 9.848 * HEAD_SX, HEAD_TOP + 11.16 * HEAD_SY, 'K')
  return g.toPixels()
}

/** Walk cycle order: stand, step A, stand, step B. */
export const WALK_CYCLE = [0, 1, 0, 2] as const
/**
 * The walk frame for a step `k` (0–1) of the way across a tile, BW-style: a stride for the first
 * half of the step and the standing frame for the second, the stride alternating feet tile by tile
 * (`step` counts tiles walked). Tied to the step rather than a clock, so a walk always starts on a
 * stride and every tile looks the same, at any speed.
 */
export function strideFrame(k: number, step: number): 0 | 1 | 2 {
  return k < 0.55 ? (step % 2 ? 1 : 2) : 0
}
