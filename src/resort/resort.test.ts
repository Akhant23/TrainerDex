import { describe, expect, it } from 'vitest'
import { maps, isSolidTile, placeVisitors, size, tileAt, warpAt, FLOOR_ARRIVAL, FLOOR_BOSS, RECEPTIONIST } from './maps'
import { tiles, tilePalette, TILE } from './tiles'
import { structureArt } from './structures'
import { validate } from '../sprites/pixels'
import { renderLayers, renderFlat, renderSide, renderBack, atResolution, paletteFor, CHAR_W, CHAR_H, PORTRAIT } from '../sprites/character'
import { ASSET_SLOTS } from '../content/sprites'
import { overworldFor, OW_W, OW_H } from '../sprites/overworld'
import { signature, towerStages } from '../content/aaryan'
import { SKINS, HAIR_COLOURS, CLOTH_COLOURS, EYE_COLOURS } from '../sprites/character'
import * as OPTIONS from '../../supabase/functions/_shared/appearance'
import { SKIN_IDS, HAIR_COLOUR_IDS, CLOTH_COLOUR_IDS, EYE_COLOUR_IDS, parseAppearance, parseParty, type AppearanceData } from '../../supabase/functions/_shared/appearance'

describe('tiles', () => {
  for (const [ch, t] of Object.entries(tiles)) {
    it(`tile '${ch}' is ${TILE}×${TILE} with known colours`, () => {
      expect(validate(t.px, tilePalette, TILE, TILE)).toEqual([])
      if (t.frame2) expect(validate(t.frame2, tilePalette, TILE, TILE)).toEqual([])
      if (t.prop) expect(validate(t.prop.px, tilePalette, t.prop.px[0].length, t.prop.px.length)).toEqual([])
    })
  }
})

describe('structures', () => {
  for (const [kind, px] of Object.entries(structureArt)) {
    it(`${kind} art uses known colours`, () => {
      expect(validate(px, tilePalette, px[0].length, px.length)).toEqual([])
    })
  }
  it('every building sits on solid footprint tiles (doors excepted) and is as wide as its art', () => {
    for (const m of Object.values(maps))
      for (const st of m.structures ?? []) {
        expect(structureArt[st.kind][0].length).toBe(st.w * TILE)
        for (let y = st.y; y < st.y + st.d; y++)
          for (let x = st.x; x < st.x + st.w; x++) expect('#DEFXL'.includes(tileAt(m, x, y)), `${m.id} ${x},${y}`).toBe(true)
      }
  })
})

describe('maps', () => {
  for (const m of Object.values(maps)) {
    it(`${m.id}: rectangular, only known tiles, warps land on walkable tiles`, () => {
      const { w } = size(m)
      m.rows.forEach((r, y) => {
        expect(r.length, `${m.id} row ${y}`).toBe(w)
        for (const ch of r) expect(tiles[ch], `${m.id} '${ch}'`).toBeDefined()
      })
      for (const wp of m.warps) {
        const target = maps[wp.to]
        expect(isSolidTile(target, wp.tx, wp.ty), `${m.id}→${wp.to}`).toBe(false)
        expect(isSolidTile(m, wp.x, wp.y)).toBe(false)
      }
    })
  }
  it('spawn, floor arrival and NPC tiles are walkable', () => {
    const s = maps.plaza.spawn!
    expect(isSolidTile(maps.plaza, s.x, s.y)).toBe(false)
    expect(isSolidTile(maps.floor1, FLOOR_ARRIVAL.x, FLOOR_ARRIVAL.y)).toBe(false)
    expect(isSolidTile(maps.floor1, FLOOR_BOSS.x, FLOOR_BOSS.y)).toBe(false)
    expect(tileAt(maps.reception, RECEPTIONIST.x, RECEPTIONIST.y + 1)).toBe('C')
  })
  it('the tower door leads to reception and back', () => {
    const w = warpAt(maps.plaza, 18, 5)!
    expect(w.to).toBe('reception')
    expect(warpAt(maps.reception, 7, 11)!.to).toBe('plaza')
  })
  it('every portal is a walkable door tile that opens a real section', () => {
    for (const p of maps.plaza.portals ?? []) {
      expect(tileAt(maps.plaza, p.x, p.y), p.name).toBe('D')
      expect(isSolidTile(maps.plaza, p.x, p.y + 1), `${p.name} front`).toBe(false)
      expect(['/profile', '/card', '/pokedex', '/pc', '/album', '/pager']).toContain(p.route)
    }
  })
  it('places visitors on distinct walkable non-path tiles, deterministically', () => {
    const ids = Array.from({ length: 30 }, (_, i) => `t${i}`)
    const a = placeVisitors(maps.plaza, ids)
    const b = placeVisitors(maps.plaza, ids)
    expect([...a.values()]).toEqual([...b.values()])
    const keys = new Set([...a.values()].map((p) => `${p.x},${p.y}`))
    expect(keys.size).toBe(a.size)
    for (const p of a.values()) {
      expect(isSolidTile(maps.plaza, p.x, p.y)).toBe(false)
      expect(tileAt(maps.plaza, p.x, p.y)).not.toBe('=')
    }
  })
})

