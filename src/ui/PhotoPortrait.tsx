import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { atResolution, paletteFor, renderPose } from '../sprites/character'
import { hexToRgba, type Palette, type Pixels } from '../sprites/pixels'
import { flipX } from '../sprites/raster'
import { photoScenes, type PhotoScene, type SceneBackdrop, type SceneProp } from '../content/photoScenes'
import { crispScale } from './CharacterSprite'

/** Scene canvas, in pixels at the characters' 2× density (one design pixel = 2×2). */
export const SCENE_W = 240
export const SCENE_H = 150
const INK = '#1c1a24'

type Ctx = CanvasRenderingContext2D

/** Fill in design pixels (2×2 scene pixels), so props and backdrops share the sprites' grid. */
const dp = (ctx: Ctx, x: number, y: number, w: number, h: number, c: string) => {
  ctx.fillStyle = c
  ctx.fillRect(Math.round(x) * 2, Math.round(y) * 2, Math.max(1, Math.round(w)) * 2, Math.max(1, Math.round(h)) * 2)
}
/** A filled ellipse in design pixels, with an optional ink outline. */
function blob(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, c: string, outline = false, shade?: string) {
  const pts: Array<[number, number]> = []
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
      if (d <= 1) dp(ctx, x, y, 1, 1, shade && (y + 0.5 - cy) / ry > 0.35 ? shade : c)
      else if (outline && d <= 1.5 && ((x + 0.5 - cx) / (rx + 1)) ** 2 + ((y + 0.5 - cy) / (ry + 1)) ** 2 <= 1) pts.push([x, y])
    }
  for (const [x, y] of pts) dp(ctx, x, y, 1, 1, INK)
}
/** Vertical stepped gradient bands, like a hand-painted pixel backdrop. */
function bands(ctx: Ctx, colours: string[], y0 = 0, y1 = SCENE_H / 2) {
  const step = (y1 - y0) / colours.length
  colours.forEach((c, i) => dp(ctx, 0, y0 + i * step, SCENE_W / 2, Math.ceil(step), c))
}

/* ---------------- backdrops ---------------- */

