import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { padSession, secondScreenAvailable, type PadEnd, type PadState } from '../systems/secondScreen'
import { CODE_LENGTH, formatCode, normaliseCode, type ScreenSnapshot } from '../systems/pairing'
import type { GameKey } from '../systems/input'
import { currentPath, useHashPath } from '../app/router'
import { Logo } from '../ui/Logo'

const ENDED: Record<PadEnd, string> = {
  cancelled: 'The desktop ended the connection.',
  expired: 'The code expired.',
  idle: 'Disconnected after a long idle spell.',
  replaced: 'Another session took over.',
  'host-gone': 'The desktop went away and didn’t come back.',
  disconnected: 'You disconnected.',
}

/** The code from the QR link (#/controller?c=CODE), which is then taken out of the address bar. */
function codeFromUrl(): string | null {
  const q = currentPath().split('?')[1] ?? ''
  const c = new URLSearchParams(q).get('c')
  return c ? normaliseCode(c) : null
}

/**
 * The phone's controller (#/controller): a DS-style pad, not a copy of the site. The top screen
 * mirrors what the desktop shows (its title and options, tap one to pick it); below are the D-pad,
 * A, B and START. Everything it sends is a button press the desktop checks and replays.
 */
export default function Controller() {
  const state = useSyncExternalStore(padSession.subscribe, padSession.get)
  // a new QR link opened in this same tab changes only the hash, so watch it
  const path = useHashPath()

  useEffect(() => {
    document.title = 'TrainerDex · Controller'
    const fromUrl = codeFromUrl()
    if (fromUrl) {
      // keep the secret out of the history and the address bar
      window.history.replaceState(null, '', `${window.location.pathname}#/controller`)
      void padSession.connect(fromUrl)
    } else {
      const saved = padSession.savedCode()
      if (saved && padSession.get().phase === 'entry') void padSession.connect(saved)
    }
  }, [path])

  // a phone that slept or lost signal: try again as soon as it's back
  useEffect(() => {
    const again = () => {
      const s = padSession.get()
      const saved = padSession.savedCode()
      if (saved && (s.phase === 'error' || s.phase === 'host-away')) void padSession.connect(saved)
    }
    const vis = () => document.visibilityState === 'visible' && again()
    window.addEventListener('online', again)
    document.addEventListener('visibilitychange', vis)
    return () => {
      window.removeEventListener('online', again)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])

  // the admin (or any page remotes can't drive) greys the pad out
  const live = state.phase === 'connected' && !state.screen?.locked
  return (
    <div className="pad-page">
      <header className="flex items-center justify-between px-4 pt-3 pb-2">
        <Logo size="sm" />
        <Status state={state} />
      </header>
      <section className="pad-screen" aria-label="Desktop screen">
        <Screen state={state} />
      </section>
      <section className={`pad-controls ${live ? '' : 'pad-controls--off'}`} aria-label="Controller">
        <DPad disabled={!live} />
        <div className="flex flex-col items-center gap-3">
          <div className="pad-ab">
            <PadButton k="b" label="B" className="pad-btn--b" title="B: back" disabled={!live} />
            <PadButton k="a" label="A" className="pad-btn--a" title="A: select" disabled={!live} />
          </div>
          <PadButton k="start" label="START" className="pad-btn--start" title="START: main menu" disabled={!live} />
        </div>
      </section>
      <footer className="flex justify-center px-4 pt-1 pb-[max(12px,env(safe-area-inset-bottom))]">
        {state.phase === 'connected' || state.phase === 'host-away' || state.phase === 'reconnecting' || state.phase === 'pairing' || state.phase === 'joining' ? (
          <button type="button" className="pixel-btn !text-[14px]" onClick={() => padSession.disconnect()}>
            DISCONNECT
          </button>
        ) : null}
      </footer>
    </div>
  )
}

function Status({ state }: { state: PadState }) {
  const [label, tone] =
    state.phase === 'connected'
      ? ['CONNECTED', 'text-leaf']
      : state.phase === 'joining' || state.phase === 'pairing'
        ? ['PAIRING…', 'text-amber']
        : state.phase === 'host-away'
          ? ['DESKTOP AWAY', 'text-amber']
          : state.phase === 'reconnecting'
            ? ['RECONNECTING…', 'text-amber']
          : ['NOT CONNECTED', 'text-frame-hi']
  return (
    <span role="status" className={`font-display flex items-center gap-2 text-[13px] ${tone}`}>
      <span aria-hidden className={`pad-led ${state.phase === 'connected' ? 'pad-led--on' : state.phase === 'entry' || state.phase === 'ended' || state.phase === 'busy' || state.phase === 'not-found' || state.phase === 'error' ? '' : 'pad-led--wait'}`} />
      {label}
    </span>
  )
}

function Screen({ state }: { state: PadState }) {
  switch (state.phase) {
    case 'entry':
      return <CodeEntry error={state.error} />
    case 'joining':
    case 'pairing':
      return (
        <Msg title="PAIRING">
          <p className="blink m-0">Connecting to code {formatCode(state.code)}…</p>
        </Msg>
      )
    case 'connected':
      return <Mirror screen={state.screen} />
    case 'reconnecting':
      return (
        <Msg title="RECONNECTING">
          <p className="blink m-0">This phone lost its connection. Reconnecting…</p>
        </Msg>
      )
    case 'host-away':
      return (
        <Msg title="DESKTOP AWAY">
          <p className="m-0">The desktop dropped out (it may be reloading). Waiting for it to come back…</p>
        </Msg>
      )
    case 'busy':
      return (
        <Msg title="ALREADY CONNECTED" action={<Retry />}>
          <p className="m-0">That desktop already has a phone connected. Disconnect it there first, then try again.</p>
        </Msg>
      )
    case 'not-found':
      return (
        <Msg title="NO DESKTOP FOUND" action={<Retry />}>
          <p className="m-0">No desktop is showing that code. It may have expired: make a new one on the desktop.</p>
        </Msg>
      )
    case 'ended':
      return (
        <Msg title="DISCONNECTED" action={<Retry label="CONNECT AGAIN" />}>
          <p className="m-0">{ENDED[state.why]}</p>
        </Msg>
      )
    case 'error':
      return (
        <Msg title="CONNECTION PROBLEM" action={<Retry />}>
          <p className="m-0">{state.message}</p>
        </Msg>
      )
  }
}

function Retry({ label = 'ENTER A CODE' }: { label?: string }) {
  return (
    <button type="button" className="pixel-btn pixel-btn--primary !text-[14px]" onClick={() => padSession.reset()}>
      {label}
    </button>
  )
}

function Msg({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="gv-header font-display px-3 py-1.5 text-[14px] text-paper">{title}</div>
      <div className="flex flex-1 flex-col justify-center gap-3 px-4 py-3 text-[16px] text-ink">
        {children}
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}

function CodeEntry({ error }: { error?: string }) {
  const [value, setValue] = useState('')
  const [problem, setProblem] = useState(error ?? '')
  if (!secondScreenAvailable)
    return (
      <Msg title="UNAVAILABLE">
        <p className="m-0">The controller isn’t set up on this site.</p>
      </Msg>
    )
  return (
    <Msg title="CONNECT TO A DESKTOP">
      <p className="m-0 text-[15px]">On a computer, open this site and choose the phone icon at the top. Scan its QR code, or type its code here:</p>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const code = normaliseCode(value)
          if (!code) return setProblem(`Codes are ${CODE_LENGTH} letters and numbers, like ABCD-2345.`)
          setProblem('')
          void padSession.connect(code)
        }}
      >
        <label className="sr-only" htmlFor="pad-code">
          Pairing code
        </label>
        <input
          id="pad-code"
          className="font-display w-[11ch] border-0 bg-paper px-3 py-2 text-[20px] tracking-[0.1em] uppercase shadow-[inset_0_0_0_3px_var(--color-frame)] outline-none focus:shadow-[inset_0_0_0_3px_var(--color-gold)]"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          maxLength={CODE_LENGTH + 2}
          placeholder="XXXX-XXXX"
        />
        <button type="submit" className="pixel-btn pixel-btn--primary !text-[15px]">
          CONNECT
        </button>
      </form>
      {problem && (
        <p role="alert" className="m-0 text-[14px] text-ember">
          {problem}
        </p>
      )}
    </Msg>
  )
}

