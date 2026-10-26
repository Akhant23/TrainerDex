import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { audio, JUKEBOX, type MusicStatus, type Track } from '../systems/audio'
import { useSettings } from '../systems/settings'
import type { Palette, Pixels } from '../sprites/pixels'
import { pixelsToDataUrl } from '../sprites/render'
import { PixelIcon } from './PixelIcon'
import { useMusicStatus } from './useMusicStatus'

/** Each track's record label, so the disc changes with the song. */
const LABEL: Record<Track, string> = {
  menu: '#e0383e',
  resort: '#40c0b0',
  battle: '#f0a020',
  victory: '#f0b830',
  floor1: '#58b850',
  floor2: '#3a6fd0',
  floor3: '#b050c8',
  floor4: '#f8c838',
  floor5: '#e8e8f0',
}

const DISC = 24
/**
 * A 24×24 record drawn from its radius: ink rim, alternating grooves, a sheen in one quadrant and a
 * spot on the label, so a quarter turn reads as spinning.
 */
const discPixels: Pixels = (() => {
  const c = (DISC - 1) / 2
  const rows: string[] = []
  for (let y = 0; y < DISC; y++) {
    let row = ''
    for (let x = 0; x < DISC; x++) {
      const dx = x - c
      const dy = y - c
      const d = Math.hypot(dx, dy)
      const a = Math.atan2(dy, dx)
      if (d > c + 0.4) row += '.'
      else if (d > c - 0.6) row += 'K'
      else if (d < 1.1) row += 'K'
      else if (d < 4.6) row += dx > 0.5 && dx < 2.6 && dy < -0.5 && dy > -2.6 ? 'W' : 'L'
      else if (d < 5.4) row += 'K'
      else if (a > -2.5 && a < -1.9 && d > 6 && d < c - 1.5) row += 'h'
      else row += Math.floor(d) % 2 ? 'k' : 'g'
    }
    rows.push(row)
  }
  return rows
})()

/** The tonearm, resting on the record's edge (it doesn't turn). */
const ARM: Pixels = ['..KKK.', '.KhhhK', '.KhKhK', '..KhK.', '..KhK.', '..KhK.', '..KhK.', '..KhK.', '.KhK..', 'KhK...', 'KWK...', '.K....']

function Turntable({ track, spinning }: { track: Track; spinning: boolean }) {
  const palette = useMemo<Palette>(() => ({ K: '#14121e', k: '#1f1d2b', g: '#34324a', h: '#8a88a8', W: '#f8f8f0', L: LABEL[track] }), [track])
  const disc = useMemo(() => pixelsToDataUrl(discPixels, palette), [palette])
  const arm = useMemo(() => pixelsToDataUrl(ARM, palette), [palette])
  return (
    <div className="jukebox-deck relative flex shrink-0 items-center justify-center" aria-hidden>
      <img src={disc} width={DISC * 3} height={DISC * 3} alt="" draggable={false} className={`pixelated jukebox-disc ${spinning ? 'jukebox-disc--spin' : ''}`} />
      <img src={arm} width={6 * 3} height={12 * 3} alt="" draggable={false} className="pixelated absolute top-[6px] right-[4px]" />
    </div>
  )
}

const ROWS: ReadonlyArray<{ id: Track | null; name: string; where: string }> = [{ id: null, name: 'Auto', where: 'Follows where you are' }, ...JUKEBOX]

/**
 * The system bar's jukebox: a button that opens a small record-player panel. Picking a song pins
 * it everywhere (and across visits) until AUTO is chosen again; the Music toggle stays the mute.
 */
export function Jukebox() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { sfx } = useSettings()
  const status = useMusicStatus()
  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }
  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        className="pixel-btn pixel-btn--ghost sysbar-icon !p-1"
        aria-label="Open jukebox"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Jukebox"
        onClick={() => {
          sfx(open ? 'back' : 'open')
          setOpen((o) => !o)
        }}
      >
        <span className="relative inline-flex rounded-sm bg-paper/90 p-0.5">
          <PixelIcon name="jukebox" scale={2} />
          {status.state === 'playing' && <span aria-hidden className="sysbar-led" />}
        </span>
      </button>
      {open && <JukeboxPanel status={status} onClose={close} anchor={buttonRef} />}
    </span>
  )
}