const BACKDROPS: Record<SceneBackdrop, (ctx: Ctx) => void> = {
  windows: (ctx) => {
    bands(ctx, ['#eef3f6', '#e2ebf0', '#d6e2ea', '#cbd8e2'])
    for (let x = 6; x < 120; x += 22) {
      dp(ctx, x, 0, 2, 75, '#9aa8b4')
      dp(ctx, x + 3, 6, 16, 50, '#bcd4e6')
      dp(ctx, x + 3, 6, 16, 2, '#e8f4fc')
    }
    dp(ctx, 0, 62, 120, 13, '#a8b0b8')
  },
  hall: (ctx) => {
    bands(ctx, ['#4a2a5e', '#6a3a6e', '#8a5068', '#b07850', '#c89860'])
    for (const x of [4, 30, 88, 112]) {
      dp(ctx, x, 0, 8, 75, '#d8b070')
      dp(ctx, x + 1, 0, 2, 75, '#f0d090')
      dp(ctx, x + 6, 0, 2, 75, '#a07840')
    }
  },
  bags: (ctx) => {
    bands(ctx, ['#d8ccae', '#e6dcc0', '#d2c4a2'])
    for (let i = 0; i < 26; i++) blob(ctx, (i * 37) % 124, 6 + ((i * 23) % 60), 9, 6, i % 3 ? '#efe6cc' : '#e2d6b6', true, '#cdbf9c')
  },
  camp: (ctx) => {
    bands(ctx, ['#2a1a12', '#3a2416', '#4a301c', '#3a2416'])
    for (let x = 0; x < 120; x += 10) dp(ctx, x, 0, 1, 75, '#22140c')
    dp(ctx, 34, 8, 52, 14, '#5a3a22')
  },
  studio: (ctx) => {
    bands(ctx, ['#e8e8ea', '#e0e0e4', '#d8d8de', '#d0d0d8'])
    dp(ctx, 0, 66, 120, 9, '#c4c4cc')
  },
  party: (ctx) => {
    bands(ctx, ['#3a3e48', '#4a505c', '#5a6070', '#6a7080', '#5a6070'])
    dp(ctx, 0, 14, 120, 2, '#7a8090')
  },
  lounge: (ctx) => {
    bands(ctx, ['#e8e2d6', '#ddd6c8', '#d2cabb'])
    dp(ctx, 6, 18, 30, 20, '#2a2c3a')
    dp(ctx, 8, 20, 26, 16, '#c86a5a')
    dp(ctx, 84, 10, 22, 34, '#f4f6f8')
    dp(ctx, 94, 10, 2, 34, '#c8ccd4')
    dp(ctx, 0, 64, 120, 11, '#8a6a4a')
  },
  cinema: (ctx) => {
    bands(ctx, ['#0c0e16', '#121624', '#0e1018'])
    dp(ctx, 10, 8, 100, 40, '#1a3a8a')
    dp(ctx, 12, 10, 96, 36, '#2a5ac0')
    for (let y = 14; y < 44; y += 4) dp(ctx, 16, y, 30 + ((y * 7) % 26), 1, '#9ab8f0')
    dp(ctx, 70, 16, 30, 22, '#3a8a5a')
  },
  cafe: (ctx) => {
    bands(ctx, ['#f2efe4', '#e6e8da', '#dce4d2'])
    dp(ctx, 0, 0, 22, 75, '#2a5a48')
    dp(ctx, 4, 6, 14, 30, '#bfe0e8')
    dp(ctx, 86, 4, 34, 2, '#3a7a4a')
    for (let x = 88; x < 118; x += 4) blob(ctx, x, 8, 2, 2, '#4a9a5a')
  },
  street: (ctx) => {
    bands(ctx, ['#0c1020', '#141a2c', '#1a2234'])
    dp(ctx, 6, 6, 40, 30, '#2a3448')
    dp(ctx, 8, 8, 36, 26, '#e8e4d0')
    dp(ctx, 50, 4, 26, 34, '#3a4458')
    dp(ctx, 52, 6, 22, 30, '#f0e8c8')
    dp(ctx, 96, 0, 24, 75, '#4a2a22')
    for (let y = 2; y < 75; y += 4) dp(ctx, 96 + ((y / 4) % 2) * 3, y, 24, 1, '#3a2018')
  },
  store: (ctx) => {
    bands(ctx, ['#0a0c14', '#10141e', '#161a26'])
    for (let x = 4; x < 90; x += 8) dp(ctx, x, 2, 6, 14, ['#c8a040', '#6ab0d0', '#d06a8a'][(x / 8) % 3 | 0])
    dp(ctx, 100, 0, 14, 75, '#d02838')
    dp(ctx, 102, 4, 10, 60, '#f04050')
  },
  forest: (ctx) => {
    bands(ctx, ['#0e1a10', '#16261a', '#1e3422', '#162a1a'])
    ctx.globalAlpha = 0.28
    for (let i = 0; i < 4; i++) for (let y = 0; y < 75; y++) dp(ctx, 70 + i * 9 - y * 0.5, y, 3, 1, '#f8f0b0')
    ctx.globalAlpha = 1
    for (let y = 0; y < 75; y += 2) dp(ctx, 26 + (y % 4 === 0 ? 1 : 0), y, 2, 2, '#c8e0f0')
    for (const [x, y] of [[8, 10], [104, 6], [112, 30], [4, 40]]) blob(ctx, x, y, 8, 6, '#2a5a2a', false, '#1e4420')
  },
  concert: (ctx) => {
    bands(ctx, ['#060610', '#0c0a1c', '#140c26'])
    ctx.globalAlpha = 0.35
    for (const [x, c] of [[20, '#c040e0'], [60, '#4080f0'], [100, '#e04080']] as const) for (let y = 0; y < 75; y++) dp(ctx, x - 2 + (y - 30) * 0.18, y, 4 + y * 0.12, 1, c)
    ctx.globalAlpha = 1
    for (let x = 2; x < 120; x += 6) blob(ctx, x, 70, 4, 6, '#1c1626')
  },
  shelter: (ctx) => {
    bands(ctx, ['#7ab8e8', '#9acaf0', '#bcdcf4'])
    dp(ctx, 0, 0, 120, 12, '#8a8a7a')
    for (let x = 0; x < 120; x += 4) dp(ctx, x, 0, 2, 12, '#a6a694')
    dp(ctx, 0, 12, 120, 2, '#5a5a4e')
    for (const [x, y] of [[10, 52], [104, 50], [116, 58]]) blob(ctx, x, y, 10, 9, '#4a8a3a', false, '#3a7030')
  },
}

/* ---------------- props ---------------- */

