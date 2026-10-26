/**
 * Trainer poses for the VS screen. In Black and White the trainer on the VS card isn't just
 * standing there: each one strikes their own pose as the card slams in. Here each side gets a
 * wind-up (held while the bands slide in) and a strike (snapped to on the impact flash), drawn as
 * PoseFrames of the layered battle sprite, so every look wears them with no extra art.
 *
 * Arm coordinates are design pixels on the 80×120 sprite (see SHOULDER in character.ts); the
 * front arm is the trainer's right, on the viewer's right.
 */
import type { PoseFrame } from '../sprites/character.ts'
import { HANDS_BEHIND_HEAD } from '../sprites/gestures.ts'

export interface VsPose {
  id: string
  /** held while the band slides in */
  windup: PoseFrame
  /** snapped to on impact and held to the end */
  strike: PoseFrame
}

const fistRaised: PoseFrame = { front: { el: [60, 47], wr: [64, 44], hand: 'fist' }, mouth: 'calm' }

export const VS_POSES = {
  // a finger levelled at the other side, a raised brow
  callOut: {
    id: 'callOut',
    windup: fistRaised,
    strike: { front: { el: [61, 44], wr: [69.5, 41], hand: 'pointOut' }, mouth: 'smirk', brow: 'up' },
  },
  // arms folded, then one hand comes up in a "come on" beckon
  unbothered: {
    id: 'unbothered',
    windup: { back: { el: [25, 53], wr: [47, 51], hand: 'hidden' }, front: { el: [55, 53], wr: [33, 51], hand: 'fist' }, mouth: 'calm' },
    strike: { back: { el: [25, 53], wr: [47, 51], hand: 'hidden' }, front: { el: [61, 46], wr: [65, 36], hand: 'open' }, mouth: 'smirk', brow: 'up' },
  },
  // fists up, then one thrown high
  fired: {
    id: 'fired',
    windup: { back: { el: [22, 50], wr: [28, 42], hand: 'fist' }, front: { el: [58, 50], wr: [52, 42], hand: 'fist' }, mouth: 'calm' },
    strike: { back: { el: [22, 50], wr: [28, 42], hand: 'fist' }, front: { el: [60, 32], wr: [62, 19], hand: 'fist' }, mouth: 'grin' },
  },
  // hands behind the head, easy, then one finger up to the sky: number one
  coolHand: {
    id: 'coolHand',
    windup: { ...HANDS_BEHIND_HEAD, mouth: 'smirk' },
    strike: { back: HANDS_BEHIND_HEAD.back, front: { el: [61, 40], wr: [70, 32], hand: 'pointOut' }, mouth: 'grin', brow: 'up' },
  },
} satisfies Record<string, VsPose>

export type VsPoseId = keyof typeof VS_POSES

/**
 * The challenger's pose, and the opponent's by who they are: the Champion folds his arms and
 * beckons; each tower floor (keyed by its tag) gets its own; anyone else, a stable pick from
 * their name, so a rematch looks the same but different trainers don't.
 */
export function vsPosesFor(foeKey: string, champion: boolean): { me: VsPose; foe: VsPose } {
  if (champion) return { me: VS_POSES.fired, foe: VS_POSES.unbothered }
  const pool: VsPoseId[] = ['callOut', 'coolHand', 'fired', 'unbothered']
  let h = 0
  for (const ch of foeKey) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const foe = VS_POSES[pool[h % pool.length]]
  // never the same pose both sides
  const me = foe.id === 'callOut' ? VS_POSES.fired : VS_POSES.callOut
  return { me, foe }
}
