/**
 * The one input path for remote controls. Every menu already listens for keys on window (arrow
 * keys, Z/Enter, X/Escape via `useGameKeys`), so a remote button press is replayed as that same
 * key, from the focused element, and the screen handles it exactly as it would a keyboard press.
 * Only what no screen handles falls back to plain DOM behaviour: A clicks the focused button and
 * the arrows move focus to the nearest control in that direction.
 *
 * It also describes the current screen in a few fields (title, options, selection) for a remote
 * to show, and watches for changes however they happen (mouse, keyboard or remote).
 */
import { currentPath, navigate } from '../app/router'
import { menuEntryForRoute } from '../content/menu'
import type { GameKey } from './input'

export const REMOTE_KEYS: readonly GameKey[] = ['up', 'down', 'left', 'right', 'a', 'b', 'start']
export const isRemoteKey = (v: unknown): v is GameKey => REMOTE_KEYS.includes(v as GameKey)

const KEY: Record<Exclude<GameKey, 'start'>, { key: string; code: string }> = {
  up: { key: 'ArrowUp', code: 'ArrowUp' },
  down: { key: 'ArrowDown', code: 'ArrowDown' },
  left: { key: 'ArrowLeft', code: 'ArrowLeft' },
  right: { key: 'ArrowRight', code: 'ArrowRight' },
  // Z, not Enter: handlers treat Z as "the game's A" even when a button has focus
  a: { key: 'z', code: 'KeyZ' },
  b: { key: 'Escape', code: 'Escape' },
}

/** Routes a remote may never drive. The admin is only ever operated by hand. */
export function remoteAllowed(path = currentPath()): boolean {
  return !(path === '/admin' || path.startsWith('/admin/') || path.startsWith('/controller'))
}

function focusedElement(): HTMLElement {
  const a = document.activeElement
  return a instanceof HTMLElement && a !== document.body && a.isConnected ? a : document.body
}

/**
 * Press (`down`) or release (`up`) a game button as if on the keyboard. Returns false when it was
 * refused (a route remotes can't drive).
 */
export function pressGameKey(k: GameKey, phase: 'down' | 'up', repeat = false): boolean {
  if (!remoteAllowed()) return false
  if (k === 'start') {
    // START: back to the main menu, like the logo link
    if (phase === 'down' && !repeat) navigate('/')
    return true
  }
  const { key, code } = KEY[k]
  const target = focusedElement()
  const ev = new KeyboardEvent(phase === 'down' ? 'keydown' : 'keyup', { key, code, bubbles: true, cancelable: true, repeat })
  target.dispatchEvent(ev)
  if (phase === 'up' || ev.defaultPrevented) return true
  if (k === 'a' && !repeat && isActivator(target)) target.click()
  else if (k === 'up' || k === 'down' || k === 'left' || k === 'right') moveFocus(k, target)
  return true
}

function isActivator(t: HTMLElement): boolean {
  if (t.closest('[aria-disabled="true"]')) return false
  return t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'SUMMARY' || t.getAttribute('role') === 'button' || (t instanceof HTMLInputElement && (t.type === 'checkbox' || t.type === 'radio'))
}

const FOCUSABLE = 'button:not([disabled]), a[href], summary, [role="button"], [role="tab"], input[type="checkbox"], input[type="radio"], [tabindex]:not([tabindex="-1"])'

function visible(el: HTMLElement): boolean {
  if (el.closest('[aria-hidden="true"], [inert]')) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

/** The region a remote is working in: an open dialog if there is one, else the menu screen. */
function scope(): HTMLElement {
  // the pairing panel itself isn't something to drive from the phone
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]:not([data-remote="ignore"])')).filter(visible)
  const focused = focusedElement()
  return dialogs.find((d) => d.contains(focused)) ?? dialogs.at(-1) ?? document.querySelector<HTMLElement>('main') ?? document.body
}

/** Nothing handled the arrow: move focus to the nearest control that way (or the first, if none has focus). */
function moveFocus(dir: 'up' | 'down' | 'left' | 'right', from: HTMLElement) {
  const root = scope()
  const all = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible)
  if (!all.length) return
  if (from === document.body || !root.contains(from)) return all[0].focus()
  const a = from.getBoundingClientRect()
  const ax = a.left + a.width / 2
  const ay = a.top + a.height / 2
  let best: HTMLElement | null = null
  let bestScore = Infinity
  for (const el of all) {
    if (el === from) continue
    const r = el.getBoundingClientRect()
    const dx = r.left + r.width / 2 - ax
    const dy = r.top + r.height / 2 - ay
    const along = dir === 'up' ? -dy : dir === 'down' ? dy : dir === 'left' ? -dx : dx
    const across = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy)
    if (along <= 2) continue
    const score = along + across * 2
    if (score < bestScore) {
      bestScore = score
      best = el
    }
  }
  if (best) {
    best.focus()
    best.scrollIntoView({ block: 'nearest' })
  }
}

