import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useGameKeys } from '../systems/input'
import { useSettings } from '../systems/settings'

/** Full-viewport viewer (expanded PDF, media). Esc / B closes; focus returns to the opener. */
export function Overlay({ title, onClose, children, actions }: { title: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  const { sfx } = useSettings()
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      opener?.focus?.()
    }
  }, [])
  const close = () => {
    sfx('back')
    onClose()
  }
  useGameKeys((k, e) => {
    if (k === 'b') {
      e.preventDefault()
      e.stopImmediatePropagation()
      close()
    }
  })
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex flex-col bg-[#0a0a10f2] p-2 sm:p-4">
      <div className="flex items-center justify-between gap-2 pb-2">
        <h2 className="font-display m-0 truncate text-[15px] text-paper">{title}</h2>
        <div className="flex items-center gap-1">
          {actions}
          <button ref={closeRef} type="button" className="pixel-btn !text-[14px]" onClick={close}>
            ✕ CLOSE
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>,
    document.body,
  )
}
