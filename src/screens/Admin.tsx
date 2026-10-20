import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient, Session } from '@supabase/supabase-js'
import type { MenuEntry } from '../content/menu'
import { adminClient, pagerConfigured } from '../systems/pager'
import type { Avatar } from '../../supabase/functions/_shared/validate'
import { PixelBox } from '../ui/PixelBox'
import { PageTabs } from '../ui/PageTabs'
import { AvatarIcon } from './PokePager'
import { SectionScreen } from './SectionScreen'

/**
 * Hidden moderation dashboard (#/admin). Authentication is Supabase Auth; authorisation is the
 * `admins` table enforced by Row Level Security — this page holds no secrets and grants nothing
 * by itself. A signed-in non-admin sees nothing.
 */
const entry: MenuEntry = { id: 'admin', label: 'PAGER ADMIN', route: '/admin', icon: 'pager', color: ['#2a9a90', '#105048'], blurb: '', phase: 5, planned: [] }

type Status = 'pending' | 'approved' | 'rejected' | 'spam'
const TABS: Status[] = ['pending', 'approved', 'rejected', 'spam']

interface Row {
  id: string
  name: string
  message: string
  avatar: Avatar
  created_at: string
  status: Status
  reviewed_at: string | null
}

export default function Admin() {
  const [db, setDb] = useState<SupabaseClient | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!pagerConfigured) return
    let unsub: (() => void) | undefined
    void adminClient().then((client) => {
      setDb(client)
      void client.auth.getSession().then(({ data }) => setSession(data.session))
      const { data } = client.auth.onAuthStateChange((_e, s) => setSession(s))
      unsub = () => data.subscription.unsubscribe()
    })
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (!db || !session) return setIsAdmin(null)
    void db.rpc('is_admin').then(({ data, error }) => setIsAdmin(!error && data === true))
  }, [db, session])

  return (
    <SectionScreen
      entry={entry}
      title="MODERATION"
      compactTop
      top={
        <div className="absolute inset-0 flex items-center justify-center bg-[#105048] p-[4%]">
          <p className="font-display m-0 text-center text-[clamp(10px,3cqi,16px)] text-paper">
            POKé PAGER
            <br />
            ADMIN
          </p>
        </div>
      }
    >
      <div className="p-[3%]">
        {!pagerConfigured ? (
          <PixelBox className="px-4 py-3">Supabase isn’t configured (see docs/BACKEND.md).</PixelBox>
        ) : !db ? (
          <p className="font-display blink m-0 text-[10px]">CONNECTING…</p>
        ) : !session ? (
          <SignIn db={db} />
        ) : isAdmin === null ? (
          <p className="font-display blink m-0 text-[10px]">CHECKING ACCESS…</p>
        ) : !isAdmin ? (
          <PixelBox className="space-y-3 px-4 py-3">
            <p className="m-0">This account isn’t an admin.</p>
            <button type="button" className="pixel-btn !text-[10px]" onClick={() => void db.auth.signOut()}>
              SIGN OUT
            </button>
          </PixelBox>
        ) : (
          <Dashboard db={db} email={session.user.email ?? ''} />
        )}
      </div>
    </SectionScreen>
  )
}

function SignIn({ db }: { db: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const field = 'w-full border-0 bg-paper px-3 py-2 text-[16px] shadow-[inset_0_0_0_var(--u)_var(--color-frame)] outline-none focus:shadow-[inset_0_0_0_var(--u)_var(--color-gold)]'
  return (
    <form
      className="flex max-w-[420px] flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError('')
        const { error } = await db.auth.signInWithPassword({ email, password })
        setBusy(false)
        if (error) setError('Sign-in failed. Check the email and password.')
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="font-display text-[9px]">EMAIL</span>
        <input className={field} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-display text-[9px]">PASSWORD</span>
        <input className={field} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && (
        <p role="alert" className="m-0 text-[15px] text-ember">
          {error}
        </p>
      )}
      <button type="submit" className="pixel-btn pixel-btn--primary self-start !text-[10px]" disabled={busy}>
        {busy ? 'SIGNING IN…' : 'SIGN IN'}
      </button>
    </form>
  )
}

