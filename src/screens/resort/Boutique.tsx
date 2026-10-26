import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CLOTH_COLOURS, type Appearance } from '../../sprites/character'
import type { Facing } from '../../sprites/overworld'
import { OW_H, OW_W, OW_WORLD } from '../../sprites/overworld'
import { useSettings } from '../../systems/settings'
import { CharacterSprite, crispScale } from '../../ui/CharacterSprite'
import { OverworldSprite } from '../../ui/OverworldSprite'

/**
 * The Studio's top screen: inside the boutique. You walk in and stand by the long mirror while you
 * shop on the touch screen; the mirror shows the look you're putting together. Saving plays the
 * changing-room routine: you walk to a fitting room, its door opens, you step in, it shuts, the
 * OCCUPIED lamp lights and the cubicle rocks as clothes fly over the top, then the door opens and
 * you step out in the new look to a sparkle. Tap the screen to skip. With reduced motion you
 * simply appear in the new look.
 *
 * The room is drawn once (per door state) on a 192×144 canvas, scaled up pixelated; the trainer,
 * mirror reflection and effects are DOM layers over it, placed in the same 192×144 units.
 */

const W = 192
const H = 144
/** Where things stand, in room units (x is the trainer's centre, y their feet). */
const SPOT = {
  door: { x: 16, y: 104 },
  mirror: { x: 101, y: 114 },
  room: [
    { x: 136, y: 100 },
    { x: 170, y: 100 },
  ],
} as const
/** The fitting room the trainer uses (the far one is "occupied" by a mannequin's spare stock). */
const ROOM = 0

type DoorState = 'closed' | 'open'
type Phase = 'enter' | 'browse' | 'toRoom' | 'doorOpen' | 'stepIn' | 'changing' | 'stepOut' | 'reveal' | 'done'

/** How long each step of the routine lasts (ms); 'browse' waits for the save. */
const STEP_MS: Record<Exclude<Phase, 'browse' | 'done'>, number> = {
  enter: 1100,
  toRoom: 1000,
  doorOpen: 260,
  stepIn: 420,
  changing: 1500,
  stepOut: 460,
  reveal: 1100,
}

