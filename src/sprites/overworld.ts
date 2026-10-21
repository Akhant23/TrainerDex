/**
 * Overworld ("walking") sprites in the Black/White style, generated from any Appearance (same
 * palette keys as character.ts).
 *
 * The art is 48×64, twice the size it's shown at in the world (OW_WORLD = 0.5), so the walkers
 * have the same fine detail as the battle sprites. They're built to read as older teens and young
 * adults rather than chibi kids: about 3¼ heads tall, a head narrower than the shoulders, a neck,
 * a torso that tapers to the waist, arms that reach mid-thigh with a bend at the elbow, and longer
 * legs. Three-tone shading and a dark outline, as in BW.
 * Directions: down / up / left (right = left mirrored); frames: stand, step A, step B.
 */
import { Grid, flipX } from './raster.ts'
import type { Pixels } from './pixels.ts'
import { capsule, oval, type Appearance, type Pt } from './character.ts'

export type Facing = 'down' | 'up' | 'left' | 'right'
export const OW_W = 48
export const OW_H = 64
/** World pixels per art pixel. */
export const OW_WORLD = 0.5
type Step = 0 | 1 | 2

const TEES = new Set<Appearance['top']>(['tee', 'splash', 'jersey'])
const BLAZERS = new Set<Appearance['top']>(['blazer', 'suit', 'school'])
const bareLegs = (a: Appearance) => a.bottom === 'shorts' || a.bottom === 'skirt'
const has = (a: Appearance, x: Appearance['accessories'][number]) => a.accessories.includes(x)

/* ---------------- shared pieces ---------------- */

/** Proportions shared by every view (art pixels), so the build never changes between directions. */
const HEAD_Y = 13.5 // centre of the face
const NECK_Y = 21
const SHOULDER_Y = 27
const WAIST_Y = 40
const HIP_Y = 44
const FOOT_Y = 58.5
/** Where hats sit: hair above this row is clipped under a hat. */
const BRIM: Partial<Record<Appearance['hat'], number>> = { cap: 9, beanie: 9, bucket: 8 }

const lerp = (p: Pt, q: Pt, k: number): Pt => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]

/**
 * Lay an arm layer over the body. The arm carries its own thin (one art pixel) outline, so where
 * it crosses the torso it reads as a separate limb; the body's final outline then thickens only
 * the outer silhouette, the BW way (heavy outer line, lighter inner lines).
 */
function stampOver(g: Grid, layer: Grid) {
  layer.toPixels().forEach((r, y) => [...r].forEach((c, x) => c !== '.' && g.set(x, y, c)))
}

/** Clip any hair that would poke out above a hat's brim. */
function clipHair(g: Grid, a: Appearance, extra = 0) {
  const brim = BRIM[a.hat]
  if (brim === undefined) return
  for (let y = 0; y < brim + extra; y++) for (let x = 0; x < OW_W; x++) if ('Hjh'.includes(g.get(x, y))) g.set(x, y, '.')
}

function hat(g: Grid, a: Appearance, cx: number, facing: 'down' | 'up' | 'left') {
  switch (a.hat) {
    case 'cap':
      oval(g, cx, 6.5, 9.4, 5.6, 'Y', 'y')
      if (facing === 'down') g.poly([[cx - 8.5, 9.5], [cx + 8.5, 9.5], [cx + 8, 12], [cx - 8, 12]], 'y')
      if (facing === 'left') g.poly([[cx - 3, 9], [cx - 14, 10.5], [cx - 13.5, 12.5], [cx - 3, 11.5]], 'y')
      break
    case 'beanie':
      oval(g, cx, 6.5, 9.6, 6.2, 'Y', 'y')
      g.rect(cx - 9.5, 8.5, cx + 9.5, 11.5, 'y')
      for (let x = cx - 8; x < cx + 9; x += 3) g.line(x, 8.5, x, 11.5, 'Y')
      break
    case 'bucket':
      g.poly([[cx - 6, 0.5], [cx + 6, 0.5], [cx + 7.5, 8], [cx - 7.5, 8]], 'Y')
      g.poly([[cx + 3, 0.5], [cx + 6, 0.5], [cx + 7.5, 8], [cx + 4.5, 8]], 'y')
      oval(g, cx, 9.5, 12, 2.4, 'y')
      break
    case 'headband':
      g.rect(cx - 9, 8.5, cx + 9, 9.8, 'Y')
      break
  }
}

