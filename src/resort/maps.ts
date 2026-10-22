/**
 * Battle Resort maps. Each character is a tile from tiles.ts. Pure data + helpers (testable).
 */
import { tiles } from './tiles.ts'
import type { StructureKind } from './structures.ts'
import type { Facing } from '../sprites/overworld.ts'

export type MapId = 'plaza' | 'reception' | 'floor1' | 'floor2' | 'floor3' | 'floor4' | 'floor5'

export interface Warp {
  x: number
  y: number
  to: MapId
  tx: number
  ty: number
  facing: Facing
}

export interface Spot {
  x: number
  y: number
}

export interface ResortMap {
  id: MapId
  name: string
  rows: string[]
  /** Arrive here when entering the resort. */
  spawn?: Spot & { facing: Facing }
  warps: Warp[]
  /** Interactable tiles (signs, PC, lift, studio door): id + optional text. */
  things: Array<Spot & { id: string; /** dialogue.csv key for signs */ textKey?: string }>
  /** Doors into the rest of the site: step on the tile to open that section. */
  portals?: Array<Spot & { route: string; name: string }>
  /** Buildings standing on solid footprint tiles (x, y = back-left tile; w × d tiles). */
  structures?: Array<{ kind: StructureKind; x: number; y: number; w: number; d: number }>
  /** Tiles where online visitors may stand. */
  visitorArea?: { x0: number; y0: number; x1: number; y1: number }
  music?: 'resort' | 'floor1' | 'floor2' | 'floor3' | 'floor4' | 'floor5'
  /** Outdoors the map edges extend into the distance; indoors it fades to black. */
  outdoor?: boolean
  /**
   * What lies past the map's edges (outdoors), tile by tile: drawn, never walkable (moving off the
   * map is always blocked). Without it, the edge tiles are carried on.
   */
  beyond?: (tx: number, ty: number) => string
}

/**
 * Where the original plaza layout starts: the gardens added either side (twelve columns each) put
 * everything that was at x at PLAZA_X + x. Anything placed on the plaza by coordinates adds it.
 */
export const PLAZA_X = 12
/** The plaza's width in tiles, gardens included. */
const PLAZA_W = PLAZA_X * 2 + 38

