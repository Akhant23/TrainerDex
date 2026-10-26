import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { species, type SpeciesId } from '../../battle/data'
import { floors } from '../../battle/tower'
import { paletteFor, type Appearance } from '../../sprites/character'
import { audio } from '../../systems/audio'
import { useGameKeys } from '../../systems/input'
import type { HallOfFameEntry } from '../../systems/progress'
import { useSettings } from '../../systems/settings'
import { CharacterSprite } from '../../ui/CharacterSprite'
import { PixelArt } from '../../ui/PixelArt'
import { SceneBackdrop } from '../../ui/SceneBackdrop'
import { CreatureSprite } from './BattleBits'

/**
 * The ending, after beating Champion Aaryan on the tower's top floor (and replayable from the
 * Hall of Fame). As in Black and White, the winning team is registered in the Hall of Fame one
 * creature at a time, each lit by a camera flash. Then:
 *   the Champion: you, in your victory pose, with your name on the plate
 *   the pin: the CHAMPION PIN is awarded and pinned on (the first time only; a replay just shows it)
 *   the credits: rolling up over the home screen's city, in gold
 *   the end card: back to the resort
 * Each scene moves on by itself; A / Enter / a click moves on sooner, SKIP goes to the end card.
 * Nothing here writes progress (the win was recorded before this opens), so replaying is safe.
 */

/**
 * The pin as it's awarded, drawn large: two ribbon tails (pink and blue, as on the chest), a gold
 * medal with a dark rim, a lighter bevel on the upper left and a white star (palette keys as in
 * character.ts: K ink, N/J ribbon, D gold, C pale gold, W white).
 */
const PIN_LARGE: string[] = (() => {
  const W = 22
  const H = 28
  const g = Array.from({ length: H }, () => Array<string>(W).fill('.'))
  // ribbon tails: a V of two straps meeting behind the medal
  for (let y = 0; y < 13; y++)
    for (let x = 0; x < W; x++) {
      const l = x - (3 + y * 0.45)
      const r = x - (W - 9 - y * 0.45)
      if (l >= 0 && l < 6) g[y][x] = l < 1 || l >= 5 || y === 0 ? 'K' : 'N'
      if (r >= 0 && r < 6) g[y][x] = r < 1 || r >= 5 || y === 0 ? 'K' : 'J'
    }
  // the medal
  const [cx, cy, R] = [10.5, 17.5, 9.4]
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - cx, y - cy)
      if (d > R) continue
      g[y][x] = d > R - 1.2 ? 'K' : d > R - 2.4 ? (x + y < cx + cy - 2 ? 'C' : 'D') : 'D'
    }
  // a five-pointed star in the middle (point-in-polygon on its ten corners)
  const star: Array<[number, number]> = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 2.4 : 5.6
    const t = -Math.PI / 2 + (i * Math.PI) / 5
    return [cx + Math.cos(t) * r, cy + 0.4 + Math.sin(t) * r]
  })
  const inStar = (x: number, y: number) => {
    let inside = false
    for (let i = 0, j = star.length - 1; i < star.length; j = i++) {
      const [xi, yi] = star[i]
      const [xj, yj] = star[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inStar(x + 0.5, y + 0.5)) g[y][x] = 'W'
  return g.map((r) => r.join(''))
})()

type Scene = 'hall' | 'champion' | 'pin' | 'credits' | 'end'
const ORDER: Scene[] = ['hall', 'champion', 'pin', 'credits', 'end']
const GOLD = ['#5a4410', '#4a3808'] as const
/** When each team member steps onto its pedestal (ms after the scene starts), and the scene's length after the last. */
const REGISTER_MS = 900
const HOLD_MS: Record<Exclude<Scene, 'end'>, number> = { hall: 1600, champion: 3600, pin: 3600, credits: 14000 }

