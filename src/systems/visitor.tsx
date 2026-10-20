import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { load, save } from './storage'

interface VisitorData {
  name: string
  introSeen: boolean
}

const defaultVisitor: VisitorData = { name: 'TRAINER', introSeen: false }

interface VisitorApi extends VisitorData {
  setName: (name: string) => void
  setIntroSeen: (seen: boolean) => void
}

const VisitorContext = createContext<VisitorApi | null>(null)
/** Kept separate so the once-a-second tick only re-renders what shows the clock. */
const PlaytimeContext = createContext(0)

function usePlaytimeCounter(): number {
  const [seconds, setSeconds] = useState(() => load<number>('playtime', 0, (v): v is number => typeof v === 'number' && v >= 0))
  const latest = useRef(seconds)
  latest.current = seconds

  useEffect(() => {
    const tick = window.setInterval(() => {
      if (document.visibilityState === 'visible') setSeconds((s) => s + 1)
    }, 1000)
    const persist = () => save('playtime', latest.current)
    const every = window.setInterval(persist, 5000)
    document.addEventListener('visibilitychange', persist)
    window.addEventListener('pagehide', persist)
    return () => {
      persist()
      window.clearInterval(tick)
      window.clearInterval(every)
      document.removeEventListener('visibilitychange', persist)
      window.removeEventListener('pagehide', persist)
    }
  }, [])
  return seconds
}

export function VisitorProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<VisitorData>(() => load('visitor', defaultVisitor))
  const playtime = usePlaytimeCounter()

  const update = useCallback((patch: Partial<VisitorData>) => {
    setData((d) => {
      const next = { ...d, ...patch }
      save('visitor', next)
      return next
    })
  }, [])

  const setName = useCallback((name: string) => update({ name: name || defaultVisitor.name }), [update])
  const setIntroSeen = useCallback((introSeen: boolean) => update({ introSeen }), [update])
  const api = useMemo<VisitorApi>(() => ({ ...data, setName, setIntroSeen }), [data, setName, setIntroSeen])
  return (
    <VisitorContext.Provider value={api}>
      <PlaytimeContext.Provider value={playtime}>{children}</PlaytimeContext.Provider>
    </VisitorContext.Provider>
  )
}

/** Seconds this visitor has spent on the site (only counted while the tab is visible). */
export function usePlaytime(): number {
  return useContext(PlaytimeContext)
}

export function useVisitor(): VisitorApi {
  const ctx = useContext(VisitorContext)
  if (!ctx) throw new Error('useVisitor must be used inside VisitorProvider')
  return ctx
}
