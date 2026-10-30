import { afterEach, describe, expect, it, vi } from 'vitest'
import { claimReload } from './recover'

function memoryStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}

afterEach(() => vi.unstubAllGlobals())

describe('stale-chunk reload', () => {
  it('reloads once, then not again straight after', () => {
    vi.stubGlobal('sessionStorage', memoryStorage())
    expect(claimReload(100_000)).toBe(true)
    expect(claimReload(105_000)).toBe(false)
    expect(claimReload(111_000)).toBe(true)
  })

  it('never reloads when storage is blocked (it could loop)', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
    })
    expect(claimReload()).toBe(false)
  })
})
