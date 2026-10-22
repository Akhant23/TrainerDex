import { describe, expect, it } from 'vitest'
import { maps, isSolidTile, placeVisitors, sceneryAt, settleVisitors, size, tileAt, warpAt, FLOOR_ARRIVAL, FLOOR_BOSS, PLAZA_X, RECEPTIONIST } from './maps'
import { tiles, tilePalette, TILE } from './tiles'
import { structureArt } from './structures'
import { validate } from '../sprites/pixels'
import { renderLayers, renderFlat, renderSide, renderBack, atResolution, paletteFor, CHAR_W, CHAR_H, PORTRAIT } from '../sprites/character'
import { ASSET_SLOTS } from '../content/sprites'
import { overworldFor, OW_W, OW_H, riderFor } from '../sprites/overworld'
import { signature, towerStages } from '../content/aaryan'
import { regulars } from './regulars'
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
    const w = warpAt(maps.plaza, PLAZA_X + 18, 5)!
    expect(w.to).toBe('reception')
    const back = warpAt(maps.reception, 7, 11)!
    expect(back.to).toBe('plaza')
    expect(isSolidTile(maps.plaza, back.tx, back.ty)).toBe(false)
  })

  describe('the plaza and what lies beyond it', () => {
    const plaza = maps.plaza
    const { w, h } = size(plaza)
    it('is closed in by solid ground all the way round: trees, palms or the sea, never an invisible wall', () => {
      for (let x = 0; x < w; x++) {
        expect(isSolidTile(plaza, x, 0), `top ${x}`).toBe(true)
        expect(isSolidTile(plaza, x, h - 1), `bottom ${x}`).toBe(true)
      }
      for (let y = 0; y < h; y++) {
        expect(isSolidTile(plaza, 0, y), `left ${y}`).toBe(true)
        expect(isSolidTile(plaza, w - 1, y), `right ${y}`).toBe(true)
      }
    })
    it('keeps the original layout intact, moved over by PLAZA_X', () => {
      // spot checks: the tower door, the fountain, the pool, the beach umbrella
      expect(tileAt(plaza, PLAZA_X + 18, 5)).toBe('D')
      expect(tileAt(plaza, PLAZA_X + 18, 13)).toBe('F')
      expect(tileAt(plaza, PLAZA_X + 30, 22)).toBe('p')
      expect(tileAt(plaza, PLAZA_X + 10, 25)).toBe('u')
      // the side gardens are open ground you can walk into from the plaza's paths
      for (const y of [6, 7, 13, 20, 21]) for (const x of [2, PLAZA_X, w - PLAZA_X - 1, w - 3]) expect(isSolidTile(plaza, x, y), `${x},${y}`).toBe(false)
    })
    it('carries on past the edges as woods, beach and sea, without repeating itself', () => {
      const seen = new Set<string>()
      for (let y = -1; y < h + 16; y++)
        for (const x of [-16, -8, -1, w, w + 7, w + 15]) {
          const ch = sceneryAt(plaza, x, y)
          expect(tiles[ch], `${x},${y} '${ch}'`).toBeDefined()
          seen.add(ch)
          if (y >= 28) expect(ch).toBe('w')
          if (y >= 24 && y <= 26) expect(['_', 'T']).toContain(ch)
        }
      expect([...seen]).toEqual(expect.arrayContaining(['O', 'Y', ',', '_', 'T', '~', 'w']))
      // the woods west of the plaza aren't one column copied: neighbouring columns differ
      const col = (x: number) => Array.from({ length: 24 }, (_, y) => sceneryAt(plaza, x, y)).join('')
      expect(col(-3)).not.toBe(col(-4))
      expect(col(-3)).not.toBe(col(w + 2))
    })
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
  it('keeps visitors where they are when someone arrives, leaves, or the player moves', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `t${i}`)
    const first = settleVisitors(maps.plaza, ids, new Map(), [], [{ x: 18, y: 14 }])
    // a travelling trainer lands, and the player has walked somewhere else since
    const landed = { x: 12, y: 10 }
    const after = settleVisitors(maps.plaza, ids, first, [], [{ x: 20, y: 12 }, landed])
    for (const id of ids) expect(after.get(id), id).toEqual(first.get(id))
    // one leaves, one new visitor turns up: everyone else stays put, the newcomer gets a free tile
    const next = settleVisitors(maps.plaza, [...ids.slice(1), 'new'], after, [], [{ x: 20, y: 12 }, landed])
    for (const id of ids.slice(1)) expect(next.get(id), id).toEqual(first.get(id))
    const spot = next.get('new')!
    expect([...next.entries()].filter(([id, p]) => id !== 'new' && p.x === spot.x && p.y === spot.y)).toHaveLength(0)
    expect(spot).not.toEqual({ ...landed, facing: spot.facing })
    expect(spot).not.toEqual({ x: 20, y: 12, facing: spot.facing })
  })
  it('a newly opened plaza places visitors the same way as before', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `t${i}`)
    expect([...settleVisitors(maps.plaza, ids, new Map(), [{ x: 3, y: 3 }]).entries()]).toEqual([...placeVisitors(maps.plaza, ids, [{ x: 3, y: 3 }]).entries()])
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

describe('compact Gen V walkers', () => {
  const rows = (px: string[]) => px.map((r, y) => (/[^.]/.test(r) ? y : -1)).filter((y) => y >= 0)
  it('stand ~1½ tiles tall with the head about half the height, feet on the same line', () => {
    for (const look of [signature, ...regulars.map((r) => r.look)]) {
      const ow = overworldFor(look)
      for (const f of [ow.down[0], ow.up[0], ow.left[0], ow.right[0]]) {
        const ys = rows(f)
        const h = ys[ys.length - 1] - ys[0] + 1
        // 44–54 art px = 22–27 world px (BW measured ~23–26)
        expect(h).toBeGreaterThanOrEqual(44)
        expect(h).toBeLessThanOrEqual(54)
        expect(ys[ys.length - 1]).toBeGreaterThanOrEqual(60)
      }
      // the widest row is the head (hair), not the shoulders: Gen V's big-headed build
      const f = ow.down[0]
      const width = (y: number) => (f[y].match(/[^.]/g) ?? []).length
      const head = Math.max(...Array.from({ length: 22 }, (_, i) => width(14 + i)))
      const body = Math.max(...Array.from({ length: 10 }, (_, i) => width(38 + i)))
      expect(head).toBeGreaterThanOrEqual(body - 6)
    }
  })
  it('each profile shows its own side: right is not just the left mirrored', () => {
    const ow = overworldFor(signature)
    const mirrored = ow.left[0].map((r) => [...r].reverse().join(''))
    expect(ow.right[0]).not.toEqual(mirrored)
  })
})

describe('riders by direction', () => {
  it("an asymmetric outfit isn't just mirrored when flying right; a symmetric one is", () => {
    const flip = (px: string[]) => px.map((r) => [...r].reverse().join(''))
    expect(riderFor(signature, 'right')).not.toEqual(flip(riderFor(signature, 'left')))
    const plain = regulars.map((r) => r.look).find((l) => l.top !== 'jersey' && !l.accessories.some((x) => x === 'watch' || x === 'bracelet'))!
    expect(riderFor(plain, 'right')).toEqual(flip(riderFor(plain, 'left')))
  })
})
