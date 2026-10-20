/**
 * Sprite-system checks: every creature has a valid front and back view, held items are gripped
 * (the pixel at each grip point belongs to the creature, not the item), flight cycles have four
 * frames of three layers, and every rideable mount has a saddle on every frame.
 */
import { describe, expect, it } from 'vitest'
import { creatureArtHi, creatureArt } from './creatures'
import { HOLDS, ITEM_PALETTE } from './held'
import { flightArt, FLYERS, FLIGHT_H, FLIGHT_W, RIDEABLE } from './flight'
import { validate } from './pixels'
import { species } from '../battle/data'
import { riderFor } from './overworld'
import { signature } from '../content/aaryan'
import { OW_H, OW_W } from './overworld'
import { paletteFor } from './character'

describe('creatures', () => {
  it('every species has BW front and back art at both sizes', () => {
    for (const id of Object.keys(species)) {
      for (const [set, size] of [[creatureArt, 40], [creatureArtHi, 80]] as const) {
        const art = set[id]
        expect(validate(art.pixels, art.palette, size, size), `${id} front`).toEqual([])
        expect(validate(art.back, art.palette, size, size), `${id} back`).toEqual([])
        expect(art.back.join('')).not.toEqual(art.pixels.join(''))
      }
    }
  })

  it('outlines are tinted per colour, not one flat black', () => {
    for (const art of Object.values(creatureArtHi)) {
      const tints = Object.keys(art.palette).filter((k) => k.charCodeAt(0) >= 0x100)
      expect(tints.length).toBeGreaterThan(2)
    }
  })

  it('held items are gripped by the creature, not floating', () => {
    const items = new Set(Object.keys(ITEM_PALETTE))
    for (const [id, h] of Object.entries(HOLDS)) {
      if (!h) continue
      for (const view of ['front', 'back'] as const) {
        const at = h[view]
        if (!at) continue
        const art = creatureArtHi[id]
        const px = view === 'front' ? art.pixels : art.back
        // look in a small window round the grip: the holder's paw/wing/leg must be there
        let holder = 0
        for (let dy = -3; dy <= 3; dy++)
          for (let dx = -3; dx <= 3; dx++) {
            const ch = px[Math.round(at.y * 2) + dy]?.[Math.round(at.x * 2) + dx]
            if (ch && ch !== '.' && !items.has(ch)) holder++
          }
        expect(holder, `${id} ${view}: ${h.grip}`).toBeGreaterThan(15)
      }
    }
  })
})

describe('flight', () => {
  it('every flyer has a four-frame wingbeat in three layers', () => {
    for (const id of FLYERS) {
      const art = flightArt[id]
      expect(art.frames).toHaveLength(4)
      for (const f of art.frames) for (const layer of [f.far, f.body, f.near]) expect(validate(layer, art.palette, FLIGHT_W, FLIGHT_H), id).toEqual([])
      // the wings actually move between frames
      expect(new Set(art.frames.map((f) => f.near.join(''))).size, `${id} wing frames`).toBeGreaterThanOrEqual(3)
    }
  })

  it('rideable mounts carry a saddle that moves with the body', () => {
    expect(RIDEABLE.length).toBeGreaterThanOrEqual(3)
    for (const id of RIDEABLE) {
      const s = flightArt[id].saddle!
      expect(s).toHaveLength(4)
      for (const [x, y] of s) {
        expect(x).toBeGreaterThan(0)
        expect(x).toBeLessThan(FLIGHT_W)
        expect(y).toBeGreaterThan(0)
        expect(y).toBeLessThan(FLIGHT_H)
      }
    }
  })

  it('the riding pose is a valid walker-sized sprite', () => {
    expect(validate(riderFor(signature), paletteFor(signature), OW_W, OW_H)).toEqual([])
  })
})

describe('pixel weight', () => {
  it('hi-density outlines are one design pixel thick (k fine pixels)', async () => {
    const { HiGrid } = await import('./raster')
    const g = new HiGrid(10, 10, 2).rect(3, 3, 6, 6, 'A').outline('K')
    const row = g.toPixels()[9] // fine row through the middle of the square
    // left edge: two fine outline pixels, then the fill
    expect(row.slice(4, 8)).toBe('KKAA')
  })
})
