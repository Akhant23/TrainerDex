/**
 * Sprite settings and the asset manifest.
 *
 * Every sprite on the site is drawn in code (see docs/SPRITES.md), so nothing here is required.
 * To swap in hand-drawn art: run `npm run sprites:export`, edit the matching PNG from
 * sprites-export/assets/ (or draw a new one at the size below), save it to public/assets/ under
 * the same path, then add its slot id to `enabledAssets` (or the creature id to
 * `enabledCreatures`). The site uses the file instead of the generated sprite, and falls back to
 * the generated one if the file can't load. public/assets/manifest.json is written from this list.
 */

export type AssetSlot = 'aaryan.front' | 'aaryan.vs' | 'aaryan.victory' | 'aaryan.portrait' | 'aaryan.overworld'

export interface AssetSpec {
  /** path under public/ */
  file: string
  use: string
  /** one frame's size in art pixels (the file may be drawn at a whole multiple, e.g. 2× for finer detail, except the overworld sheet) */
  width: number
  height: number
  frames: number
  layout: string
  facing: string
}

export const ASSET_SLOTS: Record<AssetSlot, AssetSpec> = {
  'aaryan.front': {
    file: 'assets/trainer/battle/aaryan-front.png',
    use: 'Aaryan standing (idle pose): main menu, Profile, Battle hub, Champion opponent',
    width: 80,
    height: 120,
    frames: 1,
    layout: 'single frame, feet on the bottom row, body centred',
    facing: 'towards the viewer',
  },
  'aaryan.vs': {
    file: 'assets/trainer/portraits/aaryan-vs.png',
    use: 'VS screen (pointing pose, cropped to a bust by the band)',
    width: 80,
    height: 120,
    frames: 1,
    layout: 'single frame; keep the head and chest in the top half',
    facing: 'towards the viewer, pointing to the right (mirrored when Aaryan is the opponent)',
  },
  'aaryan.victory': {
    file: 'assets/trainer/battle/aaryan-victory.png',
    use: 'Victory pose: Aaryan as Champion after winning a battle',
    width: 80,
    height: 120,
    frames: 1,
    layout: 'single frame',
    facing: 'towards the viewer, fist raised',
  },
  'aaryan.portrait': {
    file: 'assets/trainer/portraits/aaryan-portrait.png',
    use: 'Trainer Card ID photo and message headers',
    width: 40,
    height: 46,
    frames: 1,
    layout: 'single frame, head and shoulders',
    facing: 'towards the viewer',
  },
  'aaryan.overworld': {
    file: 'assets/trainer/overworld/aaryan-walk.png',
    use: 'Aaryan walking on the map (Medal Box room, Champion floor)',
    width: 48,
    height: 64,
    frames: 12,
    layout: 'one row of 12 frames at exactly 48×64 each: down, up, left, right × (stand, step A, step B)',
    facing: 'per frame, as listed',
  },
}

export const CREATURE_SPEC: Omit<AssetSpec, 'file'> & { file: string } = {
  file: 'assets/creatures/<id>.png',
  use: 'A creature in battles, the party screen and following you (by species id)',
  width: 80,
  height: 80,
  frames: 1,
  layout: 'single frame, feet near the bottom',
  facing: 'left (mirrored for your side)',
}

/** Slots that have a finished PNG in public/assets/. Empty = everything is generated. */
export const enabledAssets: AssetSlot[] = []
/** Creature ids that have a finished PNG in public/assets/creatures/. */
export const enabledCreatures: string[] = []

/** Chance (1 in N) that the main-menu sprite appears in its shiny colours. */
export const shinyOdds = 128
