/**
 * Phone-as-controller over Supabase Realtime (broadcast for messages, presence to notice who is
 * still there). The desktop is the host: it makes the code, checks every message (see pairing.ts)
 * and turns commands into game-button presses through systems/commands.ts. The phone is a thin
 * remote that only sends button presses and shows what the desktop tells it.
 *
 * Both sides keep their session in sessionStorage, so a refresh on either device reconnects
 * without pairing again (while the code is still valid).
 */
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { GameKey } from './input'
import { describeScreen, pickOption, pressGameKey, watchScreen } from './commands'
import { pagerConfigured, realtimeClient } from './pager'
import {
  controllerUrl,
  deriveKeys,
  IDLE_TTL_MS,
  newCode,
  newId,
  PAIR_TTL_MS,
  parseHostMessage,
  parsePadMessage,
  RECONNECT_GRACE_MS,
  sign,
  Throttle,
  type HostMessage,
  type PadMessage,
  type PairKeys,
  type ScreenSnapshot,
} from './pairing'

export const secondScreenAvailable = pagerConfigured

const EVENT = 'm'
const HOST_KEY = 'host'
/** Joining the channel can fail and retry a few times (a reload, a weak signal) before we say so. */
const JOIN_TIMEOUT_MS = 20_000

function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem('tdx:v1:' + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function writeSession(key: string, v: unknown) {
  try {
    if (v == null) sessionStorage.removeItem('tdx:v1:' + key)
    else sessionStorage.setItem('tdx:v1:' + key, JSON.stringify(v))
  } catch {
    /* storage off: just won't survive a refresh */
  }
}

let clientPromise: Promise<SupabaseClient> | null = null
const client = () => (clientPromise ??= realtimeClient())

class Store<S> {
  private listeners = new Set<() => void>()
  protected state: S
  constructor(state: S) {
    this.state = state
  }
  get = (): S => this.state
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }
  protected set(s: S) {
    this.state = s
    this.listeners.forEach((fn) => fn())
  }
}

/* ======================= desktop ======================= */

export type HostEnd = 'expired' | 'cancelled' | 'idle' | 'phone-left' | 'phone-disconnected'

export type HostState =
  | { phase: 'idle' }
  | { phase: 'starting' }
  | { phase: 'waiting'; code: string; url: string; expiresAt: number }
  | { phase: 'connected'; code: string; url: string }
  | { phase: 'reconnecting'; code: string; url: string; until: number }
  | { phase: 'ended'; why: HostEnd }
  | { phase: 'error'; message: string }

interface HostSaved {
  code: string
  createdAt: number
  cid: string | null
}

class HostPairing extends Store<HostState> {
  private channel: RealtimeChannel | null = null
  private keys: PairKeys | null = null
  private code = ''
  private createdAt = 0
  private cid: string | null = null
  private sid = ''
  private lastSeq = 0
  private version = 0
  private lastState = ''
  private held = new Map<GameKey, number>()
  private keyThrottle = new Throttle(20, 24)
  private inboxThrottle = new Throttle(60, 80)
  private timers: Record<'expire' | 'idle' | 'grace' | 'watchdog', number | null> = { expire: null, idle: null, grace: null, watchdog: null }
  private stopWatch: (() => void) | null = null
  private generation = 0

  constructor() {
    super({ phase: 'idle' })
  }

  get connected() {
    return this.state.phase === 'connected' || this.state.phase === 'reconnecting'
  }

  /** After a desktop refresh, pick the pairing back up if its code is still good. */
  resume() {
    const saved = readSession<HostSaved>('pad-host')
    if (!saved || this.state.phase !== 'idle') return
    if (!saved.cid && Date.now() - saved.createdAt > PAIR_TTL_MS) return writeSession('pad-host', null)
    void this.open(saved.code, saved.createdAt, saved.cid)
  }

  /** Make a new code and wait for a phone. */
  start() {
    void this.teardown()
    void this.open(newCode(), Date.now(), null)
  }

  cancel() {
    this.sendEnd('cancelled')
    void this.teardown()
    this.set({ phase: 'idle' })
  }

  /** Forget an ended/errored session so the panel shows its start screen again. */
  reset() {
    if (this.state.phase === 'ended' || this.state.phase === 'error') this.set({ phase: 'idle' })
  }

