/**
 * Overworld ("walking") sprites in the Black/White style, generated from any Appearance (same
 * palette keys as character.ts).
 *
 * The art is 48×64 — twice the size it's shown at in the world (OW_WORLD = 0.5) — so the
 * walkers have the same fine detail as the battle sprites: a big chibi head, a small body, arms
 * flared out from the shoulders, three-tone shading and a dark outline.
 * Directions: down / up / left (right = left mirrored); frames: stand, step A, step B.
 */
import { Grid, flipX } from './raster.ts'
import type { Pixels } from './pixels.ts'
import { capsule, oval, HAT_BRIM, type Appearance, type Pt } from './character.ts'

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

/** Clip any hair that would poke out above a hat's brim (scaled for the walker's head). */
function clipHair(g: Grid, a: Appearance, brimY: number) {
  if (HAT_BRIM[a.hat] === undefined) return
  for (let y = 0; y < brimY; y++) for (let x = 0; x < OW_W; x++) if ('Hjh'.includes(g.get(x, y))) g.set(x, y, '.')
}

function hat(g: Grid, a: Appearance, cx: number, facing: 'down' | 'up' | 'left') {
  switch (a.hat) {
    case 'cap':
      oval(g, cx, 10, 14, 8.5, 'Y', 'y')
      if (facing === 'down') g.poly([[cx - 13, 14], [cx + 13, 14], [cx + 12, 18], [cx - 12, 18]], 'y')
      if (facing === 'left') g.poly([[cx - 4, 13], [cx - 21, 15], [cx - 20, 18], [cx - 4, 17]], 'y')
      break
    case 'beanie':
      oval(g, cx, 10, 14.5, 9.5, 'Y', 'y')
      g.rect(cx - 14, 13, cx + 14, 17, 'y')
      for (let x = cx - 12; x < cx + 14; x += 4) g.line(x, 13, x, 17, 'Y')
      break
    case 'bucket':
      g.poly([[cx - 9, 1], [cx + 9, 1], [cx + 11, 12], [cx - 11, 12]], 'Y')
      g.poly([[cx + 4, 1], [cx + 9, 1], [cx + 11, 12], [cx + 6, 12]], 'y')
      oval(g, cx, 14, 18, 3.6, 'y')
      break
    case 'headband':
      g.rect(cx - 13, 13, cx + 13, 15, 'Y')
      break
  }
}

