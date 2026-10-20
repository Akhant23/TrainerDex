import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { dialogue, fill } from '../content/dialogue'
import { useSettings } from '../systems/settings'
import { useVisitor } from '../systems/visitor'
import { useGameKeys } from '../systems/input'
import { NAME_MAX, sanitiseName } from '../systems/format'
import { ChoiceMenu } from '../ui/ChoiceMenu'
import { DialogueBox } from '../ui/DialogueBox'
import { Logo } from '../ui/Logo'
import { PixelBox } from '../ui/PixelBox'
import { PixelButton } from '../ui/PixelButton'
import { TrainerSprite } from '../ui/TrainerSprite'

type Step = 'boot' | 'sound' | 'talk1' | 'name' | 'talk2' | 'leave'

/**
 * The opening sequence: boot logo → sound prompt → "professor" speech with the trainer
 * sprite → name entry → shrink-and-flash into the main menu. Skippable at every step.
 */
export default function Intro({ onDone }: { onDone: () => void }) {
  const { saved, saveSettings, sfx, reducedMotion } = useSettings()
  const { name, setName } = useVisitor()
  const [step, setStep] = useState<Step>('boot')
  const [draftName, setDraftName] = useState(name === 'TRAINER' ? '' : name)
  const [prompted, setPrompted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    setPrompted(false)
    if (step === 'name') inputRef.current?.focus()
    if (step === 'leave') {
      const id = window.setTimeout(() => doneRef.current(), reducedMotion ? 200 : 1300)
      return () => window.clearTimeout(id)
    }
  }, [step, reducedMotion])

  // PRESS START
  useGameKeys((k, e) => {
    if (step === 'boot' && (k === 'a' || k === 'start') && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault()
      setStep('sound')
    }
  }, step === 'boot')

  const submitName = (value: string) => {
    const clean = sanitiseName(value) || 'TRAINER'
    setName(clean)
    setDraftName(clean)
    sfx('select')
    setStep('talk2')
  }

  const showTrainer = step === 'talk1' || step === 'name' || step === 'talk2' || step === 'leave'

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black text-paper">
      <button type="button" onClick={onDone} className="pixel-btn pixel-btn--ghost absolute top-3 right-3 z-20 !text-[10px]">
        SKIP INTRO &gt;&gt;
      </button>

      {/* stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <AnimatePresence>
          {step === 'boot' && (
            <motion.div
              key="boot"
              className="flex flex-col items-center gap-10 px-4"
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0.2 : 0.7, ease: 'easeOut' }}
            >
              <Logo />
              <button type="button" onClick={() => setStep('sound')} className="font-display blink cursor-pointer border-0 bg-transparent p-3 text-[clamp(11px,2.4vw,15px)] text-paper">
                PRESS START
              </button>
              <p className="m-0 max-w-[36ch] text-center text-[13px] text-muted">
                The interactive story of Aaryan. A fan-inspired personal site — not affiliated with Nintendo or The Pokémon Company.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {showTrainer && (
          <>
            <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 45% 55% at 50% 52%, #2a3050 0%, #12141f 55%, #000 100%)' }} />
            <motion.div
              className="relative flex h-[min(52vh,420px)] flex-col items-center justify-end"
              initial={{ opacity: 0 }}
              animate={step === 'leave' && !reducedMotion ? { opacity: [1, 1, 0], scale: [1, 0.15, 0.15], y: [0, -60, -60] } : { opacity: 1 }}
              transition={step === 'leave' ? { duration: 0.9, times: [0, 0.7, 1], ease: 'easeIn' } : { duration: 1.1 }}
            >
              <TrainerSprite fill={0.92} className="relative z-10" />
              <div aria-hidden className="-mt-[3%] h-[9%] w-[70%] rounded-[50%] bg-[#d8c8a0] shadow-[inset_0_-6px_0_#a89870]" />
            </motion.div>
          </>
        )}

        {step === 'leave' && !reducedMotion && (
          <motion.div aria-hidden className="absolute inset-0 bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1] }} transition={{ duration: 1.25, times: [0, 0.6, 1] }} />
        )}
      </div>

      {/* dialogue area */}
      <div className="relative z-10 mx-auto w-full max-w-[880px] px-3 pb-[max(16px,env(safe-area-inset-bottom))] [container-type:inline-size]">
        {step === 'sound' && (
          <div className="flex flex-col items-end gap-2">
            <DialogueBox className="w-full" waitOnLast={false} lines={['Would you like to play with sound?']} onDone={() => setPrompted(true)} />
            {prompted && (
              <ChoiceMenu
                label="Play with sound?"
                choices={[
                  { label: 'YES', value: true },
                  { label: 'NO', value: false },
                ]}
                onChoose={(on) => {
                  saveSettings({ ...saved, sfx: on, music: on })
                  if (on) window.setTimeout(() => sfx('start'), 40)
                  setStep('talk1')
                }}
              />
            )}
          </div>
        )}

        {step === 'talk1' && <DialogueBox className="w-full" lines={dialogue.introPart1} waitOnLast={false} onDone={() => setStep('name')} />}

        {step === 'name' && (
          <div className="flex flex-col items-end gap-2">
            <DialogueBox className="w-full" active={false} waitOnLast={false} lines={[dialogue.introPart1[dialogue.introPart1.length - 1]]} />
            <PixelBox className="w-full max-w-[460px] px-4 py-4">
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  submitName(draftName)
                }}
              >
                <label htmlFor="visitor-name" className="font-display text-[11px]">
                  YOUR NAME?
                </label>
                <input
                  ref={inputRef}
                  id="visitor-name"
                  value={draftName}
                  maxLength={NAME_MAX}
                  autoComplete="nickname"
                  placeholder="TRAINER"
                  onChange={(e) => setDraftName(e.target.value)}
                  className="font-display w-full border-0 bg-[#e8ecf8] px-3 py-3 text-[16px] text-ink uppercase shadow-[inset_0_0_0_var(--u)_var(--color-frame)] outline-none focus:shadow-[inset_0_0_0_var(--u)_var(--color-harbour)]"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <PixelButton variant="ghost" className="!text-ink" sound={null} onClick={() => submitName('')}>
                    SKIP
                  </PixelButton>
                  <PixelButton type="submit" variant="primary" sound={null}>
                    OK
                  </PixelButton>
                </div>
              </form>
            </PixelBox>
          </div>
        )}

        {step === 'talk2' && <DialogueBox className="w-full" lines={dialogue.introPart2.map((l) => fill(l, name))} onDone={() => setStep('leave')} />}
      </div>
    </div>
  )
}
