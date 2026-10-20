import { useEffect, useMemo, useState } from 'react'
import { medals, type Medal, type MedalId } from '../content/medals'
import { onMedal } from '../systems/progress'
import { useSettings } from '../systems/settings'
import { Grid } from '../sprites/raster'
import { PixelArt } from './PixelArt'

const TIER = {
  bronze: { A: '#d8904a', a: '#985a24', W: '#ffd8a8' },
  silver: { A: '#d0d6e4', a: '#8890a8', W: '#ffffff' },
  gold: { A: '#f0c040', a: '#b08010', W: '#fff6c0' },
}

const medalPixels = (() => {
  const g = new Grid(14, 16)
  g.poly([[3, 0], [6, 0], [7, 6], [4, 6]], 'R').poly([[11, 0], [8, 0], [7, 6], [10, 6]], 'B')
  g.ellipse(7, 10, 5, 5, 'A', 'a', 'W')
  g.outline()
  g.stamp(6, 8, ['.W.', 'WWW', '.W.'])
  return g.toPixels()
})()

/** A medal at an integer scale; locked medals are greyed out. */
export function MedalArt({ medal, earned, scale = 2 }: { medal: Medal; earned: boolean; scale?: number }) {
  const palette = useMemo(() => ({ K: '#1c1a24', R: '#e0383e', B: '#3a6fd0', ...TIER[medal.tier] }), [medal.tier])
  return <PixelArt pixels={medalPixels} palette={palette} scale={scale} className={earned ? '' : 'opacity-35 grayscale'} />
}

/** Gen V-style "medal get" banner. Mounted once at the app root. */
export function MedalToast() {
  const { sfx } = useSettings()
  const [queue, setQueue] = useState<MedalId[]>([])
  const current = queue[0]

  useEffect(() => onMedal((id) => setQueue((q) => [...q, id])), [])
  useEffect(() => {
    if (!current) return
    sfx('badge')
    const t = window.setTimeout(() => setQueue((q) => q.slice(1)), 3200)
    return () => window.clearTimeout(t)
  }, [current, sfx])

  if (!current) return null
  const medal = medals.find((m) => m.id === current)!
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-14 z-[70] flex justify-center px-3">
      <div className="medal-toast pixel-box pixel-box--dark flex items-center gap-3 px-4 py-3">
        <MedalArt medal={medal} earned scale={3} />
        <div>
          <p className="font-display m-0 text-[10px] text-gold">MEDAL GET!</p>
          <p className="m-0 text-[17px] font-semibold text-paper">{medal.name}</p>
          <p className="m-0 text-[13px] text-paper/80">{medal.description}</p>
        </div>
      </div>
    </div>
  )
}
