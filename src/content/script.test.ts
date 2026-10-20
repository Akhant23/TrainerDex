import { describe, expect, it } from 'vitest'
import { parseCsv, script } from './script'
import { towerStages } from './aaryan'
import { species } from '../battle/data'

/** Every dialogue key the code asks for, found by scanning the source. */
const sources = import.meta.glob(['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
function usedKeys(): Set<string> {
  const out = new Set<string>()
  for (const src of Object.values(sources)) for (const m of src.matchAll(/(?:lines|line|anyLine)\('([\w.-]+)'|(?:linesKey|textKey): '([\w.-]+)'/g)) out.add(m[1] ?? m[2])
  return out
}

describe('dialogue.csv', () => {
  it('parses quoted fields, commas, quotes and newlines', () => {
    expect(parseCsv('a,b\n"x, y","say ""hi""\nthere"\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"\nthere']])
  })
  it('has every key the game uses', () => {
    const keys = usedKeys()
    expect(keys.size).toBeGreaterThan(15)
    const missing = [...keys].filter((k) => !script.has(k))
    expect(missing).toEqual([])
  })
  it('has intro and defeat lines for every tower floor', () => {
    for (const st of towerStages) {
      expect(script.has(`tower.${st.id}.intro`), st.id).toBe(true)
      expect(script.has(`tower.${st.id}.defeat`), st.id).toBe(true)
    }
  })
  it('gives every creature a cry', () => {
    for (const id of Object.keys(species)) expect(script.has(`cry.${id}`), id).toBe(true)
  })
  it('only uses known placeholders and has no empty lines', () => {
    for (const rows of script.values())
      for (const r of rows) {
        expect(r.text.length, r.key).toBeGreaterThan(0)
        for (const m of r.text.matchAll(/\{(\w+)\}/g)) expect(['name', 'creature', 'place', 'cleared', 'next'], `${r.key}: {${m[1]}}`).toContain(m[1])
      }
  })
})
