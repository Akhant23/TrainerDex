import { paletteFor, type Appearance } from '../sprites/character'
import { crop } from '../sprites/pixels'
import { portraitPixels } from './CharacterSprite'
import { PixelArt } from './PixelArt'

const heads = new Map<string, ReturnType<typeof crop>>()
function headPixels(look: Appearance) {
  const key = JSON.stringify(look)
  let h = heads.get(key)
  if (!h) heads.set(key, (h = crop(portraitPixels(look), 6, 2, 28, 30)))
  return h
}

/** A trainer's head and shoulders (28×30 art) at a whole-pixel scale: avatars in the Pager, the player's badge on the menu. */
export function TrainerHead({ look, scale = 1, className = '' }: { look: Appearance; scale?: number; className?: string }) {
  return <PixelArt pixels={headPixels(look)} palette={paletteFor(look)} scale={scale} className={className} />
}
