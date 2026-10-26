import { useState } from 'react'
import { types, type TypeId } from '../../content/pokedex'
import { validateSubmission } from '../../../supabase/functions/_shared/validate'
import { pagerConfigured, submitMessage, TURNSTILE_SITE_KEY } from '../../systems/pager'
import { resortSave } from '../../systems/resortSave'
import { useSettings } from '../../systems/settings'
import { PixelBox } from '../../ui/PixelBox'
import { Turnstile } from '../../ui/Turnstile'

const NEW_TYPE = 'NEW TYPE'

/**
 * The reception's suggestion box: visitors pitch a creature or a new type. Suggestions go to
 * Aaryan's moderation dashboard only — they're never shown publicly.
 */
export default function SuggestionBox({ onClose }: { onClose: () => void }) {
  const { sfx } = useSettings()
  const [creature, setCreature] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [newType, setNewType] = useState('')
  const [idea, setIdea] = useState('')
  const [name, setName] = useState(() => resortSave.get().name)
  const [website, setWebsite] = useState('')
  const [token, setToken] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'sent' } | { kind: 'error'; text: string }>({ kind: 'idle' })

  const toggle = (t: string) => {
    sfx('cursor')
    setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : p.length >= 2 ? [p[1], t] : [...p, t]))
  }

  const typeText = picked.map((t) => (t === NEW_TYPE ? `new type “${newType.trim() || '?'}”` : t)).join(' / ')
  const message = [creature.trim() && `Creature: ${creature.trim()}`, typeText && `Type: ${typeText}`, idea.trim()].filter(Boolean).join(' · ')

  const send = async () => {
    if (!creature.trim() && !idea.trim()) return setState({ kind: 'error', text: 'Give your idea a name or a description.' })
    const check = validateSubmission({ name, message, avatar: 'trainer', kind: 'suggestion' })
    if (!check.ok) {
      sfx('error')
      return setState({ kind: 'error', text: check.error })
    }
    if (TURNSTILE_SITE_KEY && !token) return setState({ kind: 'error', text: 'Please complete the human check first.' })
    setState({ kind: 'sending' })
    try {
      await submitMessage({ ...check.value, turnstileToken: token, website, trainerSecret: resortSave.get().secret })
      sfx('save')
      setState({ kind: 'sent' })
    } catch (e) {
      sfx('error')
      setState({ kind: 'error', text: (e as Error).message })
      setToken('')
      setResetKey((k) => k + 1)
    }
  }

  const field = 'studio-input'
  return (
    <div className="space-y-3 p-[3%] text-[15px]">
      <PixelBox className="px-4 py-3">
        <p className="font-display m-0 text-[15px] text-dex-red">SUGGESTION BOX</p>
        <ul className="m-0 mt-1 list-none space-y-1 p-0 text-[14px]">
          <li>▸ Got an idea for a creature, a move or a whole new type? Pitch it here.</li>
          <li>▸ Only I read these. The best ones might show up on a future floor.</li>
        </ul>
      </PixelBox>

      {!pagerConfigured ? (
        <PixelBox className="px-4 py-3">The suggestion box opens once the resort’s server is connected. Check back soon!</PixelBox>
      ) : state.kind === 'sent' ? (
        <PixelBox className="space-y-2 px-4 py-3">
          <p className="font-display m-0 text-[15px]">THANKS!</p>
          <p className="m-0">Your idea is in the box.</p>
        </PixelBox>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="font-display text-[13px]">CREATURE NAME (OPTIONAL)</span>
            <input className={field} value={creature} maxLength={24} onChange={(e) => setCreature(e.target.value)} placeholder="e.g. Moottcourt" />
          </label>
          <fieldset className="m-0 space-y-2 border-0 p-0">
            <legend className="font-display mb-1 text-[13px]">TYPE (PICK UP TO 2)</legend>
            <div className="flex flex-wrap gap-1.5">
              {[...(Object.keys(types) as TypeId[]), NEW_TYPE].map((t) => {
                const on = picked.includes(t)
                const color = t === NEW_TYPE ? '#5a5d70' : types[t as TypeId].color
                return (
                  <button key={t} type="button" aria-pressed={on} onClick={() => toggle(t)} className="gv-tile gv-label px-2.5 py-1.5 text-[12px] text-paper" style={{ ['--tile' as string]: on ? color : '#9aa0b0' }}>
                    {t}
                  </button>
                )
              })}
            </div>
            {picked.includes(NEW_TYPE) && <input className={field} value={newType} maxLength={16} onChange={(e) => setNewType(e.target.value)} placeholder="Name your new type" aria-label="New type name" />}
          </fieldset>
          <label className="flex flex-col gap-1">
            <span className="font-display text-[13px]">YOUR IDEA</span>
            <textarea className={`${field} min-h-[88px] resize-y`} value={idea} maxLength={160} onChange={(e) => setIdea(e.target.value)} placeholder="What does it look like? What’s its signature move?" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-display text-[13px]">YOUR NAME</span>
            <input className={field} value={name} maxLength={24} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
          {TURNSTILE_SITE_KEY && <Turnstile siteKey={TURNSTILE_SITE_KEY} onToken={setToken} resetKey={resetKey} />}
          {state.kind === 'error' && (
            <p role="alert" className="m-0 bg-ember px-3 py-2 text-paper">
              {state.text}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="pixel-btn !text-[14px]" onClick={onClose}>
              CLOSE
            </button>
            <button type="submit" className="pixel-btn pixel-btn--primary !text-[14px]" disabled={state.kind === 'sending'}>
              {state.kind === 'sending' ? 'SENDING…' : '✉ DROP IT IN'}
            </button>
          </div>
        </form>
      )}
      {(!pagerConfigured || state.kind === 'sent') && (
        <div className="flex justify-end">
          <button type="button" className="pixel-btn !text-[14px]" onClick={onClose}>
            CLOSE
          </button>
        </div>
      )}
    </div>
  )
}
