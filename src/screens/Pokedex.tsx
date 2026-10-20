import { useEffect } from 'react'
import { navigate } from '../app/router'
import { menu } from '../content/menu'
import { pokedex, types, type DexEntry } from '../content/pokedex'
import { progress, useProgress } from '../systems/progress'
import { useSettings } from '../systems/settings'
import { useGameKeys } from '../systems/input'
import { DexArtView } from '../ui/PixelArt'
import { PixelBox } from '../ui/PixelBox'
import { Sources, TypeChip } from '../ui/bits'
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
      title={`SEEN ${dexSeen.length}/${pokedex.length}`}
      top={<DexScreen dex={focused} seen={dexSeen.includes(focused.no)} />}
    >
      <ul role="listbox" aria-label="Pokédex entries" className="m-0 list-none space-y-1 p-[3%]">
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
                className={`flex w-full cursor-pointer items-center gap-3 border-0 px-3 py-1.5 text-left outline-none ${on ? 'bg-dex-red text-paper shadow-[0_0_0_var(--u)_var(--color-gold)]' : 'bg-paper text-ink'}`}
              >
                <span className="font-display text-[11px]">{pad(d.no)}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8ecf4] shadow-[0_0_0_2px_var(--color-ink)]">
                  <DexArtView art={d.art} scale={1} />
                </span>
                <span className="font-display min-w-0 flex-1 truncate text-[clamp(10px,2.4cqi,13px)]">{d.name}</span>
                {seen ? (
                  <span className="text-[13px] opacity-80">SEEN</span>
                ) : (
                  <span aria-label="new" className="font-display text-[9px] text-gold">
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
  useEffect(() => progress.seeDex(dex.no), [dex.no])
  const idx = pokedex.indexOf(dex)
  const go = (d: number) => {
    const next = pokedex[(idx + d + pokedex.length) % pokedex.length]
    sfx('cursor')
    lastIndex = pokedex.indexOf(next)
    navigate(`/pokedex/${next.no}`)
  }
  useGameKeys((k, e) => {
    if (k === 'left' || k === 'up') go(-1)
    else if (k === 'right' || k === 'down') go(1)
    else return
    e.preventDefault()
  })

  return (
    <SectionScreen entry={entry} backTo="/pokedex" title={`No.${pad(dex.no)}`} top={<DexScreen dex={dex} seen />} scrollKey={dex.no}>
      <div className="space-y-3 p-[4%]">
        <PixelBox className="px-[5%] py-[4%]">
          <p className="font-display m-0 text-[clamp(11px,2.8cqi,15px)]">
            {dex.name} <span className="text-[0.75em] text-muted">· {dex.category.toUpperCase()}</span>
          </p>
          <div className="mt-2 flex gap-2">
            {dex.types.map((t) => (
              <TypeChip key={t} type={t} />
            ))}
          </div>
          <p className="m-0 mt-3 text-[17px] leading-snug">{dex.entry}</p>
          <Sources ids={dex.sources} className="mt-3" />
        </PixelBox>
        <div className="flex justify-between">
          <button type="button" className="pixel-btn !text-[10px]" onClick={() => go(-1)}>
            ◀ PREV
          </button>
          <button type="button" className="pixel-btn !text-[10px]" onClick={() => go(1)}>
            NEXT ▶
          </button>
        </div>
      </div>
    </SectionScreen>
  )
}

function DexScreen({ dex, seen }: { dex: DexEntry; seen: boolean }) {
  const main = types[dex.types[0]].color
  return (
    <div className="absolute inset-0 flex flex-col bg-[#c83a2a] p-[3%]">
      <div className="flex min-h-0 flex-1 gap-[3%]">
        <div
          className="relative flex flex-1 items-center justify-center overflow-hidden shadow-[0_0_0_var(--u)_var(--color-ink),inset_0_0_0_var(--u)_#ffffff55]"
          style={{ background: `radial-gradient(circle at 50% 60%, #ffffff 0%, ${main}55 45%, #1c2030 100%)` }}
        >
          <span className="font-display absolute top-[5%] left-[5%] text-[clamp(9px,2.4cqi,14px)] text-paper text-outline">No.{pad(dex.no)}</span>
          <div className={seen ? '' : 'brightness-0'}>
            <span className="hidden sm:inline">
              <DexArtView art={dex.art} scale={8} />
            </span>
            <span className="sm:hidden">
              <DexArtView art={dex.art} scale={5} />
            </span>
          </div>
        </div>
      </div>
      <PixelBox variant="plate" className="mt-[3%] flex items-center justify-between gap-2 px-[4%] py-[2%]">
        <span className="font-display text-[clamp(10px,3cqi,18px)]">{seen ? dex.name : '?????'}</span>
        <span className="flex gap-1.5">{seen && dex.types.map((t) => <TypeChip key={t} type={t} />)}</span>
      </PixelBox>
    </div>
  )
}
