/**
 * Visitor medals (achievements), BW2 Medal Rally style. Stored per browser.
 * `hidden` medals show as "???" until earned; `hint` is shown for hidden ones.
 */
export interface Medal {
  id: string
  name: string
  description: string
  hidden?: boolean
  hint?: string
  tier: 'bronze' | 'silver' | 'gold'
}

export const medals = [
  { id: 'first-encounter', name: 'First Encounter', description: 'Opened the TrainerDex.', tier: 'bronze' },
  { id: 'researcher', name: 'Pokédex Researcher', description: 'Visited every section on the main menu.', tier: 'silver' },
  { id: 'dex-complete', name: 'Dex Complete', description: 'Read all 15 Pokédex entries.', tier: 'gold' },
  { id: 'memory-collector', name: 'Memory Collector', description: 'Viewed all 10 photos in the album.', tier: 'silver' },
  { id: 'challenger', name: 'Challenger', description: 'Started a battle against Trainer Aaryan.', tier: 'bronze' },
  { id: 'champion', name: 'Champion', description: 'Defeated Trainer Aaryan.', tier: 'silver' },
  { id: 'true-champion', name: 'True Champion', description: 'Defeated Trainer Aaryan on CHAMPION difficulty.', tier: 'gold' },
  { id: 'social-trainer', name: 'Social Trainer', description: 'Opened the Poké Pager.', tier: 'bronze' },
  { id: 'pen-pal', name: 'Pen Pal', description: 'Sent Aaryan a message on the Poké Pager.', tier: 'silver' },
  { id: 'polisher', name: 'Elbow Grease', description: 'Polished a badge until it sparkled.', tier: 'bronze' },
  { id: 'spotless', name: 'Spotless', description: 'Polished all eight badges until they sparkled.', tier: 'gold' },
  { id: 'recruiter', name: 'Paper Trail', description: 'Opened the resume.', tier: 'bronze' },
  { id: 'secret', name: 'Persistent', description: 'Found the secret line by talking to Aaryan over and over.', hidden: true, hint: 'Some people just keep poking.', tier: 'bronze' },
  { id: 'shiny', name: 'Shiny Hunter', description: 'Saw the shiny Aaryan on the main menu.', hidden: true, hint: 'Very rarely, things look… different.', tier: 'gold' },
  { id: 'rare-encounter', name: 'Rare Encounter', description: 'Met the wild AARYAN in the Pokédex.', hidden: true, hint: 'Something lurks in the tall grass of the Pokédex.', tier: 'silver' },
  { id: 'old-school', name: 'Old School', description: 'Entered the classic cheat code.', hidden: true, hint: '↑ ↑ ↓ ↓ …', tier: 'silver' },
  { id: 'night-owl', name: 'Night Owl', description: 'Visited between midnight and 5am.', hidden: true, hint: 'Come back when it’s very late.', tier: 'bronze' },
] as const satisfies readonly Medal[]

export type MedalId = (typeof medals)[number]['id']

/** Main-menu sections that count towards "Pokédex Researcher". */
export const researchSections = ['profile', 'pokedex', 'card', 'pc', 'album', 'battle', 'pager', 'settings'] as const
