import type { MenuEntry } from '../content/menu'
import { profile } from '../content/profile'
import { PixelBox } from '../ui/PixelBox'
import { SectionScreen, TitleCard } from './SectionScreen'

/**
 * Honest placeholder for sections that haven't been built yet. It says so plainly and lists
 * what's coming — it never pretends to be the finished feature.
 */
export default function ComingSoon({ entry, path }: { entry: MenuEntry; path: string }) {
  const isResume = path === '/pc/resume'
  return (
    <SectionScreen entry={entry} top={<TitleCard entry={entry} subtitle="UNDER CONSTRUCTION" />}>
      <div className="p-[4%]">
        <PixelBox className="cq-text-sm px-[5%] py-[4%] font-semibold">
          {isResume && !profile.resume.available ? (
            <>
              <p className="m-0">The resume PDF hasn&rsquo;t been uploaded yet.</p>
              <p className="m-0 mt-3 font-normal">
                Once it&rsquo;s added, this shortcut opens it straight away — view in the page, download, or open in a new tab.
              </p>
            </>
          ) : (
            <>
              <p className="m-0">This area is still being built.</p>
              <p className="m-0 mt-3 font-normal">Arriving in build phase {entry.phase}:</p>
            </>
          )}
          {!isResume && entry.planned.length > 0 && (
            <ul className="m-0 mt-3 list-none space-y-2 p-0 font-normal">
              {entry.planned.map((p) => (
                <li key={p} className="flex gap-2">
                  <span aria-hidden className="text-dex-red">
                    ▸
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          )}
        </PixelBox>
      </div>
    </SectionScreen>
  )
}
