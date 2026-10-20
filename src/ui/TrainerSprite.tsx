import type { CSSProperties } from 'react'
import { shinySignature, signature } from '../content/aaryan'
import type { Appearance } from '../sprites/character'
import { CharacterSprite, type CharacterPose } from './CharacterSprite'
import { OverrideSprite } from './OverrideSprite'
import { spriteOverrides } from '../content/sprites'

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
  const sprite = <CharacterSprite appearance={look ?? (shiny ? shinySignature : signature)} pose={pose} scale={scale} fill={fill} still={still} className={className} style={style} alt={alt} />
  // hand-drawn replacements apply to Aaryan's everyday look only
  const art = look || shiny ? null : pose === 'idle' ? spriteOverrides.aaryanFront : pose === 'point' ? spriteOverrides.aaryanPortrait : null
  return <OverrideSprite art={art} scale={scale ?? 2} alt={alt} className={className} style={style} fallback={sprite} />
}
