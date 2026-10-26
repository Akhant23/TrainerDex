import { describe, expect, it } from 'vitest'
import { VS_POSES, vsPosesFor } from './vsPoses'
import { atResolution, CHAR_H, CHAR_W, paletteFor, renderPose } from '../sprites/character'
import { validate } from '../sprites/pixels'
import { signature } from '../content/aaryan'

describe('VS screen poses', () => {
  it('every wind-up and strike renders a valid sprite at both densities', () => {
    const pal = paletteFor(signature)
    for (const p of Object.values(VS_POSES))
      for (const f of [p.windup, p.strike]) {
        expect(validate(renderPose(signature, f), pal, CHAR_W, CHAR_H), p.id).toEqual([])
        expect(validate(atResolution(2, () => renderPose(signature, f)), pal, CHAR_W * 2, CHAR_H * 2), p.id).toEqual([])
      }
  }, 60_000)

  it('the two sides never strike the same pose, and a trainer always gets the same one', () => {
    for (const key of ['FLOOR 1 · SBHS', 'FLOOR 2', 'VS AARYAN · CASUAL', 'VS AARYAN · STANDARD', 'Rehan', '']) {
      const { me, foe } = vsPosesFor(key, false)
      expect(me.id, key).not.toBe(foe.id)
      expect(vsPosesFor(key, false).foe.id).toBe(foe.id)
    }
  })

  it('the Champion folds his arms; the challenger comes in fired up', () => {
    const { me, foe } = vsPosesFor('anything', true)
    expect(foe.id).toBe('unbothered')
    expect(me.id).toBe('fired')
  })
})
