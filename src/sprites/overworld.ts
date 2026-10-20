/**
 * Overworld ("walking") sprites in the Black/White style: 24×32 chibi figures with a big head,
 * three-tone shading and a dark outline, generated from any Appearance (same palette keys as
 * character.ts). Directions: down / up / left (right = left mirrored); frames: stand, step A, step B.
 */
import { Grid, flipX } from './raster.ts'
import type { Pixels } from './pixels.ts'
import type { Appearance } from './character.ts'

export type Facing = 'down' | 'up' | 'left' | 'right'
export const OW_W = 24
export const OW_H = 32
type Step = 0 | 1 | 2

const BLAZER = new Set<Appearance['top']>(['blazer', 'suit', 'school'])
const longSleeves = (a: Appearance) => !['tee', 'jersey', 'tank'].includes(a.top)
const sleeve = (a: Appearance) => (a.top === 'tank' ? 'S' : 'A')
const forearm = (a: Appearance) => (longSleeves(a) ? 'A' : 'S')
const bareLegs = (a: Appearance) => a.bottom === 'shorts' || a.bottom === 'skirt'

/* ---------------- shared parts ---------------- */

function hairBackRound(g: Grid, a: Appearance, cx: number) {
  const big = a.hair === 'wavy' || a.hair === 'curly' || a.hair === 'curtains'
  g.ellipse(cx, 9, big ? 9 : 8.5, big ? 8.5 : 8, a.hair === 'buzz' ? 'j' : 'H', 'j')
  if (a.hair === 'long') g.rect(cx - 8, 10, cx + 8, 20, 'H').rect(cx + 4, 10, cx + 8, 20, 'j')
  if (a.hair === 'bun') g.ellipse(cx, 1.5, 3, 2, 'H', 'j')
  if (a.hair === 'curly') for (const dx of [-8, 8]) g.ellipse(cx + dx, 12, 2.5, 3, 'H', 'j')
}

function hatTop(g: Grid, a: Appearance, cx: number, facing: 'down' | 'up' | 'left') {
  switch (a.hat) {
    case 'none':
      return
    case 'headband':
      g.rect(cx - 8, 6, cx + 8, 7, 'Y')
      return
    case 'cap':
      g.ellipse(cx, 5, 8.5, 4.5, 'Y', 'y')
      if (facing === 'down') g.rect(cx - 7, 7, cx + 7, 8, 'y')
      if (facing === 'left') g.rect(cx - 11, 7, cx - 2, 8, 'y')
      return
    case 'beanie':
      g.ellipse(cx, 5, 8.5, 5, 'Y', 'y')
      g.rect(cx - 8, 7, cx + 8, 9, 'y')
      return
    case 'bucket':
      g.rect(cx - 6, 0, cx + 6, 6, 'Y').rect(cx + 3, 0, cx + 6, 6, 'y')
      g.ellipse(cx, 7, 11, 2, 'y')
  }
}

/** Front hair for the down-facing head: crown + fringe, styled per hair type. */
function fringeFront(g: Grid, a: Appearance) {
  const cx = 12
  g.ellipse(cx, 5.5, 8.5, 4, a.hair === 'buzz' ? 'j' : 'H', 'j', a.hair === 'buzz' ? undefined : 'h')
  switch (a.hair) {
    case 'wavy':
      g.poly([[4, 6], [20, 6], [17.5, 9], [13, 8], [10, 9.4], [6.5, 8.6], [4, 10]], 'H')
      g.set(9, 3, 'h').set(10, 3, 'h').set(15, 5, 'j').set(14, 7, 'j')
      break
    case 'curtains':
      g.poly([[12, 4], [4, 5], [3.5, 15], [5.5, 16], [7, 9], [11.5, 6]], 'H')
      g.poly([[12, 4], [20, 5], [20.5, 15], [18.5, 16], [17, 9], [12.5, 6]], 'j')
      break
    case 'spiky':
      for (const x of [6, 12, 18]) g.poly([[x - 3, 4], [x + 3, 4], [x, -1]], 'H')
      g.poly([[4, 6], [20, 6], [18, 9], [6, 9]], 'H')
      break
    case 'curly':
      for (const x of [5, 9, 13, 17, 20]) g.ellipse(x, 7, 2, 2, 'H', 'j')
      break
    case 'long':
      g.poly([[4, 6], [20, 6], [18, 9], [6, 9]], 'H')
      g.rect(3, 8, 5, 19, 'H').rect(19, 8, 21, 19, 'j')
      break
    case 'short':
      g.poly([[4, 6], [20, 6], [18, 9], [6, 9]], 'H')
      break
  }
}