/** The desktop's current screen: its name and options; tap one to choose it. */
function Mirror({ screen }: { screen: ScreenSnapshot | null }) {
  if (!screen)
    return (
      <Msg title="CONNECTED">
        <p className="blink m-0">Reading the desktop’s screen…</p>
      </Msg>
    )
  if (screen.locked)
    return (
      <Msg title={screen.title}>
        <p className="m-0">The desktop is on a page the controller can’t use. Switch pages with the mouse to carry on.</p>
      </Msg>
    )
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="gv-header font-display flex items-center justify-between px-3 py-1.5 text-[14px] text-paper">
        <span className="truncate">{screen.title}</span>
        <span className="text-[12px] text-frame-hi">{screen.options.length ? 'TAP TO CHOOSE' : ''}</span>
      </div>
      {screen.options.length === 0 ? (
        <p className="m-0 px-4 py-3 text-[15px] text-ink">Nothing to pick here: use the D-pad and A / B.</p>
      ) : (
        <ul className="pad-options m-0 list-none p-2" aria-label="Options on the desktop">
          {screen.options.map((o, i) => (
            <li key={`${i}-${o.label}`}>
              <button
                type="button"
                aria-current={i === screen.selected ? 'true' : undefined}
                className={`pad-option font-display flex w-full items-center gap-2 text-left ${i === screen.selected ? 'pad-option--on' : ''}`}
                onClick={() => {
                  navigator.vibrate?.(8)
                  padSession.pick(i)
                }}
              >
                <span aria-hidden className={`w-[1em] text-dex-red ${i === screen.selected ? '' : 'invisible'}`}>
                  ▶
                </span>
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * One controller button. Press and release are sent separately so holding works (walking in the
 * resort); a held D-pad direction repeats like a keyboard key does.
 */
function PadButton({ k, label, className = '', title, disabled, repeat = false, children }: { k: GameKey; label: string; className?: string; title: string; disabled?: boolean; repeat?: boolean; children?: ReactNode }) {
  const timers = useRef<{ delay: number | null; every: number | null }>({ delay: null, every: null })
  const down = useRef(false)
  const stop = () => {
    if (timers.current.delay != null) window.clearTimeout(timers.current.delay)
    if (timers.current.every != null) window.clearInterval(timers.current.every)
    timers.current = { delay: null, every: null }
  }
  const press = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || down.current) return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    down.current = true
    navigator.vibrate?.(8)
    padSession.press(k, 'down')
    // held keys keep saying so (the desktop lets go of a key that goes quiet)
    timers.current.delay = window.setTimeout(() => {
      timers.current.every = window.setInterval(() => padSession.press(k, 'down', true), repeat ? 140 : 400)
    }, repeat ? 380 : 400)
  }
  const release = () => {
    if (!down.current) return
    down.current = false
    stop()
    padSession.press(k, 'up')
  }
  useEffect(() => () => stop(), [])
  return (
    <button
      type="button"
      className={`pad-btn ${className}`}
      aria-label={title}
      disabled={disabled}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        // keyboard / switch activation (no pointer): a quick press and release
        if (e.detail === 0 && !disabled) {
          padSession.press(k, 'down')
          padSession.press(k, 'up')
        }
      }}
    >
      {children ?? label}
    </button>
  )
}

function DPad({ disabled }: { disabled: boolean }) {
  return (
    <div className="pad-dpad" role="group" aria-label="D-pad">
      <PadButton k="up" label="▲" title="Up" className="pad-dir pad-dir--up gv-pad" disabled={disabled} repeat />
      <PadButton k="left" label="◀" title="Left" className="pad-dir pad-dir--left gv-pad" disabled={disabled} repeat />
      <span aria-hidden className="pad-dir pad-dir--mid gv-pad" />
      <PadButton k="right" label="▶" title="Right" className="pad-dir pad-dir--right gv-pad" disabled={disabled} repeat />
      <PadButton k="down" label="▼" title="Down" className="pad-dir pad-dir--down gv-pad" disabled={disabled} repeat />
    </div>
  )
}