const PROPS: Record<SceneProp, (ctx: Ctx, x: number, y: number, flip: boolean) => void> = {
  sign: (ctx, x, y) => {
    dp(ctx, x - 16, y - 24, 32, 26, INK)
    dp(ctx, x - 15, y - 23, 30, 24, '#f8f4ea')
    for (const [dx, dy, w] of [[-11, -19, 18], [-8, -15, 16], [-10, -11, 12], [-6, -6, 12]]) dp(ctx, x + dx, y + dy, w, 1, '#3a3040')
    dp(ctx, x - 4, y - 2, 8, 1, '#8a8090')
  },
  bagPile: (ctx, x, y) => {
    for (let i = 0; i < 14; i++) blob(ctx, x - 56 + ((i * 29) % 112), y - 4 + ((i * 11) % 14), 11, 7, i % 2 ? '#efe6cc' : '#e4d8b8', true, '#cdbf9c')
    for (const dx of [-30, 6, 34]) blob(ctx, x + dx, y + 2, 2.4, 2.4, '#3a3a3a')
  },
  palm: (ctx, x, y, flip) => {
    const f = flip ? -1 : 1
    for (let i = 0; i < 8; i++) dp(ctx, x - 2 + f * i * 0.3, y - i * 4, 4, 4, i % 2 ? '#c89a50' : '#a07830')
    for (const [dx, dy] of [[-10, -36], [8, -38], [-14, -30], [12, -30], [0, -40]]) blob(ctx, x + f * dx, y + dy, 9, 4, '#3aa050', true, '#228038')
  },
  discoBall: (ctx, x, y) => {
    dp(ctx, x, 0, 1, y - 8, '#8890a0')
    blob(ctx, x, y, 9, 9, '#c8d0dc', true, '#9aa2b2')
    for (let d = -6; d <= 6; d += 3) {
      dp(ctx, x - 8, y + d, 16, 1, '#8890a0')
      dp(ctx, x + d, y - 8, 1, 16, '#8890a0')
    }
    dp(ctx, x - 4, y - 5, 2, 2, '#ffffff')
  },
  partyLights: (ctx, x, y) => {
    for (let i = 0; i < 9; i++) blob(ctx, (x - 56 + ((i * 41) % 112)) / 1, y - 24 + ((i * 17) % 34), 2.6, 1.6, i % 3 ? '#5af06a' : '#f0e05a')
  },
  stringLights: (ctx, x, y) => {
    for (let i = -58; i <= 58; i += 2) dp(ctx, x + i, y + Math.round(6 - (i * i) / 600), 1, 1, '#3a2a1a')
    for (let i = -54; i <= 54; i += 9) blob(ctx, x + i, y + 7 - (i * i) / 600, 1.6, 1.6, ['#f8d040', '#f86a6a', '#6ad0f8', '#8af06a'][Math.abs(i / 9) % 4 | 0])
  },
  sword: (ctx, x, y) => {
    // a chunky pixel diamond sword pointing up and away, handle at the bottom left
    const n = 18
    for (let i = 0; i < n; i++) dp(ctx, x - 7 + i, y + 7 - i, 5, 5, INK)
    for (let i = 0; i < n; i++) dp(ctx, x - 6 + i, y + 8 - i, 3, 3, i % 4 === 1 ? '#2ab0b0' : '#5af0e0')
    for (let i = 2; i < n - 1; i += 3) dp(ctx, x - 5 + i, y + 8 - i, 1, 1, '#e0fffa')
    // guard and grip
    dp(ctx, x - 11, y + 6, 9, 3, INK)
    dp(ctx, x - 10, y + 7, 7, 1, '#1a8a8a')
    for (let i = 0; i < 4; i++) {
      dp(ctx, x - 11 - i, y + 9 + i, 3, 3, INK)
      dp(ctx, x - 10 - i, y + 10 + i, 1, 1, '#8a5a2a')
    }
  },
  pancakes: (ctx, x, y) => {
    blob(ctx, x, y + 6, 22, 7, '#f8f8f4', true, '#d8dce0')
    blob(ctx, x, y + 6, 18, 5, '#eef0ea')
    for (let i = 0; i < 3; i++) blob(ctx, x, y + 2 - i * 5, 11, 4, '#f4dcaa', true, '#d8b47a')
    blob(ctx, x - 3, y - 13, 4, 3, '#f8b040', true)
    blob(ctx, x + 4, y - 13, 4, 3, '#f0d060', true)
    dp(ctx, x, y - 18, 2, 3, '#4aa050')
  },
  gummy: (ctx, x, y) => {
    dp(ctx, x - 7, y - 18, 14, 20, INK)
    dp(ctx, x - 6, y - 17, 12, 18, '#f8d830')
    blob(ctx, x, y - 8, 3.6, 5, '#e03848', true)
    blob(ctx, x - 2, y - 13, 1.4, 1.4, '#e03848')
    blob(ctx, x + 2, y - 13, 1.4, 1.4, '#e03848')
  },
  phone: (ctx, x, y) => {
    dp(ctx, x - 4, y - 7, 8, 13, INK)
    dp(ctx, x - 3, y - 6, 6, 11, '#3a4058')
    dp(ctx, x - 2, y - 5, 4, 2, '#8ab0e0')
  },
  freezer: (ctx, x, y) => {
    dp(ctx, x - 58, y - 14, 116, 30, INK)
    dp(ctx, x - 57, y - 13, 114, 28, '#2a6ad0')
    for (let i = -50; i < 50; i += 2) dp(ctx, x + i, y - 2 + Math.round(Math.sin(i / 8) * 3), 2, 2, '#e8f4ff')
    dp(ctx, x - 50, y - 10, 18, 4, '#d02838')
  },
  arch: (ctx, x, y) => {
    for (let a = 0; a <= Math.PI; a += 0.09) blob(ctx, x - Math.cos(a) * 56, y + 34 - Math.sin(a) * 30, 2.4, 2.4, a * 10 % 2 < 1 ? '#f8a8c8' : '#f8f0f4')
  },
}

