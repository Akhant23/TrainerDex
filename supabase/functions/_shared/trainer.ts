/**
 * Validation for a resort trainer save, shared by the browser and the `save-trainer` Edge
 * Function. Plain TypeScript so Vitest can test it.
 */
import { parseAppearance, parseParty, type AppearanceData } from './appearance.ts'
import { validateGreeting, validateTrainerName } from './validate.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SECRET_RE = /^[0-9a-f]{32,128}$/i

/** A visitor's Battle Resort record: Champion titles, wins, losses. */
export interface BattleRecord {
  titles: number
  wins: number
  losses: number
}

export function parseRecord(input: unknown): BattleRecord {
  const r = (input ?? {}) as Record<string, unknown>
  const n = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 99999 ? v : 0)
  return { titles: n(r.titles), wins: n(r.wins), losses: n(r.losses) }
}

/** "1-12-3" */
export const formatRecord = (r: BattleRecord) => `${r.titles}-${r.wins}-${r.losses}`

export interface TrainerSave {
  id: string
  secret: string
  name: string
  greeting: string
  appearance: AppearanceData
  party: string[]
  record: BattleRecord
}

export type TrainerResult = { ok: true; value: TrainerSave } | { ok: false; error: string }

export function validateTrainer(input: Record<string, unknown>): TrainerResult {
  const id = String(input.id ?? '')
  const secret = String(input.secret ?? '')
  if (!UUID_RE.test(id) || !SECRET_RE.test(secret)) return { ok: false, error: 'Invalid trainer id.' }
  const name = validateTrainerName(String(input.name ?? ''))
  if (!name.ok) return name
  const greeting = validateGreeting(String(input.greeting ?? ''))
  if (!greeting.ok) return greeting
  const appearance = parseAppearance(input.appearance)
  if (!appearance) return { ok: false, error: 'That avatar isn’t valid.' }
  const party = parseParty(input.party)
  if (!party) return { ok: false, error: 'Pick one to three creatures for your party.' }
  return { ok: true, value: { id: id.toLowerCase(), secret, name: name.value, greeting: greeting.value, appearance, party, record: parseRecord(input.record) } }
}
