import { useCallback, useEffect, useState } from 'react'
import { dialogue } from '../content/dialogue'
import { DialogueBox } from '../ui/DialogueBox'
import { navigate } from '../app/router'
import { menu } from '../content/menu'
import { pokedex, types, type DexEntry } from '../content/pokedex'
import { progress, useProgress } from '../systems/progress'
import { useSettings } from '../systems/settings'
import { useGameKeys } from '../systems/input'
import { DexArtView } from '../ui/PixelArt'
import { Bullets, Sources, TypeChip } from '../ui/bits'
import { DexHabitat } from '../ui/DexHabitat'
import { HABITATS } from '../sprites/habitats'
import { ENCOUNTER_ART, paintEncounter, type EncounterScene } from '../sprites/encounters'
import { PaintedScene } from '../ui/PaintedScene'
import { useGridNav } from '../ui/useGridNav'
import { SectionScreen } from './SectionScreen'

const entry = menu.find((m) => m.id === 'pokedex')!
const pad = (n: number) => String(n).padStart(3, '0')

export default function Pokedex({ path }: { path: string }) {
  const no = Number(path.split('/')[2])
  const selected = pokedex.find((d) => d.no === no)
  return selected ? <Detail dex={selected} /> : <List />
}

function List() {
  const { sfx } = useSettings()
  const { dexSeen } = useProgress()
  const open = (d: DexEntry) => {
    sfx('select')
    navigate(`/pokedex/${d.no}`)
  }
  const nav = useGridNav(pokedex.length, 1, { initial: lastIndex, onMove: (i) => (lastIndex = i), onActivate: (i) => open(pokedex[i]) })
  const focused = pokedex[nav.focus]

  return (
    <SectionScreen
      entry={entry}
      compactTop={false}
      title={`SEEN ${dexSeen.length}/${pokedex.length}`}
      top={<DexScreen dex={focused} seen={dexSeen.includes(focused.no)} />}
    >
      <ul role="listbox" aria-label="Pokédex entries" className="m-0 list-none space-y-3 p-[3%]">
        {pokedex.map((d, i) => {
          const seen = dexSeen.includes(d.no)
          const on = i === nav.focus
          return (
            <li key={d.no}>
              <button
                type="button"
                role="option"
                aria-selected={on}
                {...nav.itemProps(i)}
                onMouseEnter={() => nav.setFocus(i)}
                onClick={() => open(d)}
                data-selected={on}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-[calc(var(--u)*1.5)] border-0 px-3 py-1.5 text-left outline-none ${on ? 'gv-tile text-paper' : 'gv-card bg-paper text-ink'}`}
              >
                <span className="font-display text-[15px]">{pad(d.no)}</span>
                <span className="gv-chip flex h-8 w-8 shrink-0 items-center justify-center !rounded-full">
                  <DexArtView art={d.art} scale={1} />
                </span>
                <span className="font-display min-w-0 flex-1 truncate text-[clamp(14px,3.4cqi,18px)]">{d.name}</span>
                {seen ? (
                  <span className="text-[13px] opacity-80">SEEN</span>
                ) : (
                  <span aria-label="new" className="font-display text-[13px] text-gold">
                    NEW
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </SectionScreen>
  )
}
// keep the cursor where it was when coming back from an entry
let lastIndex = 0

function Detail({ dex }: { dex: DexEntry }) {
  const { sfx } = useSettings()
  const [wild, setWild] = useState(() => Math.random() < 1 / dialogue.rareEncounter.odds)
  // which line of the encounter is showing, so its picture can follow the story
  const [line, setLine] = useState(0)
  useEffect(() => progress.seeDex(dex.no), [dex.no])
  useEffect(() => {
    if (wild) sfx('encounter')
  }, [wild, sfx])
  const idx = pokedex.indexOf(dex)
  const go = (d: number) => {
    const next = pokedex[(idx + d + pokedex.length) % pokedex.length]
    sfx('cursor')
    lastIndex = pokedex.indexOf(next)
    navigate(`/pokedex/${next.no}`)
  }
  useGameKeys((k, e) => {
    if (wild) return
    if (k === 'left' || k === 'up') go(-1)
    else if (k === 'right' || k === 'down') go(1)
    else return
    e.preventDefault()
  })

  if (wild)
    return (
      <SectionScreen entry={entry} backTo="/pokedex" title="A WILD ENCOUNTER!" compactTop={false} top={<WildEncounter line={line} />} backKeys={false}>
        <div className="p-[4%]">
          <DialogueBox
            lines={dialogue.rareEncounter.lines}
            onLine={setLine}
            onDone={() => {
              progress.unlock('rare-encounter')
              sfx('back')
              setWild(false)
            }}
          />
        </div>
      </SectionScreen>
    )

  const hab = HABITATS[dex.habitat]
  return (
    <SectionScreen entry={entry} compactTop={false} backTo="/pokedex" title={`No.${pad(dex.no)}`} top={<DexScreen dex={dex} seen />} scrollKey={dex.no}>
      {/* the BW Pokédex's info page: who, what type, where found; the entry; then the controls */}
      <div className="dex-page flex min-h-full flex-col gap-[clamp(10px,2.4cqi,16px)] p-[3.5%]">
        <section className="dex-info px-[4%] py-[3%]" aria-label={`${dex.name}, entry ${dex.no}`}>
          <div className="flex items-start gap-[4%]">
            <div className="min-w-0 flex-1">
              <p className="font-display m-0 flex items-baseline gap-2 text-[clamp(16px,4.2cqi,24px)]">
                <span className="text-dex-red">•{pad(dex.no)}</span>
                <span className="truncate">{dex.name}</span>
              </p>
              <p className="dex-category m-0 mt-1 text-[clamp(13px,3.3cqi,17px)]">{dex.category}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dex.types.map((t) => (
                  <TypeChip key={t} type={t} />
                ))}
              </div>
            </div>
            <figure className="dex-footprint m-0 flex shrink-0 items-center justify-center" title="Emblem">
              <DexArtView art={dex.art} scale={2} />
              <figcaption className="sr-only">Emblem</figcaption>
            </figure>
          </div>
          <dl className="dex-rows mt-3 mb-0">
            <div>
              <dt>HABITAT</dt>
              <dd>{hab.label}</dd>
            </div>
            <div>
              <dt>TYPE</dt>
              <dd>{dex.types.map((t) => types[t].label).join(' / ')}</dd>
            </div>
          </dl>
        </section>
        <section className="dex-text px-[4.5%] py-[3.5%]" aria-label="Pokédex entry">
          <Bullets items={dex.entry} className="text-[17px]" />
        </section>
        <div className="dex-sources px-[1%]">
          <Sources ids={dex.sources} />
        </div>
        <nav className="dex-bar sticky bottom-[2%] z-10 mt-auto flex items-center justify-between gap-2 px-[2.5%] py-[1.5%]" aria-label="Pokédex entries">
          <button type="button" className="dex-bar-btn" onClick={() => go(-1)} aria-label="Previous entry">
            ◀ PREV
          </button>
          <span className="font-display text-[13px] text-paper" aria-live="polite">
            {idx + 1} / {pokedex.length}
          </span>
          <button type="button" className="dex-bar-btn" onClick={() => go(1)} aria-label="Next entry">
            NEXT ▶
          </button>
        </nav>
      </div>
    </SectionScreen>
  )
}

/**
 * The top screen: the entry in its habitat, like a BW Pokédex's creature window — a status strip
 * (number, name, type), the scene filling the window, and the habitat's name on a plate beneath.
 */
function DexScreen({ dex, seen }: { dex: DexEntry; seen: boolean }) {
  const hab = HABITATS[dex.habitat]
  return (
    <div className="dex-bezel absolute inset-0 flex flex-col p-[2.4%]">
      <div className="dex-strip flex items-center justify-between gap-2 px-[3%] py-[1.1%]">
        <span className="font-display flex min-w-0 items-baseline gap-2 text-[clamp(13px,3.6cqi,21px)]">
          <span className="text-dex-red">No.{pad(dex.no)}</span>
          <span className="truncate">{seen ? dex.name : '?????'}</span>
        </span>
        <span className="flex shrink-0 gap-1.5">{seen && dex.types.map((t) => <TypeChip key={t} type={t} />)}</span>
      </div>
      <div className="dex-window mt-[2%] min-h-0 flex-1">
        <DexHabitat key={dex.habitat} id={dex.habitat} seen={seen} className="h-full w-full" />
      </div>
      <div className="dex-caption mt-[2%] flex items-center justify-between gap-2 px-[3%] py-[1%]">
        <span className="font-display text-[clamp(11px,2.6cqi,14px)] tracking-wide opacity-80">HABITAT</span>
        <span className="font-display truncate text-[clamp(12px,3.2cqi,18px)]">{seen ? hab.label.toUpperCase() : 'UNKNOWN'}</span>
      </div>
    </div>
  )
}

/** The encounter's scene for each line of its dialogue, in order (the last one stays after). */
const ENCOUNTER_SCENES: readonly EncounterScene[] = ['wild', 'charger', 'deadline', 'fled']

/**
 * The rare encounter's top screen: a painted scene per line of the story (in the grass, in his
 * room hunting for the charger, at his desk checking his watch, gone in a puff of dust), opening
 * on the battle-start flashes and cutting between scenes with a quick white flash.
 */
function WildEncounter({ line }: { line: number }) {
  const scene = ENCOUNTER_SCENES[Math.min(line, ENCOUNTER_SCENES.length - 1)]
  const paint = useCallback((frame: number) => paintEncounter(scene, frame).toRGBA(), [scene])
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0e1430]">
      <PaintedScene key={scene} id={`encounter:${scene}`} frames={ENCOUNTER_ART[scene].frames} paint={paint} alt={ENCOUNTER_ART[scene].alt} className="h-full w-full" />
      {line > 0 && <div key={`cut-${scene}`} className="encounter-cut" aria-hidden />}
      <div className="encounter" aria-hidden />
    </div>
  )
}
