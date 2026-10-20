import { lazy, Suspense, useCallback, useEffect, type ComponentType, type LazyExoticComponent } from 'react'
import { SettingsProvider, useSettings } from '../systems/settings'
import { VisitorProvider, useVisitor } from '../systems/visitor'
import { menuEntryForRoute } from '../content/menu'
import { navigate, useHashPath, useWipedPath } from './router'
import { WipeContext } from './DSShell'
import MainMenu from '../screens/MainMenu'
import { progress } from '../systems/progress'
import { MedalToast } from '../ui/Medals'
import { useKonami } from '../systems/konami'

// Sections load on demand so the first visit only downloads the shell, intro and menu.
const loaders = {
  settings: () => import('../screens/Settings'),
  comingSoon: () => import('../screens/ComingSoon'),
  profile: () => import('../screens/Profile'),
  pokedex: () => import('../screens/Pokedex'),
  card: () => import('../screens/TrainerCard'),
  pc: () => import('../screens/PC'),
  album: () => import('../screens/PhotoAlbum'),
  battle: () => import('../screens/battle/Battle'),
  medals: () => import('../screens/MedalBox'),
  pager: () => import('../screens/PokePager'),
  admin: () => import('../screens/Admin'),
}
const Intro = lazy(() => import('../screens/Intro'))
const SettingsScreen = lazy(loaders.settings)
const ComingSoon = lazy(loaders.comingSoon)
const MedalBox = lazy(loaders.medals)
const Admin = lazy(loaders.admin)
const sections: Record<string, LazyExoticComponent<ComponentType<{ path: string }>>> = {
  profile: lazy(loaders.profile),
  pokedex: lazy(loaders.pokedex),
  card: lazy(loaders.card),
  pc: lazy(loaders.pc),
  album: lazy(loaders.album),
  battle: lazy(loaders.battle),
  pager: lazy(loaders.pager),
}

/** Once the menu is up, quietly fetch section code so opening one never shows a loader. */
function usePrefetchSections(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const run = () => void Promise.all(Object.entries(loaders).filter(([k]) => k !== 'admin').map(([, l]) => l())).catch(() => {})
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 3000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(run, 1500)
    return () => clearTimeout(id)
  }, [enabled])
}

export default function App() {
  return (
    <SettingsProvider>
      <VisitorProvider>
        <Game />
      </VisitorProvider>
    </SettingsProvider>
  )
}

function Game() {
  const { introSeen, setIntroSeen } = useVisitor()
  const { reducedMotion } = useSettings()
  const path = useHashPath()
  const { shown, phase } = useWipedPath(path, reducedMotion)
  const finishIntro = useCallback(() => setIntroSeen(true), [setIntroSeen])
  usePrefetchSections(introSeen)
  useKonami()

  // Unknown routes fall back to the menu.
  const entry = menuEntryForRoute(shown)
  const isMedals = shown === '/medals'
  const isAdmin = shown === '/admin'
  useEffect(() => {
    if (shown !== '/' && !entry && !isMedals && !isAdmin) navigate('/')
  }, [shown, entry, isMedals, isAdmin])

  // medals: first visit, section visits, late-night visits
  useEffect(() => {
    if (!introSeen) return
    progress.unlock('first-encounter')
    const h = new Date().getHours()
    if (h < 5) progress.unlock('night-owl')
  }, [introSeen])
  useEffect(() => {
    if (introSeen && entry) progress.visitSection(entry.id)
  }, [introSeen, entry])

  if (!introSeen)
    return (
      <Suspense fallback={<Loading />}>
        <Intro onDone={finishIntro} />
      </Suspense>
    )

  let screen
  if (isMedals) screen = <MedalBox />
  else if (isAdmin) screen = <Admin />
  else if (shown === '/' || !entry) screen = <MainMenu />
  else if (entry.id === 'settings') screen = <SettingsScreen />
  else if (sections[entry.id]) {
    const Section = sections[entry.id]
    screen = <Section path={shown} />
  } else screen = <ComingSoon key={shown} entry={entry} path={shown} />

  return (
    <WipeContext.Provider value={phase}>
      <Suspense fallback={<Loading />}>{screen}</Suspense>
      <MedalToast />
    </WipeContext.Provider>
  )
}

function Loading() {
  return (
    <div role="status" className="font-display flex min-h-dvh items-center justify-center text-[17px] text-paper">
      <span className="blink">LOADING…</span>
    </div>
  )
}
