import { useEffect } from 'react'
import { progress } from './progress'

const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const KEY = 'tdx:shinyCharm'

/** True once the visitor has entered the code this session: the trainer sprite turns shiny. */
export function hasShinyCharm(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** ↑ ↑ ↓ ↓ ← → ← → B A — unlocks the "Old School" medal and a shiny trainer for the session. */
export function useKonami() {
  useEffect(() => {
    let i = 0
    const on = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      i = k === CODE[i] ? i + 1 : k === CODE[0] ? 1 : 0
      if (i === CODE.length) {
        i = 0
        try {
          sessionStorage.setItem(KEY, '1')
        } catch {
          /* ignore */
        }
        progress.unlock('old-school')
        window.dispatchEvent(new Event('tdx:shiny-charm'))
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])
}
