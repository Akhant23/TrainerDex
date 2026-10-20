import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../systems/settings'
import { useGameKeys } from '../systems/input'
import { PixelBox } from './PixelBox'

export interface Choice<T> {
  label: string
  value: T
}

interface Props<T> {
  choices: readonly Choice<T>[]
  onChoose: (value: T) => void
  /** B / Escape. */
  onCancel?: () => void
  label: string
  className?: string
}

/** A ▶-cursor menu (YES / NO etc). Arrow keys move, Enter/Space/Z choose, Esc cancels. */
export function ChoiceMenu<T>({ choices, onChoose, onCancel, label, className = '' }: Props<T>) {
  const { sfx } = useSettings()
  const [focus, setFocus] = useState(0)
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  const move = (d: number) => {
    const next = (focus + d + choices.length) % choices.length
    setFocus(next)
    refs.current[next]?.focus()
    sfx('cursor')
  }

  useGameKeys((k, e) => {
    if (k === 'up' || k === 'left') {
      e.preventDefault()
      move(-1)
    } else if (k === 'down' || k === 'right') {
      e.preventDefault()
      move(1)
    } else if (k === 'b' && onCancel) {
      e.preventDefault()
      sfx('back')
      onCancel()
    } else if (k === 'a' && (!(e.target instanceof HTMLButtonElement) || e.key.toLowerCase() === 'z')) {
      e.preventDefault()
      sfx('select')
      onChoose(choices[focus].value)
    }
  })

  return (
    <PixelBox className={`inline-block p-[calc(var(--u)*2)] ${className}`}>
      <div role="menu" aria-label={label} className="flex flex-col">
        {choices.map((c, i) => (
          <button
            key={c.label}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="menuitem"
            type="button"
            tabIndex={i === focus ? 0 : -1}
            onFocus={() => setFocus(i)}
            onMouseEnter={() => {
              if (focus !== i) {
                setFocus(i)
                refs.current[i]?.focus()
              }
            }}
            onClick={() => {
              sfx('select')
              onChoose(c.value)
            }}
            className="font-display cq-text-sm flex cursor-pointer items-center gap-2 border-0 bg-transparent px-[calc(var(--u)*3)] py-[calc(var(--u)*2)] text-left text-ink outline-none focus-visible:bg-[#e8ecf8]"
          >
            <span aria-hidden className={`w-[1.2em] text-dex-red ${i === focus ? 'cursor-arrow' : 'invisible'}`}>
              ▶
            </span>
            {c.label}
          </button>
        ))}
      </div>
    </PixelBox>
  )
}
