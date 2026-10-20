import { useSettings } from '../systems/settings'
import { useGameKeys } from '../systems/input'

/**
 * Summary-screen style pages: ◀ PAGE NAME ▶ with dots. Left/right arrows switch pages
 * (unless `keys` is false, e.g. when another control owns them).
 */
export function PageTabs({ pages, current, onChange, keys = true, color = 'var(--color-ink)' }: { pages: readonly string[]; current: number; onChange: (i: number) => void; keys?: boolean; color?: string }) {
  const { sfx } = useSettings()
  const go = (d: number) => {
    const n = (current + d + pages.length) % pages.length
    sfx('cursor')
    onChange(n)
  }
  useGameKeys((k, e) => {
    if (k === 'left') go(-1)
    else if (k === 'right') go(1)
    else return
    e.preventDefault()
  }, keys)

  return (
    <div className="flex items-center justify-between gap-2 px-[2%] py-[1.2%] text-paper" style={{ background: color }}>
      <button type="button" aria-label="Previous page" onClick={() => go(-1)} className="font-display cursor-pointer border-0 bg-transparent px-2 py-1 text-[12px] text-paper">
        ◀
      </button>
      <div role="tablist" aria-label="Pages" className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto">
        {pages.map((p, i) => (
          <button
            key={p}
            role="tab"
            type="button"
            aria-selected={i === current}
            onClick={() => {
              sfx('cursor')
              onChange(i)
            }}
            className={`font-display shrink-0 cursor-pointer border-0 px-2 py-1 text-[clamp(8px,2cqi,11px)] ${i === current ? 'bg-paper text-ink' : 'bg-transparent text-paper/70 hover:text-paper'}`}
          >
            {p}
          </button>
        ))}
      </div>
      <button type="button" aria-label="Next page" onClick={() => go(1)} className="font-display cursor-pointer border-0 bg-transparent px-2 py-1 text-[12px] text-paper">
        ▶
      </button>
    </div>
  )
}