  private async open(code: string, createdAt: number, cid: string | null) {
    const gen = ++this.generation
    this.set({ phase: 'starting' })
    this.code = code
    this.createdAt = createdAt
    this.cid = cid
    this.sid = ''
    this.keys = deriveKeys(code)
    writeSession('pad-host', { code, createdAt, cid } satisfies HostSaved)
    let db: SupabaseClient
    try {
      db = await client()
    } catch {
      return this.fail('Couldn’t load the connection library. Check your internet connection.')
    }
    if (gen !== this.generation) return
    const ch = db.channel(this.keys.topic, { config: { broadcast: { self: false, ack: false }, presence: { key: HOST_KEY } } })
    this.channel = ch
    ch.on('broadcast', { event: EVENT }, ({ payload }) => this.receive(payload))
    ch.on('presence', { event: 'join' }, ({ key }) => key === this.padKey() && this.phoneBack())
    ch.on('presence', { event: 'leave' }, ({ key, currentPresences }) => key === this.padKey() && currentPresences.length === 0 && this.phoneGone())
    ch.subscribe((status) => {
      if (import.meta.env.DEV) console.debug('[second screen] desktop channel:', status)
      if (gen !== this.generation) return
      if (status === 'SUBSCRIBED') {
        void ch.track({ role: 'host' })
        if (this.state.phase === 'starting') {
          if (this.cid) this.set({ phase: 'reconnecting', code, url: controllerUrl(code), until: Date.now() + RECONNECT_GRACE_MS })
          else this.waiting()
          if (this.cid) this.armGrace()
        }
      }
      // CHANNEL_ERROR / TIMED_OUT: the client keeps retrying the join by itself; JOIN_TIMEOUT_MS gives up
    })
    window.setTimeout(() => {
      if (gen === this.generation && this.state.phase === 'starting') this.fail('Couldn’t reach the pairing service. Try again in a moment.')
    }, JOIN_TIMEOUT_MS)
  }

  private padKey() {
    return this.cid ? `pad-${this.cid}` : ''
  }
  private present(key: string) {
    return Boolean(this.channel && (this.channel.presenceState()[key]?.length ?? 0) > 0)
  }

  private waiting() {
    const expiresAt = this.createdAt + PAIR_TTL_MS
    this.set({ phase: 'waiting', code: this.code, url: controllerUrl(this.code), expiresAt })
    this.clear('expire')
    this.timers.expire = window.setTimeout(() => this.end('expired'), Math.max(0, expiresAt - Date.now()))
  }

  private fail(message: string) {
    void this.teardown()
    this.set({ phase: 'error', message })
  }

  private clear(t: keyof HostPairing['timers']) {
    const id = this.timers[t]
    if (id != null) {
      window.clearTimeout(id)
      window.clearInterval(id)
    }
    this.timers[t] = null
  }

  private send(msg: HostMessage) {
    if (!this.channel || !this.keys) return
    void this.channel.send({ type: 'broadcast', event: EVENT, payload: sign(this.keys.key, 'host', msg) })
  }

  private sendEnd(why: 'cancelled' | 'expired' | 'idle') {
    if (this.cid && this.sid) this.send({ t: 'end', cid: this.cid, sid: this.sid, why })
  }

  private end(why: HostEnd) {
    if (why === 'expired' || why === 'idle' || why === 'cancelled') this.sendEnd(why)
    void this.teardown()
    this.set({ phase: 'ended', why })
  }

  private async teardown() {
    this.generation++
    this.releaseAll()
    for (const t of Object.keys(this.timers) as Array<keyof HostPairing['timers']>) this.clear(t)
    this.stopWatch?.()
    this.stopWatch = null
    const ch = this.channel
    this.channel = null
    this.cid = null
    this.sid = ''
    this.lastState = ''
    writeSession('pad-host', null)
    if (ch) {
      try {
        await ch.untrack()
      } catch {
        /* already gone */
      }
      const db = await client().catch(() => null)
      void db?.removeChannel(ch)
    }
  }

