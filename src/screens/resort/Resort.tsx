import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { navigate } from '../../app/router'
import { menu } from '../../content/menu'
import { towerStages } from '../../content/aaryan'
import { anyLine, line, lines } from '../../content/script'
import { species, type SpeciesId } from '../../battle/data'
import { challengeSetup, floors, floorSetup, unlockedSpecies } from '../../battle/tower'
import { regulars } from '../../resort/regulars'
import { formatRecord, type BattleRecord } from '../../../supabase/functions/_shared/trainer'
import { maps, placeVisitors, size, step, thingAt, tileAt, warpAt, isSolidTile, FLOOR_ARRIVAL, FLOOR_BOSS, type MapId, type ResortMap, type Warp } from '../../resort/maps'
import { TILE } from '../../resort/tiles'
import { cameraFor, drawWorld, project, RES, VIEW_H, VIEW_W, type Actor, type CreatureActor } from '../../resort/render'
import { skyAt, skyLabel } from '../../resort/sky'
import { drawAmbient, FLYERS, newAmbient, SURFERS, tickFlyers, type AmbientState } from '../../resort/ambient'
import { staff } from '../../resort/npcs'
import { WALK_CYCLE, type Facing } from '../../sprites/overworld'
import type { Appearance } from '../../sprites/character'
import { audio } from '../../systems/audio'
import { useSettings } from '../../systems/settings'
import { progress } from '../../systems/progress'
import { recordResult, resortSave, useResortSave } from '../../systems/resortSave'
import { setReturnTo } from '../../systems/returnTo'
import { fetchTrainers, saveTrainer, syncTrainer, trainersOnline, type OnlineTrainer } from '../../systems/trainers'
import { ChoiceMenu } from '../../ui/ChoiceMenu'
import { DialogueBox } from '../../ui/DialogueBox'
import { PixelBox } from '../../ui/PixelBox'
import { CharacterSprite } from '../../ui/CharacterSprite'
import { CreatureSprite } from '../battle/BattleBits'
import Fight from '../battle/Fight'
import { SectionScreen } from '../SectionScreen'
import AvatarStudio, { DEFAULT_AVATAR, randomAvatar } from './AvatarStudio'
import SuggestionBox from './SuggestionBox'
import PartyBag from './PartyBag'
import { PixelIcon } from '../../ui/PixelIcon'
import type { IconName } from '../../sprites/icons'

const entry = menu.find((m) => m.id === 'battle')!
const WALK_MS = 150
const RUN_MS = 85

/* ---------------- world model ---------------- */

interface Char {
  id: string
  x: number
  y: number
  facing: Facing
  look: Appearance
  name: string
  kind: 'staff' | 'visitor' | 'boss'
  /** profile label, e.g. RESORT REGULAR / TRAVELLING TRAINER */
  badge?: string
  lines?: string[]
  party?: string[]
  greeting?: string
  message?: string
  record?: BattleRecord
  /** built-in resort regular rather than a real visitor */
  regular?: boolean
}
interface Dialogue {
  lines: string[]
  choices?: Array<{ label: string; action: () => void }>
  then?: () => void
}
type Panel = 'none' | 'studio' | 'pc' | 'lift' | 'profile' | 'suggest' | 'bag' | 'record'

// where you are survives leaving for a battle (and a page refresh) and coming back
type Place = { map: MapId; x: number; y: number; facing: Facing }
const start = maps.plaza.spawn!
const SPOT_KEY = 'tdx:v1:resort-spot'
function loadPlace(): Place {
  try {
    const p = JSON.parse(sessionStorage.getItem(SPOT_KEY) ?? 'null') as Place | null
    if (p && p.map in maps && !isSolidTile(maps[p.map], p.x, p.y) && !warpAt(maps[p.map], p.x, p.y)) return p
  } catch {
    /* fall through */
  }
  return { map: 'plaza', x: start.x, y: start.y, facing: start.facing }
}
let placeCache: Place | null = null
const world = {
  get: (): Place => (placeCache ??= loadPlace()),
  set(p: Place) {
    placeCache = p
    try {
      sessionStorage.setItem(SPOT_KEY, JSON.stringify(p))
    } catch {
      /* private mode: memory only */
    }
  },
}

const OPPOSITE: Record<Facing, Facing> = { up: 'down', down: 'up', left: 'right', right: 'left' }
/** Where the lead creature stands: the tile behind you, or your own tile if that's blocked. */
function petSpot(map: MapId, x: number, y: number, facing: Facing) {
  const mp = maps[map]
  const { w, h } = size(mp)
  const b = step(x, y, OPPOSITE[facing])
  const ok = b.x >= 0 && b.y >= 0 && b.x < w && b.y < h && !isSolidTile(mp, b.x, b.y)
  return { ...(ok ? b : { x, y }), facing }
}
const PLACE_NAMES: Record<MapId, string> = { plaza: 'the plaza', reception: 'the reception', floor1: 'the tower', floor2: 'the tower', floor3: 'the tower', floor4: 'the tower', floor5: 'the Champion’s floor' }

const floorNumber = (m: MapId) => (m.startsWith('floor') ? Number(m.slice(5)) : 0)

/* ---------------- travelling trainers ---------------- */

interface Guest {
  id: string
  x: number
  y: number
  look: Appearance
  name: string
  party: SpeciesId[]
  greeting: string
  record: BattleRecord
  mode: 'air' | 'sea'
  species: SpeciesId
  /** when they head off again */
  until: number
}

const GUEST_NAMES = ['RAFA', 'JUNO', 'IMOGEN', 'THEO', 'ZARA', 'ARLO', 'NOOR', 'LEVI', 'MAYA', 'FINN', 'ODETTE', 'KOFI']
const ALL_SPECIES = Object.keys(species) as SpeciesId[]
const rnd = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]
const arrived = new WeakSet<object>()
const departed = new Set<string>()

