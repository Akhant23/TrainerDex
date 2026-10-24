import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ACCESSORIES,
  BOTTOMS,
  CLOTH_COLOURS,
  EYE_COLOURS,
  EYE_STYLES,
  FACES,
  HAIR_COLOURS,
  HAIR_STYLES,
  HATS,
  MAX_ACCESSORIES,
  SHOES,
  SKINS,
  TOPS,
  type Appearance,
} from '../../sprites/character'
import { validateGreeting, validateTrainerName } from '../../../supabase/functions/_shared/validate'
import { readPhoto, suggestColours, type PixelData } from '../../systems/photoColours'
import { useSettings } from '../../systems/settings'
import { CharacterSprite, type CharacterPose } from '../../ui/CharacterSprite'
import { OverworldSprite } from '../../ui/OverworldSprite'
import { DEFAULT_AVATAR } from '../../systems/resortSave'

export { DEFAULT_AVATAR }


const EYE_SWATCHES = Object.fromEntries(Object.entries(EYE_COLOURS).map(([k, v]) => [k, [v]])) as unknown as Record<keyof typeof EYE_COLOURS, readonly string[]>

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]
export function randomAvatar(): Appearance {
  const cloth = Object.keys(CLOTH_COLOURS) as Array<keyof typeof CLOTH_COLOURS>
  return {
    skin: pick(Object.keys(SKINS) as Array<keyof typeof SKINS>),
    hair: pick(HAIR_STYLES),
    hairColour: pick(Object.keys(HAIR_COLOURS) as Array<keyof typeof HAIR_COLOURS>),
    eyes: pick(EYE_STYLES),
    eyeColour: pick(Object.keys(EYE_COLOURS) as Array<keyof typeof EYE_COLOURS>),
    face: pick(FACES),
    top: pick(TOPS),
    topColour: pick(cloth),
    accentColour: pick(cloth),
    hat: Math.random() < 0.5 ? 'none' : pick(HATS),
    hatColour: pick(cloth),
    bottom: pick(BOTTOMS),
    bottomColour: pick(cloth),
    shoes: pick(SHOES),
    shoeColour: pick(cloth),
    accessories: Math.random() < 0.5 ? [pick(ACCESSORIES)] : [],
  }
}

const LABEL: Record<string, string> = {
  wavy: 'WAVY', mullet: 'MULLET', curtains: 'MIDDLE PART', short: 'SHORT', spiky: 'SPIKY', curly: 'CURLY', long: 'LONG', bun: 'BUN', buzz: 'BUZZ',
  soft: 'SOFT', round: 'ROUND', sharp: 'SHARP', wide: 'WIDE',
  smile: 'SMILE', grin: 'GRIN', smirk: 'SMIRK', calm: 'CALM',
  tee: 'TEE', splash: 'PAINT TEE', jersey: 'JERSEY', hoodie: 'HOODIE', jacket: 'JACKET', shirt: 'SHIRT + TIE', blazer: 'BLAZER', suit: 'SUIT', school: 'SCHOOL BLAZER', tank: 'TANK TOP',
  none: 'NONE', cap: 'CAP', beanie: 'BEANIE', bucket: 'BUCKET HAT', headband: 'HEADBAND',
  joggers: 'JOGGERS', jeans: 'JEANS', shorts: 'SHORTS', skirt: 'SKIRT', slacks: 'SLACKS',
  sneakers: 'SNEAKERS', boots: 'BOOTS', formal: 'FORMAL',
}

/** The turnaround the preview steps through: front, right profile, back, left profile. */
const TURN: { pose: CharacterPose; flip?: boolean; label: string }[] = [
  { pose: 'idle', label: 'FRONT' },
  { pose: 'side', label: 'SIDE' },
  { pose: 'back', label: 'BACK' },
  { pose: 'side', flip: true, label: 'SIDE' },
]

