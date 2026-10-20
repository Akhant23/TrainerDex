/**
 * Original battle creatures (40×40), built from shapes in raster.ts and auto-outlined.
 * Six belong to Aaryan's team; three are the visitor's starters.
 */
import { Grid } from './raster.ts'
import type { Palette, Pixels } from './pixels.ts'

export const CREATURE_SIZE = 40
const K = '#1c1a24'

export interface CreatureArt {
  palette: Palette
  pixels: Pixels
}

function grid() {
  return new Grid(CREATURE_SIZE, CREATURE_SIZE)
}

/* ---------------- Aaryan's team ---------------- */

function gavelion(): CreatureArt {
  const g = grid()
  // robe body + feet
  g.ellipse(20, 30, 10, 8, 'R', 'r', 'Q')
  g.ellipse(14, 37, 3, 1.5, 'F', 'f').ellipse(26, 37, 3, 1.5, 'F', 'f')
  g.rect(19, 23, 20, 29, 'W')
  // mane with spikes
  g.poly([[6, 15], [1, 11], [8, 9]], 'M').poly([[34, 15], [39, 11], [32, 9]], 'M')
  g.poly([[7, 22], [3, 24], [9, 18]], 'M').poly([[33, 22], [37, 24], [31, 18]], 'M')
  g.ellipse(20, 15, 13, 11, 'M', 'm')
  g.ellipse(20, 17, 8, 7, 'F', 'f')
  // barrister's wig
  g.ellipse(20, 7, 9, 4, 'W', 'w')
  g.ellipse(11, 10, 2, 2, 'W', 'w').ellipse(29, 10, 2, 2, 'W', 'w').ellipse(11, 14, 2, 2, 'W', 'w').ellipse(29, 14, 2, 2, 'W', 'w')
  // paws + gavel
  g.ellipse(10, 29, 2.5, 2, 'F', 'f')
  g.rect(28, 18, 36, 22, 'G').rect(28, 18, 36, 18, 'g')
  g.line(32, 22, 32, 29, 'G', 2)
  g.ellipse(31, 29, 2.5, 2, 'F', 'f')
  g.outline()
  // face
  g.stamp(16, 15, ['WK', 'KK', 'KK'])
  g.stamp(23, 15, ['WK', 'KK', 'KK'])
  g.stamp(19, 19, ['NN', 'KK'])
  g.stamp(17, 21, ['K....K', '.KKKK.'])
  g.set(14, 19, 'P').set(26, 19, 'P')
  return {
    pixels: g.toPixels(),
    palette: { K, R: '#2c2c3c', r: '#1e1e2a', Q: '#4a4a5e', W: '#f4f4ee', w: '#c8c8d0', M: '#e0a030', m: '#b07018', F: '#f0c878', f: '#d0a050', N: '#6a3a2a', P: '#f08080', G: '#8a5a2a', g: '#c08a50' },
  }
}

function helixor(): CreatureArt {
  const g = grid()
  const pts: Array<[number, number]> = []
  for (let i = 0; i <= 28; i++) {
    const t = i / 28
    pts.push([20 + 9 * Math.sin(t * Math.PI * 2.2), 36 - t * 24])
  }
  pts.forEach(([x, y]) => g.ellipse(x, y, 3.6, 3.6, 'T', 't'))
  pts.forEach(([x, y], i) => i % 4 === 2 && g.rect(Math.round(x) - 2, Math.round(y), Math.round(x) + 2, Math.round(y), i % 8 === 2 ? 'P' : 'Y'))
  const [hx, hy] = pts[pts.length - 1]
  g.ellipse(hx, hy - 2, 7, 6, 'T', 't')
  g.rect(Math.round(hx) - 7, Math.round(hy) - 4, Math.round(hx) + 7, Math.round(hy) - 3, 'K')
  g.ellipse(hx - 3, hy - 3, 2.2, 2.2, 'L', 'l').ellipse(hx + 3, hy - 3, 2.2, 2.2, 'L', 'l')
  g.line(hx, hy + 4, hx + 1, hy + 7, 'R')
  g.outline()
  g.set(hx - 3, hy - 3, 'K').set(hx + 3, hy - 3, 'K').set(hx - 4, hy - 4, 'W').set(hx + 2, hy - 4, 'W')
  return {
    pixels: g.toPixels(),
    palette: { K, T: '#3fb8a0', t: '#24806e', P: '#f070a0', Y: '#f8d040', L: '#d8f0ff', l: '#90b8d8', R: '#e0383e', W: '#ffffff' },
  }
}

