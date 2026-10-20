import { useCallback, useEffect, useState } from 'react'
import { menu } from '../content/menu'
import { AVATARS, LIMITS, validateSubmission, type Avatar } from '../../supabase/functions/_shared/validate'
import { fetchApproved, pagerConfigured, submitMessage, TURNSTILE_SITE_KEY, type PublicMessage } from '../systems/pager'
import { useSettings } from '../systems/settings'
import { useVisitor } from '../systems/visitor'
import { progress } from '../systems/progress'
import { paletteFor } from '../sprites/character'
import { crop } from '../sprites/pixels'
import { signature } from '../content/aaryan'
import { portraitPixels } from '../ui/CharacterSprite'
import { resortSave } from '../systems/resortSave'
import { trainersOnline } from '../systems/trainers'
import { PixelArt } from '../ui/PixelArt'
import { PixelBox } from '../ui/PixelBox'
import { Turnstile } from '../ui/Turnstile'
import { useGridNav } from '../ui/useGridNav'
import { CreatureSprite } from './battle/BattleBits'
import { SectionScreen } from './SectionScreen'
import type { SpeciesId } from '../battle/data'

const entry = menu.find((m) => m.id === 'pager')!

let head: ReturnType<typeof crop> | null = null
const trainerHead = () => (head ??= crop(portraitPixels(signature), 6, 2, 28, 30))

export function AvatarIcon({ avatar, scale = 1 }: { avatar: Avatar; scale?: number }) {
  if (avatar === 'trainer') return <PixelArt pixels={trainerHead()} palette={paletteFor(signature)} scale={scale} />
  return <CreatureSprite id={avatar as SpeciesId} scale={scale} />
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

type View = 'inbox' | 'compose' | 'sent'
type Load = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; messages: PublicMessage[] }

export default function PokePager({ path = '/pager' }: { path?: string }) {
  const { sfx } = useSettings()
  // #/pager/compose opens straight on a new message (used by the resort's COMMENT button)
  const [view, setView] = useState<View>(path === '/pager/compose' ? 'compose' : 'inbox')
  const [load, setLoad] = useState<Load>(pagerConfigured ? { state: 'loading' } : { state: 'ready', messages: [] })
  const [focus, setFocus] = useState(0)

  const refresh = useCallback(async () => {
    if (!pagerConfigured) return
    setLoad({ state: 'loading' })
    try {
      const messages = await fetchApproved()
      setLoad({ state: 'ready', messages })
      if (messages.length) sfx('blip')
    } catch (e) {
      setLoad({ state: 'error', message: (e as Error).message })
    }
  }, [sfx])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const messages = load.state === 'ready' ? load.messages : []
  const selected = messages[focus]

  return (
    <SectionScreen
      entry={entry}
      title={view === 'compose' ? 'NEW MESSAGE' : `INBOX (${messages.length})`}
      backTo="/"
      onBack={
        view !== 'inbox'
          ? () => {
              sfx('back')
              setView('inbox')
            }
          : undefined
      }
      compactTop={false}
      scrollKey={view}
      top={<Display selected={view === 'inbox' ? selected : undefined} view={view} count={messages.length} />}
    >
      <div className="flex min-h-full flex-col gap-3 bg-[#1f5e58] p-[3%]">
        {!pagerConfigured && (
          <PixelBox className="px-4 py-3 text-[15px]">
            <p className="font-display m-0 text-[14px] text-dex-red">NO SIGNAL</p>
            <p className="m-0 mt-1">The Poké Pager isn’t connected to its server yet, so messages can’t be sent or shown. (Setup: docs/BACKEND.md.)</p>
          </PixelBox>
        )}
        {view === 'inbox' && (
          <>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="pixel-btn pixel-btn--primary !text-[14px]"
                disabled={!pagerConfigured}
                onClick={() => {
                  sfx('open')
                  setView('compose')
                }}
              >
                ✉ COMPOSE
              </button>
              <button type="button" className="pixel-btn !text-[14px]" disabled={!pagerConfigured || load.state === 'loading'} onClick={() => void refresh()}>
                ↻ REFRESH
              </button>
            </div>
            <Inbox load={load} focus={focus} setFocus={setFocus} />
          </>
        )}
        {view === 'compose' && pagerConfigured && (
          <Compose
            onSent={() => {
              progress.unlock('pen-pal')
              setView('sent')
            }}
          />
        )}
        {view === 'sent' && (
          <PixelBox className="px-4 py-4">
            <p className="font-display m-0 text-[15px] text-dex-red">MESSAGE SENT!</p>
            <p className="m-0 mt-2 text-[16px]">Thanks! Aaryan reviews every message, so yours will appear in the inbox once it’s approved.</p>
            <button type="button" autoFocus className="pixel-btn mt-3 !text-[14px]" onClick={() => setView('inbox')}>
              BACK TO INBOX
            </button>
          </PixelBox>
        )}
      </div>
    </SectionScreen>
  )
}