export default function AvatarStudio({
  initial,
  initialName,
  initialGreeting,
  onSave,
  onCancel,
}: {
  initial: Appearance
  initialName: string
  initialGreeting: string
  onSave: (a: Appearance, name: string, greeting: string) => void
  onCancel?: () => void
}) {
  const { sfx } = useSettings()
  const [a, setA] = useState<Appearance>(initial)
  const [name, setName] = useState(initialName)
  const [greeting, setGreeting] = useState(initialGreeting)
  const [error, setError] = useState('')
  const [photoNote, setPhotoNote] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [camera, setCamera] = useState(false)
  const [turn, setTurn] = useState(0)

  const set = <K extends keyof Appearance>(k: K, v: Appearance[K]) => {
    sfx('cursor')
    setA((cur) => ({ ...cur, [k]: v }))
  }

  const cycle = <K extends keyof Appearance>(k: K, list: readonly Appearance[K][], d: number) => {
    const i = list.indexOf(a[k])
    set(k, list[(i + d + list.length) % list.length])
  }

  const toggleAcc = (x: (typeof ACCESSORIES)[number]) => {
    const has = a.accessories.includes(x)
    if (!has && a.accessories.length >= MAX_ACCESSORIES) return sfx('bump')
    // glasses and sunglasses don't stack
    let next = has ? a.accessories.filter((y) => y !== x) : [...a.accessories, x]
    if (!has && x === 'glasses') next = next.filter((y) => y !== 'sunglasses')
    if (!has && x === 'sunglasses') next = next.filter((y) => y !== 'glasses')
    set('accessories', next)
  }

  const applyPhoto = (img: PixelData) => {
    const s = suggestColours(img)
    if (!s.skin && !s.hairColour && !s.topColour) {
      setPhotoNote('Couldn’t find a face in that photo — try a clear, front-on picture.')
      return
    }
    setA((cur) => ({ ...cur, ...(s.skin ? { skin: s.skin } : {}), ...(s.hairColour ? { hairColour: s.hairColour } : {}), ...(s.topColour ? { topColour: s.topColour } : {}) }))
    sfx('statUp')
    setPhotoNote('Matched your skin tone, hair and top colour (best guess) — tweak anything below. The photo has already been discarded.')
  }

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    setPhotoNote('Looking at your photo…')
    try {
      applyPhoto(await readPhoto(file))
    } catch (e) {
      setPhotoNote((e as Error).message)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const save = () => {
    const n = validateTrainerName(name)
    if (!n.ok) return setError(n.error)
    const g = validateGreeting(greeting)
    if (!g.ok) return setError(g.error)
    setError('')
    sfx('save')
    onSave(a, n.value, g.value)
  }

  return (
    <div className="space-y-4 p-[3%] text-[15px]">
      <div className="flex items-end justify-center gap-6 bg-[radial-gradient(circle_at_50%_70%,#ffffff,#d8e4f4)] py-3 gv-card">
        <div className="flex flex-col items-center gap-1">
          <CharacterSprite appearance={a} scale={2} pose={TURN[turn].pose} style={TURN[turn].flip ? { transform: 'scaleX(-1)' } : undefined} alt={`Your avatar, ${TURN[turn].label.toLowerCase()} view`} />
          <button type="button" className="pixel-btn !px-2 !py-1 !text-[12px]" onClick={() => (sfx('cursor'), setTurn((t) => (t + 1) % TURN.length))} aria-label="Turn the avatar around">
            ⟳ {TURN[turn].label}
          </button>
        </div>
        <div className="flex flex-col items-center gap-1">
          <OverworldSprite appearance={a} facing="down" walking scale={3} />
          <span className="font-display text-[12px] text-muted">WALKING</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-display text-[13px]">TRAINER NAME</span>
          <input className="studio-input" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-display text-[13px]">GREETING (OTHERS SEE THIS)</span>
          <input className="studio-input" value={greeting} maxLength={60} onChange={(e) => setGreeting(e.target.value)} placeholder="Hi!" />
        </label>
      </div>

      <section className="space-y-2 bg-[#eef3fa] px-3 py-3 gv-card">
        <h3 className="font-display m-0 text-[14px] text-dex-red">START FROM A PHOTO (OPTIONAL)</h3>
        <ul className="m-0 list-none space-y-1 p-0 text-[14px]">
          <li>▸ Take a selfie or pick a photo and we’ll match your skin tone, hair and top colour.</li>
          <li>▸ It’s read only in your browser, then deleted straight away. Nothing is uploaded or saved.</li>
          <li>▸ Rather not? Skip it — build your look below, or roll a random one.</li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className="pixel-btn !text-[14px]" onClick={() => setCamera(true)}>
            📷 TAKE A PHOTO
          </button>
          <button type="button" className="pixel-btn !text-[14px]" onClick={() => fileRef.current?.click()}>
            🖼 UPLOAD A PHOTO
          </button>
          <button type="button" className="pixel-btn !text-[14px]" onClick={() => setA(randomAvatar())}>
            🎲 RANDOMISE
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} />
        </div>
        {camera && (
          <CameraSnap
            onCancel={() => setCamera(false)}
            onSnap={(img) => {
              setCamera(false)
              applyPhoto(img)
            }}
            onFallback={() => {
              setCamera(false)
              setPhotoNote('Couldn’t open the camera here — try UPLOAD A PHOTO instead.')
            }}
          />
        )}
        {photoNote && <p className="m-0 text-[14px] text-muted">{photoNote}</p>}
      </section>

      <Row label="SKIN">
        <Swatches table={SKINS} value={a.skin} onPick={(v) => set('skin', v)} />
      </Row>
      <Row label="HAIR">
        <Cycler value={LABEL[a.hair]} onPrev={() => cycle('hair', HAIR_STYLES, -1)} onNext={() => cycle('hair', HAIR_STYLES, 1)} />
        <Swatches table={HAIR_COLOURS} value={a.hairColour} onPick={(v) => set('hairColour', v)} />
      </Row>
      <Row label="EYES">
        <Cycler value={LABEL[a.eyes]} onPrev={() => cycle('eyes', EYE_STYLES, -1)} onNext={() => cycle('eyes', EYE_STYLES, 1)} />
        <Swatches table={EYE_SWATCHES} value={a.eyeColour} onPick={(v) => set('eyeColour', v)} />
      </Row>
      <Row label="FACE">
        <Cycler value={LABEL[a.face]} onPrev={() => cycle('face', FACES, -1)} onNext={() => cycle('face', FACES, 1)} />
      </Row>
      <Row label="TOP">
        <Cycler value={LABEL[a.top]} onPrev={() => cycle('top', TOPS, -1)} onNext={() => cycle('top', TOPS, 1)} />
        <Swatches table={CLOTH_COLOURS} value={a.topColour} onPick={(v) => set('topColour', v)} />
        <span className="font-display w-full text-[12px] text-muted">TRIM / TIE</span>
        <Swatches table={CLOTH_COLOURS} value={a.accentColour} onPick={(v) => set('accentColour', v)} />
      </Row>
      <Row label="HAT">
        <Cycler value={LABEL[a.hat]} onPrev={() => cycle('hat', HATS, -1)} onNext={() => cycle('hat', HATS, 1)} />
        {a.hat !== 'none' && <Swatches table={CLOTH_COLOURS} value={a.hatColour} onPick={(v) => set('hatColour', v)} />}
      </Row>
      <Row label="BOTTOMS">
        <Cycler value={LABEL[a.bottom]} onPrev={() => cycle('bottom', BOTTOMS, -1)} onNext={() => cycle('bottom', BOTTOMS, 1)} />
        <Swatches table={CLOTH_COLOURS} value={a.bottomColour} onPick={(v) => set('bottomColour', v)} />
      </Row>
      <Row label="SHOES">
        <Cycler value={LABEL[a.shoes]} onPrev={() => cycle('shoes', SHOES, -1)} onNext={() => cycle('shoes', SHOES, 1)} />
        <Swatches table={CLOTH_COLOURS} value={a.shoeColour} onPick={(v) => set('shoeColour', v)} />
      </Row>
      <Row label={`ACCESSORIES (UP TO ${MAX_ACCESSORIES})`}>
        <div className="flex flex-wrap gap-1.5">
          {ACCESSORIES.map((x) => {
            const on = a.accessories.includes(x)
            return (
              <button key={x} type="button" aria-pressed={on} onClick={() => toggleAcc(x)} className="gv-toggle px-2.5 py-1.5 text-[13px]">
                {x.toUpperCase()}
              </button>
            )
          })}
        </div>
      </Row>

      {error && (
        <p role="alert" className="m-0 bg-ember px-3 py-2 text-paper">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" className="pixel-btn !text-[14px]" onClick={onCancel}>
            CANCEL
          </button>
        )}
        <button type="button" className="pixel-btn pixel-btn--primary !text-[14px]" onClick={save}>
          ✓ SAVE LOOK
        </button>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-t-2 border-[#c8d0e0] pt-3">
      <h3 className="font-display m-0 text-[14px] text-dex-red">{label}</h3>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </section>
  )
}

function Cycler({ value, onPrev, onNext }: { value: string; onPrev: () => void; onNext: () => void }) {
  return (
    <span className="flex items-center gap-1">
      <button type="button" aria-label="Previous" className="pixel-btn !px-2 !py-1 !text-[13px]" onClick={onPrev}>
        ◀
      </button>
      <span className="font-display min-w-[7.5em] text-center text-[14px]">{value}</span>
      <button type="button" aria-label="Next" className="pixel-btn !px-2 !py-1 !text-[13px]" onClick={onNext}>
        ▶
      </button>
    </span>
  )
}

function Swatches<K extends string>({ table, value, onPick }: { table: Record<K, readonly string[]>; value: K; onPick: (k: K) => void }) {
  return (
    <span className="flex flex-wrap gap-1.5" role="radiogroup">
      {(Object.keys(table) as K[]).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          aria-label={k}
          title={k}
          onClick={() => onPick(k)}
          className={`h-7 w-7 cursor-pointer border-0 ${value === k ? 'shadow-[0_0_0_2px_var(--color-ink),0_0_0_5px_var(--color-gold)]' : 'shadow-[0_0_0_2px_var(--color-ink)]'}`}
          style={{ background: table[k][0] }}
        />
      ))}
    </span>
  )
}

