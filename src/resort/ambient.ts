/**
 * Life around the Battle Resort (browser only): creatures flying across the sky (some carrying
 * trainers), and now and then a travelling trainer who lands on the plaza or surfs in to the
 * beach, hangs around for a while (you can talk to and challenge them), then heads off again.
 *
 * Layering (see render.ts): sky flyers are drawn in the sky band, after the clouds and distant
 * hills but before anything standing on the map, so the tower and houses pass in front of them.
 * Travellers landing or surfing in are world items, depth-sorted with buildings and people.
 */
import type { SpeciesId } from '../battle/data'
import type { Appearance } from '../sprites/character'
import { paletteFor } from '../sprites/character'
import type { Facing } from '../sprites/overworld'
import { OW_WORLD, riderFor, RIDER_HIP } from '../sprites/overworld'
import { creatureArtHi } from '../sprites/creatures'
import { flightArt, FLIGHT_H, FLIGHT_W, FLYERS as FLYER_IDS, RIDEABLE, type FlyerId } from '../sprites/flight'
import { flipX } from '../sprites/raster'
import { characterFrames, inView, pixelCanvas, RES, VIEW_W, type WorldItem } from './render'
import { TILE } from './tiles'

export const FLYERS: SpeciesId[] = FLYER_IDS
/** Flyers big enough to carry a trainer. */
export const MOUNTS: SpeciesId[] = RIDEABLE
export const SURFERS: SpeciesId[] = ['riffin', 'subwoof', 'wicketoad']

interface SkyFlyer {
  species: FlyerId
  rider?: Appearance
  dir: 1 | -1
  /** height as a fraction of the sky band (0 = top) */
  y: number
  /** 0.55 (far) → 1 (near): size and speed */
  near: number
  t0: number
  dur: number
  /** animation offset so flocks don't flap in sync */
  phase: number
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
  const species = pick(FLYER_IDS)
  const near = 0.55 + Math.random() * 0.45
  a.flyers.push({
    species,
    rider: flightArt[species].saddle && Math.random() < 0.5 ? randomLook() : undefined,
    dir: Math.random() < 0.5 ? 1 : -1,
    // nearer flyers sit higher in the sky band; distant ones skim the horizon
    y: 0.12 + (1 - near) * 0.9 + Math.random() * 0.12,
    near,
    t0: now,
    dur: (8000 + Math.random() * 4000) / near,
    phase: Math.random() * 10_000,
  })
}

/** Where a trip's traveller is right now (world pixels) and how high off the ground. */
export function tripPosition(t: Trip, now: number): { x: number; y: number; alt: number; facing: Facing; surfing: boolean; flying: boolean } {
  const k = Math.max(0, Math.min(1, (now - t.t0) / t.dur))
  const p = t.leaving ? 1 - k : k
  const gx = t.tx * TILE + 8
  const gy = t.ty * TILE + 14
  if (t.mode === 'air') {
    // glide in from the side and come down onto the spot
    const side = t.fromX < 18 ? -1 : 1
    const e = easeOut(p)
    const facing: Facing = (side < 0) !== t.leaving ? 'right' : 'left'
    return { x: gx + side * (1 - e) * 120, y: gy, alt: (1 - e) * CRUISE_ALT, facing, surfing: false, flying: p < 1 }
  }
  // by sea: ride along the water to below the landing spot, then hop up the beach
  const sx = t.fromX * TILE + 8
  const sy = t.seaY * TILE + 14
  if (p < 0.78) {
    const q = p / 0.78
    return { x: sx + (gx - sx) * q, y: sy, alt: Math.sin(now / 160) * 1.5, facing: (gx > sx) !== t.leaving ? 'right' : 'left', surfing: true, flying: false }
  }
  const q = (p - 0.78) / 0.22
  return { x: gx, y: sy + (gy - sy) * q, alt: Math.sin(q * Math.PI) * 6, facing: t.leaving ? 'down' : 'up', surfing: q < 0.6, flying: false }
}

const easeOut = (x: number) => 1 - (1 - x) * (1 - x)

/** Highest a traveller flies on the way in (world pixels above their landing spot). */
export const CRUISE_ALT = 150
/**
 * How big a flying traveller looks, relative to their size on the ground: high up they're still
 * far off, so mount and rider start at about half size and grow smoothly to full size as they come
 * down; taking off runs the same curve backwards. Applies to mount and rider together, so the
 * rider never drifts off the saddle.
 */
