import { afterEach, describe, expect, it } from 'vitest'
import { formatPlaytime, sanitiseName } from './format'
import { load, save, clearAll } from './storage'

describe('formatPlaytime', () => {
  it('formats hours and zero-padded minutes', () => {
    expect(formatPlaytime(0)).toEqual({ hours: '0', minutes: '00' })
    expect(formatPlaytime(59)).toEqual({ hours: '0', minutes: '00' })
    expect(formatPlaytime(61)).toEqual({ hours: '0', minutes: '01' })
    expect(formatPlaytime(3600 * 12 + 60 * 7)).toEqual({ hours: '12', minutes: '07' })
  })
  it('clamps negatives', () => {
    expect(formatPlaytime(-5)).toEqual({ hours: '0', minutes: '00' })
  })
})

describe('sanitiseName', () => {
  it('strips markup and trims to 12 chars', () => {
    expect(sanitiseName('<b>Ash</b>')).toBe('bAshb')
    expect(sanitiseName('   Red    Blue  ')).toBe('Red Blue')
    expect(sanitiseName('ABCDEFGHIJKLMNOP')).toBe('ABCDEFGHIJKL')
  })
  it('keeps accented letters', () => {
    expect(sanitiseName('Zoë')).toBe('Zoë')
  })
})

describe('storage', () => {
  const mem = new Map<string, string>()
  const fake = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  }
  Object.defineProperty(globalThis, 'localStorage', { value: new Proxy(fake, { ownKeys: () => [...mem.keys()], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) }), configurable: true })
  afterEach(() => mem.clear())

  it('round-trips values', () => {
    save('x', { a: 1 })
    expect(load('x', { a: 0 })).toEqual({ a: 1 })
  })
  it('merges new default fields into old saved objects', () => {
    save('s', { a: 1 })
    expect(load('s', { a: 0, b: 2 })).toEqual({ a: 1, b: 2 })
  })
  it('falls back on corrupt JSON', () => {
    mem.set('tdx:v1:bad', '{nope')
    expect(load('bad', 5)).toBe(5)
  })
  it('clearAll only removes our keys', () => {
    save('a', 1)
    mem.set('other', 'keep')
    clearAll()
    expect([...mem.keys()]).toEqual(['other'])
  })
})
