import { useState } from 'react'
import { moves, species, type SpeciesId } from '../../battle/data'
import { types } from '../../content/pokedex'
import { useSettings } from '../../systems/settings'
import { audio } from '../../systems/audio'
import { PixelBox } from '../../ui/PixelBox'
import { CreatureSprite } from '../battle/BattleBits'

const STAT_LABELS = { hp: 'HP', atk: 'ATTACK', def: 'DEFENCE', spe: 'SPEED' } as const

/**
 * Your party, BW summary-screen style: each creature's animated sprite, types, stats and moves.
 * The first creature leads (it follows you around the resort).
 */
export default function PartyBag({ party, onLead, onPc, onClose }: { party: SpeciesId[]; onLead: (id: SpeciesId) => void; onPc: () => void; onClose: () => void }) {
  const { sfx } = useSettings()
  const [sel, setSel] = useState(0)
  const id = party[Math.min(sel, party.length - 1)]
  const s = species[id]
  return (
    <div className="space-y-3 p-[3%] text-[15px]">
      <div className="flex gap-2" role="tablist" aria-label="Party">
        {party.map((p, i) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={i === sel}
            onClick={() => {
              sfx('cursor')
              setSel(i)
            }}
            className={`relative flex flex-1 cursor-pointer flex-col items-center border-0 bg-paper py-1 ${i === sel ? 'gv-card--selected' : 'gv-card'}`}
          >
            <CreatureSprite id={p} scale={1} still={i !== sel} />
            <span className="font-display text-[12px]">{species[p].name}</span>
            {i === 0 && <span className="font-display absolute top-0.5 left-1 bg-dex-red px-1 text-[10px] text-paper">LEAD</span>}
          </button>
        ))}
      </div>

      <PixelBox className="flex items-center gap-4 px-4 py-3">
        <button type="button" aria-label={`Hear ${s.name}’s cry`} onClick={() => audio.cry(id)} className="shrink-0 cursor-pointer rounded-md border-0 bg-[radial-gradient(circle_at_50%_80%,#dfe9f6_0_55%,transparent_56%)] p-0">
          <CreatureSprite id={id} scale={2} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-display m-0 text-[20px] text-dex-red">{s.name}</p>
          <p className="m-0 mt-1 flex gap-1">
            {s.types.map((t) => (
              <span key={t} className="font-display px-2 py-0.5 text-[12px] text-paper" style={{ background: types[t].color }}>
                {t}
              </span>
            ))}
          </p>
          <p className="m-0 mt-2 text-[14px]">{s.blurb}</p>
        </div>
      </PixelBox>

      <PixelBox className="px-4 py-3">
        <p className="font-display m-0 text-[14px]">STATS</p>
        <ul className="m-0 mt-2 list-none space-y-1.5 p-0">
          {(Object.keys(STAT_LABELS) as Array<keyof typeof STAT_LABELS>).map((k) => (
            <li key={k} className="flex items-center gap-2 text-[13px]">
              <span className="font-display w-[6.5em]">{STAT_LABELS[k]}</span>
              <span className="font-display w-[2.5ch] text-right">{s.base[k]}</span>
              <span className="h-2 flex-1 bg-[#d8dee8]">
                <span className="block h-full bg-leaf" style={{ width: `${Math.min(100, (s.base[k] / 110) * 100)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </PixelBox>

      <PixelBox className="px-4 py-3">
        <p className="font-display m-0 text-[14px]">MOVES</p>
        <ul className="m-0 mt-2 grid list-none gap-2 p-0 sm:grid-cols-2">
          {s.moves.map((m) => {
            const mv = moves[m]
            return (
              <li key={m} className="border-l-4 bg-[#eef2f8] px-2 py-1" style={{ borderColor: types[mv.type].color }}>
                <span className="font-display block text-[13px]">
                  {mv.name} <span className="text-muted">· {mv.type}{mv.power ? ` · ${mv.power}` : ''}</span>
                </span>
                <span className="block text-[13px] leading-snug">{mv.description}</span>
              </li>
            )
          })}
        </ul>
      </PixelBox>

      <div className="flex flex-wrap justify-end gap-2">
        {sel > 0 && (
          <button
            type="button"
            className="pixel-btn pixel-btn--primary !text-[14px]"
            onClick={() => {
              sfx('select')
              onLead(id)
              setSel(0)
            }}
          >
            ★ MAKE LEAD
          </button>
        )}
        <button type="button" className="pixel-btn !text-[14px]" onClick={onPc}>
          CHANGE PARTY (PC)
        </button>
        <button type="button" className="pixel-btn !text-[14px]" onClick={onClose}>
          CLOSE
        </button>
      </div>
      <p className="m-0 text-[13px] text-muted">▸ Your lead follows you around the resort. Face it and press A to see how it’s doing. Tap a sprite to hear its cry.</p>
    </div>
  )
}