export function airScale(alt: number): number {
  const k = Math.max(0, Math.min(1, alt / CRUISE_ALT))
  return 1 - 0.48 * k * (2 - k)
}

/**
 * Sky flyers are past the far edge of the map, so they're drawn smaller than anything on the
 * ground: from ~0.42× (skimming the horizon) to ~0.62× (high and nearer).
 */
export const skyScale = (near: number) => 0.42 + 0.2 * Math.max(0, Math.min(1, (near - 0.55) / 0.45))

/* ---------------- sprites ---------------- */

function flightLayer(id: FlyerId, frame: number, layer: 'far' | 'body' | 'near', flip: boolean) {
  const art = flightArt[id]
  const px = art.frames[frame][layer]
  return pixelCanvas(flip ? flipX(px) : px, art.palette, `fl:${id}:${frame}:${layer}:${flip}`)
}
/** The riding sprite for this look and direction (each side drawn as itself, not mirrored). */
const riderPx = new Map<string, ReturnType<typeof riderFor>>()
function riderCanvas(look: Appearance, faceRight: boolean) {
  const key = `${JSON.stringify(look)}:${faceRight}`
  let px = riderPx.get(key)
  if (!px) riderPx.set(key, (px = riderFor(look, faceRight ? 'right' : 'left')))
  return pixelCanvas(px, paletteFor(look), `ride:${key}`)
}

/** Which flight frame to show: birds flap in bursts and glide between them; insects never stop. */
export function flightFrame(id: FlyerId, t: number): number {
  const art = flightArt[id]
  if (art.style === 'flap' && t % 3200 > 3200 * 0.62) return 1
  return Math.floor(t / art.frameMs) % 4
}

/**
 * Draw a flyer (and its rider) centred on (x, y) in canvas pixels; `s` is canvas pixels per world
 * pixel. Order: far wing, body, rider, near wing — so the rider sits between the wings and the
 * near wing sweeps over their legs.
 */
export function drawFlyer(ctx: CanvasRenderingContext2D, id: FlyerId, t: number, x: number, y: number, s: number, faceRight: boolean, rider?: Appearance) {
  const art = flightArt[id]
  const f = flightFrame(id, t)
  const k = art.world * s
  const ox = Math.round(x - (FLIGHT_W / 2) * k)
  const oy = Math.round(y - FLIGHT_H * 0.62 * k)
  const w = Math.round(FLIGHT_W * k)
  const h = Math.round(FLIGHT_H * k)
  ctx.drawImage(flightLayer(id, f, 'far', faceRight), ox, oy, w, h)
  ctx.drawImage(flightLayer(id, f, 'body', faceRight), ox, oy, w, h)
  if (rider && art.saddle) {
    const [sx, sy] = art.saddle[f]
    const rs = OW_WORLD * s
    const img = riderCanvas(rider, faceRight)
    const hipX = faceRight ? img.width - RIDER_HIP[0] : RIDER_HIP[0]
    const px = ox + (faceRight ? FLIGHT_W - sx : sx) * k
    const py = oy + sy * k
    ctx.drawImage(img, Math.round(px - hipX * rs), Math.round(py - RIDER_HIP[1] * rs), Math.round(img.width * rs), Math.round(img.height * rs))
  }
  ctx.drawImage(flightLayer(id, f, 'near', faceRight), ox, oy, w, h)
}

/** Sky flyers, in the sky band above the horizon row `horizonY` (canvas pixels). */
export function drawSkyFlyers(ctx: CanvasRenderingContext2D, a: AmbientState, now: number, horizonY: number) {
  if (horizonY <= 0) return
  // far ones first
  for (const f of [...a.flyers].sort((p, q) => p.near - q.near)) {
    const k = (now - f.t0) / f.dur
    const W = VIEW_W * RES
    const x = f.dir === 1 ? -0.2 * W + 1.4 * W * k : 1.2 * W - 1.4 * W * k
    const art = flightArt[f.species]
    const t = now + f.phase
    // gliding birds drift; insects bob quickly; moths rise and fall with each beat
    const sway = art.style === 'flap' ? Math.sin(t / 900) * 4 : art.style === 'buzz' ? Math.sin(t / 140) * 1.5 + Math.sin(t / 700) * 3 : Math.sin(t / 300) * 3
    const s = RES * skyScale(f.near)
    // keep the whole sprite (wings up) inside the sky band
    const top = FLIGHT_H * 0.62 * art.world * s
    const y = Math.min(horizonY - 4 * RES, Math.max(top, horizonY * f.y + top * 0.5)) + sway * f.near * RES * 0.5
    drawFlyer(ctx, f.species, t, x, y, s, f.dir === 1, f.rider)
  }
}

