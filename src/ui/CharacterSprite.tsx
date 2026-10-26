import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { atResolution, CHAR_H, CHAR_W, flatten, LAYER_ORDER, paletteFor, PORTRAIT, renderBack, renderHeldLayer, renderLayers, renderSide, type Appearance, type ArmPose, type CharacterLayers, type PoseFrame } from '../sprites/character'
import { GESTURES, type GestureId } from '../sprites/gestures'
import { useGestures } from './useGestures'
import { crop, hexToRgba, type Pixels } from '../sprites/pixels'
import { pixelsToDataUrl } from '../sprites/render'
import { useSettings } from '../systems/settings'
import { overrideUrl } from '../sprites/assets'
import type { AssetSlot } from '../content/sprites'
import { useAssetLoads } from './useAssets'

/*
 * Cache rendered layers per appearance + pose (+ resolution) so re-renders are free. Sprites shown
 * at an even scale use the 2× rasterisation: same design, twice the pixels, finer outlines.
 */
const cache = new Map<string, { layers: CharacterLayers; palette: ReturnType<typeof paletteFor> }>()
function layersFor(a: Appearance, pose: ArmPose, hi = false) {
  const key = JSON.stringify(a) + pose + hi
  let hit = cache.get(key)
  if (!hit) {
    hit = { layers: atResolution(hi ? 2 : 1, () => renderLayers(a, pose)), palette: paletteFor(a) }
    cache.set(key, hit)
  }
  return hit
}
/*
 * A gesture frame is drawn as one picture of the whole upper body (back hair, torso, both arms,
 * head, anything held), cached per frame and painted onto a single canvas synchronously. Swapping
 * the sources of several <img> layers instead let the browser decode them a frame apart (a part
 * blinking out for a frame) and gave a held thing its own breathing clock, a pixel off the face.
 */
const frameCache = new Map<string, HTMLCanvasElement>()
const UPPER: Array<keyof CharacterLayers> = ['hairBack', 'torso', 'armBack', 'armFront', 'head']
function frameCanvas(a: Appearance, f: PoseFrame, hi: boolean, blink: boolean, palette: ReturnType<typeof paletteFor>): HTMLCanvasElement {
  const pose: PoseFrame = blink && !f.eyes ? { ...f, eyes: 'closed' } : f
  const key = JSON.stringify(a) + JSON.stringify(pose) + hi
  let cv = frameCache.get(key)
  if (cv) return cv
  const px = atResolution(hi ? 2 : 1, () => {
    const l = renderLayers(a, 'idle', pose)
    const parts = UPPER.map((n) => l[n])
    return flatten(pose.held ? [...parts, renderHeldLayer(a, pose.held)] : parts)
  })
  cv = document.createElement('canvas')
  cv.width = px[0].length
  cv.height = px.length
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(cv.width, cv.height)
  px.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.') img.data.set(hexToRgba(palette[ch]), (y * cv!.width + x) * 4)
    }),
  )
  ctx.putImageData(img, 0, 0)
  frameCache.set(key, cv)
  return cv
}

/**
 * Every breathing layer runs on one clock (the page's), not from when its element mounted, so a
 * layer added later (a gesture's canvas) bobs in step with the rest and starting or ending a
 * gesture never jumps a pixel. A negative delay of "now mod the period" at mount does it.
 */
const BREATH_MS = 1600
function useBreathPhase() {
  const [delay] = useState(() => `-${Math.round(performance.now() % BREATH_MS)}ms`)
  return delay
}

/** The upper body in a gesture frame: one canvas, redrawn in step with React's commit. */
function GestureCanvas({ frame, w, h, cls }: { frame: HTMLCanvasElement; w: number; h: number; cls: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const delay = useBreathPhase()
  useLayoutEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    if (c.width !== frame.width) c.width = frame.width
    if (c.height !== frame.height) c.height = frame.height
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.drawImage(frame, 0, 0)
  }, [frame])
  return <canvas ref={ref} aria-hidden className={`pixelated absolute inset-0 ${cls}`} style={{ width: w, height: h, animationDelay: delay }} />
}

