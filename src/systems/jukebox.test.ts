import { describe, expect, it } from 'vitest'
import { audio, isJukeboxTrack, JUKEBOX } from './audio'
import { maps } from '../resort/maps'

describe('jukebox registry', () => {
  it('lists each looping song once, with a stable id and a descriptive name', () => {
    const ids = JUKEBOX.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).not.toContain('victory')
    for (const t of JUKEBOX) {
      expect(t.name.length).toBeGreaterThan(3)
      expect(t.where.length).toBeGreaterThan(3)
    }
  })

  it('covers every track a place asks for', () => {
    for (const m of Object.values(maps)) if (m.music) expect(isJukeboxTrack(m.music)).toBe(true)
    expect(isJukeboxTrack('menu')).toBe(true)
    expect(isJukeboxTrack('battle')).toBe(true)
    expect(isJukeboxTrack('nope')).toBe(false)
  })

  it('a pick overrides the area until Auto, and the area keeps tracking underneath', () => {
    // no WebAudio here: the engine still keeps its state, which is what the jukebox shows
    audio.setTrack('resort')
    audio.pin('floor3')
    expect(audio.getStatus()).toMatchObject({ current: 'floor3', pinned: 'floor3', area: 'resort' })
    audio.setTrack('battle')
    expect(audio.getStatus()).toMatchObject({ current: 'floor3', area: 'battle' })
    audio.pin(null)
    expect(audio.getStatus()).toMatchObject({ current: 'battle', pinned: null })
    expect(audio.getStatus().state).toBe('off')
  })
})
