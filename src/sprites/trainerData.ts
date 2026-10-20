/**
 * PROTOTYPE trainer sprite, hand-placed pixel by pixel from the reference photo in
 * content-source/trainer-reference/ (wavy dark hair with a fringe, black rectangular
 * glasses, light moustache/stubble, stud earring on his right ear, silver chain, white
 * Japan-style football jersey with red stripes and flame print, black drawstring trousers,
 * black trainers, watch on his left wrist).
 *
 * The photo is a mirror selfie, so left/right have been un-mirrored: in the front view the
 * earring and flame print sit on the viewer's left, the watch on the viewer's right.
 *
 * 32 × 48 pixels. '.' = transparent. Run `npm run sprites:export` to get editable PNGs, or
 * replace the art entirely via src/content/sprites.ts (see docs/SPRITES.md).
 */
import { fromSpans, overlay, setPixels, crop, type Palette, type Pixels } from './pixels.ts'

export const TRAINER_W = 32
export const TRAINER_H = 48

export const trainerPalette: Palette = {
  K: '#1c1a24', // outline
  H: '#2b211e', // hair
  h: '#4d3a33', // hair highlight
  S: '#b9805a', // skin
  s: '#8f5c3e', // skin shadow
  M: '#7d5640', // stubble / moustache
  m: '#7a4436', // lips
  L: '#dfe9f2', // glasses lens
  N: '#c9d1da', // silver (chain, earring)
  W: '#f6f6f2', // jersey white
  w: '#c9cdd9', // jersey shadow
  R: '#d12f3c', // jersey red
  r: '#8e1f2b', // jersey dark red
  P: '#2a2a33', // trousers
  p: '#44444f', // trousers highlight
  C: '#e9dfc6', // drawstrings
  B: '#1f1f25', // shoes
  F: '#e6e6e6', // soles
}

/** Shiny variant: platinum hair, black-and-gold away kit. */
export const shinyPalette: Palette = {
  ...trainerPalette,
  H: '#d8cfc0',
  h: '#f4eee2',
  W: '#23263a',
  w: '#383d55',
  R: '#f0b830',
  r: '#a87810',
  P: '#e6e6ea',
  p: '#ffffff',
}

export const front: Pixels = fromSpans(TRAINER_W, [
  [11, 'KK.KKKK.KKK'],
  [9, 'KKhhKhhhhKhhhKK'],
  [8, 'KhhHHhHHHHHhHHhhK'],
  [7, 'KhHHHHHHHHHHHHHHHHK'],
  [6, 'KhHHHHHHHHHHHHHHHHHHK'],
  [6, 'KHHHHHhHHHHHHHhHHHHHK'],
  [6, 'KHHHHHHHHHHHHHHHHHHHK'],
  [6, 'KHHHHHHHHHHHHHHHHHHHK'],
  [6, 'KHHHHSHHHSSHHHSSHHHHK'], // fringe strands
  [6, 'KKHHSSKKSSSSSKKSSHHKK'], // eyebrows
  [7, 'KHKKKKKKSSSKKKKKKHK'], // glasses top
  [7, 'KSKLLKLKKKKKLKLLKSK'], // eyes + bridge
  [7, 'KNKKKKKKSSSKKKKKKSK'], // glasses bottom, earring
  [8, 'KSSSSSSSsSSSSSSSK'], // nose
  [8, 'KSSSSSMMMMMSSSSSK'], // moustache
  [9, 'KSSSMSmmmSMSSSK'], // mouth
  [10, 'KSSSMMMMMSSSK'], // stubble
  [11, 'KKSSMMMSSKK'],
  [13, 'KsSSSsK'], // neck
  [6, 'KKKKKKWWKNSNKWWKKKKKK'], // shoulders, chain
  [5, 'KRrRrWWWWWKNKWWWWWrRrRK'],
  [4, 'KRrRrWWWWWWWNWWWWWWWrRrRK'],
  [4, 'KWRWKWWWWWWWRWWWWWWWKWRWK'], // pendant
  [4, 'KWRWKWWWWWKKKKKWWWWWKWRWK'], // crest
  [4, 'KwwwKWWWWWKKRKKWWWWWKwwwK'],
  [4, 'KSSSKWWWWWWKKKWWWWWWKSSSK'],
  [4, 'KSSSKWWWWWWWKWWWWWWWKSSSK'],
  [4, 'KSSSKWWWWWWWWWWWWWWWKSSSK'],
  [4, 'KSSSKWRWWWKKKWWWWWWWKSSSK'], // number 7, flames
  [4, 'KSSSKWrRWWWWKWWWWWWWKSSSK'],
  [4, 'KSSSKWRrWWWWKWWWWWWWKKKKK'], // watch
  [4, 'KSSSKrRWRWWKWWWWWWWrKSSSK'],
  [4, 'KSSSKrRRwwwwwwwwwwwrKSSSK'],
  [4, '.KKK.KrwwwwwwwwwwwrK.KKK.'],
  [9, 'KKKKKKKKKKKKKKK'], // hem
  [9, 'KPPPPCPPPCPPPPK'], // drawstrings
  [9, 'KPPPPCPPPCPPPPK'],
  [9, 'KPpPPCPPPCPPpPK'],
  [9, 'KPpPPPPKPPPPpPK'],
  [9, 'KPpPPPPKPPPPpPK'],
  [9, 'KPpPPPK.KPPPpPK'],
  [9, 'KPpPPPK.KPPPpPK'],
  [9, 'KPPpPPK.KPPpPPK'],
  [9, 'KPPPPPK.KPPPPPK'],
  [9, 'KPPPPPK.KPPPPPK'],
  [8, 'KBBBBBBK.KBBBBBBK'], // shoes
  [8, 'KFFFFFFK.KFFFFFFK'],
  [8, '.KKKKKK...KKKKKK.'],
])

