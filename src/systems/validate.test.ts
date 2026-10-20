import { describe, expect, it } from 'vitest'
import { clean, containsProfanity, validateSubmission, LIMITS } from '../../supabase/functions/_shared/validate'

const ok = { name: 'Misty', message: 'Loved the battle!', avatar: 'riffin' }

describe('guestbook validation', () => {
  it('accepts a normal message and cleans it', () => {
    const r = validateSubmission({ ...ok, name: '  Misty  ', message: 'Hi​ there   friend' })
    expect(r).toEqual({ ok: true, value: { name: 'Misty', message: 'Hi there friend', avatar: 'riffin' } })
  })
  it('enforces lengths', () => {
    expect(validateSubmission({ ...ok, name: '' }).ok).toBe(false)
    expect(validateSubmission({ ...ok, name: 'x'.repeat(LIMITS.name + 1) }).ok).toBe(false)
    expect(validateSubmission({ ...ok, message: 'x'.repeat(LIMITS.message + 1) }).ok).toBe(false)
    expect(validateSubmission({ ...ok, message: '   ' }).ok).toBe(false)
  })
  it('rejects unknown avatars', () => {
    expect(validateSubmission({ ...ok, avatar: '<script>' }).ok).toBe(false)
  })
  it('flags the honeypot and links as spam', () => {
    expect(validateSubmission({ ...ok, website: 'http://x' })).toMatchObject({ ok: false, spam: true })
    expect(validateSubmission({ ...ok, message: 'cheap pills at www.example.com' })).toMatchObject({ ok: false, spam: true })
    expect(validateSubmission({ ...ok, message: 'see https://evil.test' })).toMatchObject({ ok: false, spam: true })
  })
  it('catches profanity including simple disguises, without false positives', () => {
    expect(containsProfanity('what the fuck')).toBe(true)
    expect(containsProfanity('sh1t')).toBe(true)
    expect(containsProfanity('f.u.c.k.i.n.g')).toBe(true)
    expect(containsProfanity('Scunthorpe classic assessment')).toBe(false)
    expect(containsProfanity('Dickens is my favourite author')).toBe(false)
  })
  it('keeps markup as plain text (React escapes it on render)', () => {
    const r = validateSubmission({ ...ok, message: '<img src=x onerror=alert(1)>' })
    expect(r.ok && r.value.message).toBe('<img src=x onerror=alert(1)>')
  })
  it('clean strips control characters', () => {
    expect(clean('a\u0007b‮c')).toBe('abc')
  })
})
