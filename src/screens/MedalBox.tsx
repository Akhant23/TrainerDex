import { useEffect, useRef, useState } from 'react'
import type { MenuEntry } from '../content/menu'
import { medals } from '../content/medals'
import { useProgress } from '../systems/progress'
import { useSettings } from '../systems/settings'
import { MedalArt } from '../ui/Medals'
import { OverworldSprite } from '../ui/OverworldSprite'
import { PixelBox } from '../ui/PixelBox'
import { useGridNav } from '../ui/useGridNav'
import type { Facing } from '../sprites/overworld'
import { SectionScreen } from './SectionScreen'

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
    <SectionScreen entry={entry} title={`MEDALS ${count}/${medals.length}`} compactTop={false} top={<Room />}>
      <div className="space-y-3 p-[3%]">
        <div role="listbox" aria-label="Medals" className="grid grid-cols-4 gap-[3%]">
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

/** A little room where overworld Aaryan wanders; click/tap the floor to send him somewhere. */
function Room() {
  const { reducedMotion } = useSettings()
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 50, y: 62 })
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null)
  const [facing, setFacing] = useState<Facing>('down')
  const [scale, setScale] = useState(3)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setScale(Math.max(2, Math.floor((el.clientHeight * 0.26) / 28)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // idle wander
  useEffect(() => {
    if (reducedMotion || target) return
    const id = window.setTimeout(() => setTarget({ x: 15 + Math.random() * 70, y: 45 + Math.random() * 40 }), 1800 + Math.random() * 2200)
    return () => window.clearTimeout(id)
  }, [reducedMotion, target, pos])

  // walk one axis at a time, grid-style
  useEffect(() => {
    if (!target) return
    const id = window.setInterval(() => {
      setPos((p) => {
        const dx = target.x - p.x
        const dy = target.y - p.y
        const speed = 1.4
        if (Math.abs(dx) > speed) {
          setFacing(dx > 0 ? 'right' : 'left')
          return { ...p, x: p.x + Math.sign(dx) * speed }
        }
        if (Math.abs(dy) > speed) {
          setFacing(dy > 0 ? 'down' : 'up')
          return { ...p, y: p.y + Math.sign(dy) * speed * 1.3 }
        }
        setTarget(null)
        setFacing('down')
        return target
      })
    }, 50)
    return () => window.clearInterval(id)
  }, [target])

  return (
    <div
      ref={ref}
      className="absolute inset-0 cursor-pointer overflow-hidden"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - r.left) / r.width) * 100
        const y = ((e.clientY - r.top) / r.height) * 100
        setTarget({ x: Math.min(90, Math.max(10, x)), y: Math.min(92, Math.max(42, y)) })
      }}
      role="img"
      aria-label="A pixel-art room where a small walking Aaryan wanders around. Click the floor to move him."
    >
      {/* wall */}
      <div className="absolute inset-x-0 top-0 h-[38%] bg-[#e4dca0]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ddd294 0 8px, #e4dca0 8px 16px)' }} />
      <div className="absolute inset-x-0 top-[38%] h-[2%] bg-[#8a6a3a]" />
      {/* floor */}
      <div
        className="absolute inset-x-0 top-[40%] bottom-0"
        style={{ background: '#c8945c', backgroundImage: 'linear-gradient(#b8844c 2px, transparent 2px), linear-gradient(90deg, #b8844c 2px, transparent 2px)', backgroundSize: '12.5% 16%' }}
      />
      {/* furniture: medal shelf, poster, rug */}
      <div className="absolute top-[8%] left-[8%] flex h-[24%] w-[30%] items-end justify-around bg-[#7a4a2a] px-[2%] pb-[2%] shadow-[0_0_0_3px_#1c1a24]">
        {['gold', 'silver', 'bronze'].map((t) => (
          <span key={t} className="mb-[4%] h-[38%] w-[18%] rounded-full shadow-[0_0_0_2px_#1c1a24]" style={{ background: t === 'gold' ? '#f0c040' : t === 'silver' ? '#d0d6e4' : '#d8904a' }} />
        ))}
      </div>
      <div className="absolute top-[7%] right-[10%] h-[25%] w-[18%] bg-[#e0383e] shadow-[0_0_0_3px_#1c1a24]">
        <div className="m-[12%] h-[45%] bg-paper" />
        <div className="mx-[12%] h-[8%] bg-paper/80" />
      </div>
      <div className="absolute top-[64%] left-1/2 h-[22%] w-[44%] -translate-x-1/2 rounded-[50%] bg-[#3a6fd0] shadow-[0_0_0_3px_#1c1a24,inset_0_0_0_6px_#5a8ff0]" />

      <div className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -100%)' }}>
        <OverworldSprite facing={facing} walking={!!target} scale={scale} />
      </div>
      <p className="font-display text-outline absolute right-[3%] bottom-[3%] m-0 text-[clamp(10px,2.5cqi,14px)] text-paper">TAP THE FLOOR TO WALK</p>
    </div>
  )
}