  /** Every phone message lands here; nothing is acted on until it has passed parsePadMessage. */
  private receive(payload: unknown) {
    if (!this.keys || !this.inboxThrottle.take()) return
    const msg = parsePadMessage(this.keys.key, payload)
    if (!msg) return
    if (msg.t === 'hello') return this.hello(msg)
    if (msg.cid !== this.cid || msg.sid !== this.sid || msg.seq <= this.lastSeq) return
    this.lastSeq = msg.seq
    this.touch()
    if (msg.t === 'bye') return this.end('phone-disconnected')
    if (msg.t === 'pick') {
      if (this.keyThrottle.take()) pickOption(msg.i)
      return
    }
    this.key(msg)
  }

  private hello(msg: Extract<PadMessage, { t: 'hello' }>) {
    const live = this.state.phase === 'connected' || this.state.phase === 'reconnecting'
    if (this.cid && msg.cid !== this.cid && (live || this.present(this.padKey()))) {
      // one controller per desktop: a second phone is told so, and nothing changes here
      return this.send({ t: 'busy', cid: msg.cid, n: msg.n })
    }
    if (this.state.phase !== 'waiting' && this.state.phase !== 'connected' && this.state.phase !== 'reconnecting') return
    this.cid = msg.cid
    this.sid = newId()
    this.lastSeq = 0
    this.lastState = ''
    writeSession('pad-host', { code: this.code, createdAt: this.createdAt, cid: this.cid } satisfies HostSaved)
    this.clear('expire')
    this.clear('grace')
    this.send({ t: 'welcome', cid: msg.cid, n: msg.n, sid: this.sid })
    this.set({ phase: 'connected', code: this.code, url: controllerUrl(this.code) })
    this.touch()
    if (!this.stopWatch) this.stopWatch = watchScreen(() => this.pushState())
    this.pushState()
    // and once more after the welcome has landed, in case the first state overtook it
    window.setTimeout(() => {
      this.lastState = ''
      this.pushState()
    }, 500)
    if (this.timers.watchdog == null) this.timers.watchdog = window.setInterval(() => this.releaseStale(), 250)
  }

  private key(msg: Extract<PadMessage, { t: 'key' }>) {
    if (msg.p === 'down') {
      // releases always go through, so a dropped press can never leave a key stuck down
      if (!this.keyThrottle.take()) return
      this.held.set(msg.k, performance.now())
      // a held A/B/START only says it's still held; only the D-pad auto-repeats, like a keyboard
      const dpad = msg.k === 'up' || msg.k === 'down' || msg.k === 'left' || msg.k === 'right'
      if (msg.r && !dpad) return
      pressGameKey(msg.k, 'down', msg.r)
    } else {
      this.held.delete(msg.k)
      pressGameKey(msg.k, 'up')
    }
  }

  /** A held button the phone stopped repeating (it went quiet mid-press) is let go. */
  private releaseStale() {
    const now = performance.now()
    for (const [k, t] of this.held) {
      if (now - t > 1200) {
        this.held.delete(k)
        pressGameKey(k, 'up')
      }
    }
  }
  private releaseAll() {
    for (const k of this.held.keys()) pressGameKey(k, 'up')
    this.held.clear()
  }

  private touch() {
    this.clear('idle')
    this.timers.idle = window.setTimeout(() => this.end('idle'), IDLE_TTL_MS)
  }

  private phoneGone() {
    if (this.state.phase !== 'connected') return
    this.releaseAll()
    this.set({ phase: 'reconnecting', code: this.code, url: controllerUrl(this.code), until: Date.now() + RECONNECT_GRACE_MS })
    this.armGrace()
  }
  private armGrace() {
    this.clear('grace')
    this.timers.grace = window.setTimeout(() => this.end('phone-left'), RECONNECT_GRACE_MS)
  }
  private phoneBack() {
    if (this.state.phase !== 'reconnecting' || !this.sid) return
    this.clear('grace')
    this.set({ phase: 'connected', code: this.code, url: controllerUrl(this.code) })
    this.lastState = ''
    this.pushState()
  }

  private pushState() {
    if (!this.cid || !this.sid || this.state.phase !== 'connected') return
    const s: ScreenSnapshot = describeScreen()
    const json = JSON.stringify(s)
    if (json === this.lastState) return
    this.lastState = json
    this.send({ t: 'state', cid: this.cid, sid: this.sid, v: ++this.version, s })
  }
}

