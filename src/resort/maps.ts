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
  /** Buildings standing on solid footprint tiles (x, y = back-left tile; w × d tiles). */
  structures?: Array<{ kind: StructureKind; x: number; y: number; w: number; d: number }>
  /** Tiles where online visitors may stand. */
  visitorArea?: { x0: number; y0: number; x1: number; y1: number }
  music?: 'resort' | 'battle'
  /** Outdoors the map edges extend into the distance; indoors it fades to black. */
  outdoor?: boolean
}

const plaza: ResortMap = {
  id: 'plaza',
  name: 'BATTLE RESORT',
  rows: [
    'hhhhhhhhhhhhhhhhhhhhhhhhhhhh',
    'hY,,,,,,,##########,,,,,,,Yh',
    'h,,,,,,,,##########,,,,,,,,h',
    'h,ff,,,,,##########,,,,,ff,h',
    'h,,,,,,,,####DD####,,,,,,,,h',
    'h,,l,,::::::::::::::::,,l,,h',
    'h,####::::::::::::::::::,,,h',
    'h,####::::::::::::::::::pp,h',
    'h,#E##:::::::FF:::::::::pp,h',
    'h,,:,,:::::::FF:::::::::pp,h',
    'h,,::::::::::::::::::::,,,,h',
    'h,b,,,::::::::::::::::,u,u,h',
    'h,,,,,::::::::::::::::,,,,,h',
    'h,f,s,::::::::::::::::,,s,fh',
    'h_____::::::::::::::::_____h',
    'h__T__l::::::::::::::l__T__h',
    'h__________________________h',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwww',
  ],
  structures: [
    { kind: 'tower', x: 9, y: 1, w: 10, d: 4 },
    { kind: 'studio', x: 2, y: 6, w: 4, d: 3 },
    { kind: 'fountain', x: 13, y: 8, w: 2, d: 2 },
  ],
  spawn: { x: 13, y: 15, facing: 'up' },
  warps: [
    { x: 13, y: 4, to: 'reception', tx: 7, ty: 10, facing: 'up' },
    { x: 14, y: 4, to: 'reception', tx: 8, ty: 10, facing: 'up' },
  ],
  things: [
    { x: 3, y: 8, id: 'studio' },
    { x: 4, y: 13, id: 'sign', textKey: 'sign.resort' },
    { x: 24, y: 13, id: 'sign', textKey: 'sign.guestboard' },
  ],
  visitorArea: { x0: 1, y0: 9, x1: 26, y1: 16 },
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
    { x: 7, y: 11, to: 'plaza', tx: 13, ty: 5, facing: 'down' },
    { x: 8, y: 11, to: 'plaza', tx: 14, ty: 5, facing: 'down' },
  ],
  things: [
    { x: 1, y: 1, id: 'pc' },
    { x: 3, y: 2, id: 'suggest' },
    { x: 12, y: 1, id: 'lift' },
    { x: 13, y: 1, id: 'lift' },
  ],
  music: 'resort',
}

function floorMap(n: number): ResortMap {
  const carpet = n === 5 ? 'a' : 'c'
  return {
    id: `floor${n}` as MapId,
    name: n === 5 ? 'CHAMPION’S FLOOR' : `TOWER · FLOOR ${n}`,
    rows: [
      'XXXXXXXXXXXX',
      'XXXXXLLXXXXX',
      'XtooooooootX',
      `Xoo${carpet.repeat(7)}oX`,
      `Xoo${carpet.repeat(7)}oX`,
      `Xoo${carpet.repeat(7)}oX`,
      `Xoo${carpet.repeat(7)}oX`,
      `Xoo${carpet.repeat(7)}oX`,
      'XooooooooooX',
      'XXXXXddXXXXX',
    ],
    warps: [
      { x: 5, y: 9, to: 'reception', tx: 12, ty: 2, facing: 'down' },
      { x: 6, y: 9, to: 'reception', tx: 13, ty: 2, facing: 'down' },
    ],
    things: [
      { x: 5, y: 1, id: 'lift-up' },
      { x: 6, y: 1, id: 'lift-up' },
    ],
    music: 'battle',
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
export const FLOOR_ARRIVAL = { x: 5, y: 8, facing: 'up' as Facing }
export const FLOOR_BOSS = { x: 5, y: 3 }
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
