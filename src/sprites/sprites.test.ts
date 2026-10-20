import { describe, expect, it } from 'vitest'
import { validate } from './pixels'
import { icons, iconPalette } from './icons'

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
