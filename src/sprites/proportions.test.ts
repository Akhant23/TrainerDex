/**
 * Head proportions for every human sprite (the walkers in all four directions, and the large
 * sprite): heads about as wide as the shoulders, not wider; side views not deeper than they're
 * wide; each hairstyle its own width; and the head steady through the walk cycle.
 */
import { describe, expect, it } from 'vitest'
import { overworldFor } from './overworld'
import { renderPose } from './character'
import { signature } from '../content/aaryan'
import { regulars } from '../resort/regulars'
import type { Appearance } from './character'

const HAIRS: Appearance['hair'][] = ['wavy', 'mullet', 'curtains', 'short', 'spiky', 'curly', 'long', 'bun', 'buzz']
const looks: Appearance[] = [signature, ...regulars.map((r) => r.look), ...HAIRS.map((hair) => ({ ...signature, hair, accessories: [] }))]
/** Width of the painted pixels between two rows. */
const span = (px: string[], y0: number, y1: number) => {
  let a = 999
  let b = -1
  for (let y = y0; y <= y1; y++)
    for (let x = 0; x < px[y].length; x++)
      if (px[y][x] !== '.') {
        a = Math.min(a, x)
        b = Math.max(b, x)
      }
  return b - a + 1
}
/** Walker rows above the shoulders (the head and hair). */
const HEAD_ROWS = 35

describe('walker heads', () => {
  // a hat's brim may stand a little proud of the head (a bucket hat's all round, a cap's peak)
  const brim = (l: Appearance) => (l.hat === 'none' ? 0 : 2)

  it('are no wider than a compact BW head (≤ 27 art px, 13½ world px, outline included) and no narrower than 22', () => {
    for (const l of looks)
      for (const dir of ['down', 'up'] as const) {
        const w = span(overworldFor(l)[dir][0], 0, HEAD_ROWS)
        expect(w, `${l.hair}/${l.hat} ${dir}`).toBeLessThanOrEqual(27 + brim(l))
        expect(w, `${l.hair} ${dir}`).toBeGreaterThanOrEqual(22)
      }
  })

  it('in profile are a little longer front to back than they are wide, as heads are (≤ 28 art px)', () => {
    for (const l of looks) for (const dir of ['left', 'right'] as const) expect(span(overworldFor(l)[dir][0], 0, HEAD_ROWS), `${l.hair}/${l.hat} ${dir}`).toBeLessThanOrEqual(28 + brim(l))
  })

  it('differ with the hairstyle: one shared underlying head, not one shared silhouette', () => {
    const widths = new Set(HAIRS.map((hair) => span(overworldFor({ ...signature, hair, accessories: [] }).down[0], 0, HEAD_ROWS)))
    expect(widths.size).toBeGreaterThan(2)
  })

  it('stay the same through the walk cycle: steps only bob the whole figure a pixel', () => {
    for (const l of looks)
      for (const dir of ['down', 'up', 'left', 'right'] as const) {
        const [stand, a, b] = overworldFor(l)[dir]
        for (const step of [a, b]) {
          const bob = stand.slice(0, HEAD_ROWS).join() === step.slice(0, HEAD_ROWS).join() ? 0 : 1
          expect(step.slice(bob, HEAD_ROWS + bob).join('\n'), `${l.hair} ${dir}`).toBe(stand.slice(0, HEAD_ROWS).join('\n'))
        }
      }
  })
})

describe('large sprite heads', () => {
  it('are no wider than the shoulders', () => {
    for (const l of looks) {
      const px = renderPose(l, {})
      expect(span(px, 0, 36), l.hair).toBeLessThanOrEqual(span(px, 42, 46))
    }
  })
})
