/**
 * Battle data: type chart, moves and creatures. Pure data — tweak numbers here to rebalance,
 * then run `npm test` (the simulation tests check each difficulty still plays differently).
 */
import type { TypeId } from '../content/pokedex'

/* ---------------- Type chart ---------------- */

/** attacker → defender → multiplier (missing = 1). */
export const typeChart: Record<TypeId, Partial<Record<TypeId, number>>> = {
  LAW: { CREATIVE: 2, TECH: 2, SCIENCE: 0.5, LAW: 0.5 },
  SCIENCE: { LAW: 2, MUSIC: 2, TECH: 0.5, SCIENCE: 0.5 },
  TECH: { SCIENCE: 2, LEADER: 2, MUSIC: 0.5, LAW: 0.5 },
  MUSIC: { TECH: 2, LEADER: 2, SCIENCE: 0.5, MUSIC: 0.5 },
  CREATIVE: { TECH: 2, LEADER: 2, LAW: 0.5, CREATIVE: 0.5 },
  SPORT: { LAW: 2, NORMAL: 2, LEADER: 0.5, SCIENCE: 0.5 },
  LEADER: { SPORT: 2, NORMAL: 2, LAW: 0.5, LEADER: 0.5 },
  NORMAL: {},
}

/** One-line reasons, shown in the battle help. */
export const typeReasons: string[] = [
  'LAW beats CREATIVE (copyright) and TECH (regulation).',
  'SCIENCE beats LAW (hard evidence) and MUSIC (acoustics).',
  'TECH beats SCIENCE (automation) and LEADER (disruption).',
  'MUSIC beats TECH (analogue soul) and LEADER (drowns out speeches).',
  'CREATIVE beats TECH (outthinks the algorithm) and LEADER (a rebrand).',
  'SPORT beats LAW (teamwork over red tape) and NORMAL.',
  'LEADER beats SPORT (captaincy) and NORMAL.',
]

export function effectiveness(move: TypeId, defender: readonly TypeId[]): number {
  return defender.reduce((m, t) => m * (typeChart[move][t] ?? 1), 1)
}

/* ---------------- Moves ---------------- */

export type StatId = 'atk' | 'def' | 'spe' | 'acc' | 'crit'

export type MoveEffect =
  | { kind: 'none' }
  /** Change the user's stages. */
  | { kind: 'self'; stats: Partial<Record<StatId, number>>; chance?: number }
  /** Change the target's stages. */
  | { kind: 'target'; stats: Partial<Record<StatId, number>>; chance?: number }
  /** Heal a fraction of max HP. */
  | { kind: 'heal'; fraction: number }
  /** Lose a fraction of max HP after hitting. */
  | { kind: 'recoil'; fraction: number }
  /** Power doubles when the target is at or below half HP. */
  | { kind: 'finisher' }
  /** Lab Experiment: a random outcome each time. */
  | { kind: 'experiment' }

export interface Move {
  id: string
  name: string
  type: TypeId
  /** 0 = status move */
  power: number
  /** percent; 0 = never misses */
  accuracy: number
  pp: number
  priority?: number
  effect: MoveEffect
  description: string
}

const m = (x: Move) => x

