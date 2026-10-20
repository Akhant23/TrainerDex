import { useEffect, useRef, useState } from 'react'

/**
 * Hash routing (#/pc/resume) so every section is deep-linkable and works on any static host
 * with no rewrite rules.
 */
export function currentPath(): string {
  const raw = window.location.hash.replace(/^#/, '')
  return raw.startsWith('/') ? raw : '/'
}

export function navigate(path: string) {
  if (currentPath() === path) return
  window.location.hash = path
}

export function useHashPath(): string {
  const [path, setPath] = useState(currentPath)
  useEffect(() => {
    const on = () => setPath(currentPath())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return path
}

export type WipePhase = 'idle' | 'cover' | 'reveal'
export const WIPE_MS = 220

/**
 * Delays showing a new route until a "screen wipe" has covered the old one, then reveals it.
 * With reduced motion the new route shows immediately.
 */
export function useWipedPath(path: string, reducedMotion: boolean): { shown: string; phase: WipePhase } {
  const [shown, setShown] = useState(path)
  const [phase, setPhase] = useState<WipePhase>('idle')
  const timers = useRef<number[]>([])

  useEffect(() => {
    if (path === shown) return
    timers.current.forEach(clearTimeout)
    if (reducedMotion) {
      setShown(path)
      setPhase('idle')
      return
    }
    setPhase('cover')
    timers.current = [
      window.setTimeout(() => {
        setShown(path)
        setPhase('reveal')
      }, WIPE_MS),
      window.setTimeout(() => setPhase('idle'), WIPE_MS * 2),
    ]
  }, [path, shown, reducedMotion])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  return { shown, phase }
}
