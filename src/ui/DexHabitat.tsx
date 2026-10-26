import { useCallback } from 'react'
import { HABITATS, paintHabitat, type HabitatId } from '../sprites/habitats'
import { PaintedScene } from './PaintedScene'

/**
 * A Pokédex habitat window: the entry's scene (sprites/habitats.ts), crisp at the largest scale
 * that fits, with its few frames of quiet motion cycling slowly (still with reduced motion). An
 * entry not yet seen shows its habitat in darkness.
 */
export function DexHabitat({ id, seen = true, className = '' }: { id: HabitatId; seen?: boolean; className?: string }) {
  const hab = HABITATS[id]
  const paint = useCallback((frame: number) => paintHabitat(id, frame).toRGBA(), [id])
  return (
    <PaintedScene
      id={`habitat:${id}`}
      frames={hab.frames}
      paint={paint}
      still={!seen}
      alt={seen ? hab.alt : 'An unknown habitat: this entry hasn’t been seen yet.'}
      className={className}
      style={{ filter: seen ? undefined : 'brightness(0.08) saturate(0)' }}
    >
      {!seen && (
        <span aria-hidden className="font-display text-outline absolute text-[clamp(28px,9cqi,64px)] text-paper">
          ?
        </span>
      )}
    </PaintedScene>
  )
}