/**
 * Surfing: where a seated rider's hips go on the creature's front art (80×80 px), and how many
 * rows from the top are its head — redrawn over the rider, so the trainer sits behind the head.
 */
const SURF_SEAT: Partial<Record<SpeciesId, { seat: [number, number]; head: number }>> = {
  riffin: { seat: [38, 40], head: 38 },
  subwoof: { seat: [40, 44], head: 42 },
  wicketoad: { seat: [40, 46], head: 46 },
}

/** Travellers flying in to land or surfing in to the beach, as depth-sorted world items. */
export function ambientItems(a: AmbientState, now: number, proj: (wx: number, wy: number) => { x: number; y: number; s: number }, vh: number): WorldItem[] {
  const items: WorldItem[] = []
  for (const t of a.trips) {
    if (now - t.t0 >= t.dur) continue
    const pos = tripPosition(t, now)
    const p = proj(pos.x, pos.y)
    if (!inView(p, vh)) continue
    items.push({
      depth: pos.y,
      draw: (ctx) => {
        const s = p.s * RES
        const lift = pos.alt * s
        // shadow on the ground, smaller the higher they are
        const sh = Math.max(0.35, 1 - pos.alt / 200)
        ctx.fillStyle = 'rgba(20,24,40,0.25)'
        ctx.beginPath()
        ctx.ellipse(p.x * RES, p.y * RES, 10 * s * sh, 3.5 * s * sh, 0, 0, Math.PI * 2)
        ctx.fill()
        const faceRight = pos.facing === 'right'
        if (pos.flying && t.species in flightArt) {
          // the height is measured at the landing spot's scale; the sprite shrinks with distance
          const fs = s * airScale(pos.alt)
          drawFlyer(ctx, t.species as FlyerId, now + t.t0, p.x * RES, p.y * RES - lift - 8 * fs, fs, faceRight, t.look)
          return
        }
        if (pos.surfing) {
          // the surfer rides low in the water, the trainer sitting on its back
          const art = creatureArtHi[t.species]
          const img = pixelCanvas(faceRight ? flipX(art.pixels) : art.pixels, art.palette, `surf:${t.species}:${faceRight}`)
          const cs = 0.5 * s
          const visible = Math.round(img.height * 0.72)
          const cw = img.width * cs
          const cx = p.x * RES - cw / 2
          const cy = p.y * RES - lift - visible * cs
          ctx.drawImage(img, 0, 0, img.width, visible, Math.round(cx), Math.round(cy), Math.round(cw), Math.round(visible * cs))
          const { seat, head } = SURF_SEAT[t.species] ?? { seat: [40, 44] as [number, number], head: 40 }
          const rimg = riderCanvas(t.look, faceRight)
          const rs = OW_WORLD * s
          const sx = cx + (faceRight ? img.width - seat[0] : seat[0]) * cs
          const sy = cy + seat[1] * cs
          const hipX = faceRight ? rimg.width - RIDER_HIP[0] : RIDER_HIP[0]
          ctx.drawImage(rimg, Math.round(sx - hipX * rs), Math.round(sy - RIDER_HIP[1] * rs), Math.round(rimg.width * rs), Math.round(rimg.height * rs))
          // the creature's head in front of the rider's lap
          ctx.drawImage(img, 0, 0, img.width, head, Math.round(cx), Math.round(cy), Math.round(cw), Math.round(head * cs))
          // a little wake
          ctx.fillStyle = 'rgba(255,255,255,0.75)'
          ctx.fillRect(Math.round(p.x * RES - 12 * s), Math.round(p.y * RES), Math.round(24 * s), Math.max(1, Math.round(s * 0.8)))
          return
        }
        // hopping up the beach on foot
        const r = characterFrames(t.look)[pos.facing][0]
        const rs = OW_WORLD * s
        ctx.drawImage(r, Math.round(p.x * RES - (r.width / 2) * rs), Math.round(p.y * RES - lift - r.height * rs), Math.round(r.width * rs), Math.round(r.height * rs))
      },
    })
  }
  return items
}
