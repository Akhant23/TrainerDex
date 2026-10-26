/**
 * "Forget me": removes what this browser sent to the server — the resort avatar, any Poké Pager
 * messages or suggestions (using the random secret stored only in this browser) and its visit
 * stats (by its random visitor id).
 */
import { pagerConfigured } from './pager'
import { resortSave } from './resortSave'
import { visitorId } from './analytics'

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

export async function forgetMe(): Promise<{ messages: number; trainers: number; visits?: number } | null> {
  if (!pagerConfigured) return null
  const { trainerId, secret } = resortSave.get()
  const res = await fetch(`${URL}/functions/v1/forget-me`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ trainerId, secret, visitorId: visitorId() }),
  })
  if (!res.ok) throw new Error('Couldn’t remove your data from the server right now.')
  return (await res.json()) as { messages: number; trainers: number; visits?: number }
}