/**
 * One arm: deltoid, upper arm narrowing to the elbow, forearm slimming to the wrist, a hand, and a
 * short sleeve with a squared hem for tees (the same construction as the battle sprite's arms).
 */
function owArm(g: Grid, a: Appearance, sh: Pt, el: Pt, wr: Pt, handAt: Pt) {
  const short = TEES.has(a.top)
  const up = short || a.top === 'tank' ? 'S' : 'A'
  const low = short || a.top === 'tank' ? 'S' : 'A'
  oval(g, sh[0], sh[1], 2.9, 2.8, up, up === 'A' ? 'a' : 's')
  capsule(g, sh, el, 2.7, 2.3, up, up === 'A' ? 'a' : 's')
  capsule(g, el, wr, 2.3, 1.8, low, low === 'A' ? 'a' : 's')
  if (short) capsule(g, sh, lerp(sh, el, 0.55), 3.1, 2.9, 'A', 'a', 'Q', true)
  if (a.top === 'jersey') {
    // the kit's stripes over the shoulder and down the sleeve
    const e = lerp(sh, el, 0.5)
    const out = sh[0] < 24 ? -1 : sh[0] > 24 ? 1 : 0
    for (const o of out ? [0.6, 2] : [-0.8, 0.8]) g.line(sh[0] + out * o + (out ? 0 : o), sh[1] - 2, e[0] + out * o + (out ? 0 : o), e[1], 'R')
  }
  if (BLAZERS.has(a.top)) g.line(wr[0] - 1.6, wr[1], wr[0] + 1.6, wr[1], a.top === 'suit' ? 'V' : 'G')
  oval(g, handAt[0], handAt[1], 2, 2.3, 'S', 's')
}

