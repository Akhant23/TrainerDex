/**
 * Overworld ("walking") sprite: a chibi Aaryan, 20×28, in the same palette as the battle sprite.
 * Directions: down / up / left (right is left mirrored). Frames per direction: stand, step A, step B.
 */
import { Grid, flipX } from './raster.ts'
import type { Pixels } from './pixels.ts'

export type Facing = 'down' | 'up' | 'left' | 'right'
export const OW_W = 20
export const OW_H = 28

function legs(g: Grid, step: 0 | 1 | 2) {
  const left = step === 1 ? 1 : step === 2 ? -1 : 0
  const right = -left
  g.rect(6, 23, 9, 25 + left, 'P').rect(10, 23, 13, 25 + right, 'P')
  g.rect(6, 26 + left, 9, 26 + left, 'B').rect(10, 26 + right, 13, 26 + right, 'B')
}

function arms(g: Grid, step: 0 | 1 | 2) {
  const l = step === 1 ? -1 : step === 2 ? 1 : 0
  g.rect(3, 17 + l, 4, 21 + l, 'W').rect(3, 22 + l, 4, 22 + l, 'S')
  g.rect(15, 17 - l, 16, 21 - l, 'W').rect(15, 22 - l, 16, 22 - l, 'S')
}

function down(step: 0 | 1 | 2): Pixels {
  const g = new Grid(OW_W, OW_H)
  legs(g, step)
  arms(g, step)
  g.rect(5, 17, 14, 22, 'W').rect(5, 17, 6, 18, 'R').rect(13, 17, 14, 18, 'R').rect(5, 19, 5, 22, 'r').rect(14, 19, 14, 22, 'w')
  g.ellipse(3.5, 11, 1.2, 1.6, 'S').ellipse(16.5, 11, 1.2, 1.6, 'S')
  g.ellipse(10, 11, 6, 5.5, 'S', 's')
  g.ellipse(10, 7, 7.5, 5.5, 'H', 'h')
  g.poly([[3, 7], [17, 7], [16, 11], [13, 9], [10, 11], [7, 9], [4, 11]], 'H')
  g.outline()
  g.stamp(5, 11, ['KLLLKKKLLLK'])
  g.set(7, 11, 'K').set(13, 11, 'K')
  g.set(10, 14, 's').set(9, 15, 'M').set(10, 15, 'M').set(11, 15, 'M')
  g.set(10, 17, 'N').set(3, 12, 'N')
  return g.toPixels()
}

function up(step: 0 | 1 | 2): Pixels {
  const g = new Grid(OW_W, OW_H)
  legs(g, step)
  arms(g, step)
  g.rect(5, 17, 14, 22, 'W').rect(5, 17, 6, 18, 'R').rect(13, 17, 14, 18, 'R').rect(5, 19, 5, 22, 'w').rect(14, 19, 14, 22, 'r')
  g.ellipse(3.5, 11, 1.2, 1.6, 'S').ellipse(16.5, 11, 1.2, 1.6, 'S')
  g.ellipse(10, 11, 6, 5.5, 'H')
  g.ellipse(10, 7, 7.5, 5.5, 'H')
  g.ellipse(7, 5, 2, 1.2, 'h')
  g.rect(8, 16, 12, 16, 's')
  g.outline()
  g.stamp(8, 18, ['KKK', '..K', '.K.', '.K.'])
  return g.toPixels()
}

function left(step: 0 | 1 | 2): Pixels {
  const g = new Grid(OW_W, OW_H)
  // legs in stride
  if (step === 0) g.rect(8, 23, 12, 25, 'P').rect(7, 26, 12, 26, 'B')
  if (step === 1) g.rect(11, 23, 13, 25, 'P').rect(11, 26, 14, 26, 'B').rect(6, 23, 8, 25, 'P').rect(5, 26, 8, 26, 'B')
  if (step === 2) g.rect(9, 23, 11, 25, 'P').rect(8, 26, 11, 26, 'B')
  g.rect(7, 17, 13, 22, 'W').rect(7, 17, 13, 17, 'R').rect(13, 18, 13, 22, 'w')
  const ax = step === 1 ? 7 : step === 2 ? 11 : 9
  g.rect(ax, 18, ax + 2, 21, 'W').rect(ax, 22, ax + 2, 22, 'S').rect(ax, 18, ax + 2, 18, 'R')
  g.ellipse(14, 11, 3, 4, 'H', 'h')
  g.ellipse(9, 11, 5.5, 5.5, 'S')
  g.rect(10, 14, 12, 15, 's')
  g.ellipse(11, 7, 7, 5.5, 'H', 'h')
  g.poly([[4, 7], [13, 7], [10, 10], [7, 9], [4, 11]], 'H')
  g.ellipse(13, 11, 1.2, 1.6, 'S')
  g.outline()
  g.set(2, 12, 'S')
  g.stamp(3, 11, ['KLLLK']).set(5, 11, 'K')
  g.rect(8, 11, 12, 11, 'K')
  g.set(4, 14, 'M').set(5, 14, 'M')
  return g.toPixels()
}

const frames = {
  down: [down(0), down(1), down(2)],
  up: [up(0), up(1), up(2)],
  left: [left(0), left(1), left(2)],
}

export const overworldFrames: Record<Facing, [Pixels, Pixels, Pixels]> = {
  down: frames.down as [Pixels, Pixels, Pixels],
  up: frames.up as [Pixels, Pixels, Pixels],
  left: frames.left as [Pixels, Pixels, Pixels],
  right: frames.left.map(flipX) as [Pixels, Pixels, Pixels],
}

/** Walk cycle order: stand, step A, stand, step B. */
export const WALK_CYCLE = [0, 1, 0, 2] as const
