/**
 * Optional per-species attack poses. BW doesn't give every species a unique animation for every
 * move; most moves are carried by the effect and the battler's movement. A few species here get a
 * wind-up frame (anticipation) and a strike frame for their damaging moves, drawn in their own art
 * (see `POSE` in sprites/creatures.ts). Species and moves without a pose keep the plain movement.
 */
import { moves, type MoveId, type SpeciesId } from './data'

export type AttackPoseId = 'windup' | 'strike'

export interface AttackPose {
  /** the wind-up frame shows from the start until this fraction of the time to impact */
  windupUntil: number
  /** the strike frame holds this many ms past the hit, then the creature returns to its idle */
  strikeHold: number
}

export const ATTACK_POSES: Partial<Record<SpeciesId, AttackPose>> = {
  // crouches, ears flat, then bites
  byterat: { windupUntil: 0.55, strikeHold: 240 },
  // wings up high, then a full-volume blast through the megaphone
  megaphawk: { windupUntil: 0.5, strikeHold: 320 },
  // mane bristling, then a roar
  gavelion: { windupUntil: 0.6, strikeHold: 280 },
  // second batch
  helixor: { windupUntil: 0.55, strikeHold: 260 }, // coils, then springs up, tongue out
  brushfox: { windupUntil: 0.55, strikeHold: 260 }, // tail cocked, then the brush sweeps
  subwoof: { windupUntil: 0.5, strikeHold: 300 }, // cone draws in, then pushes out
  strikaroo: { windupUntil: 0.6, strikeHold: 240 }, // tail high, then the kick
  beakerbun: { windupUntil: 0.5, strikeHold: 300 }, // liquid churns, then bubbles burst
  riffin: { windupUntil: 0.55, strikeHold: 280 }, // flipper up, then the strum
  wicketoad: { windupUntil: 0.55, strikeHold: 260 }, // sac swells, then empties
  campfly: { windupUntil: 0.5, strikeHold: 280 }, // lantern blazes, wings snap down
  diplomoth: { windupUntil: 0.5, strikeHold: 300 }, // wings spread, then fold for the gust
  // third batch: held items that move with the wing, and a new rolled-up form
  hootour: { windupUntil: 0.55, strikeHold: 300 }, // flag hoisted and leaned back, then swept forward
  stitchick: { windupUntil: 0.6, strikeHold: 240 }, // needle cocked back, then the jab
  datadillo: { windupUntil: 0.5, strikeHold: 320 }, // head tucks in, then it rolls into an armoured ball
}

export interface PoseStep {
  /** ms from the start of the move */
  at: number
  pose: AttackPoseId | null
}

/**
 * When to show which pose for a move, or null when the species has none for it (status moves
 * never use one). The last step always returns the creature to its idle (`pose: null`).
 */
export function poseTimeline(species: SpeciesId, move: MoveId, impactMs: number): PoseStep[] | null {
  const p = ATTACK_POSES[species]
  if (!p || moves[move].power === 0) return null
  const strikeAt = Math.round(impactMs * p.windupUntil)
  return [
    { at: 0, pose: 'windup' },
    { at: strikeAt, pose: 'strike' },
    { at: Math.round(impactMs + p.strikeHold), pose: null },
  ]
}
