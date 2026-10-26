/**
 * Sorting, grouping and finding for the admin's lists, as pure functions (tested in
 * adminSort.test.ts). Everything works on rows already loaded, so the order is the same however
 * the database returned them.
 */

/** How many rows a long list shows at a time. */
export const PAGE_SIZE = 50
/** Most rows read for one list; past this the list says it's cut off. */
export const LIST_CAP = 2000

/**
 * How many rows of a list to show: what "show more" reached, but only while `listKey` (the list's
 * filters and order) is the one it was reached on; any change starts again at one page.
 */
export function pageFor(state: { key: string; n: number }, listKey: string): number {
  return state.key === listKey ? state.n : PAGE_SIZE
}

export interface MessageLike {
  id: string
  name: string
  message: string
  created_at: string
}

export type MessageSort = 'newest' | 'oldest' | 'longest' | 'shortest' | 'sender' | 'group'

export const MESSAGE_SORTS: ReadonlyArray<{ value: MessageSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'longest', label: 'Longest first' },
  { value: 'shortest', label: 'Shortest first' },
  { value: 'sender', label: 'Sender A–Z' },
  { value: 'group', label: 'Grouped by sender' },
]

/** The pending queue is worked oldest first; everything else reads newest first. */
export const defaultMessageSort = (status: string): MessageSort => (status === 'pending' ? 'oldest' : 'newest')

const time = (iso: string) => {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}
const byName = new Intl.Collator('en-AU', { sensitivity: 'base', numeric: true })

/** How a sender is recognised across messages: the name, ignoring case, spacing and accents. */
export function senderKey(name: string): string {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase()
}

/** A sorted copy (newest first breaks every tie, then id, so the order never jumps about). */
export function sortMessages<T extends MessageLike>(rows: readonly T[], sort: MessageSort): T[] {
  const newest = (a: T, b: T) => time(b.created_at) - time(a.created_at) || a.id.localeCompare(b.id)
  const len = (r: T) => r.message.trim().length
  const cmp: Record<MessageSort, (a: T, b: T) => number> = {
    newest,
    oldest: (a, b) => -newest(a, b),
    longest: (a, b) => len(b) - len(a) || newest(a, b),
    shortest: (a, b) => len(a) - len(b) || newest(a, b),
    sender: (a, b) => byName.compare(a.name.trim(), b.name.trim()) || newest(a, b),
    group: newest,
  }
  return [...rows].sort(cmp[sort])
}

export interface Group<T> {
  key: string
  /** The name as most recently written. */
  name: string
  rows: T[]
  latest: string
}

/**
 * Messages gathered by sender: whoever wrote the most first (ties: most recent first), each
 * sender's messages newest first.
 */
export function groupBySender<T extends MessageLike>(rows: readonly T[]): Group<T>[] {
  const groups = new Map<string, Group<T>>()
  for (const r of sortMessages(rows, 'newest')) {
    const key = senderKey(r.name)
    const g = groups.get(key)
    if (g) g.rows.push(r)
    else groups.set(key, { key, name: r.name.trim() || 'No name', rows: [r], latest: r.created_at })
  }
  return [...groups.values()].sort((a, b) => b.rows.length - a.rows.length || time(b.latest) - time(a.latest) || byName.compare(a.name, b.name))
}

/** Case- and accent-insensitive "does any of these fields contain the query". */
export function matches(query: string, ...fields: ReadonlyArray<string | null | undefined>): boolean {
  const q = senderKey(query)
  if (!q) return true
  return fields.some((f) => f != null && senderKey(f).includes(q))
}

export interface AvatarLike {
  id: string
  name: string
  party: readonly string[]
  hidden: boolean
  created_at: string
  updated_at: string
}

export type AvatarSort = 'updated' | 'newest' | 'oldest' | 'name' | 'party' | 'hidden'

export const AVATAR_SORTS: ReadonlyArray<{ value: AvatarSort; label: string }> = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'party', label: 'Biggest party first' },
  { value: 'hidden', label: 'Hidden first' },
]

export function sortAvatars<T extends AvatarLike>(rows: readonly T[], sort: AvatarSort): T[] {
  const updated = (a: T, b: T) => time(b.updated_at) - time(a.updated_at) || a.id.localeCompare(b.id)
  const cmp: Record<AvatarSort, (a: T, b: T) => number> = {
    updated,
    newest: (a, b) => time(b.created_at) - time(a.created_at) || updated(a, b),
    oldest: (a, b) => time(a.created_at) - time(b.created_at) || updated(a, b),
    name: (a, b) => byName.compare(a.name.trim(), b.name.trim()) || updated(a, b),
    party: (a, b) => b.party.length - a.party.length || updated(a, b),
    hidden: (a, b) => Number(b.hidden) - Number(a.hidden) || updated(a, b),
  }
  return [...rows].sort(cmp[sort])
}

export type DaySort = 'newest' | 'oldest' | 'busiest'

export const DAY_SORTS: ReadonlyArray<{ value: DaySort; label: string }> = [
  { value: 'newest', label: 'Latest day first' },
  { value: 'oldest', label: 'Earliest day first' },
  { value: 'busiest', label: 'Busiest first' },
]

/** Days (YYYY-MM-DD keys) with a total: by date either way, or busiest first (latest breaks ties). */
export function sortDays<T extends { key: string }>(days: readonly T[], sort: DaySort, total: (d: T) => number): T[] {
  const latest = (a: T, b: T) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0)
  const cmp: Record<DaySort, (a: T, b: T) => number> = {
    newest: latest,
    oldest: (a, b) => -latest(a, b),
    busiest: (a, b) => total(b) - total(a) || latest(a, b),
  }
  return [...days].sort(cmp[sort])
}
