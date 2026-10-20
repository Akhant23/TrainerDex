import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { CHAR_H, CHAR_W, flatten, LAYER_ORDER, paletteFor, PORTRAIT, renderLayers, type Appearance, type ArmPose, type CharacterLayers } from '../sprites/character'
import { crop, type Pixels } from '../sprites/pixels'
import { pixelsToDataUrl } from '../sprites/render'
import { useSettings } from '../systems/settings'

/* Cache rendered layers per appearance + pose so re-renders are free. */
const cache = new Map<string, { layers: CharacterLayers; palette: ReturnType<typeof paletteFor> }>()
function layersFor(a: Appearance, pose: ArmPose) {
  const key = JSON.stringify(a) + pose
  let hit = cache.get(key)
  if (!hit) {
    hit = { layers: renderLayers(a, pose), palette: paletteFor(a) }
    cache.set(key, hit)
  }
  return hit
}
const portraitCache = new Map<string, Pixels>()
export function portraitPixels(a: Appearance): Pixels {
  const key = JSON.stringify(a)
  let p = portraitCache.get(key)
  if (!p) {
    const { layers } = layersFor(a, 'idle')
    p = crop(flatten(LAYER_ORDER.map((k) => layers[k])), PORTRAIT.x, PORTRAIT.y, PORTRAIT.w, PORTRAIT.h)
    portraitCache.set(key, p)
  }
  return p
}

function useFitScale(fill: number | undefined, units: number, ref: React.RefObject<HTMLElement | null>) {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    if (!fill || !parent) return
    const measure = () => setScale(Math.max(1, Math.floor((parent.clientHeight * fill) / units)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [fill, units, ref])
  return scale
}

export type CharacterPose = 'idle' | 'victory' | 'portrait'

interface Props {
  appearance: Appearance
  pose?: CharacterPose
  /** Fixed integer scale… */
  scale?: number
  /** …or fill this fraction of the parent's height (integer-scaled). */
  fill?: number
  /** Turn off idle animation (thumbnails, lists). */
  still?: boolean
  /** Nod (head and hair dip twice) — the BW battle-intro greeting. */
  nod?: boolean
  className?: string
  style?: CSSProperties
  alt: string
}

/**
 * Black/White-style animated character: each body part is its own layer with a small looping
 * motion (breathing, head bob, hair sway, arm sway) plus random blinks.
 */
export function CharacterSprite({ appearance, pose = 'idle', scale: fixed, fill, still = false, nod = false, className = '', style, alt }: Props) {
  const { reducedMotion } = useSettings()
  const ref = useRef<HTMLDivElement>(null)
  const isPortrait = pose === 'portrait'
  const fitScale = useFitScale(fill, isPortrait ? PORTRAIT.h : CHAR_H, ref)
  const scale = fixed ?? (fill ? fitScale : 2)
  const [blink, setBlink] = useState(false)
  const animate = !still && !reducedMotion && !isPortrait

  useEffect(() => {
    if (!animate) return
    let t: number
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true)
        t = window.setTimeout(() => {
          setBlink(false)
          loop()
        }, 130)
      }, 2200 + Math.random() * 2800)
    }
    loop()
    return () => window.clearTimeout(t)
  }, [animate])

  const { layers, palette } = layersFor(appearance, pose === 'victory' ? 'raised' : 'idle')
  const urls = useMemo(
    () => ({
      hairBack: pixelsToDataUrl(layers.hairBack, palette),
      legs: pixelsToDataUrl(layers.legs, palette),
      torso: pixelsToDataUrl(layers.torso, palette),
      armBack: pixelsToDataUrl(layers.armBack, palette),
      armFront: pixelsToDataUrl(layers.armFront, palette),
      head: pixelsToDataUrl(layers.head, palette),
      headBlink: pixelsToDataUrl(layers.headBlink, palette),
    }),
    [layers, palette],
  )
  const portraitUrl = useMemo(() => (isPortrait ? pixelsToDataUrl(portraitPixels(appearance), palette) : ''), [isPortrait, appearance, palette])

  if (isPortrait) {
    return (
      <div ref={ref} className={className} style={{ width: PORTRAIT.w * scale, height: PORTRAIT.h * scale, ...style }}>
        <img src={portraitUrl} width={PORTRAIT.w * scale} height={PORTRAIT.h * scale} alt={alt} draggable={false} className="pixelated block" />
      </div>
    )
  }

  const w = CHAR_W * scale
  const h = CHAR_H * scale
  const layer = (src: string, cls: string) => <img src={src} width={w} height={h} alt="" aria-hidden draggable={false} className={`pixelated absolute inset-0 ${animate ? cls : ''}`} />

  return (
    <div ref={ref} role="img" aria-label={alt} className={`relative ${className}`} style={{ width: w, height: h, ['--px' as string]: `${scale}px`, ...style }}>
      {layer(urls.hairBack, nod ? 'bw-nod' : 'bw-hair')}
      {layer(urls.legs, '')}
      {layer(urls.torso, 'bw-breathe')}
      {layer(urls.armBack, 'bw-arm-a')}
      {layer(urls.armFront, pose === 'victory' ? 'bw-pump' : 'bw-breathe')}
      {layer(blink ? urls.headBlink : urls.head, nod ? 'bw-nod' : 'bw-head')}
    </div>
  )
}
