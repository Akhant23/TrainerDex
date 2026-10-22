import type { SpeciesId } from '../battle/data'
import { species } from '../battle/data'
import { CreatureSprite } from '../screens/battle/BattleBits'

/**
 * Aaryan's partner on the main menu's platform: his ace, idling with its own loop, blinks and
 * gestures (CreatureSprite), at a whole-pixel `scale` the menu sets from Aaryan's own (so it never
 * changes size on its own). `hop` changes to make it hop (a tile focused, Aaryan tapped).
 */
export default function MenuCompanion({ id, hop, scale }: { id: SpeciesId; hop: number; scale: number }) {
  return (
    <div className="pointer-events-none absolute right-[1%] bottom-[3%] z-[3]" title={species[id].name}>
      <span key={hop} className={hop ? 'hop inline-block' : 'inline-block'}>
        <CreatureSprite id={id} scale={scale} seed={7} />
      </span>
    </div>
  )
}
