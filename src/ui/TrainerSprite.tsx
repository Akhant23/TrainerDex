import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { trainerFrames, trainerPalette, shinyPalette } from '../sprites/trainerData'
import { pixelsToDataUrl } from '../sprites/render'
import { spriteSources, type SpriteSheet } from '../content/sprites'
import { useSettings } from '../systems/settings'

export type Pose = 'idle' | 'victory' | 'back' | 'portrait'

interface Props {
  pose?: Pose
  shiny?: boolean
  /** Fixed integer scale… */
  scale?: number
  /** …or fill this fraction of the parent's height, rounded down to an integer scale. */
  fill?: number
  className?: string
  style?: CSSProperties
  alt?: string
}

const sourceKey: Record<Pose, keyof typeof spriteSources> = {
  idle: 'front',
  victory: 'victory',
  back: 'back',
  portrait: 'portrait',
}

/** Measures the parent and returns the largest integer scale that fits `fill` of its height. */
function useFitScale(fill: number | undefined, frameHeight: number, ref: React.RefObject<HTMLElement | null>) {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    if (!fill || !parent) return
    const measure = () => setScale(Math.max(1, Math.floor((parent.clientHeight * fill) / frameHeight)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [fill, frameHeight, ref])
  return scale
}

/**
 * Aaryan's trainer sprite. Uses the built-in pixel prototype unless a sprite sheet is
 * configured in src/content/sprites.ts. Idle pose bobs and blinks on its own.
 */
export function TrainerSprite({ pose = 'idle', shiny = false, scale: fixedScale, fill, className = '', style, alt = 'Pixel-art sprite of Aaryan' }: Props) {
  const { reducedMotion } = useSettings()
  const sheet: SpriteSheet | null = spriteSources[sourceKey[pose]]
  const ref = useRef<HTMLDivElement>(null)

  const builtIn = pose === 'idle' ? trainerFrames.idle : trainerFrames[pose]
  const frameW = sheet?.frameWidth ?? builtIn[0][0].length
  const frameH = sheet?.frameHeight ?? builtIn[0].length
  const fitScale = useFitScale(fill, frameH, ref)
  const scale = fixedScale ?? (fill ? fitScale : 3)

  const [frame, setFrame] = useState(0)
  const [blinking, setBlinking] = useState(false)
  const frameCount = sheet ? sheet.frames : builtIn.length
  const fps = sheet ? sheet.fps : 1.6

  // frame animation
  useEffect(() => {
    if (reducedMotion || frameCount < 2) return
    const id = window.setInterval(() => setFrame((f) => (f + 1) % frameCount), 1000 / fps)
    return () => window.clearInterval(id)
  }, [reducedMotion, frameCount, fps])

  // blink every few seconds (built-in idle only)
  useEffect(() => {
    if (sheet || pose !== 'idle') return
    let t: number
    const schedule = () => {
      t = window.setTimeout(() => {
        setBlinking(true)
        t = window.setTimeout(() => {
          setBlinking(false)
          schedule()
        }, 140)
      }, 2400 + Math.random() * 2600)
    }
    schedule()
    return () => window.clearTimeout(t)
  }, [sheet, pose])

  const palette = shiny ? shinyPalette : trainerPalette
  const urls = useMemo(
    () => (sheet ? [] : [...builtIn.map((f) => pixelsToDataUrl(f, palette)), pixelsToDataUrl(trainerFrames.blink[0], palette)]),
    [sheet, builtIn, palette],
  )

  const w = frameW * scale
  const h = frameH * scale
  const f = frame % frameCount

  if (sheet) {
    return (
      <div
        ref={ref}
        role="img"
        aria-label={alt}
        className={`pixelated ${className}`}
        style={{
          width: w,
          height: h,
          backgroundImage: `url(${sheet.src})`,
          backgroundSize: `${sheet.frameWidth * sheet.frames * scale}px ${h}px`,
          backgroundPosition: `${-f * w}px 0`,
          filter: shiny ? 'hue-rotate(180deg) saturate(1.3)' : undefined,
          ...style,
        }}
      />
    )
  }

  const src = blinking && f === 0 ? urls[urls.length - 1] : urls[f]
  return (
    <div ref={ref} className={className} style={{ width: w, height: h, ...style }}>
      <img src={src} width={w} height={h} alt={alt} draggable={false} className="pixelated block select-none" />
    </div>
  )
}