/** Torso, arms and legs for the front and back views. */
function bodyFrontBack(g: Grid, a: Appearance, step: Step, back: boolean) {
  const cx = 24
  const lift = (left: boolean) => (step === 1 && left) || (step === 2 && !left)
  // legs + shoes
  for (const left of [true, false]) {
    const x = left ? cx - 4.5 : cx + 4.5
    const up = lift(left) ? 2 : 0
    const top: Pt = [x, 46]
    const knee: Pt = [x, 55 - up]
    if (bareLegs(a)) {
      capsule(g, top, [x, 50], 3.6, 3.4, 'B', 'b')
      capsule(g, [x, 51], knee, 2.8, 2.6, 'S', 's')
    } else capsule(g, top, knee, 3.8, 3.4, 'B', 'b', 'P')
    oval(g, x + (left ? -0.6 : 0.6), 58 - up, 4.4, 2.8, 'F', 'f', 'e')
    if (a.shoes === 'sneakers') g.rect(Math.floor(x - 4), 60 - up, Math.ceil(x + 3.5), 60 - up, 'G')
  }
  if (a.bottom === 'skirt') g.poly([[cx - 9, 44], [cx + 9, 44], [cx + 11, 51], [cx - 11, 51]], 'B')
  g.poly([[cx - 9, 43], [cx + 9, 43], [cx + 9.5, 48], [cx - 9.5, 48]], 'B')

  // arms flare out from the shoulders and swing with the step
  const swing = step === 0 ? 0 : step === 1 ? 2 : -2
  const sleeveCol = a.top === 'tank' ? 'S' : 'A'
  const forearmCol = TEES.has(a.top) || a.top === 'tank' ? 'S' : 'A'
  for (const side of [-1, 1]) {
    const d = side === -1 ? swing : -swing
    const sh: Pt = [cx + side * 9.5, 35]
    const el: Pt = [cx + side * 13.5, 40.5 + d * 0.4]
    const hand: Pt = [cx + side * 15, 45.5 + d]
    capsule(g, sh, el, 3, 2.6, sleeveCol, sleeveCol === 'A' ? 'a' : 's')
    capsule(g, el, [hand[0], hand[1] - 1.5], 2.6, 2.2, forearmCol, forearmCol === 'A' ? 'a' : 's')
    if (TEES.has(a.top)) capsule(g, sh, [cx + side * 11.5, 38.5], 3.4, 3, 'A', 'a', 'Q')
    oval(g, hand[0], hand[1], 2.6, 2.6, 'S', 's')
  }

  // torso
  const hem = BLAZERS.has(a.top) ? 46 : 45
  g.poly([[cx - 8.5, 32], [cx + 8.5, 32], [cx + 10, 36], [cx + 9.5, hem], [cx - 9.5, hem], [cx - 10, 36]], 'A')
  g.poly([[cx + 4, 32], [cx + 8.5, 32], [cx + 10, 36], [cx + 9.5, hem], [cx + 5, hem]], 'a')
  if (!back) {
    switch (a.top) {
      case 'jersey':
        g.rect(cx - 9, 42, cx - 8, hem, 'R').rect(cx + 8, 42, cx + 9, hem, 'r')
        g.poly([[cx - 6, 37], [cx - 2, 36], [cx - 3, 42], [cx - 5, 41]], 'R')
        break
      case 'tee':
        g.rect(cx - 2, 37, cx + 1, 40, 'R').set(cx - 1, 38, 'D').set(cx, 38, 'D')
        break
      case 'splash':
        for (const [x, y, c] of [[cx - 6, 36, 'N'], [cx + 3, 35, 'J'], [cx - 2, 40, 'I'], [cx + 5, 42, 'C'], [cx - 7, 43, 'J']] as const) g.rect(x, y, x + 1, y + 1, c)
        break
      case 'hoodie':
        g.rect(cx - 5, 40, cx + 5, 44, 'a').set(cx - 2, 33, 'G').set(cx - 2, 34, 'G').set(cx + 2, 33, 'G').set(cx + 2, 34, 'G')
        break
      case 'jacket':
        g.poly([[cx - 3, 32], [cx + 3, 32], [cx, 37]], 'G')
        break
      case 'shirt':
        g.poly([[cx - 3, 32], [cx + 3, 32], [cx, 35]], 'Q').rect(cx - 1, 33, cx, 41, 'R')
        break
      case 'blazer':
      case 'suit':
      case 'school':
        g.poly([[cx - 4, 32], [cx + 4, 32], [cx, 40]], a.top === 'suit' ? 'V' : 'G')
        g.rect(cx - 1, 33, cx, 39, 'R')
        break
      case 'tank':
        g.rect(cx - 9, 32, cx - 6, 34, 'S').rect(cx + 6, 32, cx + 9, 34, 'S')
        break
    }
    if (has(a, 'scarf')) capsule(g, [cx - 6, 32], [cx + 6, 32], 2.4, 2.4, 'R', 'r')
    if (has(a, 'bag')) g.rect(cx + 6, 41, cx + 12, 46, 'Z').rect(cx + 10, 41, cx + 12, 46, 'z')
  }
}

