import { describe, expect, it } from 'vitest'
import { validate } from './pixels'
import { trainerFrames, trainerPalette, shinyPalette, TRAINER_W, TRAINER_H } from './trainerData'
import { icons, iconPalette } from './icons'

describe('trainer sprite data', () => {
  for (const [name, frames] of Object.entries(trainerFrames)) {
    if (name === 'portrait') continue
    it(`${name} frames are ${TRAINER_W}×${TRAINER_H} with known colours`, () => {
      for (const f of frames) expect(validate([...f], trainerPalette, TRAINER_W, TRAINER_H)).toEqual([])
    })
  }

  it('portrait is a 25×26 crop', () => {
    expect(validate([...trainerFrames.portrait[0]], trainerPalette, 25, 26)).toEqual([])
  })

  it('shiny palette covers every key of the normal palette', () => {
    expect(Object.keys(shinyPalette).sort()).toEqual(Object.keys(trainerPalette).sort())
  })
})

describe('icons', () => {
  for (const [name, px] of Object.entries(icons)) {
    it(`${name} is 16×16 with known colours`, () => {
      expect(validate(px, iconPalette, 16, 16)).toEqual([])
    })
  }
})

describe('badges', async () => {
  const { badges } = await import('../content/badges')
  const { experienceById } = await import('../content/experience')
  for (const b of badges) {
    it(`${b.id} art is 16×16 with known colours`, () => {
      expect(validate(b.pixels, b.palette, 16, 16)).toEqual([])
    })
    it(`${b.id} evidence points at real experience entries`, () => {
      for (const id of b.evidence) expect(experienceById(id), id).toBeDefined()
    })
  }
})