const portraitCache = new Map<string, Pixels>()
export function portraitPixels(a: Appearance, hi = false): Pixels {
  const key = JSON.stringify(a) + hi
  let p = portraitCache.get(key)
  if (!p) {
    const { layers } = layersFor(a, 'idle', hi)
    const k = hi ? 2 : 1
    p = crop(flatten(LAYER_ORDER.map((n) => layers[n])), PORTRAIT.x * k, PORTRAIT.y * k, PORTRAIT.w * k, PORTRAIT.h * k)
    portraitCache.set(key, p)
  }
  return p
}

const dpr = () => (typeof window !== 'undefined' && window.devicePixelRatio) || 1
const whole = (v: number) => Math.abs(v - Math.round(v)) < 1e-6

/**
 * The largest scale up to `px` at which every art pixel still covers a whole number of *device*
 * pixels: whole numbers on standard screens, half steps on 2× screens, and so on. Sprites can
 * then be sized to their space without the big jumps of whole-number CSS scaling, and stay crisp.
 */
export function crispScale(px: number): number {
  const d = dpr()
  return Math.max(1, Math.floor(px * d + 1e-6) / d)
}

function useFitScale(fill: number | undefined, units: number, ref: React.RefObject<HTMLElement | null>) {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    if (!fill || !parent) return
    const measure = () => setScale(crispScale((parent.clientHeight * fill) / units))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [fill, units, ref])
  return scale
}

/**
 * idle / victory / point face the viewer; side is the profile (facing right; mirror it for left);
 * back and throw show the trainer from behind (battle start).
 */
export type CharacterPose = 'idle' | 'victory' | 'point' | 'portrait' | 'side' | 'back' | 'throw'
type FlatPose = 'side' | 'back' | 'throw'

const flatCache = new Map<string, string>()
function flatUrl(a: Appearance, pose: FlatPose, hi: boolean) {
  const key = JSON.stringify(a) + pose + hi
  let url = flatCache.get(key)
  if (!url) {
    const px = atResolution(hi ? 2 : 1, () => (pose === 'side' ? renderSide(a) : renderBack(a, pose === 'throw')))
    flatCache.set(key, (url = pixelsToDataUrl(px, paletteFor(a))))
  }
  return url
}

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
  /** Idle gestures (main menu): occasional hair ruffles, pocket checks, waves… between breaths. */
  gestures?: boolean
  /** Ask for a specific gesture now (e.g. wave when tapped); change `key` to ask again. */
  gestureTrigger?: { id: GestureId; key: number }
  /** Hold this pose (the VS screen's wind-ups and strikes): the standing sprite's arms and face posed by a PoseFrame. */
  frame?: PoseFrame
  className?: string
  style?: CSSProperties
  alt: string
}

/**
 * Black/White-style animated character: each body part is its own layer with a small looping
 * motion (breathing, head bob, hair sway, arm sway) plus random blinks.
 */
const SLOT_FOR: Partial<Record<CharacterPose, AssetSlot>> = { idle: 'aaryan.front', point: 'aaryan.vs', victory: 'aaryan.victory', portrait: 'aaryan.portrait' }