export const moves = {
  objection: m({ id: 'objection', name: 'OBJECTION!', type: 'LAW', power: 90, accuracy: 100, pp: 10, effect: { kind: 'none' }, description: 'A thunderous legal interjection.' }),
  crossExamine: m({ id: 'crossExamine', name: 'CROSS-EXAMINE', type: 'LAW', power: 55, accuracy: 100, pp: 15, effect: { kind: 'target', stats: { def: -1 } }, description: 'Pokes holes in the story. Lowers the target’s DEFENCE.' }),
  finalSubmission: m({ id: 'finalSubmission', name: 'FINAL SUBMISSION', type: 'LAW', power: 65, accuracy: 90, pp: 5, effect: { kind: 'finisher' }, description: 'A closing argument. Double power if the target is at half HP or less.' }),
  criticalAnalysis: m({ id: 'criticalAnalysis', name: 'CRITICAL ANALYSIS', type: 'NORMAL', power: 0, accuracy: 0, pp: 10, effect: { kind: 'self', stats: { atk: 1, crit: 1 } }, description: 'Studies the matchup. Raises ATTACK and the critical-hit rate.' }),

  labExperiment: m({ id: 'labExperiment', name: 'LAB EXPERIMENT', type: 'SCIENCE', power: 70, accuracy: 95, pp: 10, effect: { kind: 'experiment' }, description: 'Results may vary: a big hit, a heal, a weakened target… or a small explosion.' }),
  splice: m({ id: 'splice', name: 'SPLICE', type: 'SCIENCE', power: 80, accuracy: 90, pp: 10, effect: { kind: 'none' }, description: 'Rewrites a strand of the target’s day.' }),
  catalyst: m({ id: 'catalyst', name: 'CATALYST', type: 'SCIENCE', power: 60, accuracy: 100, pp: 15, effect: { kind: 'self', stats: { atk: 1 }, chance: 30 }, description: 'May speed up the reaction, raising ATTACK.' }),
  peerReview: m({ id: 'peerReview', name: 'PEER REVIEW', type: 'SCIENCE', power: 0, accuracy: 0, pp: 10, effect: { kind: 'self', stats: { def: 2 } }, description: 'Gets every claim checked. Sharply raises DEFENCE.' }),

  creativeSpark: m({ id: 'creativeSpark', name: 'CREATIVE SPARK', type: 'CREATIVE', power: 80, accuracy: 100, pp: 10, effect: { kind: 'none' }, description: 'A flash of inspiration, fired straight at the target.' }),
  quickSketch: m({ id: 'quickSketch', name: 'QUICK SKETCH', type: 'CREATIVE', power: 40, accuracy: 100, pp: 20, priority: 1, effect: { kind: 'none' }, description: 'Drawn so fast it always goes first.' }),
  moodBoard: m({ id: 'moodBoard', name: 'MOOD BOARD', type: 'CREATIVE', power: 0, accuracy: 100, pp: 15, effect: { kind: 'target', stats: { atk: -1 } }, description: 'Overwhelms the target with references. Lowers its ATTACK.' }),
  rebrand: m({ id: 'rebrand', name: 'REBRAND', type: 'CREATIVE', power: 0, accuracy: 0, pp: 10, effect: { kind: 'self', stats: { atk: 1, spe: 1 } }, description: 'A fresh new look. Raises ATTACK and SPEED.' }),

  bassDrop: m({ id: 'bassDrop', name: 'BASS DROP', type: 'MUSIC', power: 90, accuracy: 90, pp: 10, effect: { kind: 'none' }, description: 'Waits for it… waits for it…' }),
  feedbackLoop: m({ id: 'feedbackLoop', name: 'FEEDBACK LOOP', type: 'MUSIC', power: 60, accuracy: 100, pp: 15, effect: { kind: 'target', stats: { def: -1 }, chance: 30 }, description: 'A screech that may lower the target’s DEFENCE.' }),
  powerChord: m({ id: 'powerChord', name: 'POWER CHORD', type: 'MUSIC', power: 75, accuracy: 100, pp: 15, effect: { kind: 'none' }, description: 'Two notes, maximum volume.' }),
  hypeTrack: m({ id: 'hypeTrack', name: 'HYPE TRACK', type: 'MUSIC', power: 0, accuracy: 0, pp: 10, effect: { kind: 'self', stats: { spe: 2 } }, description: 'Queues up a banger. Sharply raises SPEED.' }),

  bicycleKick: m({ id: 'bicycleKick', name: 'BICYCLE KICK', type: 'SPORT', power: 85, accuracy: 90, pp: 10, effect: { kind: 'none' }, description: 'Overhead and spectacular.' }),
  hitForSix: m({ id: 'hitForSix', name: 'HIT FOR SIX', type: 'SPORT', power: 110, accuracy: 75, pp: 5, effect: { kind: 'none' }, description: 'Swings for the boundary. Huge if it connects.' }),
  sprint: m({ id: 'sprint', name: 'SPRINT', type: 'SPORT', power: 0, accuracy: 0, pp: 10, effect: { kind: 'self', stats: { spe: 2 } }, description: 'Sharply raises SPEED.' }),

  leadByExample: m({ id: 'leadByExample', name: 'LEAD BY EXAMPLE', type: 'LEADER', power: 80, accuracy: 100, pp: 10, effect: { kind: 'none' }, description: 'Shows exactly how it’s done.' }),
  pepTalk: m({ id: 'pepTalk', name: 'PEP TALK', type: 'LEADER', power: 0, accuracy: 0, pp: 10, effect: { kind: 'self', stats: { atk: 2 } }, description: 'Sharply raises ATTACK.' }),
  guidedTour: m({ id: 'guidedTour', name: 'GUIDED TOUR', type: 'NORMAL', power: 60, accuracy: 100, pp: 20, effect: { kind: 'target', stats: { acc: -1 }, chance: 20 }, description: 'Leads the target the long way round. May lower its accuracy.' }),

  byte: m({ id: 'byte', name: 'BYTE', type: 'TECH', power: 60, accuracy: 100, pp: 20, effect: { kind: 'none' }, description: 'Eight bits of bite.' }),
  overclock: m({ id: 'overclock', name: 'OVERCLOCK', type: 'TECH', power: 100, accuracy: 95, pp: 5, effect: { kind: 'recoil', fraction: 1 / 8 }, description: 'Runs hot. The user loses a little HP.' }),
  firewall: m({ id: 'firewall', name: 'FIREWALL', type: 'TECH', power: 0, accuracy: 0, pp: 10, effect: { kind: 'self', stats: { def: 2 } }, description: 'Sharply raises DEFENCE.' }),
  ctrlZ: m({ id: 'ctrlZ', name: 'CTRL+Z', type: 'TECH', power: 0, accuracy: 0, pp: 5, effect: { kind: 'heal', fraction: 0.5 }, description: 'Undo. Restores half of max HP.' }),

  yorker: m({ id: 'yorker', name: 'YORKER', type: 'SPORT', power: 50, accuracy: 100, pp: 20, priority: 1, effect: { kind: 'none' }, description: 'Right at the toes. Always goes first.' }),
  netSession: m({ id: 'netSession', name: 'NET SESSION', type: 'SPORT', power: 0, accuracy: 0, pp: 10, effect: { kind: 'self', stats: { atk: 1, def: 1 } }, description: 'Practice in the nets. Raises ATTACK and DEFENCE.' }),
  icebreaker: m({ id: 'icebreaker', name: 'ICEBREAKER', type: 'LEADER', power: 60, accuracy: 100, pp: 15, effect: { kind: 'target', stats: { atk: -1 }, chance: 30 }, description: 'Gets everyone talking. May lower the target’s ATTACK.' }),
  campfireStory: m({ id: 'campfireStory', name: 'CAMPFIRE STORY', type: 'LEADER', power: 0, accuracy: 0, pp: 5, effect: { kind: 'heal', fraction: 0.5 }, description: 'A story by the fire. Restores half of max HP.' }),
  hypeCampaign: m({ id: 'hypeCampaign', name: 'HYPE CAMPAIGN', type: 'CREATIVE', power: 85, accuracy: 95, pp: 10, effect: { kind: 'none' }, description: 'A launch nobody can scroll past.' }),
  soldOut: m({ id: 'soldOut', name: 'SOLD OUT', type: 'CREATIVE', power: 60, accuracy: 100, pp: 5, effect: { kind: 'finisher' }, description: 'Gone in minutes. Double power if the target is at half HP or less.' }),
  merchDrop: m({ id: 'merchDrop', name: 'MERCH DROP', type: 'CREATIVE', power: 70, accuracy: 100, pp: 10, effect: { kind: 'self', stats: { spe: 1 }, chance: 50 }, description: 'New stock lands. May raise SPEED.' }),
  resolution: m({ id: 'resolution', name: 'RESOLUTION', type: 'LAW', power: 75, accuracy: 100, pp: 10, effect: { kind: 'target', stats: { atk: -1 }, chance: 30 }, description: 'Passed by consensus. May lower the target’s ATTACK.' }),
  veto: m({ id: 'veto', name: 'VETO', type: 'LAW', power: 0, accuracy: 90, pp: 10, effect: { kind: 'target', stats: { atk: -2 } }, description: 'Blocks the motion. Sharply lowers the target’s ATTACK.' }),
  riskAudit: m({ id: 'riskAudit', name: 'RISK AUDIT', type: 'TECH', power: 70, accuracy: 100, pp: 15, effect: { kind: 'target', stats: { def: -1 }, chance: 50 }, description: 'Finds every weak point. May lower the target’s DEFENCE.' }),

  tackle: m({ id: 'tackle', name: 'TACKLE', type: 'NORMAL', power: 40, accuracy: 100, pp: 30, effect: { kind: 'none' }, description: 'A full-body charge.' }),
  bunnyHop: m({ id: 'bunnyHop', name: 'BUNNY HOP', type: 'NORMAL', power: 70, accuracy: 95, pp: 15, effect: { kind: 'none' }, description: 'Springs out of the flask and lands hard.' }),
  diveBomb: m({ id: 'diveBomb', name: 'DIVE BOMB', type: 'NORMAL', power: 70, accuracy: 95, pp: 15, effect: { kind: 'none' }, description: 'Straight down from the clifftop.' }),
  /** Used automatically when every move is out of PP. */
  struggle: m({ id: 'struggle', name: 'STRUGGLE', type: 'NORMAL', power: 40, accuracy: 0, pp: 1, effect: { kind: 'recoil', fraction: 1 / 4 }, description: 'Out of ideas.' }),
} satisfies Record<string, Move>