function brushfox(): CreatureArt {
  const g = grid()
  g.ellipse(31, 27, 6, 8, 'O', 'o')
  g.ellipse(33, 20, 4, 4, 'V', 'v')
  g.ellipse(19, 29, 8, 7, 'O', 'o')
  g.ellipse(18, 31, 4, 4, 'W', 'w')
  g.rect(13, 34, 15, 38, 'O').rect(21, 34, 23, 38, 'o')
  g.poly([[10, 13], [11, 3], [17, 10]], 'O').poly([[20, 10], [25, 3], [26, 13]], 'O')
  g.poly([[12, 11], [12, 6], [15, 10]], 'P').poly([[22, 10], [24, 6], [24, 11]], 'P')
  g.ellipse(18, 16, 8, 7, 'O', 'o')
  g.ellipse(18, 19, 4, 3, 'W', 'w')
  g.ellipse(17, 7, 6, 2.5, 'R', 'r')
  g.outline()
  g.set(17, 4, 'K')
  g.stamp(14, 15, ['WK', 'KK'])
  g.stamp(21, 15, ['WK', 'KK'])
  g.stamp(17, 18, ['KK'])
  g.set(35, 30, 'V').set(36, 33, 'v').set(29, 37, 'V')
  return {
    pixels: g.toPixels(),
    palette: { K, O: '#f08030', o: '#b85818', W: '#fff4e8', w: '#e0c8b0', V: '#a060e0', v: '#6030a0', P: '#f8a0b8', R: '#e0383e', r: '#9a2028' },
  }
}

function subwoof(): CreatureArt {
  const g = grid()
  g.rect(12, 37, 15, 38, 'B').rect(25, 37, 28, 38, 'B')
  g.rect(10, 20, 30, 36, 'D').rect(29, 20, 30, 36, 'd')
  g.ellipse(20, 29, 5, 5, 'g', 'G')
  g.ellipse(20, 29, 2, 2, 'K')
  g.ellipse(11, 16, 3, 5, 'b').ellipse(29, 16, 3, 5, 'b')
  g.ellipse(20, 13, 8, 7, 'B', 'b')
  g.ellipse(20, 16, 3.5, 2.5, 'W', 'w')
  g.line(12, 9, 20, 4, 'R', 2).line(20, 4, 28, 9, 'R', 2)
  g.ellipse(11, 12, 2.2, 3, 'R', 'r').ellipse(29, 12, 2.2, 3, 'R', 'r')
  g.outline()
  g.stamp(16, 12, ['WK', 'KK'])
  g.stamp(23, 12, ['WK', 'KK'])
  g.stamp(19, 15, ['KK'])
  g.stamp(18, 17, ['K..K', '.KK.'])
  g.stamp(1, 26, ['Y..', '.Y.', 'Y..']).stamp(36, 26, ['..Y', '.Y.', '..Y'])
  return {
    pixels: g.toPixels(),
    palette: { K, D: '#383848', d: '#24242e', g: '#a8b0c0', G: '#707888', B: '#b07848', b: '#805030', W: '#f8f0e0', w: '#d8c8b0', R: '#e05890', r: '#a02858', Y: '#f8d040' },
  }
}

function strikaroo(): CreatureArt {
  const g = grid()
  g.line(12, 35, 3, 28, 'B', 3)
  g.ellipse(15, 37, 5, 1.6, 'B', 'b').ellipse(24, 37, 4, 1.6, 'B', 'b')
  g.ellipse(18, 26, 7, 9, 'J', 'j')
  g.rect(12, 24, 24, 25, 'Y')
  g.ellipse(25, 22, 2, 3, 'B', 'b')
  g.ellipse(16, 5, 1.8, 4.5, 'B', 'b').ellipse(22, 4, 1.8, 4.5, 'B', 'b')
  g.ellipse(20, 12, 6, 5, 'B', 'b')
  g.ellipse(24, 14, 3, 2, 'C', 'c')
  g.ellipse(31, 34, 3.5, 3.5, 'W', 'w')
  g.outline()
  g.set(16, 3, 'P').set(16, 4, 'P').set(22, 2, 'P').set(22, 3, 'P')
  g.stamp(18, 10, ['WK', 'KK'])
  g.stamp(26, 13, ['K'])
  g.stamp(30, 33, ['K.', '.K']).stamp(32, 35, ['K'])
  g.stamp(17, 29, ['KKK', '..K', '.K.', '.K.'])
  return {
    pixels: g.toPixels(),
    palette: { K, B: '#c07840', b: '#8a5028', J: '#1f8a4c', j: '#126034', Y: '#f8c838', C: '#f0d8b0', c: '#c8b088', W: '#f8f8f8', w: '#a8b0c0', P: '#f0a0a0' },
  }
}

