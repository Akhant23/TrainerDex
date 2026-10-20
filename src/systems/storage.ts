/**
 * Safe, versioned localStorage. Every read/write is wrapped so the site keeps working in
 * private mode, with storage disabled, or when quota is exceeded — it just won't remember.
 */
const PREFIX = 'tdx:v1:'

export function load<T>(key: string, fallback: T, isValid?: (v: unknown) => v is T): T {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key)
    if (raw == null) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (isValid && !isValid(parsed)) return fallback
    if (!isValid && typeof fallback === 'object' && fallback !== null) {
      // shallow-merge so new fields added in later versions get their defaults
      return { ...fallback, ...(parsed as object) } as T
    }
    return parsed as T
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* storage unavailable — ignore */
  }
}

export function clearAll(): void {
  try {
    const ls = globalThis.localStorage
    if (!ls) return
    for (const k of Object.keys(ls)) if (k.startsWith(PREFIX)) ls.removeItem(k)
  } catch {
    /* ignore */
  }
}
