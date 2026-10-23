/**
 * Printed shirts for the photo scenes: every print renders a valid sprite at both densities with
 * the print palette, actually changes the shirt, and leaves the face alone.
 */
import { describe, expect, it } from 'vitest'
import { atResolution, CHAR_H, CHAR_W, paletteFor, renderPose } from './character'
import { validate } from './pixels'
import { PRINT_PALETTE, renderOutfit, type ShirtPrint } from './shirtPrints'
import { signature } from '../content/aaryan'

const PRINTS: ShirtPrint[] = ['spiderJersey', 'webTee', 'webStripes', 'redStripes', 'animeJersey']
const look = { ...signature, top: 'tee' as const, topColour: 'white' as const, accessories: [] }
const pose = { back: { el: [15, 34] as [number, number], wr: [17, 21] as [number, number], hand: 'open' as const } }

describe('shirt prints', () => {
  it('render valid sprites at both densities', () => {
    const pal = { ...paletteFor(look), ...PRINT_PALETTE }
    for (const print of PRINTS) {
      expect(validate(renderOutfit(look, pose, { print, underSleeves: 'black', gloves: 'white' }), pal, CHAR_W, CHAR_H), print).toEqual([])
      expect(validate(atResolution(2, () => renderOutfit(look, pose, { print })), pal, CHAR_W * 2, CHAR_H * 2), print).toEqual([])
    }
  })

  it('change the shirt but not the head', () => {
    const plain = renderPose(look, pose)
    for (const print of PRINTS) {
      const printed = renderOutfit(look, pose, { print })
      // the head (above the shoulders) is untouched; the torso differs
      expect(printed.slice(0, 30), print).toEqual(plain.slice(0, 30))
      expect(printed.slice(40, 64), print).not.toEqual(plain.slice(40, 64))
    }
  })

  it('paints long undersleeves on the arms and gloves on the hands', () => {
    const o = renderOutfit(look, pose, { underSleeves: 'black', gloves: 'white' }).join('')
    expect(o).toContain('3')
    expect(o).toMatch(/G/)
  })
})