function hootour(): CreatureArt {
  const g = grid()
  g.line(34, 9, 34, 38, 'G', 1)
  g.poly([[35, 9], [40, 12], [35, 16]], 'R')
  g.poly([[10, 13], [11, 4], [16, 11]], 'H').poly([[30, 13], [29, 4], [24, 11]], 'H')
  g.ellipse(20, 24, 11, 13, 'H', 'h')
  g.ellipse(20, 27, 7, 8, 'C', 'c')
  g.ellipse(15, 18, 4, 4, 'W', 'w').ellipse(25, 18, 4, 4, 'W', 'w')
  g.ellipse(15, 18, 1.6, 1.6, 'K').ellipse(25, 18, 1.6, 1.6, 'K')
  g.poly([[18, 21], [22, 21], [20, 25]], 'O')
  g.rect(10, 29, 30, 31, 'Y').rect(10, 31, 30, 31, 'y')
  g.rect(24, 31, 26, 36, 'Y')
  g.ellipse(32, 26, 3, 5, 'h')
  g.ellipse(16, 38, 2, 1, 'O').ellipse(24, 38, 2, 1, 'O')
  g.outline()
  g.set(14, 17, 'W').set(24, 17, 'W')
  g.stamp(16, 24, ['c.c', '.c.']).stamp(21, 26, ['c.c', '.c.'])
  return {
    pixels: g.toPixels(),
    palette: { K, H: '#9a6a40', h: '#6a4428', C: '#f0dcb0', c: '#c8b088', W: '#ffffff', w: '#d0d8e0', O: '#f0a020', Y: '#f8d030', y: '#c8a010', G: '#6a4a2a', R: '#e0383e' },
  }
}

/* ---------------- Starters ---------------- */

function byterat(): CreatureArt {
  const g = grid()
  g.line(26, 33, 34, 32, 'L').line(34, 32, 37, 24, 'L').line(37, 24, 37, 19, 'L')
  g.ellipse(19, 29, 9, 7, 'S', 's')
  g.ellipse(18, 31, 5, 4, 'W', 'w')
  g.ellipse(12, 37, 3, 1.4, 'S', 's').ellipse(24, 37, 3, 1.4, 'S', 's')
  g.ellipse(10, 11, 3.5, 3.5, 'S', 's').ellipse(20, 10, 3.5, 3.5, 'S', 's')
  g.ellipse(10, 11, 1.8, 1.8, 'P').ellipse(20, 10, 1.8, 1.8, 'P')
  g.ellipse(15, 19, 7, 6, 'S', 's')
  g.ellipse(8, 21, 2.5, 2, 'S', 's')
  g.rect(9, 17, 20, 18, 'L')
  g.outline()
  g.rect(9, 16, 20, 16, 'K').rect(9, 19, 20, 19, 'K')
  g.set(12, 17, 'W').set(17, 17, 'W')
  g.set(6, 21, 'P')
  g.stamp(10, 23, ['K.K', '.K.'])
  g.set(34, 32, 'Y').set(37, 24, 'Y').set(37, 18, 'Y')
  return {
    pixels: g.toPixels(),
    palette: { K, S: '#7088b0', s: '#4a5e88', W: '#e8eef8', w: '#b8c4d8', P: '#f0a0b8', L: '#40e0f0', Y: '#f8d040' },
  }
}

