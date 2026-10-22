/**
 * The Medal Hall: every medal has a slot in its tier's case, and every slot can be walked up to
 * from the door; walks go around the cases, podium and curator and never out through the door.
 */
import { describe, expect, it } from 'vitest'
import { medals } from '../content/medals'
import { size } from './maps'
import { blocked, CASES, CURATOR, DOOR, ENTRANCE, hall, nearestFloor, pathTo, PODIUM, slotOf, standFor } from './medalHall'

describe('the Medal Hall', () => {
  it('has a rectangular map', () => {
    const { w } = size(hall)
    for (const row of hall.rows) expect(row.length).toBe(w)
  })

  it('shows every medal once, in its own tier’s case, in a slot that fits', () => {
    const shown = CASES.flatMap((c) => c.medals.map((m) => m.id))
    expect(shown.sort()).toEqual(medals.map((m) => m.id).sort())
    for (const c of CASES) {
      expect(c.medals.length, c.tier).toBeLessThanOrEqual(c.cols * c.rows)
      for (const m of c.medals) expect(m.tier).toBe(c.tier)
    }
    medals.forEach((m, i) => {
      const { c, col, row } = slotOf(i)
      expect(c.tier).toBe(m.tier)
      expect(col).toBeLessThan(c.cols)
      expect(row).toBeLessThan(c.rows)
    })
  })

  it('can walk from the door to stand in front of every medal', () => {
    medals.forEach((_, i) => {
      const s = standFor(i)
      expect(blocked(s.x, s.y), `medal ${i}`).toBe(false)
      const path = pathTo(ENTRANCE, s)
      expect(path.length, `medal ${i}`).toBeGreaterThan(0)
      expect(path[path.length - 1]).toEqual({ x: s.x, y: s.y })
    })
  })

  it('walks one tile at a time, around everything solid, and only onto the door mat when going out', () => {
    const path = pathTo({ x: 2, y: 3 }, { x: 11, y: 8 })
    let at = { x: 2, y: 3 }
    for (const p of path) {
      expect(Math.abs(p.x - at.x) + Math.abs(p.y - at.y)).toBe(1)
      expect(blocked(p.x, p.y)).toBe(false)
      expect(DOOR.some((d) => d.x === p.x && d.y === p.y)).toBe(false)
      at = p
    }
    const out = pathTo(ENTRANCE, DOOR[0])
    expect(out[out.length - 1]).toEqual(DOOR[0])
  })

  it('blocks the cases, the podium and the curator', () => {
    for (const c of CASES) for (let x = c.x; x < c.x + c.cols; x++) expect(blocked(x, c.y)).toBe(true)
    for (let x = PODIUM.x; x < PODIUM.x + PODIUM.w; x++) expect(blocked(x, PODIUM.y)).toBe(true)
    expect(blocked(CURATOR.x, CURATOR.y)).toBe(true)
  })

  it('finds open floor near a tap on something solid', () => {
    const f = nearestFloor(PODIUM.x, PODIUM.y)
    expect(f && blocked(f.x, f.y)).toBe(false)
  })
})
