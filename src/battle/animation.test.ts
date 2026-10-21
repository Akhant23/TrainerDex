/**
 * Battle animation behaviour: Gen V pacing stays within the ranges measured from White 2
 * footage, attack poses run wind-up → strike → idle and fall back cleanly, and the idle gesture
 * scheduler is deterministic, never overlaps, and never repeats a big gesture back to back.
 */
import { describe, expect, it } from 'vitest'
import { moves, species, type MoveId, type SpeciesId } from './data'
import { RECIPES, recipeLength, seeded, tempoFor } from './fx'
import { ATTACK_POSES, poseTimeline } from './poses'
import { CREATURE_SIZE, gestureFrames, IDLE_GESTURES, idleFrames, poseFrame } from '../sprites/creatures'
import { validate } from '../sprites/pixels'
import { CREATURE_IDLE, gestureLength, idleLoopVariation, planIdleGestures, rng } from '../ui/useCreatureIdle'

const env = { from: [46, 82] as [number, number], to: [123, 38] as [number, number], W: 176, H: 128, side: 0 as const, missed: false, rand: seeded(1) }

describe('Gen V pacing', () => {
  it('every move lands and finishes within the ranges measured from the original', () => {
    for (const [id, r] of Object.entries(RECIPES)) {
      const t = tempoFor(r, moves[id as MoveId].power)
      const total = recipeLength(r, env) * t
      // measured: contact 1.3–1.7 s, projectile ~2 s, charged special ~3.8 s, status 2–3 s
      expect(total, id).toBeGreaterThanOrEqual(900)
      expect(total, id).toBeLessThanOrEqual(4000)
      expect(r.impact * t, id).toBeLessThan(total + 1)
      if (moves[id as MoveId].power === 0) expect(total, id).toBeGreaterThanOrEqual(1500)
    }
  })
})

describe('attack poses', () => {
  const damaging = (s: SpeciesId) => species[s].moves.find((m) => moves[m].power > 0)!
  const status = (s: SpeciesId) => species[s].moves.find((m) => moves[m].power === 0)

  it('wind-up, then strike before the hit, then back to idle', () => {
    for (const s of Object.keys(ATTACK_POSES) as SpeciesId[]) {
      const steps = poseTimeline(s, damaging(s), 1000)!
      expect(steps.map((x) => x.pose), s).toEqual(['windup', 'strike', null])
      expect(steps[1].at).toBeGreaterThan(0)
      expect(steps[1].at).toBeLessThan(1000)
      expect(steps[2].at).toBeGreaterThan(1000)
    }
  })

  it('falls back to the plain motion for status moves and species without poses', () => {
    for (const s of Object.keys(ATTACK_POSES) as SpeciesId[]) {
      const m = status(s)
      if (m) expect(poseTimeline(s, m, 1000), `${s} ${m}`).toBeNull()
    }
    const without = (Object.keys(species) as SpeciesId[]).find((s) => !ATTACK_POSES[s])!
    expect(poseTimeline(without, damaging(without), 1000)).toBeNull()
  })

  it('pose frames are valid sprites that actually differ from the still', () => {
    for (const s of Object.keys(ATTACK_POSES) as SpeciesId[])
      for (const view of ['front', 'back'] as const)
        for (const p of ['windup', 'strike'] as const) {
          const { frames, palette } = poseFrame(s, 2, view, p)
          expect(validate(frames[0], palette, CREATURE_SIZE * 2, CREATURE_SIZE * 2), `${s} ${view} ${p}`).toEqual([])
          expect(frames[0], `${s} ${view} ${p}`).not.toEqual(idleFrames(s, 2, view).frames[0])
        }
  })
})

describe('idle gestures', () => {
  it('gesture frames are valid and differ from the resting pose', () => {
    for (const [id, list] of Object.entries(IDLE_GESTURES))
      for (const g of list!)
        for (const view of g.views) {
          const { frames, palette } = gestureFrames(id, 2, view, g.id)
          expect(frames, `${id} ${g.id}`).toHaveLength(g.frames)
          for (const f of frames) expect(validate(f, palette, 80, 80), `${id} ${g.id}`).toEqual([])
          const rest = idleFrames(id, 2, view).frames[0]
          expect(frames.some((f) => f.join('') !== rest.join('')), `${id} ${g.id} ${view} moves`).toBe(true)
        }
  })

  it('the schedule is reproducible, never overlaps, and keeps big gestures from repeating', () => {
    for (const [id, list] of Object.entries(IDLE_GESTURES)) {
      const a = planIdleGestures(list!, rng(42), 120_000)
      const b = planIdleGestures(list!, rng(42), 120_000)
      expect(a, id).toEqual(b)
      expect(a.length, id).toBeGreaterThan(8)
      expect(a[0].at, id).toBeLessThanOrEqual(CREATURE_IDLE.firstMax)
      for (let i = 1; i < a.length; i++) {
        const gap = a[i].at - (a[i - 1].at + a[i - 1].ms)
        expect(gap, id).toBeGreaterThanOrEqual(CREATURE_IDLE.gapMin - 1)
        expect(gap, id).toBeLessThanOrEqual(CREATURE_IDLE.gapMax + 1)
        if (a[i].id !== 'blink') expect(a[i].id, id).not.toBe(a[i - 1].id)
      }
      for (const g of list!) expect(gestureLength(g)).toBeLessThan(CREATURE_IDLE.gapMin)
    }
  })

  it('every view schedules safely, including views with a single gesture', () => {
    for (const [id, list] of Object.entries(IDLE_GESTURES))
      for (const view of ['front', 'back'] as const) {
        const own = list!.filter((g) => g.views.includes(view))
        const plan = planIdleGestures(own, rng(7), 60_000)
        if (own.length) expect(plan.length, `${id} ${view}`).toBeGreaterThan(3)
        for (const step of plan) expect(own.map((g) => g.id), `${id} ${view}`).toContain(step.id)
      }
  })

  it('creatures on screen loop at different speeds and phases', () => {
    const a = idleLoopVariation(rng(1))
    const b = idleLoopVariation(rng(2))
    expect(a).not.toEqual(b)
    for (const v of [a, b]) {
      expect(v.periodMs).toBeGreaterThanOrEqual(1150)
      expect(v.periodMs).toBeLessThanOrEqual(1550)
      expect(v.offsetMs).toBeLessThan(v.periodMs)
    }
  })
})