function beakerbun(): CreatureArt {
  const g = grid()
  g.ellipse(17, 3, 1.6, 4.5, 'W', 'w').ellipse(23, 3, 1.6, 4.5, 'W', 'w')
  g.ellipse(20, 9, 5.5, 4.5, 'W', 'w')
  g.ellipse(20, 29, 11, 9, 'L', 'l')
  g.rect(16, 14, 24, 21, 'L').rect(23, 14, 24, 21, 'l')
  // liquid fills the bottom of the flask
  for (let y = 28; y < 40; y++) for (let x = 0; x < 40; x++) {
    const c = g.get(x, y)
    if (c === 'L') g.set(x, y, 'G')
    if (c === 'l') g.set(x, y, 'g')
  }
  g.rect(15, 13, 25, 13, 'w')
  g.outline()
  g.set(17, 1, 'P').set(17, 2, 'P').set(23, 1, 'P').set(23, 2, 'P')
  g.stamp(17, 8, ['K....K'])
  g.stamp(19, 10, ['PK'])
  g.stamp(13, 22, ['W', 'W', 'W']).stamp(14, 25, ['W'])
  g.stamp(18, 31, ['.W.', 'W.W', '.W.']).stamp(24, 34, ['W']).stamp(14, 33, ['W'])
  return {
    pixels: g.toPixels(),
    palette: { K, W: '#ffffff', w: '#d0d8e0', P: '#f8a0b8', L: '#c8ecff', l: '#88c0e8', G: '#58c870', g: '#2f9048' },
  }
}

function riffin(): CreatureArt {
  const g = grid()
  g.ellipse(14, 38, 3, 1.2, 'O').ellipse(22, 38, 3, 1.2, 'O')
  g.ellipse(18, 25, 9, 11, 'D', 'd')
  g.ellipse(18, 28, 6, 8, 'W', 'w')
  g.ellipse(18, 12, 7, 6, 'D', 'd')
  g.ellipse(17, 13, 4.5, 4, 'W', 'w')
  g.poly([[21, 10], [30, 13], [21, 17]], 'O')
  g.rect(21, 12, 22, 15, 'Y')
  g.line(28, 27, 37, 17, 'G', 2)
  g.rect(36, 14, 38, 17, 'G')
  g.ellipse(27, 31, 5, 4, 'R', 'r')
  g.ellipse(23, 30, 3, 3, 'R', 'r')
  g.ellipse(13, 26, 3, 5, 'D', 'd')
  g.outline()
  g.stamp(16, 12, ['KR', 'KK'])
  g.ellipse(26, 31, 1, 1, 'K')
  g.rect(29, 28, 34, 28, 'w')
  return {
    pixels: g.toPixels(),
    palette: { K, D: '#2a2a3a', d: '#18181f', W: '#f8f8f4', w: '#c8ccd8', O: '#f07828', Y: '#f8d040', R: '#e04040', r: '#a02828', G: '#8a5a2a' },
  }
}


/* ---------------- Introduced in the Battle Tower ---------------- */

function wicketoad(): CreatureArt {
  const g = grid()
  // cricket bat held over the shoulder
  g.line(30, 33, 36, 10, 'B', 3).line(36, 10, 37, 6, 'b', 2)
  g.ellipse(20, 29, 12, 9, 'G', 'g')
  g.ellipse(20, 31, 8, 6, 'L', 'l')
  g.ellipse(11, 37, 4, 1.6, 'G', 'g').ellipse(29, 37, 4, 1.6, 'G', 'g')
  g.ellipse(19, 17, 10, 7, 'G', 'g')
  g.ellipse(13, 11, 4, 4, 'G', 'g').ellipse(25, 11, 4, 4, 'G', 'g')
  // a navy cap
  g.ellipse(19, 9, 6, 3, 'N', 'n').rect(19, 10, 28, 11, 'n')
  g.ellipse(19, 22, 6, 2.6, 'L', 'l')
  g.ellipse(30, 29, 3, 2.5, 'G', 'g')
  g.outline()
  g.ellipse(13, 12, 2.2, 2.2, 'W').ellipse(25, 12, 2.2, 2.2, 'W')
  g.set(13, 12, 'K').set(14, 12, 'K').set(25, 12, 'K').set(26, 12, 'K')
  g.stamp(14, 19, ['K..........K', '.KKKKKKKKKK.'])
  return {
    pixels: g.toPixels(),
    palette: { K, G: '#5cb048', g: '#3a8030', L: '#d8f0a0', l: '#b0d070', W: '#ffffff', B: '#ecd49c', b: '#b8945a', N: '#26345e', n: '#161f3c' },
  }
}

