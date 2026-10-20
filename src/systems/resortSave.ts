import { useSyncExternalStore } from 'react'
import { load, save } from './storage'
import type { Appearance } from '../sprites/character'
import type { SpeciesId } from '../battle/data'
import { STARTER_PARTY } from '../battle/tower'

/**
 * The visitor's resort save: their avatar, party and tower progress. Kept in this browser.
 * `trainerId` + `secret` identify their public avatar online (the secret proves it's theirs
 * when updating; only its hash is stored server-side).
 */
export interface ResortSave {
  avatar: Appearance | null
  name: string
  greeting: string
  party: SpeciesId[]
  floorCleared: number
  trainerId: string
  secret: string
}

function randomId(bytes = 16): string {
  try {
    const b = crypto.getRandomValues(new Uint8Array(bytes))
    return [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  } catch {
    return Math.random().toString(16).slice(2) + Date.now().toString(16)
  }
}
function uuid(): string {
  try {
    return crypto.randomUUID()
  } catch {
    const h = randomId(16)
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
  }
}

const fresh = (): ResortSave => ({ avatar: null, name: '', greeting: 'Hi!', party: [...STARTER_PARTY], floorCleared: 0, trainerId: uuid(), secret: randomId(24) })

let state: ResortSave = load('resort', fresh())
if (!state.trainerId || !state.secret) state = { ...state, ...fresh(), avatar: state.avatar, name: state.name }
const listeners = new Set<() => void>()

export const resortSave = {
  get: () => state,
  update(patch: Partial<ResortSave>) {
    state = { ...state, ...patch }
    save('resort', state)
    listeners.forEach((l) => l())
  },
}

export function useResortSave(): ResortSave {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}
