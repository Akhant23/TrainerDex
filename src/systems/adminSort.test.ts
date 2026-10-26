import { describe, expect, it } from 'vitest'
import { defaultMessageSort, groupBySender, matches, senderKey, sortAvatars, sortDays, sortMessages } from './adminSort'

const msg = (id: string, name: string, message: string, at: string) => ({ id, name, message, created_at: at })
const rows = [
  msg('a', 'Sam', 'hi', '2026-10-20T01:00:00Z'),
  msg('b', 'priya', 'a much longer message than the others', '2026-10-22T01:00:00Z'),
  msg('c', 'sam ', 'second from sam', '2026-10-24T01:00:00Z'),
  msg('d', 'Zoë', 'mid length one', '2026-10-21T01:00:00Z'),
  msg('e', 'Priya', 'same time as b', '2026-10-22T01:00:00Z'),
]
const ids = (r: { id: string }[]) => r.map((x) => x.id).join('')

describe('message sorts', () => {
  it('by date both ways, ties broken the same way every time', () => {
    expect(ids(sortMessages(rows, 'newest'))).toBe('cbeda')
    expect(ids(sortMessages(rows, 'oldest'))).toBe('adebc')
  })

  it('by length, ignoring surrounding spaces', () => {
    expect(ids(sortMessages(rows, 'longest'))[0]).toBe('b')
    expect(ids(sortMessages(rows, 'shortest'))[0]).toBe('a')
  })

  it('by sender, case-insensitively, newest first within a name', () => {
    expect(ids(sortMessages(rows, 'sender'))).toBe('becad')
  })

  it('does not change the input', () => {
    const copy = [...rows]
    sortMessages(rows, 'longest')
    expect(rows).toEqual(copy)
  })

  it('works the pending queue oldest first, the rest newest first', () => {
    expect(defaultMessageSort('pending')).toBe('oldest')
    expect(defaultMessageSort('approved')).toBe('newest')
  })
})

describe('grouping by sender', () => {
  it('gathers the same person however they typed their name, busiest sender first', () => {
    const g = groupBySender(rows)
    expect(g.map((x) => [x.name, x.rows.length])).toEqual([
      ['sam', 2],
      ['priya', 2],
      ['Zoë', 1],
    ])
    // within a group, newest first; the group is named as most recently written
    expect(ids(g[0].rows)).toBe('ca')
    expect(g[0].latest).toBe('2026-10-24T01:00:00Z')
  })

  it('treats case, spacing and accents as the same sender', () => {
    expect(senderKey('  Zoë   Smith ')).toBe(senderKey('zoe smith'))
  })
})

describe('find', () => {
  it('matches any field, ignoring case and accents; an empty query matches all', () => {
    expect(matches('zoe', 'Zoë', 'text')).toBe(true)
    expect(matches('LONGER', 'priya', 'a much longer message')).toBe(true)
    expect(matches('nope', 'priya', 'hi')).toBe(false)
    expect(matches('   ', 'x')).toBe(true)
    expect(matches('x', null, undefined)).toBe(false)
  })
})

describe('avatar sorts', () => {
  const av = (id: string, name: string, party: number, hidden: boolean, created: string, updated: string) => ({ id, name, party: Array(party).fill('byterat'), hidden, created_at: created, updated_at: updated })
  const list = [av('1', 'Misty', 1, false, '2026-10-01', '2026-10-20'), av('2', 'ash', 3, true, '2026-10-05', '2026-10-10'), av('3', 'Brock', 2, false, '2026-09-01', '2026-10-25')]
  it('covers each order', () => {
    expect(ids(sortAvatars(list, 'updated'))).toBe('312')
    expect(ids(sortAvatars(list, 'newest'))).toBe('213')
    expect(ids(sortAvatars(list, 'oldest'))).toBe('312')
    expect(ids(sortAvatars(list, 'name'))).toBe('231')
    expect(ids(sortAvatars(list, 'party'))).toBe('231')
    expect(ids(sortAvatars(list, 'hidden'))).toBe('231')
  })
})

describe('day sorts', () => {
  const days = [
    { key: '2026-10-01', n: 2 },
    { key: '2026-10-03', n: 5 },
    { key: '2026-10-02', n: 5 },
  ]
  it('by date either way, or busiest first with the latest day breaking ties', () => {
    const k = (d: { key: string }[]) => d.map((x) => x.key.slice(-2)).join(',')
    expect(k(sortDays(days, 'newest', (d) => d.n))).toBe('03,02,01')
    expect(k(sortDays(days, 'oldest', (d) => d.n))).toBe('01,02,03')
    expect(k(sortDays(days, 'busiest', (d) => d.n))).toBe('03,02,01')
  })
})