/**
 * Live camera preview for a selfie. One frame is drawn to a small canvas, read for colours, and
 * the camera is switched off immediately — nothing is stored or sent anywhere.
 */
function CameraSnap({ onSnap, onCancel, onFallback }: { onSnap: (img: PixelData) => void; onCancel: () => void; onFallback: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let stopped = false
    if (!navigator.mediaDevices?.getUserMedia) {
      onFallback()
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream.current = s
        if (video.current) {
          video.current.srcObject = s
          void video.current.play().then(() => setReady(true))
        }
      })
      .catch(() => !stopped && onFallback())
    return () => {
      stopped = true
      stream.current?.getTracks().forEach((t) => t.stop())
      stream.current = null
    }
    // open the camera once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const snap = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const k = Math.min(1, 160 / Math.max(v.videoWidth, v.videoHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(v.videoWidth * k)
    c.height = Math.round(v.videoHeight * k)
    const ctx = c.getContext('2d')
    if (!ctx) return onFallback()
    ctx.drawImage(v, 0, 0, c.width, c.height)
    const d = ctx.getImageData(0, 0, c.width, c.height)
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    onSnap({ data: d.data, width: d.width, height: d.height })
  }

  return (
    <div className="space-y-2">
      <video ref={video} playsInline muted className="block w-full max-w-[320px] -scale-x-100 bg-ink shadow-[0_0_0_2px_var(--color-ink)]" aria-label="Camera preview" />
      <div className="flex gap-2">
        <button type="button" className="pixel-btn pixel-btn--primary !text-[14px]" onClick={snap} disabled={!ready}>
          {ready ? '● SNAP' : 'STARTING CAMERA…'}
        </button>
        <button type="button" className="pixel-btn !text-[14px]" onClick={onCancel}>
          CANCEL
        </button>
      </div>
    </div>
  )
}
