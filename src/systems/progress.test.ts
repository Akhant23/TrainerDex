import { describe, expect, it } from 'vitest'
import { medals, researchSections } from '../content/medals'
import { pokedex } from '../content/pokedex'
import { badges } from '../content/badges'
import { onMedal, progress } from './progress'

// No localStorage in the test environment: progress starts empty and lives in memory.
describe('medals', () => {
  const got: string[] = []
  onMedal((id) => got.push(id))

  it('medal ids are unique', () => {
    expect(new Set(medals.map((m) => m.id)).size).toBe(medals.length)
  })

  it('unlocking twice only fires once', () => {
    progress.unlock('first-encounter')
    progress.unlock('first-encounter')
    expect(got.filter((g) => g === 'first-encounter')).toHaveLength(1)
  })

  it('Pokédex Researcher needs every main section; Social Trainer needs the pager', () => {
    researchSections.slice(0, -1).forEach((s) => progress.visitSection(s))
    expect(got).toContain('social-trainer')
    expect(got).not.toContain('researcher')
    progress.visitSection(researchSections[researchSections.length - 1])
    expect(got).toContain('researcher')
  })

  it('Dex Complete after every entry', () => {
    pokedex.slice(0, -1).forEach((d) => progress.seeDex(d.no))
    expect(got).not.toContain('dex-complete')
    progress.seeDex(pokedex[pokedex.length - 1].no)
    expect(got).toContain('dex-complete')
  })

  it('polishing: one badge → Elbow Grease, all → Spotless', () => {
    progress.polish(badges[0].id, 100)
    expect(got).toContain('polisher')
    expect(got).not.toContain('spotless')
    badges.slice(1).forEach((b) => progress.polish(b.id, 100))
    expect(got).toContain('spotless')
  })

  it('battle medals', () => {
    progress.startBattle()
    expect(got).toContain('challenger')
    progress.winBattle({ date: '', difficulty: 'standard', team: [], turns: 1, name: 'T' })
    expect(got).toContain('champion')
    expect(got).not.toContain('true-champion')
    progress.winBattle({ date: '', difficulty: 'champion', team: [], turns: 1, name: 'T' })
    expect(got).toContain('true-champion')
  })
})

describe('mergeProgress (two tabs)', async () => {
  const { mergeProgress } = await import('./progress')
  const base = { dexSeen: [], shine: {}, photosSeen: [], battlesStarted: 0, trainerdexBadge: false, hallOfFame: [], sectionsVisited: [], medals: {} }
  it('keeps everything from both sides', () => {
    const a = { ...base, dexSeen: [1, 2], shine: { x: 40 }, medals: { 'old-school': '2026-01-01' }, battlesStarted: 2 }
    const b = { ...base, dexSeen: [2, 3], shine: { x: 80, y: 10 }, medals: { 'first-encounter': '2026-01-02' }, trainerdexBadge: true }
    const m = mergeProgress(a, b)
    expect(m.dexSeen.sort()).toEqual([1, 2, 3])
    expect(m.shine).toEqual({ x: 80, y: 10 })
    expect(Object.keys(m.medals).sort()).toEqual(['first-encounter', 'old-school'])
    expect(m.battlesStarted).toBe(2)
    expect(m.trainerdexBadge).toBe(true)
  })
})
