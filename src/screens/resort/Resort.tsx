import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { navigate } from '../../app/router'
import { menu } from '../../content/menu'
import { towerStages } from '../../content/aaryan'
import { species, type SpeciesId } from '../../battle/data'
import { floors, floorSetup, unlockedSpecies } from '../../battle/tower'
import { maps, placeVisitors, size, step, thingAt, tileAt, warpAt, isSolidTile, FLOOR_ARRIVAL, FLOOR_BOSS, type MapId, type Warp } from '../../resort/maps'
import { TILE } from '../../resort/tiles'
import { cameraFor, drawWorld, project, RES, VIEW_H, VIEW_W, type Actor } from '../../resort/render'
import { staff } from '../../resort/npcs'
import { WALK_CYCLE, type Facing } from '../../sprites/overworld'
import type { Appearance } from '../../sprites/character'
import { audio } from '../../systems/audio'
import { useSettings } from '../../systems/settings'
import { progress } from '../../systems/progress'
import { resortSave, useResortSave } from '../../systems/resortSave'
import { fetchTrainers, saveTrainer, trainersOnline, type OnlineTrainer } from '../../systems/trainers'
import { ChoiceMenu } from '../../ui/ChoiceMenu'
import { DialogueBox } from '../../ui/DialogueBox'
import { PixelBox } from '../../ui/PixelBox'
import { CharacterSprite } from '../../ui/CharacterSprite'
import { CreatureSprite } from '../battle/BattleBits'
import Fight from '../battle/Fight'
import { SectionScreen } from '../SectionScreen'
import AvatarStudio, { DEFAULT_AVATAR } from './AvatarStudio'
import SuggestionBox from './SuggestionBox'

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
  lines?: string[]
  party?: string[]
  greeting?: string
  message?: string
}
interface Dialogue {
  lines: string[]
  choices?: Array<{ label: string; action: () => void }>
  then?: () => void
}
type Panel = 'none' | 'studio' | 'pc' | 'lift' | 'profile' | 'suggest'

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

const floorNumber = (m: MapId) => (m.startsWith('floor') ? Number(m.slice(5)) : 0)

/* ---------------- screen ---------------- */

export default function Resort() {
  const save = useResortSave()
  const [fight, setFight] = useState<{ floor: number; seed: number } | null>(null)

  if (fight) {
    const stage = towerStages[fight.floor - 1]
    return (
      <Fight
        key={fight.seed}
        setup={floorSetup(fight.floor, save.party)}
        seed={fight.seed}
        title={`FLOOR ${fight.floor} · ${stage.title}`}
        opponent={{ look: stage.look, name: 'AARYAN', tag: `FLOOR ${fight.floor} · ${stage.title}`, winLines: [`AARYAN: ${stage.defeat}`], loseLines: ['AARYAN: Come back when you’re ready. The tower isn’t going anywhere.'] }}
        mode="tower"
        recordWin={fight.floor === 5 ? 'champion' : null}
        onExit={(_to, won) => {
          if (won) {
            resortSave.update({ floorCleared: Math.max(resortSave.get().floorCleared, fight.floor) })
            if (fight.floor >= 3) progress.unlock('tower-climber')
          }
          setFight(null)
        }}
      />
    )
  }
  return <World onBattle={(floor) => setFight({ floor, seed: (Date.now() ^ (Math.random() * 1e9)) | 0 })} />
}