/** Every so often a trainer flies or surfs in; they stay a while, then leave the way they came. */
function tickGuests(a: AmbientState, now: number, mp: ResortMap, chars: Char[], me: [number, number], guests: Guest[], setGuests: (fn: (g: Guest[]) => Guest[]) => void) {
  // arrivals that just touched down become guests you can talk to
  for (const t of a.trips) {
    if (t.leaving || arrived.has(t) || now - t.t0 < t.dur) continue
    arrived.add(t)
    const name = rnd(GUEST_NAMES)
    const party = [t.species, ...ALL_SPECIES.filter((x) => x !== t.species).sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2))]
    const wins = Math.floor(Math.random() * 20)
    setGuests((g) => [...g, { id: t.id, x: t.tx, y: t.ty, look: t.look, name, party, greeting: anyLine(t.mode === 'air' ? 'guest.air' : 'guest.sea', { creature: species[t.species].name }), record: { titles: Math.random() < 0.1 ? 1 : 0, wins, losses: Math.floor(Math.random() * 15) }, mode: t.mode, species: t.species, until: now + 70_000 + Math.random() * 50_000 }])
  }
  // guests whose time is up head off
  for (const g of guests) {
    if (now < g.until || departed.has(g.id)) continue
    departed.add(g.id)
    setGuests((list) => list.filter((x) => x.id !== g.id))
    a.trips.push({ id: `${g.id}-out`, mode: g.mode, species: g.species, look: g.look, tx: g.x, ty: g.y, t0: now, dur: g.mode === 'air' ? 2600 : 6000, leaving: true, seaY: 28, fromX: g.x < 18 ? -3 : 41 })
  }
  a.trips = a.trips.filter((t) => now - t.t0 < t.dur + 500)
  if (now < a.nextGuest) return
  a.nextGuest = now + 35_000 + Math.random() * 35_000
  if (guests.length >= 4) return
  const mode: 'air' | 'sea' = Math.random() < 0.6 ? 'air' : 'sea'
  const taken = new Set([...chars.map((c) => `${c.x},${c.y}`), `${me[0]},${me[1]}`, ...a.trips.map((t) => `${t.tx},${t.ty}`)])
  const spots: Array<[number, number]> = []
  const [y0, y1, x0, x1] = mode === 'air' ? [8, 21, 9, 28] : [24, 26, 2, 35]
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!isSolidTile(mp, x, y) && !taken.has(`${x},${y}`) && tileAt(mp, x, y) !== 'D') spots.push([x, y])
  if (!spots.length) return
  const [tx, ty] = rnd(spots)
  const fromX = Math.random() < 0.5 ? -3 : 41
  a.trips.push({ id: `guest-${Math.floor(now)}`, mode, species: rnd(mode === 'air' ? FLYERS : SURFERS), look: randomAvatar(), tx, ty, t0: now, dur: mode === 'air' ? 2600 : 4000 + Math.abs(tx - fromX) * 120, leaving: false, seaY: 28, fromX })
}

/* ---------------- screen ---------------- */

type FightPlan = { seed: number } & ({ kind: 'tower'; floor: number } | { kind: 'challenge'; trainer: Char })

export default function Resort() {
  const save = useResortSave()
  const [fight, setFight] = useState<FightPlan | null>(null)

  if (fight?.kind === 'tower') {
    const stage = towerStages[fight.floor - 1]
    return (
      <Fight
        key={fight.seed}
        setup={floorSetup(fight.floor, save.party)}
        seed={fight.seed}
        title={`FLOOR ${fight.floor} · ${stage.title}`}
        opponent={{ look: stage.look, name: 'AARYAN', tag: `FLOOR ${fight.floor} · ${stage.title}`, winLines: [`AARYAN: ${line(`tower.${stage.id}.defeat`)}`], loseLines: [`AARYAN: ${line('tower.lose')}`] }}
        mode="tower"
        arena={{ map: `floor${fight.floor}` as MapId, x: FLOOR_BOSS.x, y: FLOOR_BOSS.y + 3 }}
        recordWin={fight.floor === 5 ? 'champion' : null}
        onExit={(_to, won) => {
          if (won) {
            resortSave.update({ floorCleared: Math.max(resortSave.get().floorCleared, fight.floor) })
            if (fight.floor >= 3) progress.unlock('tower-climber')
          }
          // beating the Champion floor earns a title
          recordResult(won, fight.floor === 5)
          void syncTrainer().catch(() => undefined)
          setFight(null)
        }}
      />
    )
  }
  if (fight?.kind === 'challenge') {
    const t = fight.trainer
    return (
      <Fight
        key={fight.seed}
        setup={challengeSetup((t.party ?? []) as SpeciesId[], save.party, t.name)}
        seed={fight.seed}
        title={`VS ${t.name}`}
        opponent={{ look: t.look, name: t.name, tag: t.record ? `RECORD ${formatRecord(t.record)}` : 'TRAINER', winLines: [`${t.name}: Good battle! I’ll get you next time.`], loseLines: [`${t.name}: That was close! Rematch whenever you like.`] }}
        mode="challenge"
        arena={{ map: 'plaza', x: 12, y: 19 }}
        onExit={(_to, won) => {
          recordResult(won)
          void syncTrainer().catch(() => undefined)
          setFight(null)
        }}
      />
    )
  }
  return (
    <World
      onBattle={(floor) => setFight({ kind: 'tower', floor, seed: (Date.now() ^ (Math.random() * 1e9)) | 0 })}
      onChallenge={(trainer) => setFight({ kind: 'challenge', trainer, seed: (Date.now() ^ (Math.random() * 1e9)) | 0 })}
    />
  )
}

