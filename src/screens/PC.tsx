import { useEffect, useMemo, useState, type ReactNode, type SyntheticEvent } from 'react'
import { navigate } from '../app/router'
import { menu } from '../content/menu'
import { profile } from '../content/profile'
import { experience, formatRange, type ExperienceKind } from '../content/experience'
import { categories, publishedPortfolio, type Category, type Media, type Project } from '../content/portfolio'
import { useSettings } from '../systems/settings'
import { progress } from '../systems/progress'
import { useGameKeys } from '../systems/input'
import { ChoiceMenu } from '../ui/ChoiceMenu'
import { DialogueBox } from '../ui/DialogueBox'
import { Overlay } from '../ui/Overlay'
import { PageTabs } from '../ui/PageTabs'
import { PixelBox } from '../ui/PixelBox'
import { PixelIcon } from '../ui/PixelIcon'
import { PdfViewer } from '../ui/PdfViewer'
import { printPdf } from '../ui/printPdf'
import { Bullets, Heading, Pending, Sources, Tags } from '../ui/bits'
import { useGridNav } from '../ui/useGridNav'
import { SectionScreen } from './SectionScreen'

const entry = menu.find((m) => m.id === 'pc')!

export default function PC({ path }: { path: string }) {
  const [, , sub, id] = path.split('/')
  if (sub === 'resume') return <Resume />
  if (sub === 'portfolio') {
    const project = publishedPortfolio.find((p) => p.id === id)
    return project ? <CaseStudyView project={project} /> : <PortfolioBoxes />
  }
  if (sub === 'experience') return <ExperienceLog openId={id} />
  return <PCMenu />
}

/* ---------------- PC menu ---------------- */

let greeted = false

function MonitorTop({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#b8c4d8] p-[4%]">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#1a3a8a] p-[4%] text-paper shadow-[0_0_0_var(--u)_var(--color-ink),inset_0_0_0_calc(var(--u)*2)_#0a1a4a]">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 4px)' }} />
        <p className="font-display relative m-0 text-[clamp(13px,3.6cqi,21px)] text-gold">{label}</p>
        <div className="relative mt-[3%] min-h-0 flex-1">{children}</div>
      </div>
      <div className="font-display mt-[2%] flex items-center justify-between text-[clamp(10px,2.5cqi,14px)] text-ink">
        <span>POKé CENTRE PC SYSTEM</span>
        <span className="text-leaf">● ONLINE</span>
      </div>
    </div>
  )
}

function PCMenu() {
  const { sfx } = useSettings()
  const [ready, setReady] = useState(false)
  const [lines] = useState(() => (greeted ? ['What would you like to do?'] : ['Welcome to my PC!', 'What would you like to do?']))
  useEffect(() => {
    greeted = true
  }, [])

  return (
    <SectionScreen
      entry={entry}
      top={
        <MonitorTop label={`${profile.name}'S PC`}>
          <ul className="font-display m-0 list-none space-y-[4%] p-0 text-[clamp(11px,3.1cqi,18px)]">
            <li>▸ RESUME ........ 1 FILE</li>
            <li>▸ PORTFOLIO ..... {publishedPortfolio.length} ITEMS</li>
            <li>▸ EXPERIENCE .... {experience.length} ENTRIES</li>
          </ul>
        </MonitorTop>
      }
    >
      <div className="flex flex-col items-end gap-2 p-[3%]">
        <DialogueBox className="w-full" waitOnLast={false} lines={lines} onDone={() => setReady(true)} />
        {ready && (
          <ChoiceMenu
            label="PC menu"
            choices={[
              { label: 'ACCESS RESUME', value: '/pc/resume' },
              { label: 'ACCESS PORTFOLIO', value: '/pc/portfolio' },
              { label: 'VIEW EXPERIENCE', value: '/pc/experience' },
              { label: 'LOG OUT', value: '/' },
            ]}
            onCancel={() => navigate('/')}
            onChoose={(to) => {
              if (to === '/') sfx('back')
              navigate(to)
            }}
          />
        )}
      </div>
    </SectionScreen>
  )
}

/* ---------------- Resume ---------------- */

