/**
 * Every line of dialogue lives in dialogue.csv (key, speaker, where, text), so it can be edited
 * in Excel / Google Sheets and dropped back in. Rows sharing a key are said in order.
 * Placeholders in {braces} are filled in by the game: {name}, {creature}, {place}, {cleared}, {next}.
 */
import raw from './dialogue.csv?raw'

/** Minimal RFC 4180 CSV parser (quoted fields, doubled quotes, commas and newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f.trim() !== '')) rows.push(row)
  return rows
}

export interface ScriptLine {
  key: string
  speaker: string
  where: string
  text: string
}

export function parseScript(text: string): Map<string, ScriptLine[]> {
  const [header, ...body] = parseCsv(text)
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name)
  const [k, sp, wh, tx] = ['key', 'speaker', 'where', 'text'].map(col)
  const map = new Map<string, ScriptLine[]>()
  for (const r of body) {
    const key = (r[k] ?? '').trim()
    if (!key) continue
    const entry = { key, speaker: (r[sp] ?? '').trim(), where: (r[wh] ?? '').trim(), text: (r[tx] ?? '').trim() }
    map.set(key, [...(map.get(key) ?? []), entry])
  }
  return map
}

export const script = parseScript(raw)

type Vars = Record<string, string | number>
const fillVars = (t: string, vars: Vars) => t.replace(/\{(\w+)\}/g, (m, v: string) => (v in vars ? String(vars[v]) : m))

/** All lines for a key, placeholders filled. */
export function lines(key: string, vars: Vars = {}): string[] {
  const hit = script.get(key)
  if (!hit?.length) return [`[missing dialogue: ${key}]`]
  return hit.map((l) => fillVars(l.text, vars))
}

/** The first line for a key. */
export const line = (key: string, vars: Vars = {}) => lines(key, vars)[0]

/** A random line for a key. */
export const anyLine = (key: string, vars: Vars = {}) => {
  const all = lines(key, vars)
  return all[Math.floor(Math.random() * all.length)]
}
