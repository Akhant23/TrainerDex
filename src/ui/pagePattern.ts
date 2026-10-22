/**
 * The page's backdrop pattern: the site's own menu icons, as faint one-colour silhouettes on the
 * deep navy, set out on a staggered grid so the tile repeats seamlessly in every direction (like
 * the patterned menu backdrops of the Gen V games). Drawn once at startup into a data URL and set
 * as --page-pattern on the root; index.css lays it over the body and drifts it slowly.
 */
import { icons, type IconName } from '../sprites/icons'

/** The tile, in CSS px: four icons, two to a row, the second row shifted half a tile across. */
const TILE = 128
const SCALE = 2
const MOTIFS: IconName[] = ['pokedex', 'battle', 'music', 'settings']

export function installPagePattern() {
  if (typeof document === 'undefined') return
  const d = Math.max(1, Math.round(window.devicePixelRatio || 1))
  const c = document.createElement('canvas')
  c.width = TILE * d
  c.height = TILE * d
  const g = c.getContext('2d')
  if (!g) return
  const p = SCALE * d
  // each motif as line art: only the icon's ink outline pixels, so it reads as the icon, not a block
  const stamp = (name: IconName, x0: number, y0: number, fill: string) => {
    g.fillStyle = fill
    icons[name].forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch !== 'K') return
        // wrap round the tile's edges so a motif that crosses one continues on the far side
        for (const ox of [0, -TILE, TILE])
          for (const oy of [0, -TILE, TILE]) g.fillRect((x0 + ox) * d + x * p, (y0 + oy) * d + y * p, p, p)
      }),
    )
  }
  const half = TILE / 2
  const at: Array<[number, number]> = [
    [half / 2 - 16, half / 2 - 16],
    [half + half / 2 - 16, half / 2 - 16],
    [half - 16, half + half / 2 - 16],
    [-16, half + half / 2 - 16],
  ]
  // a few shades lighter than the navy with a dark drop below-right, as if pressed into it (faint,
  // so the game windows stay the focus)
  MOTIFS.forEach((m, i) => stamp(m, at[i][0] + 1, at[i][1] + 1, 'rgba(4,6,18,0.4)'))
  MOTIFS.forEach((m, i) => stamp(m, at[i][0], at[i][1], 'rgba(120,150,224,0.22)'))
  // small four-point sparkles in the gaps
  g.fillStyle = 'rgba(255,255,255,0.09)'
  for (const [x, y] of [[half, half / 2], [0, half / 2], [half / 2, half + half / 2], [half + half / 2, half + half / 2]] as const) {
    g.fillRect((x - 1) * d, (y - 5) * d, 2 * d, 10 * d)
    g.fillRect((x - 5) * d, (y - 1) * d, 10 * d, 2 * d)
  }
  document.documentElement.style.setProperty('--page-pattern', `url(${c.toDataURL()})`)
  document.documentElement.style.setProperty('--page-pattern-size', `${TILE}px`)
}
