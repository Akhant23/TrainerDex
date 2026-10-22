import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { HABITATS, HAB_H, HAB_W, paintHabitat, type HabitatId } from '../sprites/habitats'
import { useSettings } from '../systems/settings'

/** Painted frames, cached: a habitat is drawn once per frame and reused. */
const frames = new Map<string, ImageData>()
function frameImage(id: HabitatId, frame: number): ImageData {
  const key = `${id}:${frame}`
  let img = frames.get(key)
  if (!img) frames.set(key, (img = new ImageData(paintHabitat(id, frame).toRGBA() as Uint8ClampedArray<ArrayBuffer>, HAB_W, HAB_H)))
  return img
}

/**
 * The largest scale that fits and lands on whole device pixels, so every art pixel is the same
 * size (no shimmer or blur); below 1:1 (a very narrow phone) it still fits, on device pixels.
 */
function fitScale(w: number, h: number): number {
  const d = window.devicePixelRatio || 1
  const fit = Math.min(w / HAB_W, h / HAB_H)
  return Math.max(1 / d, Math.floor(fit * d + 1e-6) / d)
}

/**
 * A Pokédex habitat window: the entry's scene (sprites/habitats.ts), crisp at the largest scale
 * that fits, with its few frames of quiet motion cycling slowly (still with reduced motion). An
 * entry not yet seen shows its habitat in darkness.
 */
export function DexHabitat({ id, seen = true, className = '' }: { id: HabitatId; seen?: boolean; className?: string }) {
  const { reducedMotion } = useSettings()
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(1)
  const [frame, setFrame] = useState(0)
  const hab = HABITATS[id]

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => setScale(fitScale(el.clientWidth, el.clientHeight))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // (a new habitat remounts this, from frame 0: the caller keys it by habitat)
  useEffect(() => {
    if (reducedMotion || !seen || hab.frames < 2) return
    const t = window.setInterval(() => setFrame((f) => (f + 1) % hab.frames), 560)
    return () => window.clearInterval(t)
  }, [id, hab.frames, reducedMotion, seen])

  useEffect(() => {
    canvas.current?.getContext('2d')?.putImageData(frameImage(id, frame), 0, 0)
  }, [id, frame])

  return (
    <div ref={wrap} className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <canvas
        ref={canvas}
        width={HAB_W}
        height={HAB_H}
        role="img"
        aria-label={seen ? hab.alt : 'An unknown habitat: this entry hasn’t been seen yet.'}
        className="pixelated block"
        style={{ width: HAB_W * scale, height: HAB_H * scale, filter: seen ? undefined : 'brightness(0.08) saturate(0)' }}
      />
      {!seen && (
        <span aria-hidden className="font-display text-outline absolute text-[clamp(28px,9cqi,64px)] text-paper">
          ?
        </span>
      )}
    </div>
  )
}