/** Torso, arms and legs for the front and back views. */
function bodyFrontBack(g: Grid, a: Appearance, step: Step, back: boolean) {
  const cx = 24
  const lift = (left: boolean) => (step === 1 && left) || (step === 2 && !left)
  // legs + shoes: long enough to be a third of the height, slightly apart
  for (const left of [true, false]) {
    const x = left ? cx - 3.6 : cx + 3.6
    const up = lift(left) ? 1.5 : 0
    if (bareLegs(a)) {
      capsule(g, [x, HIP_Y], [x, 48.5], 3.3, 3.1, 'B', 'b')
      capsule(g, [x, 49], [x, 56 - up], 2.5, 2.2, 'S', 's')
    } else capsule(g, [x, HIP_Y], [x, 56 - up], 3.3, 2.8, 'B', 'b', 'P')
    oval(g, x + (left ? -0.5 : 0.5), FOOT_Y - up, 3.6, 2.2, 'F', 'f', 'e')
    if (a.shoes === 'sneakers') g.rect(Math.floor(x - 3.5), 60 - up, Math.ceil(x + 3), 60 - up, 'G')
  }
  if (a.bottom === 'skirt') g.poly([[cx - 7.5, 41], [cx + 7.5, 41], [cx + 9.5, 49], [cx - 9.5, 49]], 'B')
  g.poly([[cx - 7.5, WAIST_Y], [cx + 7.5, WAIST_Y], [cx + 8, 45], [cx - 8, 45]], 'B')

  // torso: shoulders wider than the head, tapering to the waist
  const hem = BLAZERS.has(a.top) ? 44 : 42.5
  g.poly([[cx - 6, NECK_Y + 3.5], [cx + 6, NECK_Y + 3.5], [cx + 9.5, SHOULDER_Y - 0.5], [cx + 9, 33], [cx + 8, hem], [cx - 8, hem], [cx - 9, 33], [cx - 9.5, SHOULDER_Y - 0.5]], 'A')
  g.poly([[cx + 4, NECK_Y + 3.5], [cx + 6, NECK_Y + 3.5], [cx + 9.5, SHOULDER_Y - 0.5], [cx + 9, 33], [cx + 8, hem], [cx + 4.5, hem]], 'a')
  if (!back) {
    switch (a.top) {
      case 'jersey':
        // the Japan × Y-3 away kit, simplified: dark red side panels, flame wisps up the wearer's
        // right side, the crest and the number (the Y-3 mark is too small to read at this size)
        g.rect(cx - 8, 33, cx - 7, hem, 'r').rect(cx + 7, 33, cx + 8, hem, 'r')
        g.line(cx - 6, hem, cx - 5, 35, 'R').line(cx - 5, 35, cx - 5.5, 31, 'R').line(cx - 4, hem, cx - 3.5, 38, 'q').line(cx - 2.5, hem, cx - 3, 40, 'R')
        g.stamp(cx - 1, 27, ['KK', 'KR', '.K'])
        g.stamp(cx - 1, 32, ['KK', '.K', '.K'])
        break
      case 'tee':
        g.rect(cx - 2, 28.5, cx + 1, 31, 'R').set(cx - 1, 29, 'D').set(cx, 29, 'D')
        break
      case 'splash':
        for (const [x, y, c] of [[cx - 5, 28, 'N'], [cx + 2, 27, 'J'], [cx - 2, 31, 'I'], [cx + 4, 34, 'C'], [cx - 6, 35, 'J']] as const) g.rect(x, y, x + 1, y + 1, c)
        break
      case 'hoodie':
        g.rect(cx - 4.5, 34, cx + 4.5, 38, 'a').set(cx - 2, 25, 'G').set(cx - 2, 26, 'G').set(cx + 2, 25, 'G').set(cx + 2, 26, 'G')
        break
      case 'jacket':
        g.poly([[cx - 2.5, 24.5], [cx + 2.5, 24.5], [cx, 28.5]], 'G')
        break
      case 'shirt':
        g.poly([[cx - 2.5, 24.5], [cx + 2.5, 24.5], [cx, 27]], 'Q').rect(cx - 0.5, 25, cx + 0.5, 34, 'R')
        break
      case 'blazer':
      case 'suit':
      case 'school':
        g.poly([[cx - 3.5, 24.5], [cx + 3.5, 24.5], [cx, 32]], a.top === 'suit' ? 'V' : 'G')
        g.rect(cx - 0.5, 25, cx + 0.5, 31, 'R')
        break
      case 'tank':
        g.rect(cx - 8.5, 24.5, cx - 6, 26.5, 'S').rect(cx + 6, 24.5, cx + 8.5, 26.5, 'S')
        break
    }
    if (has(a, 'scarf')) capsule(g, [cx - 5, 24.5], [cx + 5, 24.5], 1.9, 1.9, 'R', 'r')
    if (has(a, 'bag')) g.rect(cx + 6, 37, cx + 10, 42, 'Z').rect(cx + 9, 37, cx + 10, 42, 'z')
  }
  // neck, drawn over the collar so the head sits on it rather than on the shoulders
  g.rect(cx - 2.5, NECK_Y, cx + 2, NECK_Y + 3.5, 'S').rect(cx + 1, NECK_Y, cx + 2, NECK_Y + 3.5, 's')

  // arms hang from the shoulders, close to the body with a slight bend, swinging with the step
  const swing = step === 0 ? 0 : step === 1 ? 1.2 : -1.2
  const arms = new Grid(OW_W, OW_H)
  for (const side of [-1, 1]) {
    const d = side === -1 ? swing : -swing
    const sh: Pt = [cx + side * 9, SHOULDER_Y + 0.5]
    const el: Pt = [cx + side * 10.6, 35 + d * 0.4]
    const wr: Pt = [cx + side * 10.4, 41.5 + d]
    owArm(arms, a, sh, el, wr, [wr[0], wr[1] + 2.2])
  }
  arms.outline()
  if (TEES.has(a.top))
    for (const side of [-1, 1]) {
      const y = Math.round(SHOULDER_Y + 0.5 + (35 - SHOULDER_Y - 0.5) * 0.55) - 1
      arms.line(cx + side * 8.2, y, cx + side * 11.6, y, a.top === 'jersey' ? 'c' : 'a')
    }
  stampOver(g, arms)
}

