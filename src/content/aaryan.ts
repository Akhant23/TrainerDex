import type { Appearance } from '../sprites/character.ts'

/**
 * Aaryan's look, built from the same character model visitors use.
 * `signature` is the everyday sprite (from the reference photo: wavy dark hair, slim glasses,
 * #7 white jersey with red, black joggers — no beard) with his silver: a stud in each ear, a
 * chain, a watch on one wrist, bracelets on the other and a belt chain.
 */
export const signature: Appearance = {
  skin: 'brown',
  hair: 'wavy',
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
  intro: string
  defeat: string
}

/**
 * The Battle Tower: one floor per stage of Aaryan's story, ending with the Champion.
 * Looks are taken from photos of each period (outfits only):
 *   1. the SBHS uniform — maroon blazer with white piping, white shirt, maroon-and-gold tie, grey trousers;
 *   2. a mid-2023 photo — middle-part hair, black shirt, teal tie;
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
    look: { ...signature, hair: 'curtains', top: 'school', topColour: 'maroon', accentColour: 'maroon', bottom: 'slacks', bottomColour: 'grey', shoes: 'formal', shoeColour: 'black', face: 'grin', accessories: [] },
    intro: 'I’m fresh out of GPS football training — let’s see what you’ve got!',
    defeat: 'Not bad! Go on, the lift’s that way.',
  },
  {
    floor: 2,
    id: 'first-year',
    title: 'FIRST-YEAR',
    years: '2023',
    look: { ...signature, hair: 'curtains', top: 'shirt', topColour: 'black', accentColour: 'teal', bottom: 'slacks', bottomColour: 'black', shoes: 'formal', shoeColour: 'black', face: 'calm', accessories: ['watch'] },
    intro: 'First year, first semester, first battle. How hard can it be?',
    defeat: 'Okay, uni’s harder than it looks. Up you go!',
  },
  {
    floor: 3,
    id: 'marketing',
    title: 'MARKETING DIRECTOR',
    years: '2024 – 2025',
    look: { ...signature, top: 'suit', topColour: 'black', accentColour: 'maroon', bottom: 'slacks', bottomColour: 'black', shoes: 'formal', shoeColour: 'black', face: 'smirk', accessories: ['glasses', 'earring', 'watch', 'bracelet'] },
    intro: 'Law Ball’s tonight and the merch sold out. Twice. The Dean wore one. Ready?',
    defeat: 'Okay, that was a strong campaign. Next floor.',
  },
  {
    floor: 4,
    id: 'tours',
    title: 'YELLOW SHIRTS TOURS',
    years: '2025 – 2026',
    look: { ...signature, top: 'tee', topColour: 'yellow', accentColour: 'red', hat: 'bucket', hatColour: 'black', bottom: 'shorts', bottomColour: 'black', face: 'grin', accessories: ['glasses', 'bag', 'watch'] },
    intro: 'Need help? Follow the sign! 3,500 first-years did. Now it’s your turn.',
    defeat: 'Tour’s over — the Champion’s waiting upstairs.',
  },
  {
    floor: 5,
    id: 'champion',
    title: 'CHAMPION',
    years: 'Now',
    look: signature,
    intro: 'So you made it to the top. Welcome to the Champion’s floor.',
    defeat: 'You beat every version of me. You’re the real Champion.',
  },
]
