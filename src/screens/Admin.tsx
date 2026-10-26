import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { SupabaseClient, Session } from '@supabase/supabase-js'
import { adminClient, pagerConfigured } from '../systems/pager'
import type { Avatar } from '../../supabase/functions/_shared/validate'
import { AvatarIcon } from './PokePager'
import { CharacterSprite } from '../ui/CharacterSprite'
import { PixelIcon } from '../ui/PixelIcon'
import { parseAppearance } from '../../supabase/functions/_shared/appearance'
import { AdminActivity } from './AdminActivity'
import { AdminMetrics } from './AdminMetrics'
import { AdminPage, ConfirmBar, FindBox, Notice, RefreshButton, Segmented, ShowMore, SortSelect, StatusBadge, When } from './AdminUi'
import { useSavedChoice } from '../ui/useSavedChoice'
import { AVATAR_SORTS, defaultMessageSort, groupBySender, LIST_CAP, matches, MESSAGE_SORTS, PAGE_SIZE, pageFor, sortAvatars, sortMessages, type AvatarSort, type MessageSort } from '../systems/adminSort'
import { SystemBar } from '../app/SystemBar'
import { Wipe } from '../app/DSShell'
import { navigate } from '../app/router'
import { useSettings } from '../systems/settings'
import { isTypingTarget, useGameKeys } from '../systems/input'
import { takeReturnTo } from '../systems/returnTo'

/**
 * Hidden moderation dashboard (#/admin). Authentication is Supabase Auth; authorisation is the
 * `admins` table enforced by Row Level Security — this page holds no secrets and grants nothing
 * by itself. A signed-in non-admin sees nothing.
 *
 * It isn't a DS section: admin work needs one wide window rather than two half screens, so it has
 * its own frame (the system bar, then a single Gen V window with the section's teal title bar).
 */

type Status = 'pending' | 'approved' | 'rejected' | 'spam'
const STATUSES: Status[] = ['pending', 'approved', 'rejected', 'spam']

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

  const email = session?.user.email ?? ''
  const signOut = db && session ? () => void db.auth.signOut() : undefined

  return (
    <AdminFrame email={isAdmin ? email : undefined} onSignOut={isAdmin ? signOut : undefined}>
      {!pagerConfigured ? (
        <Notice kind="error" title="Supabase isn’t configured">
          The site has no Supabase URL or key, so there’s nothing to moderate. See docs/BACKEND.md.
        </Notice>
      ) : !db ? (
        <Notice kind="loading" title="Connecting" />
      ) : !session ? (
        <SignIn db={db} />
      ) : isAdmin === null ? (
        <Notice kind="loading" title="Checking access" />
      ) : !isAdmin ? (
        <div className="adm-narrow">
          <Notice
            kind="info"
            title="This account isn’t an admin"
            action={
              <button type="button" className="pixel-btn adm-btn" onClick={() => void db.auth.signOut()}>
                SIGN OUT
              </button>
            }
          >
            You’re signed in as {email}, but it isn’t on the admin list, so there’s nothing to show.
          </Notice>
        </div>
      ) : (
        <AdminConsole db={db} />
      )}
    </AdminFrame>
  )
}

/** The admin's window: title bar (back, name, who's signed in) over the page. */
export function AdminFrame({ email, onSignOut, children }: { email?: string; onSignOut?: () => void; children: ReactNode }) {
  const { sfx } = useSettings()
  const back = () => {
    sfx('back')
    navigate(takeReturnTo() ?? '/')
  }
  // B / Esc goes back, as everywhere on the site, but never out of a text field or a confirmation
  useGameKeys((k, e) => {
    if (k !== 'b' || isTypingTarget(e.target) || document.querySelector('.adm-confirm')) return
    e.preventDefault()
    back()
  })
  return (
    <div className="ds-page adm-root">
      <SystemBar />
      <main className="adm-window" aria-label="Pager admin">
        <header className="adm-titlebar gv-titlebar">
          <button type="button" onClick={back} className="pixel-btn adm-btn" aria-label="Back to main menu">
            ◀ BACK
          </button>
          <span className="gv-chip hidden p-1 sm:inline-flex" aria-hidden>
            <PixelIcon name="pager" scale={2} />
          </span>
          <h1 className="gv-label adm-h1">PAGER ADMIN</h1>
          {email && (
            <span className="adm-who">
              <span className="adm-who-email" title={email}>
                {email}
              </span>
              <button type="button" className="pixel-btn adm-btn" onClick={onSignOut}>
                SIGN OUT
              </button>
            </span>
          )}
        </header>
        {children}
        <Wipe />
      </main>
    </div>
  )
}