export type MoveId = keyof typeof moves

/* ---------------- Creatures ---------------- */

export interface Species {
  id: string
  name: string
  types: [TypeId] | [TypeId, TypeId]
  base: { hp: number; atk: number; def: number; spe: number }
  moves: [MoveId, MoveId, MoveId, MoveId]
  blurb: string
}

const s = (x: Species) => x

export const species = {
  gavelion: s({ id: 'gavelion', name: 'GAVELION', types: ['LAW'], base: { hp: 92, atk: 96, def: 82, spe: 76 }, moves: ['objection', 'crossExamine', 'criticalAnalysis', 'finalSubmission'], blurb: 'Aaryan’s ace. A lion cub in a barrister’s wig who never loses an argument.' }),
  helixor: s({ id: 'helixor', name: 'HELIXOR', types: ['SCIENCE'], base: { hp: 78, atk: 82, def: 86, spe: 60 }, moves: ['labExperiment', 'splice', 'catalyst', 'peerReview'], blurb: 'A double-helix serpent in safety goggles. Has opinions about your methodology.' }),
  brushfox: s({ id: 'brushfox', name: 'BRUSHFOX', types: ['CREATIVE'], base: { hp: 66, atk: 88, def: 62, spe: 98 }, moves: ['creativeSpark', 'quickSketch', 'moodBoard', 'rebrand'], blurb: 'Dips its tail in paint and signs every poster it touches.' }),
  subwoof: s({ id: 'subwoof', name: 'SUBWOOF', types: ['MUSIC'], base: { hp: 88, atk: 86, def: 72, spe: 64 }, moves: ['bassDrop', 'feedbackLoop', 'hypeTrack', 'tackle'], blurb: 'Half pup, half speaker cabinet. The party starts when it barks.' }),
  strikaroo: s({ id: 'strikaroo', name: 'STRIKAROO', types: ['SPORT'], base: { hp: 82, atk: 96, def: 66, spe: 86 }, moves: ['bicycleKick', 'hitForSix', 'sprint', 'tackle'], blurb: 'Equally at home on the pitch and the crease. Wears the number 7.' }),
  hootour: s({ id: 'hootour', name: 'HOOTOUR', types: ['LEADER'], base: { hp: 78, atk: 72, def: 78, spe: 70 }, moves: ['leadByExample', 'pepTalk', 'guidedTour', 'criticalAnalysis'], blurb: 'Leads first-years across campus, flag held high, yellow scarf on.' }),

  byterat: s({ id: 'byterat', name: 'BYTERAT', types: ['TECH'], base: { hp: 74, atk: 88, def: 70, spe: 96 }, moves: ['byte', 'overclock', 'firewall', 'ctrlZ'], blurb: 'Lives in server racks. Its tail is a working ethernet cable.' }),
  beakerbun: s({ id: 'beakerbun', name: 'BEAKERBUN', types: ['SCIENCE'], base: { hp: 84, atk: 82, def: 82, spe: 72 }, moves: ['labExperiment', 'splice', 'peerReview', 'bunnyHop'], blurb: 'Hops out of round-bottom flasks. Nobody knows what’s in the green stuff.' }),
  wicketoad: s({ id: 'wicketoad', name: 'WICKETOAD', types: ['SPORT'], base: { hp: 86, atk: 84, def: 80, spe: 70 }, moves: ['hitForSix', 'yorker', 'netSession', 'tackle'], blurb: 'Bats, bowls and coaches the juniors. Puffs up its throat before every appeal.' }),
  campfly: s({ id: 'campfly', name: 'CAMPFLY', types: ['LEADER'], base: { hp: 72, atk: 72, def: 70, spe: 92 }, moves: ['leadByExample', 'icebreaker', 'campfireStory', 'guidedTour'], blurb: 'Glows brightest at First Year Camp. Knows every icebreaker going.' }),
  megaphawk: s({ id: 'megaphawk', name: 'MEGAPHAWK', types: ['CREATIVE', 'LEADER'], base: { hp: 76, atk: 92, def: 66, spe: 94 }, moves: ['hypeCampaign', 'soldOut', 'pepTalk', 'diveBomb'], blurb: 'Its beak is a megaphone. Every campaign it fronts sells out.' }),
  stitchick: s({ id: 'stitchick', name: 'STITCHICK', types: ['CREATIVE'], base: { hp: 74, atk: 80, def: 76, spe: 88 }, moves: ['merchDrop', 'quickSketch', 'moodBoard', 'creativeSpark'], blurb: 'Hatched in a hoodie it stitched itself. The socks match, too.' }),
  diplomoth: s({ id: 'diplomoth', name: 'DIPLOMOTH', types: ['LAW', 'LEADER'], base: { hp: 80, atk: 80, def: 84, spe: 74 }, moves: ['resolution', 'veto', 'crossExamine', 'leadByExample'], blurb: 'Raises its placard, waits its turn, and wins the room anyway.' }),
  datadillo: s({ id: 'datadillo', name: 'DATADILLO', types: ['TECH', 'LAW'], base: { hp: 90, atk: 84, def: 96, spe: 58 }, moves: ['riskAudit', 'byte', 'firewall', 'objection'], blurb: 'Rolls up in encrypted plates. Spots the risk before anyone else does.' }),
  riffin: s({ id: 'riffin', name: 'RIFFIN', types: ['MUSIC'], base: { hp: 78, atk: 90, def: 72, spe: 82 }, moves: ['bassDrop', 'powerChord', 'hypeTrack', 'diveBomb'], blurb: 'A cliff-dwelling puffin with a tiny guitar and a big riff.' }),
} satisfies Record<string, Species>

