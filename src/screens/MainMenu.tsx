import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { clearReturnTo } from '../systems/returnTo'
import { DSShell } from '../app/DSShell'
import { navigate } from '../app/router'
import { menu, type MenuEntry } from '../content/menu'
import { profile } from '../content/profile'
import { dialogue, fill } from '../content/dialogue'
import { shinyOdds } from '../content/sprites'
import { useSettings } from '../systems/settings'
import { usePlaytime, useVisitor } from '../systems/visitor'
import { useGameKeys } from '../systems/input'
import { formatPlaytime } from '../systems/format'
import { PixelBox } from '../ui/PixelBox'
import { PixelIcon } from '../ui/PixelIcon'
import type { GestureId } from '../sprites/gestures'
import { TrainerSprite } from '../ui/TrainerSprite'
import { progress, useProgress } from '../systems/progress'
import { medals } from '../content/medals'
import { MedalArt } from '../ui/Medals'
import { hasShinyCharm } from '../systems/konami'
import { crispScale } from '../ui/CharacterSprite'
import { CHAR_H } from '../sprites/character'
import { SYDNEY_H } from '../sprites/skyline'
import { MenuSky, SkylineBands } from '../ui/MenuSky'
import { isLit, useSky } from '../ui/useSky'

const COLS = 2
// remembered for the session so Back returns the cursor to where it was
let lastFocus = 0
/** Aaryan's partner on the platform: his ace (loaded on its own, so the menu's first paint doesn't wait for battle art). */
const MenuCompanion = lazy(() => import('../ui/MenuCompanion'))
const PARTNER = 'gavelion' as const
/** After the cursor rests on a tile this long, Aaryan points at it (at most once per cooldown). */
const SETTLE_MS = 450
const POINT_COOLDOWN_MS = 6000

export default function MainMenu() {
  useEffect(clearReturnTo, [])
  const [focus, setFocusState] = useState(lastFocus)
  const setFocus = (i: number) => {
    lastFocus = i
    setFocusState(i)
  }
  return (
    <DSShell
      topLabel="Trainer status"
      bottomLabel="Main menu"
      top={<StatusScreen entry={menu[focus]} />}
      bottom={<TouchMenu focus={focus} setFocus={setFocus} />}
    />
  )
}

/* ---------------- Top screen ---------------- */

/** Two close tones of a tile's colour, for the stripes behind the trainer. */
function stripeTones([c0, c1]: readonly [string, string]): [string, string] {
  const n = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [a, b] = [n(c0), n(c1)]
  const mid = a.map((v, i) => Math.round(v + (b[i] - v) * 0.16).toString(16).padStart(2, '0')).join('')
  return [c0, `#${mid}`]
}

/** The stripes' scroll, on one clock for every layer (so a new layer wipes in exactly in step). */
const STRIPE_PERIOD = 2400
const stripePhase = () => `-${Math.round(performance.now() % STRIPE_PERIOD)}ms`

/**
 * The scrolling stripes behind the trainer, in the focused tile's colours, and whatever `scene` draws
 * on them in those tones (the skyline). A new colour wipes in over the old one from the left in a
 * few hard steps (pixel-style), then becomes the base; with reduced motion it just switches.
 */
function StripeBackdrop({ colors, scene }: { colors: readonly [string, string]; scene?: (tones: [string, string]) => ReactNode }) {
  const { reducedMotion } = useSettings()
  const tones = stripeTones(colors)
  const [shown, setShown] = useState(() => ({ tones, phase: stripePhase() }))
  const [incomingPhase] = useState(stripePhase)
  const changing = !reducedMotion && (shown.tones[0] !== tones[0] || shown.tones[1] !== tones[1])
  const layer = (t: [string, string], phase: string) => ({ ['--s1' as string]: t[0], ['--s2' as string]: t[1], animationDelay: phase })
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="bg-stripes absolute inset-0 overflow-hidden" style={layer(reducedMotion ? tones : shown.tones, shown.phase)}>
        {scene?.(reducedMotion ? tones : shown.tones)}
      </div>
      {changing && (
        <div
          key={tones.join()}
          className="bg-stripes stripe-wipe absolute inset-0 overflow-hidden"
          style={layer(tones, incomingPhase)}
          onAnimationEnd={(e) => e.animationName === 'stripe-wipe' && setShown({ tones, phase: incomingPhase })}
        >
          {scene?.(tones)}
        </div>
      )}
    </div>
  )
}

