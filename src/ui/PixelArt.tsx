import { useMemo, type CSSProperties } from 'react'
import type { Palette, Pixels } from '../sprites/pixels'
import { pixelsToDataUrl } from '../sprites/render'
import { badges } from '../content/badges'
import { icons, iconPalette } from '../sprites/icons'
import type { DexArt } from '../content/pokedex'

/** Any pixel matrix at an integer scale. Decorative unless `label` is given. */
export function PixelArt({ pixels, palette, scale = 2, label, className = '', style }: { pixels: Pixels; palette: Palette; scale?: number; label?: string; className?: string; style?: CSSProperties }) {
  const src = useMemo(() => pixelsToDataUrl(pixels, palette), [pixels, palette])
  const w = (pixels[0]?.length ?? 0) * scale
  const h = pixels.length * scale
  return (
    <img
      src={src}
      width={w}
      height={h}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={`pixelated inline-block shrink-0 ${className}`}
      style={style}
    />
  )
}

/** Art for a Pokédex entry: an icon or a badge. */
export function DexArtView({ art, scale = 2, className = '' }: { art: DexArt; scale?: number; className?: string }) {
  if (art.kind === 'icon') return <PixelArt pixels={icons[art.name]} palette={iconPalette} scale={scale} className={className} />
  const b = badges.find((x) => x.id === art.id)
  return b ? <PixelArt pixels={b.pixels} palette={b.palette} scale={scale} className={className} /> : null
}
