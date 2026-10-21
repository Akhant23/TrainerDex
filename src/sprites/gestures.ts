/**
 * Aaryan's idle gestures for the main menu, as keyframed poses of the layered battle sprite.
 *
 * Each clip is a list of keyframes (a PoseFrame and how long to hold it). Arms are tweened
 * between keyframes with in-between frames so they travel along a path instead of snapping,
 * and every clip starts and ends on the standing idle so it returns cleanly to breathing.
 * Breathing itself is the layered idle loop in CharacterSprite (torso, arms, head and hair rise
 * together a pixel while the legs stay planted).
 */
import type { ArmSpec, PoseFrame, Pt } from './character.ts'

export type GestureId = 'wave' | 'handsBehindHead' | 'ruffleHair' | 'pockets' | 'smirkPoint'

/** The standing idle arms, as articulated specs (to tween from and back to). */
const IDLE_BACK: ArmSpec = { el: [24.2, 54], wr: [24.8, 65.5], hand: 'relaxed' }
const IDLE_FRONT: ArmSpec = { el: [56.4, 53], wr: [51.6, 64], hand: 'pocket' }

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
  return { el: lerpPt(x.el, y.el, k), wr: lerpPt(x.wr, y.wr, k), hand: k < 0.6 ? (x.hand === 'pocket' || x.hand === 'hidden' ? 'fist' : x.hand) : y.hand }
}

/** Expand keyframes into frames: tweened arms in between, face and hair changes on arrival. */
function build(keys: Key[]): GestureFrame[] {
  const out: GestureFrame[] = []
  let prev: PoseFrame = {}
  for (const key of keys) {
    const n = key.tween ?? 2
    for (let i = 1; i <= n; i++) {
      const k = i / (n + 1)
      out.push({
        frame: { ...prev, back: lerpArm(prev.back, key.frame.back, IDLE_BACK, k), front: lerpArm(prev.front, key.frame.front, IDLE_FRONT, k), armsBehind: k > 0.5 ? key.frame.armsBehind : prev.armsBehind },
        ms: 70,
      })
    }
    out.push({ frame: key.frame, ms: key.hold })
    prev = key.frame
  }
  return out
}

const IDLE: PoseFrame = {}

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
  // glances down, digs in the other pocket, finds nothing, carries on
  pockets: build([
    { frame: { eyes: 'down', tilt: 1 }, hold: 260, tween: 0 },
    { frame: { eyes: 'down', tilt: 1, back: { el: [25, 55], wr: [30, 63], hand: 'fist' } }, hold: 60, tween: 2 },
    { frame: { eyes: 'down', tilt: 1, back: { el: [26, 56], wr: [32, 66], hand: 'pocket' } }, hold: 180, tween: 1 },
    { frame: { eyes: 'down', tilt: 1, back: { el: [26, 55], wr: [33, 65], hand: 'pocket' } }, hold: 160, tween: 0 },
    { frame: { eyes: 'down', tilt: 1, back: { el: [26, 56], wr: [32, 67], hand: 'pocket' } }, hold: 160, tween: 0 },
    { frame: { eyes: 'down', tilt: 1, back: { el: [26, 55], wr: [33, 65], hand: 'pocket' } }, hold: 220, tween: 0 },
    { frame: { tilt: 0, back: { el: [25, 55], wr: [29, 63], hand: 'relaxed' } }, hold: 120, tween: 1 },
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

/** How often each gesture comes up while idling (wave is mostly saved for when you tap him). */
export const GESTURE_WEIGHTS: Record<GestureId, number> = { ruffleHair: 3, pockets: 3, handsBehindHead: 3, smirkPoint: 2, wave: 1 }

export const gestureLength = (id: GestureId) => GESTURES[id].reduce((t, f) => t + f.ms, 0)
