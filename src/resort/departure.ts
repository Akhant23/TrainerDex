/**
 * Travelling by air, BW2-style. Leaving: a flying creature swoops in, lands beside the trainer,
 * they hop onto its back, it takes off and flies away over the resort until it's gone. Arriving
 * (visiting trainers): the mount glides in and lands, the rider hops off onto their spot, and the
 * mount takes off again on its own.
 *
 * This module is the timeline only: given when it started and where, it says which phase it's in
 * and where everything is (world pixels), as a pure function of elapsed time, so it plays the same
 * at any frame rate and can be tested without a browser. ambient.ts draws what this returns;
 * Resort.tsx runs the prompt, locks input and navigates when the player's departure is done.
 */
import type { SpeciesId } from '../battle/data'

export type DeparturePhase = 'prepare' | 'approach' | 'boarding' | 'takeoff' | 'flight' | 'complete'
export type ArrivalPhase = 'approach' | 'alighting' | 'takeoff' | 'flight' | 'complete'

/** Phase lengths (ms). Chosen for this site; BW2's Fly cut-in wasn't measured (docs/GEN5-TIMING.md). */
export const DEPARTURE_MS: Record<Exclude<DeparturePhase, 'complete'>, number> = {
  prepare: 600,
  approach: 2200,
  boarding: 700,
  takeoff: 1100,
  flight: 2800,
}
const ORDER: Array<Exclude<DeparturePhase, 'complete'>> = ['prepare', 'approach', 'boarding', 'takeoff', 'flight']
export const DEPARTURE_TOTAL = ORDER.reduce((t, p) => t + DEPARTURE_MS[p], 0)
/** When the trainer leaves the ground (the hop starts): until then they're an ordinary walker. */
export const DEPARTURE_BOARD_AT = DEPARTURE_MS.prepare + DEPARTURE_MS.approach

/** A visiting trainer flying in: the mount lands, they hop off, it flies away empty. */
export const ARRIVAL_MS: Record<Exclude<ArrivalPhase, 'complete'>, number> = {
  approach: 2600,
  alighting: 700,
  takeoff: 1100,
  flight: 2400,
}
const ARRIVAL_ORDER: Array<Exclude<ArrivalPhase, 'complete'>> = ['approach', 'alighting', 'takeoff', 'flight']
export const ARRIVAL_TOTAL = ARRIVAL_ORDER.reduce((t, p) => t + ARRIVAL_MS[p], 0)
/** When the rider's feet touch their spot: from then on they're an ordinary walker. */
export const ARRIVAL_HANDOFF = ARRIVAL_MS.approach + ARRIVAL_MS.alighting

/**
 * A visitor leaving by air leaves the world's walker list this long (ms) before their hop starts,
 * so the list (which updates a frame or two late) has caught up by then; in between, the trip
 * draws them standing (ambient.ts).
 */
export const HANDOVER_MS = 250

/** Mounts big enough to carry a trainer, in order of preference when the party has none. */
export const DEPARTURE_MOUNTS: SpeciesId[] = ['megaphawk', 'hootour', 'diplomoth']

export interface Departure {
  t0: number
  /** the trainer's feet (world px): where they stand to board, or the spot they hop down onto */
  x: number
  y: number
  mount: SpeciesId
  /** the mount flies in from the left (so it faces right) or from the right */
  fromLeft: boolean
}

/** Which mount comes: the first rideable creature in the party, else Megaphawk. */
export function departureMount(party: readonly string[]): SpeciesId {
  return (party.find((p) => DEPARTURE_MOUNTS.includes(p as SpeciesId)) as SpeciesId | undefined) ?? 'megaphawk'
}