function StatusScreen({ entry }: { entry: MenuEntry }) {
  const { name } = useVisitor()
  const playtime = usePlaytime()
  const { sfx, reducedMotion } = useSettings()
  const [shiny, setShiny] = useState(() => hasShinyCharm() || Math.random() < 1 / shinyOdds)
  const sky = useSky()
  const { rootRef, colRef, cardRef, layout } = useStatusLayout()
  const earnedIds = Object.keys(useProgress().medals)
  const earned = earnedIds.length
  useEffect(() => {
    if (shiny) progress.unlock('shiny')
  }, [shiny])
  useEffect(() => {
    const on = () => setShiny(true)
    window.addEventListener('tdx:shiny-charm', on)
    return () => window.removeEventListener('tdx:shiny-charm', on)
  }, [])
  const [bubble, setBubble] = useState<string | null>(null)
  // tapping Aaryan makes him wave (if he isn't mid-gesture)
  const [wave, setWave] = useState<{ id: GestureId; key: number } | undefined>(undefined)
  // the partner hops (and Aaryan points at the menu) once the cursor settles on a tile
  const [hop, setHop] = useState(0)
  const lastPoint = useRef(0)
  const firstEntry = useRef(entry.id)
  useEffect(() => {
    if (entry.id === firstEntry.current) return
    firstEntry.current = ''
    const t = window.setTimeout(() => {
      setHop((h) => h + 1)
      const now = Date.now()
      if (!reducedMotion && now - lastPoint.current > POINT_COOLDOWN_MS) {
        lastPoint.current = now
        setWave((w) => ({ id: 'pointMenu', key: (w?.key ?? 0) + 1 }))
      }
    }, SETTLE_MS)
    return () => window.clearTimeout(t)
  }, [entry.id, reducedMotion])
  // dev only: window.__aaryanGesture('ruffleHair') plays a gesture on demand for QA
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __aaryanGesture?: (id: GestureId) => void }).__aaryanGesture = (id) => setWave((w) => ({ id, key: (w?.key ?? 0) + 1 }))
  }, [])
  const clicks = useRef({ count: 0, last: 0, next: 0 })
  const bubbleTimer = useRef<number | undefined>(undefined)
  const time = formatPlaytime(playtime)

  useEffect(() => () => window.clearTimeout(bubbleTimer.current), [])

  const poke = () => {
    const now = Date.now()
    const c = clicks.current
    c.count = now - c.last < 1500 ? c.count + 1 : 1
    c.last = now
    let line: string
    if (c.count >= dialogue.secretClicks) {
      line = dialogue.secretReaction
      progress.unlock('secret')
      c.count = 0
    } else {
      line = dialogue.spriteReactions[c.next % dialogue.spriteReactions.length]
      c.next++
    }
    sfx('bump')
    setWave((w) => ({ id: 'wave', key: (w?.key ?? 0) + 1 }))
    setHop((h) => h + 1)
    setBubble(fill(line, name))
    window.clearTimeout(bubbleTimer.current)
    bubbleTimer.current = window.setTimeout(() => setBubble(null), 3200)
  }

  return (
    <div ref={rootRef} className="absolute inset-0 flex flex-col">
      <StripeBackdrop colors={entry.color} scene={(tones) => <SkylineBands tones={tones} scale={layout.band} width={layout.w} ground={layout.ground} stage={layout.stage} lit={isLit(sky)} />} />
      <MenuSky sky={sky} scale={layout.band} width={layout.w} height={layout.h} />
      <div className="relative flex min-h-0 flex-1">
        {/* trainer and partner on a platform */}
        <div ref={colRef} className="relative w-[44%]">
          <div aria-hidden className="absolute bottom-[5%] left-[4%] h-[14%] w-[94%] rounded-[50%] bg-[#f8d8a8] shadow-[inset_0_-6px_0_#d8a870,0_0_0_3px_#1c1a24]" />
          <button
            type="button"
            onClick={poke}
            aria-label="Talk to Aaryan"
            className="absolute bottom-[10%] left-1/2 z-[2] flex -translate-x-1/2 cursor-pointer items-end border-0 bg-transparent p-0"
          >
            <TrainerSprite scale={layout.aaryan} shiny={shiny} gestures gestureTrigger={wave} alt={shiny ? 'Shiny pixel-art sprite of Aaryan' : undefined} />
            {shiny && (
              <span aria-hidden className="sparkle absolute -top-1 -right-1 text-gold text-xl">
                ✦
              </span>
            )}
          </button>
          <Suspense fallback={null}>
            <MenuCompanion id={PARTNER} hop={hop} />
          </Suspense>
          {bubble && (
            <PixelBox variant="plate" role="status" className="cq-text-xs absolute top-[4%] left-[6%] z-10 max-w-[150%] px-3 py-2 font-semibold">
              {bubble}
            </PixelBox>
          )}
        </div>

        {/* status plate and medal case */}
        <div className="flex w-[56%] flex-col justify-center gap-[4%] py-[4%] pr-[4%]">
          <PixelBox ref={cardRef} variant="plate" className="px-[5%] py-[4%]">
            <div className="font-display cq-text-md flex items-center justify-between text-dex-red">
              <span>{profile.name}</span>
              {shiny && <span className="cq-text-xs text-gold">✦SHINY</span>}
            </div>
            <dl className="font-display cq-text-xs m-0 mt-[6%] grid grid-cols-[auto_1fr] gap-x-3 gap-y-[0.9em]">
              <dt>ID No.</dt>
              <dd className="m-0 text-right">{profile.trainerId}</dd>
              <dt>REGION</dt>
              <dd className="m-0 text-right">{profile.regionShort}</dd>
              <dt>CLASS</dt>
              <dd className="m-0 text-right">{profile.trainerClassShort}</dd>
              <dt>PLAY TIME</dt>
              <dd className="m-0 text-right" aria-label={`${time.hours} hours ${time.minutes} minutes`}>
                {time.hours}
                <span className="blink">:</span>
                {time.minutes}
              </dd>
            </dl>
            {/* phones: the compact medals row (the top screen is too short for the case) */}
            <button
              type="button"
              onClick={() => {
                sfx('select')
                navigate('/medals')
              }}
              className="font-display cq-text-xs mt-[6%] flex w-full cursor-pointer items-center justify-between border-0 bg-[#f8e8a8] px-[4%] py-[3%] text-ink gv-card hover:bg-[#fff0b8] sm:hidden"
            >
              <span>★ MEDALS</span>
              <span>
                {earned}/{medals.length}
              </span>
            </button>
          </PixelBox>
          <MedalCase
            earned={earnedIds}
            onOpen={() => {
              sfx('select')
              navigate('/medals')
            }}
          />
        </div>
      </div>

      {/* context line */}
      <PixelBox className="cq-text-sm mx-[3%] mb-[3%] flex min-h-[3.2em] items-center gap-3 px-[4%] py-[2%] font-semibold">
        <PixelIcon name={entry.icon} scale={2} />
        <span aria-live="polite">{entry.blurb}</span>
      </PixelBox>
    </div>
  )
}

