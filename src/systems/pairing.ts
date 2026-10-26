/**
 * The phone-as-controller protocol: pairing codes, the keys derived from them, signed messages and
 * strict parsing. No network code here (see secondScreen.ts), so all of it is unit-tested.
 *
 * Security model
 * - The desktop makes a random 8-character code (about 40 bits). The QR code carries it; it can
 *   also be typed. The code is the pairing secret and is never sent over the network.
 * - From the code come two unrelated values: the Realtime channel name (a hash) and the signing
 *   key (another hash). Knowing the channel or a session id is not enough to send anything that
 *   the desktop will accept: every message carries an HMAC made with the key.
 * - Each pairing gets a fresh session nonce from the desktop, and every phone message carries a
 *   rising sequence number inside the signature, so old messages can't be replayed.
 * - The desktop accepts one phone at a time, validates and rate-limits every command, expires an
 *   unused code after a few minutes, and only ever turns commands into game-button presses.
 */
import type { GameKey } from './input'
import { isRemoteKey } from './commands'
import { hmacSha256, safeEqual, sha256, toHex, utf8 } from './sha256'

/** No 0/O, 1/I/L: easy to read off a screen and type. 31 symbols. */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const CODE_LENGTH = 8

/** An unused code stops working after this long. */
export const PAIR_TTL_MS = 5 * 60_000
/** A paired phone that drops off (refresh, tunnel, lock screen) can come back within this. */
export const RECONNECT_GRACE_MS = 45_000
/** A paired session with no input at all for this long ends itself. */
export const IDLE_TTL_MS = 30 * 60_000

type Rand = (n: number) => Uint8Array
const cryptoRand: Rand = (n) => crypto.getRandomValues(new Uint8Array(n))

/** Uniform random characters from `alphabet` (rejection sampling, so no symbol is favoured). */
export function randomString(length: number, alphabet = CODE_ALPHABET, rand: Rand = cryptoRand): string {
  const limit = 256 - (256 % alphabet.length)
  let out = ''
  while (out.length < length) {
    for (const b of rand(length * 2)) {
      if (b < limit && out.length < length) out += alphabet[b % alphabet.length]
    }
  }
  return out
}

export const newCode = (rand?: Rand) => randomString(CODE_LENGTH, CODE_ALPHABET, rand)
/** A random id for a phone or a session (lower-case, 16 characters, about 80 bits). */
export const newId = (rand?: Rand) => randomString(16, 'abcdefghijklmnopqrstuvwxyz234567', rand)

/** Tidy a typed code: case, spaces and dashes don't matter. */
export function normaliseCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[\s-]/g, '')
  if (s.length !== CODE_LENGTH) return null
  for (const c of s) if (!CODE_ALPHABET.includes(c)) return null
  return s
}

export const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`

export interface PairKeys {
  topic: string
  key: Uint8Array
}

export function deriveKeys(code: string): PairKeys {
  return {
    topic: 'tdx-pad-' + toHex(sha256(utf8('trainerdex/pad/topic|' + code))).slice(0, 32),
    key: sha256(utf8('trainerdex/pad/key|' + code)),
  }
}

/** The controller URL for the QR code, on whatever origin this page is served from. */
export function controllerUrl(code: string, loc: { origin: string; pathname: string } = window.location): string {
  return `${loc.origin}${loc.pathname}#/controller?c=${code}`
}

/* ---------------- messages ---------------- */

export interface ScreenSnapshot {
  title: string
  options: { label: string }[]
  selected: number
  locked: boolean
}

/** Phone → desktop. */
export type PadMessage =
  | { t: 'hello'; cid: string; n: string }
  | { t: 'key'; cid: string; sid: string; seq: number; k: GameKey; p: 'down' | 'up'; r: boolean }
  | { t: 'pick'; cid: string; sid: string; seq: number; i: number }
  | { t: 'bye'; cid: string; sid: string; seq: number }

/** Desktop → phone. */
export type HostMessage =
  | { t: 'welcome'; cid: string; n: string; sid: string }
  | { t: 'busy'; cid: string; n: string }
  | { t: 'state'; cid: string; sid: string; v: number; s: ScreenSnapshot }
  | { t: 'end'; cid: string; sid: string; why: 'cancelled' | 'expired' | 'idle' | 'replaced' }

type Dir = 'pad' | 'host'
type Signed<T> = T & { mac: string }

function canonical(dir: Dir, msg: Record<string, unknown>): string {
  const keys = Object.keys(msg)
    .filter((k) => k !== 'mac')
    .sort()
  return dir + '|' + JSON.stringify(keys.map((k) => [k, msg[k]]))
}

