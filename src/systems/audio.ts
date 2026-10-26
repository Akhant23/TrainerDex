/**
 * Every sound in the TrainerDex is synthesised at runtime with WebAudio from the note data
 * below — original compositions, no audio files, nothing to license.
 *
 * Nothing plays until the visitor turns sound on (and the browser has seen a click/keypress).
 */

import { load, save } from './storage'

export type Sfx = 'cursor' | 'select' | 'back' | 'blip' | 'open' | 'save' | 'error' | 'start' | 'bump' | 'hit' | 'superHit' | 'weakHit' | 'miss' | 'faint' | 'statUp' | 'statDown' | 'heal' | 'encounter' | 'sendOut' | 'badge'

const NOTE_INDEX: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }
export function noteToFreq(note: string): number {
  const m = /^([A-G]#?)(\d)$/.exec(note)
  if (!m) return 0
  const semis = NOTE_INDEX[m[1]] + (Number(m[2]) + 1) * 12 - 69
  return 440 * Math.pow(2, semis / 12)
}

const tokens = (bars: string[]) => bars.join(' ').split(/\s+/)

export type Track = 'menu' | 'battle' | 'victory' | 'resort' | 'floor1' | 'floor2' | 'floor3' | 'floor4' | 'floor5'

interface TrackData {
  lead: string[]
  /** [root, fifth] per bar, played as alternating 8th notes */
  bass: Array<[string, string]>
  bpm: number
  loop: boolean
}

/**
 * Original compositions. One token per 16th note: a note name starts a note, '-' holds it,
 * '.' is a rest.
 */
const TRACKS: Record<Track, TrackData> = {
  // "Route 0" — main menu
  menu: {
    bpm: 132,
    loop: true,
    lead: tokens([
      'C5 - E5 - G5 - C6 - B5 - G5 - E5 - G5 -',
      'A5 - - - G5 - F5 - E5 - D5 - E5 - - -',
      'F5 - A5 - C6 - A5 - G5 - E5 - C5 - E5 -',
      'D5 - - - G4 - B4 - D5 - - - . . . .',
      'C5 - E5 - G5 - C6 - B5 - G5 - E5 - G5 -',
      'A5 - - - G5 - F5 - E5 - G5 - C6 - - -',
      'A5 - F5 - D5 - F5 - G5 - E5 - C5 - E5 -',
      'D5 - G4 - B4 - D5 - C5 - - - - - . .',
    ]),
    bass: [['C3', 'G3'], ['F2', 'C3'], ['F2', 'C3'], ['G2', 'D3'], ['C3', 'G3'], ['A2', 'E3'], ['F2', 'C3'], ['G2', 'D3']],
  },
  // "Objection Overruled" — trainer battle
  battle: {
    bpm: 160,
    loop: true,
    lead: tokens([
      'A4 . A4 C5 . A4 E5 . D5 . C5 . B4 . G4 .',
      'A4 . A4 C5 . A4 E5 . G5 - - - E5 - - .',
      'F5 . F5 E5 . D5 C5 . D5 . E5 . C5 . A4 .',
      'B4 . B4 C5 . D5 E5 - - - G#4 - B4 - E5 .',
    ]),
    bass: [['A2', 'E3'], ['A2', 'E3'], ['F2', 'C3'], ['E2', 'B2']],
  },
  // "Sunset Terrace" — the Battle Resort
  resort: {
    bpm: 112,
    loop: true,
    lead: tokens([
      'E5 . G5 . A5 - G5 . E5 . D5 . C5 - - .',
      'D5 . E5 . G5 - E5 . D5 - - - . . . .',
      'E5 . G5 . A5 - C6 . B5 . A5 . G5 - - .',
      'A5 . G5 . E5 . D5 . C5 - - - - - . .',
    ]),
    bass: [['C3', 'G3'], ['G2', 'D3'], ['A2', 'E3'], ['F2', 'C3']],
  },
  // Battle Tower floors: each a little faster and busier than the last
  // "School Run" — floor 1, SBHS
  floor1: {
    bpm: 120,
    loop: true,
    lead: tokens([
      'C5 . E5 . G5 . E5 . C5 . D5 . E5 - - .',
      'F5 . E5 . D5 . C5 . D5 - - - G4 - - .',
      'C5 . E5 . G5 . A5 . G5 . E5 . C5 . E5 .',
      'D5 . B4 . G4 . B4 . C5 - - - . . . .',
    ]),
    bass: [['C3', 'G3'], ['F2', 'C3'], ['C3', 'G3'], ['G2', 'D3']],
  },
  // "Colour Run" — floor 2, first year
  floor2: {
    bpm: 132,
    loop: true,
    lead: tokens([
      'F5 . A5 . C6 . A5 . G5 . F5 . D5 . F5 .',
      'E5 . G5 . C6 - - . A5 . G5 . F5 - - .',
      'D5 . F5 . A5 . F5 . G5 . A5 . A#5 . A5 .',
      'G5 . E5 . C5 . E5 . F5 - - - . . F5 .',
    ]),
    bass: [['F2', 'C3'], ['C3', 'G3'], ['D3', 'A3'], ['C3', 'G3']],
  },
  // "Ballroom Blitz" — floor 3, Law Ball and merch
  floor3: {
    bpm: 144,
    loop: true,
    lead: tokens([
      'D5 - F5 . A5 . D6 . C6 . A5 . F5 . A5 .',
      'G5 - A#5 . A5 . G5 . F5 . E5 . D5 - - .',
      'D5 - F5 . A5 . D6 . E6 . D6 . C6 . A5 .',
      'A#5 . A5 . G5 . E5 . D5 - - - C#5 - D5 .',
    ]),
    bass: [['D3', 'A3'], ['G2', 'D3'], ['D3', 'A3'], ['A2', 'E3']],
  },
  // "Tour Guide March" — floor 4, Yellow Shirts
  floor4: {
    bpm: 156,
    loop: true,
    lead: tokens([
      'G4 . G4 . B4 . D5 . G5 - - . D5 . B4 .',
      'C5 . E5 . G5 . E5 . D5 . C5 . B4 . A4 .',
      'G4 . B4 . D5 . G5 . A5 . B5 . A5 . G5 .',
      'F#5 . D5 . A4 . F#5 . G5 - - - G5 . . .',
    ]),
    bass: [['G2', 'D3'], ['C3', 'G3'], ['G2', 'D3'], ['D3', 'A3']],
  },
  // "Champion’s Rooftop" — floor 5
  floor5: {
    bpm: 172,
    loop: true,
    lead: tokens([
      'E5 . E5 G5 . E5 B5 . A5 . G5 . F#5 . E5 .',
      'C5 . C5 E5 . C5 A5 . G5 - - - F#5 - G5 .',
      'E5 . G5 B5 . G5 E6 . D6 . B5 . G5 . B5 .',
      'A5 . F#5 . D#5 . F#5 . B5 - - - B4 . B5 .',
    ]),
    bass: [['E2', 'B2'], ['C3', 'G3'], ['E2', 'B2'], ['B2', 'F#3']],
  },
  // victory fanfare (plays once)
  victory: {
    bpm: 140,
    loop: false,
    lead: tokens(['C5 . C5 . C5 . G5 - - - E5 - G5 - - .', 'C6 - - - - - - - - - - - . . . .']),
    bass: [['C3', 'G3'], ['C3', 'C3']],
  },
}

/** One entry in the jukebox: the tracks a visitor can pick by hand, named for where they play. */
export interface JukeboxTrack {
  id: Track
  name: string
  where: string
}

/**
 * Every pickable track, in jukebox order, with a stable id. The victory fanfare is a one-shot
 * jingle rather than a song, so it isn't listed.
 */
export const JUKEBOX: readonly JukeboxTrack[] = [
  { id: 'menu', name: 'Main Menu', where: 'The menu and every section' },
  { id: 'resort', name: 'Battle Resort', where: 'The resort plaza and the Tower reception' },
  { id: 'battle', name: 'Trainer Battle', where: 'Battles' },
  { id: 'floor1', name: 'Tower Floor 1: School', where: 'Battle Tower, first floor' },
  { id: 'floor2', name: 'Tower Floor 2: First Year', where: 'Battle Tower, second floor' },
  { id: 'floor3', name: 'Tower Floor 3: Law Ball', where: 'Battle Tower, third floor' },
  { id: 'floor4', name: 'Tower Floor 4: Tour Guides', where: 'Battle Tower, fourth floor' },
  { id: 'floor5', name: 'Tower Floor 5: Champion', where: 'Battle Tower, top floor' },
]

export const isJukeboxTrack = (v: unknown): v is Track => JUKEBOX.some((t) => t.id === v)

/**
 * What the music is doing, for the jukebox: `off` is the Music setting (the mute), `paused` is the
 * jukebox's pause, `blocked` means the browser is holding audio until a tap or key press, and
 * `unavailable` means this browser can't make sound at all.
 */
export type MusicState = 'off' | 'paused' | 'blocked' | 'playing' | 'unavailable'

export interface MusicStatus {
  state: MusicState
  /** The track that plays (or would, once unmuted / unpaused): the pick, else the area's. */
  current: Track
  /** A hand-picked track, which overrides the area's music until the visitor goes back to Auto. */
  pinned: Track | null
  /** The track the current place asks for. */
  area: Track
}

/** One playing track. Switching tracks fades the old voice out while the new one fades in. */
interface Voice {
  track: Track
  bus: GainNode
  step: number
  next: number
  /** Set once the voice is fading out: it stops scheduling notes and is dropped at this time. */
  endAt: number | null
}

const FADE = 0.4

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxOn = false
  private musicOn = false
  private volume = 0.6
  private musicTimer: number | null = null
  private voices: Voice[] = []
  private area: Track = 'menu'
  private pinned: Track | null = load<Track | null>('jukebox', null, (v): v is Track | null => v === null || isJukeboxTrack(v))
  private paused = false
  private unavailable = false
  private listeners = new Set<() => void>()
  private status: MusicStatus = this.computeStatus()

  /** The music the current place wants (screens call this as the visitor moves around). */
  setTrack(track: Track) {
    if (track === this.area) return
    this.area = track
    this.refreshMusic()
  }

  /** Pick a track by hand (null goes back to following the area). Saved across visits. */
  pin(track: Track | null) {
    this.pinned = track
    this.paused = false
    save('jukebox', track)
    this.refreshMusic()
  }

  setPaused(paused: boolean) {
    if (paused === this.paused) return
    this.paused = paused
    this.refreshMusic()
  }

  getStatus = (): MusicStatus => this.status

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private computeStatus(): MusicStatus {
    const current = this.pinned ?? this.area
    let state: MusicState = 'playing'
    if (this.unavailable) state = 'unavailable'
    else if (!this.musicOn) state = 'off'
    else if (this.paused) state = 'paused'
    else if (!this.ctx || this.ctx.state !== 'running') state = 'blocked'
    return { state, current, pinned: this.pinned, area: this.area }
  }

  private emit() {
    const next = this.computeStatus()
    const prev = this.status
    if (prev.state === next.state && prev.current === next.current && prev.pinned === next.pinned && prev.area === next.area) return
    this.status = next
    this.listeners.forEach((fn) => fn())
  }

  configure(opts: { sfx: boolean; music: boolean; volume: number }) {
    this.sfxOn = opts.sfx
    this.volume = Math.max(0, Math.min(1, opts.volume / 100))
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02)
    if (opts.music !== this.musicOn) {
      this.musicOn = opts.music
      this.refreshMusic()
    }
  }

  /** Call from a user gesture; browsers keep audio suspended until then. */
  unlock() {
    if (!this.sfxOn && !this.musicOn) return
    const ctx = this.ensure()
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') void ctx.resume().catch(() => {})
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) {
      this.unavailable = true
      this.emit()
      return null
    }
    try {
      const ctx = new Ctor()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(ctx.destination)
      ctx.addEventListener('statechange', () => this.emit())
    } catch {
      this.ctx = null
      this.unavailable = true
    }
    this.emit()
    return this.ctx
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, out?: AudioNode) {
    const ctx = this.ctx
    if (!ctx || !this.master || freq <= 0) return
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur)
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(gain, start + 0.005)
    g.gain.setValueAtTime(gain, start + Math.max(0.006, dur - 0.03))
    g.gain.linearRampToValueAtTime(0, start + dur)
    osc.connect(g).connect(out ?? this.master)
    osc.start(start)
    osc.stop(start + dur + 0.02)
  }

  /** Short burst of white noise (hits). */
  private noise(start: number, dur: number, gain: number) {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    const src = ctx.createBufferSource()
    const g = ctx.createGain()
    g.gain.value = gain
    src.buffer = buf
    src.connect(g).connect(this.master)
    src.start(start)
  }

  /**
   * A creature's cry: a short chirpy phrase whose pitch, shape and rhythm come from the creature's
   * id, so every species always sounds the same (and different from the others).
   */
  cry(id: string) {
    if (!this.sfxOn) return
    const ctx = this.ensure()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    let h = 2166136261
    for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
    const r = (n: number) => ((h >>> (n * 3)) % 1000) / 1000
    const base = 300 + r(0) * 500
    const types: OscillatorType[] = ['square', 'sawtooth', 'triangle']
    const type = types[h % 3]
    let t = ctx.currentTime + 0.01
    const notes = 2 + (h % 3)
    for (let i = 0; i < notes; i++) {
      const f = base * (1 + (r(i + 1) - 0.4) * 0.9)
      const dur = 0.07 + r(i + 4) * 0.09
      this.tone(f, t, dur, type, 0.08, f * (r(i + 7) > 0.5 ? 1.5 : 0.7))
      t += dur * 0.85
    }
  }

  play(name: Sfx) {
    if (!this.sfxOn) return
    const ctx = this.ensure()
    if (!ctx || ctx.state !== 'running') {
      if (ctx?.state === 'suspended') void ctx.resume()
      if (!ctx || ctx.state === 'closed') return
    }
    const t = ctx.currentTime + 0.01
    const sq = 'square' as const
    switch (name) {
      case 'cursor':
        this.tone(1320, t, 0.035, sq, 0.08)
        break
      case 'select':
        this.tone(988, t, 0.05, sq, 0.1)
        this.tone(1480, t + 0.05, 0.07, sq, 0.1)
        break
      case 'back':
        this.tone(740, t, 0.05, sq, 0.09)
        this.tone(494, t + 0.05, 0.07, sq, 0.09)
        break
      case 'blip':
        this.tone(560 + Math.random() * 60, t, 0.025, 'triangle', 0.12)
        break
      case 'open':
        this.tone(330, t, 0.14, sq, 0.07, 1320)
        break
      case 'bump':
        this.tone(220, t, 0.08, sq, 0.1, 110)
        break
      case 'error':
        this.tone(196, t, 0.09, sq, 0.1)
        this.tone(185, t + 0.1, 0.12, sq, 0.1)
        break
      case 'start':
        ;['C5', 'G5', 'C6'].forEach((n, i) => this.tone(noteToFreq(n), t + i * 0.08, 0.1, sq, 0.1))
        this.tone(noteToFreq('E6'), t + 0.24, 0.3, sq, 0.09)
        break
      case 'hit':
        this.noise(t, 0.09, 0.22)
        this.tone(160, t, 0.08, sq, 0.1, 80)
        break
      case 'superHit':
        this.noise(t, 0.16, 0.3)
        this.tone(220, t, 0.14, sq, 0.12, 60)
        this.tone(110, t + 0.08, 0.12, sq, 0.1, 50)
        break
      case 'weakHit':
        this.noise(t, 0.05, 0.12)
        break
      case 'miss':
        this.tone(900, t, 0.12, 'triangle', 0.07, 300)
        break
      case 'faint':
        this.tone(660, t, 0.5, sq, 0.08, 90)
        break
      case 'statUp':
        ;['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => this.tone(noteToFreq(n), t + i * 0.05, 0.06, sq, 0.06))
        break
      case 'statDown':
        ;['E6', 'C6', 'G5', 'E5', 'C5'].forEach((n, i) => this.tone(noteToFreq(n), t + i * 0.05, 0.06, sq, 0.06))
        break
      case 'heal':
        ;['G5', 'B5', 'D6', 'G6'].forEach((n, i) => this.tone(noteToFreq(n), t + i * 0.08, 0.1, 'triangle', 0.12))
        break
      case 'encounter':
        for (let i = 0; i < 6; i++) this.tone(i % 2 ? 1046 : 784, t + i * 0.07, 0.06, sq, 0.08)
        break
      case 'sendOut':
        this.tone(400, t, 0.18, sq, 0.07, 1400)
        this.noise(t + 0.18, 0.08, 0.15)
        break
      case 'badge':
        ;['G5', 'C6', 'E6', 'G6'].forEach((n, i) => this.tone(noteToFreq(n), t + i * 0.1, 0.12, sq, 0.08))
        this.tone(noteToFreq('C7'), t + 0.45, 0.6, sq, 0.08)
        break
      case 'save':
        ;['C6', 'E6', 'G6', 'C7'].forEach((n, i) => this.tone(noteToFreq(n), t + i * 0.09, 0.12, sq, 0.08))
        this.tone(noteToFreq('G6'), t + 0.4, 0.08, sq, 0.08)
        this.tone(noteToFreq('C7'), t + 0.5, 0.35, sq, 0.08)
        break
    }
  }

  /**
   * Bring what's playing in line with the settings, the pick and the area. The same track never
   * restarts; a different one crossfades in over FADE seconds, so at most two overlap, briefly.
   */
  private refreshMusic() {
    const want = this.musicOn && !this.paused ? (this.pinned ?? this.area) : null
    const live = this.voices.find((v) => v.endAt == null)
    if ((live?.track ?? null) === want) return this.emit()
    const ctx = want ? this.ensure() : this.ctx
    if (ctx && this.master) {
      const now = ctx.currentTime
      const running = ctx.state === 'running'
      // a quick fade when stopping, a crossfade when switching
      const fade = want ? FADE : 0.08
      for (const v of this.voices) {
        if (v.endAt != null) continue
        v.bus.gain.cancelScheduledValues(now)
        v.bus.gain.setValueAtTime(v.bus.gain.value, now)
        v.bus.gain.linearRampToValueAtTime(0, now + fade)
        v.endAt = now + fade
      }
      // while the browser holds audio nothing has played yet, so the old voice just goes
      if (!running) {
        this.voices.forEach((v) => v.bus.disconnect())
        this.voices = []
      }
      if (want) {
        const bus = ctx.createGain()
        bus.connect(this.master)
        const start = now + 0.06
        const crossfade = this.voices.length > 0
        bus.gain.setValueAtTime(crossfade ? 0 : 1, start)
        if (crossfade) bus.gain.linearRampToValueAtTime(1, start + FADE)
        this.voices.push({ track: want, bus, step: 0, next: start, endAt: null })
      }
      if (this.voices.length && this.musicTimer == null) this.musicTimer = window.setInterval(() => this.schedule(), 25)
    }
    this.emit()
  }

  private schedule() {
    const ctx = this.ctx
    if (!ctx) return
    if (ctx.state !== 'running') {
      // keep the clock aligned while suspended so we don't burst-schedule on resume
      for (const v of this.voices) v.next = ctx.currentTime + 0.1
      return
    }
    const now = ctx.currentTime
    this.voices = this.voices.filter((v) => {
      if (v.endAt == null || now < v.endAt) return true
      v.bus.disconnect()
      return false
    })
    for (const v of this.voices) this.scheduleVoice(v, now)
    if (!this.voices.length && this.musicTimer != null) {
      window.clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }

  private scheduleVoice(v: Voice, now: number) {
    const tr = TRACKS[v.track]
    const step = 60 / tr.bpm / 4
    while (v.next < now + 0.12) {
      if (v.endAt != null && v.next >= v.endAt) return
      if (!tr.loop && v.step >= tr.lead.length) return
      const i = v.step % tr.lead.length
      const tok = tr.lead[i]
      if (tok !== '-' && tok !== '.') {
        let len = 1
        while (tr.lead[(i + len) % tr.lead.length] === '-' && i + len < tr.lead.length) len++
        this.tone(noteToFreq(tok), v.next, len * step * 0.92, 'square', 0.035, undefined, v.bus)
      }
      if (i % 2 === 0) {
        const [root, fifth] = tr.bass[Math.floor(i / 16) % tr.bass.length]
        this.tone(noteToFreq((i / 2) % 2 === 0 ? root : fifth), v.next, step * 1.8, 'triangle', 0.09, undefined, v.bus)
      }
      v.next += step
      v.step++
    }
  }
}

export const audio = new AudioEngine()
