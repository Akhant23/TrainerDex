/**
 * Hand-drawn replacements from public/assets/ (see src/content/sprites.ts). Each enabled file is
 * loaded once; until it loads, or if it fails, callers get null and keep the generated sprite.
 */
import { ASSET_SLOTS, CREATURE_SPEC, enabledAssets, enabledCreatures, type AssetSlot } from '../content/sprites'
import { signature } from '../content/aaryan'
import type { Appearance } from './character'
import type { Facing } from './overworld'

const base = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.BASE_URL : '/'
const images = new Map<string, HTMLImageElement | 'failed'>()
const listeners = new Set<() => void>()

function load(file: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null
  const hit = images.get(file)
  if (hit) return hit === 'failed' || !hit.complete ? null : hit
  const img = new Image()
  img.onload = () => listeners.forEach((f) => f())
  img.onerror = () => {
    images.set(file, 'failed')
    console.warn(`Sprite override ${file} failed to load; using the generated sprite.`)
  }
  img.src = base + file
  images.set(file, img)
  return null
}

/** Re-render when an override finishes loading. */
export function onAssetLoad(fn: () => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

const isAaryan = (a: Appearance) => a === signature || JSON.stringify(a) === JSON.stringify(signature)

/** The URL of a loaded override for this look and slot, if there is one. */
export function overrideUrl(a: Appearance, slot: AssetSlot): string | null {
  if (!enabledAssets.includes(slot) || !isAaryan(a)) return null
  return load(ASSET_SLOTS[slot].file)?.src ?? null
}

export function creatureOverrideUrl(id: string): string | null {
  if (!enabledCreatures.includes(id)) return null
  return load(CREATURE_SPEC.file.replace('<id>', id))?.src ?? null
}

const FACINGS: Facing[] = ['down', 'up', 'left', 'right']
let sheet: Record<Facing, HTMLCanvasElement[]> | null = null

/** Aaryan's hand-drawn walk sheet, sliced into 48×64 frames, if enabled and loaded. */
export function overworldOverride(a: Appearance): Record<Facing, HTMLCanvasElement[]> | null {
  if (!enabledAssets.includes('aaryan.overworld') || !isAaryan(a)) return null
  if (sheet) return sheet
  const img = load(ASSET_SLOTS['aaryan.overworld'].file)
  if (!img) return null
  const { width: fw, height: fh } = ASSET_SLOTS['aaryan.overworld']
  const out = {} as Record<Facing, HTMLCanvasElement[]>
  FACINGS.forEach((f, d) => {
    out[f] = [0, 1, 2].map((i) => {
      const c = document.createElement('canvas')
      c.width = fw
      c.height = fh
      const ctx = c.getContext('2d')
      if (ctx) {
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, (d * 3 + i) * (img.width / 12), 0, img.width / 12, img.height, 0, 0, fw, fh)
      }
      return c
    })
  })
  return (sheet = out)
}