function body(g: Grid, a: Appearance, back: boolean, x0: number, x1: number) {
  const hem = BLAZER.has(a.top) ? 25 : 24
  g.rect(x0, 17, x1, hem, 'A').rect(x1 - 2, 17, x1, hem, 'a').rect(x0, 18, x0, hem - 1, 'Q')
  if (back) return
  const mid = Math.floor((x0 + x1) / 2)
  switch (a.top) {
    case 'jersey':
      g.rect(x0, 17, x1, 17, 'R').set(mid, 18, 'R').set(mid + 1, 18, 'R')
      g.rect(mid - 2, 20, mid - 1, 21, 'R')
      break
    case 'tee':
      g.rect(mid - 2, 19, mid - 1, 20, 'R')
      break
    case 'hoodie':
      g.rect(mid - 2, 21, mid + 3, 23, 'a').set(mid, 18, 'G').set(mid + 1, 18, 'G')
      break
    case 'jacket':
      g.rect(mid, 17, mid + 1, 19, 'G').rect(mid, 20, mid, hem, 'K')
      break
    case 'shirt':
      g.rect(mid, 17, mid + 1, 22, 'R').set(mid - 1, 17, 'Q').set(mid + 2, 17, 'Q')
      break
    case 'blazer':
    case 'suit':
    case 'school':
      g.rect(mid - 1, 17, mid + 2, 20, a.top === 'suit' ? 'V' : 'G').rect(mid, 17, mid + 1, 21, 'R')
      if (a.top === 'school') g.rect(x0, hem, x1, hem, 'G').set(mid - 2, 18, 'G').set(mid + 3, 18, 'G')
      break
    case 'tank':
      g.rect(x0, 17, x0 + 1, 18, 'S').rect(x1 - 1, 17, x1, 18, 'S')
      break
  }
}

/* ---------------- facing down ---------------- */

function down(a: Appearance, step: Step): Pixels {
  const g = new Grid(OW_W, OW_H)
  const bob = step === 0 ? 0 : 1
  // legs: one leg lifts on each step
  const lift = (left: boolean) => (step === 1 && left) || (step === 2 && !left)
  for (const left of [true, false]) {
    const x = left ? 8 : 13
    const up = lift(left) ? 1 : 0
    if (bareLegs(a)) g.rect(x, 25, x + 2, 26, 'B').rect(x, 27, x + 2, 28 - up, 'S')
    else g.rect(x, 25, x + 2, 28 - up, 'B').rect(x + 2, 25, x + 2, 28 - up, 'b')
    g.rect(x - (left ? 1 : 0), 29 - up, x + 2 + (left ? 0 : 1), 30 - up, 'F').rect(x - (left ? 1 : 0), 30 - up, x + 2 + (left ? 0 : 1), 30 - up, 'f')
  }
  if (a.bottom === 'skirt') g.rect(7, 24, 16, 26, 'B')
  // arms swing opposite to the legs
  for (const [x, d] of [[5, step === 1 ? -1 : step === 2 ? 1 : 0], [17, step === 1 ? 1 : step === 2 ? -1 : 0]] as const) {
    g.rect(x, 18 + d, x + 1, 20 + d, sleeve(a)).rect(x, 21 + d, x + 1, 22 + d, forearm(a)).rect(x, 23 + d, x + 1, 23 + d, 'S')
  }
  body(g, a, false, 7, 16)
  if (a.accessories.includes('bag')) g.rect(15, 21, 18, 24, 'Z')
  // head
  hairBackRound(g, a, 12)
  g.ellipse(4, 11.5, 1.2, 1.8, 'S', 's').ellipse(19, 11.5, 1.2, 1.8, 's')
  g.ellipse(11.5, 11, 7, 6, 'S', undefined, 'T')
  g.rect(16, 8, 18, 15, 's')
  fringeFront(g, a)
  hatTop(g, a, 12, 'down')
  g.outline()
  // face
  if (a.accessories.includes('sunglasses')) g.stamp(6, 11, ['KKKK..KKKK', 'KKKK..KKKK']).set(7, 11, 'l').set(14, 11, 'l')
  else {
    g.rect(8, 11, 8, 12, 'K').rect(15, 11, 15, 12, 'K')
    if (a.accessories.includes('glasses')) g.stamp(6, 10, ['KKKK..KKKK']).set(6, 11, 'K').set(15, 11, 'K').set(10, 11, 'K').set(13, 11, 'K').set(10, 10, 'W').set(17, 10, 'W')
  }
  g.set(11, 14, 'M').set(12, 14, 'M')
  if (a.accessories.includes('earring')) g.set(4, 13, 'X').set(19, 13, 'X')
  if (a.accessories.includes('chain')) g.set(10, 18, 'X').set(11, 19, 'X').set(12, 19, 'X').set(13, 18, 'X')
  if (a.accessories.includes('bag')) g.line(7, 17, 15, 22, 'Z')
  if (a.accessories.includes('scarf')) g.rect(8, 16, 15, 17, 'R')
  return bob ? shiftDown(g.toPixels(), 1) : g.toPixels()
}

/* ---------------- facing up ---------------- */

