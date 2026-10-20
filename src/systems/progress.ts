import { useSyncExternalStore } from 'react'
import { load, save } from './storage'

/**
 * What this visitor has discovered: Dex entries seen, badge shine, photos viewed.
 * Stored only in their browser. (Phase 4 visitor achievements build on this.)
 */
export interface HallOfFameEntry {
  date: string
  difficulty: 'casual' | 'standard' | 'champion'
  team: string[]
  turns: number
  name: string
}

interface Progress {
  dexSeen: number[]
  /** badge id → shine 0–100 */
  shine: Record<string, number>
  photosSeen: number[]
  battlesStarted: number
  trainerdexBadge: boolean
  hallOfFame: HallOfFameEntry[]
}

const empty: Progress = { dexSeen: [], shine: {}, photosSeen: [], battlesStarted: 0, trainerdexBadge: false, hallOfFame: [] }
let state: Progress = load('progress', empty)
const listeners = new Set<() => void>()

function set(next: Progress) {
  state = next
  save('progress', state)
  listeners.forEach((l) => l())
}

export const progress = {
  seeDex(no: number) {
    if (!state.dexSeen.includes(no)) set({ ...state, dexSeen: [...state.dexSeen, no] })
  },
  seePhoto(i: number) {
    if (!state.photosSeen.includes(i)) set({ ...state, photosSeen: [...state.photosSeen, i] })
  },
  startBattle() {
    set({ ...state, battlesStarted: state.battlesStarted + 1 })
  },
  /** Record a win. Returns true if this was the first time the badge was earned. */
  winBattle(entry: HallOfFameEntry): boolean {
    const first = !state.trainerdexBadge
    set({ ...state, trainerdexBadge: true, hallOfFame: [entry, ...state.hallOfFame].slice(0, 20) })
    return first
  },
  polish(badgeId: string, amount: number) {
    const cur = state.shine[badgeId] ?? 0
    const next = Math.min(100, cur + amount)
    if (next !== cur) set({ ...state, shine: { ...state.shine, [badgeId]: next } })
  },
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}
