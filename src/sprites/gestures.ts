/**
 * Aaryan's idle gestures for the main menu, as keyframed poses of the layered battle sprite.
 *
 * Each clip is a list of keyframes (a PoseFrame and how long to hold it). Arms are tweened
 * between keyframes with in-between frames so they travel along a path instead of snapping,
 * and every clip starts and ends on the standing idle so it returns cleanly to breathing.
 * Breathing itself is the layered idle loop in CharacterSprite (torso, arms, head and hair rise
 * together a pixel while the legs stay planted).
 */
import { GLASSES_ON_FACE, type ArmSpec, type Held, type PoseFrame, type Pt } from './character.ts'

export type GestureId = 'wave' | 'handsBehindHead' | 'ruffleHair' | 'cleanGlasses' | 'smirkPoint' | 'pointMenu'

/** The standing idle arms, as articulated specs (to tween from and back to). */
const IDLE_BACK: ArmSpec = { el: [25.4, 54], wr: [25.8, 65.5], hand: 'relaxed' }
const IDLE_FRONT: ArmSpec = { el: [56.4, 53], wr: [51.6, 64], hand: 'hooked' }

interface Key {
  frame: PoseFrame
  /** ms to hold this keyframe once it's reached */
  hold: number
  /** in-between frames on the way here from the previous key */
  tween?: number
}

export interface GestureFrame {
  frame: PoseFrame
  ms: number
}