function up(a: Appearance, step: Step): Pixels {
  const g = new Grid(OW_W, OW_H)
  const lift = (left: boolean) => (step === 1 && left) || (step === 2 && !left)
  for (const left of [true, false]) {
    const x = left ? 8 : 13
    const up = lift(left) ? 1 : 0
    if (bareLegs(a)) g.rect(x, 25, x + 2, 26, 'B').rect(x, 27, x + 2, 28 - up, 'S')
    else g.rect(x, 25, x + 2, 28 - up, 'B')
    g.rect(x, 29 - up, x + 2, 30 - up, 'F')
  }
  if (a.bottom === 'skirt') g.rect(7, 24, 16, 26, 'B')
  for (const [x, d] of [[5, step === 1 ? 1 : step === 2 ? -1 : 0], [17, step === 1 ? -1 : step === 2 ? 1 : 0]] as const) {
    g.rect(x, 18 + d, x + 1, 20 + d, sleeve(a)).rect(x, 21 + d, x + 1, 22 + d, forearm(a)).rect(x, 23 + d, x + 1, 23 + d, 'S')
  }
  body(g, a, true, 7, 16)
  if (a.top === 'hoodie') g.rect(9, 17, 14, 18, 'a')
  hairBackRound(g, a, 12)
  g.ellipse(4, 11.5, 1.2, 1.8, 'S', 's').ellipse(19, 11.5, 1.2, 1.8, 's')
  g.ellipse(12, 10, 8.5, 7, a.hair === 'buzz' ? 'j' : 'H', 'j', a.hair === 'buzz' ? undefined : 'h')
  if (a.hair !== 'long') g.rect(10, 16, 13, 16, 's')
  hatTop(g, a, 12, 'up')
  g.outline()
  if (a.top === 'jersey') g.stamp(10, 19, ['KKK', '..K', '.K.', '.K.'])
  if (a.accessories.includes('bag')) g.line(16, 17, 8, 22, 'Z')
  return step === 0 ? g.toPixels() : shiftDown(g.toPixels(), 1)
}

/* ---------------- facing left ---------------- */

function left(a: Appearance, step: Step): Pixels {
  const g = new Grid(OW_W, OW_H)
  const leg = (x: number, foot: number) => {
    if (bareLegs(a)) g.rect(x, 25, x + 2, 26, 'B').rect(x, 27, x + 2, 28, 'S')
    else g.rect(x, 25, x + 2, 28, 'B')
    g.rect(foot, 29, foot + 3, 30, 'F').rect(foot, 30, foot + 3, 30, 'f')
  }
  if (step === 0) leg(10, 9)
  if (step === 1) {
    leg(13, 13)
    leg(8, 6)
  }
  if (step === 2) {
    leg(11, 10)
    leg(9, 8)
  }
  if (a.bottom === 'skirt') g.rect(8, 24, 15, 26, 'B')
  body(g, a, true, 8, 15)
  if (a.top === 'jersey') g.rect(8, 17, 15, 17, 'R')
  if (BLAZER.has(a.top)) g.rect(8, 17, 9, 20, a.top === 'suit' ? 'V' : 'G')
  // head in profile: hair behind, face toward the left
  g.ellipse(14, 10, 7.5, 7.5, a.hair === 'buzz' ? 'j' : 'H', 'j')
  if (a.hair === 'long') g.rect(12, 10, 19, 20, 'H').rect(16, 10, 19, 20, 'j')
  if (a.hair === 'bun') g.ellipse(17, 3, 2.5, 2, 'H', 'j')
  g.ellipse(9.5, 11, 6, 6, 'S', undefined, 'T')
  g.rect(11, 15, 13, 16, 's')
  g.ellipse(14, 6, 7.5, 4, a.hair === 'buzz' ? 'j' : 'H', 'j', a.hair === 'buzz' ? undefined : 'h')
  if (a.hair !== 'buzz' && a.hair !== 'bun') g.poly([[4, 5], [13, 5], [10, 9], [7, 8], [4, 10]], 'H')
  if (a.hair === 'curtains') g.poly([[5, 6], [9, 6], [7, 14], [5, 13]], 'H')
  g.ellipse(14, 11.5, 1.3, 1.8, 'S', 's')
  hatTop(g, a, 12, 'left')
  g.outline()
  g.set(3, 12, 'S')
  if (a.accessories.includes('sunglasses')) g.rect(4, 11, 7, 12, 'K').rect(8, 11, 13, 11, 'K')
  else {
    g.rect(6, 11, 6, 12, 'K')
    if (a.accessories.includes('glasses')) g.rect(4, 10, 8, 10, 'K').set(8, 11, 'K').rect(9, 10, 13, 10, 'K')
  }
  g.set(5, 14, 'M')
  if (a.accessories.includes('earring')) g.set(14, 13, 'X')
  if (a.accessories.includes('bag')) g.rect(13, 21, 16, 24, 'Z').line(9, 17, 14, 21, 'Z')
  // one visible arm swinging, outlined so it reads over the body
  const arm = new Grid(OW_W, OW_H)
  const ax = step === 1 ? 8 : step === 2 ? 13 : 11
  arm.rect(ax, 18, ax + 1, 20, sleeve(a)).rect(ax, 21, ax + 1, 22, forearm(a)).rect(ax, 23, ax + 1, 23, 'S').set(ax + 1, 19, sleeve(a) === 'A' ? 'a' : 's')
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

/** Walk cycle order: stand, step A, stand, step B. */
export const WALK_CYCLE = [0, 1, 0, 2] as const
