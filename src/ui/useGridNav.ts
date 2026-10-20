import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useSettings } from '../systems/settings'
import { useGameKeys } from '../systems/input'

/**
 * Roving-focus keyboard navigation for a grid (or list, cols = 1) of buttons.
 * Arrow keys move real DOM focus; Enter/Space are left to the buttons; Z activates.
 */
export function useGridNav(count: number, cols: number, opts: { enabled?: boolean; initial?: number; autoFocus?: boolean; onMove?: (i: number) => void; onActivate?: (i: number) => void } = {}) {
  const { sfx } = useSettings()
  const [focus, setFocusState] = useState(Math.min(opts.initial ?? 0, Math.max(0, count - 1)))
  const refs = useRef<Array<HTMLElement | null>>([])

  const setFocus = (i: number, moveDom = false) => {
    setFocusState(i)
    opts.onMove?.(i)
    if (moveDom) refs.current[i]?.focus()
  }

  useEffect(() => {
    if (opts.autoFocus) refs.current[focus]?.focus()
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const move = (to: number) => {
    if (to < 0 || to >= count || to === focus) return sfx('bump')
    sfx('cursor')
    setFocus(to, true)
  }

  useGameKeys((k, e) => {
    const col = focus % cols
    if (k === 'up') move(focus - cols)
    else if (k === 'down') move(focus + cols)
    else if (k === 'left' && cols > 1) move(col > 0 ? focus - 1 : -1)
    else if (k === 'right' && cols > 1) move(col < cols - 1 ? focus + 1 : -1)
    else if (k === 'a' && e.key.toLowerCase() === 'z') opts.onActivate?.(focus)
    else return
    e.preventDefault()
  }, opts.enabled !== false && count > 0)

  /** Spread onto each item. */
  const itemProps = (i: number) => ({
    ref: (el: HTMLElement | null) => {
      refs.current[i] = el
    },
    tabIndex: i === focus ? 0 : -1,
    onFocus: () => focus !== i && setFocus(i),
    // keep one highlight: hovering moves real focus too
    onPointerEnter: (e: PointerEvent) => e.pointerType === 'mouse' && refs.current[i] !== document.activeElement && refs.current[i]?.focus({ preventScroll: true }),
  })

  return { focus, setFocus, itemProps }
}