/** Rows of clear space above Aaryan's hair in his 120-row frame. */
const AARYAN_HEADROOM = 3

/**
 * The top screen's measurements: its size, where the ground (the bottom of the stage, above the
 * context line) is, the skyline's pixel scale, and Aaryan's scale, the largest crisp one at which
 * he stands as tall as the status card beside him (the top of his hair level with the card's top).
 */
function useStatusLayout() {
  const rootRef = useRef<HTMLDivElement>(null)
  const colRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({ w: 0, h: 0, ground: 0, stage: 0, band: 0, aaryan: 2 })
  useLayoutEffect(() => {
    const [root, col, card] = [rootRef.current, colRef.current, cardRef.current]
    if (!root || !col || !card) return
    const measure = () => {
      const r = root.getBoundingClientRect()
      // the shell may be scaled to fit: measure on screen, then back into the layout's own pixels
      const k = root.offsetHeight / (r.height || 1)
      const c = col.getBoundingClientRect()
      const top = (card.getBoundingClientRect().top - r.top) * k
      const colBottom = (c.bottom - r.top) * k
      const colH = c.height * k
      // his frame stands on a line 10% of the column up from its foot; his hair is the frame's height less the headroom above it
      const base = colBottom - colH * 0.1
      const aaryan = Math.max(1, crispScale((base - top) / (CHAR_H - AARYAN_HEADROOM)))
      setLayout({ w: root.offsetWidth, h: root.offsetHeight, ground: root.offsetHeight - colBottom, stage: colH, band: Math.max(1, crispScale((colH * 0.22) / SYDNEY_H)), aaryan })
    }
    measure()
    const ro = new ResizeObserver(measure)
    for (const el of [root, col, card]) ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { rootRef, colRef, cardRef, layout }
}

/* ---------------- Bottom screen ---------------- */

function TouchMenu({ focus, setFocus }: { focus: number; setFocus: (i: number) => void }) {
  const { sfx } = useSettings()
  const { name } = useVisitor()
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const moveTo = (i: number) => {
    if (i < 0 || i >= menu.length || i === focus) {
      sfx('bump')
      return
    }
    setFocus(i)
    refs.current[i]?.focus()
    sfx('cursor')
  }

  const open = (entry: MenuEntry) => {
    sfx('select')
    navigate(entry.route)
  }

  useGameKeys((k, e) => {
    const col = focus % COLS
    if (k === 'up') moveTo(focus - COLS)
    else if (k === 'down') moveTo(focus + COLS)
    else if (k === 'left') moveTo(col > 0 ? focus - 1 : -1)
    else if (k === 'right') moveTo(col < COLS - 1 ? focus + 1 : -1)
    else if (k === 'a' && !(e.target instanceof HTMLButtonElement)) open(menu[focus])
    else if (k === 'a' && e.key.toLowerCase() === 'z') open(menu[focus])
    else return
    e.preventDefault()
  })

  // number keys 1–8 jump straight to a section
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= menu.length && !(e.target instanceof HTMLInputElement)) open(menu[n - 1])
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  return (
    <div className="bg-dots flex h-full flex-1 flex-col">
      <div className="gv-header font-display flex items-center justify-between px-[3%] py-[1.6%] text-[clamp(13px,3.1cqi,18px)] text-paper">
        <span>MENU</span>
        <span className="text-frame-hi">
          TRAINER: <span className="text-gold">{name}</span>
        </span>
      </div>
      <nav aria-label="Sections" className="grid flex-1 grid-cols-2 gap-[2.2%] p-[2.5%] [grid-auto-rows:minmax(72px,1fr)] sm:[grid-auto-rows:1fr]">
        {menu.map((entry, i) => (
          <button
            key={entry.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            tabIndex={i === focus ? 0 : -1}
            aria-describedby={`tile-${entry.id}-num`}
            onFocus={() => setFocus(i)}
            onMouseEnter={() => focus !== i && setFocus(i)}
            onClick={() => open(entry)}
            data-selected={i === focus}
            className="gv-tile group flex items-center gap-[6%] px-[5%] text-left outline-none focus-visible:outline-none"
            style={{ ['--tile' as string]: entry.color[0], ['--tile-dark' as string]: entry.color[1] }}
          >
            <span className="gv-chip flex shrink-0 items-center justify-center p-[3%]">
              <span className="flex sm:hidden">
                <PixelIcon name={entry.icon} scale={2} />
              </span>
              <span className="hidden sm:flex">
                <PixelIcon name={entry.icon} scale={3} />
              </span>
            </span>
            <span className="gv-label min-w-0 text-[clamp(14px,3.6cqi,22px)] leading-tight text-paper">{entry.label}</span>
            <span id={`tile-${entry.id}-num`} className="font-display absolute top-[6%] right-[4%] text-[13px] text-paper/70">
              <span className="sr-only">Shortcut key </span>
              {i + 1}
            </span>
            {i === focus && (
              <span aria-hidden className="cursor-arrow font-display absolute bottom-[8%] right-[5%] text-[17px] text-gold text-outline">
                ▶
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}

/**
 * The medal case under the trainer card, as BW's Trainer Card shows badges: every medal in its
 * slot, the earned ones lit in their tier and the rest dark sockets. Opens the medal box.
 */
function MedalCase({ earned, onOpen }: { earned: readonly string[]; onOpen: () => void }) {
  const have = new Set(earned)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Medal case: ${have.size} of ${medals.length} medals. Open the medal box.`}
      className="medal-case hidden w-full cursor-pointer border-0 px-[4%] py-[3%] text-left sm:block"
    >
      <span className="font-display cq-text-xs flex items-center justify-between text-ink">
        <span>★ MEDALS</span>
        <span>
          {have.size}/{medals.length}
        </span>
      </span>
      <span className="medal-slots mt-[3%] grid">
        {medals.map((m) => (
          <span key={m.id} className="medal-slot flex items-center justify-center" title={have.has(m.id) ? m.name : undefined}>
            {have.has(m.id) ? <MedalArt medal={m} earned scale={2} /> : <span className="medal-socket" />}
          </span>
        ))}
      </span>
    </button>
  )
}