const plaza: ResortMap = {
  id: 'plaza',
  name: 'BATTLE RESORT',
  rows: [
    'OOOOOOOOOOOOOhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhOOOOOOOOOOOOO',
    'O,,,ff,,,O,,,,,,,,,,,,,OO,,,,,,,,,,,,O,,,,,,,,,,,,,,,O,,,,ff,O',
    'O,O,,,,,,,,,,,######,,,,,,##########,,,,,,,######,,,,,,,Y,,,,O',
    'O,,,,pppp,,,,,######,,,,,,##########,#####,######,,Y,,,,,,,,OO',
    'OO,,,pppp,f,,,######,O,,,,##########,#####,######,,,,,ff,,Y,,O',
    'O,,,,pppp,,,,,###D##,,,,,,####DD####,##D##,##D###,,,Y,ff,,,,,O',
    'O::::::::::::::x::::s:::::::q::::q::s::::x:::::::::::::::::::O',
    'O::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::O',
    'O,,b,,,O,,,,,O,,,,,,O:l::::::::::::::::l:O,,,,,,O,,,,,O,,,b,,O',
    'O,f,,,,,,,,,,,,,,,,,,::::O::::::::::O::::,,,,,,,,,,f,,,,,,,,,O',
    'OO,,Y,,,,Y,,,,#####,,::::::::::::::::::::,,#####,,,,,Y,,,,Y,OO',
    'O,,,,,,,,,,,,,#####,,::::::::::::::::::::,,#####,,,,,,,,,,,,,O',
    'O,,Y,,,,,Y,,,,##D##,,::::::::::::::::::::,,##D##,,,b,,,,ff,,,O',
    'O:::::::::::::x::::s::::::::::FF::::::::::s::::x:::::::::::::O',
    'O::::::l::::::::::::::::::::::FF::::::::::::::::::::l::::::::O',
    'O,,,,,,,,,,,,O,,,,,,,::::::::::::::::::::,,,,,,,,,,,,,,,,,,,,O',
    'O,O,,ff,,,,,,,,,,,,,O::::::::::::::::::::O,,,,,,O,,,,,O,,,Y,,O',
    'O,,,,ff,,O,,,,####,,,::::::::::::::::::::,,,####,,,ff,,,,,,,OO',
    'OO,,,,,,,,,,,,####,,,::::::::::::::::::::,,,####,,,ff,,Y,,,,,O',
    'O,,b,,,,,,b,,,#E##,,,::::::::::::::::::::,,,#D##,,,,,,,,,b,,,O',
    'O:::::::::::::::::s::::::::::::::::::::::::s:::x:::::::::::::O',
    'O:::::::::::::::::::::l::::::::::::::::l:::::::::::::::::::::O',
    'O,ffff,,,,,,,,ffffff,,,,b,,,,,,,,,,,,b,,,,pppppp,,,,,,,,ffff,O',
    'O,nnnn,,,,,,,,nnnnnn,,,,,,f,f,,,,f,f,,,,,,pppppp,,,,,,,,nnnn,O',
    'T____________________________________________________________T',
    'T_u_____T________T____u________________u____T________T____u__T',
    'T____________________________________________________________T',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
  ],
  structures: [
    { kind: 'tower', x: PLAZA_X + 14, y: 2, w: 10, d: 4 },
    { kind: 'home', x: PLAZA_X + 2, y: 2, w: 6, d: 4 },
    { kind: 'card', x: PLAZA_X + 25, y: 3, w: 5, d: 3 },
    { kind: 'lab', x: PLAZA_X + 31, y: 2, w: 6, d: 4 },
    { kind: 'pc', x: PLAZA_X + 2, y: 10, w: 5, d: 3 },
    { kind: 'gallery', x: PLAZA_X + 31, y: 10, w: 5, d: 3 },
    { kind: 'studio', x: PLAZA_X + 2, y: 17, w: 4, d: 3 },
    { kind: 'post', x: PLAZA_X + 32, y: 17, w: 4, d: 3 },
    { kind: 'fountain', x: PLAZA_X + 18, y: 13, w: 2, d: 2 },
  ],
  spawn: { x: PLAZA_X + 18, y: 19, facing: 'up' },
  warps: [
    { x: PLAZA_X + 18, y: 5, to: 'reception', tx: 7, ty: 10, facing: 'up' },
    { x: PLAZA_X + 19, y: 5, to: 'reception', tx: 8, ty: 10, facing: 'up' },
  ],
  portals: [
    { x: PLAZA_X + 5, y: 5, route: '/profile', name: 'HOME' },
    { x: PLAZA_X + 27, y: 5, route: '/card', name: 'CARD HALL' },
    { x: PLAZA_X + 33, y: 5, route: '/pokedex', name: 'DEX LAB' },
    { x: PLAZA_X + 4, y: 12, route: '/pc', name: 'PC CENTRE' },
    { x: PLAZA_X + 33, y: 12, route: '/album', name: 'GALLERY' },
    { x: PLAZA_X + 33, y: 19, route: '/pager', name: 'PAGER' },
  ],
  things: [
    { x: PLAZA_X + 3, y: 19, id: 'studio' },
    { x: PLAZA_X + 8, y: 6, id: 'sign', textKey: 'sign.home' },
    { x: PLAZA_X + 24, y: 6, id: 'sign', textKey: 'sign.resort' },
    { x: PLAZA_X + 7, y: 13, id: 'sign', textKey: 'sign.pc' },
    { x: PLAZA_X + 30, y: 13, id: 'sign', textKey: 'sign.gallery' },
    { x: PLAZA_X + 6, y: 20, id: 'sign', textKey: 'sign.studio' },
    { x: PLAZA_X + 31, y: 20, id: 'sign', textKey: 'sign.guestboard' },
  ],
  visitorArea: { x0: 1, y0: 8, x1: PLAZA_X + 48, y1: 26 },
  beyond: plazaBeyond,
  music: 'resort',
  outdoor: true,
}

