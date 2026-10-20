/**
 * Writes the built-in sprites to sprites-export/ as PNGs for reviewing: Aaryan at every tower
 * stage (idle + victory), the shiny palette, the overworld walk sheet and the creatures.
 *
 *   npm run sprites:export
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { deflateSync } from 'node:zlib'
import { hexToRgba, type Palette, type Pixels } from '../src/sprites/pixels.ts'
import { creatureArt, creatureArtHi, trainerdexBadge } from '../src/sprites/creatures.ts'
import { overworldFor } from '../src/sprites/overworld.ts'
import { renderFlat, renderBack, renderSide, paletteFor, atResolution, PORTRAIT } from '../src/sprites/character.ts'
import { crop } from '../src/sprites/pixels.ts'
import { ASSET_SLOTS, CREATURE_SPEC, enabledAssets, enabledCreatures, type AssetSlot } from '../src/content/sprites.ts'
import { signature, shinySignature, towerStages } from '../src/content/aaryan.ts'

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

/** Different sprites (each with its own palette) side by side, for reviewing. */
function lineup(items: Array<[Pixels, Palette]>, scale: number): Buffer {
  const fw = items[0][0][0].length
  const fh = items[0][0].length
  const w = fw * items.length * scale
  const h = fh * scale
  const rgba = new Uint8Array(w * h * 4)
  items.forEach(([frame, palette], i) =>
    frame.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return
        const c = hexToRgba(palette[ch])
        for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) rgba.set(c, ((y * scale + dy) * w + (i * fw + x) * scale + dx) * 4)
      }),
    ),
  )
  return encodePng(w, h, rgba)
}

mkdirSync('sprites-export', { recursive: true })
for (const [id, art] of Object.entries(creatureArt)) writeFileSync(`sprites-export/creature-${id}@4x.png`, sheet([art.pixels], art.palette, 4))
{ const o = overworldFor(signature); writeFileSync('sprites-export/overworld@3x.png', sheet([...o.down, ...o.up, ...o.left, ...o.right], paletteFor(signature), 3)) }
for (const st of towerStages) writeFileSync(`sprites-export/bw-${st.floor}-${st.id}@4x.png`, sheet([renderFlat(st.look), renderFlat(st.look, 'raised')], paletteFor(st.look), 4))
writeFileSync('sprites-export/bw-lineup@3x.png', lineup(towerStages.map((st) => [renderFlat(st.look), paletteFor(st.look)]), 3))
writeFileSync('sprites-export/ow-lineup@3x.png', lineup(towerStages.flatMap((st) => { const o = overworldFor(st.look); return [o.down[0], o.left[1], o.up[0]].map((f) => [f, paletteFor(st.look)] as [Pixels, Palette]) }), 3))
writeFileSync('sprites-export/creatures-hi@2x.png', lineup(Object.values(creatureArtHi).slice(0, 8).map((c) => [c.pixels, c.palette]), 2))
writeFileSync('sprites-export/creatures-hi-2@2x.png', lineup(Object.values(creatureArtHi).slice(8).map((c) => [c.pixels, c.palette]), 2))
writeFileSync('sprites-export/bw-poses@3x.png', sheet([renderFlat(signature), renderFlat(signature, 'point'), renderFlat(signature, 'raised'), renderBack(signature), renderBack(signature, true)], paletteFor(signature), 3))
writeFileSync('sprites-export/bw-hi-poses@2x.png', sheet(atResolution(2, () => [renderFlat(signature), renderSide(signature), renderFlat(signature, 'point'), renderBack(signature), renderBack(signature, true), renderFlat(signature, 'raised')]), paletteFor(signature), 2))
writeFileSync('sprites-export/bw-shiny@4x.png', sheet([renderFlat(shinySignature)], paletteFor(shinySignature), 4))
writeFileSync('sprites-export/trainerdex-badge@6x.png', sheet([trainerdexBadge.pixels], trainerdexBadge.palette, 6))

/*
 * Editable starting points for hand-drawn replacements: every asset slot at its real size (and
 * at 2× where a slot accepts it), laid out exactly as public/assets/ expects. Edit one, save it
 * to public/assets/ under the same path, then enable it in src/content/sprites.ts.
 */
const out = (file: string, png: Buffer) => {
  const path = `sprites-export/${file}`
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, png)
}
const pal = paletteFor(signature)
const slotArt: Record<Exclude<AssetSlot, 'aaryan.overworld'>, () => Pixels> = {
  'aaryan.front': () => renderFlat(signature),
  'aaryan.vs': () => renderFlat(signature, 'point'),
  'aaryan.victory': () => renderFlat(signature, 'raised'),
  'aaryan.portrait': () => {
    const k = renderFlat(signature)[0].length / 80
    return crop(renderFlat(signature), PORTRAIT.x * k, PORTRAIT.y * k, PORTRAIT.w * k, PORTRAIT.h * k)
  },
}
for (const [slot, draw] of Object.entries(slotArt) as [keyof typeof slotArt, () => Pixels][]) {
  const file = ASSET_SLOTS[slot].file
  out(file, sheet([draw()], pal, 1))
  out(file.replace(/\.png$/, '@2x-detail.png'), sheet([atResolution(2, draw)], pal, 1))
}
{ const o = overworldFor(signature); out(ASSET_SLOTS['aaryan.overworld'].file, sheet([...o.down, ...o.up, ...o.left, ...o.right], pal, 1)) }
for (const [id, art] of Object.entries(creatureArtHi)) out(CREATURE_SPEC.file.replace('<id>', id), sheet([art.pixels], art.palette, 1))
// reference turnaround for artists (not a slot: the visitor's own avatar uses these in battle)
out('assets/trainer/reference/aaryan-turnaround@2x-detail.png', sheet(atResolution(2, () => [renderFlat(signature), renderSide(signature), renderBack(signature), renderBack(signature, true)]), pal, 1))

// the manifest, for artists and tools (written from src/content/sprites.ts, the source of truth)
const manifest = {
  note: 'Generated by npm run sprites:export from src/content/sprites.ts. Every sprite is drawn in code; a file here replaces one only when its slot is enabled there. Missing or broken files fall back to the generated sprite.',
  transparency: 'PNG with a transparent background (alpha 0), no anti-aliasing against a colour; hard pixel edges.',
  scaling: 'Drawn at whole-number scales with image-rendering: pixelated. width/height are one frame in art pixels; trainer poses may be drawn at a whole multiple (e.g. 160×240) for finer detail. The overworld sheet must be exactly 48×64 per frame.',
  slots: Object.fromEntries(Object.entries(ASSET_SLOTS).map(([id, spec]) => [id, { ...spec, enabled: enabledAssets.includes(id as AssetSlot) }])),
  creatures: { ...CREATURE_SPEC, ids: Object.keys(creatureArtHi), enabled: enabledCreatures },
}
mkdirSync('public/assets', { recursive: true })
writeFileSync('public/assets/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
console.log('Wrote sprites to sprites-export/ and public/assets/manifest.json')
