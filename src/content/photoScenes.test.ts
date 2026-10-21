/**
 * Every album photo has its own pixel-art portrait, scenes only exist for real photos, each one
 * includes Aaryan, and every cast member renders as a valid sprite.
 */
import { describe, expect, it } from 'vitest'
import { photos } from './photos'
import { photoScenes } from './photoScenes'
import { atResolution, CHAR_H, CHAR_W, paletteFor, renderPose } from '../sprites/character'
import { validate } from '../sprites/pixels'

describe('photo portraits', () => {
  it('every photo has a scene, and every scene belongs to a photo', () => {
    const ids = photos.map((p) => p.id)
    expect(Object.keys(photoScenes).sort()).toEqual([...ids].sort())
  })

  it('each scene shows Aaryan exactly once, with a description for screen readers', () => {
    for (const [id, s] of Object.entries(photoScenes)) {
      expect(s.cast.filter((m) => m.me), id).toHaveLength(1)
      expect(s.alt.length, id).toBeGreaterThan(20)
    }
  })

  it('every cast member renders as a valid sprite in its pose', () => {
    for (const [id, s] of Object.entries(photoScenes))
      for (const m of s.cast) {
        const px = atResolution(2, () => renderPose(m.look, m.pose ?? {}))
        expect(validate(px, paletteFor(m.look), CHAR_W * 2, CHAR_H * 2), id).toEqual([])
      }
  })
})
