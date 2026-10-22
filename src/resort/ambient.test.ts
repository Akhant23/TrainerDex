/**
 * Flying travellers: their apparent size follows their altitude (small and far off when high,
 * full size on touchdown), the curve is smooth, and sky flyers stay smaller than the ground.
 */
import { describe, expect, it } from 'vitest'
import { airScale, CRUISE_ALT, skyScale, stepScale, tripFlight, type Trip } from './ambient'
import { ARRIVAL_MS, arrivalAt } from './departure'
import { signature as DEFAULT_AVATAR } from '../content/aaryan'

describe('flying scale', () => {
  it('is full size on the ground and about half at cruising height', () => {
    expect(airScale(0)).toBe(1)
    expect(airScale(CRUISE_ALT)).toBeCloseTo(0.52, 2)
  })

  it('grows smoothly and steadily as a traveller comes in to land', () => {
    const d = { t0: 0, x: 168, y: 174, mount: 'megaphawk' as const, fromLeft: true }
    let last = 0
    for (let ms = 0; ms <= ARRIVAL_MS.approach; ms += 50) {
      const sc = airScale(arrivalAt(d, ms).alt)
      expect(sc).toBeGreaterThanOrEqual(last - 1e-9)
      // no visible jumps: under 3% between 50 ms frames
      if (ms > 0) expect(sc - last).toBeLessThan(0.03)
      last = sc
    }
    expect(last).toBe(1)
  })

  it('shrinks in small steps, exactly full size on the ground', () => {
    expect(stepScale(1)).toBe(1)
    let last = 1
    for (let r = 1; r >= 0.2; r -= 0.005) {
      const q = stepScale(r)
      expect(q).toBeLessThanOrEqual(last + 1e-12)
      // within one step of the true size, and steps under 3%
      expect(Math.abs(Math.log2(q / r))).toBeLessThanOrEqual(1 / 48 + 1e-9)
      if (q < last) expect(last / q).toBeLessThan(1.03)
      last = q
    }
  })

  it('draws a trip by air from its landing spot and side', () => {
    const t: Trip = { id: 't', mode: 'air', species: 'megaphawk', look: DEFAULT_AVATAR, tx: 10, ty: 10, t0: 5, dur: 0, leaving: false, seaY: 28, fromX: 41 }
    expect(tripFlight(t)).toEqual({ t0: 5, x: 168, y: 174, mount: 'megaphawk', fromLeft: false })
    expect(tripFlight({ ...t, fromX: -3 }).fromLeft).toBe(true)
  })

  it('sky flyers are always smaller than a traveller just landing', () => {
    for (const near of [0.55, 0.7, 0.85, 1]) {
      expect(skyScale(near)).toBeLessThan(0.7)
      expect(skyScale(near)).toBeGreaterThan(0.4)
    }
    expect(skyScale(1)).toBeGreaterThan(skyScale(0.55))
  })
})
