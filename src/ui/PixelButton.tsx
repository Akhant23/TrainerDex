import type { ButtonHTMLAttributes } from 'react'
import { useSettings } from '../systems/settings'
import type { Sfx } from '../systems/audio'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost'
  /** Sound played on click (null for none). */
  sound?: Sfx | null
}

export function PixelButton({ variant = 'default', sound = 'select', className = '', onClick, type = 'button', ...rest }: Props) {
  const { sfx } = useSettings()
  const v = variant === 'default' ? '' : `pixel-btn--${variant}`
  return (
    <button
      type={type}
      className={`pixel-btn ${v} ${className}`}
      onClick={(e) => {
        if (sound) sfx(sound)
        onClick?.(e)
      }}
      {...rest}
    />
  )
}
