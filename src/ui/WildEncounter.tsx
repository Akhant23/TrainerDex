import { useCallback } from 'react'
import { ENCOUNTER_ART, ENCOUNTER_SCENES, paintEncounter } from '../sprites/encounters'
import { PaintedScene } from './PaintedScene'

/**
 * The rare encounter's top screen: a painted scene per line of the story (in the grass, in his
 * room hunting for the charger, at his desk checking his watch, gone in a puff of dust), opening
 * on the battle-start flashes and cutting between scenes with a quick white flash. Lines past the
 * last scene keep it. (The Pokédex plays it; the admin's EASTER EGGS tab previews it.)
 */
export function WildEncounter({ line, intro = true }: { line: number; intro?: boolean }) {
  const scene = ENCOUNTER_SCENES[Math.min(Math.max(0, line), ENCOUNTER_SCENES.length - 1)]
  const art = ENCOUNTER_ART[scene]
  const paint = useCallback((frame: number) => paintEncounter(scene, frame).toRGBA(), [scene])
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0e1430]">
      <PaintedScene key={scene} id={`encounter:${scene}`} frames={art.frames} ms={art.ms} rest={art.rest} paint={paint} alt={art.alt} className="h-full w-full" />
      {line > 0 && <div key={`cut-${scene}`} className="encounter-cut" aria-hidden />}
      {intro && <div className="encounter" aria-hidden />}
    </div>
  )
}
