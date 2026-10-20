import type { Appearance } from '../sprites/character.ts'
import type { Facing } from '../sprites/overworld.ts'
import type { MapId } from './maps.ts'

/** Resort staff. They're part of the resort, not other visitors. */
export interface StaffNpc {
  id: string
  map: MapId
  x: number
  y: number
  facing: Facing
  name: string
  look: Appearance
  lines: string[]
}

const base: Appearance = {
  skin: 'tan', hair: 'short', hairColour: 'brown', eyes: 'round', eyeColour: 'brown', face: 'smile',
  top: 'tee', topColour: 'white', accentColour: 'red', hat: 'none', hatColour: 'red',
  bottom: 'shorts', bottomColour: 'navy', shoes: 'sneakers', shoeColour: 'white', accessories: [],
}

export const staff: StaffNpc[] = [
  {
    id: 'guide', map: 'plaza', x: 11, y: 6, facing: 'down', name: 'RESORT GUIDE',
    look: { ...base, skin: 'light', hair: 'bun', hairColour: 'auburn', top: 'jacket', topColour: 'green', accentColour: 'white', bottom: 'skirt', bottomColour: 'navy' },
    lines: ['Welcome to the TrainerDex Battle Resort!', '▸ The Battle Tower is just behind me — five floors, five versions of Aaryan.', '▸ Visit the Avatar Studio to the west to change your look.', '▸ Everyone else you see here is a real visitor. Say hi!'],
  },
  {
    id: 'lifeguard', map: 'plaza', x: 21, y: 9, facing: 'right', name: 'LIFEGUARD',
    look: { ...base, skin: 'deep', hair: 'buzz', hairColour: 'black', top: 'tank', topColour: 'red', bottom: 'shorts', bottomColour: 'red', hat: 'cap', hatColour: 'yellow', accessories: ['sunglasses'] },
    lines: ['No running by the pool!', '…Unless you’re running from the Champion. Then fair enough.'],
  },
  {
    id: 'receptionist', map: 'reception', x: 6, y: 2, facing: 'down', name: 'RECEPTIONIST',
    look: { ...base, skin: 'porcelain', hair: 'long', hairColour: 'black', top: 'blazer', topColour: 'navy', accentColour: 'red', bottom: 'skirt', bottomColour: 'navy', shoes: 'formal', shoeColour: 'black' },
    lines: [],
  },
]
