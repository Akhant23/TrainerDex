import type { IconName } from '../sprites/icons'

export interface MenuEntry {
  id: string
  label: string
  route: string
  icon: IconName
  /** Tile + section colour pair: [main, dark]. */
  color: readonly [string, string]
  /** One line shown on the top screen while the tile is focused. */
  blurb: string
  /** Build phase the section ships in (sections not built yet show an honest notice). */
  phase: 2 | 3 | 4 | 5
  /** What the finished section will contain — shown on the under-construction screen. */
  planned: readonly string[]
}

export const menu: readonly MenuEntry[] = [
  {
    id: 'profile',
    label: 'PROFILE',
    route: '/profile',
    icon: 'profile',
    color: ['#e0383e', '#8e1f2b'],
    blurb: "Aaryan's trainer info: bio, studies, interests and stats.",
    phase: 3,
    planned: ['Biography & education', 'Interests and hobbies', 'Animated trainer stats', 'Ambitions'],
  },
  {
    id: 'pokedex',
    label: 'POKéDEX',
    route: '/pokedex',
    icon: 'pokedex',
    color: ['#f06030', '#9a3218'],
    blurb: 'Numbered entries on everything that makes Aaryan, Aaryan.',
    phase: 3,
    planned: ['Collectible entries', 'Seen / caught counter', 'A rare encounter…'],
  },
  {
    id: 'card',
    label: 'TRAINER CARD',
    route: '/card',
    icon: 'card',
    color: ['#e8a820', '#8a6008'],
    blurb: 'Trainer Card and Badge Case — verified roles and achievements.',
    phase: 3,
    planned: ['Flippable Trainer Card', 'Badge Case with badge polishing', 'Achievement entries with sources'],
  },
  {
    id: 'pc',
    label: 'PC',
    route: '/pc',
    icon: 'pc',
    color: ['#2f5fb8', '#18306a'],
    blurb: "Aaryan's PC: resume, portfolio boxes and the full experience log.",
    phase: 3,
    planned: ['Resume viewer + download', 'Portfolio boxes with filters', 'Case studies', 'Experience log'],
  },
  {
    id: 'album',
    label: 'PHOTO ALBUM',
    route: '/album',
    icon: 'album',
    color: ['#e05890', '#8a2850'],
    blurb: 'Ten memories, each with its own entry.',
    phase: 3,
    planned: ['10 photo entries', 'Expanded Dex-style view', 'Keyboard + swipe navigation'],
  },
  {
    id: 'battle',
    label: 'BATTLE RESORT',
    route: '/battle',
    icon: 'battle',
    color: ['#c02838', '#5a1018'],
    blurb: 'Make an avatar, meet other visitors and climb the Battle Tower to the Champion.',
    phase: 4,
    planned: ['Pick a starter', 'Turn-based battle with types & crits', '3 difficulty levels', 'Win the TRAINERDEX BADGE'],
  },
  {
    id: 'pager',
    label: 'POKé PAGER',
    route: '/pager',
    icon: 'pager',
    color: ['#2a9a90', '#105048'],
    blurb: 'Leave Aaryan a message on the Poké Pager.',
    phase: 5,
    planned: ['Visitor guestbook', 'Moderated messages', 'Trainer avatars'],
  },
  {
    id: 'settings',
    label: 'SETTINGS',
    route: '/settings',
    icon: 'settings',
    color: ['#5a6480', '#2a3048'],
    blurb: 'Text speed, sound, music and motion.',
    phase: 2,
    planned: [],
  },
]

export function menuEntryForRoute(path: string): MenuEntry | undefined {
  return menu.find((m) => path === m.route || path.startsWith(m.route + '/'))
}
