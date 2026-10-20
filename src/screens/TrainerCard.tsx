import { useRef, useState, type PointerEvent } from 'react'
import { navigate } from '../app/router'
import { menu } from '../content/menu'
import { profile } from '../content/profile'
import { badges, type Badge } from '../content/badges'
import { experience, experienceById, formatRange } from '../content/experience'
import { progress, useProgress } from '../systems/progress'
import { useSettings } from '../systems/settings'
import { useGameKeys } from '../systems/input'
import { PixelArt } from '../ui/PixelArt'
import { PixelBox } from '../ui/PixelBox'
import { TrainerSprite } from '../ui/TrainerSprite'
import { Bullets, Heading, Sources, Tags } from '../ui/bits'
import { useGridNav } from '../ui/useGridNav'
import { SectionScreen } from './SectionScreen'

const entry = menu.find((m) => m.id === 'card')!
const COLS = 4

export default function TrainerCard({ path }: { path: string }) {
  const id = path.split('/')[2]
  const badge = badges.find((b) => b.id === id)
  return badge ? <BadgeDetail badge={badge} /> : <CardAndCase />
}

/* ---------------- Card + badge case ---------------- */

let lastBadge = 0

function CardAndCase() {
  const { sfx } = useSettings()
  const [flipped, setFlipped] = useState(false)
  const open = (b: Badge) => {
    sfx('select')
    navigate(`/card/${b.id}`)
  }
  const nav = useGridNav(badges.length, COLS, { initial: lastBadge, onMove: (i) => (lastBadge = i), onActivate: (i) => open(badges[i]) })
  const focused = badges[nav.focus]

  return (
    <SectionScreen
      entry={entry}
      compactTop={false}
      title="BADGE CASE"
      top={
        <div className="bg-stripes absolute inset-0 flex items-center justify-center p-[4%]" style={{ ['--s1' as string]: '#3a4258', ['--s2' as string]: '#323a4e' }}>
          <FlipCard
            flipped={flipped}
            onFlip={() => {
              sfx('open')
              setFlipped((f) => !f)
            }}
          />
        </div>
      }
    >
      <div className="flex min-h-full flex-col gap-3 p-[3%]">
        <div
          className="grid grid-cols-4 gap-[3%] p-[4%] shadow-[0_0_0_var(--u)_var(--color-ink)]"
          style={{ background: 'radial-gradient(circle at 50% 30%, #5a2438, #2a0c18)' }}
          role="listbox"
          aria-label="Badges"
        >
          {badges.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="option"
              aria-selected={i === nav.focus}
              aria-label={`${b.name}: ${b.awardedFor}`}
              {...nav.itemProps(i)}
              onMouseEnter={() => nav.setFocus(i)}
              onClick={() => open(b)}
              className={`group relative flex aspect-square cursor-pointer items-center justify-center border-0 outline-none ${
                i === nav.focus ? 'bg-[#ffffff22] shadow-[0_0_0_var(--u)_var(--color-gold)]' : 'bg-[#00000033]'
              }`}
            >
              <PolishableBadge badge={b} scale={3} />
            </button>
          ))}
        </div>
        <PixelBox className="px-[4%] py-[3%]">
          <p className="font-display m-0 text-[clamp(14px,3.4cqi,18px)] text-dex-red">{focused.name}</p>
          <p className="m-0 mt-1 text-[15px]">{focused.awardedFor}</p>
          <p className="m-0 mt-2 text-[13px] text-muted">Rub a badge with your cursor or finger to polish it. Select one for the full entry.</p>
        </PixelBox>
      </div>
    </SectionScreen>
  )
}