describe('character model', () => {
  it('colour tables cover every option id', () => {
    expect(Object.keys(SKINS).sort()).toEqual([...SKIN_IDS].sort())
    expect(Object.keys(HAIR_COLOURS).sort()).toEqual([...HAIR_COLOUR_IDS].sort())
    expect(Object.keys(CLOTH_COLOURS).sort()).toEqual([...CLOTH_COLOUR_IDS].sort())
    expect(Object.keys(EYE_COLOURS).sort()).toEqual([...EYE_COLOUR_IDS].sort())
  })
  for (const st of towerStages) {
    it(`${st.id} look renders valid layers and walking frames`, () => {
      const pal = paletteFor(st.look)
      const l = renderLayers(st.look, 'raised')
      for (const layer of Object.values(l)) expect(validate(layer, pal, CHAR_W, CHAR_H)).toEqual([])
      const ow = overworldFor(st.look)
      for (const frames of Object.values(ow)) for (const f of frames) expect(validate(f, pal, OW_W, OW_H)).toEqual([])
    })
  }
  // every single option (one field changed at a time) must render cleanly in both models
  const fields: Array<[keyof AppearanceData, readonly string[]]> = [
    ['skin', OPTIONS.SKIN_IDS], ['hair', OPTIONS.HAIR_STYLES], ['hairColour', OPTIONS.HAIR_COLOUR_IDS], ['eyes', OPTIONS.EYE_STYLES],
    ['eyeColour', OPTIONS.EYE_COLOUR_IDS], ['face', OPTIONS.FACES], ['top', OPTIONS.TOPS], ['topColour', OPTIONS.CLOTH_COLOUR_IDS],
    ['accentColour', OPTIONS.CLOTH_COLOUR_IDS], ['hat', OPTIONS.HATS], ['hatColour', OPTIONS.CLOTH_COLOUR_IDS], ['bottom', OPTIONS.BOTTOMS],
    ['bottomColour', OPTIONS.CLOTH_COLOUR_IDS], ['shoes', OPTIONS.SHOES], ['shoeColour', OPTIONS.CLOTH_COLOUR_IDS],
  ]
  const variants: AppearanceData[] = [
    ...fields.flatMap(([k, ids]) => ids.map((v) => ({ ...signature, accessories: [], [k]: v }) as AppearanceData)),
    ...OPTIONS.ACCESSORIES.map((acc) => ({ ...signature, hat: 'cap', accessories: [acc] }) as AppearanceData),
  ]
  it(`all ${variants.length} single-option variants render valid sprites`, () => {
    for (const a of variants) {
      const pal = paletteFor(a)
      for (const pose of ['idle', 'raised'] as const) for (const layer of Object.values(renderLayers(a, pose))) expect(validate(layer, pal, CHAR_W, CHAR_H), JSON.stringify(a)).toEqual([])
      for (const turned of [renderSide(a), renderBack(a), renderBack(a, true)]) expect(validate(turned, pal, CHAR_W, CHAR_H), JSON.stringify(a)).toEqual([])
      for (const frames of Object.values(overworldFor(a))) for (const f of frames) expect(validate(f, pal, OW_W, OW_H), JSON.stringify(a)).toEqual([])
    }
  }, 30_000)
  it('asset slots document the generated sprite sizes', () => {
    expect([ASSET_SLOTS['aaryan.front'].width, ASSET_SLOTS['aaryan.front'].height]).toEqual([CHAR_W, CHAR_H])
    expect([ASSET_SLOTS['aaryan.vs'].width, ASSET_SLOTS['aaryan.victory'].height]).toEqual([CHAR_W, CHAR_H])
    expect([ASSET_SLOTS['aaryan.portrait'].width, ASSET_SLOTS['aaryan.portrait'].height]).toEqual([PORTRAIT.w, PORTRAIT.h])
    expect([ASSET_SLOTS['aaryan.overworld'].width, ASSET_SLOTS['aaryan.overworld'].height]).toEqual([OW_W, OW_H])
    expect(Object.values(overworldFor(signature)).flat()).toHaveLength(ASSET_SLOTS['aaryan.overworld'].frames)
  })
  it('2x rasterisation keeps the same design at twice the pixels', () => {
    const pal = paletteFor(signature)
    for (const px of atResolution(2, () => [renderFlat(signature), renderSide(signature), renderBack(signature, true)])) expect(validate(px, pal, CHAR_W * 2, CHAR_H * 2)).toEqual([])
  })
  it('signature look is a valid appearance for the backend', () => {
    expect(parseAppearance({ ...signature, accessories: signature.accessories.slice(0, 3) })).not.toBeNull()
    expect(renderFlat(signature).length).toBe(CHAR_H)
  })
  it('backend rejects bad appearances and parties', () => {
    expect(parseAppearance({ ...signature, skin: 'green' })).toBeNull()
    expect(parseAppearance({ ...signature, accessories: ['glasses', 'chain', 'earring', 'watch'] })).toBeNull()
    expect(parseParty(['byterat', 'nope'])).toBeNull()
    expect(parseParty([])).toBeNull()
    expect(parseParty(['riffin', 'gavelion'])).toEqual(['riffin', 'gavelion'])
  })
})

