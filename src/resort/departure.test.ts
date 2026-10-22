/**
 * The departure timeline: phases run in order, the mount moves continuously (no jumps), lands
 * beside the player, carries them away smaller and farther, and ends; both directions mirror.
 */
import { describe, expect, it } from 'vitest'
import { CRUISE_ALT, airScale } from './ambient'
import { ARRIVAL_HANDOFF, ARRIVAL_MS, ARRIVAL_TOTAL, arrivalAt, DEPARTURE_BOARD_AT, DEPARTURE_CRUISE, DEPARTURE_MS, DEPARTURE_TOTAL, departureAt, departureMount, HOP_SWAP, landingSide, LAND_DX, type Departure } from './departure'
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

  it('takes off without stalling: climbs and moves on steadily from the ground to the end', () => {
    for (const fromLeft of [true, false]) {
      const d = base(fromLeft)
      const start = DEPARTURE_BOARD_AT + DEPARTURE_MS.boarding
      let last = departureAt(d, 1000 + start)
      let lastStep = 0
      for (let t = start + 16; t < DEPARTURE_TOTAL; t += 16) {
        const f = departureAt(d, 1000 + t)
        expect(f.alt, `${t}`).toBeGreaterThanOrEqual(last.alt)
        // the speed changes gradually (no lurch at the take-off → flight change)
        const step = Math.hypot(f.x - last.x, f.y - last.y, f.alt - last.alt)
        expect(Math.abs(step - lastStep), `${t}`).toBeLessThan(0.25)
        lastStep = step
        last = f
      }
    }
  })

  it('fades into the distance and is gone exactly when it ends', () => {
    const d = base(true)
    let last = 1
    for (let t = 0; t < DEPARTURE_TOTAL; t += 16) {
      const f = departureAt(d, 1000 + t).fade
      expect(f).toBeLessThanOrEqual(last + 1e-12)
      last = f
    }
    expect(departureAt(d, 1000 + DEPARTURE_TOTAL - 2000).fade).toBe(1)
    expect(departureAt(d, 1000 + DEPARTURE_TOTAL - 1).fade).toBeLessThan(0.01)
    expect(departureAt(d, 1000 + DEPARTURE_TOTAL).fade).toBe(0)
  })

  it('boards in one hop: on the ground, then seated from the pose change, with the mount sinking a pixel', () => {
    const d = base(true)
    for (let t = 0; t <= DEPARTURE_MS.boarding; t += 10) {
      const f = departureAt(d, 1000 + DEPARTURE_BOARD_AT + t)
      if (f.phase !== 'boarding') continue
      expect(f.aboard).toBe(f.hop >= HOP_SWAP)
      expect(f.dip).toBeGreaterThanOrEqual(0)
      expect(f.dip).toBeLessThanOrEqual(1)
      if (f.hop < HOP_SWAP) expect(f.dip).toBe(0)
    }
    expect(departureAt(d, 1000 + DEPARTURE_BOARD_AT - 1).standing).toBe(true)
    expect(departureAt(d, 1000 + DEPARTURE_BOARD_AT + 1).standing).toBe(false)
  })
})

describe('arrival (visiting trainers)', () => {
  const arr = (fromLeft: boolean): Departure => ({ t0: 0, x: 200, y: 300, mount: 'hootour', fromLeft })

  it('runs approach → alighting → takeoff → flight → complete, handing over when their feet touch down', () => {
    const seen: string[] = []
    for (let t = 0; t <= ARRIVAL_TOTAL + 100; t += 25) {
      const p = arrivalAt(arr(true), t).phase
      if (seen[seen.length - 1] !== p) seen.push(p)
    }
    expect(seen).toEqual(['approach', 'alighting', 'takeoff', 'flight', 'complete'])
    expect(ARRIVAL_HANDOFF).toBe(ARRIVAL_MS.approach + ARRIVAL_MS.alighting)
    expect(arrivalAt(arr(true), ARRIVAL_HANDOFF - 1).standing).toBe(false)
    expect(arrivalAt(arr(true), ARRIVAL_HANDOFF).standing).toBe(true)
  })

  it('lands beside the spot facing it, the rider hops off, and the mount leaves empty', () => {
    for (const fromLeft of [true, false]) {
      const d = arr(fromLeft)
      const landed = arrivalAt(d, ARRIVAL_MS.approach + 1)
      expect(landed.alt).toBe(0)
      expect(landed.faceRight).toBe(fromLeft)
      // on the side it came from
      expect(Math.sign(landed.x - d.x)).toBe(fromLeft ? -1 : 1)
      expect(Math.abs(landed.x - d.x)).toBe(LAND_DX)
      // the hop runs from the saddle (1) down to the ground (0)
      let lastHop = 1
      for (let t = ARRIVAL_MS.approach; t < ARRIVAL_HANDOFF; t += 20) {
        const f = arrivalAt(d, t)
        expect(f.hop).toBeLessThanOrEqual(lastHop)
        expect(f.aboard).toBe(f.hop >= HOP_SWAP)
        lastHop = f.hop
      }
      const away = arrivalAt(d, ARRIVAL_TOTAL - 100)
      expect(away.aboard).toBe(false)
      expect(away.y).toBeLessThan(d.y - 200)
      expect(arrivalAt(d, ARRIVAL_TOTAL).fade).toBe(0)
    }
  })

  it('moves smoothly from start to end, both directions', () => {
    for (const fromLeft of [true, false]) {
      let last = arrivalAt(arr(fromLeft), 0)
      for (let t = 16; t <= ARRIVAL_TOTAL; t += 16) {
        const f = arrivalAt(arr(fromLeft), t)
        expect(Math.hypot(f.x - last.x, f.y - last.y, f.alt - last.alt), `${t}`).toBeLessThan(4)
        last = f
      }
    }
  })
})

describe('landing side', () => {
  const wall = (cells: string[]) => (x: number, y: number) => cells.includes(`${x},${y}`)
  it('keeps the preferred side when it is clear', () => {
    expect(landingSide(10, 5, true, wall([]))).toBe(true)
    expect(landingSide(10, 5, false, wall([]))).toBe(false)
  })
  it('switches to the other side when the preferred landing tiles are blocked', () => {
    expect(landingSide(10, 5, true, wall(['9,5']))).toBe(false)
    expect(landingSide(10, 5, false, wall(['12,5']))).toBe(true)
  })
  it('stays on the preferred side when both are blocked', () => {
    expect(landingSide(10, 5, true, wall(['9,5', '11,5']))).toBe(true)
  })
})
