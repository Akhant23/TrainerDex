/**
 * Guestbook validation, shared by the browser (instant feedback) and the `submit-message`
 * Edge Function (the real gate). Plain TypeScript — no Deno or DOM APIs — so Vitest can test it.
 */

export const LIMITS = { name: 24, message: 280 } as const

/** Avatars a visitor can pick (creature ids + the trainer). */
export const AVATARS = ['trainer', 'byterat', 'beakerbun', 'riffin', 'gavelion', 'helixor', 'brushfox', 'subwoof', 'strikaroo', 'hootour', 'wicketoad', 'campfly', 'megaphawk', 'stitchick', 'diplomoth', 'datadillo'] as const
export type Avatar = (typeof AVATARS)[number]

export const KINDS = ['message', 'suggestion'] as const
export type Kind = (typeof KINDS)[number]

export interface Submission {
  name: string
  message: string
  avatar: string
  /** 'suggestion' = a creature / type idea for Aaryan; never shown publicly. */
  kind?: string
  /** Hidden field real people never fill in. */
  website?: string
}

export type ValidationResult = { ok: true; value: { name: string; message: string; avatar: Avatar; kind: Kind } } | { ok: false; error: string; spam?: boolean }

/** Collapse whitespace, strip control/zero-width characters, normalise Unicode. */
export function clean(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁯﻿]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// A small, deliberately conservative list. Matches whole words after leetspeak folding.
const BLOCKED = [
  'fuck', 'fucking', 'fucker', 'shit', 'bullshit', 'cunt', 'bitch', 'bastard', 'dick', 'cock', 'pussy',
  'slut', 'whore', 'fag', 'faggot', 'retard', 'nigger', 'nigga', 'twat', 'wanker', 'motherfucker', 'asshole', 'arsehole',
]
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' }

export function containsProfanity(text: string): boolean {
  const folded = text
    .toLowerCase()
    .replace(/[013457@$!]/g, (c) => LEET[c] ?? c)
    .replace(/(.)\1{2,}/g, '$1$1') // fuuuuck → fuuck
  const words = folded.split(/[^a-z]+/).filter(Boolean)
  const squashed = folded.replace(/[^a-z]/g, '') // f.u.c.k → fuck
  return words.some((w) => BLOCKED.includes(w) || BLOCKED.includes(w.replace(/(.)\1+/g, '$1'))) || BLOCKED.some((b) => b.length >= 5 && squashed.includes(b))
}

const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|xyz|ru|cn|info|biz|top|link|click)\b)/i

export function validateSubmission(input: Partial<Submission>): ValidationResult {
  if (input.website) return { ok: false, error: 'Message could not be sent.', spam: true }
  const name = clean(String(input.name ?? '')).replace(/\n/g, ' ')
  const message = clean(String(input.message ?? ''))
  const avatar = String(input.avatar ?? 'trainer')
  const kind = String(input.kind ?? 'message')
  if (!(KINDS as readonly string[]).includes(kind)) return { ok: false, error: 'Invalid request.' }

  if (!name) return { ok: false, error: 'Please enter a name.' }
  if (name.length > LIMITS.name) return { ok: false, error: `Names can be up to ${LIMITS.name} characters.` }
  if (!message) return { ok: false, error: 'Please write a message.' }
  if (message.length > LIMITS.message) return { ok: false, error: `Messages can be up to ${LIMITS.message} characters.` }
  if (!(AVATARS as readonly string[]).includes(avatar)) return { ok: false, error: 'Please pick an avatar.' }
  if (URL_RE.test(name) || URL_RE.test(message)) return { ok: false, error: 'Links aren’t allowed in messages.', spam: true }
  if (containsProfanity(name) || containsProfanity(message)) return { ok: false, error: 'Please keep it friendly — that message includes language that isn’t allowed.' }
  if (/(.)\1{9,}/.test(message)) return { ok: false, error: 'That message looks like spam.', spam: true }

  return { ok: true, value: { name, message, avatar: avatar as Avatar, kind: kind as Kind } }
}

/** Public trainer name for the resort (shown above avatars). */
export function validateTrainerName(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const name = clean(String(input ?? '')).replace(/\n/g, ' ')
  if (!name) return { ok: false, error: 'Please enter a trainer name.' }
  if (name.length > 16) return { ok: false, error: 'Trainer names can be up to 16 characters.' }
  if (URL_RE.test(name) || containsProfanity(name)) return { ok: false, error: 'Please choose a different name.' }
  return { ok: true, value: name }
}

/** Short greeting other visitors see in your speech bubble. */
export function validateGreeting(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const g = clean(String(input ?? '')).replace(/\n/g, ' ')
  if (g.length > 60) return { ok: false, error: 'Greetings can be up to 60 characters.' }
  if (URL_RE.test(g)) return { ok: false, error: 'Links aren’t allowed.' }
  if (containsProfanity(g)) return { ok: false, error: 'Please keep it friendly.' }
  return { ok: true, value: g || 'Hi!' }
}
