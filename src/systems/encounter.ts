import { dialogue } from '../content/dialogue'
import { VIGNETTES, type Vignette } from '../sprites/encounters'

/** One of the vignettes at random: what he's caught doing this time. */
export const pickVignette = (): Vignette => VIGNETTES[Math.floor(Math.random() * VIGNETTES.length)]

/** The encounter's three lines for a vignette: he appears, what he's up to, he flees. */
export const encounterLines = (v: Vignette): string[] => [dialogue.rareEncounter.appear, dialogue.rareEncounter.vignettes[v], dialogue.rareEncounter.fled]