/* ---------------- drawing ---------------- */

const charCanvas = new Map<string, HTMLCanvasElement>()
function pixelsCanvas(key: string, px: Pixels, pal: Palette): HTMLCanvasElement {
  let c = charCanvas.get(key)
  if (c) return c
  c = document.createElement('canvas')
  c.width = px[0].length
  c.height = px.length
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(c.width, c.height)
  px.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.') img.data.set(hexToRgba(pal[ch]), (y * c!.width + x) * 4)
    }),
  )
  ctx.putImageData(img, 0, 0)
  charCanvas.set(key, c)
  return c
}

export function drawScene(ctx: Ctx, scene: PhotoScene) {
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, SCENE_W, SCENE_H)
  BACKDROPS[scene.backdrop](ctx)
  for (const p of scene.props ?? []) if (!p.front) PROPS[p.id](ctx, p.x / 2, p.y / 2, !!p.flip)
  for (const m of [...scene.cast].sort((a, b) => (a.z ?? 0) - (b.z ?? 0))) {
    const key = JSON.stringify([m.look, m.pose ?? {}, !!m.flip])
    let c = charCanvas.get(key)
    if (!c) {
      const px = atResolution(2, () => renderPose(m.look, m.pose ?? {}))
      c = pixelsCanvas(key, m.flip ? flipX(px) : px, paletteFor(m.look))
    }
    ctx.drawImage(c, Math.round(m.x - c.width / 2), Math.round(m.y ?? 8))
  }
  for (const p of scene.props ?? []) if (p.front) PROPS[p.id](ctx, p.x / 2, p.y / 2, !!p.flip)
  // a fine ink frame inside the canvas edge
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, SCENE_W, 2)
  ctx.fillRect(0, SCENE_H - 2, SCENE_W, 2)
  ctx.fillRect(0, 0, 2, SCENE_H)
  ctx.fillRect(SCENE_W - 2, 0, 2, SCENE_H)
}

/**
 * The pixel-art version of a photo, drawn from its scene in photoScenes.ts at a crisp scale that
 * fits the panel. Photos without a scene get a quiet "not drawn yet" plate — never another photo's.
 */
export function PhotoPortrait({ photoId, className = '' }: { photoId: string; className?: string }) {
  const scene = photoScenes[photoId]
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => setScale(crispScale(Math.min(el.clientWidth / SCENE_W, 1.5)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (ctx && scene) drawScene(ctx, scene)
  }, [scene])

  return (
    <div ref={wrap} className={className}>
      {scene ? (
        <canvas ref={canvas} width={SCENE_W} height={SCENE_H} role="img" aria-label={scene.alt} className="pixelated gv-card block rounded-[3px]" style={{ width: SCENE_W * scale, height: SCENE_H * scale }} />
      ) : (
        <p className="font-display m-0 rounded-[3px] bg-[#e6eaf2] px-3 py-2 text-center text-[13px] text-muted">Pixel portrait not drawn yet</p>
      )}
    </div>
  )
}