export type SpeciesId = keyof typeof species

export const starters: SpeciesId[] = ['byterat', 'beakerbun', 'riffin']

/* ---------------- Difficulty ---------------- */

export type Difficulty = 'casual' | 'standard' | 'champion'

export const difficulties: Record<Difficulty, { label: string; blurb: string; team: SpeciesId[]; level: number; playerLevel: number; playerPotions: number; aiPotions: number }> = {
  casual: {
    label: 'CASUAL',
    blurb: '3 creatures, low level, relaxed tactics.',
    team: ['hootour', 'brushfox', 'gavelion'],
    level: 22,
    playerLevel: 28,
    playerPotions: 3,
    aiPotions: 0,
  },
  standard: {
    label: 'STANDARD',
    blurb: '4 creatures at your level, sensible tactics.',
    team: ['hootour', 'strikaroo', 'helixor', 'gavelion'],
    level: 28,
    playerLevel: 28,
    playerPotions: 2,
    aiPotions: 1,
  },
  champion: {
    label: 'CHAMPION',
    blurb: 'The full team of 6 — three of yours against six of his — and he plays to win.',
    team: ['hootour', 'subwoof', 'brushfox', 'strikaroo', 'helixor', 'gavelion'],
    level: 31,
    playerLevel: 33,
    playerPotions: 3,
    aiPotions: 1,
  },
}
