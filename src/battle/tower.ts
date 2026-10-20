/**
 * Battle Tower: five floors, one per stage of Aaryan's story (looks and lines in content/aaryan.ts).
 * Clearing a floor unlocks creatures for your PC party.
 */
import type { Difficulty, SpeciesId } from './data'
import type { BattleSetup } from './engine'

export interface FloorBattle {
  floor: number
  ai: Difficulty
  opponent: Array<[SpeciesId, number]>
  playerLevel: number
  playerPotions: number
  aiPotions: number
  /** Creatures added to the visitor's PC when this floor is cleared. */
  unlocks: SpeciesId[]
}

export const STARTER_PARTY: SpeciesId[] = ['byterat', 'beakerbun', 'riffin']

export const floors: FloorBattle[] = [
  // SBHS: cricket and football
  { floor: 1, ai: 'casual', opponent: [['wicketoad', 20], ['strikaroo', 21]], playerLevel: 26, playerPotions: 3, aiPotions: 0, unlocks: ['wicketoad', 'strikaroo'] },
  // first year: camp and O-Week
  { floor: 2, ai: 'casual', opponent: [['campfly', 23], ['hootour', 23], ['brushfox', 24]], playerLevel: 27, playerPotions: 3, aiPotions: 0, unlocks: ['campfly', 'hootour'] },
  // marketing: campaigns and merch
  { floor: 3, ai: 'standard', opponent: [['stitchick', 25], ['subwoof', 26], ['megaphawk', 26]], playerLevel: 28, playerPotions: 2, aiPotions: 1, unlocks: ['stitchick', 'megaphawk', 'brushfox'] },
  // Yellow Shirts tours, mentoring
  { floor: 4, ai: 'standard', opponent: [['hootour', 28], ['diplomoth', 28], ['subwoof', 28], ['helixor', 29]], playerLevel: 29, playerPotions: 2, aiPotions: 1, unlocks: ['diplomoth', 'subwoof', 'helixor'] },
  // the Champion: the full team
  { floor: 5, ai: 'champion', opponent: [['megaphawk', 31], ['subwoof', 31], ['strikaroo', 31], ['helixor', 31], ['datadillo', 31], ['gavelion', 31]], playerLevel: 33, playerPotions: 3, aiPotions: 1, unlocks: ['datadillo', 'gavelion'] },
]

export function floorSetup(floor: number, party: SpeciesId[]): BattleSetup {
  const f = floors[floor - 1]
  return {
    ai: f.ai,
    player: party.map((species) => ({ species, level: f.playerLevel })),
    opponent: f.opponent.map(([species, level]) => ({ species, level })),
    playerPotions: f.playerPotions,
    aiPotions: f.aiPotions,
  }
}

/** Creatures available in the PC after clearing `cleared` floors. */
export function unlockedSpecies(cleared: number): SpeciesId[] {
  return [...STARTER_PARTY, ...floors.slice(0, cleared).flatMap((f) => f.unlocks)]
}
