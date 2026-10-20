import { useEffect, useRef, useState } from 'react'
import { navigate } from '../app/router'
import { menu } from '../content/menu'
import { fill } from '../content/dialogue'
import { useSettings, type Settings, type TextSpeed, type MotionPref } from '../systems/settings'
import { useVisitor } from '../systems/visitor'
import { useGameKeys } from '../systems/input'
import { clearAll } from '../systems/storage'
import { forgetMe } from '../systems/forget'
import { ChoiceMenu } from '../ui/ChoiceMenu'
import { DialogueBox } from '../ui/DialogueBox'
import { PixelBox } from '../ui/PixelBox'
import { SectionScreen } from './SectionScreen'

const entry = menu.find((m) => m.id === 'settings')!

type ChoiceRow<K extends keyof Settings> = {
  kind: 'choice'
  key: K
  label: string
  help: string
  options: ReadonlyArray<{ label: string; value: Settings[K] }>
}
type Row =
  | ChoiceRow<'textSpeed'>
  | ChoiceRow<'sfx'>
  | ChoiceRow<'music'>
  | ChoiceRow<'motion'>
  | { kind: 'volume'; label: string; help: string }
  | { kind: 'action'; id: 'medals' | 'replay' | 'reset' | 'save'; label: string; help: string }

const rows: Row[] = [
  {
    kind: 'choice',
    key: 'textSpeed',
    label: 'TEXT SPEED',
    help: 'How fast dialogue types out. You can always press A to show a whole line at once.',
    options: [
      { label: 'SLOW', value: 'slow' as TextSpeed },
      { label: 'MID', value: 'mid' as TextSpeed },
      { label: 'FAST', value: 'fast' as TextSpeed },
    ],
  },
  {
    kind: 'choice',
    key: 'sfx',
    label: 'SOUND FX',
    help: 'Menu blips, text sounds and jingles. All synthesised in your browser — no downloads.',
    options: [
      { label: 'OFF', value: false },
      { label: 'ON', value: true },
    ],
  },
  {
    kind: 'choice',
    key: 'music',
    label: 'MUSIC',
    help: 'An original chiptune theme for the menus.',
    options: [
      { label: 'OFF', value: false },
      { label: 'ON', value: true },
    ],
  },
  { kind: 'volume', label: 'VOLUME', help: 'Master volume for sound effects and music.' },
  {
    kind: 'choice',
    key: 'motion',
    label: 'MOTION',
    help: 'AUTO follows your device setting. REDUCED turns off scrolling backgrounds, bobbing and screen wipes.',
    options: [
      { label: 'AUTO', value: 'system' as MotionPref },
      { label: 'REDUCED', value: 'reduced' as MotionPref },
      { label: 'FULL', value: 'full' as MotionPref },
    ],
  },
  { kind: 'action', id: 'medals', label: 'MEDAL BOX', help: 'See the medals you’ve earned exploring the TrainerDex.' },
  { kind: 'action', id: 'replay', label: 'REPLAY INTRO', help: 'Watch the opening again from the start.' },
  { kind: 'action', id: 'reset', label: 'RESET SAVE DATA', help: 'Start again: clears your name, play time, settings, medals, tower progress and avatar on this device — and removes your resort avatar and any Poké Pager messages or suggestions you sent from the server.' },
  { kind: 'action', id: 'save', label: 'SAVE & EXIT', help: 'Save these options and return to the menu.' },
]

type Mode = 'edit' | 'confirmExit' | 'confirmReset' | 'saving' | 'saved'

function same(a: Settings, b: Settings) {
  return (Object.keys(a) as Array<keyof Settings>).every((k) => a[k] === b[k])
}

