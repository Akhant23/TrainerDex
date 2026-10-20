import { describe, expect, it } from 'vitest'
import { suggestColours } from './photoColours'

/** Synthetic "photo": dark hair band, brown face, red shirt, grey background. */
function fakePhoto() {
  const w = 60
  const h = 80
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let c = [200, 205, 210]
      if (x > 18 && x < 42 && y > 8 && y < 18) c = [36, 28, 30] // hair
      if (x > 20 && x < 40 && y >= 18 && y < 40) c = [185, 128, 90] // face (brown)
      if (x > 12 && x < 48 && y >= 45) c = [209, 47, 60] // red top
      data.set([...c, 255], (y * w + x) * 4)
    }
  return { data, width: w, height: h }
}

describe('photo colour suggestions', () => {
  it('finds skin, hair and top colours from a simple portrait', () => {
    expect(suggestColours(fakePhoto())).toEqual({ skin: 'brown', hairColour: 'black', topColour: 'red' })
  })
  it('returns nulls when it can’t find a person', () => {
    const blank = { data: new Uint8ClampedArray(40 * 40 * 4).fill(240), width: 40, height: 40 }
    expect(suggestColours(blank)).toEqual({ skin: null, hairColour: null, topColour: null })
  })
})
