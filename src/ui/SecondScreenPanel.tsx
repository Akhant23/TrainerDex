import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import qrcode from 'qrcode-generator'
import { secondScreenHost, type HostEnd } from '../systems/secondScreen'
import { formatCode, PAIR_TTL_MS, RECONNECT_GRACE_MS } from '../systems/pairing'
import { useSettings } from '../systems/settings'
import { useHostPairing } from './useHostPairing'

/** A QR code as a crisp image: whole pixels per module, ink on paper, with its quiet zone. */
function Qr({ text }: { text: string }) {
  const src = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(text, 'Byte')
    qr.make()
    return { url: qr.createDataURL(1, 4), size: qr.getModuleCount() + 8 }
  }, [text])
  const scale = Math.max(3, Math.floor(184 / src.size))
  return <img src={src.url} width={src.size * scale} height={src.size * scale} alt="QR code that opens the controller on your phone" className="pixelated block bg-white" />
}

const ENDED: Record<HostEnd, string> = {
  expired: 'The code expired before a phone used it.',
  cancelled: 'Pairing cancelled.',
  idle: 'The phone was idle for a while, so it was disconnected.',
  'phone-left': 'The phone lost its connection and didn’t come back.',
  'phone-disconnected': 'The phone disconnected.',
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** True when a phone can't reach this page's address (it's this computer's own loopback). */
const isLoopback = () => /^(localhost|127\.|\[?::1\]?)/.test(window.location.hostname)

/** The desktop's pairing panel: start, QR + code + countdown, connection status, cancel. */
export default function SecondScreenPanel({ onClose, anchor }: { onClose: () => void; anchor: RefObject<HTMLButtonElement | null> }) {
  const state = useHostPairing()
  const { sfx } = useSettings()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const timed = state.phase === 'waiting' || state.phase === 'reconnecting'
  const now = useNow(timed)

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('button')?.focus()
  }, [state.phase])

  useEffect(() => {
    const on = (e: PointerEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || anchor.current?.contains(t)) return
      onClose()
    }
    document.addEventListener('pointerdown', on)
    return () => document.removeEventListener('pointerdown', on)
  }, [onClose, anchor])

  // keys stay in the panel; X / Esc close it (pairing carries on in the background)
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') return
    e.stopPropagation()
    if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') {
      e.preventDefault()
      sfx('back')
      onClose()
    } else if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault()
      ;(document.activeElement as HTMLElement | null)?.click()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const buttons = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])
      const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
      const next = buttons[i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1)]
      if (next) {
        next.focus()
        sfx('cursor')
      } else sfx('bump')
    }
  }

  const start = () => {
    sfx('select')
    secondScreenHost.start()
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      data-remote="ignore"
      aria-labelledby={titleId}
      className="jukebox-panel pixel-box pixel-box--dark absolute top-[calc(100%+10px)] right-0 z-50 w-[340px] text-paper"
      onKeyDown={onKeyDown}
    >
      <div className="gv-header font-display flex items-center justify-between px-3 py-1.5">
        <h2 id={titleId} className="m-0 text-[15px] font-semibold tracking-wide">
          SECOND SCREEN
        </h2>
        <button type="button" className="pixel-btn !m-0 !px-2 !py-0.5 !text-[13px]" aria-label="Close" onClick={() => (sfx('back'), onClose())}>
          ✕
        </button>
      </div>

      <div className="space-y-3 px-3 py-3 text-[14px] leading-snug" aria-live="polite">
        {state.phase === 'idle' && (
          <>
            <p className="m-0">Use your phone as a controller: a D-pad, A and B, and the menu on its screen. Your keyboard and mouse keep working.</p>
            <button type="button" className="pixel-btn pixel-btn--primary !text-[14px]" onClick={start}>
              CONNECT PHONE
            </button>
          </>
        )}

        {state.phase === 'starting' && <p className="font-display blink m-0">CONNECTING…</p>}

        {state.phase === 'waiting' && (
          <>
            <div className="flex items-start gap-3">
              <div className="shrink-0 p-[3px] shadow-[0_0_0_3px_var(--gv-ink)]">
                <Qr text={state.url} />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="m-0 text-frame-hi">Scan with your phone’s camera, or open the controller page and type:</p>
                <p className="font-display m-0 text-[21px] tracking-[0.08em] whitespace-nowrap text-gold" aria-label={`Pairing code ${state.code.split('').join(' ')}`}>
                  {formatCode(state.code)}
                </p>
              </div>
            </div>
            <p className="m-0 break-all text-[12px] text-frame-hi">{state.url.replace(/\?c=.*$/, '')}</p>
            {isLoopback() && (
              <p className="m-0 bg-amber/20 px-2 py-1 text-[13px] text-amber">
                This page is open on localhost, which a phone can’t reach. Open it at this computer’s network address instead (run the dev server with --host).
              </p>
            )}
            <p className="m-0 flex items-center justify-between gap-2">
              <span>
                <span className="blink">●</span> Waiting for your phone…
              </span>
              <span className="font-display text-[13px] text-frame-hi">{mmss(state.expiresAt - now)}</span>
            </p>
            <Meter left={state.expiresAt - now} total={PAIR_TTL_MS} />
            <button type="button" className="pixel-btn !text-[14px]" onClick={() => (sfx('back'), secondScreenHost.cancel())}>
              CANCEL
            </button>
          </>
        )}

        {state.phase === 'connected' && (
          <>
            <p className="font-display m-0 text-[16px] text-leaf">● PHONE CONNECTED</p>
            <p className="m-0">Its D-pad, A and B work like your arrow keys, Z and X. The mouse and keyboard still work too.</p>
            <button type="button" className="pixel-btn !text-[14px]" onClick={() => (sfx('back'), secondScreenHost.cancel())}>
              DISCONNECT
            </button>
          </>
        )}

        {state.phase === 'reconnecting' && (
          <>
            <p className="font-display m-0 text-[16px] text-amber">
              <span className="blink">●</span> RECONNECTING…
            </p>
            <p className="m-0">The phone dropped out. It has {mmss(state.until - now)} to come back before it’s disconnected.</p>
            <Meter left={state.until - now} total={RECONNECT_GRACE_MS} />
            <button type="button" className="pixel-btn !text-[14px]" onClick={() => (sfx('back'), secondScreenHost.cancel())}>
              DISCONNECT
            </button>
          </>
        )}

        {state.phase === 'ended' && (
          <>
            <p className="m-0">{ENDED[state.why]}</p>
            <button type="button" className="pixel-btn pixel-btn--primary !text-[14px]" onClick={start}>
              NEW CODE
            </button>
          </>
        )}

        {state.phase === 'error' && (
          <>
            <p role="alert" className="m-0 text-amber">
              {state.message}
            </p>
            <button type="button" className="pixel-btn pixel-btn--primary !text-[14px]" onClick={start}>
              TRY AGAIN
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Meter({ left, total }: { left: number; total: number }) {
  const pct = Math.max(0, Math.min(100, (left / total) * 100))
  return (
    <span aria-hidden className="block h-[6px] bg-[#0c0c14] shadow-[0_0_0_2px_var(--gv-ink)]">
      <span className="block h-full bg-gold" style={{ width: `${pct}%` }} />
    </span>
  )
}
