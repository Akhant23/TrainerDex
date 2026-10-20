import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      loading = null
      reject(new Error('Turnstile failed to load'))
    }
    document.head.appendChild(s)
  })
  return loading
}

/** Cloudflare Turnstile anti-bot check. Calls onToken with a token (or '' when it expires). */
export function Turnstile({ siteKey, onToken, resetKey }: { siteKey: string; onToken: (t: string) => void; resetKey: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const idRef = useRef<string | undefined>(undefined)
  const cb = useRef(onToken)
  cb.current = onToken
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return
        idRef.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: 'light',
          callback: (t: string) => cb.current(t),
          'expired-callback': () => cb.current(''),
          'error-callback': () => cb.current(''),
        })
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      if (idRef.current) window.turnstile?.remove(idRef.current)
      idRef.current = undefined
    }
  }, [siteKey])

  // reset after each send so a token is never reused
  useEffect(() => {
    if (resetKey && idRef.current) window.turnstile?.reset(idRef.current)
  }, [resetKey])

  if (failed) return <p className="m-0 text-[14px] text-ember">The human check couldn’t load. Check your connection or disable blockers for this page.</p>
  return <div ref={ref} className="min-h-[65px]" />
}
