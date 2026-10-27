import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { HAB_H, HAB_W } from '../sprites/habitat-kit'
import { useSettings } from '../systems/settings'

/**
 * The largest scale that fits and lands on whole device pixels, so every art pixel is the same
 * size (no shimmer or blur); below 1:1 (a very narrow phone) it still fits, on device pixels.
 */
function fitScale(w: number, h: number): number {
  const d = window.devicePixelRatio || 1
  const fit = Math.min(w / HAB_W, h / HAB_H)
  return Math.max(1 / d, Math.floor(fit * d + 1e-6) / d)
}

/** Painted frames, cached by key: a scene's frame is drawn once and reused. */
const cache = new Map<string, ImageData>()

/**
 * A 256×192 painted scene (a Pokédex habitat, an encounter): crisp at the largest scale that
 * fits, its frames of motion cycling every `ms` (held on frame `rest` with reduced motion or when
 * `still`). `id` names the scene for the frame cache; `paint(frame)` returns its RGBA pixels.
 */
export function PaintedScene({
  id,
  frames,
  paint,
  alt,
  ms = 560,
  rest = 0,
  still = false,
  className = '',
  style,
  children,
}: {
  id: string
  frames: number
  paint: (frame: number) => Uint8ClampedArray
  alt: string
  /** how long each frame shows */
  ms?: number
  /** the frame that stands for the scene when it isn't moving */
  rest?: number
  still?: boolean
  className?: string
  style?: CSSProperties
  /** drawn over the scene (centred) */
  children?: ReactNode
}) {
  const { reducedMotion } = useSettings()
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(1)
  const [tick, setTick] = useState(0)
  const moving = !reducedMotion && !still && frames > 1
  const frame = moving ? tick % frames : rest

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => setScale(fitScale(el.clientWidth, el.clientHeight))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // (a new scene remounts this, from frame 0: the caller keys it by scene)
  useEffect(() => {
    if (!moving) return
    const t = window.setInterval(() => setTick((f) => (f + 1) % frames), ms)
    return () => window.clearInterval(t)
  }, [id, frames, ms, moving])

  useEffect(() => {
    const key = `${id}:${frame}`
    let img = cache.get(key)
    if (!img) cache.set(key, (img = new ImageData(paint(frame) as Uint8ClampedArray<ArrayBuffer>, HAB_W, HAB_H)))
    canvas.current?.getContext('2d')?.putImageData(img, 0, 0)
  }, [id, frame, paint])

  return (
    <div ref={wrap} className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <canvas ref={canvas} width={HAB_W} height={HAB_H} role="img" aria-label={alt} className="pixelated block" style={{ width: HAB_W * scale, height: HAB_H * scale, ...style }} />
      {children}
    </div>
  )
}
