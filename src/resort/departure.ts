/**
 * Leaving the Battle Resort by air, BW2-style: a flying creature swoops in, lands beside you, you
 * hop onto its back, it takes off and flies away over the resort until it's gone.
 *
 * This module is the timeline only: given when the departure started and where, it says which
 * phase it's in and where everything is (world pixels), as a pure function of elapsed time, so
 * the sequence plays the same at any frame rate and can be tested without a browser. Resort.tsx
 * runs the prompt, locks input, draws what this returns, and navigates when it's done.
 */
import type { SpeciesId } from '../battle/data'

export type DeparturePhase = 'prepare' | 'approach' | 'boarding' | 'takeoff' | 'flight' | 'complete'

/** Phase lengths (ms). */
export const DEPARTURE_MS: Record<Exclude<DeparturePhase, 'complete'>, number> = {
  prepare: 600,
  approach: 2200,
  boarding: 700,
  takeoff: 1100,
  flight: 2800,
}
const ORDER: Array<Exclude<DeparturePhase, 'complete'>> = ['prepare', 'approach', 'boarding', 'takeoff', 'flight']
export const DEPARTURE_TOTAL = ORDER.reduce((t, p) => t + DEPARTURE_MS[p], 0)

/** Mounts big enough to carry a trainer, in order of preference when the party has none. */
export const DEPARTURE_MOUNTS: SpeciesId[] = ['megaphawk', 'hootour', 'diplomoth']

export interface Departure {
  t0: number
  /** the player's feet (world px) when they said yes */
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

export interface DepartureFrame {
  phase: DeparturePhase
  /** 0–1 through the current phase */
  k: number
  /** the mount's spot on the ground below it (world px) and its height above it */
  x: number
  y: number
  alt: number
  faceRight: boolean
  /** the player has boarded (draw them as the rider) */
  aboard: boolean
  /** while boarding: 0–1 along the hop from where they stood onto the saddle */
  hop: number
  /** the player's own sprite is still standing on the ground */
  standing: boolean
}

const ease = (x: number) => x * x * (3 - 2 * x)
const easeOut = (x: number) => 1 - (1 - x) * (1 - x)
const easeIn = (x: number) => x * x

/** Cruising height of a flying traveller (the same as CRUISE_ALT in ambient.ts; a test keeps them equal). */
export const DEPARTURE_CRUISE = 150

/** Where the mount lands: beside the player (clear of them: its body is ~44 px wide), on the side it came from. */
const LAND_DX = 30
/** How far off to the side it starts, and how high. */
const APPROACH_DX = 150
const APPROACH_ALT = DEPARTURE_CRUISE * 0.7
/** Take-off climbs this high; the flight away climbs on to cruising height. */
const TAKEOFF_ALT = 46
/** Flying away: on across the resort and north, past the far edge of the map. */
const AWAY_DX = 140
const AWAY_DY = 300

export function departureAt(d: Departure, now: number): DepartureFrame {
  const side = d.fromLeft ? -1 : 1
  const faceRight = d.fromLeft
  const landX = d.x + side * LAND_DX
  let t = now - d.t0
  for (const phase of ORDER) {
    const len = DEPARTURE_MS[phase]
    if (t < len) {
      const k = Math.max(0, t / len)
      switch (phase) {
        case 'prepare':
          return { phase, k, x: landX + side * APPROACH_DX, y: d.y, alt: APPROACH_ALT, faceRight, aboard: false, hop: 0, standing: true }
        case 'approach': {
          // glide in from off to the side and settle onto the ground beside the player
          const e = easeOut(k)
          return { phase, k, x: landX + side * APPROACH_DX * (1 - e), y: d.y, alt: APPROACH_ALT * (1 - e), faceRight, aboard: false, hop: 0, standing: true }
        }
        case 'boarding':
          return { phase, k, x: landX, y: d.y, alt: 0, faceRight, aboard: false, hop: ease(k), standing: false }
        case 'takeoff': {
          // a gradual lift with a little forward drift
          const e = ease(k)
          return { phase, k, x: landX - side * 10 * e, y: d.y, alt: TAKEOFF_ALT * e, faceRight, aboard: true, hop: 1, standing: false }
        }
        case 'flight': {
          // on across the resort and away north (farther from the camera: smaller and higher)
          const e = easeIn(k)
          return { phase, k, x: landX - side * (10 + AWAY_DX * e), y: d.y - AWAY_DY * e, alt: TAKEOFF_ALT + (DEPARTURE_CRUISE - TAKEOFF_ALT) * ease(k), faceRight, aboard: true, hop: 1, standing: false }
        }
      }
    }
    t -= len
  }
  return { phase: 'complete', k: 1, x: landX - side * (10 + AWAY_DX), y: d.y - AWAY_DY, alt: DEPARTURE_CRUISE, faceRight, aboard: true, hop: 1, standing: false }
}
