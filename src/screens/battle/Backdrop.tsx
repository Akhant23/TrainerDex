import { useEffect, useRef } from 'react'
import { arenaMapOf, arenaZoom, type Arena } from '../../resort/arena'
import { cameraFor, drawWorld, RES, VIEW_W } from '../../resort/render'
import { TILE } from '../../resort/tiles'
import { skyAt } from '../../resort/sky'
import { useSettings } from '../../systems/settings'

/**
 * The real surroundings behind a battle, BW-style: the same 2.5D map the visitor was walking
 * around, seen from the battle spot, slightly darkened so the creatures stand out.
 */
export function Backdrop({ arena }: { arena: Arena }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { reducedMotion } = useSettings()
  const { map, x, y } = arena
  useEffect(() => {
    const c = ref.current
    if (!c) return
    let vh = 0
    const fit = () => {
      const aspect = c.clientWidth ? Math.min(1.5, Math.max(0.5, c.clientHeight / c.clientWidth)) : 0.75
      vh = Math.round(VIEW_W * aspect)
      c.height = vh * RES
    }
    const m = arenaMapOf({ map, x, y })
    // stand a couple of tiles back from the battle spot so the room fills the frame
    const base = cameraFor(m, x * TILE + 8, y * TILE)
    const cam = { x: base.x, y: y * TILE + 8 }
    const sky = skyAt()
    const draw = (now: number) => {
      const ctx = c.getContext('2d')
      if (ctx) drawWorld(ctx, m, cam, [], now, [], vh, { sky })
    }
    fit()
    draw(performance.now())
    const ro = new ResizeObserver(() => (fit(), draw(performance.now())))
    ro.observe(c)
    // the surroundings stay alive behind the battle (clouds drift, water and the fountain move): a
    // gentle redraw about twelve times a second, paused while the tab is hidden or with reduced motion
    let raf = 0
    let last = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (document.hidden || now - last < 80) return
      last = now
      draw(now)
    }
    if (!reducedMotion) raf = requestAnimationFrame(loop)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [map, x, y, reducedMotion])
  return (
    <>
      {/* outdoors, zoomed in a touch so the surroundings fill the battle screen; the tower's halls are
          built deep enough that the camera needs no zoom to fill it */}
      <canvas ref={ref} width={VIEW_W * RES} height={192 * RES} aria-hidden className="pixelated absolute inset-0 h-full w-full" style={{ transform: `scale(${arenaZoom(arena)})`, transformOrigin: '50% 78%' }} />
      {/* a light vignette only: BW's battle backgrounds are bright and high-key (the darker moments
          come from the move dimming in Fight.tsx) */}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgb(16_16_24/0.1),rgb(16_16_24/0)_40%,rgb(16_16_24/0.16))]" />
    </>
  )
}
