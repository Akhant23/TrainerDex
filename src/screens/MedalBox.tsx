import { lazy, Suspense } from 'react'
import type { MenuEntry } from '../content/menu'
import { medals } from '../content/medals'
import { useProgress } from '../systems/progress'
import { MedalArt } from '../ui/Medals'
import { PixelBox } from '../ui/PixelBox'
import { useGridNav } from '../ui/useGridNav'
import { SectionScreen } from './SectionScreen'

/** The walkable Medal Hall up top (loaded on its own: it brings the resort's renderer). */
const MedalHall = lazy(() => import('./MedalHall'))

/** Not a main-menu tile, so it has its own header entry. */
const entry: MenuEntry = {
  id: 'medals',
  label: 'MEDAL BOX',
  route: '/medals',
  icon: 'card',
  color: ['#c08a10', '#6a4a08'],
  blurb: '',
  phase: 4,
  planned: [],
}

export default function MedalBox() {
  const { medals: earned } = useProgress()
  const nav = useGridNav(medals.length, 4, { autoFocus: true })
  const m = medals[nav.focus]
  const got = !!earned[m.id]
  const count = Object.keys(earned).length

  return (
    <SectionScreen entry={entry} title={`MEDALS ${count}/${medals.length}`} compactTop={false} top={
        <Suspense fallback={<div className="absolute inset-0 bg-[#0c0a18]" />}>
          <MedalHall focus={nav.focus} earned={earned} onPick={(i) => nav.setFocus(i)} />
        </Suspense>
      }>
      <div className="space-y-3 p-[3%]">
        <div role="listbox" aria-label="Medals" className="grid grid-cols-4 gap-[2.8cqi]">
          {medals.map((md, i) => {
            const has = !!earned[md.id]
            return (
              <button
                key={md.id}
                type="button"
                role="option"
                aria-selected={i === nav.focus}
                aria-label={has || !('hidden' in md) ? `${md.name}${has ? ', earned' : ', not yet earned'}` : 'Hidden medal'}
                {...nav.itemProps(i)}
                className={`flex aspect-square cursor-pointer items-center justify-center border-0 bg-paper outline-none ${
                  i === nav.focus ? 'gv-card--selected' : 'gv-card'
                }`}
              >
                <MedalArt medal={md} earned={has} scale={3} />
              </button>
            )
          })}
        </div>
        <PixelBox className="min-h-[5.5em] px-4 py-3">
          {got || !('hidden' in m) ? (
            <>
              <p className="font-display m-0 text-[15px] text-dex-red">
                {m.name.toUpperCase()} <span className="text-muted">· {m.tier.toUpperCase()}</span>
              </p>
              <p className="m-0 mt-1 text-[16px]">{m.description}</p>
              <p className="m-0 mt-1 text-[13px] text-muted">{got ? `Earned ${new Date(earned[m.id]!).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Not earned yet.'}</p>
            </>
          ) : (
            <>
              <p className="font-display m-0 text-[15px] text-dex-red">??? · HIDDEN MEDAL</p>
              <p className="m-0 mt-1 text-[16px] italic">{'hint' in m ? m.hint : ''}</p>
            </>
          )}
        </PixelBox>
        <p className="m-0 text-[13px] text-muted">Medals are saved in this browser only.</p>
      </div>
    </SectionScreen>
  )
}