export function Boutique({ look, draft, saving, onFinished }: { look: Appearance; draft: Appearance; saving: Appearance | null; onFinished: () => void }) {
  const { reducedMotion, sfx } = useSettings()
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [phase, setPhase] = useState<Phase>(reducedMotion ? 'browse' : 'enter')
  // the look the trainer is wearing: the saved one until they come out of the fitting room
  const [wearing, setWearing] = useState(look)
  const [doors, setDoors] = useState<[DoorState, DoorState]>(['closed', 'closed'])

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])


  // the routine: each phase hands on to the next after its time
  useEffect(() => {
    if (phase === 'browse' || phase === 'done') return
    const next: Partial<Record<Phase, () => void>> = {
      enter: () => setPhase('browse'),
      toRoom: () => {
        sfx('open')
        setDoors(open(ROOM))
        setPhase('doorOpen')
      },
      doorOpen: () => setPhase('stepIn'),
      stepIn: () => {
        setDoors(['closed', 'closed'])
        setPhase('changing')
      },
      changing: () => {
        if (saving) setWearing(saving)
        sfx('open')
        setDoors(open(ROOM))
        setPhase('stepOut')
      },
      stepOut: () => {
        setDoors(['closed', 'closed'])
        sfx('statUp')
        setPhase('reveal')
      },
      reveal: () => setPhase('done'),
    }
    const t = window.setTimeout(() => next[phase]?.(), STEP_MS[phase])
    return () => window.clearTimeout(t)
  }, [phase, saving, sfx])

  // saving starts the walk to the fitting room (or, with reduced motion, just changes)
  useEffect(() => {
    if (!saving) return
    if (reducedMotion) {
      setWearing(saving)
      setPhase('done')
    } else setPhase((p) => (p === 'browse' || p === 'enter' ? 'toRoom' : p))
  }, [saving, reducedMotion])

  // hand back once (the parent closes the Studio, which unmounts this)
  const finished = useRef(false)
  useEffect(() => {
    if (phase !== 'done' || !saving || finished.current) return
    finished.current = true
    onFinished()
  }, [phase, saving, onFinished])

  const skip = () => {
    if (!saving) {
      if (phase === 'enter') setPhase('browse')
      return
    }
    setWearing(saving)
    setDoors(['closed', 'closed'])
    setPhase('done')
  }

  // css px per room unit: the whole room's width always fits; a taller screen gets more ceiling and floor
  const u = box.h && box.w ? Math.min(box.h / H, box.w / W) : 0
  const rows = u ? Math.max(H, Math.ceil(box.h / u)) : H
  const lift = Math.floor((rows - H) * 0.3)
  // where the trainer is, which way they face, and whether they're walking (CSS transitions do the rest)
  const room = SPOT.room[ROOM]
  const at: Record<Phase, { x: number; y: number; facing: Facing; walking: boolean; ms: number; hidden?: boolean }> = {
    enter: { x: SPOT.mirror.x, y: SPOT.mirror.y, facing: 'right', walking: true, ms: STEP_MS.enter },
    browse: { x: SPOT.mirror.x, y: SPOT.mirror.y, facing: 'up', walking: false, ms: 0 },
    toRoom: { x: room.x, y: room.y + 8, facing: 'right', walking: true, ms: STEP_MS.toRoom },
    doorOpen: { x: room.x, y: room.y + 8, facing: 'up', walking: false, ms: 0 },
    stepIn: { x: room.x, y: room.y - 6, facing: 'up', walking: true, ms: STEP_MS.stepIn },
    changing: { x: room.x, y: room.y - 6, facing: 'up', walking: false, ms: 0, hidden: true },
    stepOut: { x: room.x, y: room.y + 10, facing: 'down', walking: true, ms: STEP_MS.stepOut },
    reveal: { x: room.x, y: room.y + 10, facing: 'down', walking: false, ms: 0 },
    done: { x: room.x, y: room.y + 10, facing: 'down', walking: false, ms: 0 },
  }
  // before any save the trainer stays by the mirror; 'done' without a save never happens
  const pos = at[phase]
  // the first frame of 'enter' starts at the shop door, then transitions to the mirror
  const [entered, setEntered] = useState(reducedMotion)
  useEffect(() => {
    if (entered) return
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => cancelAnimationFrame(r)
  }, [entered])
  const shown = phase === 'enter' && !entered ? { ...pos, x: SPOT.door.x, y: SPOT.door.y } : pos

  // the room, redrawn when a door opens or shuts (or the screen changes shape)
  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (ctx) drawRoom(ctx, rows, lift, doors, phase === 'changing')
  }, [doors, phase, rows, lift])

  const owScale = u ? crispScale((u * 40) / (OW_H * OW_WORLD)) : 0
  const owW = OW_W * OW_WORLD * owScale
  const owH = OW_H * OW_WORLD * owScale

  return (
    <div ref={wrap} className="boutique absolute inset-0 cursor-pointer overflow-hidden bg-[#2a1a24]" onClick={skip} role="img" aria-label="Inside the Studio boutique: clothes racks, a long mirror and two fitting rooms">
      {/* the room keeps a 4:3 shape, centred (the top screen is 4:3 or a little taller) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: u * W, height: rows * u }}>
        <canvas ref={canvas} width={W} height={rows} className="pixelated absolute inset-0 h-full w-full" />
        {/* everything below is placed in room units from the room's own top */}
        <div className="absolute inset-x-0" style={{ top: lift * u, height: H * u }}>
        {/* the fitting rooms' sign (DOM text stays crisp at any size) */}
        {u > 0 && (
          <span aria-hidden className="font-display absolute flex items-center justify-center leading-none text-[#fff3e6]" style={{ left: 121 * u, top: 23 * u, width: 68 * u, height: 7 * u, fontSize: 5 * u, letterSpacing: 0.6 * u }}>
            FITTING ROOMS
          </span>
        )}
        {/* the mirror shows the look being put together on the touch screen */}
        {u > 0 && (
          <div className="absolute flex items-end justify-center overflow-hidden" style={{ left: 90 * u, top: 34 * u, width: 22 * u, height: 58 * u }}>
            <div className="boutique-mirror-glint pointer-events-none absolute inset-0 z-10" />
            <CharacterSprite appearance={draft} scale={crispScale((u * 52) / 120)} still={reducedMotion} alt="Your look in the mirror" style={{ opacity: 0.92 }} />
          </div>
        )}
        {/* the trainer */}
        {u > 0 && !pos.hidden && (
          <div
            className={`absolute ${phase === 'reveal' ? 'boutique-hop' : ''}`}
            style={{
              left: shown.x * u - owW / 2,
              top: shown.y * u - owH,
              width: owW,
              height: owH,
              transition: shown.ms ? `left ${shown.ms}ms linear, top ${shown.ms}ms linear` : 'none',
            }}
          >
            <OverworldSprite appearance={wearing} facing={shown.facing} walking={shown.walking && !reducedMotion} scale={owScale} />
          </div>
        )}
        {/* the cubicle rocks and clothes fly over the top while they change */}
        {phase === 'changing' && u > 0 && (
          <div aria-hidden className="pointer-events-none absolute" style={{ left: (room.x - 16) * u, top: 30 * u, width: 32 * u, height: 66 * u }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="boutique-toss absolute"
                style={{
                  left: `${30 + i * 20}%`,
                  top: 0,
                  width: 7 * u,
                  height: 6 * u,
                  background: Object.values(CLOTH_COLOURS)[(i * 5 + 3) % 15][0],
                  boxShadow: `0 0 0 ${Math.max(1, u * 0.6)}px #1c1a24`,
                  animationDelay: `${i * 380}ms`,
                  ['--dx' as string]: `${(i - 1) * 14 * u}px`,
                }}
              />
            ))}
          </div>
        )}
        {/* the reveal: sparkles round the new look */}
        {phase === 'reveal' && u > 0 && (
          <div aria-hidden className="pointer-events-none absolute" style={{ left: room.x * u, top: (room.y - 14) * u }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="boutique-sparkle absolute text-gold" style={{ fontSize: 9 * u, ['--a' as string]: `${i * 60}deg`, ['--r' as string]: `${22 * u}px`, animationDelay: `${(i % 3) * 90}ms` }}>
                ✦
              </span>
            ))}
            <span className="font-display boutique-bubble absolute -translate-x-1/2 gv-bubble px-2 py-0.5 whitespace-nowrap text-ink" style={{ top: -30 * u, fontSize: Math.max(11, 7 * u) }}>
              LOOKING SHARP!
            </span>
          </div>
        )}
        </div>
      </div>
      <span className="font-display pointer-events-none absolute top-[2%] left-[2%] bg-ink/75 px-2 py-0.5 text-[clamp(10px,2.6cqi,14px)] text-paper">THE STUDIO · BOUTIQUE</span>
      {saving && phase !== 'done' && !reducedMotion && <span className="font-display pointer-events-none absolute right-[2%] bottom-[2%] bg-ink/70 px-2 py-0.5 text-[clamp(10px,2.4cqi,13px)] text-paper">TAP TO SKIP ▸▸</span>}
    </div>
  )
}

