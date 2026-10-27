/**
 * The Pokédex encounter's scenes: one per line of its dialogue, every frame paints the whole
 * window, the resting frame is one of the loop's, and every frame of the loop is a new picture.
 */
import { describe, expect, it } from 'vitest'
import { ENCOUNTER_ART, ENCOUNTER_SCENES, paintEncounter } from './encounters'
import { HAB_H, HAB_W } from './habitat-kit'
import { dialogue } from '../content/dialogue'

describe('wild Aaryan encounter scenes', () => {
  it('has a scene for every line of the encounter', () => {
    expect(ENCOUNTER_SCENES.length).toBe(dialogue.rareEncounter.lines.length)
  })

  it('every frame fills the window, and the resting frame is in the loop', () => {
    for (const id of ENCOUNTER_SCENES) {
      const art = ENCOUNTER_ART[id]
      expect(art.rest, id).toBeLessThan(art.frames)
      for (let f = 0; f < art.frames; f++) {
        const s = paintEncounter(id, f)
        expect(s.px.length).toBe(HAB_W * HAB_H)
        expect(s.px.filter((c) => !c).length, `${id} ${f}`).toBe(0)
      }
    }
  })

  it('moves on every frame: no two frames in a row are the same picture', () => {
    for (const id of ENCOUNTER_SCENES) {
      const { frames } = ENCOUNTER_ART[id]
      const pics = Array.from({ length: frames }, (_, f) => paintEncounter(id, f).px.join())
      for (let f = 0; f < frames; f++) expect(pics[f] === pics[(f + 1) % frames], `${id} ${f}→${(f + 1) % frames}`).toBe(false)
    }
  })
})
