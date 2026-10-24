import type { SourceId } from './sources'
import type { IconName } from '../sprites/icons'
import type { HabitatId } from '../sprites/habitats'

/** Elemental "types" used by the Pokédex (and, in Phase 4, the battle). */
export const types = {
  LAW: { label: 'LAW', color: '#c8a030' },
  SCIENCE: { label: 'SCIENCE', color: '#3fb8a0' },
  CREATIVE: { label: 'CREATIVE', color: '#a060e0' },
  MUSIC: { label: 'MUSIC', color: '#e05890' },
  SPORT: { label: 'SPORT', color: '#4fa850' },
  LEADER: { label: 'LEADER', color: '#e0383e' },
  TECH: { label: 'TECH', color: '#3a7fe0' },
  NORMAL: { label: 'NORMAL', color: '#8a8a78' },
} as const
export type TypeId = keyof typeof types

export type DexArt = { kind: 'icon'; name: IconName } | { kind: 'badge'; id: string }

export interface DexEntry {
  no: number
  name: string
  category: string
  types: [TypeId] | [TypeId, TypeId]
  /** the entry's emblem: a small mark in the info page's footprint box (and the list) */
  art: DexArt
  /** where this side of him is found: the scene the Pokédex shows him in (sprites/habitats.ts) */
  habitat: HabitatId
  entry: string
  sources: SourceId[]
}

/** Every entry is a true fact about Aaryan, written in Dex voice. */
export const pokedex: DexEntry[] = [
  {
    no: 1,
    name: 'ORIGIN',
    category: 'Hometown Pokémon',
    types: ['NORMAL'],
    art: { kind: 'icon', name: 'profile' },
    habitat: 'harbour',
    entry: 'I was born in Australia, of Bangladeshi descent. I’m fluent in both English and Bengali, and switch between them without warning.',
    sources: ['resume', 'linkedin'],
  },
  {
    no: 2,
    name: 'OBJECTION',
    category: 'Advocate Pokémon',
    types: ['LAW'],
    art: { kind: 'badge', id: 'verdict' },
    habitat: 'courtroom',
    entry: 'I’ve entered mooting, witness examination, negotiation and mediation competitions in every year of my law degree. I’m drawn to intellectual property, competition law, dispute resolution and pro bono.',
    sources: ['resume', 'linkedin'],
  },
  {
    no: 3,
    name: 'DISCOVERY',
    category: 'eDiscovery Pokémon',
    types: ['LAW', 'TECH'],
    art: { kind: 'icon', name: 'pc' },
    habitat: 'review',
    entry: 'You’ll find me in Clayton Utz’s Data Intelligence & Risk Advisory team, doing First Line Review in Relativity and making judgment calls on nuanced facts at high volume.',
    sources: ['resume', 'linkedin'],
  },
  {
    no: 4,
    name: 'GENOME',
    category: 'Lab Pokémon',
    types: ['SCIENCE'],
    art: { kind: 'icon', name: 'flask' },
    habitat: 'lab',
    entry: 'The other half of my double degree: a Bachelor of Science majoring in Biotechnology at UNSW.',
    sources: ['resume', 'linkedin'],
  },
  {
    no: 5,
    name: 'BRANDSTORM',
    category: 'Marketing Pokémon',
    types: ['CREATIVE', 'LEADER'],
    art: { kind: 'badge', id: 'prism' },
    habitat: 'stall',
    entry: 'I’ve run marketing for the UNSW Law Society, UNSOC, Beyond The Bounds and the Student Legal Education Group. My Law Society merch sold out two years running — the Dean was spotted wearing it.',
    sources: ['resume', 'linkedinVolunteering', 'aaryan'],
  },
  {
    no: 6,
    name: 'TOURGUIDE',
    category: 'Beacon Pokémon',
    types: ['LEADER'],
    art: { kind: 'badge', id: 'beacon' },
    habitat: 'campus',
    entry: 'I led O-Week campus tours for 3,500 first-years — the most since COVID — and have been a Student Ambassador since 2023. I know where every lecture theatre is.',
    sources: ['resume', 'linkedinVolunteering', 'aaryan'],
  },
  {
    no: 7,
    name: 'STRIKER',
    category: 'Captain Pokémon',
    types: ['SPORT'],
    art: { kind: 'badge', id: 'pitch' },
    habitat: 'pitch',
    entry: 'I played GPS Football from 2017 to 2022 and captained the side in 2017. You’ll often spot me in a number 7 jersey.',
    sources: ['linkedin'],
  },
  {
    no: 8,
    name: 'BOUNDARY',
    category: 'Coach Pokémon',
    types: ['SPORT', 'LEADER'],
    art: { kind: 'icon', name: 'cricket' },
    habitat: 'oval',
    entry: 'I played GPS Cricket for six seasons, then went back to Sydney Boys High to coach — building training plans for 11 players.',
    sources: ['resume', 'linkedin'],
  },
  {
    no: 9,
    name: 'SELECTA',
    category: 'DJ Pokémon',
    types: ['MUSIC'],
    art: { kind: 'icon', name: 'headphones' },
    habitat: 'club',
    entry: 'DJing tops the hobbies list on my resume. I get noticeably more active after dark.',
    sources: ['resume'],
  },
  {
    no: 10,
    name: 'STRUMMER',
    category: 'Six-String Pokémon',
    types: ['MUSIC'],
    art: { kind: 'icon', name: 'guitar' },
    habitat: 'bedroom',
    entry: 'I play guitar, and keep the case within arm’s reach at all times.',
    sources: ['aaryan'],
  },
  {
    no: 11,
    name: 'SHUTTER',
    category: 'Lens Pokémon',
    types: ['CREATIVE'],
    art: { kind: 'icon', name: 'camera' },
    habitat: 'street',
    entry: 'I’m into photography — the same eye behind my event graphics and campaign shoots.',
    sources: ['aaryan'],
  },
  {
    no: 12,
    name: 'PAGETURNER',
    category: 'Bookworm Pokémon',
    types: ['NORMAL'],
    art: { kind: 'icon', name: 'book' },
    habitat: 'library',
    entry: 'I read for fun, which law students are not supposed to have time for.',
    sources: ['resume'],
  },
  {
    no: 13,
    name: 'PLAYER TWO',
    category: 'Gamer Pokémon',
    types: ['TECH'],
    art: { kind: 'icon', name: 'gamepad' },
    habitat: 'den',
    entry: 'I’m into technology and gaming. Probably the reason this website exists.',
    sources: ['aaryan'],
  },
  {
    no: 14,
    name: 'QUICKTYPE',
    category: 'Keyboard Pokémon',
    types: ['TECH'],
    art: { kind: 'icon', name: 'resume' },
    habitat: 'chambers',
    entry: 'I type at 120 words per minute with 99% accuracy. Briefs to counsel fear me.',
    sources: ['resume'],
  },
  {
    no: 15,
    name: 'MULTITASK',
    category: 'Society Pokémon',
    types: ['LEADER', 'NORMAL'],
    art: { kind: 'icon', name: 'card' },
    habitat: 'hall',
    entry: 'I’ve logged 21 volunteer roles across UNSW societies since 2023 — from road trips for 100 people to careers panels.',
    sources: ['linkedinVolunteering'],
  },
]
