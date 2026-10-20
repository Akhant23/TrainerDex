import { useSettings } from '../systems/settings'
import { navigate } from './router'
import { Logo } from '../ui/Logo'
import { PixelIcon } from '../ui/PixelIcon'

/** Always-visible bar: home, sound + music quick toggles, and the resume shortcut. */
export function SystemBar() {
  const { saved, saveSettings, sfx } = useSettings()

  const toggle = (key: 'sfx' | 'music') => {
    const next = { ...saved, [key]: !saved[key] }
    saveSettings(next)
    if (key === 'sfx' && next.sfx) window.setTimeout(() => sfx('select'), 30)
  }

  return (
    <header className="sticky top-0 z-40 flex w-full max-w-[1500px] items-center justify-between gap-2 bg-screen-bg/90 px-3 py-2 backdrop-blur-sm sm:static sm:bg-transparent sm:px-1 sm:pb-3">
      <a
        href="#/"
        onClick={() => sfx('back')}
        className="rounded-sm px-1 py-2 no-underline"
        aria-label="The TrainerDex — main menu"
      >
        <Logo size="sm" />
      </a>
      <nav aria-label="Quick settings" className="flex items-center gap-1">
        <button
          type="button"
          className="pixel-btn pixel-btn--ghost !p-1"
          aria-pressed={saved.sfx}
          aria-label={saved.sfx ? 'Sound effects on' : 'Sound effects off'}
          title={saved.sfx ? 'Sound effects: ON' : 'Sound effects: OFF'}
          onClick={() => toggle('sfx')}
        >
          <span className="inline-flex rounded-sm bg-paper/90 p-0.5">
            <PixelIcon name={saved.sfx ? 'soundOn' : 'soundOff'} scale={2} />
          </span>
        </button>
        <button
          type="button"
          className="pixel-btn pixel-btn--ghost !p-1"
          aria-pressed={saved.music}
          aria-label={saved.music ? 'Music on' : 'Music off'}
          title={saved.music ? 'Music: ON' : 'Music: OFF'}
          onClick={() => toggle('music')}
        >
          <span className={`relative inline-flex rounded-sm bg-paper/90 p-0.5 ${saved.music ? '' : 'opacity-50'}`}>
            <PixelIcon name="music" scale={2} />
            {!saved.music && <span aria-hidden className="absolute top-1/2 left-0 h-[3px] w-full -rotate-45 bg-dex-red" />}
          </span>
        </button>
        <button
          type="button"
          className="pixel-btn pixel-btn--primary ml-1 inline-flex items-center gap-2 !text-[10px]"
          onClick={() => {
            sfx('open')
            navigate('/pc/resume')
          }}
        >
          <PixelIcon name="resume" scale={1} className="bg-paper" />
          RESUME
        </button>
      </nav>
    </header>
  )
}
