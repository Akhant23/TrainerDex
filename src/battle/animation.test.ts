/**
 * Battle animation behaviour: Gen V pacing stays within the ranges measured from White 2
 * footage, attack poses run wind-up → strike → idle and fall back cleanly, and the idle gesture
 * scheduler is deterministic, never overlaps, and never repeats a big gesture back to back.
 */
import { describe, expect, it } from 'vitest'
import { moves, species, type MoveId, type SpeciesId } from './data'
import { RECIPES, recipeLength, seeded, STAGING, toReal, toRecipe, warpFor } from './fx'
import { ATTACK_POSES, poseTimeline } from './poses'
import { CREATURE_SIZE, gestureFrames, IDLE_GESTURES, idleFrames, poseFrame } from '../sprites/creatures'
import { validate } from '../sprites/pixels'
import { CREATURE_IDLE, gestureLength, idleLoopVariation, planIdleGestures, rng } from '../ui/useCreatureIdle'

const env = { from: [46, 82] as [number, number], to: [123, 38] as [number, number], W: 176, H: 128, side: 0 as const, missed: false, rand: seeded(1) }

describe('Gen V pacing', () => {
  it('every move lands and finishes within the ranges measured from the original', () => {
    for (const [id, r] of Object.entries(RECIPES)) {
      const w = warpFor(id as MoveId, r, moves[id as MoveId].power)
      const total = toReal(w, recipeLength(r, env))
      // measured: contact 1.3–1.7 s, projectile ~2 s, charged special ~3.8 s, status 2–3 s
      expect(total, id).toBeGreaterThanOrEqual(900)
      expect(total, id).toBeLessThanOrEqual(4000)
      expect(toReal(w, r.impact), id).toBeLessThan(total + 1)
      if (moves[id as MoveId].power === 0) expect(total, id).toBeGreaterThanOrEqual(1500)
    }
  })

  it('charged moves get a long wind-up but a quick throw (Electro Ball: impact ~2.4 s)', () => {
    const r = RECIPES.overclock
    const w = warpFor('overclock', r, moves.overclock.power)
    const impact = toReal(w, r.impact)
    expect(impact).toBeGreaterThan(1900)
    expect(impact).toBeLessThan(2700)
    // the part after the wind-up runs at the normal pace, not the charge's
    expect(toReal(w, r.impact) - toReal(w, w.a)).toBeLessThan(600)
    for (const [id, st] of Object.entries(STAGING)) {
      if (!st?.charge) continue
      const rr = RECIPES[id as MoveId]
      expect(toReal(warpFor(id as MoveId, rr, moves[id as MoveId].power), rr.impact), id).toBeGreaterThan(1300)
    }
  })

  it('the warp is continuous and invertible', () => {
    for (const id of Object.keys(STAGING) as MoveId[]) {
      const w = warpFor(id, RECIPES[id], moves[id].power)
      for (let t = 0; t <= 1400; t += 70) expect(toRecipe(w, toReal(w, t)), id).toBeCloseTo(t, 6)
      expect(toReal(w, w.a + 1e-6) - toReal(w, w.a - 1e-6), id).toBeLessThan(0.01)
    }
  })

  it('dimming is limited to chosen moves and ends within the move', () => {
    const dimmed = Object.entries(STAGING).filter(([, st]) => st?.dim)
    expect(dimmed.length).toBeGreaterThan(0)
    expect(dimmed.length).toBeLessThan(Object.keys(RECIPES).length / 4)
    for (const [id, st] of dimmed) {
      const r = RECIPES[id as MoveId]
      expect(st!.dim!.from, id).toBeLessThan(st!.dim!.to)
      expect(st!.dim!.to, id).toBeLessThanOrEqual(recipeLength(r, env))
      expect(st!.dim!.amount, id).toBeLessThanOrEqual(0.5)
    }
    // BASS DROP darkens the screen itself: it must not be dimmed on top
    expect(STAGING.bassDrop?.dim).toBeUndefined()
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
    // every current species has a pose; anything added without one falls back to the plain motion
    expect(Object.keys(ATTACK_POSES).sort()).toEqual(Object.keys(species).sort())
    expect(poseTimeline('newcomer' as SpeciesId, 'tackle', 1000)).toBeNull()
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