function JukeboxPanel({ status, onClose, anchor }: { status: MusicStatus; onClose: () => void; anchor: RefObject<HTMLButtonElement | null> }) {
  const { sfx, saved, saveSettings, reducedMotion } = useSettings()
  const panelRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([])
  const controlRefs = useRef<Array<HTMLButtonElement | null>>([])
  const titleId = useId()
  const selectedRow = Math.max(0, ROWS.findIndex((r) => r.id === status.pinned))
  const [focus, setFocus] = useState(selectedRow)

  useEffect(() => {
    rowRefs.current[selectedRow]?.focus()
    // only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // a click anywhere else closes it, like any pop-up menu
  useEffect(() => {
    const on = (e: PointerEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || anchor.current?.contains(t)) return
      onClose()
    }
    document.addEventListener('pointerdown', on)
    return () => document.removeEventListener('pointerdown', on)
  }, [onClose, anchor])

  const pick = (id: Track | null) => {
    sfx('select')
    audio.unlock()
    audio.pin(id)
  }
  const skip = (d: number) => {
    const i = JUKEBOX.findIndex((t) => t.id === status.current)
    const next = JUKEBOX[(i + d + JUKEBOX.length) % JUKEBOX.length]
    sfx('cursor')
    audio.unlock()
    audio.pin(next.id)
    setFocus(ROWS.findIndex((r) => r.id === next.id))
  }
  const playing = status.state === 'playing'
  const togglePlay = () => {
    sfx('select')
    audio.unlock()
    audio.setPaused(playing)
  }

  const focusRow = (i: number) => {
    const n = Math.max(0, Math.min(ROWS.length - 1, i))
    setFocus(n)
    rowRefs.current[n]?.focus()
    sfx('cursor')
  }

  // The panel keeps its keys to itself: arrows move inside it, X/Esc close it, and nothing reaches
  // the screen underneath (which listens on window) while focus is in here.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') return
    e.stopPropagation()
    const active = document.activeElement
    const row = rowRefs.current.indexOf(active as HTMLButtonElement)
    const ctl = controlRefs.current.indexOf(active as HTMLButtonElement)
    const k = e.key
    if (k === 'Escape' || k === 'x' || k === 'X' || k === 'Backspace') {
      e.preventDefault()
      sfx('back')
      onClose()
    } else if (k === 'ArrowDown') {
      e.preventDefault()
      if (row >= 0 && row < ROWS.length - 1) focusRow(row + 1)
      else if (row === ROWS.length - 1) controlRefs.current[1]?.focus()
      else sfx('bump')
    } else if (k === 'ArrowUp') {
      e.preventDefault()
      if (row > 0) focusRow(row - 1)
      else if (ctl >= 0) focusRow(focus)
      else sfx('bump')
    } else if ((k === 'ArrowLeft' || k === 'ArrowRight') && ctl >= 0) {
      e.preventDefault()
      const next = ctl + (k === 'ArrowLeft' ? -1 : 1)
      if (next >= 0 && next < controlRefs.current.length) {
        controlRefs.current[next]?.focus()
        sfx('cursor')
      } else sfx('bump')
    } else if (k === 'z' || k === 'Z') {
      e.preventDefault()
      ;(active as HTMLElement | null)?.click()
    }
  }

  const track = JUKEBOX.find((t) => t.id === status.current) ?? JUKEBOX[0]
  const spinning = playing && !reducedMotion

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={titleId}
      className="jukebox-panel pixel-box pixel-box--dark fixed inset-x-3 top-[76px] z-50 text-paper sm:absolute sm:inset-x-auto sm:top-[calc(100%+10px)] sm:right-0 sm:w-[340px]"
      onKeyDown={onKeyDown}
    >
      <div className="gv-header font-display flex items-center justify-between px-3 py-1.5 text-[15px]">
        <h2 id={titleId} className="m-0 text-[15px] font-semibold tracking-wide">
          ♪ JUKEBOX
        </h2>
        <button type="button" className="pixel-btn !m-0 !px-2 !py-0.5 !text-[13px]" aria-label="Close jukebox" onClick={() => (sfx('back'), onClose())}>
          ✕
        </button>
      </div>

      <div className="flex items-center gap-3 px-3 pt-3">
        <Turntable track={track.id} spinning={spinning} />
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="font-display m-0 text-[13px] text-frame-hi">{statusLabel(status)}</p>
          <p className="font-display m-0 truncate text-[16px] text-gold">{track.name}</p>
          <p className="m-0 text-[13px] leading-snug text-frame-hi">{status.pinned ? 'Your pick plays everywhere until you choose AUTO.' : 'AUTO: the music follows where you are.'}</p>
        </div>
      </div>

      {status.state === 'off' && (
        <p className="m-0 flex items-center justify-between gap-2 px-3 pt-2 text-[14px]">
          Music is off.
          <button type="button" className="pixel-btn pixel-btn--primary !text-[13px]" onClick={() => saveSettings({ ...saved, music: true })}>
            TURN MUSIC ON
          </button>
        </p>
      )}
      {status.state === 'blocked' && (
        <p className="m-0 flex items-center justify-between gap-2 px-3 pt-2 text-[14px]">
          <span className="blink">Waiting for a tap to start…</span>
          <button type="button" className="pixel-btn pixel-btn--primary !text-[13px]" onClick={() => audio.unlock()}>
            START
          </button>
        </p>
      )}
      {status.state === 'unavailable' && <p className="m-0 px-3 pt-2 text-[14px] text-amber">This browser can’t play sound, so the jukebox is silent.</p>}

      <ul className="jukebox-list m-0 mt-2 list-none p-0" aria-label="Tracks">
        {ROWS.map((r, i) => {
          const chosen = r.id === status.pinned
          const nowPlaying = r.id === status.current && status.pinned === r.id
          const autoPlaying = r.id === null && status.pinned === null
          return (
            <li key={r.id ?? 'auto'}>
              <button
                ref={(el) => {
                  rowRefs.current[i] = el
                }}
                type="button"
                aria-pressed={chosen}
                tabIndex={i === focus ? 0 : -1}
                onFocus={() => setFocus(i)}
                onMouseEnter={(e) => e.currentTarget !== document.activeElement && e.currentTarget.focus({ preventScroll: true })}
                onClick={() => pick(r.id)}
                className={`jukebox-row font-display flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-1 text-left text-[14px] text-paper outline-none ${chosen ? 'jukebox-row--on' : ''}`}
              >
                <span aria-hidden className={`w-[1em] text-gold ${i === focus ? 'cursor-arrow' : 'invisible'}`}>
                  ▶
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {r.id === null ? 'AUTO' : r.name}
                  {r.id === null && <span className="ml-2 text-[12px] text-frame-hi">{JUKEBOX.find((t) => t.id === status.area)?.name ?? ''}</span>}
                </span>
                {(nowPlaying || autoPlaying) && <EqBars live={playing && !reducedMotion} />}
                {(nowPlaying || autoPlaying) && <span className="sr-only">{playing ? '(now playing)' : '(selected)'}</span>}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center justify-center gap-1 px-2 pt-1 pb-3" role="group" aria-label="Playback">
        {(
          [
            { label: 'Previous track', glyph: '◀◀', on: () => skip(-1), disabled: false },
            { label: playing ? 'Pause' : 'Play', glyph: playing ? '❚❚' : '▶', on: togglePlay, disabled: status.state === 'off' || status.state === 'unavailable' },
            { label: 'Next track', glyph: '▶▶', on: () => skip(1), disabled: false },
          ] as const
        ).map((c, i) => (
          <button
            key={c.label}
            ref={(el) => {
              controlRefs.current[i] = el
            }}
            type="button"
            aria-label={c.label}
            title={c.label}
            disabled={c.disabled}
            onClick={c.on}
            className={`pixel-btn !min-w-[52px] !text-[15px] ${i === 1 ? 'pixel-btn--primary' : ''}`}
          >
            {c.glyph}
          </button>
        ))}
        <button
          ref={(el) => {
            controlRefs.current[3] = el
          }}
          type="button"
          className="pixel-btn !text-[13px]"
          onClick={() => (sfx('back'), onClose())}
        >
          CLOSE
        </button>
      </div>
    </div>
  )
}

function statusLabel(s: MusicStatus): string {
  switch (s.state) {
    case 'playing':
      return 'NOW PLAYING'
    case 'paused':
      return 'PAUSED'
    case 'blocked':
      return 'READY · TAP TO START'
    case 'off':
      return 'MUSIC OFF'
    case 'unavailable':
      return 'NO SOUND'
  }
}

function EqBars({ live }: { live: boolean }) {
  return (
    <span aria-hidden className={`jukebox-eq ${live ? 'jukebox-eq--live' : ''}`}>
      <span />
      <span />
      <span />
    </span>
  )
}
