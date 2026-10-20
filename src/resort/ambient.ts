/**
 * Life around the Battle Resort (browser only): creatures flying across the sky (some carrying
 * trainers), and now and then a travelling trainer who lands on the plaza or surfs in to the
 * beach, hangs around for a while (you can talk to and challenge them), then heads off again.
 */
import type { SpeciesId } from '../battle/data'
import type { Appearance } from '../sprites/character'
import type { Facing } from '../sprites/overworld'
import { OW_W, OW_WORLD } from '../sprites/overworld'
import { characterFrames, creatureFrames, RES } from './render'
import { TILE } from './tiles'

export const FLYERS: SpeciesId[] = ['megaphawk', 'hootour', 'campfly', 'diplomoth', 'riffin']
export const SURFERS: SpeciesId[] = ['riffin', 'subwoof', 'wicketoad']

interface SkyFlyer {
  species: SpeciesId
  rider?: Appearance
  dir: 1 | -1
  /** height as a fraction of the sky band */
  y: number
  t0: number
  dur: number
}

export interface Trip {
  id: string
  mode: 'air' | 'sea'
  species: SpeciesId
  look: Appearance
  /** destination tile */
  tx: number
  ty: number
  t0: number
  dur: number
  /** arriving or leaving */
  leaving: boolean
  /** surfers start (or end) off the side of the map on this water row */
  seaY: number
  fromX: number
}

export interface AmbientState {
  flyers: SkyFlyer[]
  trips: Trip[]
  nextFlyer: number
  nextGuest: number
}

export const newAmbient = (now: number): AmbientState => ({ flyers: [], trips: [], nextFlyer: now + 2500, nextGuest: now + 15000 })

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]

/** Maybe launch a new sky flyer. */
export function tickFlyers(a: AmbientState, now: number, randomLook: () => Appearance) {
  a.flyers = a.flyers.filter((f) => now - f.t0 < f.dur)
  if (now < a.nextFlyer) return
  a.nextFlyer = now + 6000 + Math.random() * 9000
  a.flyers.push({ species: pick(FLYERS), rider: Math.random() < 0.4 ? randomLook() : undefined, dir: Math.random() < 0.5 ? 1 : -1, y: 0.15 + Math.random() * 0.55, t0: now, dur: 7000 + Math.random() * 4000 })
}

/** Where a trip's traveller is right now (world pixels) and how high off the ground. */
export function tripPosition(t: Trip, now: number): { x: number; y: number; alt: number; facing: Facing; surfing: boolean; flying: boolean } {
  const k = Math.max(0, Math.min(1, (now - t.t0) / t.dur))
  const p = t.leaving ? 1 - k : k
  const gx = t.tx * TILE + 8
  const gy = t.ty * TILE + 14
  if (t.mode === 'air') return { x: gx, y: gy, alt: (1 - easeOut(p)) * 150, facing: 'down', surfing: false, flying: p < 1 }
  // by sea: ride along the water to below the landing spot, then hop up the beach
  const sx = t.fromX * TILE + 8
  const sy = t.seaY * TILE + 14
  if (p < 0.78) {
    const q = p / 0.78
    return { x: sx + (gx - sx) * q, y: sy, alt: Math.sin(now / 160) * 1.5, facing: gx > sx ? 'right' : 'left', surfing: true, flying: false }
  }
  const q = (p - 0.78) / 0.22
  return { x: gx, y: sy + (gy - sy) * q, alt: Math.sin(q * Math.PI) * 6, facing: 'up', surfing: q < 0.6, flying: false }
}

const easeOut = (x: number) => 1 - (1 - x) * (1 - x)

/** Draw the sky flyers (screen space) and travellers on the move (world space). */
export function drawAmbient(ctx: CanvasRenderingContext2D, a: AmbientState, now: number, proj: (wx: number, wy: number) => { x: number; y: number; s: number }, skyHeight: number) {
  for (const f of a.flyers) {
    const k = (now - f.t0) / f.dur
    const W = 256 * RES
    const x = f.dir === 1 ? -0.15 * W + 1.3 * W * k : 1.15 * W - 1.3 * W * k
    const y = skyHeight * f.y + Math.sin(now / 260 + f.t0) * 3 * RES
    const img = creatureFrames(f.species, f.dir === 1, Math.floor(now / 200) % 2)
    const sc = 0.32 * RES
    ctx.drawImage(img, Math.round(x - (img.width * sc) / 2), Math.round(y - img.height * sc), Math.round(img.width * sc), Math.round(img.height * sc))
    if (f.rider) {
      const r = characterFrames(f.rider)[f.dir === 1 ? 'right' : 'left'][0]
      const rs = OW_WORLD * 0.75 * RES
      ctx.drawImage(r, Math.round(x - (r.width * rs) / 2), Math.round(y - img.height * sc * 0.55 - r.height * rs), Math.round(r.width * rs), Math.round(r.height * rs))
    }
  }
  for (const t of a.trips) {
    const pos = tripPosition(t, now)
    if (now - t.t0 >= t.dur) continue
    const p = proj(pos.x, pos.y)
    if (p.s <= 0.2 || p.s > 4) continue
    const lift = pos.alt * p.s * RES
    // shadow on the ground
    ctx.fillStyle = 'rgba(20,24,40,0.25)'
    ctx.beginPath()
    ctx.ellipse(p.x * RES, p.y * RES, 8 * p.s * RES, 3 * p.s * RES, 0, 0, Math.PI * 2)
    ctx.fill()
    const cy = p.y * RES - lift
    const rs = OW_WORLD * p.s * RES
    const r = characterFrames(t.look)[pos.facing][0]
    if (pos.flying || pos.surfing) {
      // riding: the creature underneath, the trainer on its back
      const img = creatureFrames(t.species, pos.facing === 'right', 0)
      const sc = 0.32 * p.s * RES
      ctx.drawImage(img, Math.round(p.x * RES - (img.width * sc) / 2), Math.round(cy - img.height * sc * 0.75), Math.round(img.width * sc), Math.round(img.height * sc))
      ctx.drawImage(r, Math.round(p.x * RES - (OW_W / 2) * rs), Math.round(cy - img.height * sc * 0.55 - r.height * rs), Math.round(r.width * rs), Math.round(r.height * rs))
      if (pos.surfing) {
        // a little wake
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillRect(Math.round(p.x * RES - 10 * p.s * RES), Math.round(p.y * RES), Math.round(20 * p.s * RES), Math.round(RES))
      }
    } else {
      // hopping up the beach on foot
      ctx.drawImage(r, Math.round(p.x * RES - (OW_W / 2) * rs), Math.round(cy - r.height * rs), Math.round(r.width * rs), Math.round(r.height * rs))
    }
  }
}
