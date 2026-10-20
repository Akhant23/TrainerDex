import { useRef, useState } from 'react'
import { navigate } from '../../app/router'
import { menu } from '../../content/menu'
import { types } from '../../content/pokedex'
import { difficulties, species, starters, typeReasons, type Difficulty, type SpeciesId } from '../../battle/data'
import { useSettings } from '../../systems/settings'
import { useProgress } from '../../systems/progress'
import { trainerdexBadge } from '../../sprites/creatures'
import { DialogueBox } from '../../ui/DialogueBox'
import { PixelArt } from '../../ui/PixelArt'
import { PixelBox } from '../../ui/PixelBox'
import { TrainerSprite } from '../../ui/TrainerSprite'
import { TypeChip } from '../../ui/bits'
import { useGridNav } from '../../ui/useGridNav'
import { SectionScreen } from '../SectionScreen'
import { CreatureSprite, useHeightScale } from './BattleBits'
import { CHAR_H } from '../../sprites/character'
import Fight from './Fight'
import { Backdrop, RECEPTION_ARENA } from './Backdrop'
import Resort from '../resort/Resort'
import { presetSetup } from '../../battle/engine'
import { recordResult } from '../../systems/resortSave'
import { syncTrainer } from '../../systems/trainers'

const entry = menu.find((m) => m.id === 'battle')!
const DIFFS: Difficulty[] = ['casual', 'standard', 'champion']

let lastDifficulty: Difficulty = 'standard'

export default function Battle({ path }: { path: string }) {
  if (path === '/battle' || path === '/battle/') return <Resort />
  return <QuickBattle path={path} />
}

function QuickBattle({ path }: { path: string }) {
  const [fight, setFight] = useState<{ difficulty: Difficulty; starter: SpeciesId; seed: number } | null>(null)
  if (path === '/battle/hall-of-fame') return <HallOfFame />
  if (fight)
    return (
      <Fight
        key={fight.seed}
        setup={presetSetup(fight.difficulty, fight.starter)}
        seed={fight.seed}
        title={`VS AARYAN · ${fight.difficulty.toUpperCase()}`}
        recordWin={fight.difficulty}
        onExit={(to, won) => {
          // exhibition matches in the reception count towards the Battle Resort record too
          recordResult(won)
          void syncTrainer().catch(() => undefined)
          setFight(null)
          if (to === 'hall') navigate('/battle/hall-of-fame')
        }}
      />
    )
  return <Setup onStart={(difficulty, starter) => setFight({ difficulty, starter, seed: (Date.now() ^ (Math.random() * 1e9)) | 0 })} />
}

/* ---------------- Setup ---------------- */

/**
 * The reception scene above the setup: Aaryan on a battle pad on the floor in front of the
 * counter. The pad and his feet are anchored to the stage, and his size is a whole-number scale
 * of the stage height, so he stands on the pad — never on the counter, never clipped — at any size.
 */
