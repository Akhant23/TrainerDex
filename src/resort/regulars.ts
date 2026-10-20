/**
 * Resort regulars: built-in trainers who hang around the plaza so it never feels empty.
 * They're clearly marked as regulars (not real visitors) in their profiles. Their lines live in
 * dialogue.csv as regular.<id>.
 */
import type { Appearance } from '../sprites/character.ts'
import type { SpeciesId } from '../battle/data.ts'
import type { BattleRecord } from '../../supabase/functions/_shared/trainer.ts'

export interface Regular {
  id: string
  name: string
  look: Appearance
  party: SpeciesId[]
  record: BattleRecord
}

const base: Appearance = {
  skin: 'tan', hair: 'short', hairColour: 'brown', eyes: 'round', eyeColour: 'brown', face: 'smile',
  top: 'tee', topColour: 'white', accentColour: 'white', hat: 'none', hatColour: 'black',
  bottom: 'jeans', bottomColour: 'navy', shoes: 'sneakers', shoeColour: 'white', accessories: [],
}

export const regulars: Regular[] = [
  { id: 'hamish', name: 'HAMISH', look: { ...base, skin: 'light', hair: 'curly', hairColour: 'auburn', top: 'jacket', topColour: 'green', hat: 'beanie', hatColour: 'orange', bottom: 'joggers', bottomColour: 'grey', shoes: 'boots', shoeColour: 'tan' }, party: ['wicketoad', 'hootour'], record: { titles: 0, wins: 4, losses: 7 } },
  { id: 'bea', name: 'BEA', look: { ...base, skin: 'deep', hair: 'bun', hairColour: 'black', face: 'grin', top: 'tee', topColour: 'tan', bottom: 'skirt', bottomColour: 'black' }, party: ['beakerbun', 'brushfox'], record: { titles: 0, wins: 9, losses: 3 } },
  { id: 'priya', name: 'PRIYA', look: { ...base, skin: 'brown', hair: 'long', hairColour: 'black', eyes: 'sharp', face: 'smirk', top: 'jacket', topColour: 'red', bottom: 'jeans', bottomColour: 'black', shoes: 'boots', shoeColour: 'black', accessories: ['earring'] }, party: ['gavelion', 'megaphawk', 'datadillo'], record: { titles: 2, wins: 31, losses: 6 } },
  { id: 'tom', name: 'TOM', look: { ...base, skin: 'porcelain', hair: 'spiky', hairColour: 'blonde', face: 'grin', top: 'tee', topColour: 'blue', hat: 'cap', hatColour: 'blue', bottom: 'shorts', bottomColour: 'navy', shoeColour: 'red' }, party: ['byterat'], record: { titles: 0, wins: 2, losses: 11 } },
  { id: 'mei', name: 'MEI', look: { ...base, skin: 'light', hair: 'bun', hairColour: 'darkBrown', top: 'splash', topColour: 'white', bottom: 'skirt', bottomColour: 'lavender', shoeColour: 'pink' }, party: ['stitchick', 'campfly'], record: { titles: 0, wins: 6, losses: 4 } },
  { id: 'gerald', name: 'GERALD', look: { ...base, skin: 'tan', hair: 'buzz', hairColour: 'platinum', eyes: 'soft', face: 'calm', top: 'suit', topColour: 'navy', accentColour: 'red', bottom: 'slacks', bottomColour: 'navy', shoes: 'formal', shoeColour: 'black', accessories: ['glasses', 'watch'] }, party: ['diplomoth', 'gavelion'], record: { titles: 1, wins: 18, losses: 9 } },
  { id: 'sol', name: 'SOL', look: { ...base, skin: 'dark', hair: 'curly', hairColour: 'black', top: 'tank', topColour: 'yellow', bottom: 'shorts', bottomColour: 'teal', accessories: ['sunglasses', 'chain'] }, party: ['subwoof', 'riffin'], record: { titles: 0, wins: 12, losses: 12 } },
  { id: 'ana', name: 'ANA', look: { ...base, skin: 'tan', hair: 'long', hairColour: 'pink', top: 'hoodie', topColour: 'lavender', bottom: 'joggers', bottomColour: 'black', accessories: ['headphones'] }, party: ['brushfox', 'stitchick'], record: { titles: 0, wins: 7, losses: 2 } },
  { id: 'sam', name: 'SAM', look: { ...base, skin: 'deep', hair: 'short', hairColour: 'black', eyes: 'wide', top: 'shirt', topColour: 'white', accentColour: 'teal', bottom: 'slacks', bottomColour: 'grey', shoes: 'formal', shoeColour: 'black', accessories: ['glasses'] }, party: ['helixor', 'beakerbun'], record: { titles: 0, wins: 5, losses: 5 } },
  { id: 'kai', name: 'KAI', look: { ...base, skin: 'brown', hair: 'curtains', hairColour: 'darkBrown', top: 'tee', topColour: 'yellow', accentColour: 'red', hat: 'bucket', hatColour: 'black', bottom: 'shorts', bottomColour: 'black', accessories: ['bag'] }, party: ['hootour', 'campfly'], record: { titles: 0, wins: 3, losses: 1 } },
]