function Resume() {
  useEffect(() => progress.unlock('recruiter'), [])
  const isSmall = useMemo(() => window.matchMedia?.('(max-width: 639px)').matches ?? false, [])
  const [view, setView] = useState(isSmall ? 1 : 0)
  const [expanded, setExpanded] = useState(false)
  const file = profile.resume.file
  const downloadName = 'Aaryan-Khan-Resume.pdf'

  const buttons = (
    <>
      <a className="pixel-btn pixel-btn--primary !text-[14px] no-underline" href={file} download={downloadName}>
        ⬇ DOWNLOAD
      </a>
      <button type="button" className="pixel-btn inline-flex items-center gap-1.5 !text-[14px]" onClick={() => printPdf(file)}>
        <PixelIcon name="print" scale={1} /> PRINT
      </button>
      <a className="pixel-btn !text-[14px] no-underline" href={file} target="_blank" rel="noreferrer">
        ↗ NEW TAB
      </a>
    </>
  )

  return (
    <SectionScreen
      entry={entry}
      backTo="/pc"
      backKeys={!expanded}
      title="RESUME"
      compactTop
      subheader={<PageTabs pages={['PDF', 'TEXT']} current={view} onChange={setView} color={entry.color[0]} keys={!expanded} />}
      scrollKey={view}
      top={
        <MonitorTop label="RESUME.PDF">
          <div className="flex h-full flex-col items-start justify-between gap-2">
            {/* a phone's top screen is too short for the name and the buttons: the buttons win */}
            <p className="m-0 hidden min-h-0 w-full overflow-hidden text-[clamp(12px,3cqi,17px)] sm:block">
              {profile.fullName}
              <br />
              <span className="block truncate opacity-80">{profile.trainerClass} · Paralegal, Clayton Utz</span>
            </p>
            <div className="flex shrink-0 flex-wrap gap-1">{buttons}</div>
          </div>
        </MonitorTop>
      }
    >
      {view === 0 ? (
        <PdfViewer
          file={file}
          title="Resume"
          downloadName={downloadName}
          keys={!expanded}
          className="h-full min-h-[60dvh] sm:min-h-0"
          extra={
            <button type="button" className="dex-bar-btn pdf-bar-btn" onClick={() => setExpanded(true)} aria-label="Full screen">
              ⛶
            </button>
          }
        />
      ) : (
        <TextResume />
      )}
      {expanded && (
        <Overlay title="RESUME — AARYAN KHAN" onClose={() => setExpanded(false)}>
          <PdfViewer file={file} title="Resume" downloadName={downloadName} className="h-full" />
        </Overlay>
      )}
    </SectionScreen>
  )
}

