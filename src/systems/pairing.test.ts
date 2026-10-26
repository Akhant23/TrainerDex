import { describe, expect, it } from 'vitest'
import { hmacSha256, safeEqual, sha256, toHex, utf8 } from './sha256'
import { CODE_ALPHABET, CODE_LENGTH, controllerUrl, deriveKeys, formatCode, newCode, newId, normaliseCode, parseHostMessage, parsePadMessage, sign, Throttle, verify } from './pairing'

describe('sha256 / hmac', () => {
  it('matches the FIPS test vectors', () => {
    expect(toHex(sha256(utf8('')))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(toHex(sha256(utf8('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(toHex(sha256(utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1')
  })

  it('is right across block boundaries (expected values from node:crypto)', () => {
    const expected: Record<number, string> = {
      1: '2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881',
      55: 'd5e285683cd4efc02d021a5c62014694958901005d6f71e89e0989fac77e4072',
      56: '04c26261370ee7541549d16dee320c723e3fd14671e66a099afe0a377c16888e',
      63: '75220b47218278e656f2013bb8f0c455a25eaf01e86c64924e9d48d89776d6f2',
      64: '7ce100971f64e7001e8fe5a51973ecdfe1ced42befe7ee8d5fd6219506b5393c',
      65: '9537c5fdf120482f7d58d25e9ed583f52c02b4e304ea814db1633ad565aed7e9',
      119: '000b48d4edf0fa7bee3c6236ecd2785baa5db4eeb8bb54341b029e0d9fa5fb0c',
      120: '13f05a0b594787f5ecd315edc96141bd3243203d1b7d4f0836f37308b276ba98',
      1000: '44f8354494a5ba03ba1792a8d3e9c534c47a9181980fde7a3f44b06ef2ae7c7f',
    }
    for (const [n, hex] of Object.entries(expected)) expect(toHex(sha256(utf8('x'.repeat(Number(n)))))).toBe(hex)
  })

  it('HMAC matches RFC 4231, including keys longer than a block', () => {
    const key = new Uint8Array(20).fill(0x0b)
    expect(toHex(hmacSha256(key, utf8('Hi There')))).toBe('b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7')
    expect(toHex(hmacSha256(utf8('Jefe'), utf8('what do ya want for nothing?')))).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843')
    const long = 'k'.repeat(131)
    expect(toHex(hmacSha256(utf8(long), utf8('message')))).toBe('bf7c7ea93af6117b4f6f7dd0b8aac62097cd835b9df2ca81010858ebe0d2cabd')
  })

  it('compares in full', () => {
    expect(safeEqual('abcd', 'abcd')).toBe(true)
    expect(safeEqual('abcd', 'abce')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('pairing codes', () => {
  it('are 8 unambiguous symbols, typed back in any case or spacing', () => {
    for (let i = 0; i < 200; i++) {
      const c = newCode()
      expect(c).toHaveLength(CODE_LENGTH)
      for (const ch of c) expect(CODE_ALPHABET).toContain(ch)
    }
    expect(CODE_ALPHABET).not.toMatch(/[01ILO]/)
    expect(normaliseCode('abcd-efgh')).toBe('ABCDEFGH')
    expect(normaliseCode(' 2345 6789 ')).toBe('23456789')
    expect(normaliseCode('ABCDEFG')).toBeNull()
    expect(normaliseCode('ABCDEFG0')).toBeNull()
    expect(formatCode('ABCDEFGH')).toBe('ABCD-EFGH')
  })

  it('draws every symbol about equally often (no modulo bias)', () => {
    const counts = new Map<string, number>()
    for (let i = 0; i < 4000; i++) for (const ch of newCode()) counts.set(ch, (counts.get(ch) ?? 0) + 1)
    const expected = (4000 * CODE_LENGTH) / CODE_ALPHABET.length
    expect(counts.size).toBe(CODE_ALPHABET.length)
    for (const n of counts.values()) expect(Math.abs(n - expected) / expected).toBeLessThan(0.15)
  })

  it('give a channel name and a key that are unrelated and never contain the code', () => {
    const k = deriveKeys('ABCD2345')
    expect(k.topic).toMatch(/^tdx-pad-[0-9a-f]{32}$/)
    expect(k.topic).not.toContain('ABCD2345')
    expect(toHex(k.key)).not.toContain(k.topic.slice(8))
    expect(deriveKeys('ABCD2346').topic).not.toBe(k.topic)
  })

  it('builds the controller link on the current origin', () => {
    expect(controllerUrl('ABCD2345', { origin: 'http://192.168.0.5:5173', pathname: '/' })).toBe('http://192.168.0.5:5173/#/controller?c=ABCD2345')
    expect(controllerUrl('ABCD2345', { origin: 'https://akhan.dev', pathname: '/' })).toBe('https://akhan.dev/#/controller?c=ABCD2345')
  })

  it('makes ids in the shape the parser accepts', () => {
    expect(newId()).toMatch(/^[a-z2-7]{16}$/)
  })
})

describe('signed messages', () => {
  const { key } = deriveKeys('ABCD2345')
  const other = deriveKeys('ABCD2346').key
  const cid = 'aaaaaaaaaaaaaaaa'
  const sid = 'bbbbbbbbbbbbbbbb'
  const press = { t: 'key' as const, cid, sid, seq: 3, k: 'a' as const, p: 'down' as const, r: false }

  it('accepts a phone message signed with the pairing key', () => {
    expect(parsePadMessage(key, sign(key, 'pad', press))).toEqual(press)
    expect(parsePadMessage(key, sign(key, 'pad', { t: 'hello', cid, n: sid }))).toEqual({ t: 'hello', cid, n: sid })
  })

  it('rejects a wrong key, a tampered field, a missing signature and the other direction', () => {
    expect(parsePadMessage(key, sign(other, 'pad', press))).toBeNull()
    expect(parsePadMessage(key, { ...sign(key, 'pad', press), k: 'b' })).toBeNull()
    expect(parsePadMessage(key, { ...sign(key, 'pad', press), seq: 4 })).toBeNull()
    expect(parsePadMessage(key, { ...press })).toBeNull()
    expect(parsePadMessage(key, { ...press, mac: '0'.repeat(64) })).toBeNull()
    // a desktop message can't be bounced back as a phone message
    expect(parsePadMessage(key, sign(key, 'host', press as never))).toBeNull()
  })

  it('rejects anything outside the command set even when signed', () => {
    const bad: Record<string, unknown>[] = [
      { t: 'admin', cid, sid, seq: 1 },
      { ...press, k: 'delete' },
      { ...press, p: 'hold' },
      { ...press, seq: 0 },
      { ...press, seq: 1.5 },
      { ...press, cid: 'short' },
      { ...press, extra: true },
      { t: 'pick', cid, sid, seq: 1, i: 99 },
      { t: 'pick', cid, sid, seq: 1, i: -1 },
    ]
    for (const m of bad) expect(parsePadMessage(key, { ...m, mac: toHex(hmacSha256(key, utf8('pad|' + JSON.stringify(Object.keys(m).sort().map((k) => [k, m[k]]))))) })).toBeNull()
    expect(parsePadMessage(key, null)).toBeNull()
    expect(parsePadMessage(key, [])).toBeNull()
    expect(parsePadMessage(key, 'key')).toBeNull()
  })

  it('lets the phone check what the desktop sends', () => {
    const state = { t: 'state' as const, cid, sid, v: 2, s: { title: 'MAIN MENU', options: [{ label: 'PROFILE' }], selected: 0, locked: false } }
    expect(parseHostMessage(key, sign(key, 'host', state))).toEqual(state)
    expect(parseHostMessage(key, sign(other, 'host', state))).toBeNull()
    expect(parseHostMessage(key, sign(key, 'host', { ...state, s: { ...state.s, title: 'x'.repeat(200) } }))).toBeNull()
    expect(verify(key, 'host', sign(key, 'host', { t: 'end', cid, sid, why: 'cancelled' }))).toBe(true)
  })
})

describe('Throttle', () => {
  it('allows a burst, then the steady rate', () => {
    let t = 0
    const th = new Throttle(10, 3, () => t)
    expect([th.take(), th.take(), th.take(), th.take()]).toEqual([true, true, true, false])
    t += 100
    expect(th.take()).toBe(true)
    expect(th.take()).toBe(false)
    // a long pause refills only up to the burst size
    t += 5000
    expect(Array.from({ length: 4 }, () => th.take())).toEqual([true, true, true, false])
  })
})
