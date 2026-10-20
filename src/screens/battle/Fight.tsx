import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
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
import { resortSave } from '../../systems/resortSave'
import { DEFAULT_AVATAR } from '../resort/AvatarStudio'
import { useGridNav } from '../../ui/useGridNav'
import { SectionScreen } from '../SectionScreen'
import { CreatureSprite, HpBar, useHeightScale } from './BattleBits'
import { Backdrop, RECEPTION_ARENA, type Arena } from './Backdrop'
import { useBattleFx } from './BattleFx'

const entry = menu.find((m) => m.id === 'battle')!

type Panel = 'none' | 'command' | 'fight' | 'party' | 'replace' | 'bag' | 'run' | 'results'
type Trainer = 'intro' | 'gone' | 'defeated' | 'victorious'
type Anim = '' | 'enter' | 'lunge' | 'jump' | 'dive' | 'cast' | 'dodge' | 'hit' | 'faint' | 'statUp' | 'statDown' | 'heal' | 'out'

interface View {
  active: [number, number]
  hp: [number, number]
  shown: [boolean, boolean]
  anim: [Anim, Anim]
  animKey: [number, number]
  trainer: Trainer
  /** your own trainer, seen from behind until they throw out the first creature */
  me: 'intro' | 'throw' | 'gone'
  shake: number
  message: string
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
  arena = RECEPTION_ARENA,
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
  const { name } = useVisitor()
  const [battle, setBattle] = useState<BattleState>(() => createBattleFrom(setup, seed))
  const [panel, setPanel] = useState<Panel>('none')
  const [encounter, setEncounter] = useState(true)
  const [vs, setVs] = useState(false)
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
            // the move's own animation; the battle carries on when the hit lands
            const mv = moves[e.move]
            const missed = events[i + 1]?.t === 'miss'
            const run = fx.play(e.move, e.side, missed)
            if (run.motion !== 'none') animate(e.side, run.motion)
            sfx(mv.power ? 'select' : 'cursor')
            await run.impact
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
              // your trainer winds up and throws, BW-style
              patch({ me: 'throw' })
              await wait(420, false)
              patch({ me: 'gone' })
            }
            if (e.side === 1 && viewRef.current.trainer === 'intro') {
              patch({ trainer: 'gone' })
              await wait(380, false)
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
    [animate, fx, patch, say, sfx, tweenHp, wait],
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

  useEffect(() => {
    alivePlayback.current = true
    progress.startBattle()
    audio.setTrack('battle')
    sfx('encounter')
    let cancelled = false
    ;(async () => {
      await wait(reducedMotion ? 300 : 1100, false)
      if (cancelled) return
      setEncounter(false)
      // BW-style VS screen: both trainers slide in and nod (A / tap skips)
      setVs(true)
      sfx('select')
      await wait(reducedMotion ? 900 : vsSeen() ? 1600 : 2700)
      markVsSeen()
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
          <Scene battle={battle} view={view} encounter={encounter} look={opponent.look} myLook={resortSave.get().avatar ?? DEFAULT_AVATAR} arena={arena} fxCanvas={fx.canvasRef} onSkip={() => skipRef.current?.()} />
          {vs && (
            <VsScreen
              me={{ look: resortSave.get().avatar ?? DEFAULT_AVATAR, name: (resortSave.get().name || name).toUpperCase(), tag: 'CHALLENGER' }}
              foe={{ look: opponent.look ?? signature, name: opponent.name ?? 'AARYAN', tag: opponent.tag ?? title }}
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

function Scene({ battle, view, encounter, look, myLook, arena, fxCanvas, onSkip }: { battle: BattleState; view: View; encounter: boolean; look?: Appearance; myLook: Appearance; arena: Arena; fxCanvas: RefObject<HTMLCanvasElement | null>; onSkip: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  // in 40px units, always even so the 80×80 hi-res art is used
  const oppScale = useHeightScale(ref, 0.3, 80) * 2
  const plyScale = useHeightScale(ref, 0.46, 80) * 2
  // the trainer stands on the far platform, so they must fit in the space above it
  const trainerScale = useHeightScale(ref, 0.4, CHAR_H)
  // your trainer is closer to the camera, so bigger (and cropped by the bottom edge)
  const myScale = useHeightScale(ref, 0.62, CHAR_H)
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
      <div key={view.shake} className={`battle-field relative flex-1 ${view.shake ? 'screen-shake' : ''}`}>
        <Backdrop arena={arena} />
        {/* platforms */}
        <div className="platform" style={{ left: '70%', top: '44%', width: '40%', height: '13%' }} />
        <div className="platform" style={{ left: '26%', top: '88%', width: '46%', height: '15%' }} />

        {/* opponent trainer */}
        {(view.trainer === 'intro' || view.trainer === 'defeated' || view.trainer === 'victorious') && (
          <div className={`stand anim-enter`} style={{ left: '72%', top: '46%' }}>
            <TrainerSprite look={look} pose={view.trainer === 'victorious' ? 'victory' : 'idle'} scale={trainerScale} />
          </div>
        )}

        {/* you, from behind, until your first creature is out */}
        {view.me !== 'gone' && (
          <div className="stand" style={{ left: '24%', top: '122%' }}>
            <CharacterSprite appearance={myLook} pose={view.me === 'throw' ? 'throw' : 'back'} scale={myScale} alt="You" />
          </div>
        )}

        {/* opponent creature */}
        {view.shown[1] && view.trainer === 'gone' && (
          <div key={`o${view.animKey[1]}`} className={`stand ${animCls(1)}`} style={{ left: '70%', top: '47%' }}>
            <CreatureSprite id={opp.species} scale={oppScale} />
          </div>
        )}
        {/* your creature, seen from behind as in BW */}
        {view.shown[0] && (
          <div key={`p${view.animKey[0]}`} className={`stand ${animCls(0)}`} style={{ left: '26%', top: '91%' }}>
            <CreatureSprite id={ply.species} scale={plyScale} view="back" />
          </div>
        )}

        {/* move animations, pixel-drawn over the field */}
        <canvas ref={fxCanvas} aria-hidden className="pixelated pointer-events-none absolute inset-0 z-[5] h-full w-full" />

        {/* info boxes */}
        {view.trainer === 'gone' && view.shown[1] && (
          <InfoBox className="left-[3%] top-[5%]" name={nameOf(opp)} level={opp.level} hp={view.hp[1]} max={opp.maxHp} team={battle.sides[1].team.map((m) => m.hp > 0)} />
        )}
        {view.shown[0] && <InfoBox className="right-[3%] top-[60%]" name={nameOf(ply)} level={ply.level} hp={view.hp[0]} max={ply.maxHp} numbers />}
        {view.trainer === 'intro' && (
          <PixelBox variant="plate" className="absolute top-[5%] left-[3%] px-3 py-2">
            <p className="font-display m-0 text-[clamp(10px,2.8cqi,17px)]">TRAINER {battle.foe.toUpperCase()}</p>
            <p className="m-0 mt-1 flex gap-1" aria-label={`${battle.sides[1].team.length} creatures`}>
              {battle.sides[1].team.map((_, i) => (
                <span key={i} className="inline-block h-[clamp(6px,1.8cqi,10px)] w-[clamp(6px,1.8cqi,10px)] rounded-full bg-dex-red shadow-[0_0_0_2px_var(--color-ink)]" />
              ))}
            </p>
          </PixelBox>
        )}
      </div>

      {/* message box */}
      <div className="bg-[#283048] p-[1.5%]">
        <PixelBox className="flex min-h-[3.4em] items-center px-[3%] py-[1.5%] text-[clamp(12px,3.4cqi,20px)] font-semibold" aria-live="polite">
          {view.message}
        </PixelBox>
      </div>

      {encounter && <div className="encounter" aria-hidden />}
    </div>
  )
}

function InfoBox({ name, level, hp, max, numbers = false, team, className }: { name: string; level: number; hp: number; max: number; numbers?: boolean; team?: boolean[]; className: string }) {
  return (
    <PixelBox variant="plate" className={`absolute w-[44%] px-[2.5%] py-[1.5%] ${className}`}>
      <div className="font-display flex items-baseline justify-between gap-2 text-[clamp(10px,2.9cqi,17px)]">
        <span className="truncate">{name}</span>
        <span className="shrink-0">Lv{level}</span>
      </div>
      <div className="mt-[3%]">
        <HpBar hp={hp} max={max} showNumbers={numbers} />
      </div>
      {team && (
        <p className="m-0 mt-1 flex gap-[3%]" aria-label={`${team.filter(Boolean).length} of ${team.length} creatures left`}>
          {team.map((ok, i) => (
            <span key={i} className={`inline-block h-[clamp(4px,1.3cqi,8px)] w-[clamp(4px,1.3cqi,8px)] rounded-full shadow-[0_0_0_1px_var(--color-ink)] ${ok ? 'bg-dex-red' : 'bg-[#9098a8]'}`} />
          ))}
        </p>
      )}
    </PixelBox>
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
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] border-0 text-paper outline-none ${
            i === nav.focus ? 'shadow-[0_0_0_var(--u)_var(--color-gold),inset_0_-6px_0_rgb(0_0_0_/_0.25)]' : 'shadow-[0_0_0_var(--u)_var(--color-ink),inset_0_-6px_0_rgb(0_0_0_/_0.25)]'
          }`}
          style={{ background: it.bg }}
        >
          <span className={`font-display text-outline ${it.id === 'fight' ? 'text-[clamp(20px,6.3cqi,36px)]' : 'text-[clamp(14px,4.2cqi,22px)]'}`}>{it.label}</span>
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
              className={`flex cursor-pointer flex-col justify-center gap-1 rounded-[12px] border-0 px-[6%] text-left text-paper outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                i === nav.focus ? 'shadow-[0_0_0_var(--u)_var(--color-gold),inset_0_-5px_0_rgb(0_0_0_/_0.25)]' : 'shadow-[0_0_0_var(--u)_var(--color-ink),inset_0_-5px_0_rgb(0_0_0_/_0.25)]'
              }`}
              style={{ background: t.color }}
            >
              <span className="font-display text-outline text-[clamp(11px,3.4cqi,18px)] leading-tight">{mv.name}</span>
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
          {i === side.active && !forced && <span className="font-display text-[11px] text-paper">IN BATTLE</span>}
          {m.hp <= 0 && <span className="font-display text-[11px] text-paper">FAINTED</span>}
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
}

/** Two diagonal bands slide in — the opponent from the right, you from the left — then both nod. */
function VsScreen({ me, foe, onSkip }: { me: VsSide; foe: VsSide; onSkip: () => void }) {
  const band = (side: VsSide, top: boolean) => (
    <div
      className={`absolute inset-x-0 flex h-[46%] items-stretch overflow-hidden ${top ? 'vs-in-right top-[2%] flex-row-reverse' : 'vs-in-left bottom-[2%]'}`}
      style={{
        background: top ? 'linear-gradient(90deg,#3a0d16,#c8283c 60%,#ff6a50)' : 'linear-gradient(90deg,#1c66d8,#2a3c9a 45%,#101a4a)',
        clipPath: top ? 'polygon(8% 0,100% 0,100% 100%,0 100%)' : 'polygon(0 0,100% 0,92% 100%,0 100%)',
      }}
    >
      <div className="relative h-full w-[46%] shrink-0">
        <div className={`absolute inset-x-0 top-[8%] flex h-full justify-center ${top ? 'flip' : ''}`}>
          <CharacterSprite appearance={side.look} pose="point" fill={2.7} nod alt={`${side.name}`} />
        </div>
      </div>
      <div className={`flex min-w-0 flex-1 flex-col justify-center gap-1 ${top ? 'items-start pl-[12%]' : 'items-end pr-[12%] text-right'}`}>
        <span className="font-display text-[clamp(10px,2.8cqi,16px)] text-paper/80">{side.tag}</span>
        <span className="font-display text-[clamp(18px,6cqi,36px)] leading-none text-paper [text-shadow:2px_2px_0_#1c1a24]">{side.name}</span>
      </div>
    </div>
  )
  return (
    <div className="absolute inset-0 z-10 cursor-pointer overflow-hidden bg-[#101018] [container-type:inline-size]" onClick={onSkip} role="img" aria-label={`${me.name} versus ${foe.name}`}>
      <div className="absolute inset-0 opacity-30" style={{ background: 'repeating-linear-gradient(115deg,#fff 0 2px,transparent 2px 14px)' }} />
      <div className="vs-impact absolute inset-0">
        {band(foe, true)}
        {band(me, false)}
      </div>
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
      <span className="vs-mark font-logo absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(28px,10cqi,64px)] text-gold [text-shadow:3px_3px_0_#1c1a24,-2px_-2px_0_#1c1a24]">VS</span>
    </div>
  )
}
