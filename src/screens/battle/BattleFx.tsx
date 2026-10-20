import { useCallback, useEffect, useMemo, useRef } from 'react'
import { blit, buildLayers, RECIPES, S, seeded, type FxEnv, type Layer, type Motion } from '../../battle/fx'
import type { MoveId } from '../../battle/data'

/** Where each side's creature sits on the battle field (fractions of its width and height). */
const CENTRE: Record<0 | 1, [number, number]> = { 0: [0.26, 0.68], 1: [0.7, 0.32] }
const DS_W = 176
/** Dev QA only: slow effects down (window.__battleFx.slow = 0.1) to inspect them frame by frame. */
const qa = { slow: 1 }

export interface FxRun {
  /** resolves when the hit lands (or the effect applies) */
  impact: Promise<void>
  /** resolves when the animation has finished and been cleared */
  done: Promise<void>
  motion: Motion
}

/**
 * Plays move animations on a pixel canvas laid over the battle field. One effect at a time:
 * starting a new one finishes the previous one immediately, so effects never overlap or linger.
 * Timers back up the animation frames, so the battle never stalls in a background tab.
 */
export function useBattleFx(reducedMotion: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const current = useRef<{ raf: number; timers: number[]; finish: () => void } | null>(null)

  const stop = useCallback(() => {
    const c = current.current
    if (!c) return
    cancelAnimationFrame(c.raf)
    c.timers.forEach((t) => window.clearTimeout(t))
    c.finish()
    current.current = null
    const cv = canvasRef.current
    cv?.getContext('2d')?.clearRect(0, 0, cv.width, cv.height)
  }, [])

  useEffect(() => stop, [stop])

  const play = useCallback(
    (move: MoveId, side: 0 | 1, missed: boolean): FxRun => {
      stop()
      const recipe = RECIPES[move]
      const cv = canvasRef.current
      const ctx = cv?.getContext('2d')
      if (!cv || !ctx) return { impact: Promise.resolve(), done: Promise.resolve(), motion: recipe.motion }
      const box = cv.parentElement?.getBoundingClientRect()
      const W = DS_W
      const H = Math.max(120, Math.round(DS_W * ((box?.height || 192) / (box?.width || 256))))
      cv.width = W
      cv.height = H
      const at = (s: 0 | 1): [number, number] => [CENTRE[s][0] * W, CENTRE[s][1] * H]
      const env: FxEnv = { from: at(side), to: at(side === 0 ? 1 : 0), W, H, side, missed, rand: seeded(move.length * 977 + side) }

      let layers: Layer[]
      let impactAt: number
      if (reducedMotion) {
        // no travel, flashes or shakes: just mark the hit
        impactAt = 120
        layers = missed ? [] : [{ t0: 120, dur: 260, draw: (c, _k, e) => blit(c, S.impact, e.to[0], e.to[1], 2) }]
      } else {
        impactAt = recipe.impact
        layers = buildLayers(recipe, env)
      }
      const total = Math.max(impactAt, ...layers.map((l) => l.t0 + l.dur))

      let resolveImpact = () => {}
      let resolveDone = () => {}
      const impact = new Promise<void>((r) => (resolveImpact = r))
      const done = new Promise<void>((r) => (resolveDone = r))
      const start = performance.now()
      const run = {
        raf: 0,
        timers: [] as number[],
        finish: () => {
          resolveImpact()
          resolveDone()
        },
      }
      const frame = () => {
        const t = (performance.now() - start) * qa.slow
        ctx.clearRect(0, 0, W, H)
        ctx.imageSmoothingEnabled = false
        for (const l of layers) {
          if (t < l.t0 || t > l.t0 + l.dur) continue
          ctx.save()
          l.draw(ctx, Math.min(1, (t - l.t0) / l.dur), env)
          ctx.restore()
        }
        if (t >= impactAt) resolveImpact()
        if (t >= total) {
          ctx.clearRect(0, 0, W, H)
          if (current.current === run) current.current = null
          resolveDone()
          return
        }
        run.raf = requestAnimationFrame(frame)
      }
      run.raf = requestAnimationFrame(frame)
      run.timers.push(window.setTimeout(resolveImpact, impactAt / qa.slow + 60), window.setTimeout(() => (current.current === run ? stop() : resolveDone()), total / qa.slow + 120))
      current.current = run
      return { impact, done, motion: reducedMotion ? 'none' : recipe.motion }
    },
    [reducedMotion, stop],
  )

  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __battleFx?: unknown }).__battleFx = Object.assign(qa, { play })
  }, [play])

  return useMemo(() => ({ canvasRef, play, stop }), [play, stop])
}