function bodyDetails(g: Grid, a: Appearance, back: boolean) {
  const cx = 24
  if (back) {
    if (a.top === 'jersey') g.stamp(cx - 2, 35, ['KKKK', '...K', '..K.', '..K.', '.K..'])
    if (has(a, 'bag')) g.line(cx + 9, 33, cx - 8, 43, 'Z')
    return
  }
  if (a.top === 'school') g.line(cx - 4, 32, cx, 40, 'U').line(cx + 4, 32, cx, 40, 'U').line(cx - 9, 45, cx + 9, 45, 'U')
  if (a.top === 'blazer' || a.top === 'suit') g.line(cx - 4, 32, cx, 40, 'K').line(cx + 4, 32, cx, 40, 'K')
  if (a.top === 'jacket') g.line(cx, 37, cx, 44, 'K')
  if (has(a, 'chain')) g.set(cx - 3, 33, 'X').set(cx - 2, 35, 'X').set(cx, 36, 'X').set(cx + 2, 35, 'X').set(cx + 3, 33, 'X')
  if (has(a, 'bag')) g.line(cx - 8, 33, cx + 8, 42, 'Z')
  if (has(a, 'headphones')) g.rect(cx - 7, 31, cx + 7, 31, 'Z').rect(cx - 8, 31, cx - 6, 33, 'Z').rect(cx + 6, 31, cx + 8, 33, 'Z')
  if (has(a, 'watch')) g.rect(cx + 13, 43, cx + 16, 43, 'Z')
  if (has(a, 'bracelet')) g.rect(cx - 16, 43, cx - 13, 43, 'X')
  if (has(a, 'beltchain')) g.set(cx + 6, 47, 'X').set(cx + 7, 48, 'X').set(cx + 8, 47, 'X')
}

/* ---------------- facing down ---------------- */

function down(a: Appearance, step: Step): Pixels {
  const g = new Grid(OW_W, OW_H)
  const cx = 24
  // hair behind the head (and the mullet at the nape)
  const big = a.hair === 'wavy' || a.hair === 'mullet' || a.hair === 'curly' || a.hair === 'curtains'
  oval(g, cx, 17, big ? 15.5 : 14.5, big ? 14.5 : 13.5, a.hair === 'buzz' ? 'j' : 'H', 'j')
  if (a.hair === 'long') g.poly([[cx - 14, 18], [cx + 14, 18], [cx + 15, 38], [cx - 15, 38]], 'H')
  if (a.hair === 'mullet') g.poly([[cx - 10, 24], [cx + 10, 24], [cx + 11, 34], [cx - 11, 34]], 'H')
  if (a.hair === 'bun') oval(g, cx, 3.5, 5, 3.5, 'H', 'j', 'h')
  clipHair(g, a, HAT_BRIM[a.hat] ?? 0)
  bodyFrontBack(g, a, step, false)
  // head
  oval(g, cx - 12.5, 23, 2.2, 3, 'S', 's')
  oval(g, cx + 12.5, 23, 2.2, 3, 's')
  oval(g, cx, 21.5, 12, 11, 'S', undefined, 'T')
  for (let y = 12; y < 33; y++) for (let x = cx + 7; x <= cx + 12; x++) if (g.get(x, y) === 'S') g.set(x, y, 's')
  fringeFront(g, a, cx)
  clipHair(g, a, (HAT_BRIM[a.hat] ?? 0) + 2)
  hat(g, a, cx, 'down')
  g.outline()
  // face: tall BW eyes with a highlight, a small mouth
  if (has(a, 'sunglasses')) {
    g.rect(cx - 10, 20, cx - 2, 25, 'K').rect(cx + 2, 20, cx + 10, 25, 'K').rect(cx - 2, 21, cx + 2, 21, 'K')
    g.set(cx - 8, 21, 'l').set(cx + 4, 21, 'l')
  } else {
    for (const ex of [cx - 7, cx + 4]) g.stamp(ex, 21, ['.KK', 'KWE', 'KEE', 'KEE', '.K.'])
    if (has(a, 'glasses')) {
      for (const x0 of [cx - 10, cx + 2]) {
        g.rect(x0, 19, x0 + 8, 19, 'K').rect(x0, 26, x0 + 8, 26, 'K').rect(x0, 20, x0, 25, 'K').rect(x0 + 8, 20, x0 + 8, 25, 'K')
        g.set(x0 + 7, 20, 'W')
      }
      g.rect(cx - 2, 21, cx + 2, 21, 'K')
    }
  }
  g.rect(cx - 1, 29, cx + 1, 29, 'M').set(cx - 2, 28, 'M').set(cx + 2, 28, 'M')
  if (has(a, 'earring')) g.set(cx - 13, 25, 'X').set(cx + 13, 25, 'X')
  bodyDetails(g, a, false)
  return step === 0 ? g.toPixels() : shiftDown(g.toPixels(), 1)
}

