import { useEffect, useState } from 'react'
import { skyAt, type SkyState } from '../resort/sky'

/** The Battle Resort's sky now (time of day and weather, on the visitor's clock), checked once a minute. */
export function useSky(): SkyState {
  const [sky, setSky] = useState(() => skyAt())
  useEffect(() => {
    const t = window.setInterval(() => setSky(skyAt()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  return sky
}

/** Windows are lit from dusk until dawn. */
export const isLit = (s: SkyState) => s.phase === 'night' || s.phase === 'dusk'
