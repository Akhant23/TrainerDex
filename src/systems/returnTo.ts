/**
 * When a section is opened from a door in the Battle Resort, its BACK button should walk you
 * back out of that door rather than to the main menu. Session-only.
 */
const KEY = 'tdx:v1:return-to'

export function setReturnTo(path: string) {
  try {
    sessionStorage.setItem(KEY, path)
  } catch {
    /* private mode: BACK just goes to the menu */
  }
}

export function takeReturnTo(): string | null {
  try {
    const p = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return p
  } catch {
    return null
  }
}

export function clearReturnTo() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
