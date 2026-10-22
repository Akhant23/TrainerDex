/**
 * The Medal Hall: the Medal Box's top screen, a room drawn with the resort's 2.5D renderer. Three
 * display cases stand against the back wall, one per tier, holding every medal in its own slot;
 * a podium in the middle shows the latest one; a curator minds the door. Pure data and helpers
 * (testable); the drawing is in screens/MedalHall.tsx.
 */
import { medals, type Medal } from '../content/medals.ts'
import { isSolidTile, size, type ResortMap, type Spot } from './maps.ts'
import type { Facing } from '../sprites/overworld.ts'

export const hall: ResortMap = {
  id: 'medalHall',
  name: 'MEDAL HALL',
  rows: [
    'XXXXXXXXXXXXXX',
    'XXXXXXXXXXXXXX',
    'XtooooooooootX',
    'XooooooooooooX',
    'XooooaaaaooooX',
    'XooooaaaaooooX',
    'X|ooooccoooo|X',
    'XoooooccoooooX',
    'XtooooccooootX',
    'XXXXXXmmXXXXXX',
  ],
  warps: [],
  things: [],
}

export type Tier = Medal['tier']

/** A display case: its footprint on the back row and how its medals are laid out (left to right, top to bottom). */
export interface Case {
  tier: Tier
  x: number
  y: number
  cols: number
  rows: number
  medals: Medal[]
}

const byTier = (t: Tier) => medals.filter((m) => m.tier === t)
export const CASES: Case[] = [
  { tier: 'silver', x: 2, y: 2, cols: 3, rows: 3, medals: byTier('silver') },
  { tier: 'gold', x: 6, y: 2, cols: 2, rows: 2, medals: byTier('gold') },
  { tier: 'bronze', x: 9, y: 2, cols: 3, rows: 3, medals: byTier('bronze') },
]

/** The podium in the middle of the gold carpet (two tiles). */
export const PODIUM = { x: 6, y: 4, w: 2 }
/** The curator, by the door. */
export const CURATOR: Spot & { facing: Facing } = { x: 3, y: 7, facing: 'right' }
/** Where Aaryan walks in (just inside the door) and the door mat that leads out. */
export const ENTRANCE: Spot & { facing: Facing } = { x: 7, y: 8, facing: 'up' }
export const DOOR: Spot[] = [
  { x: 6, y: 9 },
  { x: 7, y: 9 },
]

/** Which case, and which slot in it, a medal is shown in. */
export function slotOf(index: number): { c: Case; col: number; row: number } {
  const m = medals[index]
  const c = CASES.find((k) => k.tier === m.tier)!
  const i = c.medals.indexOf(m)
  return { c, col: i % c.cols, row: Math.floor(i / c.cols) }
}

/** Where to stand to look at a medal: on the floor in front of its column of the case, facing it. */
export function standFor(index: number): Spot & { facing: Facing } {
  const { c, col } = slotOf(index)
  return { x: c.x + col, y: c.y + 1, facing: 'up' }
}

/** Anything you can't walk through: the walls, plants and pillars, the cases, the podium, the curator. */
export function blocked(x: number, y: number): boolean {
  const { w, h } = size(hall)
  if (x < 0 || y < 0 || x >= w || y >= h) return true
  if (DOOR.some((d) => d.x === x && d.y === y)) return false
  if (CASES.some((c) => y === c.y && x >= c.x && x < c.x + c.cols)) return true
  if (y === PODIUM.y && x >= PODIUM.x && x < PODIUM.x + PODIUM.w) return true
  if (x === CURATOR.x && y === CURATOR.y) return true
  return isSolidTile(hall, x, y)
}

/**
 * The shortest walk from one tile to another, one tile at a time (no diagonals), as the list of
 * tiles to step onto; empty if you're there already or it can't be reached. The door mat is only
 * walked onto when it's where you're going (so a walk never leaves the room on the way past).
 */
export function pathTo(from: Spot, to: Spot): Spot[] {
  if (from.x === to.x && from.y === to.y) return []
  const { w, h } = size(hall)
  const key = (x: number, y: number) => y * w + x
  const prev = new Map<number, number>([[key(from.x, from.y), -1]])
  const queue: Spot[] = [from]
  const isDoor = (x: number, y: number) => DOOR.some((d) => d.x === x && d.y === y)
  while (queue.length) {
    const p = queue.shift()!
    if (p.x === to.x && p.y === to.y) {
      const out: Spot[] = []
      for (let k = key(p.x, p.y); k !== key(from.x, from.y); k = prev.get(k)!) out.unshift({ x: k % w, y: Math.floor(k / w) })
      return out
    }
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const x = p.x + dx
      const y = p.y + dy
      if (x < 0 || y < 0 || x >= w || y >= h || prev.has(key(x, y)) || blocked(x, y)) continue
      if (isDoor(x, y) && !(x === to.x && y === to.y)) continue
      prev.set(key(x, y), key(p.x, p.y))
      queue.push({ x, y })
    }
  }
  return []
}

/** The nearest walkable tile to (x, y), for a tap that lands on something solid. */
export function nearestFloor(x: number, y: number): Spot | null {
  const { w, h } = size(hall)
  let best: Spot | null = null
  let bd = Infinity
  for (let ty = 0; ty < h; ty++)
    for (let tx = 0; tx < w; tx++) {
      if (blocked(tx, ty) || DOOR.some((d) => d.x === tx && d.y === ty)) continue
      const d = (tx - x) ** 2 + (ty - y) ** 2
      if (d < bd) {
        bd = d
        best = { x: tx, y: ty }
      }
    }
  return best
}