function fringeFront(g: Grid, a: Appearance, cx: number) {
  const hairC = a.hair === 'buzz' ? 'j' : 'H'
  oval(g, cx, 12.5, 14, 8, hairC, 'j', a.hair === 'buzz' ? undefined : 'h')
  switch (a.hair) {
    case 'wavy':
    case 'mullet':
      g.poly([[cx - 13, 12], [cx + 13, 12], [cx + 11, 19], [cx + 6, 16], [cx + 1, 19], [cx - 4, 16], [cx - 9, 18], [cx - 13, 17]], 'H')
      for (const [x, y, r] of [[cx - 8, 5, 4.5], [cx, 3.5, 5], [cx + 8, 5, 4.5]] as const) oval(g, x, y, r, r, 'H', 'j', 'h')
      g.line(cx + 4, 8, cx + 1, 17, 'j').line(cx - 6, 9, cx - 8, 16, 'j').line(cx - 4, 6, cx + 2, 4, 'h')
      break
    case 'curtains':
      g.poly([[cx, 6], [cx - 14, 9], [cx - 14.5, 27], [cx - 11, 29], [cx - 9, 17], [cx - 3, 11]], 'H')
      g.poly([[cx, 6], [cx + 14, 9], [cx + 14.5, 27], [cx + 11, 29], [cx + 9, 17], [cx + 3, 11]], 'j')
      g.line(cx, 5, cx, 10, 'K').line(cx - 5, 8, cx - 11, 16, 'h')
      break
    case 'spiky':
      for (const x of [cx - 10, cx - 4, cx + 2, cx + 8]) g.poly([[x - 4, 10], [x + 4, 10], [x + (x < cx ? -2 : 2), -1]], 'H')
      g.poly([[cx - 13, 12], [cx + 13, 12], [cx + 11, 18], [cx - 11, 18]], 'H')
      break
    case 'curly':
      for (let x = cx - 12; x <= cx + 12; x += 4) oval(g, x, 15, 2.8, 2.8, 'H', 'j', 'h')
      break
    case 'long':
      g.poly([[cx - 13, 12], [cx + 13, 12], [cx + 11, 18], [cx - 11, 18]], 'H')
      g.rect(cx - 15, 14, cx - 12, 36, 'H').rect(cx + 12, 14, cx + 15, 36, 'j')
      break
    case 'short':
      g.poly([[cx - 13, 12], [cx + 13, 12], [cx + 11, 17], [cx - 11, 17]], 'H')
      break
    case 'bun':
      g.line(cx, 7, cx, 13, 'j')
      break
  }
}

/* ---------------- facing up ---------------- */

function up(a: Appearance, step: Step): Pixels {
  const g = new Grid(OW_W, OW_H)
  const cx = 24
  bodyFrontBack(g, a, step, true)
  if (a.top === 'hoodie') oval(g, cx, 33, 7, 3, 'a')
  oval(g, cx - 12.5, 23, 2.2, 3, 'S', 's')
  oval(g, cx + 12.5, 23, 2.2, 3, 's')
  const hairC = a.hair === 'buzz' ? 'j' : 'H'
  oval(g, cx, 18, 15, 14.5, hairC, 'j', a.hair === 'buzz' ? undefined : 'h')
  if (a.hair === 'mullet') g.poly([[cx - 11, 22], [cx + 11, 22], [cx + 11, 35], [cx + 6, 33], [cx, 36], [cx - 6, 33], [cx - 11, 35]], 'H')
  if (a.hair === 'long') g.poly([[cx - 14, 18], [cx + 14, 18], [cx + 15, 38], [cx - 15, 38]], 'H')
  if (a.hair === 'bun') oval(g, cx, 5, 5, 4, 'H', 'j', 'h')
  if (a.hair === 'curly') for (let x = cx - 12; x <= cx + 12; x += 6) oval(g, x, 6, 3, 3, 'H', 'j')
  if (a.hair !== 'long' && a.hair !== 'mullet') g.rect(cx - 4, 32, cx + 3, 32, 's')
  clipHair(g, a, (HAT_BRIM[a.hat] ?? 0) + 2)
  hat(g, a, cx, 'up')
  g.outline()
  if (a.hair !== 'buzz') g.line(cx - 6, 8, cx - 4, 22, 'j').line(cx + 5, 9, cx + 6, 22, 'j')
  bodyDetails(g, a, true)
  return step === 0 ? g.toPixels() : shiftDown(g.toPixels(), 1)
}

