import { useEffect, useRef, useState } from 'react'
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
import { TrainerSprite } from '../ui/TrainerSprite'
import { progress, useProgress } from '../systems/progress'
import { medals } from '../content/medals'
import { hasShinyCharm } from '../systems/konami'

const COLS = 2
// remembered for the session so Back returns the cursor to where it was
let lastFocus = 0

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

function StatusScreen({ entry }: { entry: MenuEntry }) {
  const { name } = useVisitor()
  const playtime = usePlaytime()
  const { sfx } = useSettings()
  const [shiny, setShiny] = useState(() => hasShinyCharm() || Math.random() < 1 / shinyOdds)
  const earned = Object.keys(useProgress().medals).length
  useEffect(() => {
    if (shiny) progress.unlock('shiny')
  }, [shiny])
  useEffect(() => {
    const on = () => setShiny(true)
    window.addEventListener('tdx:shiny-charm', on)
    return () => window.removeEventListener('tdx:shiny-charm', on)
  }, [])
  const [bubble, setBubble] = useState<string | null>(null)
  const [hopKey, setHopKey] = useState(0)
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
    setHopKey((k) => k + 1)
    setBubble(fill(line, name))
    window.clearTimeout(bubbleTimer.current)
    bubbleTimer.current = window.setTimeout(() => setBubble(null), 3200)
  }

  return (
    <div className="bg-stripes absolute inset-0 flex flex-col" style={{ ['--s1' as string]: '#d8343a', ['--s2' as string]: '#c42a31' }}>
      <div className="flex min-h-0 flex-1">
        {/* trainer on a platform */}
        <div className="relative w-[44%]">
          <div aria-hidden className="absolute bottom-[5%] left-[10%] h-[14%] w-[80%] rounded-[50%] bg-[#f8d8a8] shadow-[inset_0_-6px_0_#d8a870,0_0_0_3px_#1c1a24]" />
          <button
            type="button"
            onClick={poke}
            aria-label="Talk to Aaryan"
            className="absolute bottom-[10%] left-1/2 flex h-[80%] -translate-x-1/2 cursor-pointer items-end border-0 bg-transparent p-0"
          >
            <TrainerSprite key={hopKey} fill={0.98} shiny={shiny} className={hopKey ? 'hop' : ''} alt={shiny ? 'Shiny pixel-art sprite of Aaryan' : undefined} />
            {shiny && (
              <span aria-hidden className="sparkle absolute -top-1 -right-1 text-gold text-xl">
                ✦
              </span>
            )}
          </button>
          {bubble && (
            <PixelBox variant="plate" role="status" className="cq-text-xs absolute top-[4%] left-[6%] z-10 max-w-[150%] px-3 py-2 font-semibold">
              {bubble}
            </PixelBox>
          )}
        </div>

        {/* status plate */}
        <div className="flex w-[56%] flex-col justify-center py-[4%] pr-[4%]">
          <PixelBox variant="plate" className="px-[5%] py-[4%]">
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
            <button
              type="button"
              onClick={() => {
                sfx('select')
                navigate('/medals')
              }}
              className="font-display cq-text-xs mt-[6%] flex w-full cursor-pointer items-center justify-between border-0 bg-[#f8e8a8] px-[4%] py-[3%] text-ink gv-card hover:bg-[#fff0b8]"
            >
              <span>★ MEDALS</span>
              <span>
                {earned}/{medals.length}
              </span>
            </button>
          </PixelBox>
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