export const secondScreenHost = new HostPairing()

/* ======================= phone ======================= */

export type PadEnd = 'cancelled' | 'expired' | 'idle' | 'replaced' | 'host-gone' | 'disconnected'

export type PadState =
  | { phase: 'entry'; error?: string }
  | { phase: 'joining'; code: string }
  | { phase: 'pairing'; code: string }
  | { phase: 'connected'; code: string; screen: ScreenSnapshot | null }
  | { phase: 'host-away'; code: string; screen: ScreenSnapshot | null }
  /** This phone lost its own connection; the client is rejoining by itself. */
  | { phase: 'reconnecting'; code: string; screen: ScreenSnapshot | null }
  | { phase: 'busy' }
  | { phase: 'not-found' }
  | { phase: 'ended'; why: PadEnd }
  | { phase: 'error'; message: string }

interface PadSaved {
  code: string
  cid: string
}

const HELLO_EVERY = 1500
/** With no desktop on the channel for this long, the code is wrong or has expired. */
const FIND_HOST_MS = 9000
/** A desktop that went away (refresh, sleep) gets this long to come back. */
const HOST_AWAY_MS = 120_000

class PadSession extends Store<PadState> {
  private channel: RealtimeChannel | null = null
  private keys: PairKeys | null = null
  private code = ''
  private cid = ''
  private sid = ''
  private nonce = ''
  private seq = 0
  private version = 0
  private screen: ScreenSnapshot | null = null
  private helloTimer: number | null = null
  private findTimer: number | null = null
  private awayTimer: number | null = null
  private generation = 0
  private sendThrottle = new Throttle(16, 20)

  constructor() {
    super({ phase: 'entry' })
  }

  /** The saved session, if this tab was already paired (so a refresh reconnects). */
  savedCode(): string | null {
    return readSession<PadSaved>('pad')?.code ?? null
  }

  async connect(code: string) {
    // the old channel is let go in the background; everything up to the first await below runs
    // at once, so the saved code and the state are already the new ones when this returns
    void this.leave()
    const gen = ++this.generation
    const saved = readSession<PadSaved>('pad')
    this.code = code
    this.cid = saved?.code === code ? saved.cid : newId()
    this.sid = ''
    this.seq = 0
    this.screen = null
    this.keys = deriveKeys(code)
    writeSession('pad', { code, cid: this.cid } satisfies PadSaved)
    this.set({ phase: 'joining', code })
    let db: SupabaseClient
    try {
      db = await client()
    } catch {
      return this.set({ phase: 'error', message: 'Couldn’t load the connection library. Check your internet connection.' })
    }
    if (gen !== this.generation) return
    const ch = db.channel(this.keys.topic, { config: { broadcast: { self: false, ack: false }, presence: { key: `pad-${this.cid}` } } })
    this.channel = ch
    ch.on('broadcast', { event: EVENT }, ({ payload }) => this.receive(payload))
    ch.on('presence', { event: 'sync' }, () => this.presenceChanged())
    ch.subscribe((status) => {
      if (import.meta.env.DEV) console.debug('[second screen] phone channel:', status)
      if (gen !== this.generation) return
      if (status === 'SUBSCRIBED') {
        void ch.track({ role: 'pad' })
        if (this.state.phase === 'joining') this.set({ phase: 'pairing', code })
        // back after a drop: the desktop kept the pairing, so carry on where we were
        if (this.state.phase === 'reconnecting') return this.set({ phase: 'connected', code, screen: this.screen })
        this.startHello()
        this.findTimer ??= window.setTimeout(() => {
          if (!this.hostHere() && this.state.phase === 'pairing') this.giveUp({ phase: 'not-found' })
        }, FIND_HOST_MS)
      } else if (this.state.phase === 'connected') {
        this.set({ phase: 'reconnecting', code, screen: this.screen })
      }
    })
    window.setTimeout(() => {
      if (gen !== this.generation || this.state.phase !== 'joining') return
      // keep the saved code: coming back online or to the tab tries again
      void this.leave()
      this.set({ phase: 'error', message: 'Couldn’t reach the pairing service. Check your connection and try again.' })
    }, JOIN_TIMEOUT_MS)
  }

