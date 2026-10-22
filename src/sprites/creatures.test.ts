/**
 * Sprite-system checks: every creature has a valid front and back view, held items are gripped
 * (the pixel at each grip point belongs to the creature, not the item), flight cycles have four
 * frames of three layers, and every rideable mount has a saddle on every frame.
 */
import { describe, expect, it } from 'vitest'
import { creatureArtHi, creatureArt, CREATURE_SIZE, idleFrames, IDLE_FRAMES } from './creatures'
import { HOLDS, ITEM_PALETTE } from './held'
import { flightArt, FLYERS, FLIGHT_H, FLIGHT_W, RIDEABLE } from './flight'
import { validate } from './pixels'
import { species } from '../battle/data'
import { overworldFor, riderBackFor, riderFor, RIDER_HIP } from './overworld'
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

describe('species idle animations', () => {
  it('every species has its own idle: frame 0 is the still, and the loop actually moves', () => {
    for (const id of Object.keys(creatureArt))
      for (const k of [1, 2] as const)
        for (const view of ['front', 'back'] as const) {
          const art = (k === 1 ? creatureArt : creatureArtHi)[id]
          const { frames, palette } = idleFrames(id, k, view)
          expect(frames, `${id} ${k}x ${view}`).toHaveLength(IDLE_FRAMES)
          expect(frames[0], `${id} ${k}x ${view} still`).toEqual(view === 'front' ? art.pixels : art.back)
          expect(new Set(frames.map((f) => f.join('\n'))).size, `${id} ${k}x ${view} moves`).toBeGreaterThan(1)
          for (const f of frames) expect(validate(f, palette, CREATURE_SIZE * k, CREATURE_SIZE * k), id).toEqual([])
        }
  })
})

describe('flyers facing right', () => {
  const flip = (px: string[]) => px.map((r) => [...r].reverse().join(''))
  it('every flyer has its own right-facing frames, not a flipped copy', () => {
    for (const id of FLYERS) {
      const a = flightArt[id]
      expect(a.framesRight, id).toHaveLength(a.frames.length)
      for (let f = 0; f < a.frames.length; f++)
        for (const layer of ['far', 'body', 'near'] as const) {
          expect(validate(a.framesRight[f][layer], a.palette, FLIGHT_W, FLIGHT_H), `${id} ${f} ${layer}`).toEqual([])
        }
      // re-shaded after mirroring (light stays upper-left), so never identical to the flipped art
      expect(a.framesRight[0].body, id).not.toEqual(flip(a.frames[0].body))
    }
  })
})

describe('flying away, seen from behind', () => {
  const flip = (px: string[]) => px.map((r) => [...r].reverse().join(''))
  it('every mount has its own rear-view frames and saddle', () => {
    for (const id of RIDEABLE) {
      const a = flightArt[id]
      expect(a.framesBack, id).not.toBeNull()
      expect(a.framesBack!, id).toHaveLength(a.frames.length)
      expect(a.saddleBack!, id).toHaveLength(a.frames.length)
      for (let f = 0; f < a.frames.length; f++) {
        for (const layer of ['far', 'body', 'near'] as const) expect(validate(a.framesBack![f][layer], a.palette, FLIGHT_W, FLIGHT_H), `${id} ${f} ${layer}`).toEqual([])
        // new art: not the side view, nor the side view flipped
        expect(a.framesBack![f].body, id).not.toEqual(a.frames[f].body)
        expect(a.framesBack![f].body, id).not.toEqual(flip(a.frames[f].body))
        // the seat is on the centre line of its back, on the body
        const [sx, sy] = a.saddleBack![f]
        expect(Math.abs(sx - FLIGHT_W / 2), id).toBeLessThan(2)
        const row = a.framesBack![f].body[Math.round(sy) + 2]
        expect(row[Math.round(sx)], `${id} ${f} seat on the body`).not.toBe('.')
      }
      // the wings beat: the four frames differ
      expect(new Set(a.framesBack!.map((fr) => fr.far.join('\n'))).size, id).toBe(4)
    }
  })

  it('only mounts get a rear view; the others keep their side views', () => {
    for (const id of FLYERS) expect(!!flightArt[id].framesBack, id).toBe(RIDEABLE.includes(id))
  })

  it('the rider from behind is its own pose, sized and seated like the side riders', () => {
    const px = riderBackFor(signature)
    expect(validate(px, paletteFor(signature), OW_W, OW_H)).toEqual([])
    expect(px).not.toEqual(overworldFor(signature).up[0])
    expect(px).not.toEqual(flip(px))
    // something sits on the hip point (the seat), and the head is in the same rows as the side rider's
    expect(px[RIDER_HIP[1]][RIDER_HIP[0]]).not.toBe('.')
    const top = (p: string[]) => p.findIndex((r) => /[^.]/.test(r))
    expect(Math.abs(top(px) - top(riderFor(signature, 'left')))).toBeLessThanOrEqual(1)
  })

  it("from behind, the wearer's right is on your right (the jersey's flames stay on their side)", () => {
    // count the flame red in the torso, either side of the centre line
    const px = riderBackFor(signature)
    let left = 0
    let right = 0
    for (let y = 39; y <= 46; y++)
      for (let x = 17; x <= 31; x++) {
        if (px[y][x] !== 'R') continue
        if (x < 24) left++
        else right++
      }
    expect(right).toBeGreaterThan(left)
  })
})

