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
import { characterFrames, FEET_DY, groundShadow, inView, pixelCanvas, RES, VIEW_W, WALKER_SHADOW, type WorldItem } from './render'
import { ARRIVAL_HANDOFF, ARRIVAL_TOTAL, arrivalAt, DEPARTURE_BOARD_AT, DEPARTURE_TOTAL, departureAt, HOP_SWAP, type Departure, type MountFrame } from './departure'
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

/** Where a trip's traveller by sea is right now (world pixels) and how high off the ground. Trips by air follow departure.ts. */
export function tripPosition(t: Trip, now: number): { x: number; y: number; alt: number; facing: Facing; surfing: boolean } {
  const k = Math.max(0, Math.min(1, (now - t.t0) / t.dur))
  const p = t.leaving ? 1 - k : k
  const gx = t.tx * TILE + 8
  const gy = t.ty * TILE + 14
  // by sea: ride along the water to below the landing spot, then hop up the beach
  const sx = t.fromX * TILE + 8
  const sy = t.seaY * TILE + 14
  if (p < 0.78) {
    const q = p / 0.78
    return { x: sx + (gx - sx) * q, y: sy, alt: Math.sin(now / 160) * 1.5, facing: (gx > sx) !== t.leaving ? 'right' : 'left', surfing: true }
  }
  const q = (p - 0.78) / 0.22
  return { x: gx, y: sy + (gy - sy) * q, alt: Math.sin(q * Math.PI) * 6, facing: t.leaving ? 'down' : 'up', surfing: q < 0.6 }
}


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

