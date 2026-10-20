import type { CSSProperties } from 'react'
import { shinySignature, signature } from '../content/aaryan'
import type { Appearance } from '../sprites/character'
import { CharacterSprite, type CharacterPose } from './CharacterSprite'

export type Pose = CharacterPose

/** Aaryan's sprite (signature look unless another stage's look is passed). */
export function TrainerSprite({
  pose = 'idle',
  shiny = false,
  look,
  scale,
  fill,
  still,
  className = '',
  style,
  alt = 'Pixel-art sprite of Aaryan',
}: {
  pose?: Pose
  shiny?: boolean
  look?: Appearance
  scale?: number
  fill?: number
  still?: boolean
  className?: string
  style?: CSSProperties
  alt?: string
}) {
  // hand-drawn replacements from public/assets/ apply to the everyday look (see src/content/sprites.ts)
  return <CharacterSprite appearance={look ?? (shiny ? shinySignature : signature)} pose={pose} scale={scale} fill={fill} still={still} className={className} style={style} alt={alt} />
}
