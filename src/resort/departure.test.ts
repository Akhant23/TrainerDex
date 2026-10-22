/**
 * The departure timeline: phases run in order, the mount moves continuously (no jumps), lands
 * beside the player, carries them away smaller and farther, and ends; both directions mirror.
 */
import { describe, expect, it } from 'vitest'
import { CRUISE_ALT, airScale } from './ambient'
import { DEPARTURE_CRUISE, DEPARTURE_MS, DEPARTURE_TOTAL, departureAt, departureMount, type Departure } from './departure'
import { flightArt } from '../sprites/flight'

const base = (fromLeft: boolean): Departure => ({ t0: 1000, x: 200, y: 300, mount: 'megaphawk', fromLeft })

describe('departure', () => {
  it('keeps its cruising height in step with the flying travellers', () => {
    expect(DEPARTURE_CRUISE).toBe(CRUISE_ALT)
  })

  it('runs prepare → approach → boarding → takeoff → flight → complete, in order', () => {
    const seen: string[] = []
    for (let t = 0; t <= DEPARTURE_TOTAL + 100; t += 25) {
      const p = departureAt(base(true), 1000 + t).phase
      if (seen[seen.length - 1] !== p) seen.push(p)
    }
    expect(seen).toEqual(['prepare', 'approach', 'boarding', 'takeoff', 'flight', 'complete'])
  })

  it('moves smoothly: no jumps in position or height between frames', () => {
    for (const fromLeft of [true, false]) {
      let last = departureAt(base(fromLeft), 1000 + DEPARTURE_MS.prepare)
      for (let t = DEPARTURE_MS.prepare + 16; t <= DEPARTURE_TOTAL; t += 16) {
        const f = departureAt(base(fromLeft), 1000 + t)
        expect(Math.abs(f.x - last.x), `${t}`).toBeLessThan(4)
        expect(Math.abs(f.y - last.y), `${t}`).toBeLessThan(4)
        expect(Math.abs(f.alt - last.alt), `${t}`).toBeLessThan(4)
        last = f
      }
    }
  })

  it('lands beside the player for boarding, then the player is aboard until the end', () => {
    const d = base(false)
    const boarding = departureAt(d, 1000 + DEPARTURE_MS.prepare + DEPARTURE_MS.approach + 10)
    expect(boarding.phase).toBe('boarding')
    expect(boarding.alt).toBe(0)
    expect(Math.abs(boarding.x - d.x)).toBeLessThan(40)
    expect(Math.abs(boarding.x - d.x)).toBeGreaterThan(22) // clear of the player, not on top of them
    expect(boarding.standing).toBe(false)
    const flying = departureAt(d, 1000 + DEPARTURE_TOTAL - 200)
    expect(flying.aboard).toBe(true)
    // farther (north) and higher, so it's drawn smaller as it goes
    expect(flying.y).toBeLessThan(d.y - 200)
    expect(airScale(flying.alt)).toBeLessThan(0.75)
  })

  it('faces the way it flies, and both directions mirror each other', () => {
    for (let t = 0; t < DEPARTURE_TOTAL; t += 200) {
      const l = departureAt(base(true), 1000 + t)
      const r = departureAt(base(false), 1000 + t)
      expect(l.faceRight).toBe(true)
      expect(r.faceRight).toBe(false)
      expect(l.x - 200).toBeCloseTo(-(r.x - 200), 6)
      expect(l.alt).toBeCloseTo(r.alt, 6)
    }
  })

  it('calls a rideable creature: one from the party if there is one', () => {
    expect(departureMount(['byterat', 'hootour'])).toBe('hootour')
    expect(departureMount(['byterat'])).toBe('megaphawk')
    for (const m of ['megaphawk', 'hootour', 'diplomoth'] as const) expect(flightArt[m].saddle).not.toBeNull()
  })
})