export interface MountFrame<P extends string = DeparturePhase> {
  phase: P
  /** 0–1 through the current phase */
  k: number
  /** the mount's spot on the ground below it (world px) and its height above it */
  x: number
  y: number
  alt: number
  faceRight: boolean
  /** the trainer is seated on the mount (drawn as the rider) */
  aboard: boolean
  /** 0 on the ground → 1 seated: where the hop between them is (boarding runs it forwards, alighting backwards) */
  hop: number
  /** the trainer's own walker is standing on the ground (drawn by the world, not by the mount) */
  standing: boolean
  /** how far the mount sinks under the trainer's weight as they land on it (world px, 0–1) */
  dip: number
  /** 1 → 0 as it disappears into the distance */
  fade: number
  /**
   * 0 → 1 as it turns from the side view to the rear view (flying away from you), over a short
   * cross-fade while its course bends north: a deliberate change of view, not an animated turn.
   */
  back: number
}
export type DepartureFrame = MountFrame<DeparturePhase>
export type ArrivalFrame = MountFrame<ArrivalPhase>

const ease = (x: number) => x * x * (3 - 2 * x)
const easeOut = (x: number) => 1 - (1 - x) * (1 - x)
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

/** Cruising height of a flying traveller (the same as CRUISE_ALT in ambient.ts; a test keeps them equal). */
export const DEPARTURE_CRUISE = 150

/** Where the mount lands: beside the trainer (clear of them: its body is ~44 px wide), on the side it came from. */
export const LAND_DX = 30
/** How far off to the side it starts, and how high. */
const APPROACH_DX = 150
const APPROACH_ALT = DEPARTURE_CRUISE * 0.7
/** Flying away: on across the resort in the direction it faces, curving north past the far edge of the map. */
const AWAY_DX = 120
const AWAY_DY = 320
/** Where in the hop (0–1) the trainer changes pose: in the air, hips just above the saddle. */
export const HOP_SWAP = 0.78
/**
 * The change to the rear view, over `u` (take-off + flight): from TURN_AT for TURN_LEN (≈140 ms),
 * as the sideways drift gives way to flying north. The drift finishes by DRIFT_END, so once it's
 * facing away it's flying away, not sliding sideways.
 */
export const TURN_AT = 0.4
export const TURN_LEN = 0.036
const DRIFT_END = 0.55

/**
 * Taking off and flying away, as one curve over `u` (0–1 across take-off + flight), so speed and
 * climb never stall at the phase change: a gradual lift that carries on in the direction it faces,
 * then bends north (away from the camera) as the sideways drift eases off, and fades out as it
 * reaches the far distance, so it's gone when the sequence ends rather than popping out.
 */
function away(u: number) {
  const drift = AWAY_DX * ease(clamp01(u / DRIFT_END))
  const north = AWAY_DY * clamp01((u - 0.25) / 0.75) ** 2
  const alt = DEPARTURE_CRUISE * ease(u)
  const fade = 1 - ease(clamp01((u - 0.8) / 0.2))
  const back = clamp01((u - TURN_AT) / TURN_LEN)
  return { drift, north, alt, fade, back }
}

/** The mount gliding in from off to the side and settling onto the ground at `landX`. */
function approach(k: number, landX: number, side: number, alt0: number) {
  const e = easeOut(k)
  return { x: landX + side * APPROACH_DX * (1 - e), alt: alt0 * (1 - e) }
}

/** The mount sinking a pixel as the trainer lands on (or pushes off from) its back. */
const dipAt = (hop: number) => (hop < HOP_SWAP ? 0 : Math.sin((Math.PI * (hop - HOP_SWAP)) / (1 - HOP_SWAP)))