/** A flyer's layer for one frame, facing right from its own right-facing art (not a flipped copy). */
function flightLayer(id: FlyerId, frame: number, layer: 'far' | 'body' | 'near', faceRight: boolean) {
  const art = flightArt[id]
  const px = (faceRight ? art.framesRight : art.frames)[frame][layer]
  return pixelCanvas(px, art.palette, `fl:${id}:${frame}:${layer}:${faceRight}`)
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

/** Where a flyer drawn by drawFlyer has its saddle (canvas px), for the same arguments. */
export function saddlePoint(id: FlyerId, t: number, x: number, y: number, s: number, faceRight: boolean): { x: number; y: number } | null {
  const art = flightArt[id]
  if (!art.saddle) return null
  const k = art.world * s
  const ox = Math.round(x - (FLIGHT_W / 2) * k)
  const oy = Math.round(y - FLIGHT_H * 0.62 * k)
  const [sx, sy] = art.saddle[flightFrame(id, t)]
  return { x: ox + (faceRight ? FLIGHT_W - sx : sx) * k, y: oy + sy * k }
}

/**
 * Draw a flyer (and its rider) centred on (x, y) in canvas pixels; `s` is canvas pixels per world
 * pixel. Order: far wing, body, rider, near wing — so the rider sits between the wings and the
 * near wing sweeps over their legs. `riderOff` (canvas px) moves the rider off the saddle while
 * they settle onto it or push off from it.
 */
export function drawFlyer(ctx: CanvasRenderingContext2D, id: FlyerId, t: number, x: number, y: number, s: number, faceRight: boolean, rider?: Appearance, riderOff: [number, number] = [0, 0]) {
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
    ctx.drawImage(img, Math.round(px + riderOff[0] - hipX * rs), Math.round(py + riderOff[1] - RIDER_HIP[1] * rs), Math.round(img.width * rs), Math.round(img.height * rs))
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
/**
 * `present(id)`: whether that travelling trainer is in the world's walker list right now. Around
 * the hand-overs (stepping off the ground onto the hop, or off the hop onto the ground) the list
 * updates a frame or two late, so the trip draws them standing on their spot whenever the world
 * isn't: never both, never neither.
 */
export function ambientItems(a: AmbientState, now: number, proj: (wx: number, wy: number) => { x: number; y: number; s: number }, vh: number, present: (id: string) => boolean = () => false): WorldItem[] {
  const items: WorldItem[] = []
  for (const t of a.trips) {
    if (now - t.t0 >= tripEnds(t)) continue
    if (t.mode === 'air') {
      // flying in to land and hopping off, or hopping on and flying off (departure.ts)
      const d = tripFlight(t)
      // around each hand-over the walker is drawn here too, overlapping the world's own (see HANDOVER_MS)
      const tt = now - t.t0
      const onGround = t.leaving ? tt < DEPARTURE_BOARD_AT : tt >= ARRIVAL_HANDOFF
      const who = t.leaving ? t.id.replace(/-out$/, '') : t.id
      const stand: Facing | undefined = onGround && !present(who) ? (d.fromLeft === t.leaving ? 'left' : 'right') : undefined
      if (t.species in flightArt) items.push(...mountItems(t.leaving ? departureAt(d, now) : arrivalAt(d, now), d, now, proj, vh, t.look, { boarding: t.leaving, wingT: now + t.t0, stand }))
      continue
    }
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

/* ---------------- travelling by air: landing, boarding, alighting (see departure.ts) ---------------- */

type Proj = (wx: number, wy: number) => { x: number; y: number; s: number }

/**
 * Size steps for a flyer shrinking into the distance: ~4% apart and exactly 1 at full size,
 * instead of a size that changes every frame. Nearest-neighbour scaling to a new size each frame
 * makes the pixels shimmer; held for a few frames at a time, the art stays crisp.
 */
export function stepScale(r: number): number {
  if (r >= 1) return 1
  return 2 ** (Math.round(Math.log2(Math.max(r, 1e-3)) * 24) / 24)
}

/** How high the hop between the ground and the saddle arcs (world px). */
const HOP_ARC = 10
/**
 * The part of the hop spent crouched on the ground: before the jump when boarding (the push-off),
 * after it when alighting (absorbing the landing). The jump itself is the rest.
 */
const HOP_CROUCH = 0.12
const smooth = (x: number) => x * x * (3 - 2 * x)

/** A trip by air as a departure/arrival record (its spot, mount and side). */
export function tripFlight(t: Trip): Departure {
  return { t0: t.t0, x: t.tx * TILE + 8, y: t.ty * TILE + 14, mount: t.species, fromLeft: t.fromX < 18 }
}

/** When a trip has nothing left to draw: by air, once the mount has gone; by sea, on arrival. */
export function tripEnds(t: Trip): number {
  return t.mode === 'air' ? (t.leaving ? DEPARTURE_TOTAL : ARRIVAL_TOTAL) : t.dur
}

/**
 * A mount and its trainer as a depth-sorted world item, from a departure or arrival frame: the
 * shadow, the mount swooping in or flying off, the hop between the ground and the saddle, and the
 * rider seated on the saddle frame by frame.
 *
 * The hop moves one point, the trainer's hips, from where they stand to the saddle. The walking
 * and riding sprites share their head and body rows and put the hips on the same pixel, so the
 * pose can change mid-air without the head or body jumping: only the legs change. It changes just
 * before landing on the saddle (HOP_SWAP), and on the way up the trainer turns at the top of the
 * jump from facing the mount to facing the way it will fly. `boarding` false runs it backwards:
 * hopping forward off the mount onto the spot, facing the way they flew in.
 */
export function mountItems(f: MountFrame<string>, d: Departure, now: number, proj: Proj, vh: number, look: Appearance, opts: { boarding: boolean; wingT?: number; stand?: Facing }): WorldItem[] {
  if (f.phase === 'complete' || f.phase === 'prepare' || f.fade <= 0) return []
  const p = proj(f.x, f.y)
  if (!inView(p, vh)) return []
  const id = d.mount as FlyerId
  const g = proj(d.x, d.y)
  // the trainer's feet where the world draws a walker standing on that spot
  const gf = proj(d.x, d.y + FEET_DY)
  const wingT = opts.wingT ?? now
  return [
    {
      // just behind the trainer's own row: someone standing beside their mount (the world's
      // walker, before boarding or after alighting) is drawn in front of it, as during the hop
      depth: f.y - 0.5,
      draw: (ctx) => {
        const s = p.s * RES
        // the trainer's spot sets the full size; farther and higher it shrinks in steps
        const s0 = g.s * RES
        const fs = s0 * stepScale((p.s / g.s) * airScale(f.alt))
        ctx.save()
        ctx.globalAlpha = f.fade
        const sh = Math.max(0.35, 1 - f.alt / 200)
        ctx.fillStyle = 'rgba(20,24,40,0.25)'
        ctx.beginPath()
        ctx.ellipse(p.x * RES, p.y * RES, 12 * s * sh, 4 * s * sh, 0, 0, Math.PI * 2)
        ctx.fill()
        if (opts.stand) {
          // the trainer standing on their spot, exactly as the world draws a walker
          groundShadow(ctx, g.x * RES, g.y * RES, WALKER_SHADOW, g.s)
          const img = characterFrames(look)[opts.stand][0]
          const rs = OW_WORLD * s0
          ctx.drawImage(img, Math.round(gf.x * RES - (img.width / 2) * rs), Math.round(gf.y * RES - img.height * rs), Math.round(img.width * rs), Math.round(img.height * rs))
        }
        const mx = p.x * RES
        const my = p.y * RES - f.alt * s - 8 * fs + Math.round(f.dip * s)
        const travel: 'left' | 'right' = f.faceRight ? 'right' : 'left'
        const seat = saddlePoint(id, wingT, mx, my, fs, f.faceRight)
        if (!seat || f.hop <= 0 || f.hop >= 1) {
          drawFlyer(ctx, id, wingT, mx, my, fs, f.faceRight, f.aboard ? look : undefined)
          ctx.restore()
          return
        }
        // the hop: a crouch on the ground, then the hips travel from above the trainer's feet to
        // the saddle in an arc (j: 0–1 through the jump itself)
        const rs = OW_WORLD * s0
        const k = f.hop
        const j = Math.max(0, (k - HOP_CROUCH) / (1 - HOP_CROUCH))
        const e = smooth(j)
        const hx0 = gf.x * RES
        const hy0 = gf.y * RES - (64 - RIDER_HIP[1]) * rs
        const hx = hx0 + (seat.x - hx0) * e
        const hy = hy0 + (seat.y - hy0) * e - Math.sin(j * Math.PI) * HOP_ARC * s0
        // their shadow stays on the ground below, shrinking and fading as they rise onto the mount
        if (e < 1) groundShadow(ctx, g.x * RES, g.y * RES, WALKER_SHADOW * (1 - 0.3 * Math.sin(j * Math.PI)), g.s, 0.28 * (1 - e))
        if (k >= HOP_SWAP) {
          // seated: settling onto the saddle (or about to push off), between the wings
          drawFlyer(ctx, id, wingT, mx, my, fs, f.faceRight, look, [Math.round(hx - seat.x), Math.round(hy - seat.y)])
        } else {
          drawFlyer(ctx, id, wingT, mx, my, fs, f.faceRight)
          const toMount: 'left' | 'right' = f.faceRight ? 'left' : 'right'
          const facing = opts.boarding && j < 0.5 ? toMount : travel
          const crouch = k < HOP_CROUCH
          const img = characterFrames(look)[facing][crouch ? 0 : 1]
          const ox = hx - (img.width / 2) * rs
          const oy = hy - RIDER_HIP[1] * rs + (crouch ? rs : 0)
          ctx.drawImage(img, Math.round(ox), Math.round(oy), Math.round(img.width * rs), Math.round(img.height * rs))
        }
        ctx.restore()
      },
    },
  ]
}

/** The player's departure (departure.ts) as world items. */
export function departureItems(d: Departure, now: number, proj: Proj, vh: number, look: Appearance): WorldItem[] {
  return mountItems(departureAt(d, now), d, now, proj, vh, look, { boarding: true })
}

/**
 * The creature following you going back into its ball: a red-and-white flash that pulls in to a
 * point over `k` (0–1). Pixel squares on the world's pixel grid, no smoothing.
 */
export function recallItem(x: number, y: number, k: number, proj: Proj, vh: number): WorldItem[] {
  const p = proj(x, y)
  if (!inView(p, vh) || k >= 1) return []
  return [
    {
      depth: y + 0.5,
      draw: (ctx) => {
        const u = Math.max(1, Math.round(p.s * RES))
        const cx = Math.round(p.x * RES)
        const cy = Math.round((p.y - 7 * p.s) * RES)
        const r = Math.round((1 - k) * 8) * u
        ctx.fillStyle = '#e8384f'
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + k * 1.2
          ctx.fillRect(cx + Math.round((Math.cos(a) * r) / u) * u - u, cy + Math.round((Math.sin(a) * r * 0.8) / u) * u - u, 2 * u, 2 * u)
        }
        const c = Math.round((k < 0.5 ? 1 + k * 4 : 5 - k * 4) * 0.5) * u + u
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(cx - c, cy - c, 2 * c, 2 * c)
      },
    },
  ]
}
