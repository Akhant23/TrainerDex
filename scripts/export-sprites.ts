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
import { overworldFor, riderBackFor, riderFor, RIDER_HIP, riderQuarterFor } from '../src/sprites/overworld.ts'
import { habitatIds, HABITATS, HAB_H, HAB_W, paintHabitat } from '../src/sprites/habitats.ts'
import { flightArt, FLYERS } from '../src/sprites/flight.ts'
import { renderFlat, renderBack, renderSide, renderPose, paletteFor, atResolution, PORTRAIT } from '../src/sprites/character.ts'
import { GESTURES } from '../src/sprites/gestures.ts'
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
writeFileSync('sprites-export/creatures-back@2x.png', lineup(Object.values(creatureArtHi).slice(0, 8).map((c) => [c.back, c.palette]), 2))
writeFileSync('sprites-export/creatures-back-2@2x.png', lineup(Object.values(creatureArtHi).slice(8).map((c) => [c.back, c.palette]), 2))
writeFileSync('sprites-export/bw-poses@3x.png', sheet([renderFlat(signature), renderFlat(signature, 'point'), renderFlat(signature, 'raised'), renderBack(signature), renderBack(signature, true)], paletteFor(signature), 3))
writeFileSync('sprites-export/bw-hi-poses@2x.png', sheet(atResolution(2, () => [renderFlat(signature), renderSide(signature), renderFlat(signature, 'point'), renderBack(signature), renderBack(signature, true), renderFlat(signature, 'raised')]), paletteFor(signature), 2))
writeFileSync('sprites-export/bw-shiny@4x.png', sheet([renderFlat(shinySignature)], paletteFor(shinySignature), 4))
writeFileSync('sprites-export/trainerdex-badge@6x.png', sheet([trainerdexBadge.pixels], trainerdexBadge.palette, 6))

/* Idle gestures: every frame held long enough to read (the keyframes), at 2× detail, plus
   enlarged upper-body close-ups of each gesture's main pose for checking hands and faces. */
{
  // each gesture's main pose: the longest-held frame that moves an arm
  const peak = (id: keyof typeof GESTURES) => GESTURES[id].filter((f) => f.frame.back || f.frame.front).reduce((a, b) => (b.ms > a.ms ? b : a)).frame
  const ids = Object.keys(GESTURES) as Array<keyof typeof GESTURES>
  const frames = atResolution(2, () => ids.map((id) => crop(renderPose(signature, peak(id)), 0, 0, 160, 150)))
  writeFileSync('sprites-export/gesture-closeups@3x.png', sheet(frames, paletteFor(signature), 3))
}
for (const [id, frames] of Object.entries(GESTURES)) {
  const keys = frames.filter((f) => f.ms >= 100).map((f) => f.frame)
  writeFileSync(`sprites-export/gesture-${id}@2x.png`, sheet(atResolution(2, () => keys.map((f) => renderPose(signature, f))), paletteFor(signature), 1))
}

/*
 * Flight cycles: each flyer's four frames side by side (far wing, body, rider, near wing),
 * drawn at 4 output pixels per world pixel so mounts and riders keep their true relative size.
 */
{
  const OUT = 4
  const fw = 76 * OUT
  const fh = 62 * OUT
  const rider = riderFor(signature)
  const riderBack = riderBackFor(signature)
  const rpal = paletteFor(signature)
  // the side view (flight-<id>.png) and, for mounts, the view from behind (flight-<id>-back.png)
  const views = FLYERS.flatMap((id) => {
    const art = flightArt[id]
    const side = { file: `flight-${id}`, id, frames: art.frames, saddle: art.saddle, rider }
    const out = [side]
    if (art.framesQuarter && art.saddleQuarter)
      for (const [dir, h] of [['left', -1], ['right', 1]] as const) out.push({ file: `flight-${id}-quarter-${dir}`, id, frames: art.framesQuarter[dir], saddle: art.saddleQuarter[dir], rider: riderQuarterFor(signature, h) })
    if (art.framesBack && art.saddleBack) out.push({ file: `flight-${id}-back`, id, frames: art.framesBack, saddle: art.saddleBack, rider: riderBack })
    return out
  })
  for (const v of views) {
    const art = flightArt[v.id]
    const w = fw * 4
    const rgba = new Uint8Array(w * fh * 4)
    const blit = (px: Pixels, pal: Palette, ox: number, oy: number, s: number) => {
      const sw = px[0].length
      const sh = px.length
      for (let y = Math.max(0, Math.floor(oy)); y < Math.min(fh, Math.ceil(oy + sh * s)); y++)
        for (let x = Math.max(0, Math.floor(ox)); x < Math.ceil(ox + sw * s); x++) {
          const sx = Math.floor((x - ox) / s)
          const sy = Math.floor((y - oy) / s)
          const ch = px[sy]?.[sx]
          if (!ch || ch === '.') continue
          rgba.set(hexToRgba(pal[ch]), (y * w + x) * 4)
        }
    }
    v.frames.forEach((fr, i) => {
      const s = art.world * OUT
      const ox = i * fw + (fw - 112 * s) / 2
      const oy = fh - 80 * s - 8
      blit(fr.far, art.palette, ox, oy, s)
      blit(fr.body, art.palette, ox, oy, s)
      if (v.saddle) {
        const rs = 0.5 * OUT
        const [sx, sy] = v.saddle[i]
        blit(v.rider, rpal, ox + sx * s - RIDER_HIP[0] * rs, oy + sy * s - RIDER_HIP[1] * rs, rs)
      }
      blit(fr.near, art.palette, ox, oy, s)
    })
    writeFileSync(`sprites-export/${v.file}.png`, encodePng(w, fh, rgba))
  }
}

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

/* Pokédex habitats: every frame of every scene, 1:1 (sprites-export/habitat-<id>.png, frames side by side). */
for (const id of habitatIds) {
  const n = HABITATS[id].frames
  const rgba = new Uint8Array(HAB_W * n * HAB_H * 4)
  for (let f = 0; f < n; f++) {
    const px = paintHabitat(id, f).toRGBA()
    for (let y = 0; y < HAB_H; y++) rgba.set(px.subarray(y * HAB_W * 4, (y + 1) * HAB_W * 4), (y * HAB_W * n + f * HAB_W) * 4)
  }
  writeFileSync(`sprites-export/habitat-${id}.png`, encodePng(HAB_W * n, HAB_H, rgba))
}
