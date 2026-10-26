import { useEffect, useMemo, useState } from 'react'
import { medals, type Medal, type MedalId } from '../content/medals'
import { onMedal } from '../systems/progress'
import { useSettings } from '../systems/settings'
import { MEDAL_TIER_COLOURS, medalPixels } from '../sprites/medalArt'
import { PixelArt } from './PixelArt'

/** A medal at an integer scale; locked medals are greyed out. */
export function MedalArt({ medal, earned, scale = 2 }: { medal: Medal; earned: boolean; scale?: number }) {
  const palette = useMemo(() => ({ K: '#1c1a24', R: '#e0383e', B: '#3a6fd0', ...MEDAL_TIER_COLOURS[medal.tier] }), [medal.tier])
  return <PixelArt pixels={medalPixels} palette={palette} scale={scale} className={earned ? '' : 'opacity-35 grayscale'} />
}

/** How long each banner is up (matches the medal-in animation), then a beat before the next. */
const SHOW_MS = 3200
const GAP_MS = 250

/**
 * Gen V-style "medal get" banner. Mounted once at the app root. Medals earned together queue up
 * and show one after another, each sliding in fresh, with a note of how many are still to come.
 */
export function MedalToast() {
  const { sfx } = useSettings()
  const [queue, setQueue] = useState<MedalId[]>([])
  // between two banners: the last one has slid away and the next hasn't come in yet
  const [resting, setResting] = useState(false)
  const current = resting ? undefined : queue[0]

  useEffect(() => onMedal((id) => setQueue((q) => (q.includes(id) ? q : [...q, id]))), [])
  useEffect(() => {
    if (!current) return
    sfx('badge')
    const t = window.setTimeout(() => {
      setResting(true)
      setQueue((q) => q.slice(1))
    }, SHOW_MS)
    return () => window.clearTimeout(t)
  }, [current, sfx])
  useEffect(() => {
    if (!resting) return
    const t = window.setTimeout(() => setResting(false), GAP_MS)
    return () => window.clearTimeout(t)
  }, [resting])

  if (!current) return null
  const medal = medals.find((m) => m.id === current)!
  const waiting = queue.length - 1
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-14 z-[70] flex justify-center px-3">
      {/* keyed by medal, so each banner is a new element and its slide-in plays from the start
          (one reused element kept the finished animation's last frame: parked above the screen) */}
      <div key={current} className="medal-toast pixel-box pixel-box--dark flex items-center gap-3 px-4 py-3">
        <MedalArt medal={medal} earned scale={3} />
        <div>
          <p className="font-display m-0 flex items-baseline gap-2 text-[14px] text-gold">
            MEDAL GET!
            {waiting > 0 && <span className="text-[12px] text-frame-hi">+{waiting} MORE</span>}
          </p>
          <p className="m-0 text-[17px] font-semibold text-paper">{medal.name}</p>
          <p className="m-0 text-[13px] text-paper/80">{medal.description}</p>
        </div>
      </div>
    </div>
  )
}
