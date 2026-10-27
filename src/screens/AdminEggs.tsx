import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { dialogue } from '../content/dialogue'
import { medals, type Medal } from '../content/medals'
import { shinyOdds } from '../content/sprites'
import { ENCOUNTER_ART, ENCOUNTER_SCENES, paintEncounter, type EncounterScene } from '../sprites/encounters'
import { useSettings } from '../systems/settings'
import { DialogueBox } from '../ui/DialogueBox'
import { PaintedScene } from '../ui/PaintedScene'
import { TrainerSprite } from '../ui/TrainerSprite'
import { WildEncounter } from '../ui/WildEncounter'
import { AdminPage } from './AdminUi'

/** How long auto-play stays on each line of the encounter before cutting to the next. */
const LINE_MS = 3600

const medal = (id: string): Medal => medals.find((m) => m.id === id)!

/**
 * The admin's EASTER EGGS tab: every hidden thing on the site, what sets it off, and a preview, so
 * they can be checked without waiting on a 1-in-128 roll. The Pokédex encounter plays as its own
 * cutscene here, line by line, exactly as a visitor sees it.
 */
export function AdminEggs() {
  return (
    <AdminPage title="EASTER EGGS" description="Every hidden thing on the site, what sets it off, and a preview, so you can see each one without hunting for it.">
      <EncounterPlayer />
      <div className="adm-eggs">
        <EggCard id="shiny" trigger={`1 in ${shinyOdds} on loading the main menu, or always after the cheat code (for that session).`}>
          <div className="adm-egg-sprites">
            <figure>
              <TrainerSprite scale={2} still alt="Aaryan as usual" />
              <figcaption>USUAL</figcaption>
            </figure>
            <figure>
              <TrainerSprite scale={2} shiny still alt="Shiny Aaryan" />
              <figcaption className="text-[#b07a00]">✦ SHINY</figcaption>
            </figure>
          </div>
        </EggCard>
        <EggCard id="secret" trigger={`Click Aaryan on the main menu ${dialogue.secretClicks} times in a row, each within 1.5 s of the last.`}>
          <p className="adm-egg-line">“{dialogue.secretReaction}”</p>
        </EggCard>
        <EggCard id="old-school" trigger="Type the classic cheat code anywhere on the site. The main-menu Aaryan turns shiny until the tab is closed.">
          <p className="adm-egg-keys" aria-label="Up, up, down, down, left, right, left, right, B, A">
            {['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'B', 'A'].map((k, i) => (
              <kbd key={i}>{k}</kbd>
            ))}
          </p>
        </EggCard>
        <EggCard id="night-owl" trigger="Open the site between midnight and 5 am, the visitor’s own time.">
          <p className="adm-egg-line">00:00 – 04:59</p>
        </EggCard>
      </div>
    </AdminPage>
  )
}

/** One Easter egg: its medal, the trigger, and a small preview. */
function EggCard({ id, trigger, children }: { id: string; trigger: string; children: ReactNode }) {
  const m = medal(id)
  return (
    <section className="adm-card adm-egg" aria-labelledby={`egg-${id}`}>
      <div className="adm-egg-head">
        <h3 id={`egg-${id}`} className="adm-h3">
          {m.name}
        </h3>
        <span className={`adm-egg-tier adm-egg-tier--${m.tier}`}>{m.tier.toUpperCase()}</span>
      </div>
      <p className="adm-egg-trigger">
        <span className="adm-egg-label">HOW</span> {trigger}
      </p>
      <div className="adm-egg-preview">{children}</div>
      <p className="adm-egg-note">
        <span className="adm-egg-label">MEDAL</span> {m.description} <span className="opacity-70">Hint shown: “{m.hint}”</span>
      </p>
    </section>
  )
}

/**
 * The rare encounter as a cutscene: the top-screen scene above its dialogue line, with PLAY (from
 * the battle-start flashes, auto-advancing), step back and forward, and the scenes as thumbnails
 * to jump straight to one.
 */
function EncounterPlayer() {
  const { sfx } = useSettings()
  const lines = dialogue.rareEncounter.lines
  const last = lines.length - 1
  const [line, setLine] = useState(0)
  // bumping `run` restarts the cutscene from its opening flashes
  const [run, setRun] = useState(0)
  const [auto, setAuto] = useState(false)

  useEffect(() => {
    if (!auto) return
    const id = window.setTimeout(() => {
      if (line >= last) setAuto(false)
      else setLine(line + 1)
    }, LINE_MS)
    return () => window.clearTimeout(id)
  }, [auto, line, last])

  const play = () => {
    sfx('encounter')
    setLine(0)
    setRun((r) => r + 1)
    setAuto(true)
  }
  const go = (n: number) => {
    sfx('cursor')
    setAuto(false)
    setLine(Math.max(0, Math.min(last, n)))
  }
  const m = medal('rare-encounter')

  return (
    <section className="adm-card adm-egg adm-egg--film" aria-labelledby="egg-encounter">
      <div className="adm-egg-head">
        <h3 id="egg-encounter" className="adm-h3">
          {m.name}: the wild Aaryan cutscene
        </h3>
        <span className={`adm-egg-tier adm-egg-tier--${m.tier}`}>{m.tier.toUpperCase()}</span>
      </div>
      <p className="adm-egg-trigger">
        <span className="adm-egg-label">HOW</span> 1 in {dialogue.rareEncounter.odds} when a visitor opens a Pokédex entry. It plays one scene per line; clicking the text moves it on.
      </p>
      <div className="adm-egg-film">
        <div className="adm-egg-stage">
          <WildEncounter key={run} line={line} intro={run > 0 && line === 0} />
        </div>
        <div className="adm-egg-side">
          <DialogueBox key={`${run}:${line}`} lines={[lines[line]]} waitOnLast={false} active={false} />
          <div className="adm-egg-controls">
            <button type="button" className="pixel-btn adm-btn adm-btn--go" onClick={play}>
              ▶ {run ? 'REPLAY' : 'PLAY'}
            </button>
            {auto && (
              <button type="button" className="pixel-btn adm-btn" onClick={() => setAuto(false)}>
                ❚❚ PAUSE
              </button>
            )}
            <span className="flex-1" />
            <button type="button" className="pixel-btn adm-btn" onClick={() => go(line - 1)} disabled={line === 0} aria-label="Previous line">
              ◀
            </button>
            <span className="adm-egg-count" aria-live="polite">
              LINE {line + 1} / {lines.length}
            </span>
            <button type="button" className="pixel-btn adm-btn" onClick={() => go(line + 1)} disabled={line === last} aria-label="Next line">
              ▶
            </button>
          </div>
          <ol className="adm-egg-scenes" aria-label="Scenes">
            {ENCOUNTER_SCENES.map((s, i) => (
              <li key={s}>
                <button type="button" className={`adm-egg-thumb ${i === Math.min(line, ENCOUNTER_SCENES.length - 1) ? 'adm-egg-thumb--on' : ''}`} onClick={() => go(i)} aria-label={`Line ${i + 1}: ${lines[i]}`} aria-current={i === line}>
                  <SceneThumb scene={s} />
                  <span>{i + 1}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/** A scene's resting frame, small, as a jump button's picture. */
function SceneThumb({ scene }: { scene: EncounterScene }) {
  const art = ENCOUNTER_ART[scene]
  const paint = useCallback((frame: number) => paintEncounter(scene, frame).toRGBA(), [scene])
  return <PaintedScene id={`encounter:${scene}`} frames={art.frames} rest={art.rest} still paint={paint} alt="" className="h-full w-full" />
}
