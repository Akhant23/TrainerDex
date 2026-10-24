/**
 * Idle gestures: each one starts and ends on the standing idle (so it hands back to breathing
 * cleanly), every frame renders, and timings stay in a sensible range.
 */
import { describe, expect, it } from 'vitest'
import { GESTURES, GESTURE_WEIGHTS, gestureLength, TWEEN_MS, type GestureId } from './gestures'
import { atResolution, CHAR_H, CHAR_W, paletteFor, renderPose } from './character'
import { validate } from './pixels'
import { signature } from '../content/aaryan'

const ids = Object.keys(GESTURES) as GestureId[]

describe('idle gestures', () => {
  it('has the five idle gestures, each with a weight, and the on-request menu point', () => {
    expect(ids.sort()).toEqual(['cleanGlasses', 'handsBehindHead', 'pointMenu', 'ruffleHair', 'smirkPoint', 'wave'])
    for (const id of ids) expect(GESTURE_WEIGHTS[id], id).toBeGreaterThan(id === 'pointMenu' ? -1 : 0)
    // the menu point only plays when asked: never in the idle rotation
    expect(GESTURE_WEIGHTS.pointMenu).toBe(0)
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
    // every frame of every gesture at both densities: ~4 s alone, longer when the suite runs in parallel
  }, 20_000)

  it('gestures are short enough to feel like idles, long enough to read', () => {
    for (const id of ids) {
      const ms = gestureLength(id)
      expect(ms, id).toBeGreaterThan(1200)
      expect(ms, id).toBeLessThan(4500)
      // in-betweens are quick (they're motion); every held pose shows long enough to read
      for (const f of GESTURES[id]) expect(f.ms, id).toBeGreaterThanOrEqual(TWEEN_MS)
      expect(GESTURES[id].filter((f) => f.ms > TWEEN_MS).every((f) => f.ms >= 60), id).toBe(true)
    }
  })
})

describe('cleaning his glasses', () => {
  const frames = GESTURES.cleanGlasses.map((f) => f.frame)
  it('takes them off, cleans them with a cloth, and puts them back on', () => {
    // on at the start and the end; off, and in a hand, in between
    expect(frames[0].glasses).toBeUndefined()
    expect(frames[frames.length - 1]).toEqual({})
    const off = frames.filter((f) => f.glasses === 'off')
    expect(off.length).toBeGreaterThan(10)
    expect(frames.some((f) => f.held?.cloth)).toBe(true)
    // never both on the face and in a hand, and never gone altogether
    for (const f of frames) {
      if (f.glasses === 'off') expect(f.held?.glasses, JSON.stringify(f)).toBeDefined()
      else expect(f.held?.glasses).toBeUndefined()
    }
  })
  it('the glasses and cloth travel with the hand: no jumps between frames', () => {
    for (let i = 1; i < frames.length; i++)
      for (const what of ['glasses', 'cloth'] as const) {
        const a = frames[i - 1].held?.[what]
        const b = frames[i].held?.[what]
        if (a && b) expect(Math.hypot(b[0] - a[0], b[1] - a[1]), `${what} ${i}`).toBeLessThan(10)
      }
  })
  it('the pocket check it replaced is gone', () => {
    expect(Object.keys(GESTURES)).not.toContain('pockets')
  })
})
