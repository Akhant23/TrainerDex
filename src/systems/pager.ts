/**
 * Poké Pager client. Only public values reach the browser: the Supabase URL, the anon key and
 * the Turnstile site key. Reads go straight to the REST API (RLS only returns approved
 * messages); writes go through the `submit-message` Edge Function.
 */
import type { Avatar } from '../../supabase/functions/_shared/validate'

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? ''

export const pagerConfigured = Boolean(URL && ANON)

export interface PublicMessage {
  id: string
  name: string
  message: string
  avatar: Avatar
  created_at: string
}

const headers = () => ({ apikey: ANON, Authorization: `Bearer ${ANON}` })

export async function fetchApproved(limit = 50): Promise<PublicMessage[]> {
  const res = await fetch(`${URL}/rest/v1/messages?select=id,name,message,avatar,created_at&order=created_at.desc&limit=${limit}`, { headers: headers() })
  if (!res.ok) throw new Error(`Couldn’t load messages (${res.status}).`)
  return res.json()
}

export async function submitMessage(body: { name: string; message: string; avatar: string; kind?: 'message' | 'suggestion'; turnstileToken: string; website: string; trainerId?: string; trainerSecret?: string }): Promise<void> {
  const res = await fetch(`${URL}/functions/v1/submit-message`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.ok) return
  let msg = 'Something went wrong sending your message.'
  try {
    const data = (await res.json()) as { error?: string }
    if (data.error) msg = data.error
  } catch {
    /* keep default */
  }
  throw new Error(msg)
}

/**
 * Supabase client for the phone controller's Realtime channel: anonymous, no session kept (lazy,
 * so it only loads when someone pairs a phone).
 */
export async function realtimeClient() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

/** Supabase client for the admin dashboard only (lazy, so visitors never download it). */
export async function adminClient() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(URL, ANON, { auth: { persistSession: true, storageKey: 'tdx-admin-auth' } })
}
