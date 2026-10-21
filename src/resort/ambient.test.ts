/**
 * Flying travellers: their apparent size follows their altitude (small and far off when high,
 * full size on touchdown), the curve is smooth, and sky flyers stay smaller than the ground.
 */
import { describe, expect, it } from 'vitest'
import { airScale, CRUISE_ALT, skyScale, tripPosition, type Trip } from './ambient'
import { signature as DEFAULT_AVATAR } from '../content/aaryan'

describe('flying scale', () => {
  it('is full size on the ground and about half at cruising height', () => {
    expect(airScale(0)).toBe(1)
    expect(airScale(CRUISE_ALT)).toBeCloseTo(0.52, 2)
  })

  it('grows smoothly and steadily as a traveller comes in to land', () => {
    const trip: Trip = { id: 't', mode: 'air', species: 'megaphawk', look: DEFAULT_AVATAR, tx: 10, ty: 10, t0: 0, dur: 2600, leaving: false, seaY: 28, fromX: -3 }
    let last = 0
    for (let ms = 0; ms <= 2600; ms += 50) {
      const sc = airScale(tripPosition(trip, ms).alt)
      expect(sc).toBeGreaterThanOrEqual(last - 1e-9)
      // no visible jumps: under 3% between 50 ms frames
      if (ms > 0) expect(sc - last).toBeLessThan(0.03)
      last = sc
    }
    expect(last).toBe(1)
  })

  it('takes off along the same curve in reverse', () => {
    const base = { id: 't', mode: 'air' as const, species: 'megaphawk' as const, look: DEFAULT_AVATAR, tx: 10, ty: 10, t0: 0, dur: 2600, seaY: 28, fromX: -3 }
    for (const ms of [0, 650, 1300, 1950, 2600]) expect(tripPosition({ ...base, leaving: true }, ms).alt).toBeCloseTo(tripPosition({ ...base, leaving: false }, 2600 - ms).alt, 6)
  })

  it('sky flyers are always smaller than a traveller just landing', () => {
    for (const near of [0.55, 0.7, 0.85, 1]) {
      expect(skyScale(near)).toBeLessThan(0.7)
      expect(skyScale(near)).toBeGreaterThan(0.4)
    }
    expect(skyScale(1)).toBeGreaterThan(skyScale(0.55))
  })
})