function World({ onBattle }: { onBattle: (floor: number) => void }) {
  const { sfx, reducedMotion } = useSettings()
  const save = useResortSave()
  const [mapId, setMapId] = useState<MapId>(() => world.get().map)
  const [dialogue, setDialogue] = useState<Dialogue | null>(null)
  const [choicesReady, setChoicesReady] = useState(false)
  const [panel, setPanel] = useState<Panel>(save.avatar ? 'none' : 'studio')
  const [nearby, setNearby] = useState<Char | null>(null)
  const [profile, setProfile] = useState<Char | null>(null)
  const [online, setOnline] = useState<OnlineTrainer[]>([])
  const [onlineState, setOnlineState] = useState<'off' | 'loading' | 'ok' | 'error'>(trainersOnline ? 'loading' : 'off')
  const [syncNote, setSyncNote] = useState('')
  const [fade, setFade] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tagRefs = useRef(new Map<string, HTMLDivElement>())
  const me = useRef({ ...world.get(), moving: null as null | { tx: number; ty: number; t0: number; dur: number }, turnAt: 0, bumpAt: 0 })
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
    fetchTrainers()
      .then((t) => {
        setOnline(t.filter((x) => x.id !== resortSave.get().trainerId))
        setOnlineState('ok')
      })
      .catch(() => setOnlineState('error'))
  }, [])

  /* ----- characters on this map ----- */
  const chars: Char[] = useMemo(() => {
    const list: Char[] = staff.filter((s) => s.map === mapId).map((s) => ({ id: s.id, x: s.x, y: s.y, facing: s.facing, look: s.look, name: s.name, kind: 'staff' as const, lines: s.lines }))
    const n = floorNumber(mapId)
    if (n) list.push({ id: 'boss', ...FLOOR_BOSS, facing: 'down', look: towerStages[n - 1].look, name: 'AARYAN', kind: 'boss' })
    if (mapId === 'plaza' && online.length) {
      const blockedSpots = [...list, maps.plaza.spawn!, { x: me.current.x, y: me.current.y }]
      const placed = placeVisitors(maps.plaza, online.map((o) => o.id), blockedSpots)
      for (const o of online) {
        const p = placed.get(o.id)
        if (p) list.push({ id: o.id, ...p, look: o.appearance, name: o.name, kind: 'visitor', party: o.party, greeting: o.greeting, message: o.message })
      }
    }
    return list
  }, [mapId, online])
  const charsRef = useRef(chars)
  charsRef.current = chars

  /* ----- music ----- */
  useEffect(() => {
    audio.setTrack(map.music === 'battle' ? 'battle' : 'resort')
  }, [map.music])
  useEffect(() => () => audio.setTrack('menu'), [])

  /* ----- game logic (refreshed every render, called from the loop) ----- */
  const warpTo = (to: MapId, x: number, y: number, facing: Facing) => {
    setFade(true)
    sfx('cursor')
    window.setTimeout(
      () => {
        Object.assign(me.current, { map: to, x, y, facing, moving: null })
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
      if (save.floorCleared >= n) return say({ lines: [`AARYAN · ${stage.title}: ${stage.defeat}`] })
      return say({
        lines: [`AARYAN · ${stage.title} (${stage.years}): ${stage.intro}`],
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
          'Welcome to the Battle Tower!',
          `▸ You’ve cleared ${save.floorCleared} of 5 floors.${save.floorCleared < 5 ? ` Floor ${next} is open.` : ' You’re the Champion!'}`,
          '▸ Use the PC on the left to set your party of up to three.',
          '▸ Got an idea for a new creature or type? Drop it in the red suggestion box.',
          '▸ The lift on the right takes you up. Fancy a quick exhibition match instead?',
        ],
        choices: [
          { label: 'QUICK BATTLE', action: () => navigate('/battle/quick') },
          { label: 'NO THANKS', action: () => undefined },
        ],
      })
    }
    say({ lines: c.lines ?? ['…'] })
  }

  const interact = () => {
    const m = me.current
    const t = step(m.x, m.y, m.facing)
    const cs = charsRef.current
    const c = cs.find((x) => x.x === t.x && x.y === t.y) ?? (tileAt(maps[m.map], t.x, t.y) === 'C' ? cs.find((x) => { const t2 = step(t.x, t.y, m.facing); return x.x === t2.x && x.y === t2.y }) : undefined)
    if (c) return talk(c)
    const th = thingAt(maps[m.map], t.x, t.y)
    if (!th) return
    sfx('select')
    if (th.id === 'sign') return say({ lines: th.text ?? [] })
    if (th.id === 'studio') return setPanel('studio')
    if (th.id === 'pc') return setPanel('pc')
    if (th.id === 'suggest') return setPanel('suggest')
    if (th.id === 'lift') return setPanel('lift')
    if (th.id === 'lift-up') {
      const n = floorNumber(m.map)
      if (save.floorCleared < n) return say({ lines: ['The lift is locked. Beat Aaryan on this floor to go up.'] })
      if (n === 5) return say({ lines: ['This is the top of the tower. The view’s pretty good from here.'] })
      return warpTo(`floor${n + 1}` as MapId, FLOOR_ARRIVAL.x, FLOOR_ARRIVAL.y, FLOOR_ARRIVAL.facing)
    }
  }

  const arrive = () => {
    const m = me.current
    world.set({ map: m.map, x: m.x, y: m.y, facing: m.facing })
    const w: Warp | undefined = warpAt(maps[m.map], m.x, m.y)
    if (w) return warpTo(w.to, w.tx, w.ty, w.facing)
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
              m.moving = { tx: t.x, ty: t.y, t0: now, dur: run.current ? RUN_MS : WALK_MS }
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
      drawWorld(ctx, mp, cam, actors, now)

      // name tags + bubbles follow their owners
      const k2 = canvas.clientWidth / VIEW_W
      for (const c of charsRef.current) {
        const el = tagRefs.current.get(c.id)
        if (!el) continue
        const p = project(cam, c.x * TILE + 8, c.y * TILE + 14)
        el.style.transform = `translate(${p.x * k2}px, ${(p.y - 40 * p.s) * k2}px) translate(-50%, -100%) scale(${Math.max(0.75, Math.min(1.1, p.s))})`
        el.style.opacity = p.y < 0 || p.y > VIEW_H + 20 ? '0' : '1'
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
    saveTrainer({ id: s.trainerId, secret: s.secret, name: s.name, greeting: s.greeting, appearance: s.avatar, party: s.party })
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
              if (first) say({ lines: [`Looking sharp, ${name}!`, '▸ Walk with the arrow keys or WASD (hold Shift to run), or use the pad below.', '▸ Press A / Enter to talk. The Battle Tower is straight ahead.'] })
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
      ) : panel === 'suggest' ? (
        <SuggestionBox onClose={() => setPanel('none')} />
      ) : panel === 'profile' && profile ? (
        <TrainerProfile trainer={profile} onClose={() => setPanel('none')} />
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
}) {
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
            <p className="font-display m-0 text-[15px]">{name || 'YOU'}</p>
            <p className="m-0 flex gap-1">
              {party.map((p) => (
                <span key={p} title={species[p].name} className="rounded-full bg-[#e8ecf4]">
                  <CreatureSprite id={p} scale={1} />
                </span>
              ))}
            </p>
            <p className="m-0 truncate text-muted">
              {onlineState === 'off' && 'Offline mode — no other visitors.'}
              {onlineState === 'loading' && 'Looking for other visitors…'}
              {onlineState === 'ok' && (visitors ? `${visitors} other visitor${visitors === 1 ? '' : 's'} here. Walk up to say hi.` : 'No other visitors yet — you’re the first!')}
              {onlineState === 'error' && 'Couldn’t reach the resort server right now.'}
            </p>
            {syncNote && <p className="m-0 truncate text-muted">{syncNote}</p>}
          </div>
        </PixelBox>
      )}

      <div className="flex items-center justify-between gap-3 px-1">
        <div className="relative aspect-square w-[min(34%,128px)] shrink-0">
          {pad('up', '▲', 'top-0 left-1/3 rounded-t-md')}
          {pad('down', '▼', 'bottom-0 left-1/3 rounded-b-md')}
          {pad('left', '◀', 'top-1/3 left-0 rounded-l-md')}
          {pad('right', '▶', 'top-1/3 right-0 rounded-r-md')}
          <span aria-hidden className="absolute top-1/3 left-1/3 h-1/3 w-1/3 bg-[#3a3d4e]" />
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" className="pixel-btn !text-[13px]" onClick={onAvatar}>
            AVATAR
          </button>
          <button type="button" className="pixel-btn !text-[13px]" onClick={() => navigate('/')}>
            EXIT
          </button>
        </div>
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
function TrainerProfile({ trainer, onClose }: { trainer: Char; onClose: () => void }) {
  return (
    <div className="space-y-3 p-[3%]">
      <PixelBox className="flex items-end gap-4 px-4 py-3">
        <div className="flex h-[150px] w-[110px] shrink-0 items-end justify-center rounded-md bg-[radial-gradient(circle_at_50%_85%,#dfe9f6_0_45%,transparent_46%)]">
          <CharacterSprite appearance={trainer.look} fill={0.98} alt={`${trainer.name}’s avatar`} />
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <p className="font-display m-0 text-[13px] text-muted">TRAINER</p>
          <p className="font-display m-0 text-[20px] text-dex-red">{trainer.name}</p>
          <p className="m-0 mt-2 text-[15px] break-words">“{trainer.message ?? trainer.greeting ?? 'Hi!'}”</p>
          {trainer.message && <p className="m-0 mt-1 text-[13px] text-muted">From the Poké Pager</p>}
        </div>
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
      <div className="flex justify-end">
        <button type="button" className="pixel-btn !text-[14px]" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  )
}