function campfly(): CreatureArt {
  const g = grid()
  // glow
  g.ellipse(25, 29, 11, 9, 'g')
  g.ellipse(11, 12, 7, 4.5, 'V', 'v').ellipse(27, 11, 7, 4.5, 'V', 'v')
  g.ellipse(25, 29, 7.5, 6.5, 'Y', 'y', 'W')
  g.ellipse(18, 21, 6, 5, 'B', 'b')
  g.ellipse(15, 14, 6.5, 6, 'B', 'b')
  g.line(12, 8, 8, 2, 'B').line(18, 8, 21, 2, 'B')
  g.ellipse(8, 2, 1.5, 1.5, 'Y').ellipse(21, 2, 1.5, 1.5, 'Y')
  // little legs + a flag
  g.line(15, 26, 13, 33, 'B').line(20, 26, 21, 33, 'B')
  g.line(6, 34, 6, 18, 'F').rect(6, 18, 12, 22, 'R')
  g.outline()
  g.ellipse(12, 14, 2, 2.2, 'W').ellipse(18, 14, 2, 2.2, 'W')
  g.set(12, 15, 'K').set(18, 15, 'K')
  g.stamp(13, 18, ['K..K', '.KK.'])
  return {
    pixels: g.toPixels(),
    palette: { K, B: '#3a3c58', b: '#24263a', V: '#d8ecff', v: '#a8c4e8', Y: '#fff070', y: '#f0c030', W: '#ffffff', g: '#fff8c0', F: '#8a5a2a', R: '#f4c838' },
  }
}

function megaphawk(): CreatureArt {
  const g = grid()
  // wings + body
  g.poly([[8, 22], [1, 34], [12, 32]], 'D').poly([[30, 22], [38, 33], [27, 32]], 'd')
  g.ellipse(19, 27, 10, 10, 'D', 'd')
  g.ellipse(19, 30, 6, 6.5, 'C', 'c')
  g.ellipse(14, 38, 3, 1.3, 'Y').ellipse(24, 38, 3, 1.3, 'Y')
  g.ellipse(17, 13, 8, 7.5, 'D', 'd')
  g.poly([[12, 7], [9, 0], [16, 5]], 'D').poly([[16, 6], [16, 0], [20, 5]], 'd')
  // megaphone beak
  g.poly([[23, 11], [37, 6], [37, 21], [23, 17]], 'W')
  g.poly([[23, 15], [37, 15], [37, 21], [23, 17]], 'w')
  g.rect(22, 11, 24, 17, 'R')
  g.outline()
  g.rect(36, 7, 37, 20, 'R')
  g.ellipse(17, 12, 2.4, 2.4, 'W').set(18, 12, 'K').set(18, 13, 'K')
  g.line(13, 9, 19, 10, 'K')
  for (const [x, y] of [[38, 4], [39, 12], [38, 22]]) g.set(x, y, 'Y')
  return {
    pixels: g.toPixels(),
    palette: { K, D: '#8a5430', d: '#5e361c', C: '#f4e2c4', c: '#d8c09c', W: '#f8f8f4', w: '#c8ccd8', R: '#e0383e', Y: '#f8c030' },
  }
}

function stitchick(): CreatureArt {
  const g = grid()
  g.ellipse(20, 24, 13, 13, 'Y', 'y', 'W')
  // the hoodie: lower half, hood behind the head
  g.poly([[7, 25], [33, 25], [32, 36], [8, 36]], 'H')
  g.rect(26, 25, 32, 36, 'h')
  g.rect(14, 29, 26, 34, 'h')
  g.ellipse(14, 38, 2.5, 1.3, 'O').ellipse(26, 38, 2.5, 1.3, 'O')
  // needle and thread
  g.line(31, 18, 38, 6, 'X', 1).set(38, 5, 'X')
  g.line(38, 7, 36, 12, 'R').line(36, 12, 33, 13, 'R')
  g.outline()
  g.rect(14, 29, 26, 29, 'K')
  g.line(17, 25, 17, 30, 'W').line(23, 25, 23, 30, 'W')
  g.ellipse(15, 18, 1.8, 2.2, 'K').ellipse(25, 18, 1.8, 2.2, 'K')
  g.set(15, 17, 'W').set(25, 17, 'W')
  g.poly([[18, 20], [22, 20], [20, 23]], 'O')
  g.set(11, 21, 'P').set(29, 21, 'P')
  return {
    pixels: g.toPixels(),
    palette: { K, Y: '#f8d848', y: '#d0a820', W: '#fff8d8', H: '#a890e0', h: '#7860b0', O: '#f08a28', X: '#d8dee8', R: '#e04848', P: '#f8a0a0' },
  }
}