/* ---------------- what the screen looks like, for a remote ---------------- */

export interface ScreenOption {
  label: string
}

export interface ScreenState {
  /** Shown as the controller's heading. */
  title: string
  /** The choices on screen right now (the focused group's, or the screen's buttons). */
  options: ScreenOption[]
  /** Index into options of the focused one, or -1. */
  selected: number
  /** True when remotes are refused here (the admin). */
  locked: boolean
}

const GROUP = '[role="dialog"], [role="menu"], [role="tablist"], [role="listbox"], [role="radiogroup"], [role="grid"], [role="group"], nav, ul, ol'
const MAX_OPTIONS = 16

/** The words a sighted visitor sees on a control (screen-reader-only hints and icons left out). */
function visibleText(el: Element): string {
  let out = ''
  for (const n of Array.from(el.childNodes)) {
    if (n.nodeType === Node.TEXT_NODE) out += n.textContent ?? ''
    else if (n instanceof HTMLElement && !n.classList.contains('sr-only') && n.getAttribute('aria-hidden') !== 'true') out += ' ' + visibleText(n)
  }
  return out
}

function labelOf(el: HTMLElement): string {
  const raw = el.getAttribute('aria-label') ?? visibleText(el)
  const one = raw.replace(/\s+/g, ' ').replace(/[▶▼◀]/g, '').trim()
  return one.length > 36 ? one.slice(0, 35) + '…' : one
}

/** The controls a remote can pick from, in order: the focused element's group, else the screen's. */
function optionElements(): HTMLElement[] {
  const focused = focusedElement()
  const root = scope()
  let group: HTMLElement | null = focused !== document.body && root.contains(focused) ? focused.closest<HTMLElement>(GROUP) : null
  if (group && !root.contains(group)) group = null
  const pick = (r: HTMLElement) => Array.from(r.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [role="button"], [role="tab"]')).filter((el) => visible(el) && labelOf(el))
  let items = group ? pick(group) : []
  if (items.length < 2) items = pick(root)
  return items.slice(0, MAX_OPTIONS)
}

function titleFor(path: string): string {
  const dialog = scope()
  if (dialog.getAttribute('role') === 'dialog') {
    const by = dialog.getAttribute('aria-labelledby')
    const named = (by && document.getElementById(by)?.textContent) || dialog.getAttribute('aria-label')
    if (named) return named.replace(/[♪]/g, '').trim().toUpperCase()
  }
  if (path === '/') return 'MAIN MENU'
  if (path === '/medals') return 'MEDAL BOX'
  return menuEntryForRoute(path)?.label ?? 'TRAINERDEX'
}

export function describeScreen(): ScreenState {
  const path = currentPath()
  if (!remoteAllowed(path)) return { title: 'NOT AVAILABLE', options: [], selected: -1, locked: true }
  const items = optionElements()
  // a menu's own cursor (it follows the mouse without taking focus), else the focused control
  const cursor = items.findIndex((el) => el.dataset.selected === 'true' || el.getAttribute('aria-selected') === 'true')
  return { title: titleFor(path), options: items.map((el) => ({ label: labelOf(el) })), selected: cursor >= 0 ? cursor : items.indexOf(focusedElement()), locked: false }
}

/** Choose option `i` from describeScreen(): focus it (so the menu's own cursor moves) then press A. */
export function pickOption(i: number): boolean {
  if (!remoteAllowed()) return false
  const el = optionElements()[i]
  if (!el) return false
  el.focus()
  // let the menu re-render with its new cursor before A reads it
  window.setTimeout(() => pressGameKey('a', 'down'), 40)
  window.setTimeout(() => pressGameKey('a', 'up'), 80)
  return true
}

/**
 * Calls `fn` (at most every `ms`) whenever the screen may have changed: route, focus, clicks,
 * keys or the page's content.
 */
export function watchScreen(fn: () => void, ms = 200): () => void {
  let timer: number | null = null
  const kick = () => {
    if (timer != null) return
    timer = window.setTimeout(() => {
      timer = null
      fn()
    }, ms)
  }
  const events = ['hashchange', 'focusin', 'click', 'keyup', 'pointerup'] as const
  for (const e of events) window.addEventListener(e, kick, true)
  const mo = new MutationObserver(kick)
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected', 'aria-pressed', 'data-selected', 'disabled'] })
  kick()
  return () => {
    for (const e of events) window.removeEventListener(e, kick, true)
    mo.disconnect()
    if (timer != null) window.clearTimeout(timer)
  }
}