const reception: ResortMap = {
  id: 'reception',
  name: 'TOWER RECEPTION',
  rows: [
    'XXXXXXXXXXXXXXXX',
    'XPXXXXXXXXXXLLXX',
    'XookCooooCoooooX',
    'XtooCCCCCCooootX',
    'XooooooooooooooX',
    'XoooccccccccoooX',
    'XoooccccccccoooX',
    'XtooccccccccootX',
    'XoooccccccccoooX',
    'XooooooooooooooX',
    'XooooooooooooooX',
    'XXXXXXXmmXXXXXXX',
  ],
  warps: [
    { x: 7, y: 11, to: 'plaza', tx: PLAZA_X + 18, ty: 6, facing: 'down' },
    { x: 8, y: 11, to: 'plaza', tx: PLAZA_X + 19, ty: 6, facing: 'down' },
  ],
  things: [
    { x: 1, y: 1, id: 'pc' },
    { x: 3, y: 2, id: 'suggest' },
    { x: 12, y: 1, id: 'lift' },
    { x: 13, y: 1, id: 'lift' },
  ],
  music: 'resort',
}

/** Each floor is themed to a stage of Aaryan's life: floor texture, decor, banners and music. */
const FLOOR_THEMES = [
  { floor: '!', deco: '&', banner: 'bannerSchool', year: 'yearSchool' },
  { floor: '@', deco: '+', banner: 'bannerFirstYear', year: 'yearFirstYear' },
  { floor: '$', deco: '*', banner: 'bannerMarketing', year: 'yearMarketing' },
  { floor: '%', deco: '^', banner: 'bannerTours', year: 'yearTours' },
  { floor: 'a', deco: '|', banner: 'bannerChampion', year: 'yearChampion' },
] as const

function floorMap(n: number): ResortMap {
  const t = FLOOR_THEMES[n - 1]
  const band = `Xoo${t.floor.repeat(10)}ooX`
  return {
    id: `floor${n}` as MapId,
    name: n === 5 ? 'CHAMPION’S FLOOR' : `TOWER · FLOOR ${n}`,
    rows: [
      'XXXXXXXXXXXXXXXX',
      'XXXXXXXLLXXXXXXX',
      `X${t.deco}oooooooooooo${t.deco}X`,
      band,
      band,
      band,
      band,
      band,
      `X${t.deco}oooooooooooo${t.deco}X`,
      'XXXXXXXddXXXXXXX',
    ],
    structures: [
      { kind: t.banner, x: 1, y: 1, w: 5, d: 1 },
      { kind: t.year, x: 10, y: 1, w: 5, d: 1 },
    ],
    warps: [
      { x: 7, y: 9, to: 'reception', tx: 12, ty: 2, facing: 'down' },
      { x: 8, y: 9, to: 'reception', tx: 13, ty: 2, facing: 'down' },
    ],
    things: [
      { x: 7, y: 1, id: 'lift-up' },
      { x: 8, y: 1, id: 'lift-up' },
    ],
    music: `floor${n}` as ResortMap['music'],
  }
}

export const maps: Record<MapId, ResortMap> = {
  plaza,
  reception,
  floor1: floorMap(1),
  floor2: floorMap(2),
  floor3: floorMap(3),
  floor4: floorMap(4),
  floor5: floorMap(5),
}

/** Where you arrive on a tower floor, and where Aaryan stands. */
export const FLOOR_ARRIVAL = { x: 7, y: 8, facing: 'up' as Facing }
export const FLOOR_BOSS = { x: 7, y: 3 }
export const RECEPTIONIST = { x: 6, y: 2 }

export const size = (m: ResortMap) => ({ w: m.rows[0].length, h: m.rows.length })
export const tileAt = (m: ResortMap, x: number, y: number) => m.rows[y]?.[x] ?? 'X'
/** The tile to draw at (x, y): the map's own, or past its edge what lies beyond (else the nearest edge tile). */
export function sceneryAt(m: ResortMap, x: number, y: number): string {
  const { w, h } = size(m)
  if (x >= 0 && y >= 0 && x < w && y < h) return tileAt(m, x, y)
  return m.beyond?.(x, y) ?? tileAt(m, Math.max(0, Math.min(w - 1, x)), Math.max(0, Math.min(h - 1, y)))
}

