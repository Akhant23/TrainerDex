import { useCallback } from 'react'
import { ENCOUNTER_ART, encounterScenes, paintEncounter, type Vignette } from '../sprites/encounters'
import { PaintedScene } from './PaintedScene'

/**
 * The rare encounter's top screen: three painted scenes, one per line of its dialogue. He turns
 * up in the tall grass, then the vignette (in his room hunting for the charger, at his desk
 * checking his watch, or caught mid-match at his PC), then he's gone in a puff of dust. It opens
 * on the battle-start flashes and cuts between scenes with a quick white flash. (The Pokédex plays
 * it; the admin's EASTER EGGS tab previews it.)
 */
export function WildEncounter({ line, vignette, intro = true }: { line: number; vignette: Vignette; intro?: boolean }) {
  const scenes = encounterScenes(vignette)
  const scene = scenes[Math.min(Math.max(0, line), scenes.length - 1)]
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