  private hostHere() {
    return Boolean(this.channel && (this.channel.presenceState()[HOST_KEY]?.length ?? 0) > 0)
  }

  private startHello() {
    if (this.helloTimer != null) return
    const hello = () => {
      if (!this.keys || !this.channel) return
      if (this.state.phase !== 'pairing' && this.state.phase !== 'host-away') return this.stopHello()
      this.nonce = newId()
      void this.channel.send({ type: 'broadcast', event: EVENT, payload: sign(this.keys.key, 'pad', { t: 'hello', cid: this.cid, n: this.nonce }) })
    }
    hello()
    this.helloTimer = window.setInterval(hello, HELLO_EVERY)
  }
  private stopHello() {
    if (this.helloTimer != null) window.clearInterval(this.helloTimer)
    this.helloTimer = null
  }

  private presenceChanged() {
    const here = this.hostHere()
    const s = this.state
    if (!here && s.phase === 'connected') {
      this.set({ phase: 'host-away', code: this.code, screen: this.screen })
      this.awayTimer = window.setTimeout(() => this.giveUp({ phase: 'ended', why: 'host-gone' }), HOST_AWAY_MS)
    } else if (here && s.phase === 'host-away') {
      // the desktop is back (it may have refreshed): say hello again
      if (this.awayTimer != null) window.clearTimeout(this.awayTimer)
      this.awayTimer = null
      this.startHello()
    }
  }

  private receive(payload: unknown) {
    if (!this.keys) return
    const msg = parseHostMessage(this.keys.key, payload)
    if (!msg || msg.cid !== this.cid) return
    if (msg.t === 'busy') {
      if (msg.n === this.nonce) this.giveUp({ phase: 'busy' })
      return
    }
    if (msg.t === 'welcome') {
      if (msg.n !== this.nonce) return
      this.sid = msg.sid
      this.seq = 0
      this.version = 0
      this.stopHello()
      if (this.findTimer != null) window.clearTimeout(this.findTimer)
      if (this.awayTimer != null) window.clearTimeout(this.awayTimer)
      this.awayTimer = null
      this.set({ phase: 'connected', code: this.code, screen: this.screen })
      return
    }
    if (msg.sid !== this.sid) return
    if (msg.t === 'state') {
      if (msg.v <= this.version) return
      this.version = msg.v
      this.screen = msg.s
      if (this.state.phase === 'connected' || this.state.phase === 'host-away') this.set({ ...this.state, screen: msg.s })
      return
    }
    if (msg.t === 'end') this.giveUp({ phase: 'ended', why: msg.why })
  }

  private send(msg: PadMessage) {
    if (!this.keys || !this.channel || this.state.phase !== 'connected') return false
    void this.channel.send({ type: 'broadcast', event: EVENT, payload: sign(this.keys.key, 'pad', msg) })
    return true
  }

  press(k: GameKey, p: 'down' | 'up', repeat = false) {
    if (p === 'down' && !this.sendThrottle.take()) return
    this.send({ t: 'key', cid: this.cid, sid: this.sid, seq: ++this.seq, k, p, r: repeat })
  }

  pick(i: number) {
    if (!this.sendThrottle.take()) return
    this.send({ t: 'pick', cid: this.cid, sid: this.sid, seq: ++this.seq, i })
  }

  disconnect() {
    if (this.sid) this.send({ t: 'bye', cid: this.cid, sid: this.sid, seq: ++this.seq })
    this.giveUp({ phase: 'ended', why: 'disconnected' })
  }

  /** Back to the code entry (after an error or an ended session). */
  reset(error?: string) {
    void this.leave()
    this.set({ phase: 'entry', error })
  }

  private giveUp(next: PadState) {
    writeSession('pad', null)
    void this.leave()
    this.set(next)
  }

  private async leave() {
    this.generation++
    this.stopHello()
    for (const t of [this.findTimer, this.awayTimer]) if (t != null) window.clearTimeout(t)
    this.findTimer = null
    this.awayTimer = null
    const ch = this.channel
    this.channel = null
    if (ch) {
      try {
        await ch.untrack()
      } catch {
        /* gone */
      }
      const db = await client().catch(() => null)
      void db?.removeChannel(ch)
    }
  }
}

export const padSession = new PadSession()