describe('trainer save validation', async () => {
  const { validateTrainer } = await import('../../supabase/functions/_shared/trainer')
  const { signature } = await import('../content/aaryan')
  const good = { id: '3f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f', secret: 'ab'.repeat(24), name: 'Misty', greeting: 'Hello!', appearance: { ...signature, accessories: ['glasses', 'chain'] }, party: ['byterat', 'riffin'] }

  it('accepts a well-formed save', () => {
    const r = validateTrainer(good)
    expect(r.ok).toBe(true)
  })
  it('rejects bad ids, secrets, names, links and parties', () => {
    expect(validateTrainer({ ...good, id: 'nope' }).ok).toBe(false)
    expect(validateTrainer({ ...good, secret: 'short' }).ok).toBe(false)
    expect(validateTrainer({ ...good, name: '' }).ok).toBe(false)
    expect(validateTrainer({ ...good, name: 'a'.repeat(17) }).ok).toBe(false)
    expect(validateTrainer({ ...good, greeting: 'visit www.spam.com' }).ok).toBe(false)
    expect(validateTrainer({ ...good, party: [] }).ok).toBe(false)
    expect(validateTrainer({ ...good, party: ['pikachu'] }).ok).toBe(false)
    expect(validateTrainer({ ...good, appearance: { ...signature, hat: 'crown' } }).ok).toBe(false)
  })
  it('defaults an empty greeting', () => {
    const r = validateTrainer({ ...good, greeting: '' })
    expect(r.ok && r.value.greeting).toBe('Hi!')
  })
})
