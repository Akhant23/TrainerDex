import { useEffect, useRef, useState } from 'react'
import { TEXT_SPEED_MS, useSettings } from '../systems/settings'
import { isNativeActivator, useGameKeys } from '../systems/input'
import { PixelBox } from './PixelBox'

interface Props {
  lines: readonly string[]
  /** Called when the visitor advances past the last line (or, with waitOnLast=false, as soon as it finishes typing). */
  onDone?: () => void
  /** If false, the last line stays on screen without a ▼ and onDone fires once it's typed (use for prompts). */
  waitOnLast?: boolean
  /** Listen to keyboard globally (turn off when another control should own the keys). */
  active?: boolean
  /** Told the index of each line as it comes up (e.g. to change the picture with the story). */
  onLine?: (index: number) => void
  className?: string
}

/**
 * Gen IV-style dialogue box: types text out, ▼ when ready, click / Enter / Space / Z to
 * advance. The first press while typing completes the line instantly.
 */
export function DialogueBox({ lines, onDone, waitOnLast = true, active = true, onLine, className = '' }: Props) {
  const { settings, sfx } = useSettings()
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const firedRef = useRef(false)

  const line = lines[index] ?? ''
  const typing = shown < line.length
  const isLast = index >= lines.length - 1

  // reset when the script changes
  const key = lines.join('\u0000')
  useEffect(() => {
    setIndex(0)
    setShown(0)
    firedRef.current = false
  }, [key])

  // (a caller's inline handler re-runs this each render with the same index: keep it idempotent)
  useEffect(() => {
    onLine?.(index)
  }, [index, onLine])

  // typewriter
  useEffect(() => {
    if (!typing) return
    const ms = TEXT_SPEED_MS[settings.textSpeed]
    const id = window.setTimeout(() => {
      setShown((s) => Math.min(line.length, s + 1))
      if (shown % 2 === 0 && line[shown] !== ' ') sfx('blip')
    }, ms)
    return () => window.clearTimeout(id)
  }, [typing, shown, line, settings.textSpeed, sfx])

  // prompt-style last line: finish without waiting
  useEffect(() => {
    if (!typing && isLast && !waitOnLast && !firedRef.current && line) {
      firedRef.current = true
      doneRef.current?.()
    }
  }, [typing, isLast, waitOnLast, line])

  const advance = () => {
    if (typing) {
      setShown(line.length)
      return
    }
    if (!isLast) {
      sfx('cursor')
      setIndex((i) => i + 1)
      setShown(0)
      return
    }
    if (waitOnLast && !firedRef.current) {
      firedRef.current = true
      sfx('cursor')
      doneRef.current?.()
    }
  }

  useGameKeys((k, e) => {
    if (k !== 'a') return
    if (isNativeActivator(e.target) && e.target !== boxRef.current) return
    e.preventDefault()
    advance()
  }, active)

  const showArrow = !typing && (!isLast || waitOnLast)

  return (
    <PixelBox
      ref={boxRef}
      role="button"
      tabIndex={0}
      aria-label={typing ? 'Skip text' : isLast ? 'Continue' : 'Next line'}
      onClick={advance}
      className={`cursor-pointer select-none px-[calc(var(--u)*5)] py-[calc(var(--u)*4)] ${className}`}
    >
      <p aria-hidden className="cq-text-md text-dropshadow m-0 min-h-[2.7em] whitespace-pre-wrap pr-6 font-semibold">
        {line.slice(0, shown)}
      </p>
      <p className="sr-only" aria-live="polite">
        {line}
      </p>
      {showArrow && (
        <span aria-hidden className="advance-arrow absolute right-[calc(var(--u)*4)] bottom-[calc(var(--u)*3)] text-dex-red">
          ▼
        </span>
      )}
    </PixelBox>
  )
}