/** Accessible text version, built from the same verified content (no phone number or referees). */
function TextResume() {
  const work = experience.filter((e) => e.kind === 'work')
  const lead = experience.filter((e) => e.kind === 'leadership')
  return (
    <article className="space-y-6 bg-paper p-[5%] text-[15px] leading-relaxed text-ink">
      <header>
        <h3 className="m-0 text-[22px] font-semibold">{profile.fullName}</h3>
        <p className="m-0 text-muted">
          {profile.contact.phone} ·{' '}
          <a href={`mailto:${profile.contact.email}`} className="text-harbour underline">
            {profile.contact.email}
          </a>{' '}
          ·{' '}
          <a href={profile.links[0].href} target="_blank" rel="noreferrer" className="text-harbour underline">
            linkedin.com/in/aaryan-khan
          </a>
        </p>
      </header>
      <section>
        <Heading>EDUCATION</Heading>
        {profile.education.map((ed) => (
          <div key={ed.school} className="mb-2">
            <p className="m-0 font-semibold">
              {ed.school} <span className="font-normal text-muted">· {ed.years}</span>
            </p>
            <p className="m-0 italic">{ed.award}</p>
            <ul className="m-0 mt-1 pl-5">
              {ed.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      {(
        [
          ['PROFESSIONAL EXPERIENCE', work],
          ['LEADERSHIP', lead],
        ] as const
      ).map(([title, list]) => (
        <section key={title}>
          <Heading>{title}</Heading>
          {list.map((e) => (
            <div key={e.id} className="mb-3">
              <p className="m-0 font-semibold">
                {e.title}, {e.org} <span className="font-normal text-muted">· {formatRange(e.start, e.end)}</span>
              </p>
              <ul className="m-0 mt-1 pl-5">
                {e.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
      <section>
        <Heading>SKILLS</Heading>
        <ul className="m-0 pl-5">
          {profile.skills.map((g) => (
            <li key={g.group}>
              <span className="font-semibold">{g.group}:</span> {g.items.join(', ')}
            </li>
          ))}
          <li>
            <span className="font-semibold">Languages:</span> {profile.languages.join(', ')}
          </li>
        </ul>
      </section>
      <section>
        <Heading>REFEREES</Heading>
        <ul className="m-0 pl-5">
          {profile.referees.map((r) => (
            <li key={r.name}>
              <span className="font-semibold">{r.name}</span>, {r.title} — {r.org}
            </li>
          ))}
        </ul>
      </section>
      <p className="m-0 text-[13px] text-muted">The PDF is the authoritative version. Volunteering is in the Experience log.</p>
    </article>
  )
}

/* ---------------- Portfolio boxes ---------------- */

const boxes: Array<'ALL' | Category> = ['ALL', ...categories.filter((c) => publishedPortfolio.some((p) => p.categories.includes(c)))]
let lastBox = 0
let lastSlot = 0

function PortfolioBoxes() {
  const { sfx } = useSettings()
  const [box, setBox] = useState(lastBox)
  const items = boxes[box] === 'ALL' ? publishedPortfolio : publishedPortfolio.filter((p) => p.categories.includes(boxes[box] as Category))
  const open = (p: Project) => {
    sfx('select')
    navigate(`/pc/portfolio/${p.id}`)
  }
  const nav = useGridNav(items.length, 4, { initial: lastSlot, onMove: (i) => (lastSlot = i), onActivate: (i) => open(items[i]) })
  const focused = items[Math.min(nav.focus, items.length - 1)]

  const switchBox = (d: number) => {
    const n = (box + d + boxes.length) % boxes.length
    sfx('cursor')
    lastBox = n
    lastSlot = 0
    nav.setFocus(0)
    setBox(n)
  }
  // L/R in the box header (Q/E or [ / ] on keyboard, since arrows move the cursor)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === '[') switchBox(-1)
      if (e.key === 'e' || e.key === ']') switchBox(1)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  return (
    <SectionScreen
      entry={entry}
      backTo="/pc"
      title="PORTFOLIO"
      top={
        <div className="absolute inset-0 bg-[#2a4a8a] p-[3%]">
          {focused ? <PortfolioPreview key={focused.id} project={focused} /> : <p className="m-auto text-paper">This box is empty.</p>}
        </div>
      }
      subheader={
        <div className="flex items-center justify-between bg-[#3a6ad0] px-[2%] py-[1.2%] text-paper">
          <button type="button" aria-label="Previous box" onClick={() => switchBox(-1)} className="font-display cursor-pointer border-0 bg-transparent px-2 text-[17px] text-paper">
            ◀
          </button>
          <span className="font-display text-[clamp(13px,3.4cqi,18px)]" aria-live="polite">
            BOX: {boxes[box].toUpperCase()} <span className="opacity-70">({items.length})</span>
          </span>
          <button type="button" aria-label="Next box" onClick={() => switchBox(1)} className="font-display cursor-pointer border-0 bg-transparent px-2 text-[17px] text-paper">
            ▶
          </button>
        </div>
      }
      scrollKey={box}
    >
      <div className="bg-grid min-h-full p-[3%]">
        <div role="listbox" aria-label={`Box ${boxes[box]}`} className="grid grid-cols-4 gap-[3%]">
          {items.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={i === nav.focus}
              aria-label={`${p.title} — ${p.type}`}
              {...nav.itemProps(i)}
              onMouseEnter={() => nav.setFocus(i)}
              onClick={() => open(p)}
              className={`relative aspect-square cursor-pointer overflow-hidden border-0 bg-paper p-0 outline-none ${
                i === nav.focus ? 'gv-card--selected' : 'gv-card'
              }`}
            >
              <img src={p.thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              {p.media[0].kind === 'video' && (
                <span aria-hidden className="font-display absolute right-1 bottom-1 bg-ink/80 px-1 text-[11px] text-paper">
                  ▶
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="m-0 mt-3 text-[13px] text-muted">◀ ▶ switch boxes (or Q / E). Select a slot to open its case study.</p>
      </div>
    </SectionScreen>
  )
}

/**
 * Whether a piece is wide or tall. The content records each piece's size, so the layout is right
 * from the first frame (no jump while it loads); the thumbnail's real size, once loaded, confirms it.
 */
function useOrientation(project: Project) {
  const m = project.media[0]
  const [wide, setWide] = useState(m.width > m.height * 1.1)
  const onLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    if (w && h) setWide(w > h * 1.1)
  }
  return { wide, onLoad }
}

/**
 * The selected piece on the top screen. Tall pieces (posters, stories) keep the side-by-side layout:
 * the piece in a tall frame, its details on a plate beside it. Wide pieces (event covers) get the
 * whole width at their own aspect ratio, with the details on a plate underneath, so more of the
 * picture shows instead of a small strip in a tall frame.
 */
function PortfolioPreview({ project }: { project: Project }) {
  const { wide, onLoad } = useOrientation(project)
  const m = project.media[0]
  const details = (
    <>
      <p className="font-display m-0 text-[clamp(11px,3.1cqi,18px)] text-dex-red">{project.type.toUpperCase()}</p>
      <p className="m-0 text-[clamp(13px,3.2cqi,19px)] leading-tight font-semibold">{project.title}</p>
      <p className="m-0 text-[clamp(11px,2.6cqi,15px)] text-muted">{project.org}</p>
    </>
  )
  if (wide)
    return (
      <div className="flex h-full flex-col items-stretch justify-center gap-[3%]" style={{ animation: 'photo-in 260ms var(--ease-move)' }}>
        <div className="mx-auto flex max-h-[72%] w-full items-center justify-center overflow-hidden bg-[#0e1a3a] shadow-[0_0_0_var(--u)_var(--color-ink)]" style={{ aspectRatio: `${m.width} / ${m.height}` }}>
          <img src={project.thumb} alt="" onLoad={onLoad} className="h-full w-full object-contain" />
        </div>
        <PixelBox variant="plate" className="flex min-w-0 flex-col justify-center gap-[2%] px-[4%] py-[2.5%]">
          {details}
        </PixelBox>
      </div>
    )
  return (
    <div className="flex h-full gap-[3%]" style={{ animation: 'photo-in 260ms var(--ease-move)' }}>
      <div className="flex w-[52%] items-center justify-center overflow-hidden bg-[#0e1a3a] shadow-[0_0_0_var(--u)_var(--color-ink)]">
        <img src={project.thumb} alt="" onLoad={onLoad} className="max-h-full max-w-full object-contain" />
      </div>
      <PixelBox variant="plate" className="flex min-w-0 flex-1 flex-col justify-center gap-[4%] px-[4%] py-[3%]">
        {details}
      </PixelBox>
    </div>
  )
}

function MediaView({ media, fill = false }: { media: Media; fill?: boolean }) {
  const cls = fill ? 'h-full w-full object-contain' : 'max-h-full max-w-full object-contain'
  return media.kind === 'image' ? (
    <img src={media.src} alt={media.alt} width={media.width} height={media.height} className={cls} />
  ) : (
    <video src={media.src} poster={media.poster} controls playsInline preload="metadata" aria-label={media.alt} className={cls} />
  )
}

function CaseStudyView({ project }: { project: Project }) {
  const { sfx } = useSettings()
  const [expanded, setExpanded] = useState(false)
  const media = project.media[0]
  const idx = publishedPortfolio.indexOf(project)
  const go = (d: number) => {
    const next = publishedPortfolio[(idx + d + publishedPortfolio.length) % publishedPortfolio.length]
    sfx('cursor')
    navigate(`/pc/portfolio/${next.id}`)
  }
  useGameKeys((k, e) => {
    if (k === 'left') go(-1)
    else if (k === 'right') go(1)
    else return
    e.preventDefault()
  }, !expanded)

  const steps: Array<[string, string | null]> = [
    ['MISSION', project.caseStudy.mission],
    ['CHALLENGE', project.caseStudy.challenge],
    ['STRATEGY', project.caseStudy.strategy],
    ['EXECUTION', project.caseStudy.execution],
    ['RESULT', project.caseStudy.result],
  ]

  return (
    <SectionScreen
      entry={entry}
      backTo="/pc/portfolio"
      backKeys={!expanded}
      title="CASE STUDY"
      compactTop={false}
      scrollKey={project.id}
      top={
        <div className="absolute inset-0 flex items-center justify-center bg-[#0e1a3a] p-[2%]">
          <MediaView media={media} />
          <button type="button" onClick={() => setExpanded(true)} className="pixel-btn absolute right-1 bottom-1 !text-[13px]" aria-label="View full size">
            ⛶
          </button>
        </div>
      }
    >
      <div className="space-y-7 p-[4%] text-[16px] leading-relaxed">
        <PixelBox className="px-[5%] py-[4%]">
          <p className="font-display m-0 text-[clamp(11px,2.8cqi,15px)] text-dex-red">{project.type.toUpperCase()}</p>
          <p className="m-0 mt-1 text-[19px] leading-tight font-semibold">{project.title}</p>
          <p className="m-0 text-[14px] text-muted">
            {project.org}
            {project.date && ` · ${project.date}`}
          </p>
          <Bullets items={project.summary} marked className="mt-3" />
          <dl className="m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[15px]">
            <dt className="font-display text-[13px] leading-[1.9] text-muted">ROLE</dt>
            <dd className="m-0">{project.role ?? <Pending>To be confirmed.</Pending>}</dd>
            <dt className="font-display text-[13px] leading-[1.9] text-muted">TOOLS</dt>
            <dd className="m-0">{project.tools ? project.tools.join(', ') : <Pending>To be confirmed.</Pending>}</dd>
          </dl>
          <div className="mt-3">
            <Tags items={project.categories} />
          </div>
        </PixelBox>
        {steps
          .filter(([, text]) => text)
          .map(([label, text]) => (
            <section key={label}>
              <Heading>{label}</Heading>
              <Bullets items={text!} marked />
            </section>
          ))}
        {!project.confirmed && <p className="m-0 text-[13px] text-muted">Draft entry — year and role still to be confirmed.</p>}
        <div className="flex justify-between pt-1">
          <button type="button" className="pixel-btn !text-[14px]" onClick={() => go(-1)}>
            ◀ PREV
          </button>
          <button type="button" className="pixel-btn !text-[14px]" onClick={() => go(1)}>
            NEXT ▶
          </button>
        </div>
      </div>
      {expanded && (
        <Overlay title={project.title.toUpperCase()} onClose={() => setExpanded(false)}>
          <div className="flex h-full items-center justify-center">
            <MediaView media={media} fill />
          </div>
        </Overlay>
      )}
    </SectionScreen>
  )
}

/* ---------------- Experience log ---------------- */

const KINDS: Array<[ExperienceKind, string]> = [
  ['work', 'WORK'],
  ['leadership', 'LEADERSHIP'],
  ['volunteer', 'VOLUNTEER'],
]

function ExperienceLog({ openId }: { openId?: string }) {
  const target = experience.find((e) => e.id === openId)
  const [tab, setTab] = useState(target ? KINDS.findIndex(([k]) => k === target.kind) : 0)
  const [open, setOpen] = useState<string | null>(target?.id ?? null)
  const list = experience.filter((e) => e.kind === KINDS[tab][0])
  const nav = useGridNav(list.length, 1)

  useEffect(() => {
    if (target) document.getElementById(`exp-${target.id}`)?.scrollIntoView({ block: 'center' })
  }, [target])

  return (
    <SectionScreen
      entry={entry}
      backTo="/pc"
      title="EXPERIENCE"
      scrollKey={tab}
      subheader={
        <PageTabs
          pages={KINDS.map(([, l]) => l)}
          current={tab}
          onChange={(i) => {
            setTab(i)
            nav.setFocus(0)
          }}
          color={entry.color[0]}
        />
      }
      top={
        <MonitorTop label="EXPERIENCE LOG">
          <ul className="font-display m-0 list-none space-y-[5%] p-0 text-[clamp(11px,3.1cqi,18px)]">
            {KINDS.map(([k, l]) => (
              <li key={k}>
                ▸ {l.padEnd(11, '.')} {experience.filter((e) => e.kind === k).length}
              </li>
            ))}
          </ul>
          <div className="absolute right-0 bottom-0">
            <PixelIcon name="pc" scale={3} />
          </div>
        </MonitorTop>
      }
    >
      <ul className="m-0 list-none space-y-3 p-[3%]">
        {list.map((e, i) => {
          const isOpen = open === e.id
          return (
            <li key={e.id} id={`exp-${e.id}`}>
              <button
                type="button"
                {...nav.itemProps(i)}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : e.id)}
                className={`flex w-full cursor-pointer items-start justify-between gap-3 border-0 px-3 py-2 text-left outline-none ${
                  i === nav.focus ? 'bg-paper shadow-[0_0_0_var(--u)_var(--color-gold)]' : 'bg-paper shadow-[0_0_0_2px_#b8c0d8]'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[16px] leading-tight font-semibold">{e.title}</span>
                  <span className="block text-[14px] text-muted">
                    {e.org} · {formatRange(e.start, e.end)}
                  </span>
                </span>
                <span aria-hidden className="font-display pt-1 text-[14px] text-dex-red">
                  {isOpen ? '▼' : '▶'}
                </span>
              </button>
              {isOpen && (
                <div className="space-y-7 bg-[#f4f6fb] px-4 py-5 text-[15px] leading-relaxed shadow-[0_0_0_2px_#b8c0d8]">
                  {(e.team || e.location) && <p className="m-0 text-[14px] text-muted">{[e.team, e.location].filter(Boolean).join(' · ')}</p>}
                  <Bullets items={e.points} />
                  {e.skills.length > 0 && (
                    <div>
                      <p className="font-display m-0 mb-3 text-[12px] tracking-wide text-muted">SKILLS</p>
                      <Tags items={e.skills} />
                    </div>
                  )}
                  <Sources ids={e.sources} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </SectionScreen>
  )
}
