/**
 * Every sound in the TrainerDex is synthesised at runtime with WebAudio from the note data
 * below — original compositions, no audio files, nothing to license.
 *
 * Nothing plays until the visitor turns sound on (and the browser has seen a click/keypress).
 */

export type Sfx = 'cursor' | 'select' | 'back' | 'blip' | 'open' | 'save' | 'error' | 'start' | 'bump'

const NOTE_INDEX: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }
export function noteToFreq(note: string): number {
  const m = /^([A-G]#?)(\d)$/.exec(note)
  if (!m) return 0
  const semis = NOTE_INDEX[m[1]] + (Number(m[2]) + 1) * 12 - 69
  return 440 * Math.pow(2, semis / 12)
}

/**
 * "Route 0" — the main-menu theme. One token per 16th note:
 * a note name starts a note, '-' holds the previous one, '.' is a rest.
 */
const LEAD = [
  'C5 - E5 - G5 - C6 - B5 - G5 - E5 - G5 -',
  'A5 - - - G5 - F5 - E5 - D5 - E5 - - -',
  'F5 - A5 - C6 - A5 - G5 - E5 - C5 - E5 -',
  'D5 - - - G4 - B4 - D5 - - - . . . .',
  'C5 - E5 - G5 - C6 - B5 - G5 - E5 - G5 -',
  'A5 - - - G5 - F5 - E5 - G5 - C6 - - -',
  'A5 - F5 - D5 - F5 - G5 - E5 - C5 - E5 -',
  'D5 - G4 - B4 - D5 - C5 - - - - - . .',
]
  .join(' ')
  .split(/\s+/)

/** Bass: [root, fifth] per bar, played as alternating 8th notes. */
const BASS_BARS: Array<[string, string]> = [
  ['C3', 'G3'], ['F2', 'C3'], ['F2', 'C3'], ['G2', 'D3'],
  ['C3', 'G3'], ['A2', 'E3'], ['F2', 'C3'], ['G2', 'D3'],
]

const STEP = 60 / 132 / 4 // 132 bpm, 16th notes

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxOn = false
  private musicOn = false
  private volume = 0.6
  private musicTimer: number | null = null
  private nextStepTime = 0
  private step = 0

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
    while (this.nextStepTime < ctx.currentTime + 0.12) {
      const i = this.step % LEAD.length
      const tok = LEAD[i]
      if (tok !== '-' && tok !== '.') {
        let len = 1
        while (LEAD[(i + len) % LEAD.length] === '-') len++
        this.tone(noteToFreq(tok), this.nextStepTime, len * STEP * 0.92, 'square', 0.035)
      }
      if (i % 2 === 0) {
        const [root, fifth] = BASS_BARS[Math.floor(i / 16) % BASS_BARS.length]
        this.tone(noteToFreq((i / 2) % 2 === 0 ? root : fifth), this.nextStepTime, STEP * 1.8, 'triangle', 0.09)
      }
      this.nextStepTime += STEP
      this.step++
    }
  }
}

export const audio = new AudioEngine()
