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
}

const plaza: ResortMap = {
  id: 'plaza',
  name: 'BATTLE RESORT',
  rows: [
    'hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh',
    'h,,,,,,,,,,OO,,,,,,,,,,,,O,,,,,,,,,,,h',
    'h,######,,,,,,##########,,,,,,,######h',
    'h,######,,,,,,##########,#####,######h',
    'h,######,O,,,,##########,#####,######h',
    'h,###D##,,,,,,####DD####,##D##,##D###h',
    'h::x::::s:::::::q::::q::s::::x:::::::h',
    'h::::::::::::::::::::::::::::::::::::h',
    'hO,,,,,,O:l::::::::::::::::l:O,,,,,,Oh',
    'h,,,,,,,,::::O::::::::::O::::,,,,,,,,h',
    'h,#####,,::::::::::::::::::::,,#####,h',
    'h,#####,,::::::::::::::::::::,,#####,h',
    'h,##D##,,::::::::::::::::::::,,##D##,h',
    'h:x::::s::::::::::FF::::::::::s::::x:h',
    'h:::::::::::::::::FF:::::::::::::::::h',
    'hO,,,,,,,::::::::::::::::::::,,,,,,,,h',
    'h,,,,,,,O::::::::::::::::::::O,,,,,,Oh',
    'h,####,,,::::::::::::::::::::,,,####,h',
    'h,####,,,::::::::::::::::::::,,,####,h',
    'h,#E##,,,::::::::::::::::::::,,,#D##,h',
    'h:::::s::::::::::::::::::::::::s:::x:h',
    'h:::::::::l::::::::::::::::l:::::::::h',
    'h,ffffff,,,,b,,,,,,,,,,,,b,,,,pppppp,h',
    'h,nnnnnn,,,,,,f,f,,,,f,f,,,,,,pppppp,h',
    '______________________________________',
    '_____T____u________________u____T_____',
    '______________________________________',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
  ],
  structures: [
    { kind: 'tower', x: 14, y: 2, w: 10, d: 4 },
    { kind: 'home', x: 2, y: 2, w: 6, d: 4 },
    { kind: 'card', x: 25, y: 3, w: 5, d: 3 },
    { kind: 'lab', x: 31, y: 2, w: 6, d: 4 },
    { kind: 'pc', x: 2, y: 10, w: 5, d: 3 },
    { kind: 'gallery', x: 31, y: 10, w: 5, d: 3 },
    { kind: 'studio', x: 2, y: 17, w: 4, d: 3 },
    { kind: 'post', x: 32, y: 17, w: 4, d: 3 },
    { kind: 'fountain', x: 18, y: 13, w: 2, d: 2 },
  ],
  spawn: { x: 18, y: 19, facing: 'up' },
  warps: [
    { x: 18, y: 5, to: 'reception', tx: 7, ty: 10, facing: 'up' },
    { x: 19, y: 5, to: 'reception', tx: 8, ty: 10, facing: 'up' },
  ],
  portals: [
    { x: 5, y: 5, route: '/profile', name: 'HOME' },
    { x: 27, y: 5, route: '/card', name: 'CARD HALL' },
    { x: 33, y: 5, route: '/pokedex', name: 'DEX LAB' },
    { x: 4, y: 12, route: '/pc', name: 'PC CENTRE' },
    { x: 33, y: 12, route: '/album', name: 'GALLERY' },
    { x: 33, y: 19, route: '/pager', name: 'PAGER' },
  ],
  things: [
    { x: 3, y: 19, id: 'studio' },
    { x: 8, y: 6, id: 'sign', textKey: 'sign.home' },
    { x: 24, y: 6, id: 'sign', textKey: 'sign.resort' },
    { x: 7, y: 13, id: 'sign', textKey: 'sign.pc' },
    { x: 30, y: 13, id: 'sign', textKey: 'sign.gallery' },
    { x: 6, y: 20, id: 'sign', textKey: 'sign.studio' },
    { x: 31, y: 20, id: 'sign', textKey: 'sign.guestboard' },
  ],
  visitorArea: { x0: 1, y0: 8, x1: 36, y1: 26 },
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
    { x: 7, y: 11, to: 'plaza', tx: 18, ty: 6, facing: 'down' },
    { x: 8, y: 11, to: 'plaza', tx: 19, ty: 6, facing: 'down' },
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

/** Pick distinct walkable tiles in the visitor area for each id (deterministic). */
export function placeVisitors(m: ResortMap, ids: string[], blocked: Spot[] = []): Map<string, Spot & { facing: Facing }> {
  const out = new Map<string, Spot & { facing: Facing }>()
  const area = m.visitorArea
  if (!area) return out
  const free: Spot[] = []
  for (let y = area.y0; y <= area.y1; y++)
    for (let x = area.x0; x <= area.x1; x++) {
      const t = tileAt(m, x, y)
      if (!isSolidTile(m, x, y) && t !== '=' && !blocked.some((b) => b.x === x && b.y === y)) free.push({ x, y })
    }
  const taken = new Set<string>()
  const facings: Facing[] = ['down', 'left', 'right', 'up']
  for (const id of ids) {
    if (taken.size >= free.length) break
    let i = hash(id) % free.length
    while (taken.has(`${free[i].x},${free[i].y}`)) i = (i + 1) % free.length
    taken.add(`${free[i].x},${free[i].y}`)
    out.set(id, { ...free[i], facing: facings[hash(id + 'f') % 4] })
  }
  return out
}