export function sign<T extends PadMessage | HostMessage>(key: Uint8Array, dir: Dir, msg: T): Signed<T> {
  return { ...msg, mac: toHex(hmacSha256(key, utf8(canonical(dir, msg as Record<string, unknown>)))) }
}

export function verify(key: Uint8Array, dir: Dir, msg: Record<string, unknown>): boolean {
  if (typeof msg.mac !== 'string' || msg.mac.length !== 64) return false
  return safeEqual(msg.mac, toHex(hmacSha256(key, utf8(canonical(dir, msg)))))
}

const ID = /^[a-z2-7]{16}$/
const isId = (v: unknown): v is string => typeof v === 'string' && ID.test(v)
const isSeq = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0 && (v as number) < 1e9
const exact = (o: Record<string, unknown>, keys: string[]) => Object.keys(o).length === keys.length && keys.every((k) => k in o)

/**
 * Check a phone message's shape and signature. Anything unexpected (extra fields, wrong types,
 * unknown buttons, a bad signature) is null.
 */
export function parsePadMessage(key: Uint8Array, raw: unknown): PadMessage | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const m = raw as Record<string, unknown>
  if (!verify(key, 'pad', m)) return null
  switch (m.t) {
    case 'hello':
      return exact(m, ['t', 'cid', 'n', 'mac']) && isId(m.cid) && isId(m.n) ? { t: 'hello', cid: m.cid, n: m.n } : null
    case 'key':
      return exact(m, ['t', 'cid', 'sid', 'seq', 'k', 'p', 'r', 'mac']) && isId(m.cid) && isId(m.sid) && isSeq(m.seq) && isRemoteKey(m.k) && (m.p === 'down' || m.p === 'up') && typeof m.r === 'boolean'
        ? { t: 'key', cid: m.cid, sid: m.sid, seq: m.seq, k: m.k, p: m.p, r: m.r }
        : null
    case 'pick':
      return exact(m, ['t', 'cid', 'sid', 'seq', 'i', 'mac']) && isId(m.cid) && isId(m.sid) && isSeq(m.seq) && Number.isInteger(m.i) && (m.i as number) >= 0 && (m.i as number) < 32
        ? { t: 'pick', cid: m.cid, sid: m.sid, seq: m.seq, i: m.i as number }
        : null
    case 'bye':
      return exact(m, ['t', 'cid', 'sid', 'seq', 'mac']) && isId(m.cid) && isId(m.sid) && isSeq(m.seq) ? { t: 'bye', cid: m.cid, sid: m.sid, seq: m.seq } : null
    default:
      return null
  }
}

function isSnapshot(v: unknown): v is ScreenSnapshot {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  return (
    typeof s.title === 'string' &&
    s.title.length <= 60 &&
    Array.isArray(s.options) &&
    s.options.length <= 32 &&
    s.options.every((o) => o && typeof o === 'object' && typeof (o as { label?: unknown }).label === 'string' && (o as { label: string }).label.length <= 60) &&
    Number.isInteger(s.selected) &&
    typeof s.locked === 'boolean'
  )
}

/** Check a desktop message the same way (the phone only trusts what its desktop signed). */
export function parseHostMessage(key: Uint8Array, raw: unknown): HostMessage | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const m = raw as Record<string, unknown>
  if (!verify(key, 'host', m)) return null
  switch (m.t) {
    case 'welcome':
      return isId(m.cid) && isId(m.n) && isId(m.sid) ? { t: 'welcome', cid: m.cid, n: m.n, sid: m.sid } : null
    case 'busy':
      return isId(m.cid) && isId(m.n) ? { t: 'busy', cid: m.cid, n: m.n } : null
    case 'state':
      return isId(m.cid) && isId(m.sid) && Number.isInteger(m.v) && isSnapshot(m.s) ? { t: 'state', cid: m.cid, sid: m.sid, v: m.v as number, s: m.s } : null
    case 'end':
      return isId(m.cid) && isId(m.sid) && (m.why === 'cancelled' || m.why === 'expired' || m.why === 'idle' || m.why === 'replaced') ? { t: 'end', cid: m.cid, sid: m.sid, why: m.why } : null
    default:
      return null
  }
}

/** Token bucket: `rate` events a second on average, bursts of up to `burst`. */
export class Throttle {
  private tokens: number
  private last: number
  private rate: number
  private burst: number
  private now: () => number
  constructor(rate: number, burst: number, now: () => number = () => performance.now()) {
    this.rate = rate
    this.burst = burst
    this.now = now
    this.tokens = burst
    this.last = now()
  }
  take(): boolean {
    const t = this.now()
    this.tokens = Math.min(this.burst, this.tokens + ((t - this.last) / 1000) * this.rate)
    this.last = t
    if (this.tokens < 1) return false
    this.tokens -= 1
    return true
  }
}
