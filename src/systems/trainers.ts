/**
 * Online resort trainers: other visitors' public avatars (and their latest approved Poké Pager
 * message), plus saving your own. Talks to Supabase only when it's configured.
 */
import { pagerConfigured } from './pager'
import type { Appearance } from '../sprites/character'
import { parseAppearance, parseParty } from '../../supabase/functions/_shared/appearance'
import { parseRecord, type BattleRecord } from '../../supabase/functions/_shared/trainer'

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
const headers = () => ({ apikey: ANON, Authorization: `Bearer ${ANON}` })

export interface OnlineTrainer {
  id: string
  name: string
  appearance: Appearance
  party: string[]
  greeting: string
  message?: string
  record: BattleRecord
  /** A resort regular (built-in), not a real visitor. */
  regular?: boolean
}

export const trainersOnline = pagerConfigured

export async function fetchTrainers(limit = 40): Promise<OnlineTrainer[]> {
  if (!trainersOnline) return []
  const [tRes, mRes] = await Promise.all([
    fetch(`${URL}/rest/v1/trainers?select=id,name,appearance,party,greeting,titles,wins,losses,updated_at&order=updated_at.desc&limit=${limit}`, { headers: headers() }),
    fetch(`${URL}/rest/v1/messages?select=trainer_id,message,created_at&trainer_id=not.is.null&order=created_at.desc&limit=200`, { headers: headers() }),
  ])
  if (!tRes.ok) throw new Error(`Couldn’t load trainers (${tRes.status}).`)
  const rows = (await tRes.json()) as Array<Record<string, unknown>>
  const latest = new Map<string, string>()
  if (mRes.ok) for (const m of (await mRes.json()) as Array<{ trainer_id: string; message: string }>) if (!latest.has(m.trainer_id)) latest.set(m.trainer_id, m.message)
  // never trust stored data blindly: drop anything that doesn't parse
  return rows.flatMap((r) => {
    const appearance = parseAppearance(r.appearance)
    const party = parseParty(r.party)
    if (!appearance || !party || typeof r.id !== 'string' || typeof r.name !== 'string') return []
    return [{ id: r.id, name: r.name, appearance, party, greeting: typeof r.greeting === 'string' ? r.greeting : 'Hi!', message: latest.get(r.id), record: parseRecord(r) }]
  })
}

export async function saveTrainer(body: { id: string; secret: string; name: string; greeting: string; appearance: Appearance; party: string[]; record: BattleRecord }): Promise<void> {
  if (!trainersOnline) return
  const res = await fetch(`${URL}/functions/v1/save-trainer`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.ok) return
  let msg = 'Couldn’t save your avatar online.'
  try {
    const d = (await res.json()) as { error?: string }
    if (d.error) msg = d.error
  } catch {
    /* keep default */
  }
  throw new Error(msg)
}

/** Push this visitor's current avatar, party and record online (no-op offline or without an avatar). */
export async function syncTrainer(): Promise<void> {
  const { resortSave } = await import('./resortSave')
  const s = resortSave.get()
  if (!trainersOnline || !s.avatar) return
  await saveTrainer({ id: s.trainerId, secret: s.secret, name: s.name, greeting: s.greeting, appearance: s.avatar, party: s.party, record: s.record })
}
