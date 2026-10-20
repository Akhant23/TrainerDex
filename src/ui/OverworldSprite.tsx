import { useEffect, useMemo, useState } from 'react'
import { overworldFrames, WALK_CYCLE, type Facing } from '../sprites/overworld'
import { trainerPalette } from '../sprites/trainerData'
import { pixelsToDataUrl } from '../sprites/render'

/** The walking (overworld) Aaryan. Cycles the walk frames while `walking`. */
export function OverworldSprite({ facing, walking, scale }: { facing: Facing; walking: boolean; scale: number }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!walking) return
    const id = window.setInterval(() => setTick((t) => t + 1), 140)
    return () => window.clearInterval(id)
  }, [walking])
  const urls = useMemo(() => overworldFrames[facing].map((f) => pixelsToDataUrl(f, trainerPalette)), [facing])
  const frame = walking ? WALK_CYCLE[tick % WALK_CYCLE.length] : 0
  return <img src={urls[frame]} width={20 * scale} height={28 * scale} alt="" draggable={false} className="pixelated block" />
}
