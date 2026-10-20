/**
 * Sprite settings and the asset manifest.
 *
 * Every sprite on the site is drawn in code (see docs/SPRITES.md), so nothing here is required.
 * To swap in hand-drawn art later, put a PNG in public/assets/… and fill in its path below —
 * the game uses it instead of the generated sprite, and falls back if the file can't load.
 * Keep transparent backgrounds and the sizes noted (they're the generated sprites' sizes, so
 * the art lines up with platforms, VS bands and the map).
 */

export interface SpriteOverride {
  /** e.g. '/assets/trainer/portraits/aaryan-vs.png' */
  src: string
  /** Size of one frame in pixels; drawn at whole-number multiples of this. */
  width: number
  height: number
}

export const spriteOverrides: {
  /** Aaryan, front, standing (80×120). Main menu, Trainer Card, battles. */
  aaryanFront: SpriteOverride | null
  /** Aaryan's VS-screen pose (80×120, facing right — it is mirrored on the VS screen). */
  aaryanPortrait: SpriteOverride | null
  /** Creatures by id (80×80, facing left). */
  creatures: Record<string, SpriteOverride>
} = {
  aaryanFront: null,
  aaryanPortrait: null,
  creatures: {},
}

/** Chance (1 in N) that the main-menu sprite appears in its shiny colours. */
export const shinyOdds = 128
