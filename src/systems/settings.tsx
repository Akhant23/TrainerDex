import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { load, save } from './storage'
import { audio, type Sfx } from './audio'

export type TextSpeed = 'slow' | 'mid' | 'fast'
export type MotionPref = 'system' | 'reduced' | 'full'

export interface Settings {
  textSpeed: TextSpeed
  sfx: boolean
  music: boolean
  /** 0–100 */
  volume: number
  motion: MotionPref
}

export const defaultSettings: Settings = {
  textSpeed: 'mid',
  sfx: false,
  music: false,
  volume: 60,
  motion: 'system',
}

/** Milliseconds per character for the typewriter. */
export const TEXT_SPEED_MS: Record<TextSpeed, number> = { slow: 45, mid: 24, fast: 8 }

interface SettingsApi {
  /** What's in effect right now (a preview, if one is active). */
  settings: Settings
  /** What's saved. */
  saved: Settings
  saveSettings: (s: Settings) => void
  /** Apply settings temporarily (Settings screen preview). Pass null to stop previewing. */
  preview: (s: Settings | null) => void
  reducedMotion: boolean
  sfx: (name: Sfx) => void
}

const SettingsContext = createContext<SettingsApi | null>(null)

function useSystemReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => window.matchMedia?.(query).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Settings>(() => load('settings', defaultSettings))
  const [previewing, setPreviewing] = useState<Settings | null>(null)
  const settings = previewing ?? saved
  const systemReduced = useSystemReducedMotion()
  const reducedMotion = settings.motion === 'reduced' || (settings.motion === 'system' && systemReduced)

  useEffect(() => {
    audio.configure({ sfx: settings.sfx, music: settings.music, volume: settings.volume })
  }, [settings.sfx, settings.music, settings.volume])

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full'
  }, [reducedMotion])

  // Browsers only allow audio after a gesture: unlock on the first one.
  useEffect(() => {
    const unlock = () => audio.unlock()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const saveSettings = useCallback((s: Settings) => {
    setSaved(s)
    setPreviewing(null)
    save('settings', s)
  }, [])

  const api = useMemo<SettingsApi>(
    () => ({
      settings,
      saved,
      saveSettings,
      preview: setPreviewing,
      reducedMotion,
      sfx: (name) => audio.play(name),
    }),
    [settings, saved, saveSettings, reducedMotion],
  )

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsApi {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
