import type { ReactNode } from 'react'
import { DSShell } from '../app/DSShell'
import { navigate } from '../app/router'
import type { MenuEntry } from '../content/menu'
import { useSettings } from '../systems/settings'
import { useGameKeys } from '../systems/input'
import { PixelIcon } from '../ui/PixelIcon'

interface Props {
  entry: MenuEntry
  /** Top-screen content; defaults to the section's title card. */
  top?: ReactNode
  children: ReactNode
  /** Override Back (B / Esc / ◀ button). Defaults to returning to the main menu. */
  onBack?: () => void
  /** Shortcut for onBack: go to this path (with the back sound). */
  backTo?: string
  /** Header title (defaults to the section label). */
  title?: string
  /** Fixed strip between the header and the scrolling content (e.g. page tabs). */
  subheader?: ReactNode
  /** Changing this resets the content scroll position. */
  scrollKey?: string | number
  /** Turn off the B/Esc handler while something else (a modal) owns it. */
  backKeys?: boolean
  compactTop?: boolean
}

/** Shared frame for every section: coloured title card on top, header bar + content below. */
export function SectionScreen({ entry, top, children, onBack, backTo = '/', title, subheader, scrollKey, backKeys = true, compactTop = true }: Props) {
  const { sfx } = useSettings()
  const back =
    onBack ??
    (() => {
      sfx('back')
      navigate(backTo)
    })

  useGameKeys((k, e) => {
    if (k === 'b') {
      e.preventDefault()
      back()
    }
  }, backKeys)

  return (
    <DSShell
      compactTop={compactTop}
      topLabel={`${entry.label} title`}
      bottomLabel={entry.label}
      top={top ?? <TitleCard entry={entry} />}
      bottom={
        <div className="flex h-full flex-1 flex-col bg-[#e8ecf4] text-ink">
          <div className="flex items-center justify-between gap-2 px-[2%] py-[1%]" style={{ background: entry.color[1] }}>
            <button type="button" onClick={back} className="pixel-btn !text-[10px]" aria-label={backTo === '/' && !onBack ? 'Back to main menu' : 'Back'}>
              ◀ BACK
            </button>
            <h2 className="font-display text-outline m-0 truncate pr-2 text-[clamp(11px,2.8cqi,16px)] text-paper">{title ?? entry.label}</h2>
          </div>
          {subheader}
          <div key={scrollKey} className="ds-bottom-scroll">
            {children}
          </div>
        </div>
      }
    />
  )
}

export function TitleCard({ entry, subtitle }: { entry: MenuEntry; subtitle?: string }) {
  return (
    <div className="bg-stripes absolute inset-0 flex flex-col items-center justify-center gap-[5%] p-[4%]" style={{ ['--s1' as string]: entry.color[0], ['--s2' as string]: entry.color[1] }}>
      <span className="rounded-sm bg-paper p-[2%] shadow-[0_0_0_var(--u)_var(--color-ink),0_var(--u)_0_calc(var(--u))_var(--color-ink)]">
        <span className="hidden sm:flex">
          <PixelIcon name={entry.icon} scale={4} />
        </span>
        <span className="flex sm:hidden">
          <PixelIcon name={entry.icon} scale={3} />
        </span>
      </span>
      <h1 className="font-display text-outline m-0 text-center text-[clamp(16px,6cqi,40px)] text-paper">{entry.label}</h1>
      {subtitle && <p className="font-display text-outline m-0 text-center text-[clamp(9px,2.4cqi,14px)] text-gold">{subtitle}</p>}
    </div>
  )
}
