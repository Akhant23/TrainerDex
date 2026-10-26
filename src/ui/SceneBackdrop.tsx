import { useLayoutEffect, useRef, useState } from 'react'
import { SYDNEY_H } from '../sprites/skyline'
import { crispScale } from './CharacterSprite'
import { MenuSky, SkylineBands } from './MenuSky'
import { isLit, useSky } from './useSky'

/**
 * The home screen's living backdrop for any panel that shows a trainer: the Sydney skyline and the
 * resort's roofline panning slowly along the bottom (in shades of `tones`, the panel's stripe
 * colours), and the sky above on the resort's clock. Put it first inside a striped panel; the
 * panel's own content must be positioned (relative) to sit over it.
 */
export function SceneBackdrop({ tones }: { tones: readonly [string, string] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setBox({ w: el.offsetWidth, h: el.offsetHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const sky = useSky()
  const band = box.h ? Math.max(1, crispScale((box.h * 0.2) / SYDNEY_H)) : 0
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <SkylineBands tones={tones} scale={band} width={box.w} ground={0} stage={box.h} lit={isLit(sky)} />
      <MenuSky sky={sky} scale={band} width={box.w} height={box.h} />
    </div>
  )
}
