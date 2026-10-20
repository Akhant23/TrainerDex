/**
 * Which art to use for the trainer sprite.
 *
 * `null` = use the built-in pixel-art prototype (src/sprites/trainerData.ts).
 * To swap in your own art, drop a PNG sprite sheet in public/sprites/ and fill the entry in.
 * Frames are laid out left-to-right in one row. See docs/SPRITES.md.
 */
export interface SpriteSheet {
  src: string
  frameWidth: number
  frameHeight: number
  /** Number of frames in the row (1 = still image). */
  frames: number
  /** Animation speed in frames per second. */
  fps: number
}

export const spriteSources: Record<'front' | 'back' | 'victory' | 'portrait', SpriteSheet | null> = {
  front: null, // e.g. { src: '/sprites/trainer-front.png', frameWidth: 32, frameHeight: 48, frames: 2, fps: 2 }
  back: null,
  victory: null,
  portrait: null,
}

/** Chance (1 in N) that the main-menu sprite appears in its shiny colours. */
export const shinyOdds = 128
