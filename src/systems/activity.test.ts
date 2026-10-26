import { describe, expect, it } from 'vitest'
import { buildDays, dayKey, niceScale, rangeStart, shiftKey, type ActivityItem } from './activity'

describe('activity days', () => {
  it('buckets by the Sydney calendar day, not UTC', () => {
    // 23:30 UTC on 25 Oct is 10:30 on 26 Oct in Sydney (daylight time, +11)
    expect(dayKey('2026-10-25T23:30:00Z')).toBe('2026-10-26')
    expect(dayKey('2026-10-25T12:59:00Z')).toBe('2026-10-25')
    expect(dayKey('2026-10-25T13:00:00Z')).toBe('2026-10-26')
  })

  it('steps back calendar days across a daylight-saving change', () => {
    expect(shiftKey('2026-10-05', 1)).toBe('2026-10-04')
    expect(shiftKey('2026-03-01', 1)).toBe('2026-02-28')
    expect(shiftKey('2026-01-01', 1)).toBe('2025-12-31')
  })

  it('has every day in the range, oldest first, quiet days as zeros', () => {
    const now = new Date('2026-10-26T02:00:00Z')
    const items: ActivityItem[] = [
      { at: '2026-10-26T01:00:00Z', source: 'message', pending: true },
      { at: '2026-10-26T01:30:00Z', source: 'avatar', pending: false },
      { at: '2026-10-21T01:00:00Z', source: 'suggestion', pending: false },
      // outside the 7 days, and a broken timestamp: both ignored, never invented
      { at: '2026-10-01T01:00:00Z', source: 'message', pending: false },
      { at: 'not a date', source: 'message', pending: false },
    ]
    const days = buildDays(items, 7, now)
    expect(days.map((d) => d.key)).toEqual(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26'])
    expect(days[6].counts).toEqual({ message: 1, suggestion: 0, avatar: 1 })
    expect(days[6].pending.message).toBe(1)
    expect(days[6].total).toBe(2)
    expect(days[1].counts.suggestion).toBe(1)
    expect(days.reduce((n, d) => n + d.total, 0)).toBe(3)
  })

  it('fetches a little before the range so no early-morning item is missed', () => {
    const now = new Date('2026-10-26T00:00:00Z')
    expect(rangeStart(7, now).toISOString()).toBe('2026-10-18T00:00:00.000Z')
  })

  it('picks round axis maxima and whole-number steps', () => {
    expect(niceScale(0)).toEqual({ max: 1, step: 1 })
    expect(niceScale(3)).toEqual({ max: 3, step: 1 })
    expect(niceScale(7)).toEqual({ max: 8, step: 2 })
    expect(niceScale(23)).toEqual({ max: 30, step: 10 })
    expect(niceScale(140)).toEqual({ max: 150, step: 50 })
  })
})