export function ChampionEnding({ entry, look, name, pinAwarded, entryNumber, onDone, doneLabel = 'RETURN TO THE RESORT' }: { entry: HallOfFameEntry; look: Appearance; name: string; pinAwarded: boolean; entryNumber: number; onDone: () => void; doneLabel?: string }) {
  const { reducedMotion, sfx } = useSettings()
  const [scene, setScene] = useState<Scene>('hall')
  const [shown, setShown] = useState(reducedMotion ? entry.team.length : 0)
  const team = entry.team as SpeciesId[]
  const level = floors[floors.length - 1].playerLevel
  const wearing = useMemo<Appearance>(() => ({ ...look, badge: 'champion' }), [look])
  const next = () => setScene((s) => ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(s) + 1)])

  useEffect(() => {
    audio.setTrack('victory')
    return () => audio.setTrack('resort')
  }, [])

  // the Hall of Fame registers the team one at a time, each with a flash
  useEffect(() => {
    if (scene !== 'hall' || shown >= team.length) return
    const t = window.setTimeout(() => {
      sfx('select')
      setShown((n) => n + 1)
    }, shown === 0 ? 700 : REGISTER_MS)
    return () => window.clearTimeout(t)
  }, [scene, shown, team.length, sfx])

  // every scene but the end card moves on by itself
  useEffect(() => {
    if (scene === 'end' || (scene === 'hall' && shown < team.length)) return
    if (scene === 'pin') sfx('badge')
    const t = window.setTimeout(next, HOLD_MS[scene])
    return () => window.clearTimeout(t)
  }, [scene, shown, team.length, sfx])

  useGameKeys((k, e) => {
    if (k !== 'a' && k !== 'b') return
    e.preventDefault()
    e.stopImmediatePropagation()
    if (scene === 'end') return onDone()
    if (k === 'b') return setScene('end')
    if (scene === 'hall' && shown < team.length) return setShown(team.length)
    next()
  })

  const pinArt = useMemo(() => ({ pixels: PIN_LARGE, palette: paletteFor(wearing) }), [wearing])
  const date = new Date(entry.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hall of Fame"
      className="ending fixed inset-0 z-[70] flex cursor-pointer items-center justify-center overflow-hidden bg-[#0c0a06] [container-type:inline-size]"
      onClick={() => (scene === 'end' ? undefined : scene === 'hall' && shown < team.length ? setShown(team.length) : next())}
    >
      {scene !== 'end' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setScene('end')
          }}
          className="font-display absolute top-3 right-3 z-20 cursor-pointer border-0 bg-paper/10 px-3 py-1.5 text-[13px] text-paper"
        >
          SKIP ▸▸
        </button>
      )}

      {scene === 'hall' && (
        <div key="hall" className="ending-scene relative flex h-full w-full flex-col items-center justify-center gap-[4vh] px-4">
          <div aria-hidden className="ending-spot absolute inset-0" />
          <p className="ending-title font-display text-outline relative m-0 text-center text-[clamp(18px,4.4vw,40px)] text-gold">✦ WELCOME TO THE HALL OF FAME ✦</p>
          <div className="relative flex flex-wrap items-end justify-center gap-x-[3vw] gap-y-6">
            {team.map((id, i) => (
              <div key={id} className={`flex flex-col items-center gap-2 ${i < shown ? 'ending-register' : 'invisible'}`}>
                <CreatureSprite id={id} scale={3} still={reducedMotion} />
                <div aria-hidden className="h-3 w-[110%] rounded-[50%] bg-[#e8c860] shadow-[inset_0_-4px_0_#a07818,0_0_0_2px_#1c1a24]" />
                <span className="font-display text-[clamp(11px,1.6vw,15px)] text-paper">{species[id].name.toUpperCase()}</span>
                <span className="font-display text-[clamp(10px,1.3vw,13px)] text-gold">Lv{level}</span>
                {i === shown - 1 && !reducedMotion && <span aria-hidden className="ending-flash pointer-events-none fixed inset-0 bg-white" />}
              </div>
            ))}
          </div>
          <p className="font-display relative m-0 text-[clamp(11px,1.6vw,15px)] text-paper/70">
            HALL OF FAME No.{entryNumber} · {date}
          </p>
        </div>
      )}

      {scene === 'champion' && (
        <div key="champion" className="ending-scene relative flex h-full w-full flex-col items-center justify-center gap-[3vh] px-4">
          <div aria-hidden className="ending-rays absolute top-1/2 left-1/2 aspect-square w-[160vmax]" />
          <div className="relative flex h-[52vh] items-end">
            <CharacterSprite appearance={wearing} pose="victory" fill={1} still={reducedMotion} alt={`${name}, Champion`} />
          </div>
          <div className="ending-plate relative px-[4vw] py-[2vh] text-center">
            <p className="font-display m-0 text-[clamp(12px,1.8vw,17px)] text-[#7a5a10]">CONGRATULATIONS!</p>
            <p className="font-logo m-0 text-[clamp(26px,6vw,60px)] leading-none text-ink">{name}</p>
            <p className="font-display m-0 mt-1 text-[clamp(12px,1.8vw,17px)] text-ink">CHAMPION OF THE BATTLE RESORT</p>
          </div>
        </div>
      )}

      {scene === 'pin' && (
        <div key="pin" className="ending-scene relative flex h-full w-full flex-col items-center justify-center gap-[3vh] px-4 text-center">
          <div aria-hidden className="ending-spot absolute inset-0" />
          <div className="ending-pin relative">
            <PixelArt pixels={pinArt.pixels} palette={pinArt.palette} scale={7} label="The Champion Pin" />
          </div>
          <p className="font-display text-outline relative m-0 text-[clamp(15px,3vw,28px)] text-paper">{pinAwarded ? `${name} received the CHAMPION PIN!` : 'THE CHAMPION PIN'}</p>
          <p className="relative m-0 max-w-[560px] text-[clamp(14px,1.8vw,18px)] text-paper/80">
            {pinAwarded ? 'It’s pinned to your chest now: everyone at the resort can see it. Take it off or put it back on in the Studio, under EXTRAS.' : 'Yours to wear for good. Pin it on or take it off in the Studio, under EXTRAS.'}
          </p>
        </div>
      )}

      {scene === 'credits' && (
        <div key="credits" className="ending-scene bg-stripes absolute inset-0" style={{ ['--s1' as string]: GOLD[0], ['--s2' as string]: GOLD[1] }}>
          <SceneBackdrop tones={GOLD} />
          <div className="absolute inset-0 overflow-hidden">
            <div className="ending-credits absolute inset-x-0 top-full flex flex-col items-center gap-[5vh] px-4 text-center" style={{ animationDuration: `${HOLD_MS.credits}ms` }}>
              <Credit head="TRAINERDEX" big />
              <Credit head="STARRING" lines={[`${name} as the Challenger`, 'AARYAN as the Champion']} />
              <Credit head="YOUR TEAM" lines={team.map((id) => species[id].name)} />
              <Credit head="THE BATTLE RESORT" lines={['Five floors, five chapters', 'Sydney, NSW']} />
              <Credit head="DESIGN · CODE · PIXEL ART" lines={['Aaryan', 'Every sprite drawn in code for this site']} />
              <Credit head="SPECIAL THANKS" lines={['Everyone in the Photo Album', 'And you, for playing to the end']} />
              <Credit head="" lines={['Inspired by Pokémon Black and White.', 'A fan-inspired personal site, not affiliated with Nintendo, Game Freak, Creatures or The Pokémon Company.']} small />
            </div>
          </div>
        </div>
      )}

      {scene === 'end' && (
        <div key="end" className="ending-scene relative flex h-full w-full flex-col items-center justify-center gap-[4vh] px-4 text-center">
          <div aria-hidden className="ending-spot absolute inset-0" />
          <p className="font-logo text-outline relative m-0 text-[clamp(36px,9vw,96px)] leading-none text-gold">THE END</p>
          <p className="font-display relative m-0 text-[clamp(12px,1.8vw,17px)] text-paper/80">…until the next challenger. The tower’s always open for a rematch.</p>
          <button
            type="button"
            autoFocus
            className="pixel-btn pixel-btn--primary relative !text-[15px]"
            onClick={(e) => {
              e.stopPropagation()
              onDone()
            }}
          >
            {doneLabel} ▸
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}

function Credit({ head, lines = [], big = false, small = false }: { head: string; lines?: string[]; big?: boolean; small?: boolean }) {
  return (
    <div className="flex max-w-[640px] flex-col items-center gap-1">
      {head && <p className={`font-display text-outline m-0 text-gold ${big ? 'font-logo text-[clamp(30px,7vw,72px)]' : 'text-[clamp(13px,2vw,19px)]'}`}>{head}</p>}
      {lines.map((l) => (
        <p key={l} className={`text-outline m-0 text-paper ${small ? 'text-[clamp(11px,1.4vw,14px)] opacity-80' : 'font-display text-[clamp(14px,2.2vw,22px)]'}`}>
          {l}
        </p>
      ))}
    </div>
  )
}