function World({ onBattle, onChallenge }: { onBattle: (floor: number) => void; onChallenge: (trainer: Char) => void }) {
  const { sfx, reducedMotion } = useSettings()
  const save = useResortSave()
  const [mapId, setMapId] = useState<MapId>(() => world.get().map)
  const [dialogue, setDialogue] = useState<Dialogue | null>(null)
  const [choicesReady, setChoicesReady] = useState(false)
  const [panel, setPanel] = useState<Panel>(save.avatar ? 'none' : 'studio')
  const [nearby, setNearby] = useState<Char | null>(null)
  const [profile, setProfile] = useState<Char | null>(null)
  const [online, setOnline] = useState<OnlineTrainer[]>([])
  // travelling trainers who flew or surfed in and are hanging around for a while
  const [guests, setGuests] = useState<Guest[]>([])
  const guestsRef = useRef(guests)
  guestsRef.current = guests
  const ambient = useRef(newAmbient(performance.now()))
  const sky = useRef(skyAt())
  const [skyStatus, setSkyStatus] = useState(() => skyLabel(sky.current))
  useEffect(() => {
    const id = window.setInterval(() => {
      sky.current = skyAt()
      setSkyStatus(skyLabel(sky.current))
    }, 15_000)
    return () => window.clearInterval(id)
  }, [])
  const [onlineState, setOnlineState] = useState<'off' | 'loading' | 'ok' | 'error'>(trainersOnline ? 'loading' : 'off')
  const [syncNote, setSyncNote] = useState('')
  const [fade, setFade] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  // the view gets taller (sees further) when the screen is taller than 4:3
  const viewH = useRef(VIEW_H)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const fit = () => {
      const aspect = c.clientWidth ? Math.min(1.5, Math.max(0.6, c.clientHeight / c.clientWidth)) : 0.75
      viewH.current = Math.round(VIEW_W * aspect)
      c.height = viewH.current * RES
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(c)
    return () => ro.disconnect()
  }, [])
  const tagRefs = useRef(new Map<string, HTMLDivElement>())
  const me = useRef({ ...world.get(), moving: null as null | { tx: number; ty: number; t0: number; dur: number }, turnAt: 0, bumpAt: 0 })
  // your lead creature follows one step behind
  const pet = useRef({ ...(() => { const w = world.get(); return petSpot(w.map, w.x, w.y, w.facing) })(), moving: null as null | { fx: number; fy: number; tx: number; ty: number; t0: number; dur: number } })
  const held = useRef<Facing[]>([])
  // a quick tap (pressed and released between frames) still counts as one step
  const tapped = useRef<Facing | null>(null)
  const run = useRef(false)
  const blocked = useRef(false)
  blocked.current = !!dialogue || panel !== 'none' || fade

  const map = maps[mapId]
  const avatar = save.avatar ?? DEFAULT_AVATAR

  /* ----- online visitors ----- */
  useEffect(() => {
    if (!trainersOnline) return
    // live: refresh who's around every 20 seconds while the tab is visible
    const load = () => {
      if (document.visibilityState === 'hidden') return
      fetchTrainers()
        .then((t) => {
          setOnline(t.filter((x) => x.id !== resortSave.get().trainerId))
          setOnlineState('ok')
        })
        .catch(() => setOnlineState('error'))
    }
    load()
    const id = window.setInterval(load, 20_000)
    return () => window.clearInterval(id)
  }, [])

  /* ----- characters on this map ----- */
  const chars: Char[] = useMemo(() => {
    const list: Char[] = staff.filter((s) => s.map === mapId).map((s) => ({ id: s.id, x: s.x, y: s.y, facing: s.facing, look: s.look, name: s.name, kind: 'staff' as const, lines: lines(s.linesKey) }))
    const n = floorNumber(mapId)
    if (n) list.push({ id: 'boss', ...FLOOR_BOSS, facing: 'down', look: towerStages[n - 1].look, name: 'AARYAN', kind: 'boss' })
    if (mapId === 'plaza') {
      // real visitors first, then the resort regulars so the plaza is never empty
      const everyone: OnlineTrainer[] = [
        ...online,
        ...regulars.map((r) => ({ id: `regular-${r.id}`, name: r.name, appearance: r.look, party: r.party, greeting: line(`regular.${r.id}`), record: r.record, regular: true })),
      ]
      const blockedSpots = [...list, maps.plaza.spawn!, { x: me.current.x, y: me.current.y }, ...(maps.plaza.portals ?? []).map((p) => ({ x: p.x, y: p.y + 1 }))]
      const placed = placeVisitors(maps.plaza, everyone.map((o) => o.id), blockedSpots)
      for (const o of everyone) {
        const p = placed.get(o.id)
        if (p) list.push({ id: o.id, ...p, look: o.appearance, name: o.name, kind: 'visitor', party: o.party, greeting: o.greeting, message: o.message, record: o.record, regular: o.regular })
      }
      for (const g of guests) list.push({ id: g.id, x: g.x, y: g.y, facing: 'down', look: g.look, name: g.name, kind: 'visitor', party: g.party, greeting: g.greeting, record: g.record, regular: true, badge: 'TRAVELLING TRAINER' })
    }
    return list
  }, [mapId, online, guests])
  const charsRef = useRef(chars)
  charsRef.current = chars

  /* ----- music ----- */
  useEffect(() => {
    audio.setTrack(map.music ?? 'resort')
  }, [map.music])
  useEffect(() => () => audio.setTrack('menu'), [])

  /* ----- game logic (refreshed every render, called from the loop) ----- */
  const warpTo = (to: MapId, x: number, y: number, facing: Facing) => {
    setFade(true)
    sfx('cursor')
    window.setTimeout(
      () => {
        Object.assign(me.current, { map: to, x, y, facing, moving: null })
        Object.assign(pet.current, petSpot(to, x, y, facing), { moving: null })
        world.set({ map: to, x, y, facing })
        setMapId(to)
        setNearby(null)
        window.setTimeout(() => setFade(false), reducedMotion ? 0 : 160)
      },
      reducedMotion ? 0 : 180,
    )
  }

  const say = (d: Dialogue) => {
    setChoicesReady(false)
    setDialogue(d)
  }

  const talk = (c: Char) => {
    sfx('select')
    if (c.kind === 'visitor') {
      // their trainer profile opens on the bottom screen while they say hi up top
      setProfile(c)
      setPanel('profile')
      return say({ lines: [`${c.name}: ${c.message ?? c.greeting ?? 'Hi!'}`] })
    }
    if (c.kind === 'boss') {
      const n = floorNumber(mapId)
      const stage = towerStages[n - 1]
      if (save.floorCleared >= n) return say({ lines: [`AARYAN · ${stage.title}: ${line(`tower.${stage.id}.defeat`)}`] })
      return say({
        lines: [`AARYAN · ${stage.title} (${stage.years}): ${line(`tower.${stage.id}.intro`)}`],
        choices: [
          { label: 'BATTLE!', action: () => (world.set({ map: mapId, x: me.current.x, y: me.current.y, facing: me.current.facing }), onBattle(n)) },
          { label: 'NOT YET', action: () => undefined },
        ],
      })
    }
    if (c.id === 'receptionist') {
      const next = Math.min(5, save.floorCleared + 1)
      return say({
        lines: [
          ...lines('staff.receptionist.welcome'),
          `${line('staff.receptionist.progress', { cleared: save.floorCleared })} ${save.floorCleared < 5 ? line('staff.receptionist.next', { next }) : line('staff.receptionist.champion')}`,
          ...lines('staff.receptionist.tips'),
        ],
        choices: [
          { label: 'QUICK BATTLE', action: () => (setReturnTo('/battle'), navigate('/battle/quick')) },
          { label: 'NO THANKS', action: () => undefined },
        ],
      })
    }
    say({ lines: c.lines ?? ['…'] })
  }

  const reactPet = (lead: SpeciesId) => {
    const name = species[lead].name
    pet.current.facing = OPPOSITE[me.current.facing]
    audio.cry(lead)
    const vars = { creature: name, place: PLACE_NAMES[mapId] }
    const cry = `${name}: ${line(`cry.${lead}`)}`
    // it's raring to go: point the way to the Battle Tower
    if (Math.random() < 0.2) return say({ lines: [cry, line('follower.wantsBattle', vars), ...lines('follower.battleHint', vars)] })
    say({ lines: [cry, anyLine('follower.react', vars)] })
  }

  const interact = () => {
    const m = me.current
    const t = step(m.x, m.y, m.facing)
    const lead = resortSave.get().party[0]
    const pt = pet.current
    if (lead && !pt.moving && pt.x === t.x && pt.y === t.y && !(pt.x === m.x && pt.y === m.y)) return reactPet(lead)
    const cs = charsRef.current
    const c = cs.find((x) => x.x === t.x && x.y === t.y) ?? (tileAt(maps[m.map], t.x, t.y) === 'C' ? cs.find((x) => { const t2 = step(t.x, t.y, m.facing); return x.x === t2.x && x.y === t2.y }) : undefined)
    if (c) return talk(c)
    const th = thingAt(maps[m.map], t.x, t.y)
    if (!th) return
    sfx('select')
    if (th.id === 'sign') return say({ lines: th.textKey ? lines(th.textKey) : [] })
    if (th.id === 'studio') return setPanel('studio')
    if (th.id === 'pc') return setPanel('pc')
    if (th.id === 'suggest') return setPanel('suggest')
    if (th.id === 'lift') return setPanel('lift')
    if (th.id === 'lift-up') {
      const n = floorNumber(m.map)
      if (save.floorCleared < n) return say({ lines: lines('resort.liftLocked') })
      if (n === 5) return say({ lines: lines('resort.topFloor') })
      return warpTo(`floor${n + 1}` as MapId, FLOOR_ARRIVAL.x, FLOOR_ARRIVAL.y, FLOOR_ARRIVAL.facing)
    }
  }

  const arrive = () => {
    const m = me.current
    world.set({ map: m.map, x: m.x, y: m.y, facing: m.facing })
    const w: Warp | undefined = warpAt(maps[m.map], m.x, m.y)
    if (w) return warpTo(w.to, w.tx, w.ty, w.facing)
    const portal = maps[m.map].portals?.find((p) => p.x === m.x && p.y === m.y)
    if (portal) {
      // step back out of the doorway on return, then open that part of the site
      world.set({ map: m.map, x: m.x, y: m.y + 1, facing: 'down' })
      setReturnTo('/battle')
      setFade(true)
      sfx('open')
      window.setTimeout(() => navigate(portal.route), reducedMotion ? 0 : 220)
      return
    }
    // nearest visitor within 2 tiles
    let best: Char | null = null
    let bd = 3
    for (const c of charsRef.current) {
      if (c.kind !== 'visitor') continue
      const d = Math.abs(c.x - m.x) + Math.abs(c.y - m.y)
      if (d < bd) {
        bd = d
        best = c
      }
    }
    setNearby((cur) => (cur?.id === best?.id ? cur : best))
  }

  const ctl = useRef({ interact, arrive })
  ctl.current = { interact, arrive }

  /* ----- input ----- */
  useEffect(() => {
    const dirOf = (k: string): Facing | null =>
      k === 'ArrowUp' || k === 'w' || k === 'W' ? 'up' : k === 'ArrowDown' || k === 's' || k === 'S' ? 'down' : k === 'ArrowLeft' || k === 'a' || k === 'A' ? 'left' : k === 'ArrowRight' || k === 'd' || k === 'D' ? 'right' : null
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return
      if (e.key === 'Shift') run.current = true
      const d = dirOf(e.key)
      if (d && !blocked.current) {
        e.preventDefault()
        if (!held.current.includes(d)) held.current.push(d)
        if (!e.repeat) tapped.current = d
      }
      if ((e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') && !blocked.current && !e.repeat) {
        if (e.target instanceof HTMLButtonElement && e.key !== 'z' && e.key !== 'Z') return
        e.preventDefault()
        ctl.current.interact()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') run.current = false
      const d = dirOf(e.key)
      if (d) held.current = held.current.filter((x) => x !== d)
    }
    const blur = () => (held.current = [])
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  /* ----- render loop ----- */
  useEffect(() => {
    let raf = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const m = me.current
      const mp = maps[m.map]
      const { w, h } = size(mp)

      // movement
      if (m.moving) {
        if (now - m.moving.t0 >= m.moving.dur) {
          m.x = m.moving.tx
          m.y = m.moving.ty
          m.moving = null
          ctl.current.arrive()
        }
      }
      if (!m.moving && !blocked.current) {
        const d = held.current[held.current.length - 1] ?? tapped.current
        tapped.current = null
        if (d) {
          if (m.facing !== d) {
            m.facing = d
            m.turnAt = now
          } else if (now - m.turnAt > 70) {
            const t = step(m.x, m.y, d)
            const occupied = charsRef.current.some((c) => c.x === t.x && c.y === t.y)
            if (t.x < 0 || t.y < 0 || t.x >= w || t.y >= h || isSolidTile(mp, t.x, t.y) || occupied) {
              if (now - m.bumpAt > 350) {
                audio.play('bump')
                m.bumpAt = now
              }
            } else {
              const dur = run.current ? RUN_MS : WALK_MS
              m.moving = { tx: t.x, ty: t.y, t0: now, dur }
              // the creature steps into the tile you just left
              const pt = pet.current
              // finish its previous step first, or it snaps back a tile when you keep walking
              if (pt.moving) {
                pt.x = pt.moving.tx
                pt.y = pt.moving.ty
                pt.moving = null
              }
              if (pt.x !== m.x || pt.y !== m.y) {
                pt.facing = pt.x < m.x ? 'right' : pt.x > m.x ? 'left' : pt.y < m.y ? 'down' : 'up'
                pt.moving = { fx: pt.x, fy: pt.y, tx: m.x, ty: m.y, t0: now, dur }
              }
            }
          }
        }
      }

      // interpolated player position (pixels)
      const k = m.moving ? Math.min(1, (now - m.moving.t0) / m.moving.dur) : 0
      const px = (m.x + (m.moving ? (m.moving.tx - m.x) * k : 0)) * TILE
      const py = (m.y + (m.moving ? (m.moving.ty - m.y) * k : 0)) * TILE

      // camera follows the player's feet; the world is drawn in 2.5D
      const cam = cameraFor(mp, px + 8, py + 14)
      const walkFrame = WALK_CYCLE[Math.floor(now / 140) % 4]
      const actors: Actor[] = charsRef.current.map((c) => ({ look: c.look, facing: c.facing, frame: 0, x: c.x * TILE + 8, y: c.y * TILE + 14 }))
      actors.push({ look: resortSave.get().avatar ?? DEFAULT_AVATAR, facing: m.facing, frame: m.moving ? walkFrame : 0, x: px + 8, y: py + 14 })
      const pt = pet.current
      if (pt.moving && now - pt.moving.t0 >= pt.moving.dur) {
        pt.x = pt.moving.tx
        pt.y = pt.moving.ty
        pt.moving = null
      }
      const lead = resortSave.get().party[0]
      const creatures: CreatureActor[] = []
      if (lead) {
        const pk = pt.moving ? Math.min(1, (now - pt.moving.t0) / pt.moving.dur) : 0
        const fx = pt.moving ? pt.moving.fx + (pt.moving.tx - pt.moving.fx) * pk : pt.x
        const fy = pt.moving ? pt.moving.fy + (pt.moving.ty - pt.moving.fy) * pk : pt.y
        creatures.push({ id: lead, facing: pt.facing, x: fx * TILE + 8, y: fy * TILE + 13, hop: pt.moving ? Math.sin(pk * Math.PI) * 3 : 0, breath: pt.moving ? 0 : Math.floor(now / 520) % 2 })
      }
      // life around the plaza: flyers overhead, trainers flying or surfing in and out
      const amb = ambient.current
      if (mp.id === 'plaza') {
        tickFlyers(amb, now, randomAvatar)
        tickGuests(amb, now, mp, charsRef.current, [m.x, m.y], guestsRef.current, setGuests)
      }
      drawWorld(ctx, mp, cam, actors, now, creatures, viewH.current, {
        sky: sky.current,
        overlay: mp.id === 'plaza' ? (c, proj) => drawAmbient(c, amb, now, proj, Math.max(0, proj(0, -TILE).y * RES)) : undefined,
      })

      // name tags + bubbles follow their owners
      const k2 = canvas.clientWidth / VIEW_W
      for (const c of charsRef.current) {
        const el = tagRefs.current.get(c.id)
        if (!el) continue
        const p = project(cam, c.x * TILE + 8, c.y * TILE + 14, viewH.current)
        el.style.transform = `translate(${p.x * k2}px, ${(p.y - 40 * p.s) * k2}px) translate(-50%, -100%) scale(${Math.max(0.75, Math.min(1.1, p.s))})`
        el.style.opacity = p.y < 0 || p.y > viewH.current + 20 ? '0' : '1'
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* ----- touch D-pad ----- */
  const press = (d: Facing) => (e: RPointerEvent) => {
    e.preventDefault()
    if (!held.current.includes(d)) held.current.push(d)
    tapped.current = d
  }
  const release = (d: Facing) => () => (held.current = held.current.filter((x) => x !== d))

  /* ----- saving your avatar / party ----- */
  const pushOnline = (patch: Partial<ReturnType<typeof resortSave.get>>) => {
    const s = { ...resortSave.get(), ...patch }
    if (!trainersOnline || !s.avatar) return
    setSyncNote('Saving online…')
    saveTrainer({ id: s.trainerId, secret: s.secret, name: s.name, greeting: s.greeting, appearance: s.avatar, party: s.party, record: s.record })
      .then(() => setSyncNote('Saved — other visitors can see you now.'))
      .catch((e) => setSyncNote((e as Error).message))
  }

  const nearbyChar = nearby && chars.find((c) => c.id === nearby.id)

  return (
    <SectionScreen
      entry={entry}
      title={map.name}
      compactTop={false}
      backKeys={panel !== 'none' && !!save.avatar}
      onBack={() => {
        if (panel !== 'none' && save.avatar) {
          sfx('back')
          setPanel('none')
        } else navigate('/')
      }}
      scrollKey={panel}
      top={
        <div className="absolute inset-0 overflow-hidden bg-[#101018]">
          <canvas ref={canvasRef} width={VIEW_W * RES} height={VIEW_H * RES} className="pixelated block h-full w-full" aria-label={`${map.name}: a walkable pixel-art map`} role="img" />
          {/* name tags + speech bubbles */}
          {chars
            .filter((c) => c.kind !== 'staff' || c.id !== 'receptionist')
            .map((c) => (
              <div
                key={c.id}
                ref={(el) => {
                  if (el) tagRefs.current.set(c.id, el)
                  else tagRefs.current.delete(c.id)
                }}
                className="pointer-events-none absolute top-0 left-0 flex flex-col items-center"
              >
                {nearbyChar?.id === c.id && (
                  <span className="mb-1 max-w-[180px] bg-paper px-2 py-1 text-center text-[13px] leading-snug text-ink shadow-[0_0_0_2px_var(--color-ink)]">
                    {(c.message ?? c.greeting ?? 'Hi!').slice(0, 80)}
                  </span>
                )}
                {c.kind !== 'staff' && <span className="font-display bg-ink/75 px-1 text-[10px] leading-tight text-paper">{c.name}</span>}
              </div>
            ))}
          <div className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-150 ${fade ? 'opacity-100' : 'opacity-0'}`} />
          {dialogue && (
            <div className="absolute inset-x-[2%] bottom-[2%] flex flex-col items-end gap-1 [container-type:inline-size]">
              {dialogue.choices && choicesReady && (
                <ChoiceMenu
                  label="Choose"
                  choices={dialogue.choices.map((c, i) => ({ label: c.label, value: i }))}
                  onCancel={() => setDialogue(null)}
                  onChoose={(i) => {
                    const d = dialogue
                    setDialogue(null)
                    d.choices![i].action()
                  }}
                />
              )}
              <DialogueBox
                className="w-full"
                lines={dialogue.lines}
                waitOnLast={!dialogue.choices}
                onDone={() => {
                  if (dialogue.choices) return setChoicesReady(true)
                  const then = dialogue.then
                  setDialogue(null)
                  then?.()
                }}
              />
            </div>
          )}
        </div>
      }
    >
      {panel === 'studio' ? (
        <>
          {!save.avatar && (
            <PixelBox className="m-[3%] mb-0 px-4 py-3">
              <p className="font-display m-0 text-[15px] text-dex-red">WELCOME TO THE RESORT!</p>
              <p className="m-0 mt-1">Make your avatar first — other visitors will see it walking around.</p>
            </PixelBox>
          )}
          <AvatarStudio
            initial={avatar}
            initialName={save.name}
            initialGreeting={save.greeting}
            onCancel={save.avatar ? () => setPanel('none') : undefined}
            onSave={(a, name, greeting) => {
              const first = !save.avatar
              resortSave.update({ avatar: a, name, greeting })
              progress.unlock('resort-guest')
              pushOnline({ avatar: a, name, greeting })
              setPanel('none')
              if (first) say({ lines: lines('resort.welcome', { name }) })
            }}
          />
        </>
      ) : panel === 'pc' ? (
        <PartyPC
          onDone={(party) => {
            resortSave.update({ party })
            pushOnline({ party })
            setPanel('none')
          }}
        />
      ) : panel === 'record' ? (
        <RecordPanel onClose={() => setPanel('none')} />
      ) : panel === 'bag' ? (
        <PartyBag
          party={save.party}
          onLead={(id) => {
            const party = [id, ...save.party.filter((p) => p !== id)]
            resortSave.update({ party })
            pushOnline({ party })
          }}
          onPc={() => setPanel('pc')}
          onClose={() => setPanel('none')}
        />
      ) : panel === 'suggest' ? (
        <SuggestionBox onClose={() => setPanel('none')} />
      ) : panel === 'profile' && profile ? (
        <TrainerProfile
          trainer={profile}
          onClose={() => setPanel('none')}
          onChallenge={() => {
            sfx('start')
            setPanel('none')
            world.set({ map: mapId, x: me.current.x, y: me.current.y, facing: me.current.facing })
            onChallenge(profile)
          }}
        />
      ) : panel === 'lift' ? (
        <Lift
          cleared={save.floorCleared}
          onPick={(n) => {
            setPanel('none')
            warpTo(`floor${n}` as MapId, FLOOR_ARRIVAL.x, FLOOR_ARRIVAL.y, FLOOR_ARRIVAL.facing)
          }}
          onClose={() => setPanel('none')}
        />
      ) : (
        <Controls
          nearby={nearbyChar ?? null}
          party={save.party}
          name={save.name}
          avatar={avatar}
          onlineState={onlineState}
          visitors={online.length}
          syncNote={syncNote}
          press={press}
          release={release}
          onA={() => !blocked.current && ctl.current.interact()}
          onAvatar={() => setPanel('studio')}
          onBag={() => setPanel('bag')}
          onRecord={() => setPanel('record')}
          onIdeas={() => setPanel('suggest')}
          place={map.name}
          status={skyStatus}
        />
      )}
    </SectionScreen>
  )
}

/* ---------------- bottom-screen panels ---------------- */

function Controls({
  nearby,
  party,
  name,
  avatar,
  onlineState,
  visitors,
  syncNote,
  press,
  release,
  onA,
  onAvatar,
  onBag,
  onRecord,
  onIdeas,
  place,
  status,
}: {
  nearby: Char | null
  party: SpeciesId[]
  name: string
  avatar: Appearance
  onlineState: 'off' | 'loading' | 'ok' | 'error'
  visitors: number
  syncNote: string
  press: (d: Facing) => (e: RPointerEvent) => void
  release: (d: Facing) => () => void
  onA: () => void
  onAvatar: () => void
  onBag: () => void
  onRecord: () => void
  onIdeas: () => void
  place: string
  status: string
}) {
  const menuItems: Array<{ label: string; icon: IconName; color: string; onClick: () => void }> = [
    { label: 'PARTY', icon: 'battle', color: '#c02838', onClick: onBag },
    { label: 'RECORD', icon: 'card', color: '#d8a020', onClick: onRecord },
    { label: 'AVATAR', icon: 'profile', color: '#3a7fe0', onClick: onAvatar },
    { label: 'IDEAS', icon: 'book', color: '#2a9a90', onClick: onIdeas },
    {
      label: 'COMMENT',
      icon: 'pager',
      color: '#7a6ab8',
      onClick: () => {
        // leave a Poké Pager message, then come straight back here
        setReturnTo('/battle')
        navigate('/pager/compose')
      },
    },
    { label: 'EXIT', icon: 'settings', color: '#5a5d70', onClick: () => navigate('/') },
  ]
  const pad = (d: Facing, label: string, cls: string) => (
    <button
      type="button"
      aria-label={`Walk ${d}`}
      onPointerDown={press(d)}
      onPointerUp={release(d)}
      onPointerLeave={release(d)}
      onPointerCancel={release(d)}
      onContextMenu={(e) => e.preventDefault()}
      className={`absolute flex h-1/3 w-1/3 touch-none items-center justify-center border-0 bg-[#3a3d4e] text-[18px] text-paper select-none active:bg-[#5a5d70] ${cls}`}
    >
      {label}
    </button>
  )
  return (
    <div className="flex min-h-full flex-col justify-between gap-2 bg-[#d8e6f0] p-[3%]">
      {nearby ? (
        <PixelBox className="flex items-center gap-3 px-3 py-2">
          <CharacterSprite appearance={nearby.look} pose="portrait" scale={1} alt={`${nearby.name}’s avatar`} />
          <div className="min-w-0 flex-1">
            <p className="font-display m-0 text-[15px] text-dex-red">{nearby.name}</p>
            <p className="m-0 truncate text-[14px]">“{nearby.message ?? nearby.greeting ?? 'Hi!'}”</p>
            <p className="m-0 mt-1 flex gap-1" aria-label="Party">
              {(nearby.party ?? []).map((p) => (
                <span key={p} title={species[p as SpeciesId]?.name} className="rounded-full bg-[#e8ecf4]">
                  <CreatureSprite id={p as SpeciesId} scale={1} />
                </span>
              ))}
            </p>
          </div>
        </PixelBox>
      ) : (
        <PixelBox className="flex items-center gap-3 px-3 py-2">
          <CharacterSprite appearance={avatar} pose="portrait" scale={1} alt="Your avatar" />
          <div className="min-w-0 flex-1 text-[14px]">
            <p className="font-display m-0 flex items-baseline gap-2 text-[15px]">
              {name || 'YOU'}
              <span className="text-[13px] text-dex-red" title="Champion titles · wins · losses">
                {formatRecord(resortSave.get().record)}
              </span>
            </p>
            <p className="m-0 flex gap-1">
              {party.map((p) => (
                <span key={p} title={species[p].name} className="rounded-full bg-[#e8ecf4]">
                  <CreatureSprite id={p} scale={1} />
                </span>
              ))}
            </p>
            <p className="m-0 truncate text-muted">
              {onlineState === 'off' && 'Offline mode — just the resort regulars around.'}
              {onlineState === 'loading' && 'Looking for other visitors…'}
              {onlineState === 'ok' && (visitors ? `${visitors} other visitor${visitors === 1 ? '' : 's'} here. Walk up to say hi.` : 'No other visitors yet — you’re the first!')}
              {onlineState === 'error' && 'Couldn’t reach the resort server right now.'}
            </p>
            {syncNote && <p className="m-0 truncate text-muted">{syncNote}</p>}
          </div>
        </PixelBox>
      )}

      {/* status strip, C-Gear style */}
      <p className="font-display m-0 flex items-center justify-between gap-2 bg-[#2a2c3a] px-3 py-1.5 text-[12px] text-paper">
        <span className="truncate">{place}</span>
        <span className="shrink-0 text-gold">{status}</span>
      </p>

      {/* trainer menu */}
      <nav aria-label="Trainer menu" className="grid grid-cols-3 gap-2">
        {menuItems.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={it.onClick}
            className="flex cursor-pointer flex-col items-center gap-1 border-0 px-1 py-2 text-paper shadow-[0_0_0_2px_var(--color-ink),inset_0_-3px_0_rgb(0_0_0_/_0.25)]"
            style={{ background: it.color }}
          >
            <PixelIcon name={it.icon} scale={2} />
            <span className="font-display text-[12px] leading-none">{it.label}</span>
          </button>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-3 px-1">
        <div className="relative aspect-square w-[min(34%,128px)] shrink-0">
          {pad('up', '▲', 'top-0 left-1/3 rounded-t-md')}
          {pad('down', '▼', 'bottom-0 left-1/3 rounded-b-md')}
          {pad('left', '◀', 'top-1/3 left-0 rounded-l-md')}
          {pad('right', '▶', 'top-1/3 right-0 rounded-r-md')}
          <span aria-hidden className="absolute top-1/3 left-1/3 h-1/3 w-1/3 bg-[#3a3d4e]" />
        </div>
        <p className="m-0 hidden max-w-[11em] text-center text-[12px] leading-snug text-muted sm:block">Arrows / WASD to walk · Shift to run · A to talk</p>
        <button type="button" onClick={onA} aria-label="A: talk / interact" className="font-display h-14 w-14 shrink-0 cursor-pointer rounded-full border-0 bg-dex-red text-[20px] text-paper shadow-[0_0_0_3px_var(--color-ink),inset_0_-4px_0_rgb(0_0_0_/_0.25)]">
          A
        </button>
      </div>
    </div>
  )
}

function PartyPC({ onDone }: { onDone: (party: SpeciesId[]) => void }) {
  const { sfx } = useSettings()
  const save = useResortSave()
  const unlocked = unlockedSpecies(save.floorCleared)
  const [party, setParty] = useState<SpeciesId[]>(save.party.filter((p) => unlocked.includes(p)))
  const toggle = (id: SpeciesId) => {
    if (party.includes(id)) {
      if (party.length === 1) return sfx('bump')
      sfx('back')
      setParty(party.filter((p) => p !== id))
    } else {
      if (party.length >= 3) return sfx('bump')
      sfx('select')
      setParty([...party, id])
    }
  }
  return (
    <div className="space-y-3 p-[3%]">
      <PixelBox className="px-4 py-3">
        <p className="font-display m-0 text-[15px] text-dex-red">BOX: YOUR CREATURES</p>
        <ul className="m-0 mt-1 list-none space-y-1 p-0 text-[14px]">
          <li>▸ Pick up to 3 for your party, in battle order.</li>
          <li>▸ Clear tower floors to unlock more of Aaryan’s creatures.</li>
        </ul>
      </PixelBox>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(species) as SpeciesId[]).map((id) => {
          const open = unlocked.includes(id)
          const slot = party.indexOf(id)
          return (
            <button
              key={id}
              type="button"
              disabled={!open}
              onClick={() => toggle(id)}
              aria-pressed={slot >= 0}
              className={`relative flex cursor-pointer flex-col items-center gap-1 border-0 bg-paper px-1 py-2 disabled:cursor-not-allowed ${slot >= 0 ? 'shadow-[0_0_0_var(--u)_var(--color-gold)]' : 'shadow-[0_0_0_2px_var(--color-ink)]'}`}
            >
              <span className={open ? '' : 'brightness-0 opacity-40'}>
                <CreatureSprite id={id} scale={2} />
              </span>
              <span className="font-display text-[12px]">{open ? species[id].name : '?????'}</span>
              {slot >= 0 && <span className="font-display absolute top-1 left-1 bg-dex-red px-1 text-[11px] text-paper">{slot + 1}</span>}
            </button>
          )
        })}
      </div>
      <div className="flex justify-end">
        <button type="button" className="pixel-btn pixel-btn--primary !text-[14px]" onClick={() => onDone(party)}>
          ✓ DONE
        </button>
      </div>
    </div>
  )
}

function Lift({ cleared, onPick, onClose }: { cleared: number; onPick: (n: number) => void; onClose: () => void }) {
  return (
    <div className="space-y-2 p-[3%]">
      <p className="font-display m-0 text-[15px]">LIFT — CHOOSE A FLOOR</p>
      {floors.map((f) => {
        const stage = towerStages[f.floor - 1]
        const open = f.floor <= cleared + 1
        const done = f.floor <= cleared
        return (
          <button
            key={f.floor}
            type="button"
            disabled={!open}
            onClick={() => onPick(f.floor)}
            className="flex w-full cursor-pointer items-center gap-3 border-0 bg-paper px-3 py-2 text-left shadow-[0_0_0_2px_var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="font-display w-[3ch] text-[20px]">{f.floor}</span>
            <span className="min-w-0 flex-1">
              <span className="font-display block text-[14px] text-dex-red">{open ? stage.title : '?????'}</span>
              <span className="text-[13px] text-muted">{open ? `${stage.years} · ${f.opponent.length} creature${f.opponent.length === 1 ? '' : 's'}` : 'Clear the floor below first'}</span>
            </span>
            <span className="font-display text-[13px]">{done ? '✓ CLEARED' : open ? 'NEXT' : '🔒'}</span>
          </button>
        )
      })}
      <div className="flex justify-end">
        <button type="button" className="pixel-btn !text-[14px]" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  )
}

/** A visitor's trainer profile: their animated battle sprite, message and party. */
function TrainerProfile({ trainer, onClose, onChallenge }: { trainer: Char; onClose: () => void; onChallenge: () => void }) {
  const rec = trainer.record ?? { titles: 0, wins: 0, losses: 0 }
  return (
    <div className="space-y-3 p-[3%]">
      <PixelBox className="flex items-end gap-4 px-4 py-3">
        <div className="flex h-[150px] w-[110px] shrink-0 items-end justify-center rounded-md bg-[radial-gradient(circle_at_50%_85%,#dfe9f6_0_45%,transparent_46%)]">
          <CharacterSprite appearance={trainer.look} fill={0.98} alt={`${trainer.name}’s avatar`} />
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <p className="font-display m-0 text-[13px] text-muted">{trainer.badge ?? (trainer.regular ? 'RESORT REGULAR' : 'TRAINER')}</p>
          <p className="font-display m-0 text-[20px] text-dex-red">{trainer.name}</p>
          <p className="m-0 mt-2 text-[15px] break-words">“{trainer.message ?? trainer.greeting ?? 'Hi!'}”</p>
          {trainer.message && <p className="m-0 mt-1 text-[13px] text-muted">From the Poké Pager</p>}
        </div>
      </PixelBox>
      <PixelBox className="px-4 py-3">
        <p className="font-display m-0 text-[14px]">BATTLE RECORD</p>
        <p className="font-display m-0 mt-1 text-[26px] leading-tight text-dex-red" aria-label={`${rec.titles} Champion titles, ${rec.wins} wins, ${rec.losses} losses`}>
          {formatRecord(rec)}
        </p>
        <p className="m-0 text-[13px] text-muted">Champion titles · wins · losses at the Battle Resort</p>
      </PixelBox>
      <PixelBox className="px-4 py-3">
        <p className="font-display m-0 text-[14px]">PARTY</p>
        <ul className="m-0 mt-2 grid list-none grid-cols-3 gap-2 p-0">
          {(trainer.party ?? []).map((p) => (
            <li key={p} className="flex flex-col items-center gap-1 rounded-md bg-[#e8ecf4] py-2">
              <CreatureSprite id={p as SpeciesId} scale={2} />
              <span className="font-display text-[12px]">{species[p as SpeciesId]?.name ?? p}</span>
            </li>
          ))}
        </ul>
      </PixelBox>
      <div className="flex flex-wrap justify-end gap-2">
        {(trainer.party ?? []).length > 0 && (
          <button type="button" className="pixel-btn pixel-btn--primary !text-[14px]" onClick={onChallenge}>
            ⚔ CHALLENGE THEIR TEAM
          </button>
        )}
        <button type="button" className="pixel-btn !text-[14px]" onClick={onClose}>
          CLOSE
        </button>
      </div>
      <p className="m-0 text-[13px] text-muted">▸ You’ll face their most recent party, both sides at level 28. Wins and losses count towards your record.</p>
    </div>
  )
}

/** Your Battle Resort record and tower progress. */
function RecordPanel({ onClose }: { onClose: () => void }) {
  const save = useResortSave()
  const { record: r, floorCleared } = save
  const played = r.wins + r.losses
  return (
    <div className="space-y-4 p-[3%] text-[15px]">
      <PixelBox className="px-4 py-4">
        <p className="font-display m-0 text-[14px]">TRAINER RECORD</p>
        <p className="font-display m-0 mt-2 text-[34px] leading-none text-dex-red">{formatRecord(r)}</p>
        <p className="m-0 mt-2 text-[13px] text-muted">Champion titles · wins · losses at the Battle Resort</p>
        <dl className="font-display m-0 mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
          <dt className="text-muted">CHAMPION TITLES</dt>
          <dd className="m-0">{r.titles}</dd>
          <dt className="text-muted">WINS</dt>
          <dd className="m-0">{r.wins}</dd>
          <dt className="text-muted">LOSSES</dt>
          <dd className="m-0">{r.losses}</dd>
          <dt className="text-muted">WIN RATE</dt>
          <dd className="m-0">{played ? `${Math.round((r.wins / played) * 100)}%` : '—'}</dd>
        </dl>
      </PixelBox>
      <PixelBox className="px-4 py-4">
        <p className="font-display m-0 text-[14px]">BATTLE TOWER · {floorCleared}/5</p>
        <ol className="m-0 mt-3 list-none space-y-2 p-0">
          {towerStages.map((st) => (
            <li key={st.id} className="flex items-center gap-3">
              <span className={`font-display w-[2ch] text-center ${st.floor <= floorCleared ? 'text-leaf' : 'text-muted'}`}>{st.floor <= floorCleared ? '✓' : st.floor}</span>
              <span className="min-w-0 flex-1">{st.floor <= floorCleared || st.floor === floorCleared + 1 ? st.title : '?????'}</span>
              <span className="text-[13px] text-muted">{st.floor <= floorCleared ? 'cleared' : st.floor === floorCleared + 1 ? 'next' : ''}</span>
            </li>
          ))}
        </ol>
      </PixelBox>
      <div className="flex flex-wrap justify-end gap-2">
        <a href="#/battle/hall-of-fame" className="pixel-btn !text-[14px] no-underline">
          HALL OF FAME
        </a>
        <button type="button" className="pixel-btn !text-[14px]" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  )
}
