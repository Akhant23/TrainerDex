import { useMemo } from 'react'
import { icons, iconPalette, type IconName } from '../sprites/icons'
import { pixelsToDataUrl } from '../sprites/render'

/** A 16×16 icon drawn at an integer scale. Decorative by default (pass `label` to expose it). */
export function PixelIcon({ name, scale = 2, label, className = '' }: { name: IconName; scale?: number; label?: string; className?: string }) {
  const src = useMemo(() => pixelsToDataUrl(icons[name], iconPalette), [name])
  const size = 16 * scale
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={`pixelated inline-block shrink-0 ${className}`}
    />
  )
}
