/**
 * Avatar option lists — single source of truth for the sprite renderer (src/sprites/character.ts)
 * and the `save-trainer` Edge Function's validation. Plain TS, no runtime deps.
 */
export const SKIN_IDS = ['porcelain', 'light', 'tan', 'brown', 'deep', 'dark'] as const
export const HAIR_COLOUR_IDS = ['black', 'darkBrown', 'brown', 'auburn', 'blonde', 'platinum', 'blue', 'pink'] as const
export const CLOTH_COLOUR_IDS = ['white', 'black', 'grey', 'red', 'maroon', 'brown', 'navy', 'blue', 'teal', 'green', 'yellow', 'lavender', 'pink', 'orange', 'tan'] as const
export const EYE_COLOUR_IDS = ['brown', 'dark', 'blue', 'green'] as const
export const HAIR_STYLES = ['wavy', 'mullet', 'curtains', 'short', 'spiky', 'curly', 'long', 'bun', 'buzz'] as const
export const EYE_STYLES = ['soft', 'round', 'sharp', 'wide'] as const
export const FACES = ['smile', 'grin', 'smirk', 'calm'] as const
/** splash = tee with paint-powder splashes; shirt = collared shirt + tie; suit = blazer over a dark shirt + tie; school = piped blazer + tie. */
export const TOPS = ['tee', 'splash', 'jersey', 'hoodie', 'jacket', 'shirt', 'blazer', 'suit', 'school', 'tank'] as const
export const HATS = ['none', 'cap', 'beanie', 'bucket', 'headband'] as const
export const BOTTOMS = ['joggers', 'jeans', 'shorts', 'skirt', 'slacks'] as const
export const SHOES = ['sneakers', 'boots', 'formal'] as const
export const ACCESSORIES = ['glasses', 'sunglasses', 'chain', 'earring', 'watch', 'bracelet', 'beltchain', 'bag', 'headphones', 'scarf'] as const
export const MAX_ACCESSORIES = 3

/** Creatures a visitor can have in their party. */
export const PARTY_IDS = ['byterat', 'beakerbun', 'riffin', 'gavelion', 'helixor', 'brushfox', 'subwoof', 'strikaroo', 'hootour', 'wicketoad', 'campfly', 'megaphawk', 'stitchick', 'diplomoth', 'datadillo'] as const
export const MAX_PARTY = 3

export interface AppearanceData {
  skin: (typeof SKIN_IDS)[number]
  hair: (typeof HAIR_STYLES)[number]
  hairColour: (typeof HAIR_COLOUR_IDS)[number]
  eyes: (typeof EYE_STYLES)[number]
  eyeColour: (typeof EYE_COLOUR_IDS)[number]
  face: (typeof FACES)[number]
  top: (typeof TOPS)[number]
  topColour: (typeof CLOTH_COLOUR_IDS)[number]
  accentColour: (typeof CLOTH_COLOUR_IDS)[number]
  hat: (typeof HATS)[number]
  hatColour: (typeof CLOTH_COLOUR_IDS)[number]
  bottom: (typeof BOTTOMS)[number]
  bottomColour: (typeof CLOTH_COLOUR_IDS)[number]
  shoes: (typeof SHOES)[number]
  shoeColour: (typeof CLOTH_COLOUR_IDS)[number]
  accessories: Array<(typeof ACCESSORIES)[number]>
  /**
   * A reward pinned to the chest: 'champion' for beating the Champion on the tower's top floor.
   * Optional, and dropped (never rejected) when it's anything else, so older saves and older
   * clients still parse. The server can't check it was earned: tower progress lives only in the
   * visitor's browser, so this is honour-system cosmetics, like the rest of the look.
   */
  badge?: 'champion'
}

const FIELDS: Array<[keyof AppearanceData, readonly string[]]> = [
  ['skin', SKIN_IDS],
  ['hair', HAIR_STYLES],
  ['hairColour', HAIR_COLOUR_IDS],
  ['eyes', EYE_STYLES],
  ['eyeColour', EYE_COLOUR_IDS],
  ['face', FACES],
  ['top', TOPS],
  ['topColour', CLOTH_COLOUR_IDS],
  ['accentColour', CLOTH_COLOUR_IDS],
  ['hat', HATS],
  ['hatColour', CLOTH_COLOUR_IDS],
  ['bottom', BOTTOMS],
  ['bottomColour', CLOTH_COLOUR_IDS],
  ['shoes', SHOES],
  ['shoeColour', CLOTH_COLOUR_IDS],
]

/** Returns a clean copy, or null if anything is outside the allowed options. */
export function parseAppearance(input: unknown): AppearanceData | null {
  if (!input || typeof input !== 'object') return null
  const src = input as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, allowed] of FIELDS) {
    if (typeof src[k] !== 'string' || !allowed.includes(src[k] as string)) return null
    out[k] = src[k]
  }
  const acc = src.accessories
  if (!Array.isArray(acc) || acc.length > MAX_ACCESSORIES) return null
  const uniq = [...new Set(acc)]
  if (!uniq.every((x) => typeof x === 'string' && (ACCESSORIES as readonly string[]).includes(x))) return null
  out.accessories = uniq
  if (src.badge === 'champion') out.badge = 'champion'
  return out as unknown as AppearanceData
}

export function parseParty(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_PARTY) return null
  const uniq = [...new Set(input)]
  return uniq.every((x) => typeof x === 'string' && (PARTY_IDS as readonly string[]).includes(x)) ? (uniq as string[]) : null
}
