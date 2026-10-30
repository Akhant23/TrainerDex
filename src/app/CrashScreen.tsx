import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * The last line of defence: if anything throws while rendering (most often a screen's code that
 * failed to download), show a box with RELOAD rather than letting React blank the whole page.
 * Deliberately uses no context or sound, since the providers may be what broke.
 */
export class CrashScreen extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('TrainerDex crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="flex min-h-dvh items-center justify-center p-4 text-ink">
        <div className="pixel-box flex w-full max-w-[420px] flex-col gap-3 px-5 py-4">
          <p className="font-display m-0 text-[15px] text-dex-red">SOMETHING WENT WRONG</p>
          <p className="m-0 text-[16px] leading-relaxed">The page hit a snag while loading. Reloading usually sorts it out.</p>
          <button type="button" onClick={() => window.location.reload()} className="pixel-btn pixel-btn--primary self-end">
            RELOAD
          </button>
        </div>
      </div>
    )
  }
}