/* ---------------- facing left ---------------- */

function left(a: Appearance, step: Step, ride = false): Pixels {
  const g = new Grid(OW_W, OW_H)
  const cx = 23
  // legs in stride (or, riding, one leg bent over the mount's back: thigh forward, shin down)
  const legs: Array<[number, number]> = ride ? [] : step === 0 ? [[cx + 1, cx]] : step === 1 ? [[cx - 3, cx - 5], [cx + 5, cx + 6]] : [[cx - 1, cx - 2], [cx + 3, cx + 3]]
  if (ride) {
    const knee: Pt = [cx - 6, 47]
    const ankle: Pt = [cx - 6.5, 53]
    if (bareLegs(a)) {
      capsule(g, [cx + 1, 45.5], knee, 3.6, 3.2, 'B', 'b')
      capsule(g, knee, ankle, 2.6, 2.4, 'S', 's')
    } else {
      capsule(g, [cx + 1, 45.5], knee, 3.8, 3.4, 'B', 'b', 'P')
      capsule(g, knee, ankle, 3.2, 3, 'B', 'b')
    }
    oval(g, ankle[0] - 1.5, 56, 4.4, 2.6, 'F', 'f', 'e')
  }
  for (const [kx, fx] of legs) {
    if (bareLegs(a)) {
      capsule(g, [cx + 1, 46], [kx, 50], 3.6, 3.4, 'B', 'b')
      capsule(g, [kx, 51], [fx, 55], 2.8, 2.6, 'S', 's')
    } else capsule(g, [cx + 1, 46], [fx, 55], 3.8, 3.4, 'B', 'b', 'P')
    oval(g, fx - 1.5, 58, 4.6, 2.8, 'F', 'f', 'e')
    if (a.shoes === 'sneakers') g.rect(Math.floor(fx - 6), 60, Math.ceil(fx + 2.5), 60, 'G')
  }
  if (a.bottom === 'skirt') g.poly([[cx - 6, 44], [cx + 8, 44], [cx + 10, 51], [cx - 8, 51]], 'B')
  g.poly([[cx - 6, 43], [cx + 8, 43], [cx + 8, 48], [cx - 6, 48]], 'B')
  // torso in profile
  const hem = BLAZERS.has(a.top) ? 46 : 45
  g.poly([[cx - 5, 32], [cx + 7, 32], [cx + 8, hem], [cx - 6, hem]], 'A')
  g.poly([[cx + 3, 32], [cx + 7, 32], [cx + 8, hem], [cx + 4, hem]], 'a')
  if (a.top === 'jersey') g.rect(cx - 5, 32, cx + 7, 33, 'R')
  if (BLAZERS.has(a.top)) g.poly([[cx - 5, 32], [cx - 1, 32], [cx - 5, 38]], a.top === 'suit' ? 'V' : 'G')
  if (has(a, 'bag')) g.rect(cx + 5, 41, cx + 10, 46, 'Z')
  // head in profile: hair behind, face toward the left
  const hairC = a.hair === 'buzz' ? 'j' : 'H'
  oval(g, cx + 4, 18, 13.5, 14, hairC, 'j')
  if (a.hair === 'mullet') g.poly([[cx + 2, 22], [cx + 15, 22], [cx + 15, 34], [cx + 9, 33], [cx + 3, 35]], 'H')
  if (a.hair === 'long') g.rect(cx, 18, cx + 15, 38, 'H').rect(cx + 10, 18, cx + 15, 38, 'j')
  if (a.hair === 'bun') oval(g, cx + 12, 5, 4, 3.5, 'H', 'j')
  oval(g, cx - 3, 22, 10.5, 10.5, 'S', undefined, 'T')
  g.rect(cx + 1, 29, cx + 5, 32, 's')
  oval(g, cx + 4, 12.5, 12.5, 7.5, hairC, 'j', a.hair === 'buzz' ? undefined : 'h')
  if (a.hair !== 'buzz' && a.hair !== 'bun') g.poly([[cx - 14, 12], [cx + 3, 10], [cx - 2, 17], [cx - 8, 16], [cx - 14, 19]], 'H')
  if (a.hair === 'curtains') g.poly([[cx - 13, 12], [cx - 7, 12], [cx - 9, 26], [cx - 13, 24]], 'H')
  if (a.hair === 'spiky') for (const x of [cx - 6, cx + 2, cx + 10]) g.poly([[x - 4, 9], [x + 4, 9], [x + 3, -1]], 'H')
  oval(g, cx + 6, 23, 2.2, 3, 'S', 's')
  clipHair(g, a, (HAT_BRIM[a.hat] ?? 0) + 2)
  hat(g, a, cx + 2, 'left')
  g.outline()
  g.set(cx - 14, 24, 'S').set(cx - 14, 25, 's')
  // eye, glasses, mouth
  if (has(a, 'sunglasses')) g.rect(cx - 13, 20, cx - 7, 25, 'K').rect(cx - 7, 21, cx + 4, 21, 'K')
  else {
    g.stamp(cx - 10, 21, ['KK', 'WE', 'EE', 'EE', 'K.'])
    if (has(a, 'glasses')) g.rect(cx - 13, 19, cx - 6, 19, 'K').rect(cx - 13, 26, cx - 6, 26, 'K').rect(cx - 13, 20, cx - 13, 25, 'K').rect(cx - 6, 20, cx - 6, 25, 'K').rect(cx - 6, 21, cx + 4, 21, 'K')
  }
  g.rect(cx - 12, 29, cx - 10, 29, 'M')
  if (has(a, 'earring')) g.set(cx + 6, 26, 'X')
  // one visible arm swinging, outlined so it reads over the body
  const arm = new Grid(OW_W, OW_H)
  const swing = step === 1 ? -4 : step === 2 ? 4 : 0
  const sleeveCol = a.top === 'tank' ? 'S' : 'A'
  const forearmCol = TEES.has(a.top) || a.top === 'tank' ? 'S' : 'A'
  // riding, the arm reaches forward to hold on
  const elbow: Pt = ride ? [cx - 3, 40] : [cx + 1 + swing * 0.5, 40]
  const hand: Pt = ride ? [cx - 8, 42.5] : [cx + 1 + swing, 45.5]
  capsule(arm, [cx + 1, 35], elbow, 2.8, 2.5, sleeveCol, sleeveCol === 'A' ? 'a' : 's')
  capsule(arm, elbow, [hand[0] + (ride ? 1 : 0), hand[1] - (ride ? 0 : 1.5)], 2.5, 2.2, forearmCol, forearmCol === 'A' ? 'a' : 's')
  oval(arm, hand[0], hand[1], 2.4, 2.4, 'S', 's')
  arm.outline()
  return overlay(g.toPixels(), arm.toPixels())
}

function overlay(base: Pixels, top: Pixels): Pixels {
  return base.map((r, y) => [...r].map((c, x) => (top[y][x] !== '.' ? top[y][x] : c)).join(''))
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
export const RIDER_HIP: [number, number] = [24, 46]

/** Walk cycle order: stand, step A, stand, step B. */
export const WALK_CYCLE = [0, 1, 0, 2] as const