export default function SettingsScreen() {
  const { saved, saveSettings, preview, sfx } = useSettings()
  const { name, setIntroSeen } = useVisitor()
  const [draft, setDraft] = useState<Settings>(saved)
  const [focus, setFocus] = useState(0)
  const [mode, setMode] = useState<Mode>('edit')
  const [resetNote, setResetNote] = useState('')
  const rowRefs = useRef<Array<HTMLElement | null>>([])
  const dirty = !same(draft, saved)

  // stop previewing if we leave without saving
  useEffect(() => () => preview(null), [preview])

  const change = (next: Settings) => {
    setDraft(next)
    preview(next)
  }

  const focusRow = (i: number) => {
    const n = (i + rows.length) % rows.length
    setFocus(n)
    rowRefs.current[n]?.focus()
    sfx('cursor')
  }

  const step = (row: Row, d: number) => {
    if (row.kind === 'volume') {
      change({ ...draft, volume: Math.max(0, Math.min(100, draft.volume + d * 10)) })
      sfx('cursor')
    } else if (row.kind === 'choice') {
      const opts = row.options as ReadonlyArray<{ value: unknown }>
      const cur = opts.findIndex((o) => o.value === draft[row.key])
      const nextIdx = Math.max(0, Math.min(opts.length - 1, cur + d))
      if (nextIdx === cur) return sfx('bump')
      change({ ...draft, [row.key]: opts[nextIdx].value } as Settings)
      // let the newly-enabled sound engine play its first blip
      window.setTimeout(() => sfx('cursor'), 20)
    }
  }

  const exit = () => {
    if (dirty) {
      sfx('cursor')
      setMode('confirmExit')
    } else {
      sfx('back')
      navigate('/')
    }
  }

  const act = (id: 'medals' | 'replay' | 'reset' | 'save') => {
    if (id === 'medals') {
      preview(null)
      navigate('/medals')
    } else if (id === 'save') {
      setMode('saving')
    } else if (id === 'reset') {
      setMode('confirmReset')
    } else {
      preview(null)
      setIntroSeen(false)
      navigate('/')
    }
  }

  useGameKeys((k, e) => {
    if (mode !== 'edit') return
    const row = rows[focus]
    if (k === 'up') focusRow(focus - 1)
    else if (k === 'down') focusRow(focus + 1)
    else if (k === 'left') step(row, -1)
    else if (k === 'right') step(row, 1)
    else if (k === 'a' && row.kind === 'action' && !(e.target instanceof HTMLButtonElement)) act(row.id)
    else return
    e.preventDefault()
  })

  const current = rows[focus]

  return (
    <SectionScreen
      entry={entry}
      compactTop={false}
      onBack={() => mode === 'edit' && exit()}
      top={
        <div className="bg-stripes absolute inset-0 flex flex-col gap-[4%] p-[4%]" style={{ ['--s1' as string]: entry.color[0], ['--s2' as string]: entry.color[1] }}>
          <h1 className="font-display text-outline m-0 text-[clamp(20px,7.0cqi,45px)] text-paper">OPTIONS</h1>
          <PixelBox variant="plate" className="cq-text-sm px-[4%] py-[3%] font-semibold" aria-live="polite">
            <span className="font-display cq-text-xs block text-dex-red">{current.label}</span>
            <span className="mt-2 block">{current.help}</span>
          </PixelBox>
          <div className="mt-auto">
            <DialogueBox key={draft.textSpeed} active={false} waitOnLast={false} lines={[`This is ${draft.textSpeed.toUpperCase()} text speed. Looking good, ${name}!`]} />
          </div>
        </div>
      }
    >
      <div className="relative p-[3%]">
        <div role="list" aria-label="Options" className={mode === 'edit' ? '' : 'pointer-events-none opacity-40'} aria-hidden={mode !== 'edit'}>
          {rows.map((row, i) => {
            const isFocus = i === focus
            const common = {
              ref: (el: HTMLElement | null) => {
                rowRefs.current[i] = el
              },
              onFocus: () => setFocus(i),
              tabIndex: isFocus ? 0 : -1,
            }
            const rowClass = `relative flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-[3%] py-[1.6%] outline-none ${
              isFocus ? 'bg-paper shadow-[0_0_0_var(--u)_var(--color-gold)]' : ''
            }`
            const arrow = (
              <span aria-hidden className={`font-display absolute left-[1%] text-[14px] text-dex-red ${isFocus ? 'cursor-arrow' : 'invisible'}`}>
                ▶
              </span>
            )

            if (row.kind === 'action') {
              return (
                <div role="listitem" key={row.id} className="my-1">
                  <button
                    {...common}
                    ref={common.ref}
                    type="button"
                    onClick={() => {
                      sfx('select')
                      act(row.id)
                    }}
                    onMouseEnter={() => setFocus(i)}
                    className={`${rowClass} font-display cursor-pointer border-0 bg-transparent pl-[5%] text-left text-[clamp(14px,3.4cqi,20px)] ${
                      row.id === 'reset' ? 'text-ember' : row.id === 'save' ? 'text-harbour' : 'text-ink'
                    }`}
                  >
                    {arrow}
                    {row.label}
                  </button>
                </div>
              )
            }

            const valueLabel =
              row.kind === 'volume'
                ? `${draft.volume}%`
                : (row.options as ReadonlyArray<{ label: string; value: unknown }>).find((o) => o.value === draft[row.key])?.label

            return (
              <div
                role="listitem"
                key={row.label}
                {...common}
                aria-label={`${row.label}: ${valueLabel}. Use left and right arrows to change.`}
                onMouseEnter={() => setFocus(i)}
                className={`${rowClass} my-1 pl-[5%]`}
              >
                {arrow}
                <span className="font-display text-[clamp(14px,3.4cqi,20px)]">{row.label}</span>
                {row.kind === 'volume' ? (
                  <span className="flex min-w-[45%] flex-1 items-center justify-end gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={10}
                      value={draft.volume}
                      tabIndex={-1}
                      aria-label="Volume"
                      className="pixel-range w-full max-w-[220px]"
                      onChange={(e) => change({ ...draft, volume: Number(e.target.value) })}
                    />
                    <span className="font-display w-[4ch] text-right text-[15px]">{draft.volume}</span>
                  </span>
                ) : (
                  <span className="flex flex-wrap justify-end gap-1">
                    {(row.options as ReadonlyArray<{ label: string; value: unknown }>).map((o) => {
                      const on = o.value === draft[row.key]
                      return (
                        <button
                          key={o.label}
                          type="button"
                          tabIndex={-1}
                          aria-pressed={on}
                          onClick={() => {
                            setFocus(i)
                            change({ ...draft, [row.key]: o.value } as Settings)
                            window.setTimeout(() => sfx('cursor'), 20)
                          }}
                          className={`font-display cursor-pointer border-0 px-2 py-1.5 text-[clamp(13px,2.9cqi,17px)] ${
                            on ? 'gv-tile text-paper' : 'bg-transparent text-muted hover:text-ink'
                          }`}
                        >
                          {o.label}
                        </button>
                      )
                    })}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {mode !== 'edit' && (
          <div className="sticky bottom-0 -mx-[3%] -mb-[3%] flex flex-col items-end gap-2 bg-gradient-to-t from-[#e8ecf4] from-60% to-transparent p-[3%] pt-6">
            {mode === 'confirmExit' && (
              <>
                <DialogueBox className="w-full" waitOnLast={false} lines={['Save your changes before leaving?']} />
                <ChoiceMenu
                  label="Save changes?"
                  choices={[
                    { label: 'YES', value: 'yes' },
                    { label: 'NO', value: 'no' },
                    { label: 'CANCEL', value: 'cancel' },
                  ]}
                  onCancel={() => setMode('edit')}
                  onChoose={(v) => {
                    if (v === 'yes') setMode('saving')
                    else if (v === 'no') {
                      preview(null)
                      navigate('/')
                    } else setMode('edit')
                  }}
                />
              </>
            )}
            {mode === 'confirmReset' && (
              <>
                <DialogueBox className="w-full" waitOnLast={false} lines={[resetNote || 'Erase everything and start again? This also removes your avatar and messages from the server.']} />
                <ChoiceMenu
                  label="Erase save data?"
                  choices={[
                    { label: 'NO', value: false },
                    { label: 'YES, ERASE', value: true },
                  ]}
                  onCancel={() => setMode('edit')}
                  onChoose={async (v) => {
                    if (!v) return setMode('edit')
                    try {
                      await forgetMe()
                    } catch (e) {
                      // keep the local save so the visitor can retry the server part
                      return setResetNote(`${(e as Error).message} Nothing was erased — try again in a moment.`)
                    }
                    clearAll()
                    window.location.hash = '/'
                    window.location.reload()
                  }}
                />
              </>
            )}
            {mode === 'saving' && (
              <DialogueBox
                className="w-full"
                waitOnLast={false}
                lines={["SAVING... DON'T TURN OFF THE POWER."]}
                onDone={() =>
                  window.setTimeout(() => {
                    saveSettings(draft)
                    sfx('save')
                    setMode('saved')
                  }, 900)
                }
              />
            )}
            {mode === 'saved' && <DialogueBox className="w-full" lines={[fill('{name} saved the game.', name)]} onDone={() => navigate('/')} />}
          </div>
        )}
      </div>
    </SectionScreen>
  )
}