function bodyDetails(g: Grid, a: Appearance, back: boolean) {
  const cx = 24
  if (back) {
    if (a.top === 'jersey') {
      g.stamp(cx - 2, 28, ['KKKK', '...K', '..K.', '..K.', '.K..'])
      g.rect(cx - 8, 33, cx - 7, 42, 'r').rect(cx + 7, 33, cx + 8, 42, 'r')
      g.line(cx + 2, 42, cx + 5, 34, 'R').line(cx + 4, 42, cx + 6, 37, 'q')
    }
    if (has(a, 'bag')) g.line(cx + 8, 26, cx - 7, 37, 'Z')
    return
  }
  if (a.top === 'school') g.line(cx - 3.5, 24.5, cx, 32, 'U').line(cx + 3.5, 24.5, cx, 32, 'U').line(cx - 8, 43, cx + 8, 43, 'U')
  if (a.top === 'blazer' || a.top === 'suit') g.line(cx - 3.5, 24.5, cx, 32, 'K').line(cx + 3.5, 24.5, cx, 32, 'K')
  if (a.top === 'jacket') g.line(cx, 29, cx, 41, 'K')
  if (has(a, 'chain')) g.set(cx - 3, 25, 'X').set(cx - 2, 27, 'X').set(cx, 28, 'X').set(cx + 2, 27, 'X').set(cx + 3, 25, 'X')
  if (has(a, 'bag')) g.line(cx - 7, 25, cx + 7, 37, 'Z')
  if (has(a, 'headphones')) g.rect(cx - 5, 23, cx + 5, 23, 'Z').rect(cx - 6, 23, cx - 4, 25, 'Z').rect(cx + 4, 23, cx + 6, 25, 'Z')
  if (has(a, 'watch')) g.rect(cx + 9, 41, cx + 12, 41, 'Z')
  if (has(a, 'bracelet')) g.rect(cx - 12, 41, cx - 9, 41, 'X')
  if (has(a, 'beltchain')) g.set(cx + 5, 44, 'X').set(cx + 6, 45, 'X').set(cx + 7, 44, 'X')
}

/** Shoulder-blade-length and bigger styles need a little more volume around the head. */
const bigHair = (a: Appearance) => a.hair === 'wavy' || a.hair === 'mullet' || a.hair === 'curly' || a.hair === 'curtains'

/* ---------------- facing down ---------------- */

function down(a: Appearance, step: Step): Pixels {
  const g = new Grid(OW_W, OW_H)
  const cx = 24
  // hair behind the head (and the mullet at the nape)
  const big = bigHair(a)
  oval(g, cx, 11.5, big ? 10.6 : 9.8, big ? 10.4 : 9.6, a.hair === 'buzz' ? 'j' : 'H', 'j')
  if (a.hair === 'long') g.poly([[cx - 9.5, 12], [cx + 9.5, 12], [cx + 10, 33], [cx - 10, 33]], 'H')
  if (a.hair === 'mullet') g.poly([[cx - 7, 16], [cx + 7, 16], [cx + 7.5, 25], [cx - 7.5, 25]], 'H')
  if (a.hair === 'bun') oval(g, cx, 1.8, 3.5, 2.6, 'H', 'j', 'h')
  clipHair(g, a)
  bodyFrontBack(g, a, step, false)
  // head: an oval face a little longer than it is wide, ears level with the eyes
  oval(g, cx - 8.4, HEAD_Y + 0.5, 1.4, 2, 'S', 's')
  oval(g, cx + 8.4, HEAD_Y + 0.5, 1.4, 2, 's')
  oval(g, cx, HEAD_Y, 7.8, 8.6, 'S', undefined, 'T')
  for (let y = 5; y < 23; y++) for (let x = cx + 5; x <= cx + 8; x++) if (g.get(x, y) === 'S') g.set(x, y, 's')
  fringeFront(g, a, cx)
  clipHair(g, a, 1)
  hat(g, a, cx, 'down')
  g.outline().thicken()
  // face: smaller eyes set mid-face, brows, a nose and a mouth: an older face than big chibi eyes
  if (has(a, 'sunglasses')) {
    g.rect(cx - 7, 12, cx - 1, 15, 'K').rect(cx + 1, 12, cx + 6, 15, 'K').rect(cx - 1, 12, cx + 1, 12, 'K')
    g.set(cx - 6, 12, 'l').set(cx + 2, 12, 'l')
  } else {
    for (const ex of [cx - 5, cx + 3]) {
      g.stamp(ex, 12, ['KK', 'WE', 'KE'])
      g.line(ex - 1, 10, ex + 1.6, 10, 'j')
    }
    if (has(a, 'glasses')) {
      for (const x0 of [cx - 7, cx + 1]) g.rect(x0, 11, x0 + 5, 11, 'K').rect(x0, 15, x0 + 5, 15, 'K').rect(x0, 12, x0, 14, 'K').rect(x0 + 5, 12, x0 + 5, 14, 'K').set(x0 + 4, 12, 'W')
      g.set(cx - 1, 12, 'K').set(cx, 12, 'K')
    }
  }
  g.set(cx, 16, 's').set(cx, 17, 's')
  g.rect(cx - 1, 19, cx + 1, 19, 'M')
  if (has(a, 'earring')) g.set(cx - 9, 16, 'X').set(cx + 9, 16, 'X')
  bodyDetails(g, a, false)
  return step === 0 ? g.toPixels() : shiftDown(g.toPixels(), 1)
}

