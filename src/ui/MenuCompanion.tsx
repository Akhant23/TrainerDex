import { useLayoutEffect, useRef, useState } from 'react'
import type { SpeciesId } from '../battle/data'
import { species } from '../battle/data'
import { CREATURE_SIZE } from '../sprites/creatures'
import { CreatureSprite } from '../screens/battle/BattleBits'

/**
 * Aaryan's partner on the main menu's platform: his ace, idling with its own loop, blinks and
 * gestures (CreatureSprite), at the largest whole-pixel scale that's about `share` of the
 * column's height. `hop` changes to make it hop (a tile focused, Aaryan tapped).
 */
export default function MenuCompanion({ id, hop, share = 0.3 }: { id: SpeciesId; hop: number; share?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  useLayoutEffect(() => {
    const col = ref.current?.parentElement
    if (!col) return
    const measure = () => setScale(Math.max(1, Math.min(4, Math.floor((col.clientHeight * share) / CREATURE_SIZE))))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(col)
    return () => ro.disconnect()
  }, [share])
  return (
    <div ref={ref} className="pointer-events-none absolute right-[3%] bottom-[8%] z-[1]" title={species[id].name}>
      {scale > 0 && (
        <span key={hop} className={hop ? 'hop inline-block' : 'inline-block'}>
          <CreatureSprite id={id} scale={scale} seed={7} />
        </span>
      )}
    </div>
  )
}
