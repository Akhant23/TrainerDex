import { useEffect, useRef, useState } from 'react'
import { navigate } from '../app/router'
import { menu } from '../content/menu'
import { ALBUM_SIZE, photos, type Photo } from '../content/photos'
import { progress, useProgress } from '../systems/progress'
import { useSettings } from '../systems/settings'
import { useGameKeys } from '../systems/input'
import { PhotoPortrait } from '../ui/PhotoPortrait'
import { Overlay } from '../ui/Overlay'
import { PixelBox } from '../ui/PixelBox'
import { PixelIcon } from '../ui/PixelIcon'
import { SceneBackdrop } from '../ui/SceneBackdrop'
import { useGridNav } from '../ui/useGridNav'
import { SectionScreen } from './SectionScreen'

const entry = menu.find((m) => m.id === 'album')!
const COLS = 5
const pad = (n: number) => String(n).padStart(2, '0')
const isPortrait = (p: Photo) => p.height > p.width

export default function PhotoAlbum({ path }: { path: string }) {
  const n = Number(path.split('/')[2])
  const openIndex = n >= 1 && n <= photos.length ? n - 1 : null
  const { sfx } = useSettings()
  const { photosSeen } = useProgress()
  const slots = Array.from({ length: ALBUM_SIZE }, (_, i) => photos[i] ?? null)
  const open = (i: number) => {
    if (!slots[i]) return sfx('bump')
    sfx('open')
    navigate(`/album/${i + 1}`)
  }
  const nav = useGridNav(ALBUM_SIZE, COLS, { enabled: openIndex === null, initial: openIndex ?? 0, onActivate: open })
  const focused = slots[nav.focus]

  return (
    <SectionScreen
      entry={entry}
      title={`MEMORIES ${photosSeen.length}/${ALBUM_SIZE}`}
      backKeys={openIndex === null}
      compactTop={false}
      top={
        <div className="bg-stripes absolute inset-0" style={{ ['--s1' as string]: entry.color[0], ['--s2' as string]: entry.color[1] }}>
          {/* the home screen's city, panning behind the print */}
          <SceneBackdrop tones={entry.color} />
          <div className="relative flex h-full w-full items-center justify-center p-[4%]">
            {focused ? (
              // keyed on the slot, so each newly focused print fades in rather than swapping hard
              <figure key={nav.focus} className="album-preview m-0 flex h-full w-full flex-col items-center justify-center gap-[3%]">
                <img
                  src={focused.src}
                  alt={focused.alt}
                  width={focused.width}
                  height={focused.height}
                  // portraits fill the height; landscapes keep a margin either side so they don't touch the frame
                  className={`gv-photo h-auto w-auto ${isPortrait(focused) ? 'max-h-[80%] max-w-full' : 'max-h-[74%] max-w-[92%]'}`}
                />
                <figcaption className="font-display text-outline text-[clamp(13px,3.6cqi,21px)] text-paper">
                  No.{pad(nav.focus + 1)} {focused.title.toUpperCase()}
                </figcaption>
              </figure>
            ) : (
              <PixelBox variant="plate" className="max-w-[80%] px-[5%] py-[4%] text-center">
                <p className="font-display m-0 text-[clamp(14px,3.9cqi,22px)]">No.{pad(nav.focus + 1)} ?????</p>
                <p className="m-0 mt-2 text-[clamp(12px,3cqi,17px)]">{photos.length === 0 ? 'No memories registered yet.' : 'This memory hasn’t been discovered yet.'}</p>
              </PixelBox>
            )}
          </div>
        </div>
      }
    >
      {/* side by side, the grid stretches to fill the whole screen; stacked (phones, tablets) each
          slot is a 3:4 print, so the grid fills the width without leaving landscape thumbs tiny */}
      <div className="bg-dots flex h-full min-h-full flex-col p-[2%]">
        <div role="listbox" aria-label="Photo album" className="album-grid grid min-h-0 flex-1 grid-cols-5 gap-[2%]" style={{ ['--rows' as string]: Math.ceil(slots.length / COLS) }}>
          {slots.map((p, i) => (
            <button
              key={i}
              type="button"
              role="option"
              aria-selected={i === nav.focus}
              aria-label={p ? `${pad(i + 1)}: ${p.title}` : `${pad(i + 1)}: empty`}
              {...nav.itemProps(i)}
              onMouseEnter={() => nav.setFocus(i)}
              onClick={() => open(i)}
              className={`album-slot relative flex h-full min-h-0 cursor-pointer items-center justify-center overflow-hidden border-0 p-0 outline-none ${
                p ? 'bg-paper' : 'bg-[#c8cede]'
              } ${i === nav.focus ? 'gv-card--selected' : 'gv-card'}`}
            >
              {/* portraits crop from near the top (where the faces are); landscapes from the centre */}
              {p ? (
                <img src={p.thumb} alt="" loading="lazy" className="album-thumb absolute inset-0 h-full w-full object-cover" style={{ objectPosition: isPortrait(p) ? '50% 22%' : '50% 40%' }} />
              ) : (
                <PixelIcon name="album" scale={2} className="opacity-30 grayscale" />
              )}
              <span className="font-display absolute top-0.5 left-0.5 bg-ink/70 px-1 text-[11px] text-paper">{pad(i + 1)}</span>
              {p && photosSeen.includes(i) && (
                <span aria-hidden className="absolute right-0.5 bottom-0.5 bg-ink/70 px-1 text-[11px] text-gold">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
        {photos.length === 0 && <p className="m-0 mt-4 text-[14px] text-muted">Fifteen slots, ready for fifteen photos. See docs/CONTENT.md to add them.</p>}
      </div>
      {openIndex !== null && <PhotoViewer index={openIndex} onClose={() => navigate('/album')} />}
    </SectionScreen>
  )
}

/** Full-screen Dex-style memory entry with keyboard and swipe navigation. */
function PhotoViewer({ index, onClose }: { index: number; onClose: () => void }) {
  const { sfx } = useSettings()
  const photo: Photo = photos[index]
  const touchX = useRef<number | null>(null)
  const [dir, setDir] = useState(0)
  useEffect(() => progress.seePhoto(index), [index])

  const go = (d: number) => {
    sfx('cursor')
    setDir(d)
    navigate(`/album/${((index + d + photos.length) % photos.length) + 1}`)
  }
  useGameKeys((k, e) => {
    if (k === 'left') go(-1)
    else if (k === 'right') go(1)
    else return
    e.preventDefault()
  })

  return (
    <Overlay title={`MEMORY No.${pad(index + 1)}`} onClose={onClose}>
      {/* stacked (below lg) the entry scrolls: the photo gets most of the screen at its own shape
          (a portrait as tall as two thirds of the screen, not squeezed into a strip) and the
          details follow underneath; side by side, the photo fills what the details leave */}
      <div
        className="album-viewer flex h-full flex-col gap-3 overflow-y-auto overscroll-contain lg:flex-row lg:overflow-hidden"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        {/* the frame wraps the photo itself: the box takes the photo's own shape (width/height auto
            keep its aspect while max-width/height fit it in), so there's no letterboxing to fill;
            behind it, the same photo blurred right out lights the stage in its colours */}
        <div key={index} className="relative flex shrink-0 items-center justify-center p-[14px] lg:min-h-0 lg:flex-1" style={{ animation: 'photo-in 300ms var(--ease-move)', ['--dx' as string]: `${dir * 24}px` }}>
          <img aria-hidden alt="" src={photo.thumb} className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40 blur-2xl [mask-image:radial-gradient(closest-side,black_40%,transparent)]" />
          <img
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            className={`gv-photo relative h-auto w-auto max-w-full lg:max-h-full ${isPortrait(photo) ? 'max-h-[68dvh]' : 'max-h-[58dvh]'}`}
          />
        </div>
        <div className="flex shrink-0 flex-col items-center gap-3 pb-2 lg:w-[340px] lg:items-stretch lg:self-start lg:pb-0">
          <PixelBox className="w-full max-w-[560px] px-5 py-4">
            <p className="font-display m-0 text-[17px] text-dex-red">
              No.{pad(index + 1)} {photo.title.toUpperCase()}
            </p>
            <p className="m-0 text-[14px] text-muted">
              {photo.category}
              {photo.date && ` · ${photo.date}`}
            </p>
            <p className="m-0 mt-2 text-[17px]">{photo.caption}</p>
            <p className="m-0 mt-2 text-[15px] italic">{photo.dexEntry}</p>
            <div className="mt-3 flex justify-between">
              <button type="button" className="pixel-btn !text-[14px]" onClick={() => go(-1)}>
                ◀ PREV
              </button>
              <button type="button" className="pixel-btn !text-[14px]" onClick={() => go(1)}>
                NEXT ▶
              </button>
            </div>
          </PixelBox>
          {/* the same moment as pixel art, drawn for this photo (changes with PREV / NEXT) */}
          <PhotoPortrait key={photo.id} photoId={photo.id} className="w-full max-w-[560px]" />
        </div>
      </div>
    </Overlay>
  )
}
