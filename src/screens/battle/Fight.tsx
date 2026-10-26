import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { navigate } from '../../app/router'
import { menu } from '../../content/menu'
import { types } from '../../content/pokedex'
import { moves, species, type Difficulty, type MoveId } from '../../battle/data'
import type { Appearance } from '../../sprites/character'
import { active, alive, createBattleFrom, nameOf, openingEvents, replace, takeTurn, type Action, type BattleEvent, type BattleSetup, type BattleState, type SideId } from '../../battle/engine'
import { audio, type Sfx } from '../../systems/audio'
import { TEXT_SPEED_MS, useSettings } from '../../systems/settings'
import { useVisitor } from '../../systems/visitor'
import { progress } from '../../systems/progress'
import { useGameKeys } from '../../systems/input'
import { trainerdexBadge } from '../../sprites/creatures'
import { ChoiceMenu } from '../../ui/ChoiceMenu'
import { PixelArt } from '../../ui/PixelArt'
import { PixelBox } from '../../ui/PixelBox'
import { TrainerSprite } from '../../ui/TrainerSprite'
import { CHAR_H } from '../../sprites/character'
import { CharacterSprite } from '../../ui/CharacterSprite'
import { signature } from '../../content/aaryan'
import { resortSave, playerLook } from '../../systems/resortSave'
import { useGridNav } from '../../ui/useGridNav'
import { SectionScreen } from '../SectionScreen'
import { CreatureSprite, HpBar, useHeightScale, type CreaturePose } from './BattleBits'
import { poseTimeline } from '../../battle/poses'
import { vsPosesFor, type VsPose } from '../../battle/vsPoses'
import { Backdrop } from './Backdrop'
import { arenaMapOf, RECEPTION_ARENA, type Arena } from '../../resort/arena'
import { useBattleFx } from './BattleFx'
import { tileAt } from '../../resort/maps'
import { CREATURE_SIZE } from '../../sprites/creatures'
import { platformArt, type PlatformKind } from '../../sprites/platforms'
import { pixelsToDataUrl } from '../../sprites/render'

const entry = menu.find((m) => m.id === 'battle')!

type Panel = 'none' | 'command' | 'fight' | 'party' | 'replace' | 'bag' | 'run' | 'results'
type Trainer = 'intro' | 'leaving' | 'gone' | 'defeated' | 'victorious'
type Anim = '' | 'enter' | 'lunge' | 'jump' | 'dive' | 'cast' | 'dodge' | 'hit' | 'faint' | 'statUp' | 'statDown' | 'heal' | 'out'

interface View {
  active: [number, number]
  hp: [number, number]
  shown: [boolean, boolean]
  anim: [Anim, Anim]
  animKey: [number, number]
  trainer: Trainer
  /** your own trainer, seen from behind until they throw out the first creature */
  me: 'intro' | 'throw' | 'leaving' | 'gone'
  shake: number
  message: string
  /** whose move is playing: the HUD hides, as in BW, and that creature's idle gestures pause */
  acting: SideId | null
  /** where the battle camera is pushed in (BW pans to the attacker, then cuts to the target) */
  cam: SideId | null
  /** how much the current move is stretched to Gen V pacing (scales the battlers' motion too) */
  tempo: number
  /** attack poses, for species that have them (battle/poses.ts) */
  pose: [CreaturePose | null, CreaturePose | null]
  /** how far the battle background is dimmed for the current move (0 = not at all) */
  dim: number
}

export interface FightOpponent {
  look?: Appearance
  /** Shown on the VS screen, e.g. "AARYAN" / "FLOOR 3 · MARKETING DIRECTOR". */
  name?: string
  tag?: string
  winLines?: string[]
  loseLines?: string[]
}