/* ---------- top screen: the device display ---------- */

function Display({ selected, view, count }: { selected?: PublicMessage; view: View; count: number }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <div className="absolute inset-0 flex flex-col bg-[#2a9a90] p-[3%]">
      <div className="font-display flex items-center justify-between px-[1%] pb-[2%] text-[clamp(11px,3.1cqi,17px)] text-paper">
        <span>POKé PAGER</span>
        <span aria-hidden className="flex items-end gap-[2px]">
          {[4, 7, 10, 13].map((h) => (
            <span key={h} className={`w-[3px] ${pagerConfigured ? 'bg-paper' : 'bg-paper/30'}`} style={{ height: h }} />
          ))}
        </span>
        <span>{now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}</span>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col bg-[#c8e8c0] p-[3%] text-[#1a3a2a] shadow-[inset_0_0_0_var(--u)_#1a3a2a]">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-15" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #1a3a2a 0 1px, transparent 1px 3px)' }} />
        {view === 'compose' ? (
          <p className="font-display m-auto text-center text-[clamp(13px,3.6cqi,20px)] leading-relaxed">
            NEW MESSAGE
            <br />
            TO: AARYAN
          </p>
        ) : selected ? (
          <div className="relative flex min-h-0 flex-1 flex-col gap-[3%]">
            <div className="flex items-center gap-3">
              <span className="flex h-[clamp(36px,12cqi,64px)] w-[clamp(36px,12cqi,64px)] items-center justify-center rounded-full bg-paper/70">
                <AvatarIcon avatar={selected.avatar} scale={1} />
              </span>
              <span>
                <span className="font-display block text-[clamp(13px,3.6cqi,20px)]">{selected.name}</span>
                <span className="text-[clamp(11px,2.8cqi,15px)]">{fmtDate(selected.created_at)}</span>
              </span>
            </div>
            <p className="m-0 min-h-0 flex-1 overflow-y-auto text-[clamp(13px,3.6cqi,21px)] leading-relaxed break-words whitespace-pre-wrap">{selected.message}</p>
          </div>
        ) : (
          <p className="font-display m-auto text-center text-[clamp(13px,3.6cqi,20px)] leading-relaxed">
            {count === 0 ? (
              <>
                NO MESSAGES YET
                <br />
                BE THE FIRST!
              </>
            ) : (
              'SELECT A MESSAGE'
            )}
          </p>
        )}
      </div>
    </div>
  )
}

/* ---------- inbox ---------- */