export function CharacterSprite({ appearance, pose = 'idle', scale: fixed, fill, still = false, nod = false, gestures = false, gestureTrigger, frame: heldFrame, className = '', style, alt }: Props) {
  const { reducedMotion } = useSettings()
  useAssetLoads()
  const slot = SLOT_FOR[pose]
  const handDrawn = slot ? overrideUrl(appearance, slot) : null
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

  // use the 2× art when its pixels land on whole device pixels; otherwise the 1× art (which does,
  // since scales are chosen by crispScale)
  const hi = whole((scale * dpr()) / 2)
  const { layers, palette } = layersFor(appearance, pose === 'victory' ? 'raised' : pose === 'point' ? 'point' : 'idle', hi)
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
  const portraitUrl = useMemo(() => (isPortrait ? pixelsToDataUrl(portraitPixels(appearance, hi), palette) : ''), [isPortrait, appearance, palette, hi])

  // idle gestures: only for the standing pose, never with reduced motion
  const gesturing = gestures && animate && pose === 'idle' && !handDrawn && !heldFrame
  const gestureNow = useGestures(gesturing, gestureTrigger)
  const frame = pose === 'idle' && heldFrame ? heldFrame : gestureNow
  // warm the cache with every gesture frame in idle time, so the first gesture plays smoothly
  useEffect(() => {
    if (!gesturing) return
    const todo = Object.values(GESTURES).flatMap((g) => g.map((f) => f.frame))
    let i = 0
    let handle = 0
    const step = () => {
      const end = Math.min(todo.length, i + 3)
      for (; i < end; i++) frameCanvas(appearance, todo[i], hi, false, palette)
      if (i < todo.length) handle = window.setTimeout(step, 30)
    }
    handle = window.setTimeout(step, 400)
    return () => window.clearTimeout(handle)
  }, [gesturing, appearance, hi, palette])
  const gestureFrame = frame ? frameCanvas(appearance, frame, hi, blink, palette) : null
  const breath = useBreathPhase()

  if (isPortrait) {
    return (
      <div ref={ref} className={className} style={{ width: PORTRAIT.w * scale, height: PORTRAIT.h * scale, ...style }}>
        <img src={handDrawn ?? portraitUrl} width={PORTRAIT.w * scale} height={PORTRAIT.h * scale} alt={alt} draggable={false} className="pixelated block" />
      </div>
    )
  }

  const w = CHAR_W * scale
  const h = CHAR_H * scale
  if (handDrawn) {
    // a hand-drawn replacement from public/assets/ (drawn at 1× or a whole multiple; shown in the same box)
    return (
      <div ref={ref} role="img" aria-label={alt} className={`relative ${className}`} style={{ width: w, height: h, ...style }}>
        <img src={handDrawn} width={w} height={h} alt="" aria-hidden draggable={false} className={`pixelated absolute inset-0 ${animate ? (nod ? 'bw-nod' : pose === 'victory' ? '' : 'bw-breathe') : ''}`} />
      </div>
    )
  }
  if (pose === 'back' || pose === 'throw' || pose === 'side') {
    return (
      <div ref={ref} role="img" aria-label={alt} className={`relative ${className}`} style={{ width: w, height: h, ['--px' as string]: `${scale}px`, ...style }}>
        <img src={flatUrl(appearance, pose, hi)} width={w} height={h} alt="" aria-hidden draggable={false} className={`pixelated absolute inset-0 ${animate ? 'bw-breathe' : ''}`} />
      </div>
    )
  }
  const layer = (src: string, cls: string) => <img src={src} width={w} height={h} alt="" aria-hidden draggable={false} className={`pixelated absolute inset-0 ${animate ? cls : ''}`} style={{ animationDelay: breath }} />

  return (
    <div ref={ref} role="img" aria-label={alt} className={`relative ${className}`} style={{ width: w, height: h, ['--px' as string]: `${scale}px`, ...style }}>
      {gestureFrame ? (
        <>
          {/* mid-gesture: the planted legs, and the whole upper body as one frame (it breathes as one piece) */}
          {layer(urls.legs, '')}
          <GestureCanvas frame={gestureFrame} w={w} h={h} cls={animate ? 'bw-breathe' : ''} />
        </>
      ) : (
        <>
          {layer(urls.hairBack, nod ? 'bw-nod' : 'bw-hair')}
          {layer(urls.legs, '')}
          {layer(urls.torso, 'bw-breathe')}
          {layer(urls.armBack, 'bw-arm-a')}
          {layer(urls.armFront, pose === 'victory' ? 'bw-pump' : pose === 'point' ? '' : 'bw-breathe')}
          {layer(blink ? urls.headBlink : urls.head, nod ? 'bw-nod' : 'bw-head')}
        </>
      )}
    </div>
  )
}
