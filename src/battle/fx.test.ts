/**
 * Move animations: every move has its own recipe, lands its hit inside the animation, looks
 * different when it misses, and every layer draws cleanly at every point in its life.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { buildLayers, RECIPES, recipeLength, seeded, type FxEnv } from './fx'
import { moves, type MoveId } from './data'

const noopCtx = () =>
  new Proxy({} as Record<string, unknown>, {
    get: (t, p: string) => (p in t ? t[p] : () => undefined),
    set: (t, p: string, v) => ((t[p] = v), true),
  }) as unknown as CanvasRenderingContext2D

beforeAll(() => {
  ;(globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: noopCtx }) }
})

const env = (side: 0 | 1, missed: boolean): FxEnv => ({ from: side === 0 ? [46, 102] : [123, 48], to: side === 0 ? [123, 48] : [46, 102], W: 176, H: 150, side, missed, rand: seeded(1) })
const ids = Object.keys(moves) as MoveId[]

describe('move animations', () => {
  it('every move has its own recipe', () => {
    expect(Object.keys(RECIPES).sort()).toEqual([...ids].sort())
  })

  it('the hit lands inside the animation, and nothing runs for ever', () => {
    for (const id of ids) {
      const r = RECIPES[id]
      const total = recipeLength(r, env(0, false))
      expect(r.impact, id).toBeGreaterThan(0)
      expect(r.impact, id).toBeLessThanOrEqual(total)
      expect(total, id).toBeLessThan(1600)
    }
  })

  it('damaging moves look different when they miss', () => {
    for (const id of ids.filter((m) => moves[m].power > 0)) {
      const hit = buildLayers(RECIPES[id], env(0, false))
      const miss = buildLayers(RECIPES[id], env(0, true))
      expect(hit.some((l) => l.onHit), `${id} has contact layers`).toBe(true)
      expect(miss.some((l) => l.onHit), `${id} miss drops them`).toBe(false)
    }
  })

  it('every layer draws without error from either side, hit or miss', () => {
    const ctx = noopCtx()
    for (const id of ids)
      for (const side of [0, 1] as const)
        for (const missed of [false, true]) {
          const e = env(side, missed)
          for (const l of buildLayers(RECIPES[id], e)) for (const k of [0, 0.25, 0.5, 0.75, 1]) expect(() => l.draw(ctx, k, e), id).not.toThrow()
        }
  })

  it('moves of the same type still look different from each other', () => {
    // what actually gets drawn, mid-way through each layer: colours used and sprites stamped
    const sig = (id: MoveId) => {
      const ops: string[] = []
      const ctx = new Proxy({} as Record<string, unknown>, {
        get: (t, p: string) => (p in t ? t[p] : (...a: unknown[]) => void ops.push(p === 'drawImage' ? `img${JSON.stringify(a[0])}` : p)),
        set: (t, p: string, v) => (p === 'fillStyle' && ops.push(String(v)), (t[p] = v), true),
      }) as unknown as CanvasRenderingContext2D
      const e = env(0, false)
      for (const l of RECIPES[id].layers(e)) l.draw(ctx, 0.5, e)
      return ops.join('|') + RECIPES[id].motion
    }
    const seen = new Map<string, MoveId>()
    for (const id of ids) {
      const s = sig(id)
      expect(seen.get(s), `${id} duplicates ${seen.get(s)}`).toBeUndefined()
      seen.set(s, id)
    }
  })
})
