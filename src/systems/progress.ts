import { useSyncExternalStore } from 'react'
import { load, save } from './storage'
import { medals, researchSections, type MedalId } from '../content/medals'
import { pokedex } from '../content/pokedex'
import { photos } from '../content/photos'
import { badges } from '../content/badges'

/**
 * What this visitor has discovered: Dex entries seen, badge shine, photos viewed, battle record
 * and medals. Stored only in their browser.
 */
export interface HallOfFameEntry {
  date: string
  difficulty: 'casual' | 'standard' | 'champion'
  team: string[]
  turns: number
  name: string
}

export interface Progress {
  dexSeen: number[]
  /** badge id → shine 0–100 */
  shine: Record<string, number>
  photosSeen: number[]
  battlesStarted: number
  trainerdexBadge: boolean
  hallOfFame: HallOfFameEntry[]
  sectionsVisited: string[]
  /** medal id → ISO date earned */
  medals: Partial<Record<MedalId, string>>
}

const empty: Progress = {
  dexSeen: [],
  shine: {},
  photosSeen: [],
  battlesStarted: 0,
  trainerdexBadge: false,
  hallOfFame: [],
  sectionsVisited: [],
  medals: {},
}
let state: Progress = load('progress', empty)
const listeners = new Set<() => void>()
const medalListeners = new Set<(id: MedalId) => void>()

const union = <T,>(a: T[], b: T[]) => [...a, ...b.filter((x) => !a.includes(x))]

/**
 * Combine two copies of progress without losing anything — another open tab may have saved
 * since we loaded. Everything here only ever grows, so "union / max" is always right.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const shine: Record<string, number> = { ...a.shine }
  for (const [k, v] of Object.entries(b.shine)) shine[k] = Math.max(shine[k] ?? 0, v)
  const seen = new Set(a.hallOfFame.map((h) => h.date))
  return {
    dexSeen: union(a.dexSeen, b.dexSeen),
    shine,
    photosSeen: union(a.photosSeen, b.photosSeen),
    battlesStarted: Math.max(a.battlesStarted, b.battlesStarted),
    trainerdexBadge: a.trainerdexBadge || b.trainerdexBadge,
    hallOfFame: [...a.hallOfFame, ...b.hallOfFame.filter((h) => !seen.has(h.date))].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 20),
    sectionsVisited: union(a.sectionsVisited, b.sectionsVisited),
    medals: { ...b.medals, ...a.medals },
  }
}

function set(next: Progress) {
  state = mergeProgress(next, load('progress', empty))
  save('progress', state)
  listeners.forEach((l) => l())
}

// another tab saved: fold its progress into ours
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== 'tdx:v1:progress') return
    state = mergeProgress(state, load('progress', empty))
    listeners.forEach((l) => l())
  })
}

const totals = { dex: pokedex.length, photos: photos.length, badges: badges.length }

export const progress = {
  /** Award a medal (no-op if already earned). */
  unlock(id: MedalId) {
    if (state.medals[id]) return
    set({ ...state, medals: { ...state.medals, [id]: new Date().toISOString() } })
    medalListeners.forEach((l) => l(id))
  },
  seeDex(no: number) {
    if (!state.dexSeen.includes(no)) set({ ...state, dexSeen: [...state.dexSeen, no] })
    if (state.dexSeen.length >= totals.dex) progress.unlock('dex-complete')
  },
  seePhoto(i: number) {
    if (!state.photosSeen.includes(i)) set({ ...state, photosSeen: [...state.photosSeen, i] })
    if (state.photosSeen.length >= totals.photos) progress.unlock('memory-collector')
  },
  visitSection(id: string) {
    if (!state.sectionsVisited.includes(id)) set({ ...state, sectionsVisited: [...state.sectionsVisited, id] })
    if (id === 'pager') progress.unlock('social-trainer')
    if (researchSections.every((s) => state.sectionsVisited.includes(s))) progress.unlock('researcher')
  },
  startBattle() {
    set({ ...state, battlesStarted: state.battlesStarted + 1 })
    progress.unlock('challenger')
  },
  /** Record a win. Returns true if this was the first time the badge was earned. */
  winBattle(entry: HallOfFameEntry): boolean {
    const first = !state.trainerdexBadge
    set({ ...state, trainerdexBadge: true, hallOfFame: [entry, ...state.hallOfFame].slice(0, 20) })
    progress.unlock('champion')
    if (entry.difficulty === 'champion') progress.unlock('true-champion')
    return first
  },
  polish(badgeId: string, amount: number) {
    const cur = state.shine[badgeId] ?? 0
    const next = Math.min(100, cur + amount)
    if (next === cur) return
    set({ ...state, shine: { ...state.shine, [badgeId]: next } })
    if (next >= 100) {
      progress.unlock('polisher')
      if (Object.values(state.shine).filter((v) => v >= 100).length >= totals.badges) progress.unlock('spotless')
    }
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

/** Subscribe to "medal earned" events (for the toast). */
export function onMedal(cb: (id: MedalId) => void): () => void {
  medalListeners.add(cb)
  return () => medalListeners.delete(cb)
}

export const medalCount = () => ({ earned: Object.keys(state.medals).length, total: medals.length })