const lerpPt = (a: Pt, b: Pt, k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
function lerpArm(a: ArmSpec | undefined, b: ArmSpec | undefined, idle: ArmSpec, k: number): ArmSpec | undefined {
  if (!a && !b) return undefined
  const x = a ?? idle
  const y = b ?? idle
  // the hand takes the shape it's heading to once it's most of the way there
  return { el: lerpPt(x.el, y.el, k), wr: lerpPt(x.wr, y.wr, k), hand: k < 0.6 ? (x.hand === 'pocket' || x.hand === 'hooked' || x.hand === 'hidden' ? 'fist' : x.hand) : y.hand }
}

/**
 * What's held, part way between two keys: a thing held in both moves with the hand; one that's
 * picked up or put down appears or goes on arrival.
 */
function lerpHeld(a: Held | undefined, b: Held | undefined, k: number): Held | undefined {
  if (!a && !b) return undefined
  const out: Held = {}
  for (const what of ['glasses', 'cloth'] as const) {
    const p = a?.[what]
    const q = b?.[what]
    if (p && q) out[what] = lerpPt(p, q, k)
    else if (p) out[what] = p
  }
  return Object.keys(out).length ? out : undefined
}

/** Expand keyframes into frames: tweened arms (and anything they hold) in between, face and hair changes on arrival. */
function build(keys: Key[]): GestureFrame[] {
  const out: GestureFrame[] = []
  let prev: PoseFrame = {}
  for (const key of keys) {
    const n = key.tween ?? 2
    for (let i = 1; i <= n; i++) {
      const k = i / (n + 1)
      out.push({
        frame: { ...prev, back: lerpArm(prev.back, key.frame.back, IDLE_BACK, k), front: lerpArm(prev.front, key.frame.front, IDLE_FRONT, k), armsBehind: k > 0.5 ? key.frame.armsBehind : prev.armsBehind, held: lerpHeld(prev.held, key.frame.held, k) },
        ms: 70,
      })
    }
    out.push({ frame: key.frame, ms: key.hold })
    prev = key.frame
  }
  return out
}

const IDLE: PoseFrame = {}

function cleanGlasses(): Key[] {
  // the hand at the temple, pinching the glasses' arm (beside the head, so it stays in view)
  const temple: ArmSpec = { el: [61, 40], wr: [55, 24], hand: 'fist' }
  const face = GLASSES_ON_FACE
  // held low in front of the chest, below the chin, to clean
  const low: Pt = [43, 48]
  const holdLow: ArmSpec = { el: [60, 53], wr: [51, 50], hand: 'fist' }
  const wipe = (x: number, y: number): PoseFrame => ({
    glasses: 'off', eyes: 'down', tilt: 1, mouth: 'calm', front: holdLow,
    back: { el: [24, 52], wr: [x - 2, y + 2], hand: 'fist' }, held: { glasses: low, cloth: [x, y] },
  })
  return [
    { frame: { front: temple }, hold: 140, tween: 3 },
    // off: the glasses leave the face with the hand
    { frame: { glasses: 'off', front: temple, held: { glasses: face } }, hold: 60, tween: 0 },
    { frame: { glasses: 'off', eyes: 'down', front: holdLow, held: { glasses: low } }, hold: 120, tween: 3 },
    // the other hand comes up with the cloth and wipes across the lenses
    { frame: { glasses: 'off', eyes: 'down', tilt: 1, mouth: 'calm', front: holdLow, back: { el: [24, 53], wr: [30, 52], hand: 'fist' }, held: { glasses: low, cloth: [33, 50] } }, hold: 80, tween: 2 },
    { frame: wipe(37, 48), hold: 110, tween: 1 },
    { frame: wipe(47, 48), hold: 110, tween: 1 },
    { frame: wipe(37, 47), hold: 110, tween: 1 },
    { frame: wipe(47, 48), hold: 110, tween: 1 },
    { frame: wipe(38, 48), hold: 110, tween: 1 },
    // cloth away, glasses held up to the light for a look
    { frame: { glasses: 'off', mouth: 'calm', front: { el: [62, 46], wr: [54, 36], hand: 'fist' }, held: { glasses: [44, 33] } }, hold: 520, tween: 3 },
    // and back on
    { frame: { glasses: 'off', front: temple, held: { glasses: face } }, hold: 90, tween: 3 },
    { frame: { front: temple }, hold: 120, tween: 0 },
    { frame: IDLE, hold: 80, tween: 3 },
  ]
}

export const GESTURES: Record<GestureId, GestureFrame[]> = {
  // lifts the free hand from the pocket and waves: palm out, three swings, back down
  wave: build([
    { frame: { front: { el: [61, 36], wr: [63, 22], hand: 'open' } }, hold: 120, tween: 3 },
    { frame: { front: { el: [61, 36], wr: [59, 22], hand: 'open' } }, hold: 130, tween: 1 },
    { frame: { front: { el: [61, 36], wr: [66, 23], hand: 'open' } }, hold: 130, tween: 1 },
    { frame: { front: { el: [61, 36], wr: [59, 22], hand: 'open' } }, hold: 130, tween: 1 },
    { frame: { front: { el: [61, 36], wr: [66, 23], hand: 'open' } }, hold: 130, tween: 1 },
    { frame: { front: { el: [61, 36], wr: [62, 22], hand: 'open' }, mouth: 'grin' }, hold: 260, tween: 1 },
    { frame: IDLE, hold: 80, tween: 3 },
  ]),
  // both hands up behind the head, elbows wide: a relaxed lean, eyes closed for a moment
  handsBehindHead: build([
    { frame: { back: { el: [19, 36], wr: [24, 27], hand: 'fist' }, front: { el: [61, 36], wr: [56, 27], hand: 'fist' } }, hold: 60, tween: 2 },
    { frame: { back: { el: [16, 28], wr: [30, 17], hand: 'hidden' }, front: { el: [64, 28], wr: [50, 17], hand: 'hidden' }, armsBehind: true }, hold: 900, tween: 2 },
    { frame: { back: { el: [16, 28], wr: [30, 17], hand: 'hidden' }, front: { el: [64, 28], wr: [50, 17], hand: 'hidden' }, armsBehind: true, eyes: 'closed' }, hold: 700, tween: 0 },
    { frame: { back: { el: [16, 28], wr: [30, 17], hand: 'hidden' }, front: { el: [64, 28], wr: [50, 17], hand: 'hidden' }, armsBehind: true }, hold: 300, tween: 0 },
    { frame: IDLE, hold: 80, tween: 3 },
  ]),
  // a hand up into the fringe, ruffling it back and forth, then down again
  ruffleHair: build([
    { frame: { front: { el: [62, 32], wr: [55, 13], hand: 'open' } }, hold: 90, tween: 3 },
    { frame: { front: { el: [62, 32], wr: [52, 12], hand: 'open' }, ruffle: 1 }, hold: 140, tween: 1 },
    { frame: { front: { el: [62, 32], wr: [56, 13], hand: 'open' }, ruffle: 2 }, hold: 140, tween: 1 },
    { frame: { front: { el: [62, 32], wr: [52, 12], hand: 'open' }, ruffle: 1 }, hold: 140, tween: 1 },
    { frame: { front: { el: [62, 32], wr: [56, 13], hand: 'open' }, ruffle: 2 }, hold: 180, tween: 1 },
    { frame: { ruffle: 1 }, hold: 200, tween: 3 },
    { frame: IDLE, hold: 80, tween: 0 },
  ]),
  // takes his glasses off by the arm, wipes the lenses with a cloth, holds them up to check,
  // and puts them back on. The free hand comes out of the pocket to do it; whatever's held
  // travels with the hand between keyframes.
  cleanGlasses: build(cleanGlasses()),
  // on the main menu, when the cursor settles on a tile: a grin and a point out toward the menu
  // (his front arm thrust out to your right, as on the VS screen), then back to idle
  pointMenu: build([
    { frame: { front: { el: [60, 47], wr: [64, 44], hand: 'fist' } }, hold: 60, tween: 2 },
    { frame: { front: { el: [61, 44], wr: [69.5, 41], hand: 'pointOut' }, mouth: 'grin', brow: 'up' }, hold: 860, tween: 1 },
    { frame: { front: { el: [60, 47], wr: [64, 44], hand: 'fist' } }, hold: 70, tween: 1 },
    { frame: IDLE, hold: 80, tween: 2 },
  ]),
  // a smirk, then a point straight at you, a beat, and back to idle
  smirkPoint: build([
    { frame: { mouth: 'smirk', brow: 'up' }, hold: 420, tween: 0 },
    { frame: { mouth: 'smirk', brow: 'up', front: { el: [60, 51], wr: [56, 52], hand: 'fist' } }, hold: 60, tween: 2 },
    { frame: { mouth: 'smirk', brow: 'up', front: { el: [59, 49], wr: [50, 53], hand: 'pointOut' } }, hold: 1100, tween: 1 },
    { frame: { mouth: 'smirk', front: { el: [60, 51], wr: [56, 52], hand: 'fist' } }, hold: 80, tween: 1 },
    { frame: IDLE, hold: 80, tween: 2 },
  ]),
}

/** How often each gesture comes up while idling; 0 = only on request (pointMenu answers the menu cursor). */
export const GESTURE_WEIGHTS: Record<GestureId, number> = { ruffleHair: 3, cleanGlasses: 3, handsBehindHead: 3, smirkPoint: 2, wave: 1, pointMenu: 0 }

export const gestureLength = (id: GestureId) => GESTURES[id].reduce((t, f) => t + f.ms, 0)