function FlipCard({ flipped, onFlip }: { flipped: boolean; onFlip: () => void }) {
  const { reducedMotion } = useSettings()
  const roles = experience.length
  const face = 'absolute inset-0 flex flex-col overflow-hidden [backface-visibility:hidden] shadow-[0_0_0_var(--u)_var(--color-ink)]'
  const goldBg = 'linear-gradient(160deg, #f8e08a 0%, #f0c040 45%, #d89a20 100%)'

  return (
    <button
      type="button"
      onClick={onFlip}
      aria-pressed={flipped}
      aria-label={flipped ? 'Trainer Card, back. Select to flip to the front.' : 'Trainer Card, front. Select to flip to the back.'}
      className="relative aspect-[1.6] w-full max-w-[96%] cursor-pointer border-0 bg-transparent p-0 text-left text-ink [perspective:1200px]"
    >
      <div
        className="absolute inset-0 [transform-style:preserve-3d]"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'none', transition: reducedMotion ? 'none' : 'transform 520ms steps(10)' }}
      >
        {/* front */}
        <div className={face} style={{ background: goldBg }}>
          <div className="font-display flex items-center justify-between bg-[#8a6008] px-[4%] py-[2%] text-[clamp(11px,3.1cqi,18px)] text-paper">
            <span>TRAINER CARD</span>
            <span>ID No.{profile.trainerId}</span>
          </div>
          <div className="flex min-h-0 flex-1 gap-[3%] p-[3%]">
            <dl className="font-display m-0 grid flex-1 grid-cols-[auto_1fr] content-center gap-x-3 gap-y-[0.7em] text-[clamp(10px,2.7cqi,17px)]">
              {(
                [
                  ['NAME', profile.name],
                  ['SCHOOL', 'UNSW SYDNEY'],
                  ['CLASS', profile.trainerClassShort],
                  ['SPECIALTY', 'LAW · SCI · CREATIVE'],
                  ['BADGES', String(badges.length)],
                  ['ROLES', String(roles)],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-[#8a3a08]">{k}</dt>
                  <dd className="m-0 text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex w-[30%] items-end justify-center overflow-hidden bg-[#fff8d8] shadow-[0_0_0_var(--u)_var(--color-ink)]">
              <TrainerSprite pose="portrait" fill={0.92} />
            </div>
          </div>
          <div className="flex items-center justify-center gap-[2%] bg-[#00000022] px-[3%] py-[1.5%]">
            {badges.map((b) => (
              <PixelArt key={b.id} pixels={b.pixels} palette={b.palette} scale={1} className="w-[8%] h-auto" />
            ))}
          </div>
        </div>

        {/* back */}
        <div className={`${face} [transform:rotateY(180deg)]`} style={{ background: goldBg }}>
          <div className="font-display flex items-center justify-between bg-[#8a6008] px-[4%] py-[2%] text-[clamp(11px,3.1cqi,18px)] text-paper">
            <span>TRAINER PROFILE</span>
            <span>SINCE {profile.started}</span>
          </div>
          <dl className="m-0 grid flex-1 grid-cols-[auto_1fr] content-center gap-x-3 gap-y-[0.45em] p-[4%] text-[clamp(10px,2.4cqi,15px)] leading-tight">
            <dt className="font-display text-[0.7em] text-[#8a3a08]">NAME</dt>
            <dd className="m-0">
              {profile.fullName} ({profile.pronouns})
            </dd>
            <dt className="font-display text-[0.7em] text-[#8a3a08]">STUDYING</dt>
            <dd className="m-0">LLB / BSc (Biotechnology), UNSW</dd>
            <dt className="font-display text-[0.7em] text-[#8a3a08]">NOW</dt>
            <dd className="m-0">Paralegal, Clayton Utz</dd>
            <dt className="font-display text-[0.7em] text-[#8a3a08]">INTERESTS</dt>
            <dd className="m-0">{profile.legalInterests.join(', ')}</dd>
            <dt className="font-display text-[0.7em] text-[#8a3a08]">SPEAKS</dt>
            <dd className="m-0">{profile.languages.join(' · ')}</dd>
          </dl>
        </div>
      </div>
      <span aria-hidden className="font-display absolute -bottom-[1.6em] right-0 text-[13px] text-paper/80">
        TAP TO FLIP ↻
      </span>
    </button>
  )
}

/* ---------------- Polishing ---------------- */

/** Badge that gets shinier as you rub the pointer across it (stored per visitor). */
function PolishableBadge({ badge, scale }: { badge: Badge; scale: number }) {
  const { shine } = useProgress()
  const { sfx } = useSettings()
  const stored = shine[badge.id] ?? 0
  const level = 0.3 + 0.7 * (stored / 100) // badges start a little dull
  const last = useRef<{ x: number; y: number } | null>(null)
  const travelled = useRef(0)

  const onMove = (e: PointerEvent) => {
    const p = { x: e.clientX, y: e.clientY }
    if (last.current) travelled.current += Math.hypot(p.x - last.current.x, p.y - last.current.y)
    last.current = p
    if (travelled.current > 40) {
      travelled.current = 0
      const before = shine[badge.id] ?? 0
      progress.polish(badge.id, 4)
      if (before < 100 && before + 4 >= 100) sfx('save')
      else if (before < 100) sfx('blip')
    }
  }

  return (
    <span
      className="relative inline-flex touch-none"
      onPointerMove={onMove}
      onPointerLeave={() => (last.current = null)}
      style={{ filter: `saturate(${level}) brightness(${0.7 + 0.3 * level})` }}
    >
      <PixelArt pixels={badge.pixels} palette={badge.palette} scale={scale} label={badge.name} />
      {stored >= 100 && (
        <span aria-hidden className="sparkle pointer-events-none absolute -top-1 -right-1 text-[14px] text-gold">
          ✦
        </span>
      )}
    </span>
  )
}

/* ---------------- Achievement entry ---------------- */

function BadgeDetail({ badge }: { badge: Badge }) {
  const { sfx } = useSettings()
  const { shine } = useProgress()
  const idx = badges.indexOf(badge)
  const go = (d: number) => {
    const next = badges[(idx + d + badges.length) % badges.length]
    lastBadge = badges.indexOf(next)
    sfx('cursor')
    navigate(`/card/${next.id}`)
  }
  useGameKeys((k, e) => {
    if (k === 'left') go(-1)
    else if (k === 'right') go(1)
    else return
    e.preventDefault()
  })

  return (
    <SectionScreen
      entry={entry}
      backTo="/card"
      title={badge.name}
      scrollKey={badge.id}
      compactTop={false}
      top={
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[4%]" style={{ background: 'radial-gradient(circle at 50% 45%, #6a2c44, #1a0810)' }}>
          <span className="hidden sm:inline-flex">
            <PolishableBadge badge={badge} scale={10} />
          </span>
          <span className="sm:hidden">
            <PolishableBadge badge={badge} scale={7} />
          </span>
          <p className="font-display m-0 text-[clamp(11px,2.8cqi,15px)] text-paper/80">
            {(shine[badge.id] ?? 0) >= 100 ? '✦ SPARKLING!' : 'RUB TO POLISH'} · {badge.category.toUpperCase()}
          </p>
        </div>
      }
    >
      <div className="space-y-3 p-[4%] text-[16px] leading-relaxed">
        <PixelBox className="px-[5%] py-[4%]">
          <p className="font-display m-0 text-[clamp(14px,3.6cqi,20px)] text-dex-red">{badge.title}</p>
          <p className="m-0 mt-1 font-semibold">{badge.org}</p>
          <p className="m-0 text-[14px] text-muted">{badge.dates}</p>
          <Bullets items={badge.description} className="mt-3" />
        </PixelBox>
        <section>
          <Heading>SKILLS</Heading>
          <Tags items={badge.skills} />
        </section>
        {badge.evidence.length > 0 && (
          <section>
            <Heading>BACKED BY</Heading>
            <ul className="m-0 list-none space-y-2 p-0">
              {badge.evidence.map((id) => {
                const ex = experienceById(id)!
                return (
                  <li key={id}>
                    <a href={`#/pc/experience/${id}`} className="text-harbour underline">
                      {ex.title}, {ex.org}
                    </a>{' '}
                    <span className="text-[14px] text-muted">({formatRange(ex.start, ex.end)})</span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        <Sources ids={badge.sources} />
        <div className="flex justify-between pt-1">
          <button type="button" className="pixel-btn !text-[14px]" onClick={() => go(-1)}>
            ◀ PREV
          </button>
          <button type="button" className="pixel-btn !text-[14px]" onClick={() => go(1)}>
            NEXT ▶
          </button>
        </div>
      </div>
    </SectionScreen>
  )
}
