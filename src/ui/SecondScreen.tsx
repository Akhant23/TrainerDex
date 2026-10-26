import { lazy, Suspense, useRef, useState } from 'react'
import { secondScreenAvailable } from '../systems/secondScreen'
import { useHostPairing } from './useHostPairing'
import { useSettings } from '../systems/settings'
import { PixelIcon } from './PixelIcon'

const Panel = lazy(() => import('./SecondScreenPanel'))

/**
 * The system bar's "second screen" button (desktop only): opens the pairing panel, and its LED
 * shows a phone is connected (green) or a code is waiting / a phone is reconnecting (amber).
 * Keyboard and mouse keep working either way.
 */
export function SecondScreenButton() {
  const [open, setOpen] = useState(false)
  const state = useHostPairing()
  const { sfx } = useSettings()
  const buttonRef = useRef<HTMLButtonElement>(null)
  if (!secondScreenAvailable) return null
  const linked = state.phase === 'connected'
  const pending = state.phase === 'waiting' || state.phase === 'reconnecting' || state.phase === 'starting'
  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }
  return (
    <span className="relative hidden lg:inline-flex">
      <button
        ref={buttonRef}
        type="button"
        className="pixel-btn pixel-btn--ghost sysbar-icon inline-flex items-center gap-1.5 !p-1"
        aria-label={linked ? 'Second screen: phone connected' : 'Connect phone as a controller'}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={linked ? 'Phone connected' : 'Connect phone'}
        onClick={() => {
          sfx(open ? 'back' : 'open')
          setOpen((o) => !o)
        }}
      >
        <span className="relative inline-flex rounded-sm bg-paper/90 p-0.5">
          <PixelIcon name="phone" scale={2} />
          {(linked || pending) && <span aria-hidden className={`sysbar-led ${linked ? '' : 'sysbar-led--amber'}`} />}
        </span>
        {linked && <span className="font-display text-[12px] text-leaf">PHONE</span>}
      </button>
      {open && (
        <Suspense fallback={null}>
          <Panel onClose={close} anchor={buttonRef} />
        </Suspense>
      )}
    </span>
  )
}