function Inbox({ load, focus, setFocus }: { load: Load; focus: number; setFocus: (i: number) => void }) {
  const messages = load.state === 'ready' ? load.messages : []
  const nav = useGridNav(messages.length, 1, { onMove: setFocus, initial: focus })
  if (load.state === 'loading') return <p className="font-display blink m-0 p-3 text-[14px] text-paper">RECEIVING…</p>
  if (load.state === 'error')
    return (
      <PixelBox className="px-4 py-3">
        <p className="m-0">{load.message}</p>
      </PixelBox>
    )
  if (!messages.length) return pagerConfigured ? <p className="m-0 p-2 text-[15px] text-paper">No messages yet. Leave the first one!</p> : null
  return (
    <ul role="listbox" aria-label="Messages" className="m-0 list-none space-y-2 p-0">
      {messages.map((m, i) => (
        <li key={m.id}>
          <button
            type="button"
            role="option"
            aria-selected={i === focus}
            {...nav.itemProps(i)}
            onClick={() => setFocus(i)}
            onMouseEnter={() => setFocus(i)}
            className={`flex w-full cursor-pointer items-center gap-3 border-0 bg-[#c8e8c0] px-3 py-2 text-left text-[#1a3a2a] outline-none ${
              i === focus ? 'shadow-[0_0_0_var(--u)_var(--color-gold)]' : 'shadow-[0_0_0_2px_#123]'
            }`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper/70">
              <AvatarIcon avatar={m.avatar} scale={1} />
            </span>
            <span className="min-w-0">
              <span className="font-display block truncate text-[14px]">
                {m.name} <span className="opacity-60">· {fmtDate(m.created_at)}</span>
              </span>
              <span className="block truncate text-[15px]">{m.message}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ---------- compose ---------- */

function Compose({ onSent }: { onSent: () => void }) {
  const { sfx } = useSettings()
  const { name: visitorName } = useVisitor()
  const [name, setName] = useState(visitorName === 'TRAINER' ? '' : visitorName)
  const [avatar, setAvatar] = useState<Avatar>('trainer')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [token, setToken] = useState('')
  // visitors with a resort avatar can have their message pop up above it
  const [resort] = useState(() => resortSave.get())
  const canLink = trainersOnline && !!resort.avatar
  const [link, setLink] = useState(canLink)
  const [resetKey, setResetKey] = useState(0)
  const [status, setStatus] = useState<{ kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; text: string }>({ kind: 'idle' })

  const send = async () => {
    const check = validateSubmission({ name, message, avatar })
    if (!check.ok) {
      sfx('error')
      return setStatus({ kind: 'error', text: check.error })
    }
    if (TURNSTILE_SITE_KEY && !token) {
      sfx('error')
      return setStatus({ kind: 'error', text: 'Please complete the human check first.' })
    }
    setStatus({ kind: 'sending' })
    sfx('sendOut')
    try {
      // the browser secret lets this visitor delete the message later (Settings → Reset save data)
      await submitMessage({ ...check.value, turnstileToken: token, website, trainerSecret: resort.secret, ...(canLink && link ? { trainerId: resort.trainerId } : {}) })
      sfx('save')
      onSent()
    } catch (e) {
      sfx('error')
      setStatus({ kind: 'error', text: (e as Error).message })
      setToken('')
      setResetKey((k) => k + 1)
    }
  }

  const left = LIMITS.message - message.length
  const field = 'w-full border-0 bg-[#e8f4e4] px-3 py-2 text-[16px] text-ink shadow-[inset_0_0_0_var(--u)_#1a3a2a] outline-none focus:shadow-[inset_0_0_0_var(--u)_var(--color-gold)]'

  return (
    <form
      className="flex flex-col gap-3 text-paper"
      onSubmit={(e) => {
        e.preventDefault()
        void send()
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="font-display text-[13px]">YOUR NAME</span>
        <input className={field} value={name} maxLength={LIMITS.name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" required />
      </label>

      <fieldset className="m-0 border-0 p-0">
        <legend className="font-display mb-1 text-[13px]">AVATAR</legend>
        <AvatarPicker value={avatar} onChange={setAvatar} />
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="font-display flex justify-between text-[13px]">
          <span>MESSAGE</span>
          <span className={left < 20 ? 'text-gold' : ''} aria-live="polite">
            {left}
          </span>
        </span>
        <textarea className={`${field} min-h-[96px] resize-y`} value={message} maxLength={LIMITS.message} onChange={(e) => setMessage(e.target.value)} required />
      </label>

      {canLink && (
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" checked={link} onChange={(e) => setLink(e.target.checked)} className="h-4 w-4 accent-[var(--color-gold)]" />
          Show this above my avatar ({resort.name}) at the Battle Resort
        </label>
      )}

      {/* honeypot: hidden from people, irresistible to bots */}
      <label aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        Website
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>

      {TURNSTILE_SITE_KEY ? <Turnstile siteKey={TURNSTILE_SITE_KEY} onToken={setToken} resetKey={resetKey} /> : <p className="m-0 text-[13px] text-paper/80">(Human check not configured.)</p>}

      <p className="m-0 text-[13px] text-paper/80">Messages are public once Aaryan approves them. No links, please.</p>
      {status.kind === 'error' && (
        <p role="alert" className="m-0 bg-ember/90 px-3 py-2 text-[15px] text-paper">
          {status.text}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" className="pixel-btn pixel-btn--primary !text-[14px]" disabled={status.kind === 'sending'}>
          {status.kind === 'sending' ? (
            <>
              SENDING<span className="blink">…</span>
            </>
          ) : (
            '✉ SEND'
          )}
        </button>
      </div>
    </form>
  )
}

function AvatarPicker({ value, onChange }: { value: Avatar; onChange: (a: Avatar) => void }) {
  const nav = useGridNav(AVATARS.length, 5, { initial: AVATARS.indexOf(value), onMove: (i) => onChange(AVATARS[i]) })
  return (
    <div role="radiogroup" aria-label="Avatar" className="grid grid-cols-5 gap-2">
      {AVATARS.map((a, i) => (
        <button
          key={a}
          type="button"
          role="radio"
          aria-checked={value === a}
          aria-label={a === 'trainer' ? 'Trainer' : a}
          {...nav.itemProps(i)}
          onClick={() => {
            nav.setFocus(i)
            onChange(a)
          }}
          className={`flex aspect-square cursor-pointer items-center justify-center rounded-full border-0 outline-none ${value === a ? 'bg-paper shadow-[0_0_0_var(--u)_var(--color-gold)]' : 'bg-paper/60'}`}
        >
          <AvatarIcon avatar={a} scale={1} />
        </button>
      ))}
    </div>
  )
}
