import { useEffect, useRef } from 'react'
import { maps, type MapId } from '../../resort/maps'
import { cameraFor, drawWorld, RES, VIEW_W } from '../../resort/render'
import { TILE } from '../../resort/tiles'
import { skyAt } from '../../resort/sky'

/** Where a battle takes place: a map and the tile the camera looks out from. */
export interface Arena {
  map: MapId
  x: number
  y: number
}

/** Quick exhibition matches happen in the tower reception. */
export const RECEPTION_ARENA: Arena = { map: 'reception', x: 7, y: 8 }

/**
 * The real surroundings behind a battle, BW-style: the same 2.5D map the visitor was walking
 * around, seen from the battle spot, slightly darkened so the creatures stand out.
 */
export function Backdrop({ arena }: { arena: Arena }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const draw = () => {
      const aspect = c.clientWidth ? Math.min(1.5, Math.max(0.5, c.clientHeight / c.clientWidth)) : 0.75
      const vh = Math.round(VIEW_W * aspect)
      c.height = vh * RES
      const ctx = c.getContext('2d')
      if (!ctx) return
      const m = maps[arena.map]
      // stand a couple of tiles back from the battle spot so the room fills the frame
      const base = cameraFor(m, arena.x * TILE + 8, arena.y * TILE)
      const cam = { x: base.x, y: arena.y * TILE + 8 }
      drawWorld(ctx, m, cam, [], performance.now(), [], vh, { sky: skyAt() })
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(c)
    return () => ro.disconnect()
  }, [arena.map, arena.x, arena.y])
  return (
    <>
      {/* zoomed in a touch (more indoors) so the surroundings fill the battle screen */}
      <canvas ref={ref} width={VIEW_W * RES} height={192 * RES} aria-hidden className="pixelated absolute inset-0 h-full w-full" style={{ transform: `scale(${maps[arena.map].outdoor ? 1.15 : 1.4})`, transformOrigin: '50% 78%' }} />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgb(16_16_24/0.15),rgb(16_16_24/0)_40%,rgb(16_16_24/0.25))]" />
    </>
  )
}
