import { useState, type CSSProperties, type ReactNode } from 'react'
import type { SpriteOverride } from '../content/sprites'

/**
 * Shows a hand-made sprite from the asset manifest (src/content/sprites.ts) at a whole-number
 * scale, falling back to the generated sprite if there's no override or the file fails to load.
 */
export function OverrideSprite({ art, scale, alt, flip = false, className = '', style, fallback }: { art: SpriteOverride | null | undefined; scale: number; alt: string; flip?: boolean; className?: string; style?: CSSProperties; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false)
  if (!art || failed) return <>{fallback}</>
  return (
    <img
      src={art.src}
      width={art.width * scale}
      height={art.height * scale}
      alt={alt}
      draggable={false}
      onError={() => setFailed(true)}
      className={`pixelated block ${flip ? 'flip' : ''} ${className}`}
      style={style}
    />
  )
}
