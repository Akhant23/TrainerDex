import type { ComponentProps } from 'react'

type Variant = 'dialogue' | 'dark' | 'plate' | 'flat'

const variantClass: Record<Variant, string> = {
  dialogue: '',
  dark: 'pixel-box--dark',
  plate: 'pixel-box--plate',
  flat: 'pixel-box--flat',
}

/** The notched-corner pixel frame used for every box in the game. */
export function PixelBox({ variant = 'dialogue', className = '', ...rest }: ComponentProps<'div'> & { variant?: Variant }) {
  return <div className={`pixel-box ${variantClass[variant]} ${className}`} {...rest} />
}