/** Eyes closed. */
export const frontBlink: Pixels = setPixels(front, [
  [11, 12, 's'],
  [11, 20, 's'],
])

/** Idle "breath": upper body sinks one pixel. */
export const frontBreath: Pixels = ['.'.repeat(TRAINER_W), ...front.slice(0, 27), ...front.slice(28)]

/** Victory pose: left fist (the one with the watch) in the air, big grin. */
export const victory: Pixels = overlay(
  setPixels(front, [
    ...Array.from({ length: 12 }, (_, i) => [22 + i, 24, 'K....'] as const),
    [15, 13, 'MmKKKmM'],
  ]),
  [
    [2, 26, 'KKKK'],
    [3, 25, 'KSSSSK'],
    [4, 25, 'KSsSSK'],
    [5, 25, 'KSSSSK'],
    [6, 26, 'KSSSK'],
    [7, 26, 'KSSSK'],
    [8, 26, 'KSSSK'],
    [9, 26, 'KSSSK'],
    [10, 26, 'KSSSK'],
    [11, 26, 'KKKKK'], // watch
    [12, 26, 'KSSSK'],
    [13, 26, 'KSSSK'],
    [14, 25, 'KWWWWK'],
    [15, 25, 'KWRWWK'],
    [16, 24, 'KWRWWK'],
    [17, 23, 'KWRWWK'],
    [18, 22, 'KWRWWK'],
  ],
)

/** Mirror around the sprite's centre column (16), so the body stays in place. */
function mirrorCentre(rows: Pixels): Pixels {
  return rows.map((r) => Array.from({ length: TRAINER_W }, (_, c) => r[32 - c] ?? '.').join(''))
}

/** Back view, derived from the front: head becomes hair, details removed, number 7 on the back. */
export const back: Pixels = (() => {
  const rows = front.map((r, y) =>
    r
      .split('')
      .map((ch, x) => {
        if (ch === '.' || ch === 'K') {
          // keep outline, but remove glasses/eyebrow lines inside the head
          if (ch === 'K' && y >= 9 && y <= 12 && x >= 9 && x <= 23) return y <= 12 ? 'H' : ch
          return ch
        }
        if (y <= 14) {
          if ((x === 8 || x === 24) && (y === 11 || y === 12)) return 'S' // ears
          return ch === 'h' ? 'h' : 'H'
        }
        if (y <= 18) return y <= 16 ? 'H' : 's' // nape
        if (y >= 19 && y <= 22 && x >= 10 && x <= 22) return 'W' // plain collar, no chain
        if (y >= 24 && y <= 31 && x >= 11 && x <= 17 && (ch === 'K' || ch === 'R')) return 'W' // crest + 7
        return ch
      })
      .join(''),
  )
  // the crest/7 outline pixels are 'K', handled here
  const cleaned = rows.map((r, y) =>
    y >= 19 && y <= 31
      ? r
          .split('')
          .map((ch, x) => (ch === 'K' && x >= 10 && x <= 22 && y !== 19 ? 'W' : ch))
          .join('')
      : r,
  )
  const mirrored = mirrorCentre(cleaned)
  return overlay(mirrored, [
    [23, 13, 'KKKKKKK'],
    [24, 13, 'KKKKKKK'],
    [25, 17, 'KK'],
    [26, 17, 'KK'],
    [27, 16, 'KK'],
    [28, 16, 'KK'],
    [29, 15, 'KK'],
    [30, 15, 'KK'],
  ])
})()

/** Head-and-shoulders crop for the Trainer Card. */
export const portrait: Pixels = crop(front, 4, 0, 25, 26)

export const trainerFrames = {
  idle: [front, frontBreath],
  blink: [frontBlink],
  victory: [victory],
  back: [back],
  portrait: [portrait],
} as const
