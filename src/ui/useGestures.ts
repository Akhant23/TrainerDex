import { useEffect, useRef, useState } from 'react'
import type { PoseFrame } from '../sprites/character'
import { GESTURE_WEIGHTS, GESTURES, type GestureId } from '../sprites/gestures'

/** Seconds of plain breathing between idle gestures. */
const GAP_MIN = 7
const GAP_MAX = 13

function pickGesture(last: GestureId | null): GestureId {
  const ids = (Object.keys(GESTURE_WEIGHTS) as GestureId[]).filter((id) => id !== last && GESTURE_WEIGHTS[id] > 0)
  const total = ids.reduce((t, id) => t + GESTURE_WEIGHTS[id], 0)
  let r = Math.random() * total
  for (const id of ids) if ((r -= GESTURE_WEIGHTS[id]) < 0) return id
  return ids[0]
}

/**
 * Plays idle gestures for a layered character: breathing (handled by the sprite's layer loop)
 * is the default; every 7–13 s one gesture plays from start to finish, never the same one twice
 * in a row and never interrupted. `trigger` asks for a specific gesture (a tap → wave); it's
 * ignored while another is playing. Timers stop when the sprite unmounts or the tab is hidden,
 * and nothing plays with reduced motion.
 */
export function useGestures(enabled: boolean, trigger?: { id: GestureId; key: number }): PoseFrame | undefined {
  const [state, setState] = useState<{ id: GestureId; i: number } | null>(null)
  const last = useRef<GestureId | null>(null)
  const playing = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const scheduleRef = useRef<() => void>(() => {})

  // the scheduler: wait, then start a gesture (only while idle and visible)
  useEffect(() => {
    if (!enabled) {
      setState(null)
      playing.current = false
      return
    }
    const schedule = () => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(
        () => {
          if (document.hidden || playing.current) return schedule()
          const id = pickGesture(last.current)
          last.current = id
          playing.current = true
          setState({ id, i: 0 })
        },
        (GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)) * 1000,
      )
    }
    scheduleRef.current = schedule
    schedule()
    const onVisible = () => {
      if (document.hidden) window.clearTimeout(timer.current)
      else if (!playing.current) schedule()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer.current)
      scheduleRef.current = () => {}
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])

  // a requested gesture starts now, unless one is already playing
  useEffect(() => {
    if (!enabled || !trigger || playing.current) return
    window.clearTimeout(timer.current)
    last.current = trigger.id
    playing.current = true
    setState({ id: trigger.id, i: 0 })
  }, [enabled, trigger])

  // step through the current gesture's frames, then go back to breathing and schedule the next
  useEffect(() => {
    if (!state) return
    const frames = GESTURES[state.id]
    const t = window.setTimeout(() => {
      if (state.i + 1 < frames.length) setState({ id: state.id, i: state.i + 1 })
      else {
        playing.current = false
        setState(null)
        scheduleRef.current()
      }
    }, frames[state.i].ms)
    return () => window.clearTimeout(t)
  }, [state])

  return state ? GESTURES[state.id][state.i].frame : undefined
}
