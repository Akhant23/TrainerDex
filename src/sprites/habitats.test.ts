/**
 * Pokédex habitats: every entry has one, every frame paints the whole 256×192 window, painting
 * is repeatable, the animated ones actually move, and Aaryan is in each scene.
 */
import { describe, expect, it } from 'vitest'
import { HABITATS, HAB_H, HAB_W, habitatIds, paintHabitat } from './habitats'
import { pokedex } from '../content/pokedex'
import { paletteFor } from './character'
import { signature } from '../content/aaryan'

describe('Pokédex habitats', () => {
  it('every entry has a habitat, and every entry its own', () => {
    for (const d of pokedex) expect(HABITATS[d.habitat], d.name).toBeDefined()
    expect(new Set(pokedex.map((d) => d.habitat)).size).toBe(pokedex.length)
  })

  it('every frame fills the window with pixels: no gaps', () => {
    for (const id of habitatIds)
      for (let f = 0; f < HABITATS[id].frames; f++) {
        const s = paintHabitat(id, f)
        expect(s.px.length).toBe(HAB_W * HAB_H)
        expect(s.px.filter((c) => !c).length, `${id} ${f}`).toBe(0)
      }
  })

  it('paints the same picture every time, and the animated ones change between frames', () => {
    for (const id of habitatIds) {
      expect(paintHabitat(id, 0).px.join(), id).toBe(paintHabitat(id, 0).px.join())
      if (HABITATS[id].frames > 1) expect(paintHabitat(id, 1).px.join(), id).not.toBe(paintHabitat(id, 0).px.join())
    }
  })

  it('Aaryan is in every scene: his skin and hair colours are there', () => {
    const pal = paletteFor(signature)
    for (const id of habitatIds) {
      const px = new Set(paintHabitat(id).px)
      expect(px.has(pal.S), `${id} skin`).toBe(true)
      expect(px.has(pal.H), `${id} hair`).toBe(true)
    }
  })

  it('every habitat has a name and a description for screen readers', () => {
    for (const id of habitatIds) {
      expect(HABITATS[id].label.length, id).toBeGreaterThan(3)
      expect(HABITATS[id].alt.length, id).toBeGreaterThan(30)
    }
  })
})