type View = 'messages' | 'suggestions' | 'trainers' | 'activity' | 'metrics'
const VIEWS: { id: View; label: string }[] = [
  { id: 'messages', label: 'PAGER MESSAGES' },
  { id: 'suggestions', label: 'SUGGESTIONS' },
  { id: 'trainers', label: 'RESORT AVATARS' },
  { id: 'activity', label: 'ACTIVITY' },
  { id: 'metrics', label: 'METRICS' },
]

/** Signed in as an admin: the section tabs and the chosen page. */
export function AdminConsole({ db }: { db: SupabaseClient }) {
  const { sfx } = useSettings()
  const [view, setView] = useState<View>('messages')
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const pick = (v: View) => {
    if (v !== view) sfx('cursor')
    setView(v)
  }
  // a proper tab list: arrows / Home / End move between tabs
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = VIEWS.findIndex((v) => v.id === view)
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    e.stopPropagation()
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? VIEWS.length - 1 : (i + d + VIEWS.length) % VIEWS.length
    pick(VIEWS[n].id)
    refs.current[n]?.focus()
  }
  return (
    <>
      <div className="adm-tabs gv-header" role="tablist" aria-label="Admin sections" onKeyDown={onKey}>
        {VIEWS.map((v, i) => (
          <button
            key={v.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            id={`adm-tab-${v.id}`}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            aria-controls="adm-panel"
            tabIndex={view === v.id ? 0 : -1}
            className={`adm-tab ${view === v.id ? 'adm-tab--on' : ''}`}
            onClick={() => pick(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div id="adm-panel" role="tabpanel" aria-labelledby={`adm-tab-${view}`} className="adm-body">
        {view === 'metrics' ? (
          <AdminMetrics db={db} />
        ) : view === 'activity' ? (
          <AdminActivity db={db} />
        ) : view === 'trainers' ? (
          <Trainers db={db} />
        ) : (
          <Dashboard key={view} db={db} kind={view === 'suggestions' ? 'suggestion' : 'message'} />
        )}
      </div>
    </>
  )
}

function SignIn({ db }: { db: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="adm-body">
      <form
        className="adm-card adm-signin"
        aria-labelledby="adm-signin-title"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError('')
          const { error } = await db.auth.signInWithPassword({ email, password })
          setBusy(false)
          // a wrong email or password stays vague; anything else (email sign-in switched off, an
          // unconfirmed account, rate limiting) says what Supabase said, so it can be fixed
          if (error) setError(error.code === 'invalid_credentials' ? 'Sign-in failed. Check the email and password.' : `Sign-in failed: ${error.message}`)
        }}
      >
        <h2 id="adm-signin-title" className="adm-h2">
          Admin sign-in
        </h2>
        <p className="adm-lede">For moderating the Poké Pager and the Battle Resort. Visitors don’t need an account.</p>
        <label className="adm-field">
          <span className="adm-field-label">EMAIL</span>
          <input className="adm-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="adm-field">
          <span className="adm-field-label">PASSWORD</span>
          <input className="adm-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && (
          <p role="alert" className="adm-error">
            {error}
          </p>
        )}
        <button type="submit" className="pixel-btn pixel-btn--primary adm-btn self-start" disabled={busy}>
          {busy ? 'SIGNING IN…' : 'SIGN IN'}
        </button>
      </form>
    </div>
  )
}

interface TrainerRow {
  id: string
  name: string
  greeting: string
  appearance: unknown
  party: string[]
  hidden: boolean
  created_at: string
  updated_at: string
}

type Page<T> = (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
/** Read a list a page at a time, up to LIST_CAP rows, so sorting and finding see all of it. */
async function readList<T>(page: Page<T>): Promise<{ rows: T[]; capped: boolean }> {
  const rows: T[] = []
  for (let from = 0; from < LIST_CAP; from += 1000) {
    const { data, error } = await page(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) return { rows, capped: false }
  }
  return { rows, capped: true }
}

const isAvatarSort = (v: unknown): v is AvatarSort => AVATAR_SORTS.some((s) => s.value === v)
const isMessageSort = (v: unknown): v is MessageSort | null => v === null || MESSAGE_SORTS.some((s) => s.value === v)

/** Resort avatars go public straight away (names are filtered); hide or delete anything off. */
function Trainers({ db }: { db: SupabaseClient }) {
  const [rows, setRows] = useState<TrainerRow[] | null>(null)
  const [capped, setCapped] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sort, setSort] = useSavedChoice<AvatarSort>('admin-sort-avatars', 'updated', isAvatarSort)
  const [query, setQuery] = useState('')
  const [more, setMore] = useState({ key: '', n: PAGE_SIZE })

  const load = useCallback(async () => {
    setError('')
    setBusy(true)
    try {
      const { rows, capped } = await readList<TrainerRow>((a, b) =>
        db.from('trainers').select('id,name,greeting,appearance,party,hidden,created_at,updated_at').order('updated_at', { ascending: false }).range(a, b),
      )
      setRows(rows)
      setCapped(capped)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t load the avatars.')
    }
    setBusy(false)
  }, [db])

  useEffect(() => {
    void load()
  }, [load])

  const setHidden = async (id: string, hidden: boolean) => {
    const { error } = await db.from('trainers').update({ hidden }).eq('id', id)
    if (error) return setError(error.message)
    void load()
  }
  const remove = async (id: string) => {
    const { error } = await db.from('trainers').delete().eq('id', id)
    setConfirmDelete(null)
    if (error) return setError(error.message)
    void load()
  }

  const found = useMemo(() => (rows ? sortAvatars(rows.filter((r) => matches(query, r.name, r.greeting, r.party.join(' '))), sort) : []), [rows, query, sort])
  const listKey = `${sort}|${query}`
  const shown = pageFor(more, listKey)
  const hiddenCount = rows?.filter((r) => r.hidden).length ?? 0

  return (
    <AdminPage
      title="Resort avatars"
      description="Avatars appear in the Battle Resort as soon as they’re saved. Hide one to take it out of the resort, or delete it for good."
      actions={<RefreshButton busy={busy} onClick={() => void load()} />}
    >
      {error && (
        <Notice
          kind="error"
          title={rows === null ? 'Couldn’t load the avatars' : 'That change didn’t go through'}
          action={
            rows === null && (
              <button type="button" className="pixel-btn adm-btn" onClick={() => void load()}>
                TRY AGAIN
              </button>
            )
          }
        >
          {error}
        </Notice>
      )}
      {rows === null ? (
        !error && <Notice kind="loading" title="Loading avatars" />
      ) : rows.length === 0 ? (
        <Notice kind="empty" icon="battle" title="No avatars yet">
          When a visitor makes an avatar in the Battle Resort, it shows up here.
        </Notice>
      ) : (
        <>
          <div className="adm-toolbar">
            <SortSelect value={sort} options={AVATAR_SORTS} onChange={setSort} />
            <FindBox value={query} onChange={setQuery} placeholder="Name, greeting or party" />
          </div>
          <p className="adm-summary" aria-live="polite">
            {query ? (
              <>
                <strong>{found.length}</strong> of {rows.length} avatars match “{query.trim()}”
              </>
            ) : (
              <>
                <strong>{rows.length}</strong> {rows.length === 1 ? 'avatar' : 'avatars'} · <strong>{hiddenCount}</strong> hidden
              </>
            )}
            {capped && ` · only the ${LIST_CAP.toLocaleString('en-AU')} most recently updated are loaded`}
          </p>
          {found.length === 0 ? (
            <Notice kind="empty" title="No avatars match">
              Nothing has “{query.trim()}” in its name, greeting or party. Clear the search to see them all.
            </Notice>
          ) : (
            <div className="adm-card adm-table-wrap">
              <table className="adm-table">
                <caption className="sr-only">Resort avatars, {AVATAR_SORTS.find((s) => s.value === sort)?.label.toLowerCase()}</caption>
                <thead>
                  <tr>
                    <th scope="col">Avatar</th>
                    <th scope="col" aria-sort={sort === 'name' ? 'ascending' : undefined}>
                      Trainer
                    </th>
                    <th scope="col" aria-sort={sort === 'party' ? 'descending' : undefined}>
                      Party
                    </th>
                    <th scope="col" aria-sort={sort === 'updated' || sort === 'newest' ? 'descending' : sort === 'oldest' ? 'ascending' : undefined}>
                      {sort === 'newest' || sort === 'oldest' ? 'Created' : 'Updated'}
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {found.slice(0, shown).map((r) => {
                    const look = parseAppearance(r.appearance)
                    return (
                      <tr key={r.id} className={r.hidden ? 'adm-row--muted' : ''}>
                        <td className="adm-cell-avatar">{look ? <CharacterSprite appearance={look} pose="portrait" scale={1} still alt={`${r.name}’s avatar`} /> : <span className="adm-time">no look</span>}</td>
                        <td data-label="Trainer">
                          <span className="adm-name">{r.name}</span>
                          <span className="adm-quote">“{r.greeting}”</span>
                        </td>
                        <td data-label="Party" className="adm-party">
                          {r.party.length ? r.party.join(', ') : '—'}
                        </td>
                        <td data-label={sort === 'newest' || sort === 'oldest' ? 'Created' : 'Updated'}>
                          <When iso={sort === 'newest' || sort === 'oldest' ? r.created_at : r.updated_at} />
                        </td>
                        <td data-label="Status">
                          <StatusBadge tone={r.hidden ? 'hidden' : 'visible'} />
                        </td>
                        <td className="adm-cell-actions">
                          {confirmDelete === r.id ? (
                            <ConfirmBar
                              question={`Delete ${r.name}’s avatar?`}
                              detail="It leaves the resort and can’t be brought back. The visitor can make a new one."
                              confirmLabel="DELETE AVATAR"
                              onConfirm={() => void remove(r.id)}
                              onCancel={() => setConfirmDelete(null)}
                            />
                          ) : (
                            <div className="adm-actions">
                              <button type="button" className="pixel-btn adm-btn" onClick={() => void setHidden(r.id, !r.hidden)}>
                                {r.hidden ? 'SHOW IN RESORT' : 'HIDE'}
                              </button>
                              <button type="button" className="pixel-btn adm-btn adm-btn--danger" onClick={() => setConfirmDelete(r.id)}>
                                DELETE…
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <ShowMore shown={Math.min(shown, found.length)} total={found.length} noun="avatars" onMore={() => setMore({ key: listKey, n: shown + PAGE_SIZE })} />
        </>
      )}
    </AdminPage>
  )
}

const STATUS_HELP: Record<'message' | 'suggestion', Record<Status, string>> = {
  message: {
    pending: 'Waiting for a decision. Nothing here is public yet.',
    approved: 'Public on the Poké Pager.',
    rejected: 'Turned down. Not public.',
    spam: 'Marked as spam. Not public.',
  },
  // suggestions are never shown to visitors, whatever their status
  suggestion: {
    pending: 'Not looked at yet. Suggestions are only ever seen here.',
    approved: 'Marked as a good idea. Still private.',
    rejected: 'Not taking these up. Still private.',
    spam: 'Marked as spam. Still private.',
  },
}

function Dashboard({ db, kind }: { db: SupabaseClient; kind: 'message' | 'suggestion' }) {
  const [status, setStatus] = useState<Status>('pending')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [capped, setCapped] = useState(false)
  const [counts, setCounts] = useState<Record<Status, number> | null>(null)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // a chosen order is remembered per list; until then the queue reads oldest first, the rest newest first
  const [picked, setPicked] = useSavedChoice<MessageSort | null>(`admin-sort-${kind}`, null, isMessageSort)
  const sort = picked ?? defaultMessageSort(status)
  const [query, setQuery] = useState('')
  const [more, setMore] = useState({ key: '', n: PAGE_SIZE })
  const noun = kind === 'suggestion' ? 'suggestion' : 'message'

  const load = useCallback(async () => {
    setError('')
    setRows(null)
    setBusy(true)
    try {
      const { rows, capped } = await readList<Row>((a, b) =>
        db
          .from('messages')
          .select('id,name,message,avatar,created_at,status,reviewed_at')
          .eq('status', status)
          .eq('kind', kind)
          .order('created_at', { ascending: status === 'pending' })
          .range(a, b),
      )
      setRows(rows)
      setCapped(capped)
      const c = await Promise.all(STATUSES.map((t) => db.from('messages').select('id', { count: 'exact', head: true }).eq('status', t).eq('kind', kind)))
      setCounts(Object.fromEntries(STATUSES.map((t, i) => [t, c[i].count ?? 0])) as Record<Status, number>)
    } catch (e) {
      setError(e instanceof Error ? e.message : `Couldn’t load the ${noun}s.`)
    }
    setBusy(false)
  }, [db, status, kind, noun])

  useEffect(() => {
    void load()
  }, [load])

  const moveTo = async (id: string, next: Status) => {
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

  const found = useMemo(() => (rows ? rows.filter((r) => matches(query, r.name, r.message)) : []), [rows, query])
  const sorted = useMemo(() => (sort === 'group' ? [] : sortMessages(found, sort)), [found, sort])
  const groups = useMemo(() => (sort === 'group' ? groupBySender(found) : []), [found, sort])
  const listKey = `${status}|${sort}|${query}`
  const shown = pageFor(more, listKey)

  const card = (r: Row) => (
    <li key={r.id} className="adm-card adm-msg">
      <div className="adm-msg-head">
        <span className="adm-avatar" aria-hidden>
          <AvatarIcon avatar={r.avatar} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="adm-name">{r.name}</span>
          <When iso={r.created_at} />
          <span className="adm-time"> · {r.message.trim().length} characters</span>
        </span>
        <StatusBadge tone={r.status} />
      </div>
      <p className="adm-msg-text">{r.message}</p>
      {confirmDelete === r.id ? (
        <ConfirmBar
          question={`Delete this ${noun} from ${r.name}?`}
          detail="It’s removed for good. To just hide it, reject it instead."
          confirmLabel={`DELETE ${noun.toUpperCase()}`}
          onConfirm={() => void remove(r.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : (
        <div className="adm-actions adm-msg-actions">
          {status !== 'approved' && (
            <button type="button" className="pixel-btn adm-btn adm-btn--go" onClick={() => void moveTo(r.id, 'approved')}>
              ✓ APPROVE
            </button>
          )}
          {status !== 'rejected' && (
            <button type="button" className="pixel-btn adm-btn" onClick={() => void moveTo(r.id, 'rejected')}>
              REJECT
            </button>
          )}
          {status !== 'spam' && (
            <button type="button" className="pixel-btn adm-btn" onClick={() => void moveTo(r.id, 'spam')}>
              MARK SPAM
            </button>
          )}
          <button type="button" className="pixel-btn adm-btn adm-btn--danger" onClick={() => setConfirmDelete(r.id)}>
            DELETE…
          </button>
        </div>
      )}
    </li>
  )

  // grouped, "show more" counts senders rather than messages
  const total = sort === 'group' ? groups.length : sorted.length
  return (
    <AdminPage
      title={kind === 'suggestion' ? 'Suggestions' : 'Pager messages'}
      description={
        kind === 'suggestion'
          ? 'Ideas left in the Battle Resort’s suggestion box. They’re only ever seen here.'
          : 'Guestbook messages. Approved ones appear on the Poké Pager; nothing goes public without approval.'
      }
      actions={<RefreshButton busy={busy} onClick={() => void load()} />}
    >
      <div className="adm-toolbar">
        <Segmented label="STATUS" value={status} onChange={setStatus} options={STATUSES.map((s) => ({ value: s, label: s.toUpperCase(), count: counts?.[s] }))} />
        <SortSelect value={sort} options={MESSAGE_SORTS} onChange={setPicked} />
        <FindBox value={query} onChange={setQuery} placeholder="Name or words in the message" />
      </div>
      <p className="adm-hint">{STATUS_HELP[kind][status]}</p>
      {error && (
        <Notice
          kind="error"
          title={rows === null ? `Couldn’t load the ${noun}s` : 'That change didn’t go through'}
          action={
            rows === null && (
              <button type="button" className="pixel-btn adm-btn" onClick={() => void load()}>
                TRY AGAIN
              </button>
            )
          }
        >
          {error}
        </Notice>
      )}
      {rows === null ? (
        !error && <Notice kind="loading" title={`Loading ${noun}s`} />
      ) : rows.length === 0 ? (
        <Notice kind="empty" icon={kind === 'suggestion' ? 'book' : 'pager'} title={`No ${status} ${noun}s`}>
          {status === 'pending' ? `You’re all caught up: new ${noun}s will wait here for a decision.` : `Nothing has been marked ${status} yet.`}
        </Notice>
      ) : found.length === 0 ? (
        <Notice kind="empty" title={`No ${status} ${noun}s match`}>
          Nothing from a sender or with words matching “{query.trim()}”. Clear the search to see them all.
        </Notice>
      ) : (
        <>
          <p className="adm-summary" aria-live="polite">
            {query ? (
              <>
                <strong>{found.length}</strong> of {rows.length} match “{query.trim()}”
              </>
            ) : (
              <>
                <strong>{rows.length}</strong> {status} {rows.length === 1 ? noun : `${noun}s`}
              </>
            )}
            {sort === 'group' && (
              <>
                {' '}
                from <strong>{groups.length}</strong> {groups.length === 1 ? 'sender' : 'senders'}
              </>
            )}
            {capped && ` · only the first ${LIST_CAP.toLocaleString('en-AU')} are loaded`}
          </p>
          {sort === 'group' ? (
            <div className="adm-groups">
              {groups.slice(0, shown).map((g) => (
                <section key={g.key} className="adm-group" aria-label={`${g.name}, ${g.rows.length} ${g.rows.length === 1 ? noun : `${noun}s`}`}>
                  <h3 className="adm-group-head">
                    <span className="adm-group-name">{g.name}</span>
                    <span className="adm-seg-count">{g.rows.length}</span>
                    <span className="adm-time">
                      latest <When iso={g.latest} />
                    </span>
                  </h3>
                  <ul className="adm-list">{g.rows.map(card)}</ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="adm-list">{sorted.slice(0, shown).map(card)}</ul>
          )}
          <ShowMore shown={Math.min(shown, total)} total={total} noun={sort === 'group' ? 'senders' : `${noun}s`} onMore={() => setMore({ key: listKey, n: shown + PAGE_SIZE })} />
        </>
      )}
    </AdminPage>
  )
}
