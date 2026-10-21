/**
 * Idle gestures: each one starts and ends on the standing idle (so it hands back to breathing
 * cleanly), every frame renders, and timings stay in a sensible range.
 */
import { describe, expect, it } from 'vitest'
import { GESTURES, GESTURE_WEIGHTS, gestureLength, type GestureId } from './gestures'
import { atResolution, CHAR_H, CHAR_W, paletteFor, renderPose } from './character'
import { validate } from './pixels'
import { signature } from '../content/aaryan'

const ids = Object.keys(GESTURES) as GestureId[]

describe('idle gestures', () => {
  it('has all five gestures, each with a weight', () => {
    expect(ids.sort()).toEqual(['handsBehindHead', 'pockets', 'ruffleHair', 'smirkPoint', 'wave'])
    for (const id of ids) expect(GESTURE_WEIGHTS[id]).toBeGreaterThan(0)
  })

  it('every gesture ends back on the standing idle', () => {
    for (const id of ids) {
      const last = GESTURES[id][GESTURES[id].length - 1].frame
      expect(last, id).toEqual({})
    }
  })

  it('every frame renders a valid sprite, at both densities', () => {
    const pal = paletteFor(signature)
    for (const id of ids)
      for (const { frame } of GESTURES[id]) {
        expect(validate(renderPose(signature, frame), pal, CHAR_W, CHAR_H), id).toEqual([])
        expect(validate(atResolution(2, () => renderPose(signature, frame)), pal, CHAR_W * 2, CHAR_H * 2), id).toEqual([])
      }
  })

  it('gestures are short enough to feel like idles, long enough to read', () => {
    for (const id of ids) {
      const ms = gestureLength(id)
      expect(ms, id).toBeGreaterThan(1200)
      expect(ms, id).toBeLessThan(4500)
      for (const f of GESTURES[id]) expect(f.ms, id).toBeGreaterThanOrEqual(60)
    }
  })
})