/** A steady 0–1 value per tile, for scattering scenery without a visible repeat. */
function tileHash(x: number, y: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

/**
 * Past the plaza, as far as the camera sees: woods inland (round trees and palms, thicker the
 * further out, with the odd clearing of flowers) and, along the coast, the beach with scattered
 * palms and the sea running on. No pattern repeats: every tile is chosen from its own position.
 */
function plazaBeyond(tx: number, ty: number): string {
  const W = PLAZA_W
  if (ty >= 28) return 'w'
  if (ty === 27) return '~'
  if (ty >= 24) return tileHash(tx, ty) < 0.14 ? 'T' : '_'
  const out = tx < 0 ? -tx : tx >= W ? tx - W + 1 : ty < 0 ? -ty : 0
  const r = tileHash(tx, ty)
  const trees = Math.min(0.82, 0.46 + out * 0.07)
  if (r < trees) return r < trees * 0.2 ? 'Y' : 'O'
  return r > 0.95 ? 'f' : ','
}
export const isSolidTile = (m: ResortMap, x: number, y: number) => tiles[tileAt(m, x, y)]?.solid ?? true
export const warpAt = (m: ResortMap, x: number, y: number) => m.warps.find((w) => w.x === x && w.y === y)
export const thingAt = (m: ResortMap, x: number, y: number) => m.things.find((t) => t.x === x && t.y === y)

export const step = (x: number, y: number, f: Facing) => ({ x: x + (f === 'left' ? -1 : f === 'right' ? 1 : 0), y: y + (f === 'up' ? -1 : f === 'down' ? 1 : 0) })

/** Stable hash → used to place visitors on the same tile every time. */
export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export type VisitorSpot = Spot & { facing: Facing }

/** Pick distinct walkable tiles in the visitor area for each id (deterministic). */
export function placeVisitors(m: ResortMap, ids: string[], blocked: Spot[] = []): Map<string, VisitorSpot> {
  return settleVisitors(m, ids, new Map(), blocked)
}

/**
 * Like placeVisitors, but visitors already standing somewhere keep their spot: only newcomers are
 * placed, on tiles nobody holds. `fixed` tiles are always off limits (staff, spawn, doorways);
 * `avoid` tiles are only kept clear for newcomers (where the player and travelling trainers are
 * standing right now). This is what stops the whole crowd reshuffling whenever someone arrives or
 * leaves, since the player's current tile would otherwise change every visitor's hashed spot.
 */
export function settleVisitors(m: ResortMap, ids: string[], prev: ReadonlyMap<string, VisitorSpot>, fixed: Spot[] = [], avoid: Spot[] = []): Map<string, VisitorSpot> {
  const out = new Map<string, VisitorSpot>()
  const area = m.visitorArea
  if (!area) return out
  const key = (s: Spot) => `${s.x},${s.y}`
  const fixedSet = new Set(fixed.map(key))
  const taken = new Set<string>()
  for (const id of ids) {
    const p = prev.get(id)
    if (!p || fixedSet.has(key(p)) || taken.has(key(p))) continue
    out.set(id, p)
    taken.add(key(p))
  }
  const avoidSet = new Set(avoid.map(key))
  const free: Spot[] = []
  for (let y = area.y0; y <= area.y1; y++)
    for (let x = area.x0; x <= area.x1; x++) {
      const k = `${x},${y}`
      if (!isSolidTile(m, x, y) && tileAt(m, x, y) !== '=' && !fixedSet.has(k) && !avoidSet.has(k)) free.push({ x, y })
    }
  const facings: Facing[] = ['down', 'left', 'right', 'up']
  const open = free.filter((f) => !taken.has(key(f))).length
  let placed = 0
  for (const id of ids) {
    if (out.has(id)) continue
    if (placed >= open) break
    let i = hash(id) % free.length
    while (taken.has(key(free[i]))) i = (i + 1) % free.length
    taken.add(key(free[i]))
    placed++
    out.set(id, { ...free[i], facing: facings[hash(id + 'f') % 4] })
  }
  return out
}
