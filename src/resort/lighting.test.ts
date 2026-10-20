/**
 * Regression test for the Battle Tower lighting bug.
 *
 * Symptom: at night, walking up to the Battle Tower made the screen brighter and the creatures
 * flying overhead vanished, until you walked away again.
 * Cause: standing by the tower pins the camera to the north edge of the map, which puts anyone on
 * the beach rows more than D/T world pixels south of the camera. There the perspective projection
 * goes negative, their ground shadow was drawn with a negative radius, the canvas threw, and the
 * rest of the frame — the sky flyers, the night tint and the lamp glow — was never drawn.
 *
 * These tests run drawWorld against a fake 2D context that throws exactly as a browser does.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { maps } from './maps'
import { skyAt } from './sky'
import type { Appearance } from '../sprites/character'
import { signature } from '../content/aaryan'

type Call = { op: string; args: unknown[]; fillStyle: unknown }

function fakeContext(calls: Call[]) {
  const state: Record<string, unknown> = { fillStyle: '#000', globalCompositeOperation: 'source-over' }
  return new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop]
      return (...args: unknown[]) => {
        calls.push({ op: prop, args, fillStyle: target.fillStyle })
        if (prop === 'ellipse' && ((args[2] as number) < 0 || (args[3] as number) < 0)) throw new Error('IndexSizeError: The major-axis radius provided is negative.')
        if (prop === 'createImageData') return { data: new Uint8ClampedArray((args[0] as number) * (args[1] as number) * 4) }
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return { addColorStop() {} }
        return undefined
      }
    },
    set(target, prop: string, v) {
      target[prop] = v
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

beforeAll(() => {
  // just enough DOM for the renderer's offscreen canvases
  ;(globalThis as { document?: unknown }).document = {
    createElement: () => {
      const calls: Call[] = []
      return { width: 0, height: 0, getContext: () => fakeContext(calls) }
    },
  }
})

const NIGHT = skyAt(new Date(2026, 9, 20, 22, 0))
const NIGHT_TINT = 'rgba(16,24,70,0.42)'

describe('Battle Tower lighting', () => {
  it('keeps the night lighting and the sky layer when a trainer is far behind the camera', async () => {
    const { drawWorld, cameraFor, project } = await import('./render')
    const plaza = maps.plaza
    // right at the Battle Tower door
    const cam = cameraFor(plaza, 18 * 16 + 8, 6 * 16 + 14)
    const beach = { x: 20 * 16 + 8, y: 25 * 16 + 14 }
    expect(project(cam, beach.x, beach.y).s).toBeLessThan(0)
    const look: Appearance = signature
    const calls: Call[] = []
    let skyDrawn = false
    expect(() =>
      drawWorld(fakeContext(calls), plaza, cam, [{ look, facing: 'down', frame: 0, x: beach.x, y: beach.y }], 0, [{ id: 'riffin', facing: 'left', x: beach.x + 16, y: beach.y, hop: 0, breath: 0 }], 192, {
        sky: NIGHT,
        skyLayer: () => {
          skyDrawn = true
        },
      }),
    ).not.toThrow()
    expect(skyDrawn).toBe(true)
    expect(calls.some((c) => c.op === 'fillRect' && c.fillStyle === NIGHT_TINT)).toBe(true)
  })

  it('draws the same night tint wherever you stand on the plaza', async () => {
    const { drawWorld, cameraFor } = await import('./render')
    const plaza = maps.plaza
    const regulars = [
      { x: 20 * 16 + 8, y: 26 * 16 + 14 },
      { x: 6 * 16 + 8, y: 24 * 16 + 14 },
      { x: 30 * 16 + 8, y: 9 * 16 + 14 },
    ].map((p) => ({ look: signature, facing: 'down' as const, frame: 0, ...p }))
    for (const [tx, ty] of [[18, 6], [18, 12], [5, 7], [33, 19], [18, 22]]) {
      const calls: Call[] = []
      drawWorld(fakeContext(calls), plaza, cameraFor(plaza, tx * 16 + 8, ty * 16 + 14), regulars, 0, [], 192, { sky: NIGHT })
      const tints = calls.filter((c) => c.op === 'fillRect' && c.fillStyle === NIGHT_TINT)
      expect(tints, `standing at ${tx},${ty}`).toHaveLength(1)
    }
  })

  it('a sprite that fails to draw cannot strip the night lighting from the frame', async () => {
    const { drawWorld, cameraFor } = await import('./render')
    const calls: Call[] = []
    expect(() =>
      drawWorld(fakeContext(calls), maps.plaza, cameraFor(maps.plaza, 200, 200), [], 0, [], 192, {
        sky: NIGHT,
        items: () => [
          {
            depth: 0,
            draw: () => {
              throw new Error('boom')
            },
          },
        ],
      }),
    ).toThrow('boom')
    expect(calls.some((c) => c.op === 'fillRect' && c.fillStyle === NIGHT_TINT)).toBe(true)
  })
})
