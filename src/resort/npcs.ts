import type { Appearance } from '../sprites/character.ts'
import type { Facing } from '../sprites/overworld.ts'
import { PLAZA_X, type MapId } from './maps.ts'

/** Resort staff. They're part of the resort, not other visitors. */
export interface StaffNpc {
  id: string
  map: MapId
  x: number
  y: number
  facing: Facing
  name: string
  look: Appearance
  /** Key of their lines in dialogue.csv. */
  linesKey: string
}

const base: Appearance = {
  skin: 'tan', hair: 'short', hairColour: 'brown', eyes: 'round', eyeColour: 'brown', face: 'smile',
  top: 'tee', topColour: 'white', accentColour: 'red', hat: 'none', hatColour: 'red',
  bottom: 'shorts', bottomColour: 'navy', shoes: 'sneakers', shoeColour: 'white', accessories: [],
}

export const staff: StaffNpc[] = [
  {
    id: 'guide', map: 'plaza', x: PLAZA_X + 16, y: 8, facing: 'down', name: 'RESORT GUIDE',
    look: { ...base, skin: 'light', hair: 'bun', hairColour: 'auburn', top: 'jacket', topColour: 'green', accentColour: 'white', bottom: 'skirt', bottomColour: 'navy' },
    linesKey: 'staff.guide',
  },
  {
    id: 'lifeguard', map: 'plaza', x: PLAZA_X + 29, y: 22, facing: 'right', name: 'LIFEGUARD',
    look: { ...base, skin: 'deep', hair: 'buzz', hairColour: 'black', top: 'tank', topColour: 'red', bottom: 'shorts', bottomColour: 'red', hat: 'cap', hatColour: 'yellow', accessories: ['sunglasses'] },
    linesKey: 'staff.lifeguard',
  },
  {
    id: 'receptionist', map: 'reception', x: 6, y: 2, facing: 'down', name: 'RECEPTIONIST',
    look: { ...base, skin: 'porcelain', hair: 'long', hairColour: 'black', top: 'blazer', topColour: 'navy', accentColour: 'red', bottom: 'skirt', bottomColour: 'navy', shoes: 'formal', shoeColour: 'black' },
    linesKey: 'staff.receptionist.welcome',
  },
]
