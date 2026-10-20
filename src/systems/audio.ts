/**
 * Every sound in the TrainerDex is synthesised at runtime with WebAudio from the note data
 * below — original compositions, no audio files, nothing to license.
 *
 * Nothing plays until the visitor turns sound on (and the browser has seen a click/keypress).
 */

export type Sfx = 'cursor' | 'select' | 'back' | 'blip' | 'open' | 'save' | 'error' | 'start' | 'bump' | 'hit' | 'superHit' | 'weakHit' | 'miss' | 'faint' | 'statUp' | 'statDown' | 'heal' | 'encounter' | 'sendOut' | 'badge'

const NOTE_INDEX: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }
export function noteToFreq(note: string): number {
  const m = /^([A-G]#?)(\d)$/.exec(note)
  if (!m) return 0
  const semis = NOTE_INDEX[m[1]] + (Number(m[2]) + 1) * 12 - 69
  return 440 * Math.pow(2, semis / 12)
}

const tokens = (bars: string[]) => bars.join(' ').split(/\s+/)

export type Track = 'menu' | 'battle' | 'victory' | 'resort'

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
  // victory fanfare (plays once)
  victory: {
    bpm: 140,
    loop: false,
    lead: tokens(['C5 . C5 . C5 . G5 - - - E5 - G5 - - .', 'C6 - - - - - - - - - - - . . . .']),
    bass: [['C3', 'G3'], ['C3', 'C3']],
  },
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxOn = false
  private musicOn = false
  private volume = 0.6
  private musicTimer: number | null = null
  private nextStepTime = 0
  private step = 0
  private track: Track = 'menu'

  /** Switch the music track (only audible when music is on). */
  setTrack(track: Track) {
    if (track === this.track) return
    this.track = track
    this.step = 0
    if (this.ctx) this.nextStepTime = this.ctx.currentTime + 0.08
    if (this.musicOn && this.musicTimer == null) this.startMusic()
  }

  configure(opts: { sfx: boolean; music: boolean; volume: number }) {
    this.sfxOn = opts.sfx
    this.volume = Math.max(0, Math.min(1, opts.volume / 100))
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02)
    if (opts.music !== this.musicOn) {
      this.musicOn = opts.music
      if (opts.music) this.startMusic()
      else this.stopMusic()
    }
  }

  /** Call from a user gesture; browsers keep audio suspended until then. */
  unlock() {
    if (!this.sfxOn && !this.musicOn) return
    const ctx = this.ensure()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try {
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
    } catch {
      this.ctx = null
    }
    return this.ctx
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, slideTo?: number) {
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
    osc.connect(g).connect(this.master)
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

  private startMusic() {
    const ctx = this.ensure()
    if (!ctx || this.musicTimer != null) return
    this.step = 0
    this.nextStepTime = ctx.currentTime + 0.1
    this.musicTimer = window.setInterval(() => this.schedule(), 25)
  }

  private stopMusic() {
    if (this.musicTimer != null) window.clearInterval(this.musicTimer)
    this.musicTimer = null
  }

  private schedule() {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') {
      // keep the clock aligned while suspended so we don't burst-schedule on resume
      if (ctx) this.nextStepTime = ctx.currentTime + 0.1
      return
    }
    const tr = TRACKS[this.track]
    const step = 60 / tr.bpm / 4
    while (this.nextStepTime < ctx.currentTime + 0.12) {
      if (!tr.loop && this.step >= tr.lead.length) return
      const i = this.step % tr.lead.length
      const tok = tr.lead[i]
      if (tok !== '-' && tok !== '.') {
        let len = 1
        while (tr.lead[(i + len) % tr.lead.length] === '-' && i + len < tr.lead.length) len++
        this.tone(noteToFreq(tok), this.nextStepTime, len * step * 0.92, 'square', 0.035)
      }
      if (i % 2 === 0) {
        const [root, fifth] = tr.bass[Math.floor(i / 16) % tr.bass.length]
        this.tone(noteToFreq((i / 2) % 2 === 0 ? root : fifth), this.nextStepTime, step * 1.8, 'triangle', 0.09)
      }
      this.nextStepTime += step
      this.step++
    }
  }
}

export const audio = new AudioEngine()
