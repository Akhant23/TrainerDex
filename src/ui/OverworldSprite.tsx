import { useEffect, useMemo, useState } from 'react'
import { overworldFor, OW_H, OW_W, OW_WORLD, WALK_CYCLE, type Facing } from '../sprites/overworld'
import { paletteFor, type Appearance } from '../sprites/character'
import { pixelsToDataUrl } from '../sprites/render'
import { signature } from '../content/aaryan'
import { overworldOverride } from '../sprites/assets'
import { useAssetLoads } from './useAssets'

const cache = new Map<string, Record<Facing, string[]>>()
export function overworldUrls(a: Appearance): Record<Facing, string[]> {
  const drawn = overworldOverride(a)
  if (drawn) return Object.fromEntries(Object.entries(drawn).map(([f, cs]) => [f, cs.map((c) => c.toDataURL())])) as Record<Facing, string[]>
  const key = JSON.stringify(a)
  let hit = cache.get(key)
  if (!hit) {
    const frames = overworldFor(a)
    const pal = paletteFor(a)
    hit = {
      down: frames.down.map((f) => pixelsToDataUrl(f, pal)),
      up: frames.up.map((f) => pixelsToDataUrl(f, pal)),
      left: frames.left.map((f) => pixelsToDataUrl(f, pal)),
      right: frames.right.map((f) => pixelsToDataUrl(f, pal)),
    }
    cache.set(key, hit)
  }
  return hit
}

/** A walking overworld character. Cycles the walk frames while `walking`. `scale` is in world pixels (the art is drawn at twice that resolution). */
export function OverworldSprite({ facing, walking, scale, appearance = signature }: { facing: Facing; walking: boolean; scale: number; appearance?: Appearance }) {
  const [tick, setTick] = useState(0)
  useAssetLoads()
  useEffect(() => {
    if (!walking) return
    const id = window.setInterval(() => setTick((t) => t + 1), 140)
    return () => window.clearInterval(id)
  }, [walking])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const urls = useMemo(() => overworldUrls(appearance), [appearance, overworldOverride(appearance)])
  const frame = walking ? WALK_CYCLE[tick % WALK_CYCLE.length] : 0
  return <img src={urls[facing][frame]} width={OW_W * OW_WORLD * scale} height={OW_H * OW_WORLD * scale} alt="" draggable={false} className="pixelated block" />
}