function Dashboard({ db, email }: { db: SupabaseClient; email: string }) {
  const [tab, setTab] = useState(0)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [counts, setCounts] = useState<Record<Status, number>>({ pending: 0, approved: 0, rejected: 0, spam: 0 })
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const status = TABS[tab]

  const load = useCallback(async () => {
    setError('')
    setRows(null)
    const { data, error } = await db
      .from('messages')
      .select('id,name,message,avatar,created_at,status,reviewed_at')
      .eq('status', status)
      .order('created_at', { ascending: status !== 'pending' ? false : true })
      .limit(200)
    if (error) return setError(error.message)
    setRows(data as Row[])
    const c = await Promise.all(TABS.map((t) => db.from('messages').select('id', { count: 'exact', head: true }).eq('status', t)))
    setCounts(Object.fromEntries(TABS.map((t, i) => [t, c[i].count ?? 0])) as Record<Status, number>)
  }, [db, status])

  useEffect(() => {
    void load()
  }, [load])

  const setStatus = async (id: string, next: Status) => {
    const { error } = await db.from('messages').update({ status: next }).eq('id', id)
    if (error) return setError(error.message)
    void load()
  }
  const remove = async (id: string) => {
    const { error } = await db.from('messages').delete().eq('id', id)
    setConfirmDelete(null)
    if (error) return setError(error.message)
    void load()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
        <span>Signed in as {email}</span>
        <span className="flex gap-1">
          <button type="button" className="pixel-btn !text-[9px]" onClick={() => void load()}>
            ↻ REFRESH
          </button>
          <button type="button" className="pixel-btn !text-[9px]" onClick={() => void db.auth.signOut()}>
            SIGN OUT
          </button>
        </span>
      </div>
      <PageTabs pages={TABS.map((t) => `${t.toUpperCase()} ${counts[t]}`)} current={tab} onChange={setTab} color="#105048" />
      {error && (
        <p role="alert" className="m-0 bg-ember px-3 py-2 text-paper">
          {error}
        </p>
      )}
      {rows === null ? (
        <p className="font-display blink m-0 text-[10px]">LOADING…</p>
      ) : rows.length === 0 ? (
        <p className="m-0">Nothing here.</p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {rows.map((r) => (
            <li key={r.id} className="bg-paper px-3 py-2 shadow-[0_0_0_2px_var(--color-ink)]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dfe6f0]">
                  <AvatarIcon avatar={r.avatar} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-display block text-[10px]">{r.name}</span>
                  <span className="text-[13px] text-muted">{new Date(r.created_at).toLocaleString('en-AU')}</span>
                </span>
              </div>
              <p className="m-0 mt-2 text-[16px] break-words whitespace-pre-wrap">{r.message}</p>
              <div className="mt-2 flex flex-wrap justify-end gap-1">
                {status !== 'approved' && (
                  <button type="button" className="pixel-btn pixel-btn--primary !text-[9px]" onClick={() => void setStatus(r.id, 'approved')}>
                    APPROVE
                  </button>
                )}
                {status !== 'rejected' && (
                  <button type="button" className="pixel-btn !text-[9px]" onClick={() => void setStatus(r.id, 'rejected')}>
                    REJECT
                  </button>
                )}
                {status !== 'spam' && (
                  <button type="button" className="pixel-btn !text-[9px]" onClick={() => void setStatus(r.id, 'spam')}>
                    SPAM
                  </button>
                )}
                {confirmDelete === r.id ? (
                  <>
                    <button type="button" className="pixel-btn !text-[9px] !text-ember" onClick={() => void remove(r.id)}>
                      CONFIRM DELETE
                    </button>
                    <button type="button" className="pixel-btn !text-[9px]" onClick={() => setConfirmDelete(null)}>
                      CANCEL
                    </button>
                  </>
                ) : (
                  <button type="button" className="pixel-btn !text-[9px]" onClick={() => setConfirmDelete(r.id)}>
                    DELETE
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
