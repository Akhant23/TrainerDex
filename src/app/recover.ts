/**
 * Each screen is its own code chunk, named by a hash of its contents. A tab opened before a deploy
 * still asks for the old chunks, which the new deploy no longer has (a 404), so opening a screen
 * fails. Vite announces that as `vite:preloadError`: reload once to pick up the new deploy. If it
 * fails again straight after (offline, or storage is blocked so we can't tell), the crash screen
 * offers RELOAD instead of looping.
 */
const KEY = 'tdx:v1:chunk-reload'
const WINDOW_MS = 10_000

/** True (and noted) when a reload now wouldn't repeat one from just before. */
export function claimReload(now = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0) || 0
    if (now - last < WINDOW_MS) return false
    sessionStorage.setItem(KEY, String(now))
    return true
  } catch {
    return false
  }
}

export function installChunkRecovery() {
  if (typeof window === 'undefined') return
  window.addEventListener('vite:preloadError', () => {
    if (claimReload()) window.location.reload()
  })
}
