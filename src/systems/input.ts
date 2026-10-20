import { useEffect, useRef } from 'react'

export type GameKey = 'a' | 'b' | 'up' | 'down' | 'left' | 'right' | 'start'

/** Maps a keyboard event to a DS-style button. Letters are ignored while typing in a field. */
export function toGameKey(e: KeyboardEvent): GameKey | null {
  const typing = isTypingTarget(e.target)
  switch (e.key) {
    case 'ArrowUp':
      return typing ? null : 'up'
    case 'ArrowDown':
      return typing ? null : 'down'
    case 'ArrowLeft':
      return typing ? null : 'left'
    case 'ArrowRight':
      return typing ? null : 'right'
    case 'Enter':
      return 'a'
    case ' ':
      return typing ? null : 'a'
    case 'z':
    case 'Z':
      return typing ? null : 'a'
    case 'Escape':
      return 'b'
    case 'x':
    case 'X':
    case 'Backspace':
      return typing ? null : 'b'
    default:
      return null
  }
}

export function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'
}

/** True if the event target is a native control that already handles Enter/Space itself. */
export function isNativeActivator(t: EventTarget | null): boolean {
  return t instanceof HTMLElement && (t.tagName === 'BUTTON' || t.tagName === 'A' || t.getAttribute('role') === 'button')
}

/**
 * Listen for game keys on window. The latest handler is always used, so it can close over
 * fresh state without re-subscribing.
 */
export function useGameKeys(handler: (key: GameKey, e: KeyboardEvent) => void, enabled = true) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    if (!enabled) return
    const on = (e: KeyboardEvent) => {
      if (e.repeat && (e.key === 'Enter' || e.key === ' ')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = toGameKey(e)
      if (k) ref.current(k, e)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [enabled])
}