const open = (i: number): [DoorState, DoorState] => (i === 0 ? ['open', 'closed'] : ['closed', 'open'])

/* ---------------- the room ---------------- */

/** The room on a canvas `rows` tall: `lift` rows of extra ceiling above the 192×144 room, the rest extra floor below. */
function drawRoom(ctx: CanvasRenderingContext2D, rows: number, lift: number, doors: [DoorState, DoorState], occupied: boolean) {
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c
    ctx.fillRect(x, y, w, h)
  }
  const ink = '#1c1a24'
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, W, rows)
  ctx.translate(0, lift)
  const floorRows = rows - lift
  // ceiling and cornice
  r(0, -lift, W, lift + 10, '#5a2a3c')
  r(0, 10, W, 2, '#3a1a28')
  // wallpaper: pink with paler stripes and a little diamond between them
  r(0, 12, W, 70, '#f2bfd0')
  for (let x = 2; x < W; x += 10) r(x, 12, 4, 70, '#f7d4df')
  for (let x = 7; x < W; x += 10) for (let y = 18; y < 80; y += 12) r(x, y, 1, 1, '#e3a3b8')
  // wainscot and skirting
  r(0, 82, W, 14, '#fff3e6')
  for (let x = 4; x < W; x += 16) r(x, 85, 12, 8, '#f3e0cc')
  r(0, 94, W, 2, '#c8a888')
  // floor: warm boards in rows, joints staggered, darker towards the back
  r(0, 96, W, floorRows - 96, '#c88e58')
  for (let y = 96; y < floorRows; y += 6) {
    r(0, y, W, 1, '#a46c3c')
    for (let x = (y / 6) % 2 ? 0 : 14; x < W; x += 28) r(x, y, 1, 6, '#a46c3c')
  }
  r(0, 96, W, 3, '#9a6234')
  // rug in front of the mirror
  ctx.fillStyle = '#b84870'
  ctx.beginPath()
  ctx.ellipse(101, 118, 30, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#d86a90'
  ctx.beginPath()
  ctx.ellipse(101, 118, 24, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  // pendant lamps
  for (const x of [40, 96, 152]) {
    r(x, 10, 1, 8, '#3a1a28')
    r(x - 5, 18, 11, 4, '#ffe08a')
    r(x - 5, 18, 11, 1, '#c8a040')
    r(x - 3, 22, 7, 1, '#fff4c0')
  }
  // the shop door (left), glass with the plaza's sky in it
  r(3, 46, 26, 50, ink)
  r(5, 48, 22, 48, '#8a5a3a')
  r(7, 50, 18, 26, '#a8d8f4')
  r(7, 50, 18, 6, '#d8f0fc')
  r(22, 78, 2, 4, '#ffd75a')
  r(4, 40, 24, 6, '#d12f3c')
  // the clothes rack: a rail on two posts, a row of tops on hangers in every colour
  const colours = Object.values(CLOTH_COLOURS)
  r(34, 36, 48, 2, '#8a90a0')
  r(35, 36, 2, 58, '#646a78')
  r(79, 36, 2, 58, '#646a78')
  r(32, 92, 8, 2, '#646a78')
  r(76, 92, 8, 2, '#646a78')
  for (let i = 0; i < 7; i++) {
    const [body, shade, light] = colours[(i * 2 + 3) % colours.length]
    const x = 39 + i * 6
    r(x + 2, 38, 1, 2, '#3a3a44')
    r(x, 40, 6, 1, '#3a3a44')
    r(x - 1, 41, 8, 16 + (i % 3) * 4, ink)
    r(x, 41, 6, 15 + (i % 3) * 4, body)
    r(x + 4, 41, 2, 15 + (i % 3) * 4, shade)
    r(x, 41, 6, 1, light)
  }
  // hat shelf above the rack
  r(34, 24, 48, 2, '#8a5a3a')
  const hat = (x: number, c: readonly string[]) => {
    r(x - 1, 18, 9, 6, ink)
    r(x, 19, 7, 5, c[0])
    r(x - 2, 23, 11, 1, c[1])
  }
  hat(38, CLOTH_COLOURS.red)
  hat(52, CLOTH_COLOURS.navy)
  hat(66, CLOTH_COLOURS.yellow)
  // shoe boxes under the rack
  for (let i = 0; i < 3; i++) {
    r(40 + i * 13, 86, 11, 8, ink)
    r(41 + i * 13, 87, 9, 6, ['#f4c838', '#f6f6f2', '#3a7fe0'][i])
  }
  // the long mirror: a gilt frame, pale glass (the reflection is drawn over it)
  r(87, 30, 28, 66, ink)
  r(88, 31, 26, 64, '#d8a838')
  r(90, 34, 22, 58, '#cfe4f2')
  r(90, 34, 22, 3, '#e8f4fc')
  r(98, 26, 6, 5, '#d8a838')
  // a potted palm between the mirror and the fitting rooms
  r(112, 84, 8, 10, ink)
  r(113, 85, 6, 9, '#c86a3c')
  for (const [dx, dy] of [[-4, -14], [4, -16], [0, -20], [-6, -8], [6, -9]]) r(115 + dx, 84 + dy, 3, 10, '#2f8a4c')
  // the fitting rooms: two cubicles under a sign, each with a lamp and a door
  r(120, 22, 70, 9, '#5a2a3c')
  r(121, 23, 68, 7, '#7a3a52')
  for (let i = 0; i < 2; i++) {
    const x = 122 + i * 34
    r(x - 2, 31, 34, 65, ink)
    r(x - 1, 32, 32, 64, '#8e4a62')
    // the lamp: green when free; red while you're in there
    const lit = occupied && i === ROOM
    r(x + 13, 33, 6, 3, lit ? '#ff4a4a' : '#56d070')
    r(x + 14, 33, 4, 1, lit ? '#ffb0b0' : '#b8f0c8')
    if (doors[i] === 'open') {
      // open: the dark cubicle with a hook and a stool, the door swung back against the wall
      r(x + 2, 38, 26, 58, '#3a2430')
      r(x + 2, 38, 26, 3, '#2a1820')
      r(x + 18, 46, 4, 1, '#d8a838')
      r(x + 6, 82, 12, 3, '#6a4636')
      r(x + 7, 85, 2, 10, '#4a3024')
      r(x + 15, 85, 2, 10, '#4a3024')
      r(x + 26, 38, 4, 58, ink)
      r(x + 27, 38, 3, 58, '#b0743e')
    } else {
      // shut: a panelled door with a brass knob
      r(x + 2, 38, 26, 58, '#b0743e')
      r(x + 5, 42, 20, 20, '#9a6234')
      r(x + 5, 68, 20, 22, '#9a6234')
      r(x + 6, 43, 18, 1, '#c88e58')
      r(x + 6, 69, 18, 1, '#c88e58')
      r(x + 23, 64, 2, 2, '#ffd75a')
    }
  }
}
