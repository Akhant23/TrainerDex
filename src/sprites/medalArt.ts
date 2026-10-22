/** The medal's pixel art, shared by the medal case, the Medal Box and the Medal Hall's display cases. */
import { Grid } from './raster.ts'

export const MEDAL_TIER_COLOURS = {
  bronze: { A: '#d8904a', a: '#985a24', W: '#ffd8a8' },
  silver: { A: '#d0d6e4', a: '#8890a8', W: '#ffffff' },
  gold: { A: '#f0c040', a: '#b08010', W: '#fff6c0' },
}

/** A medal on its ribbon, 14×16 (R and B: the ribbon's two halves; A/a/W: the tier's metal, its shade and shine). */
export const medalPixels = (() => {
  const g = new Grid(14, 16)
  g.poly([[3, 0], [6, 0], [7, 6], [4, 6]], 'R').poly([[11, 0], [8, 0], [7, 6], [10, 6]], 'B')
  g.ellipse(7, 10, 5, 5, 'A', 'a', 'W')
  g.outline()
  g.stamp(6, 8, ['.W.', 'WWW', '.W.'])
  return g.toPixels()
})()
