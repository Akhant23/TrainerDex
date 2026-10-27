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
  it('each badge is its own quality: no experience backs two badges, and no two share a skill', () => {
    const evidence = badges.flatMap((b) => b.evidence)
    expect(evidence.filter((id, i) => evidence.indexOf(id) !== i)).toEqual([])
    const skills = badges.flatMap((b) => b.skills.map((s) => s.toLowerCase()))
    expect(skills.filter((s, i) => skills.indexOf(s) !== i)).toEqual([])
    expect(new Set(badges.map((b) => b.category)).size).toBe(badges.length)
  })
})

describe('trophies', async () => {
  const { badges } = await import('../content/badges')
  const { trophyArt, TROPHY_W } = await import('./trophy')
  // the emblem's pixels on the cream plate: its colours and its own outline (the plate is P / p)
  const EMBLEM = new Set(['E', 'e', 'Q', 'C', 'K'])
  for (const b of badges)
    it(`${b.id}'s emblem sits in the middle of its medallion`, () => {
      const rows = trophyArt(b.pixels, b.palette).pixels
      let [x0, x1, y0, y1] = [TROPHY_W, 0, 999, 0]
      // only inside the plate (radius 18 round the middle), so the medallion's own ring doesn't count
      rows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (!EMBLEM.has(ch) || Math.hypot(x - 47.5, y - 38) > 17.5) return
          x0 = Math.min(x0, x)
          x1 = Math.max(x1, x)
          y0 = Math.min(y0, y)
          y1 = Math.max(y1, y)
        }),
      )
      // the medallion is centred on (47.5, 38): the emblem's box is centred on it, to half a pixel
      expect(Math.abs((x0 + x1) / 2 - 47.5), `x ${x0}–${x1}`).toBeLessThanOrEqual(0.5)
      expect(Math.abs((y0 + y1) / 2 - 38), `y ${y0}–${y1}`).toBeLessThanOrEqual(0.5)
    })
})
