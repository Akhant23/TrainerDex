import { useEffect, useMemo, useRef, useState } from 'react'
import { IDLE_GESTURES, type IdleGesture } from '../sprites/creatures'

/**
 * Idle scheduling for battle creatures. The looping idle (a 4-frame strip stepped by CSS) runs
 * continuously; on top of it, species with gestures (IDLE_GESTURES) now and then blink or do
 * something bigger, then return to the loop. Like the trainer's useGestures, but for creatures:
 * no per-frame React updates (one state change to start a gesture, one to end it).
 */

export interface IdleTiming {
  /** ms between gestures */
  gapMin: number
  gapMax: number
  /** the first gesture comes within this many ms, so creatures entering together don't sync */
  firstMax: number
}
export const CREATURE_IDLE: IdleTiming = { gapMin: 3500, gapMax: 9000, firstMax: 6000 }

/** Small seeded generator (mulberry32), so schedules can be reproduced in tests. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Pick by weight; a big gesture never plays twice in a row (blinks can), unless it's the only
 * gesture this view has (a back view with no blink), when it simply comes round again.
 */
export function pickIdleGesture(list: IdleGesture[], last: string | null, r: number): IdleGesture {
  const fresh = list.filter((g) => g.id === 'blink' || g.id !== last)
  const pool = fresh.length ? fresh : list
  const total = pool.reduce((t, g) => t + g.weight, 0)
  let x = r * total
  for (const g of pool) if ((x -= g.weight) < 0) return g
  return pool[pool.length - 1]
}

export const gestureLength = (g: IdleGesture) => g.frames * g.frameMs

/** A deterministic timeline of gestures over `horizon` ms (tests, previews). Never overlapping. */
export function planIdleGestures(list: IdleGesture[], next: () => number, horizon: number, timing = CREATURE_IDLE): Array<{ at: number; id: string; ms: number }> {
  const out: Array<{ at: number; id: string; ms: number }> = []
  if (!list.length) return out
  let t = next() * timing.firstMax
  let last: string | null = null
  while (t < horizon) {
    const g = pickIdleGesture(list, last, next())
    out.push({ at: Math.round(t), id: g.id, ms: gestureLength(g) })
    last = g.id
    t += gestureLength(g) + timing.gapMin + next() * (timing.gapMax - timing.gapMin)
  }
  return out
}

/**
 * Per-sprite variation of the base loop: its period (1.15–1.55 s) and where in the loop it
 * starts, so two creatures on screen never breathe in lockstep.
 */
export function idleLoopVariation(next: () => number): { periodMs: number; offsetMs: number } {
  const periodMs = Math.round(1150 + next() * 400)
  return { periodMs, offsetMs: Math.round(next() * periodMs) }
}

let instance = 0

/**
 * The current gesture for one battle creature (or null while it loops), plus its loop timing.
 * Gestures start on a loop boundary (the resting frame), so the sprite never jumps mid-breath,
 * and after one ends the loop restarts from its rest frame. `enabled` false (reduced motion, an
 * attack pose, or the sprite being still) stops everything; timers clear on unmount and pause
 * while the tab is hidden. Pass `seed` for a reproducible schedule.
 */
export function useCreatureIdle(id: string, view: 'front' | 'back', enabled: boolean, seed?: number) {
  const list = useMemo(() => (IDLE_GESTURES[id] ?? []).filter((g) => g.views.includes(view)), [id, view])
  const [next] = useState(() => rng(seed ?? Math.floor(Math.random() * 2 ** 31) + instance++))
  const [loop] = useState(() => idleLoopVariation(next))
  const [state, setState] = useState<{ gesture: IdleGesture | null; epoch: number }>({ gesture: null, epoch: 0 })
  // when the current loop animation started, and how far into its period it began
  const loopClock = useRef<{ start: number; offset: number } | null>(null)

  useEffect(() => {
    loopClock.current ??= { start: performance.now(), offset: loop.offsetMs }
    if (!enabled || !list.length) return
    let timer = 0
    let last: string | null = null
    let first = true
    let playing = false
    const backToLoop = () => {
      // back to the loop, from its rest frame
      playing = false
      loopClock.current = { start: performance.now(), offset: 0 }
      setState((s) => ({ gesture: null, epoch: s.epoch + 1 }))
    }
    const untilBoundary = (ms: number) => {
      // land on the next moment the loop is back at its rest frame
      const { start, offset } = loopClock.current ?? { start: performance.now(), offset: 0 }
      const at = performance.now() + ms
      const phase = (at - start + offset) % loop.periodMs
      return ms + (phase === 0 ? 0 : loop.periodMs - phase)
    }
    const schedule = () => {
      const t = CREATURE_IDLE
      const wait = first ? next() * t.firstMax : t.gapMin + next() * (t.gapMax - t.gapMin)
      first = false
      timer = window.setTimeout(play, untilBoundary(wait))
    }
    const play = () => {
      if (document.hidden) return schedule()
      const g = pickIdleGesture(list, last, next())
      last = g.id
      playing = true
      setState((s) => ({ gesture: g, epoch: s.epoch }))
      timer = window.setTimeout(() => {
        backToLoop()
        schedule()
      }, gestureLength(g))
    }
    schedule()
    const onVisible = () => {
      window.clearTimeout(timer)
      // a gesture cut off by hiding the tab ends cleanly; the schedule resumes when it's back
      if (document.hidden) {
        if (playing) backToLoop()
      } else schedule()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      if (playing) backToLoop()
    }
  }, [enabled, list, next, loop.periodMs, loop.offsetMs])

  return { gesture: enabled ? state.gesture : null, epoch: state.epoch, loop }
}