function HubStage({ hasBadge }: { hasBadge: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const scale = useHeightScale(ref, 0.76, CHAR_H)
  return (
    <div ref={ref} className="relative min-h-0 flex-1">
      <div className="platform" style={{ left: '50%', top: '90%', width: '50%', height: '13%' }} />
      <div className="stand" style={{ left: '50%', top: '93%' }}>
        <TrainerSprite scale={scale} />
      </div>
      {hasBadge && (
        <div className="gv-hud-wrap absolute top-[5%] right-[3%]">
          <div className="gv-hud gv-hud--mine flex items-center gap-2 py-1 pr-3 pl-6">
            <PixelArt pixels={trainerdexBadge.pixels} palette={trainerdexBadge.palette} scale={2} label="TRAINERDEX BADGE earned" />
            <span className="gv-label text-[12px] text-gold">BADGE EARNED</span>
          </div>
        </div>
      )}
    </div>
  )
}

function Setup({ onStart }: { onStart: (d: Difficulty, s: SpeciesId) => void }) {
  const { sfx } = useSettings()
  const { trainerdexBadge: hasBadge, hallOfFame } = useProgress()
  const [step, setStep] = useState<'difficulty' | 'starter'>('difficulty')
  const [difficulty, setDifficulty] = useState<Difficulty>(lastDifficulty)

  return (
    <SectionScreen
      entry={entry}
      title={step === 'difficulty' ? 'CHOOSE DIFFICULTY' : 'CHOOSE A STARTER'}
      compactTop={false}
      onBack={() => {
        sfx('back')
        if (step === 'starter') setStep('difficulty')
        else navigate('/battle')
      }}
      scrollKey={step}
      top={
        <div className="absolute inset-0 flex flex-col">
          {/* exhibition matches happen in the tower reception */}
          <Backdrop arena={RECEPTION_ARENA} />
          <HubStage hasBadge={hasBadge} />
          <div className="p-[2%]">
            <DialogueBox
              key={step}
              active={false}
              waitOnLast={false}
              lines={[step === 'difficulty' ? 'So you want to battle me? Choose how hard I should go.' : 'Good choice. Now pick your partner — the other two will back you up.']}
            />
          </div>
        </div>
      }
    >
      {step === 'difficulty' ? (
        <DifficultyPick
          initial={DIFFS.indexOf(difficulty)}
          onPick={(d) => {
            sfx('select')
            lastDifficulty = d
            setDifficulty(d)
            setStep('starter')
          }}
          wins={hallOfFame.length}
        />
      ) : (
        <StarterPick
          onPick={(s) => {
            sfx('start')
            onStart(difficulty, s)
          }}
        />
      )}
    </SectionScreen>
  )
}

function DifficultyPick({ initial, onPick, wins }: { initial: number; onPick: (d: Difficulty) => void; wins: number }) {
  const nav = useGridNav(DIFFS.length, 1, { autoFocus: true, initial, onActivate: (i) => onPick(DIFFS[i]) })
  return (
    <div className="space-y-2 p-[3%]">
      {DIFFS.map((d, i) => {
        const cfg = difficulties[d]
        return (
          <button
            key={d}
            type="button"
            {...nav.itemProps(i)}
            onMouseEnter={() => nav.setFocus(i)}
            onClick={() => onPick(d)}
            className={`flex w-full cursor-pointer items-center justify-between gap-3 border-0 bg-paper px-4 py-3 text-left outline-none ${
              i === nav.focus ? 'gv-card--selected' : 'gv-card'
            }`}
          >
            <span>
              <span className="font-display block text-[clamp(14px,3.6cqi,20px)] text-dex-red">{cfg.label}</span>
              <span className="text-[15px]">{cfg.blurb}</span>
            </span>
            <span className="font-display shrink-0 text-[13px] text-muted">
              {cfg.team.length} VS 3 · Lv{cfg.level}
            </span>
          </button>
        )
      })}
      <details className="bg-paper/80 px-4 py-2 text-[14px]">
        <summary className="font-display cursor-pointer text-[13px]">TYPE MATCHUPS</summary>
        <ul className="m-0 mt-2 pl-4">
          {typeReasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>
      <p className="m-0 text-[14px] text-muted">
        {wins > 0 ? (
          <>
            You’ve beaten Aaryan {wins} time{wins === 1 ? '' : 's'}.{' '}
            <a href="#/battle/hall-of-fame" className="text-harbour underline">
              Hall of Fame
            </a>
          </>
        ) : (
          'Beat Aaryan on any difficulty to earn the TRAINERDEX BADGE.'
        )}
      </p>
    </div>
  )
}

function StarterPick({ onPick }: { onPick: (s: SpeciesId) => void }) {
  const nav = useGridNav(starters.length, 3, { autoFocus: true, initial: 1, onActivate: (i) => onPick(starters[i]) })
  const focused = species[starters[nav.focus]]
  return (
    <div className="space-y-3 p-[3%]">
      <div className="grid grid-cols-3 gap-[3%]">
        {starters.map((id, i) => {
          const sp = species[id]
          return (
            <button
              key={id}
              type="button"
              {...nav.itemProps(i)}
              onMouseEnter={() => nav.setFocus(i)}
              onClick={() => onPick(id)}
              className={`flex cursor-pointer flex-col items-center gap-2 border-0 px-1 py-3 outline-none ${i === nav.focus ? 'bg-paper gv-card--selected' : 'bg-paper/80 gv-card'}`}
              style={{ background: i === nav.focus ? `radial-gradient(circle at 50% 40%, #fff, ${types[sp.types[0]].color}55)` : undefined }}
            >
              <CreatureSprite id={id} scale={2} />
              <span className="font-display text-[clamp(11px,3.1cqi,17px)]">{sp.name}</span>
              <TypeChip type={sp.types[0]} />
            </button>
          )
        })}
      </div>
      <PixelBox className="px-4 py-3 text-[15px]">
        <span className="font-display block text-[14px] text-dex-red">{focused.name}</span>
        {focused.blurb}
      </PixelBox>
    </div>
  )
}

/* ---------------- Hall of Fame ---------------- */

function HallOfFame() {
  const { hallOfFame, trainerdexBadge: has } = useProgress()
  const latest = hallOfFame[0]
  return (
    <SectionScreen
      entry={entry}
      backTo="/battle"
      title="HALL OF FAME"
      compactTop={false}
      top={
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[4%] p-[4%]" style={{ background: 'radial-gradient(ellipse at 50% 80%, #6a4a10, #1a1408 70%)' }}>
          {latest ? (
            <>
              <p className="font-display text-outline m-0 text-[clamp(14px,4.2cqi,25px)] text-gold">✦ HALL OF FAME ✦</p>
              <div className="flex items-end justify-center gap-[6%]">
                {latest.team.map((id) => (
                  <span key={id} className="sparkle-host">
                    <CreatureSprite id={id as SpeciesId} scale={2} />
                  </span>
                ))}
              </div>
              <p className="font-display text-outline m-0 text-[clamp(11px,3.1cqi,17px)] text-paper">
                {latest.name} · {latest.difficulty.toUpperCase()} · {latest.turns} TURNS
              </p>
            </>
          ) : (
            <PixelBox variant="plate" className="px-5 py-4 text-center">
              <p className="font-display m-0 text-[17px]">NO CHAMPIONS YET</p>
              <p className="m-0 mt-2">Beat Trainer Aaryan to be recorded here.</p>
            </PixelBox>
          )}
        </div>
      }
    >
      <div className="space-y-2 p-[3%]">
        {has && (
          <PixelBox className="flex items-center gap-3 px-4 py-3">
            <PixelArt pixels={trainerdexBadge.pixels} palette={trainerdexBadge.palette} scale={3} label="TRAINERDEX BADGE" />
            <span>TRAINERDEX BADGE — earned on this device.</span>
          </PixelBox>
        )}
        {hallOfFame.length === 0 && <p className="m-0 p-2 text-[15px]">Records are saved in this browser only.</p>}
        <ol className="m-0 list-none space-y-2 p-0">
          {hallOfFame.map((h, i) => (
            <li key={h.date + i} className="flex items-center justify-between gap-2 bg-paper px-3 py-2 gv-card">
              <span>
                <span className="font-display block text-[14px] text-dex-red">{h.difficulty.toUpperCase()}</span>
                <span className="text-[14px]">
                  {h.name} · {new Date(h.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} · {h.turns} turns
                </span>
              </span>
              <span className="flex gap-1">
                {h.team.map((id) => (
                  <CreatureSprite key={id} id={id as SpeciesId} scale={1} />
                ))}
              </span>
            </li>
          ))}
        </ol>
        <div className="flex justify-end">
          <button type="button" className="pixel-btn pixel-btn--primary !text-[14px]" onClick={() => navigate('/battle')}>
            BATTLE AARYAN
          </button>
        </div>
      </div>
    </SectionScreen>
  )
}
