/**
 * "Match my photo": suggest skin, hair and top colours from a photo. Runs entirely in the
 * browser — the image is drawn to a small canvas, sampled, and discarded; nothing is uploaded.
 * It's a best guess from pixel statistics, not face recognition.
 */
import { CLOTH_COLOURS, HAIR_COLOURS, SKINS, type ClothColourId, type HairColourId, type SkinId } from '../sprites/character'

type RGB = [number, number, number]
export interface PixelData {
  data: Uint8ClampedArray | number[]
  width: number
  height: number
}

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const dist = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
function nearest<K extends string>(table: Record<K, readonly string[]>, c: RGB): K {
  let best = Object.keys(table)[0] as K
  let bd = Infinity
  for (const k of Object.keys(table) as K[]) {
    const d = dist(hex(table[k][0]), c)
    if (d < bd) {
      bd = d
      best = k
    }
  }
  return best
}

/** Classic YCbCr skin test. */
function isSkin([r, g, b]: RGB) {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
  return cb > 77 && cb < 127 && cr > 133 && cr < 173 && r > 40
}
const lum = ([r, g, b]: RGB) => 0.299 * r + 0.587 * g + 0.114 * b

function average(px: RGB[]): RGB | null {
  if (!px.length) return null
  const s = px.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]] as RGB, [0, 0, 0] as RGB)
  return [s[0] / px.length, s[1] / px.length, s[2] / px.length]
}

export interface ColourSuggestion {
  skin: SkinId | null
  hairColour: HairColourId | null
  topColour: ClothColourId | null
}

export function suggestColours(img: PixelData): ColourSuggestion {
  const at = (x: number, y: number): RGB => {
    const i = (y * img.width + x) * 4
    return [img.data[i], img.data[i + 1], img.data[i + 2]]
  }
  const skin: RGB[] = []
  let minSkinY = img.height
  let skinXs = 0
  for (let y = 0; y < img.height; y += 2)
    for (let x = Math.floor(img.width * 0.2); x < img.width * 0.8; x += 2) {
      const c = at(x, y)
      if (isSkin(c)) {
        skin.push(c)
        minSkinY = Math.min(minSkinY, y)
        skinXs += x
      }
    }
  const skinAvg = average(skin)
  const faceX = skin.length ? Math.round(skinXs / skin.length) : Math.round(img.width / 2)

  // hair: darker, non-skin pixels in a band just above the highest skin
  const hair: RGB[] = []
  const top = Math.max(0, minSkinY - Math.round(img.height * 0.12))
  for (let y = top; y < Math.min(img.height, minSkinY + 4); y++)
    for (let x = Math.max(0, faceX - Math.round(img.width * 0.12)); x < Math.min(img.width, faceX + img.width * 0.12); x++) {
      const c = at(x, y)
      if (!isSkin(c) && lum(c) < 200) hair.push(c)
    }

  // top: centre of the lower-middle region
  const shirt: RGB[] = []
  for (let y = Math.round(img.height * 0.6); y < img.height * 0.8; y++)
    for (let x = Math.round(faceX - img.width * 0.1); x < faceX + img.width * 0.1; x++) if (x >= 0 && x < img.width && !isSkin(at(x, y))) shirt.push(at(x, y))

  const hairAvg = average(hair)
  const shirtAvg = average(shirt)
  // without a face there's nothing to anchor hair or clothing to
  const person = !!skinAvg && skin.length > 30
  return {
    skin: person ? nearest(SKINS, skinAvg!) : null,
    hairColour: person && hairAvg && hair.length > 20 ? nearest(HAIR_COLOURS, hairAvg) : null,
    topColour: person && shirtAvg && shirt.length > 20 ? nearest(CLOTH_COLOURS, shirtAvg) : null,
  }
}

/** Load a File into small pixel data (browser only). */
export async function readPhoto(file: File, maxSide = 160): Promise<PixelData> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('That file isn’t an image this browser can read.'))
      i.src = url
    })
    const k = Math.min(1, maxSide / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.width * k))
    c.height = Math.max(1, Math.round(img.height * k))
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(img, 0, 0, c.width, c.height)
    const d = ctx.getImageData(0, 0, c.width, c.height)
    return { data: d.data, width: d.width, height: d.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}
