import { createContext, useContext, type ReactNode } from 'react'
import type { WipePhase } from './router'
import { SystemBar } from './SystemBar'

export const WipeContext = createContext<WipePhase>('idle')

function Wipe() {
  const phase = useContext(WipeContext)
  if (phase === 'idle') return null
  return (
    <div aria-hidden className={`wipe wipe--${phase}`}>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  )
}

interface Props {
  top: ReactNode
  bottom: ReactNode
  /** On phones, show a short banner instead of a full 4:3 top screen. */
  compactTop?: boolean
  /** Accessible names for the two screens. */
  topLabel?: string
  bottomLabel?: string
}

/**
 * The DS frame. Two screens side by side on wide desktops, stacked on tablets, and an
 * unframed stack on phones (see .ds-* rules in styles/index.css).
 */
export function DSShell({ top, bottom, compactTop = false, topLabel = 'Top screen', bottomLabel = 'Touch screen' }: Props) {
  return (
    <div className="ds-page">
      <SystemBar />
      <div className="ds-shell">
        <section aria-label={topLabel} className={`ds-screen ds-screen--top ${compactTop ? 'ds-screen--compact' : ''}`}>
          {top}
          <Wipe />
        </section>
        <div className="ds-hinge" aria-hidden />
        <main aria-label={bottomLabel} className="ds-screen ds-screen--bottom">
          {bottom}
          <Wipe />
        </main>
      </div>
      <footer className="mt-auto px-4 pt-4 pb-3 text-center text-[13px] text-muted">
        <p className="m-0 hidden lg:block">
          <kbd className="font-display text-[9px]">↑↓←→</kbd> move · <kbd className="font-display text-[9px]">ENTER / Z</kbd> select ·{' '}
          <kbd className="font-display text-[9px]">ESC / X</kbd> back
        </p>
        <p className="m-0">A fan-inspired personal site. Not affiliated with Nintendo, Game Freak, Creatures or The Pokémon Company.</p>
      </footer>
    </div>
  )
}