function fringeFront(g: Grid, a: Appearance, cx: number) {
  const hairC = a.hair === 'buzz' ? 'j' : 'H'
  oval(g, cx, 7.5, 9.4, 5.2, hairC, 'j', a.hair === 'buzz' ? undefined : 'h')
  switch (a.hair) {
    case 'wavy':
    case 'mullet':
      g.poly([[cx - 8.6, 7.5], [cx + 8.6, 7.5], [cx + 7.4, 12], [cx + 4, 10.5], [cx + 0.6, 12.5], [cx - 2.6, 10.5], [cx - 6, 12], [cx - 8.6, 11.5]], 'H')
      for (const [x, y, r] of [[cx - 5.4, 3, 3], [cx, 2, 3.3], [cx + 5.4, 3, 3]] as const) oval(g, x, y, r, r, 'H', 'j', 'h')
      g.line(cx + 3, 4.5, cx + 1, 11, 'j').line(cx - 4, 5, cx - 5.5, 10.5, 'j').line(cx - 3, 3, cx + 1, 2, 'h')
      break
    case 'curtains':
      g.poly([[cx, 3.5], [cx - 9.4, 5.5], [cx - 9.8, 17.5], [cx - 7.4, 19], [cx - 6, 11], [cx - 2, 7]], 'H')
      g.poly([[cx, 3.5], [cx + 9.4, 5.5], [cx + 9.8, 17.5], [cx + 7.4, 19], [cx + 6, 11], [cx + 2, 7]], 'j')
      g.line(cx, 3, cx, 6.5, 'K').line(cx - 3.5, 5, cx - 7.5, 10.5, 'h')
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
      g.rect(cx - 10, 9, cx - 8, 24, 'H').rect(cx + 8, 9, cx + 10, 24, 'j')
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
  bodyFrontBack(g, a, step, true)
  if (a.top === 'hoodie') oval(g, cx, 25, 5, 2.2, 'a')
  oval(g, cx - 8.4, HEAD_Y + 0.5, 1.4, 2, 'S', 's')
  oval(g, cx + 8.4, HEAD_Y + 0.5, 1.4, 2, 's')
  const hairC = a.hair === 'buzz' ? 'j' : 'H'
  const big = bigHair(a)
  oval(g, cx, 11.5, big ? 10.4 : 9.6, big ? 10.4 : 9.8, hairC, 'j', a.hair === 'buzz' ? undefined : 'h')
  if (a.hair === 'mullet') g.poly([[cx - 7.5, 15], [cx + 7.5, 15], [cx + 7.5, 24], [cx + 4, 23], [cx, 25], [cx - 4, 23], [cx - 7.5, 24]], 'H')
  if (a.hair === 'long') g.poly([[cx - 9.5, 12], [cx + 9.5, 12], [cx + 10, 33], [cx - 10, 33]], 'H')
  if (a.hair === 'bun') oval(g, cx, 2.5, 3.5, 2.8, 'H', 'j', 'h')
  if (a.hair === 'curly') for (let x = cx - 8; x <= cx + 8; x += 4) oval(g, x, 3.5, 2, 2, 'H', 'j')
  if (a.hair !== 'long' && a.hair !== 'mullet') g.rect(cx - 2.5, 20.5, cx + 2, 21, 's')
  clipHair(g, a, 1)
  hat(g, a, cx, 'up')
  g.outline().thicken()
  if (a.hair !== 'buzz') g.line(cx - 4, 5, cx - 3, 15, 'j').line(cx + 3, 5.5, cx + 4, 15, 'j')
  bodyDetails(g, a, true)
  return step === 0 ? g.toPixels() : shiftDown(g.toPixels(), 1)
}

/* ---------------- facing left ---------------- */

function left(a: Appearance, step: Step, ride = false): Pixels {
  const g = new Grid(OW_W, OW_H)
  const cx = 23
  const hip: Pt = [cx + 1, HIP_Y]
  // legs in stride (or, riding, one leg bent over the mount's back: thigh forward, shin down)
  const legs: Array<[number, number]> = ride ? [] : step === 0 ? [[cx + 0.5, cx]] : step === 1 ? [[cx - 2.5, cx - 4], [cx + 3.5, cx + 5]] : [[cx - 1, cx - 1.5], [cx + 2, cx + 2.5]]
  if (ride) {
    const seat: Pt = [cx + 1, HIP_Y - 0.5]
    const knee: Pt = [cx - 5, 45.5]
    const ankle: Pt = [cx - 5.5, 51.5]
    if (bareLegs(a)) {
      capsule(g, seat, knee, 3.3, 3, 'B', 'b')
      capsule(g, knee, ankle, 2.4, 2.2, 'S', 's')
    } else {
      capsule(g, seat, knee, 3.3, 3, 'B', 'b', 'P')
      capsule(g, knee, ankle, 2.9, 2.7, 'B', 'b')
    }
    oval(g, ankle[0] - 1.2, 54, 3.6, 2.2, 'F', 'f', 'e')
  }
  for (const [kx, fx] of legs) {
    if (bareLegs(a)) {
      capsule(g, hip, [kx, 48.5], 3.2, 3, 'B', 'b')
      capsule(g, [kx, 49], [fx, 56], 2.4, 2.2, 'S', 's')
    } else capsule(g, hip, [fx, 56], 3.2, 2.8, 'B', 'b', 'P')
    oval(g, fx - 1.2, FOOT_Y, 3.8, 2.2, 'F', 'f', 'e')
    if (a.shoes === 'sneakers') g.rect(Math.floor(fx - 5), 60, Math.ceil(fx + 2), 60, 'G')
  }
  if (a.bottom === 'skirt') g.poly([[cx - 5, 41], [cx + 6.5, 41], [cx + 8, 49], [cx - 6.5, 49]], 'B')
  g.poly([[cx - 4.5, WAIST_Y], [cx + 6, WAIST_Y], [cx + 6.5, 45], [cx - 5, 45]], 'B')
  // torso in profile: chest a touch forward of the back
  const hem = BLAZERS.has(a.top) ? 44 : 42.5
  g.poly([[cx - 4.5, 24.5], [cx + 5, 24.5], [cx + 6.5, 28], [cx + 6, hem], [cx - 5.5, hem], [cx - 6.5, 30], [cx - 6, 27]], 'A')
  g.poly([[cx + 2.5, 24.5], [cx + 5, 24.5], [cx + 6.5, 28], [cx + 6, hem], [cx + 3, hem]], 'a')
  if (a.top === 'jersey') g.line(cx - 5, hem, cx - 4, 33, 'R').line(cx - 3, hem, cx - 3.5, 37, 'q').rect(cx + 4, 33, cx + 5, hem, 'r')
  if (BLAZERS.has(a.top)) g.poly([[cx - 4.5, 24.5], [cx - 1.5, 24.5], [cx - 5, 29.5]], a.top === 'suit' ? 'V' : 'G')
  if (has(a, 'bag')) g.rect(cx + 4.5, 36, cx + 8, 41, 'Z')
  // neck, then the head in profile: hair behind, face toward the left
  g.rect(cx - 1, NECK_Y, cx + 3, NECK_Y + 4, 's')
  const hairC = a.hair === 'buzz' ? 'j' : 'H'
  oval(g, cx + 3, 11.5, 9, 9.4, hairC, 'j')
  if (a.hair === 'mullet') g.poly([[cx + 1, 15], [cx + 10, 15], [cx + 10, 24], [cx + 6, 23], [cx + 2, 25]], 'H')
  if (a.hair === 'long') g.rect(cx, 11, cx + 10, 31, 'H').rect(cx + 7, 11, cx + 10, 31, 'j')
  if (a.hair === 'bun') oval(g, cx + 8.5, 3, 3, 2.6, 'H', 'j')
  oval(g, cx - 2, HEAD_Y, 7.2, 8.4, 'S', undefined, 'T')
  oval(g, cx + 3, 7.6, 8.6, 5.2, hairC, 'j', a.hair === 'buzz' ? undefined : 'h')
  if (a.hair !== 'buzz' && a.hair !== 'bun') g.poly([[cx - 9.5, 7.5], [cx + 2, 6.5], [cx - 1.5, 11], [cx - 5.5, 10.5], [cx - 9.5, 12.5]], 'H')
  if (a.hair === 'curtains') g.poly([[cx - 9, 7.5], [cx - 5, 7.5], [cx - 6, 17], [cx - 9, 15.5]], 'H')
  if (a.hair === 'spiky') for (const x of [cx - 4, cx + 1.5, cx + 7]) g.poly([[x - 2.6, 6], [x + 2.6, 6], [x + 2, -0.5]], 'H')
  oval(g, cx + 4, HEAD_Y + 1, 1.5, 2, 'S', 's')
  clipHair(g, a, 1)
  hat(g, a, cx + 2, 'left')
  // one visible arm swinging, with a thin inner outline so it reads over the body
  const arm = new Grid(OW_W, OW_H)
  const swing = step === 1 ? -3 : step === 2 ? 3 : 0
  const sh: Pt = [cx + 0.5, SHOULDER_Y + 0.5]
  // riding, the arm reaches forward to hold on
  const el: Pt = ride ? [cx - 2, 34] : [cx + 0.5 + swing * 0.5, 34.5]
  const wr: Pt = ride ? [cx - 6.5, 37] : [cx + 0.5 + swing, 40.5]
  owArm(arm, a, sh, el, wr, ride ? [cx - 8, 37.5] : [wr[0], wr[1] + 2.2])
  arm.outline()
  if (TEES.has(a.top)) {
    const e = lerp(sh, el, 0.55)
    arm.line(e[0] - 2.2, e[1] - 1, e[0] + 2.2, e[1] - 1, a.top === 'jersey' ? 'c' : 'a')
  }
  if (has(a, 'watch') && !ride) arm.rect(wr[0] - 1.6, wr[1], wr[0] + 1.6, wr[1], 'Z')
  stampOver(g, arm)
  g.outline().thicken()
  // a nose and chin in the profile line
  g.set(cx - 10, 15, 'S').set(cx - 10, 16, 's')
  // eye, brow, glasses, mouth
  if (has(a, 'sunglasses')) g.rect(cx - 9, 12, cx - 4.5, 15, 'K').line(cx - 4.5, 12, cx + 3, 12, 'K')
  else {
    g.stamp(cx - 7, 12, ['KK', 'WE', 'KE'])
    g.line(cx - 8, 10, cx - 5.5, 10, 'j')
    if (has(a, 'glasses')) g.rect(cx - 9, 11, cx - 4, 11, 'K').rect(cx - 9, 15, cx - 4, 15, 'K').rect(cx - 9, 12, cx - 9, 14, 'K').rect(cx - 4, 12, cx - 4, 14, 'K').line(cx - 4, 12, cx + 3, 12, 'K')
  }
  g.rect(cx - 8, 19, cx - 7, 19, 'M')
  if (has(a, 'earring')) g.set(cx + 4, 17, 'X')
  return g.toPixels()
}

function shiftDown(px: Pixels, n: number): Pixels {
  const blank = '.'.repeat(px[0].length)
  return [...Array.from({ length: n }, () => blank), ...px.slice(0, px.length - n)]
}

export function overworldFor(a: Appearance): Record<Facing, [Pixels, Pixels, Pixels]> {
  const l: [Pixels, Pixels, Pixels] = [left(a, 0), left(a, 1), left(a, 2)]
  return {
    down: [down(a, 0), down(a, 1), down(a, 2)],
    up: [up(a, 0), up(a, 1), up(a, 2)],
    left: l,
    right: l.map(flipX) as [Pixels, Pixels, Pixels],
  }
}

/** A trainer sitting astride a mount, facing left (mirror for right): one leg bent over its back, a hand forward holding on. */
export function riderFor(a: Appearance): Pixels {
  return left(a, 0, true)
}
/** Where the rider's hips are in the riding sprite (art pixels): this point sits on the mount's saddle. */
export const RIDER_HIP: [number, number] = [24, 43.5]

/** Walk cycle order: stand, step A, stand, step B. */
export const WALK_CYCLE = [0, 1, 0, 2] as const
