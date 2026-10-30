import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('visit stats', () => {
  it('start without throwing when the browser blocks storage', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    const blocked = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    }
    const storage = { getItem: blocked, setItem: blocked, removeItem: blocked }
    vi.stubGlobal('sessionStorage', storage)
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('location', { hostname: 'akhan.dev', search: '', pathname: '/', hash: '#/' })
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('document', { visibilityState: 'visible', referrer: '', addEventListener: () => {} })
    vi.stubGlobal('window', { setInterval: () => 0, addEventListener: () => {} })
    const fetch = vi.fn(() => Promise.resolve(new Response()))
    vi.stubGlobal('fetch', fetch)

    const { startVisitStats } = await import('./analytics')
    expect(() => startVisitStats('/', () => {})).not.toThrow()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
  })
})