function diplomoth(): CreatureArt {
  const g = grid()
  g.ellipse(10, 15, 9, 9, 'M', 'm').ellipse(30, 15, 9, 9, 'M', 'm')
  g.ellipse(11, 29, 7, 6, 'M', 'm').ellipse(29, 29, 7, 6, 'M', 'm')
  g.ellipse(10, 15, 4, 4, 'V', 'v').ellipse(30, 15, 4, 4, 'V', 'v')
  g.ellipse(20, 24, 4, 10, 'G', 'g')
  g.ellipse(20, 15, 6, 3, 'W', 'w')
  g.ellipse(20, 10, 5, 4.5, 'G', 'g')
  g.line(18, 6, 14, 0, 'G').line(22, 6, 26, 0, 'G')
  // placard
  g.line(20, 30, 20, 39, 'F', 2).rect(13, 31, 27, 37, 'W')
  g.outline()
  g.set(18, 10, 'K').set(22, 10, 'K').set(18, 9, 'W').set(22, 9, 'W')
  g.line(15, 33, 25, 33, 'K').line(15, 35, 22, 35, 'K')
  for (const x of [13, 15, 25, 27]) g.set(x, 1, 'G')
  return {
    pixels: g.toPixels(),
    palette: { K, M: '#d8c8a0', m: '#b0a078', V: '#6a5ab0', v: '#4a3a88', G: '#6a6a7a', g: '#4a4a58', W: '#f8f8f4', w: '#d0d0d8', F: '#8a5a2a' },
  }
}

function datadillo(): CreatureArt {
  const g = grid()
  g.ellipse(29, 34, 6, 2, 'S', 's')
  g.ellipse(22, 25, 14, 11, 'A', 'a', 'Q')
  for (let x = 12; x <= 32; x += 5) g.line(x, 15, x + 1, 35, 'a')
  g.ellipse(8, 29, 6, 5, 'S', 's')
  g.ellipse(6, 22, 2, 3, 'S', 's')
  g.line(35, 30, 39, 33, 'A', 2)
  g.ellipse(12, 37, 2.5, 1.5, 'S', 's').ellipse(30, 37, 2.5, 1.5, 'S', 's')
  g.outline()
  // circuit lines glowing across the plates
  g.line(17, 18, 17, 24, 'C').line(17, 24, 23, 24, 'C').line(23, 24, 23, 30, 'C').line(28, 17, 28, 22, 'C')
  g.set(17, 18, 'W').set(23, 30, 'W').set(28, 17, 'W')
  g.set(6, 28, 'K').set(2, 31, 'P')
  return {
    pixels: g.toPixels(),
    palette: { K, A: '#6a7a98', a: '#4a5674', Q: '#8e9cb8', S: '#e0b4a0', s: '#b88a78', C: '#40e0f0', W: '#ffffff', P: '#f08098' },
  }
}

export const creatureArt: Record<string, CreatureArt> = {
  gavelion: gavelion(),
  helixor: helixor(),
  brushfox: brushfox(),
  subwoof: subwoof(),
  strikaroo: strikaroo(),
  hootour: hootour(),
  byterat: byterat(),
  beakerbun: beakerbun(),
  riffin: riffin(),
  wicketoad: wicketoad(),
  campfly: campfly(),
  megaphawk: megaphawk(),
  stitchick: stitchick(),
  diplomoth: diplomoth(),
  datadillo: datadillo(),
}

/** The TRAINERDEX BADGE — earned by beating Aaryan. */
export const trainerdexBadge: CreatureArt = (() => {
  const g = new Grid(16, 16)
  g.ellipse(7.5, 7.5, 7, 7, 'A', 'a', 'W')
  g.ellipse(7.5, 7.5, 4, 4, 'R', 'r')
  g.outline()
  g.stamp(4, 4, ['...W...', '...W...', '..WWW..', 'WWWWWWW', '..WWW..', '...W...', '...W...'])
  return { pixels: g.toPixels(), palette: { K, A: '#f0c040', a: '#b08010', W: '#fff6c0', R: '#e0383e', r: '#9a2028' } }
})()
