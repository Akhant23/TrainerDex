import type { Appearance } from '../sprites/character.ts'

/**
 * Aaryan's look, built from the same character model visitors use.
 * `signature` is the everyday sprite (from the reference photo: dark hair with a wavy top and fringe,
 * worn as a modern mullet, bold rectangular glasses,
 * #7 white jersey with red, black joggers — no beard) with his silver: a stud in each ear, a
 * chain, a watch on one wrist, bracelets on the other and a belt chain.
 */
export const signature: Appearance = {
  skin: 'brown',
  hair: 'mullet',
  hairColour: 'black',
  eyes: 'soft',
  eyeColour: 'brown',
  face: 'smile',
  top: 'jersey',
  topColour: 'white',
  accentColour: 'red',
  hat: 'none',
  hatColour: 'black',
  bottom: 'joggers',
  bottomColour: 'black',
  shoes: 'sneakers',
  shoeColour: 'black',
  accessories: ['glasses', 'chain', 'earring', 'watch', 'bracelet', 'beltchain'],
}

/** Shiny variant: platinum hair, black-and-gold kit. */
export const shinySignature: Appearance = { ...signature, hairColour: 'platinum', topColour: 'black', accentColour: 'yellow' }

export interface TowerStage {
  floor: number
  id: string
  title: string
  years: string
  look: Appearance
}
// Each stage's lines live in dialogue.csv as tower.<id>.intro / tower.<id>.defeat.

/**
 * The Battle Tower: one floor per stage of Aaryan's story, ending with the Champion.
 * Looks are taken from photos of each period (outfits only):
 *   1. the SBHS uniform — brown blazer with blue piping, white shirt, dark red tie, grey trousers,
 *      black belt, black leather shoes;
 *   2. first-year colour run (March 2023) — white tee splashed with paint powder, dark shorts;
 *   3. UNSW Law Ball 2024 — black suit, dark shirt, maroon tie;
 *   4. O-Week Tours — yellow O-Week tee with the red crest, black bucket hat, shorts, crossbody bag;
 *   5. the Champion — today's signature look.
 */
export const towerStages: TowerStage[] = [
  {
    floor: 1,
    id: 'school',
    title: 'SBHS STUDENT',
    years: '2017 – 2022',
    look: { ...signature, hair: 'curtains', top: 'school', topColour: 'brown', accentColour: 'maroon', bottom: 'slacks', bottomColour: 'grey', shoes: 'formal', shoeColour: 'black', face: 'grin', accessories: [] },
  },
  {
    floor: 2,
    id: 'first-year',
    title: 'FIRST-YEAR',
    years: '2023',
    look: { ...signature, hair: 'curtains', top: 'splash', topColour: 'white', accentColour: 'white', bottom: 'shorts', bottomColour: 'black', shoes: 'sneakers', shoeColour: 'white', face: 'grin', accessories: ['glasses'] },
  },
  {
    floor: 3,
    id: 'marketing',
    title: 'MARKETING DIRECTOR',
    years: '2024 – 2025',
    look: { ...signature, top: 'suit', topColour: 'black', accentColour: 'maroon', bottom: 'slacks', bottomColour: 'black', shoes: 'formal', shoeColour: 'black', face: 'smirk', accessories: ['glasses', 'earring', 'watch', 'bracelet'] },
  },
  {
    floor: 4,
    id: 'tours',
    title: 'YELLOW SHIRTS TOURS',
    years: '2025 – 2026',
    look: { ...signature, top: 'tee', topColour: 'yellow', accentColour: 'red', hat: 'bucket', hatColour: 'black', bottom: 'shorts', bottomColour: 'black', face: 'grin', accessories: ['glasses', 'bag', 'watch'] },
  },
  {
    floor: 5,
    id: 'champion',
    title: 'CHAMPION',
    years: 'Now',
    look: signature,
  },
]
