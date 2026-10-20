/**
 * Writes the built-in prototype sprites to sprites-export/ as PNGs (1× for editing in
 * Aseprite/Piskel/LibreSprite, 4× for previewing). Frames of an animation are laid out
 * left-to-right — the same layout src/content/sprites.ts expects for overrides.
 *
 *   npm run sprites:export
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { hexToRgba, type Palette, type Pixels } from '../src/sprites/pixels.ts'
import { trainerFrames, trainerPalette, shinyPalette } from '../src/sprites/trainerData.ts'
import { creatureArt, trainerdexBadge } from '../src/sprites/creatures.ts'
import { overworldFrames } from '../src/sprites/overworld.ts'

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function sheet(frames: readonly Pixels[], palette: Palette, scale: number): Buffer {
  const fw = frames[0][0].length
  const fh = frames[0].length
  const w = fw * frames.length * scale
  const h = fh * scale
  const rgba = new Uint8Array(w * h * 4)
  frames.forEach((frame, i) => {
    frame.forEach((row, y) => {
      ;[...row].forEach((ch, x) => {
        if (ch === '.') return
        const [r, g, b, a] = hexToRgba(palette[ch])
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++) {
            const px = ((y * scale + dy) * w + (i * fw + x) * scale + dx) * 4
            rgba.set([r, g, b, a], px)
          }
      })
    })
  })
  return encodePng(w, h, rgba)
}

mkdirSync('sprites-export', { recursive: true })
const sets: Array<[string, readonly Pixels[]]> = [
  ['trainer-front', trainerFrames.idle],
  ['trainer-blink', trainerFrames.blink],
  ['trainer-victory', trainerFrames.victory],
  ['trainer-back', trainerFrames.back],
  ['trainer-portrait', trainerFrames.portrait],
]
for (const [name, frames] of sets) {
  for (const scale of [1, 4]) {
    writeFileSync(`sprites-export/${name}@${scale}x.png`, sheet(frames, trainerPalette, scale))
  }
  writeFileSync(`sprites-export/${name}-shiny@4x.png`, sheet(frames, shinyPalette, 4))
}
// One overview image with every pose side by side, for quick review.
writeFileSync(
  'sprites-export/overview@6x.png',
  sheet([...trainerFrames.idle, ...trainerFrames.blink, ...trainerFrames.victory, ...trainerFrames.back], trainerPalette, 6),
)
for (const [id, art] of Object.entries(creatureArt)) writeFileSync(`sprites-export/creature-${id}@4x.png`, sheet([art.pixels], art.palette, 4))
writeFileSync('sprites-export/overworld@6x.png', sheet([...overworldFrames.down, ...overworldFrames.up, ...overworldFrames.left, ...overworldFrames.right], trainerPalette, 6))
writeFileSync('sprites-export/trainerdex-badge@6x.png', sheet([trainerdexBadge.pixels], trainerdexBadge.palette, 6))
// all creatures in one strip, sharing one palette per sprite is not possible, so stitch per creature
console.log('Wrote sprites to sprites-export/')