export default function Fight({
  setup,
  seed,
  title,
  opponent = {},
  mode = 'quick',
  recordWin = null,
  arena: arenaProp = RECEPTION_ARENA,
  onExit,
}: {
  setup: BattleSetup
  seed: number
  title: string
  opponent?: FightOpponent
  /** quick = exhibition vs Aaryan; tower = a tower floor; challenge = another visitor's team */
  mode?: 'quick' | 'tower' | 'challenge'
  /** Where the battle happens; its surroundings are drawn behind the battle. */
  arena?: Arena
  /** Quick battles and the Champion floor record a Hall of Fame entry + badge. */
  recordWin?: Difficulty | null
  onExit: (to: 'setup' | 'hall' | 'resort', won: boolean) => void
}) {
  const { settings, sfx, reducedMotion } = useSettings()
  // dev only: window.__arena = { map: 'floor1', x: 7, y: 6 } stages a quick battle anywhere, for QA
  const arena = (import.meta.env.DEV && (window as unknown as { __arena?: Arena }).__arena) || arenaProp
  const { name } = useVisitor()
  const [battle, setBattle] = useState<BattleState>(() => createBattleFrom(setup, seed))
  const [panel, setPanel] = useState<Panel>('none')
  const [encounter, setEncounter] = useState(true)
  const [vs, setVs] = useState<false | 'in' | 'out'>(false)
  const [result, setResult] = useState<{ won: boolean; firstBadge: boolean } | null>(null)
  const [view, setView] = useState<View>(() => ({
    active: [0, 0],
    hp: [battle.sides[0].team[0].hp, battle.sides[1].team[0].hp],
    shown: [false, false],
    anim: ['', ''],
    animKey: [0, 0],
    trainer: 'intro',
    me: 'intro',
    shake: 0,
    message: '',
    acting: null,
    cam: null,
    tempo: 1,
    pose: [null, null],
    dim: 0,
  }))
  const viewRef = useRef(view)
  viewRef.current = view
  const skipRef = useRef<(() => void) | null>(null)
  const fx = useBattleFx(reducedMotion)
  const alivePlayback = useRef(true)

  /* ---------- playback helpers ---------- */

  const patch = useCallback((p: Partial<View> | ((v: View) => Partial<View>)) => setView((v) => ({ ...v, ...(typeof p === 'function' ? p(v) : p) })), [])

  const wait = useCallback(
    (ms: number, skippable = true) =>
      new Promise<void>((res) => {
        const id = window.setTimeout(done, reducedMotion ? Math.min(ms, 350) : ms)
        function done() {
          window.clearTimeout(id)
          skipRef.current = null
          res()
        }
        if (skippable) skipRef.current = done
      }),
    [reducedMotion],
  )

  const say = useCallback(
    async (text: string) => {
      patch({ message: text })
      const per = TEXT_SPEED_MS[settings.textSpeed]
      await wait(Math.max(650, Math.min(2400, 500 + text.length * per * 1.4)))
    },
    [patch, wait, settings.textSpeed],
  )

  const animate = useCallback(
    (side: SideId, anim: Anim) =>
      patch((v) => {
        const a = [...v.anim] as View['anim']
        const k = [...v.animKey] as View['animKey']
        a[side] = anim
        k[side]++
        return { anim: a, animKey: k }
      }),
    [patch],
  )

  const setPose = useCallback(
    (side: SideId, pose: CreaturePose | null) =>
      patch((v) => {
        const p = [...v.pose] as View['pose']
        p[side] = pose
        return { pose: p }
      }),
    [patch],
  )

  const tweenHp = useCallback(
    async (side: SideId, to: number) => {
      const from = viewRef.current.hp[side]
      const steps = reducedMotion ? 1 : 12
      for (let i = 1; i <= steps; i++) {
        const v = from + ((to - from) * i) / steps
        patch((cur) => {
          const hp = [...cur.hp] as View['hp']
          hp[side] = v
          return { hp }
        })
        await new Promise((r) => window.setTimeout(r, 40))
      }
    },
    [patch, reducedMotion],
  )

  const play = useCallback(
    async (events: BattleEvent[], st: BattleState) => {
      for (let i = 0; i < events.length; i++) {
        const e = events[i]
        if (!alivePlayback.current) return
        switch (e.t) {
          case 'text':
            await say(e.text)
            break
          case 'move': {
            // BW's order (from White 2 footage, docs/GEN5-TIMING.md): the HUD hides and the camera
            // pushes in on the attacker, cuts to the target just before the hit, then pulls back
            // once the effect has finished; only then does the target flicker and its HP drain
            const mv = moves[e.move]
            const missed = events[i + 1]?.t === 'miss'
            const foe: SideId = e.side === 0 ? 1 : 0
            const run = fx.play(e.move, e.side, missed)
            patch({ acting: e.side, cam: reducedMotion ? null : e.side, tempo: run.tempo })
            if (run.motion !== 'none') animate(e.side, run.motion)
            sfx(mv.power ? 'select' : 'cursor')
            const timers: number[] = []
            // BW dims the background behind the battlers for some specials (STAGING in fx.ts)
            if (run.dim) {
              const d = run.dim
              timers.push(window.setTimeout(() => patch({ dim: d.amount }), d.fromMs), window.setTimeout(() => patch({ dim: 0 }), d.toMs))
            }
            if (!reducedMotion && (mv.power > 0 || mv.effect.kind === 'target')) timers.push(window.setTimeout(() => patch({ cam: foe }), Math.max(0, run.impactMs - 260)))
            // a wind-up and a strike frame, for the species that have them
            const species = st.sides[e.side].team[viewRef.current.active[e.side]]?.species
            const steps = reducedMotion || !species ? null : poseTimeline(species, e.move, run.impactMs)
            for (const step of steps ?? []) timers.push(window.setTimeout(() => setPose(e.side, step.pose), step.at))
            await run.done
            timers.forEach((t) => window.clearTimeout(t))
            setPose(e.side, null)
            // everything the move changed goes back, even if a timer never fired
            patch({ acting: null, cam: null, dim: 0 })
            // the camera settles back before the damage
            await wait(reducedMotion ? 0 : 200, false)
            break
          }
          case 'miss':
            sfx('miss')
            animate(e.side === 0 ? 1 : 0, 'dodge')
            await wait(300, false)
            break
          case 'damage': {
            const s: Sfx = e.self ? 'hit' : e.eff > 1 ? 'superHit' : e.eff < 1 ? 'weakHit' : 'hit'
            sfx(s)
            animate(e.side, 'hit')
            if (e.crit || e.eff > 1) patch((v) => ({ shake: v.shake + 1 }))
            await tweenHp(e.side, e.hp)
            await wait(250, false)
            break
          }
          case 'heal':
            sfx('heal')
            animate(e.side, 'heal')
            await tweenHp(e.side, e.hp)
            break
          case 'stat':
            sfx(e.delta > 0 ? 'statUp' : 'statDown')
            animate(e.side, e.delta > 0 ? 'statUp' : 'statDown')
            await wait(450, false)
            break
          case 'faint':
            sfx('faint')
            animate(e.side, 'faint')
            await wait(560, false)
            patch((v) => {
              const shown = [...v.shown] as View['shown']
              shown[e.side] = false
              return { shown }
            })
            break
          case 'switchOut':
            animate(e.side, 'out')
            await wait(380, false)
            patch((v) => {
              const shown = [...v.shown] as View['shown']
              shown[e.side] = false
              return { shown }
            })
            break
          case 'switchIn': {
            if (e.side === 0 && viewRef.current.me !== 'gone') {
              // your trainer winds up and throws, BW-style, then steps out of shot to the left as
              // the creature comes out (the slide finishes under the send-out)
              patch({ me: 'throw' })
              await wait(360, false)
              patch({ me: 'leaving' })
              await wait(160, false)
              window.setTimeout(() => alivePlayback.current && patch((v) => (v.me === 'leaving' ? { me: 'gone' } : {})), 260)
            }
            if (e.side === 1 && viewRef.current.trainer === 'intro') {
              // the foe trainer steps off their platform to the right, then sends out
              patch({ trainer: 'leaving' })
              await wait(300, false)
              window.setTimeout(() => alivePlayback.current && patch((v) => (v.trainer === 'leaving' ? { trainer: 'gone' } : {})), 120)
            }
            sfx('sendOut')
            patch((v) => {
              const a = [...v.active] as View['active']
              const hp = [...v.hp] as View['hp']
              const shown = [...v.shown] as View['shown']
              a[e.side] = e.index
              hp[e.side] = e.hp
              shown[e.side] = true
              return { active: a, hp, shown }
            })
            animate(e.side, 'enter')
            await wait(420, false)
            break
          }
          case 'end':
            break
        }
      }
      // settle the view onto the real state
      patch({
        active: [st.sides[0].active, st.sides[1].active],
        hp: [active(st, 0).hp, active(st, 1).hp],
      })
    },
    [animate, fx, patch, say, sfx, tweenHp, wait, reducedMotion, setPose],
  )

  const afterTurn = useCallback(
    async (st: BattleState) => {
      if (st.phase === 'over') {
        const won = st.winner === 0
        if (won) {
          audio.setTrack('victory')
          patch({ trainer: 'defeated' })
          await say(`You defeated TRAINER ${st.foe.toUpperCase()}!`)
          for (const line of opponent.winLines ?? [`${st.foe.toUpperCase()}: Well played. I didn’t see that coming!`]) await say(line)
          let firstBadge = false
          if (recordWin) {
            firstBadge = progress.winBattle({
              date: new Date().toISOString(),
              difficulty: recordWin,
              team: st.sides[0].team.map((m) => m.species),
              turns: st.turn,
              name,
            })
            sfx('badge')
            await say(`${name} received the TRAINERDEX BADGE!`)
          }
          setResult({ won: true, firstBadge })
        } else {
          audio.setTrack('menu')
          patch({ trainer: 'victorious' })
          await say(`${name} was defeated by TRAINER ${st.foe.toUpperCase()}…`)
          for (const line of opponent.loseLines ?? [`${st.foe.toUpperCase()}: Good game! Rematch any time.`]) await say(line)
          setResult({ won: false, firstBadge: false })
        }
        setPanel('results')
        return
      }
      if (st.phase === 'replace') {
        patch({ message: 'Choose the next creature.' })
        setPanel('replace')
        return
      }
      patch({ message: `What will ${nameOf(active(st, 0))} do?` })
      setPanel('command')
    },
    [opponent, recordWin, name, patch, say, sfx],
  )

  /* ---------- opening ---------- */

  const vsPoses = vsPosesFor(opponent.tag ?? title, recordWin === 'champion')

  useEffect(() => {
    alivePlayback.current = true
    progress.startBattle()
    audio.setTrack('battle')
    sfx('encounter')
    let cancelled = false
    ;(async () => {
      // the VS screen goes up under the encounter as its black starts to close (at 900ms), so the
      // close reveals the VS bands, never a frame of the battle behind them
      await wait(reducedMotion ? 300 : 900, false)
      if (cancelled) return
      setVs('in')
      window.setTimeout(() => setEncounter(false), reducedMotion ? 0 : 240)
      sfx('select')
      await wait(reducedMotion ? 900 : vsSeen() ? 1600 : 2700)
      markVsSeen()
      if (cancelled) return
      // the bands sweep back off before the battle shows (not a cut)
      setVs('out')
      await wait(reducedMotion ? 0 : 260, false)
      if (cancelled) return
      setVs(false)
      await play(openingEvents(battle), battle)
      if (!cancelled) await afterTurn(battle)
    })()
    return () => {
      cancelled = true
      alivePlayback.current = false
      audio.setTrack('menu')
    }
    // run once per battle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- actions ---------- */

  const act = async (action: Action) => {
    setPanel('none')
    const r = takeTurn(battle, action)
    await play(r.events, r.state)
    setBattle(r.state)
    await afterTurn(r.state)
  }

  const sendReplacement = async (index: number) => {
    setPanel('none')
    const r = replace(battle, index)
    await play(r.events, r.state)
    setBattle(r.state)
    await afterTurn(r.state)
  }

  // A / click on the top screen speeds through waits
  useGameKeys((k, e) => {
    if (k === 'a' && skipRef.current && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault()
      skipRef.current()
    }
  })

  const back = () => {
    if (panel === 'fight' || panel === 'party' || panel === 'bag' || panel === 'run') {
      sfx('back')
      setPanel('command')
      patch({ message: `What will ${nameOf(active(battle, 0))} do?` })
    } else if (panel === 'command') {
      sfx('cursor')
      setPanel('run')
    } else if (panel === 'results') {
      navigate('/')
    }
  }

  return (
    <SectionScreen
      entry={entry}
      title={title}
      compactTop={false}
      onBack={back}
      backKeys={panel !== 'none' && panel !== 'replace'}
      top={
        <>
          <Scene staged={vs !== 'in' && !encounter} battle={battle} view={view} encounter={encounter} look={opponent.look} myLook={playerLook()} arena={arena} fxCanvas={fx.canvasRef} onSkip={() => skipRef.current?.()} />
          {vs && (
            <VsScreen
              leaving={vs === 'out'}
              me={{ look: playerLook(), name: (resortSave.get().name || name).toUpperCase(), tag: 'CHALLENGER', pose: vsPoses.me }}
              foe={{ look: opponent.look ?? signature, name: opponent.name ?? 'AARYAN', tag: opponent.tag ?? title, pose: vsPoses.foe }}
              champion={recordWin === 'champion'}
              onSkip={() => skipRef.current?.()}
            />
          )}
        </>
      }
    >
      <div className="fill-bottom flex min-h-[45dvh] flex-col bg-[#2a2c3a] p-[3%] sm:min-h-full">
        {panel === 'command' && <CommandPanel battle={battle} onPick={(p) => setPanel(p)} />}
        {panel === 'fight' && <FightPanel battle={battle} onMove={(i) => act({ kind: 'move', index: i })} />}
        {(panel === 'party' || panel === 'replace') && (
          <PartyPanel
            battle={battle}
            forced={panel === 'replace'}
            onPick={(i) => (panel === 'replace' ? sendReplacement(i) : act({ kind: 'switch', index: i }))}
          />
        )}
        {panel === 'bag' && <BagPanel battle={battle} onUse={() => act({ kind: 'potion' })} />}
        {panel === 'run' && (
          <div className="flex flex-col items-end gap-2">
            <PixelBox className="w-full px-4 py-3 text-[16px] font-semibold">No! There’s no running from a trainer battle!</PixelBox>
            <ChoiceMenu
              label="Forfeit?"
              choices={[
                { label: 'KEEP FIGHTING', value: false },
                { label: 'FORFEIT', value: true },
              ]}
              onCancel={back}
              onChoose={(f) => (f ? act({ kind: 'forfeit' }) : back())}
            />
          </div>
        )}
        {panel === 'results' && result && <Results battle={battle} won={result.won} firstBadge={result.firstBadge} badge={!!recordWin} mode={mode} onAgain={() => onExit('setup', result.won)} onHall={() => onExit('hall', result.won)} onContinue={() => onExit('resort', result.won)} />}
        {panel === 'none' && (
          <button type="button" onClick={() => skipRef.current?.()} className="font-display m-auto cursor-pointer border-0 bg-transparent p-4 text-[14px] text-paper/60">
            <span className="blink">▼</span> TAP OR PRESS A TO SPEED UP
          </button>
        )}
      </div>
    </SectionScreen>
  )
}

/* ---------------- Top screen ---------------- */

/** The ground the battle stands on: grass, paving outdoors, or a polished floor inside. */
function platformKind(a: Arena): PlatformKind {
  const m = arenaMapOf(a)
  if (!m.outdoor) return 'floor'
  return tileAt(m, a.x, a.y) === ',' ? 'grass' : 'stone'
}
const platformUrls = new Map<PlatformKind, string>()
function platformUrl(kind: PlatformKind): string {
  let url = platformUrls.get(kind)
  if (!url) {
    const { pixels, palette } = platformArt(kind)
    platformUrls.set(kind, (url = pixelsToDataUrl(pixels, palette)))
  }
  return url
}

/**
 * Where the battle camera pushes in: toward a battler's spot on the field, closer on the far
 * (foe's) side since it's smaller on screen. The sprites stay nearest-neighbour scaled, as BW's
 * 3D camera scales its sprites.
 */
function camStyle(cam: SideId | null): CSSProperties {
  if (cam === null) return { transform: 'none' }
  return cam === 1 ? { transform: 'scale(1.28)', transformOrigin: '70% 40%' } : { transform: 'scale(1.14)', transformOrigin: '26% 78%' }
}

function Scene({ staged, battle, view, encounter, look, myLook, arena, fxCanvas, onSkip }: { staged: boolean; battle: BattleState; view: View; encounter: boolean; look?: Appearance; myLook: Appearance; arena: Arena; fxCanvas: RefObject<HTMLCanvasElement | null>; onSkip: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  // in 40px units, always even so the 80×80 hi-res art is used
  const oppScale = useHeightScale(ref, 0.3, 80) * 2
  const plyScale = useHeightScale(ref, 0.46, 80) * 2
  // the trainer stands on the far platform, so they must fit in the space above it
  const trainerScale = useHeightScale(ref, 0.4, CHAR_H)
  // your trainer is closer to the camera, so bigger (and cropped by the bottom edge)
  const myScale = useHeightScale(ref, 0.62, CHAR_H)
  // after the battle the foe trainer stands at the front of their platform, framed for the closing
  // words: half the field tall rather than the intro's far-off figure
  const endScale = useHeightScale(ref, 0.52, CHAR_H)
  const ended = view.trainer === 'defeated' || view.trainer === 'victorious'
  const opp = battle.sides[1].team[view.active[1]]
  const ply = battle.sides[0].team[view.active[0]]
  const animCls = (side: SideId) => {
    const a = view.anim[side]
    // your creature attacks toward the upper right, the foe's toward the lower left
    if (a === 'lunge' || a === 'jump' || a === 'dive') return `anim-${a}-${side === 0 ? 'right' : 'left'}`
    if (a === 'dodge') return side === 0 ? 'anim-dodge-left' : 'anim-dodge-right'
    if (a === 'out') return 'anim-slide-out'
    return a ? `anim-${a}` : ''
  }

  return (
    <div ref={ref} className="absolute inset-0 flex cursor-pointer flex-col overflow-hidden" onClick={onSkip}>
      <div key={view.shake} className={`battle-field relative flex-1 ${view.shake ? 'screen-shake' : ''}`} style={{ ['--tempo' as string]: view.tempo }}>
        {/* the battle camera: everything on the field moves together, the HUD stays put */}
        <div className="battle-cam absolute inset-0" style={camStyle(view.cam)}>
        <Backdrop arena={arena} />
        {/* platforms */}
        <div className="platform" style={{ left: '70%', top: '44%', width: '40%', height: '13%', backgroundImage: `url(${platformUrl(platformKind(arena))})` }} />
        <div className="platform" style={{ left: '26%', top: '88%', width: '46%', height: '15%', backgroundImage: `url(${platformUrl(platformKind(arena))})` }} />
        {/* background dimming for some specials: over the scenery and platforms, under the battlers */}
        <div aria-hidden className="battle-dim" style={{ opacity: view.dim }} />

        {/* opponent trainer */}
        {view.trainer !== 'gone' && staged && (
          // the intro: they walk on from the right and stop on their platform; leaving, they step off
          // the same way. After the battle they come back to the front of their platform, larger
          // (the camera's on them), for the closing words
          <div
            key={view.trainer === 'defeated' || view.trainer === 'victorious' ? 'end' : 'intro'}
            className={`stand ${view.trainer === 'leaving' ? 'anim-trainer-out' : 'anim-trainer-in'}`}
            // (on a short scene the scale bottoms out at 1×, so the feet come down far enough to keep the head in)
            style={ended ? { left: '70%', top: `max(52%, ${CHAR_H * endScale + 6}px)` } : { left: '72%', top: `max(46%, ${CHAR_H * trainerScale + 6}px)` }}
          >
            <TrainerSprite look={look} pose={view.trainer === 'victorious' ? 'victory' : 'idle'} scale={ended ? endScale : trainerScale} />
          </div>
        )}

        {/* you, from behind, until your first creature is out */}
        {/* (both trainers walk on once the VS bands start to leave, not hidden behind them) */}
        {view.me !== 'gone' && staged && (
          <div className={`stand ${view.me === 'intro' ? 'anim-me-in' : view.me === 'leaving' ? 'anim-me-out' : ''}`} style={{ left: '24%', top: '122%' }}>
            <CharacterSprite appearance={myLook} pose={view.me === 'throw' ? 'throw' : 'back'} scale={myScale} alt="You" />
          </div>
        )}

        {/* opponent creature: a contact shadow on its platform (it stays on the ground while the creature
            moves), then the creature standing on it, or hovering over it if it flies */}
        {view.shown[1] && (view.trainer === 'gone' || view.trainer === 'leaving') && (
          <>
            <BattleShadow left="70%" top="47%" size={CREATURE_SIZE * oppScale} flying={flies(opp.species)} gone={view.anim[1] === 'faint' || view.anim[1] === 'out'} />
            <div key={`o${view.animKey[1]}`} className={`stand ${animCls(1)}`} style={{ left: '70%', top: '47%' }}>
              <div className={flies(opp.species) ? 'battle-hover' : ''}>
                <CreatureSprite id={opp.species} scale={oppScale} pose={view.pose[1]} busy={view.acting === 1} />
              </div>
            </div>
          </>
        )}
        {/* your creature, seen from behind as in BW */}
        {view.shown[0] && (
          <>
            <BattleShadow left="26%" top="91%" size={CREATURE_SIZE * plyScale} flying={flies(ply.species)} gone={view.anim[0] === 'faint' || view.anim[0] === 'out'} />
            <div key={`p${view.animKey[0]}`} className={`stand ${animCls(0)}`} style={{ left: '26%', top: '91%' }}>
              <div className={flies(ply.species) ? 'battle-hover' : ''}>
                <CreatureSprite id={ply.species} scale={plyScale} view="back" pose={view.pose[0]} busy={view.acting === 0} />
              </div>
            </div>
          </>
        )}

        {/* move animations, pixel-drawn over the field */}
        <canvas ref={fxCanvas} aria-hidden className="pixelated pointer-events-none absolute inset-0 z-[5] h-full w-full" />
        </div>

        {/* info boxes (hidden while a move plays, as in BW) */}
        <div className={`battle-hud ${view.acting !== null ? 'is-hidden' : ''}`}>
        {view.trainer === 'gone' && view.shown[1] && (
          <InfoBox side="foe" className="left-[2%] top-[5%]" name={nameOf(opp)} level={opp.level} hp={view.hp[1]} max={opp.maxHp} team={battle.sides[1].team.map((m) => m.hp > 0)} />
        )}
        {view.shown[0] && <InfoBox side="mine" className="right-[2%] top-[60%]" name={nameOf(ply)} level={ply.level} hp={view.hp[0]} max={ply.maxHp} numbers />}
        {view.trainer === 'intro' && staged && (
          <div className="gv-hud-wrap absolute top-[5%] left-[2%]">
            <div className="gv-hud gv-hud--foe py-2 pr-8 pl-3">
            <p className="gv-label m-0 text-[clamp(10px,2.8cqi,17px)] text-paper">TRAINER {battle.foe.toUpperCase()}</p>
            <p className="m-0 mt-1 flex gap-1" aria-label={`${battle.sides[1].team.length} creatures`}>
              {battle.sides[1].team.map((_, i) => (
                <span key={i} className="inline-block h-[clamp(6px,1.8cqi,10px)] w-[clamp(6px,1.8cqi,10px)] rounded-full bg-dex-red shadow-[0_0_0_2px_var(--gv-ink)]" />
              ))}
            </p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* message box */}
      <div className="gv-header p-[1.5%]">
        <PixelBox variant="dark" className="flex min-h-[3.4em] items-center px-[3%] py-[1.5%] text-[clamp(12px,3.4cqi,20px)] font-semibold" aria-live="polite">
          {view.message}
        </PixelBox>
      </div>

      {encounter && <div className="encounter" aria-hidden />}
    </div>
  )
}

/** Creatures that fly hover over their platform instead of standing on it (the birds that perch stand). */
const FLYING = new Set<string>(['megaphawk', 'campfly', 'diplomoth'])
const flies = (id: string) => FLYING.has(id)

/**
 * The soft oval shadow a battler casts on its platform: under its feet, or smaller and fainter
 * under a flyer. It's a sibling of the battler, not a child, so it stays on the ground when the
 * battler lunges or jumps, and fades as it faints or is recalled.
 */
function BattleShadow({ left, top, size, flying, gone }: { left: string; top: string; size: number; flying: boolean; gone: boolean }) {
  const w = size * (flying ? 0.42 : 0.62)
  return <div aria-hidden className={`battle-shadow ${gone ? 'is-gone' : ''}`} style={{ left, top, width: w, height: w * 0.26, opacity: gone ? 0 : flying ? 0.55 : 1 }} />
}

/** Gen V battle plate: a dark slanted bar (the foe's slants right, yours left) with name, level and HP. */
function InfoBox({ name, level, hp, max, numbers = false, team, className, side }: { name: string; level: number; hp: number; max: number; numbers?: boolean; team?: boolean[]; className: string; side: 'foe' | 'mine' }) {
  return (
    <div className={`gv-hud-wrap absolute w-[46%] ${className}`}>
      <div className={`gv-hud gv-hud--${side} ${side === 'foe' ? 'pr-[9%] pl-[4%]' : 'pl-[9%] pr-[4%]'} py-[2%]`}>
        <div className="gv-label flex items-baseline justify-between gap-2 text-[clamp(10px,2.9cqi,17px)] text-paper">
          <span className="truncate">{name}</span>
          <span className="shrink-0 text-[#ffe9a0]">Lv{level}</span>
        </div>
        <div className="mt-[3%]">
          <HpBar hp={hp} max={max} showNumbers={numbers} dark />
        </div>
        {team && (
          <p className="m-0 mt-1 flex gap-[3%]" aria-label={`${team.filter(Boolean).length} of ${team.length} creatures left`}>
            {team.map((ok, i) => (
              <span key={i} className={`inline-block h-[clamp(5px,1.4cqi,9px)] w-[clamp(5px,1.4cqi,9px)] rounded-full shadow-[0_0_0_1.5px_var(--gv-ink)] ${ok ? 'bg-dex-red' : 'bg-[#6a7088]'}`} />
            ))}
          </p>
        )}
      </div>
    </div>
  )
}

/* ---------------- Bottom screen panels ---------------- */

function CommandPanel({ battle, onPick }: { battle: BattleState; onPick: (p: Panel) => void }) {
  const { sfx } = useSettings()
  const items: Array<{ id: Panel; label: string; bg: string; sub?: string }> = [
    { id: 'fight', label: 'FIGHT', bg: '#d8343a' },
    { id: 'party', label: 'CREATURES', bg: '#3a9a50', sub: `${alive(battle.sides[0]).length}/3 ready` },
    { id: 'bag', label: 'BAG', bg: '#d89a20', sub: `${battle.sides[0].potions} potion${battle.sides[0].potions === 1 ? '' : 's'}` },
    { id: 'run', label: 'RUN', bg: '#5a6480' },
  ]
  const pick = (i: number) => {
    sfx('select')
    onPick(items[i].id)
  }
  const nav = useGridNav(items.length, 2, { autoFocus: true, onActivate: pick })
  return (
    <div className="grid flex-1 grid-cols-2 gap-[3%] [grid-auto-rows:minmax(64px,1fr)]">
      {items.map((it, i) => (
        <button
          key={it.id}
          type="button"
          {...nav.itemProps(i)}
          onMouseEnter={() => nav.setFocus(i)}
          onClick={() => pick(i)}
          data-selected={i === nav.focus}
          className="gv-tile flex flex-col items-center justify-center gap-1 !rounded-[14px] text-paper outline-none"
          style={{ ['--tile' as string]: it.bg }}
        >
          <span className={`gv-label ${it.id === 'fight' ? 'text-[clamp(20px,6.3cqi,36px)]' : 'text-[clamp(14px,4.2cqi,22px)]'}`}>{it.label}</span>
          {it.sub && <span className="text-[13px] text-paper/90">{it.sub}</span>}
        </button>
      ))}
    </div>
  )
}

function FightPanel({ battle, onMove }: { battle: BattleState; onMove: (i: number) => void }) {
  const mon = active(battle, 0)
  const nav = useGridNav(4, 2, { autoFocus: true, onActivate: (i) => mon.moves[i]?.pp > 0 && onMove(i) })
  const focused = moves[mon.moves[nav.focus].id]
  return (
    <div className="flex flex-1 flex-col gap-[3%]">
      <div className="grid flex-1 grid-cols-2 gap-[3%] [grid-auto-rows:minmax(58px,1fr)]">
        {mon.moves.map((m, i) => {
          const mv = moves[m.id as MoveId]
          const t = types[mv.type]
          return (
            <button
              key={m.id}
              type="button"
              disabled={m.pp <= 0}
              {...nav.itemProps(i)}
              onMouseEnter={() => nav.setFocus(i)}
              onClick={() => onMove(i)}
              data-selected={i === nav.focus}
              className="gv-tile flex flex-col justify-center gap-1 !rounded-[12px] px-[6%] text-left text-paper outline-none"
              style={{ ['--tile' as string]: t.color }}
            >
              <span className="gv-label text-[clamp(11px,3.4cqi,18px)] leading-tight">{mv.name}</span>
              <span className="flex items-center justify-between text-[13px] text-paper text-outline">
                <span className="font-display text-[clamp(8px,2.5cqi,13px)]">{t.label}</span>
                <span>
                  PP {m.pp}/{mv.pp}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <PixelBox className="px-3 py-2 text-[14px]">
        <span className="font-display text-[13px] text-muted">
          {focused.power ? `POWER ${focused.power} · ACC ${focused.accuracy || '—'}` : 'STATUS MOVE'}
        </span>
        <span className="mt-1 block">{focused.description}</span>
      </PixelBox>
    </div>
  )
}

function PartyPanel({ battle, forced, onPick }: { battle: BattleState; forced: boolean; onPick: (i: number) => void }) {
  const { sfx } = useSettings()
  const side = battle.sides[0]
  const can = (i: number) => side.team[i].hp > 0 && (forced || i !== side.active)
  const pick = (i: number) => {
    if (!can(i)) return sfx('bump')
    onPick(i)
  }
  const nav = useGridNav(side.team.length, 1, { autoFocus: true, initial: forced ? Math.max(0, alive(side)[0] ?? 0) : 0, onActivate: pick })
  return (
    <div className="flex flex-col gap-2">
      {forced && <p className="font-display m-0 text-[14px] text-gold">SEND OUT WHICH CREATURE?</p>}
      {side.team.map((m, i) => (
        <button
          key={i}
          type="button"
          {...nav.itemProps(i)}
          aria-disabled={!can(i)}
          onMouseEnter={() => nav.setFocus(i)}
          onClick={() => pick(i)}
          className={`flex cursor-pointer items-center gap-3 rounded-[10px] border-0 px-3 py-2 text-left outline-none ${m.hp > 0 ? 'bg-[#4fa860]' : 'bg-[#7a5050]'} ${
            i === nav.focus ? 'shadow-[0_0_0_var(--u)_var(--color-gold)]' : 'shadow-[0_0_0_var(--u)_var(--color-ink)]'
          }`}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-paper/90">
            <CreatureSprite id={m.species} scale={1} />
          </span>
          <span className="min-w-0 flex-1 text-paper">
            <span className="font-display text-outline flex justify-between text-[clamp(11px,3.4cqi,17px)]">
              <span>{species[m.species].name}</span>
              <span>Lv{m.level}</span>
            </span>
            <span className="mt-1 block rounded bg-paper/90 px-2 py-0.5 text-ink">
              <HpBar hp={m.hp} max={m.maxHp} showNumbers />
            </span>
          </span>
          {i === side.active && !forced && <span className="font-display text-outline text-[clamp(11px,2.6cqi,14px)] text-paper">IN BATTLE</span>}
          {m.hp <= 0 && <span className="font-display text-outline text-[clamp(11px,2.6cqi,14px)] text-paper">FAINTED</span>}
        </button>
      ))}
    </div>
  )
}

function BagPanel({ battle, onUse }: { battle: BattleState; onUse: () => void }) {
  const left = battle.sides[0].potions
  const mon = active(battle, 0)
  const full = mon.hp >= mon.maxHp
  return (
    <div className="flex flex-col gap-3">
      <PixelBox className="flex items-center justify-between gap-3 px-4 py-3">
        <span>
          <span className="font-display block text-[15px]">POTION ×{left}</span>
          <span className="text-[14px]">Restores half of the active creature’s max HP.</span>
        </span>
        <button type="button" autoFocus className="pixel-btn pixel-btn--primary !text-[14px]" disabled={left <= 0 || full} onClick={onUse}>
          USE
        </button>
      </PixelBox>
      {full && <p className="m-0 text-[14px] text-paper/80">{nameOf(mon)}’s HP is already full.</p>}
    </div>
  )
}

function Results({
  battle,
  won,
  firstBadge,
  badge,
  mode,
  onAgain,
  onHall,
  onContinue,
}: {
  battle: BattleState
  won: boolean
  firstBadge: boolean
  badge: boolean
  mode: 'quick' | 'tower' | 'challenge'
  onAgain: () => void
  onHall: () => void
  onContinue: () => void
}) {
  // ignore input briefly so mashing A through the last lines doesn't restart straight away
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 900)
    return () => window.clearTimeout(id)
  }, [])
  return (
    <div className="flex flex-col gap-3 text-ink">
      <PixelBox className="px-[5%] py-[4%]">
        {mode === 'challenge' ? (
          <>
            <p className="font-display m-0 text-[clamp(14px,3.9cqi,20px)] text-dex-red">{won ? 'YOU WON!' : 'DEFEATED…'}</p>
            <p className="m-0 mt-1">{won ? `You beat ${battle.foe}’s team. It counts towards your Battle Resort record.` : `${battle.foe}’s team wins this one. It counts towards your record — try again any time.`}</p>
          </>
        ) : won && !badge ? (
          <>
            <p className="font-display m-0 text-[clamp(14px,3.9cqi,20px)] text-dex-red">FLOOR CLEARED!</p>
            <p className="m-0 mt-1">You beat this version of Aaryan. The lift to the next floor is open.</p>
          </>
        ) : won ? (
          <div className="flex items-center gap-4">
            <PixelArt pixels={trainerdexBadge.pixels} palette={trainerdexBadge.palette} scale={4} label="TRAINERDEX BADGE" className="sparkle-once" />
            <div>
              <p className="font-display m-0 text-[clamp(14px,3.9cqi,20px)] text-dex-red">CONGRATULATIONS!</p>
              <p className="m-0 mt-1">You defeated Trainer Aaryan{firstBadge ? ' and earned the TRAINERDEX BADGE!' : ' again!'}</p>
            </div>
          </div>
        ) : (
          <>
            <p className="font-display m-0 text-[clamp(14px,3.9cqi,20px)] text-dex-red">DEFEATED…</p>
            <p className="m-0 mt-1">{mode === 'tower' ? 'Aaryan holds this floor for now. Swap your party at the PC and try again.' : 'Trainer Aaryan wins this round. Try a different starter or a lower difficulty.'}</p>
          </>
        )}
        <dl className="font-display m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[clamp(11px,3.1cqi,15px)]">
          <dt className="text-muted">TURNS</dt>
          <dd className="m-0">{battle.turn}</dd>
          <dt className="text-muted">CRITS</dt>
          <dd className="m-0">{battle.stats.crits}</dd>
          <dt className="text-muted">SUPER EFFECTIVE</dt>
          <dd className="m-0">{battle.stats.superEffective}</dd>
        </dl>
      </PixelBox>
      {mode !== 'quick' ? (
        <div className="flex justify-end">
          <button type="button" autoFocus disabled={!ready} className="pixel-btn pixel-btn--primary !text-[14px]" onClick={onContinue}>
            CONTINUE
          </button>
        </div>
      ) : (
      <div className="flex flex-wrap justify-end gap-1">
        <button type="button" autoFocus disabled={!ready} className="pixel-btn pixel-btn--primary !text-[14px]" onClick={onAgain}>
          BATTLE AGAIN
        </button>
        <button type="button" disabled={!ready} className="pixel-btn !text-[14px]" onClick={onHall}>
          HALL OF FAME
        </button>
        <button type="button" className="pixel-btn !text-[14px]" onClick={() => navigate('/')}>
          MAIN MENU
        </button>
      </div>
      )}
    </div>
  )
}

/* ---------------- VS screen ---------------- */

const VS_KEY = 'tdx:v1:vs-seen'
function vsSeen() {
  try {
    return sessionStorage.getItem(VS_KEY) === '1'
  } catch {
    return false
  }
}
function markVsSeen() {
  try {
    sessionStorage.setItem(VS_KEY, '1')
  } catch {
    /* ignore */
  }
}

interface VsSide {
  look: Appearance
  name: string
  tag: string
  pose: VsPose
}

/** When the bands meet: the flash, the shake, the VS slam and both trainers snapping into their strike poses. */
const VS_IMPACT_MS = 640
/** The bands' colours: [dark end, body, light end, the glow round the trainer]. */
const VS_THEME = {
  foe: ['#3a0d16', '#c8283c', '#ff6a50', '#ffb0a0'],
  champion: ['#241404', '#b07812', '#ffd75a', '#fff0b0'],
  me: ['#101a4a', '#2a3c9a', '#1c66d8', '#a8d0ff'],
} as const

/**
 * The VS card before a trainer battle, after Black and White's: over a slowly turning sunburst,
 * the opponent's band slices in from the right and yours from the left, speed lines streaming
 * through both; each trainer holds a wind-up pose until the bands meet, then on the flash a
 * lightning seam splits the screen, the V and the S slam together and both trainers snap into
 * their strike pose. Leaving, the bands fly apart and the mark zooms through to the battle.
 * The Champion's band is gold.
 */
function VsScreen({ me, foe, champion, leaving, onSkip }: { me: VsSide; foe: VsSide; champion: boolean; leaving: boolean; onSkip: () => void }) {
  const { reducedMotion } = useSettings()
  const [struck, setStruck] = useState(reducedMotion)
  useEffect(() => {
    if (reducedMotion) return
    const t = window.setTimeout(() => setStruck(true), VS_IMPACT_MS)
    return () => window.clearTimeout(t)
  }, [reducedMotion])
  const band = (side: VsSide, top: boolean) => {
    const [b1, b2, b3, glow] = top ? (champion ? VS_THEME.champion : VS_THEME.foe) : VS_THEME.me
    return (
      <div
        className={`vs-band absolute inset-x-0 flex h-[46%] items-stretch overflow-hidden ${top ? 'vs-band--foe top-[2%] flex-row-reverse' : 'vs-band--me bottom-[2%]'}`}
        style={{
          background: top ? `linear-gradient(90deg,${b1},${b2} 60%,${b3})` : `linear-gradient(90deg,${b3},${b2} 45%,${b1})`,
          clipPath: top ? 'polygon(8% 0,100% 0,100% 100%,0 100%)' : 'polygon(0 0,100% 0,92% 100%,0 100%)',
          ['--glow' as string]: glow,
        }}
      >
        {/* two layers of speed lines at different speeds, streaming the way the band came in */}
        <div aria-hidden className="vs-streaks absolute inset-0" />
        <div aria-hidden className="vs-streaks vs-streaks--near absolute inset-0" />
        <div className="relative h-full w-[46%] shrink-0">
          <div className={`vs-sprite absolute inset-x-0 top-[8%] flex h-full justify-center ${top ? 'flip' : ''}`}>
            <CharacterSprite appearance={side.look} frame={struck ? side.pose.strike : side.pose.windup} fill={2.3} alt={side.name} />
          </div>
        </div>
        <div className={`vs-name relative flex min-w-0 flex-1 flex-col justify-center gap-1 ${top ? 'items-start pl-[12%]' : 'items-end pr-[12%] text-right'}`}>
          <span className="font-display text-[clamp(10px,2.8cqi,16px)] text-paper/80">{side.tag}</span>
          <span className="font-display text-[clamp(18px,6cqi,36px)] leading-none text-paper [text-shadow:2px_2px_0_#1c1a24]">{side.name}</span>
          <span aria-hidden className="vs-underline block h-[max(3px,0.6cqi)] w-[70%]" style={{ background: glow }} />
        </div>
      </div>
    )
  }
  return (
    <div
      className={`vs-root absolute inset-0 z-10 cursor-pointer overflow-hidden bg-[#101018] [container-type:inline-size] ${leaving ? 'vs-out' : ''} ${champion ? 'vs-root--champion' : ''}`}
      onClick={onSkip}
      role="img"
      aria-label={`${me.name} versus ${foe.name}`}
    >
      <div aria-hidden className="vs-burst absolute top-1/2 left-1/2 aspect-square w-[180%]" />
      <div className="vs-impact absolute inset-0">
        {band(foe, true)}
        {band(me, false)}
      </div>
      {/* the seam between the bands cracks open as a bolt of lightning on impact */}
      <svg aria-hidden className="vs-seam pointer-events-none absolute inset-x-0 top-[46%] h-[8%] w-full" viewBox="0 0 100 10" preserveAspectRatio="none">
        <polyline points="0,6 14,3.5 22,7 37,2.5 46,6.5 54,3 63,7.5 76,3 85,6 100,3.5" fill="none" stroke="#fff" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="bevel" pathLength={1} />
      </svg>
      <div aria-hidden className="vs-ring pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[34%] rounded-full" />
      <div aria-hidden className="vs-flash pointer-events-none absolute inset-0 bg-white" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSkip()
        }}
        className="font-display absolute top-[3%] right-[3%] z-10 cursor-pointer border-0 bg-ink/70 px-2 py-1 text-[clamp(10px,2.6cqi,14px)] text-paper"
      >
        SKIP ▸▸
      </button>
      <span className="vs-mark font-logo pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 text-[clamp(32px,12cqi,76px)] leading-none text-gold [text-shadow:3px_3px_0_#1c1a24,-2px_-2px_0_#1c1a24,0_0_18px_rgb(255_215_90/0.6)]">
        <span className="vs-v inline-block">V</span>
        <span className="vs-s inline-block">S</span>
      </span>
    </div>
  )
}