export function departureAt(d: Departure, now: number): DepartureFrame {
  const side = d.fromLeft ? -1 : 1
  const faceRight = d.fromLeft
  const landX = d.x + side * LAND_DX
  const still = { faceRight, dip: 0, fade: 1, back: 0 }
  let t = now - d.t0
  for (const phase of ORDER) {
    const len = DEPARTURE_MS[phase]
    if (t < len) {
      const k = Math.max(0, t / len)
      switch (phase) {
        case 'prepare':
          return { phase, k, x: landX + side * APPROACH_DX, y: d.y, alt: APPROACH_ALT, aboard: false, hop: 0, standing: true, ...still }
        case 'approach':
          return { phase, k, ...approach(k, landX, side, APPROACH_ALT), y: d.y, aboard: false, hop: 0, standing: true, ...still }
        case 'boarding':
          return { phase, k, x: landX, y: d.y, alt: 0, aboard: k >= HOP_SWAP, hop: k, standing: false, ...still, dip: dipAt(k) }
        case 'takeoff':
        case 'flight': {
          const u = (phase === 'takeoff' ? t : DEPARTURE_MS.takeoff + t) / (DEPARTURE_MS.takeoff + DEPARTURE_MS.flight)
          const a = away(u)
          return { phase, k, x: landX - side * a.drift, y: d.y - a.north, alt: a.alt, aboard: true, hop: 1, standing: false, faceRight, dip: 0, fade: a.fade, back: a.back }
        }
      }
    }
    t -= len
  }
  const a = away(1)
  return { phase: 'complete', k: 1, x: landX - side * a.drift, y: d.y - a.north, alt: a.alt, aboard: true, hop: 1, standing: false, faceRight, dip: 0, fade: 0, back: 1 }
}

/**
 * A visiting trainer arriving by air at their spot (d.x, d.y): the mount lands beside it, on the
 * side it came from and facing the spot, the rider hops forward off its back onto the spot, and
 * the mount carries on and flies away empty.
 */
export function arrivalAt(d: Departure, now: number): ArrivalFrame {
  const side = d.fromLeft ? -1 : 1
  const faceRight = d.fromLeft
  const landX = d.x + side * LAND_DX
  const still = { faceRight, dip: 0, fade: 1, back: 0 }
  let t = now - d.t0
  for (const phase of ARRIVAL_ORDER) {
    const len = ARRIVAL_MS[phase]
    if (t < len) {
      const k = Math.max(0, t / len)
      switch (phase) {
        case 'approach':
          return { phase, k, ...approach(k, landX, side, DEPARTURE_CRUISE), y: d.y, aboard: true, hop: 1, standing: false, ...still }
        case 'alighting': {
          const hop = 1 - k
          return { phase, k, x: landX, y: d.y, alt: 0, aboard: hop >= HOP_SWAP, hop, standing: false, ...still, dip: dipAt(hop) }
        }
        case 'takeoff':
        case 'flight': {
          // on the way it was going, over the spot and beyond, so it doesn't double back
          const u = (phase === 'takeoff' ? t : ARRIVAL_MS.takeoff + t) / (ARRIVAL_MS.takeoff + ARRIVAL_MS.flight)
          const a = away(u)
          return { phase, k, x: landX - side * a.drift, y: d.y - a.north, alt: a.alt, aboard: false, hop: 0, standing: true, faceRight, dip: 0, fade: a.fade, back: a.back }
        }
      }
    }
    t -= len
  }
  const a = away(1)
  return { phase: 'complete', k: 1, x: landX - side * a.drift, y: d.y - a.north, alt: a.alt, aboard: false, hop: 0, standing: true, faceRight, dip: 0, fade: 0, back: 1 }
}

/**
 * Which side the mount should come from: the preferred side unless the two tiles it lands on
 * there are blocked (a wall, a tree, the map edge) and the other side's are clear.
 * `blocked(tx, ty)` answers for one tile.
 */
export function landingSide(tx: number, ty: number, preferLeft: boolean, blocked: (x: number, y: number) => boolean): boolean {
  const clear = (s: number) => !blocked(tx + s, ty) && !blocked(tx + 2 * s, ty)
  const pref = preferLeft ? -1 : 1
  if (clear(pref) || !clear(-pref)) return preferLeft
  return !preferLeft
}
