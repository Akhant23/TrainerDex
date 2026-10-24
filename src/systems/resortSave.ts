import { useSyncExternalStore } from 'react'
import { load, save } from './storage'
import type { Appearance } from '../sprites/character'
import type { SpeciesId } from '../battle/data'
import { STARTER_PARTY } from '../battle/tower'
import type { BattleRecord } from '../../supabase/functions/_shared/trainer'

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
  /** Battle Resort record, shown as titles-wins-losses (e.g. 1-12-3). */
  record: BattleRecord
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

/** The look a visitor has until they make their own at the resort. */
export const DEFAULT_AVATAR: Appearance = {
  skin: 'light',
  hair: 'short',
  hairColour: 'brown',
  eyes: 'round',
  eyeColour: 'brown',
  face: 'smile',
  top: 'tee',
  topColour: 'blue',
  accentColour: 'white',
  hat: 'cap',
  hatColour: 'red',
  bottom: 'shorts',
  bottomColour: 'navy',
  shoes: 'sneakers',
  shoeColour: 'red',
  accessories: [],
}

const fresh = (): ResortSave => ({ avatar: null, name: '', greeting: 'Hi!', party: [...STARTER_PARTY], floorCleared: 0, record: { titles: 0, wins: 0, losses: 0 }, trainerId: uuid(), secret: randomId(24) })

let state: ResortSave = load('resort', fresh())
if (!state.trainerId || !state.secret) state = { ...state, ...fresh(), avatar: state.avatar, name: state.name }
if (!state.record) state = { ...state, record: { titles: 0, wins: 0, losses: 0 } }
const listeners = new Set<() => void>()

export const resortSave = {
  get: () => state,
  update(patch: Partial<ResortSave>) {
    state = { ...state, ...patch }
    save('resort', state)
    listeners.forEach((l) => l())
  },
}

/** Count a Battle Resort result: a win, a loss, or a win that earns a Champion title. */
export function recordResult(won: boolean, champion = false) {
  const r = state.record
  resortSave.update({ record: { titles: r.titles + (won && champion ? 1 : 0), wins: r.wins + (won ? 1 : 0), losses: r.losses + (won ? 0 : 1) } })
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

/**
 * The player's trainer, everywhere on the site: the avatar made at the Battle Resort (this save is
 * the one source of truth), or the default look until there is one. Battles, the VS screen, the
 * resort, the Pager and the main menu all read it from here, each drawing the pose it needs.
 */
export function playerLook(): Appearance {
  return state.avatar ?? DEFAULT_AVATAR
}
export function usePlayerLook(): Appearance {
  return useResortSave().avatar ?? DEFAULT_AVATAR
}
