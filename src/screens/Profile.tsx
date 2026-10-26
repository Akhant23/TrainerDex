import { useState } from 'react'
import { menu } from '../content/menu'
import { profile } from '../content/profile'
import { experience } from '../content/experience'
import { PixelBox } from '../ui/PixelBox'
import { PageTabs } from '../ui/PageTabs'
import { StatBar } from '../ui/StatBar'
import { TrainerSprite } from '../ui/TrainerSprite'
import { Bullets, Heading, Sources, Tags } from '../ui/bits'
import { SectionScreen } from './SectionScreen'
import { SceneBackdrop } from '../ui/SceneBackdrop'

const entry = menu.find((m) => m.id === 'profile')!
const PAGES = ['INFO', 'STUDIES', 'SKILLS', 'STATS', 'LIKES'] as const

export default function Profile() {
  const [page, setPage] = useState(0)
  return (
    <SectionScreen
      entry={entry}
      compactTop={false}
      top={<TrainerInfo />}
      scrollKey={page}
      subheader={<PageTabs pages={PAGES} current={page} onChange={setPage} color={entry.color[0]} />}
    >
      <div className="space-y-7 p-[4%] text-[16px] leading-relaxed">
        {page === 0 && <InfoPage />}
        {page === 1 && <StudiesPage />}
        {page === 2 && <SkillsPage />}
        {page === 3 && <StatsPage />}
        {page === 4 && <LikesPage />}
      </div>
    </SectionScreen>
  )
}

function TrainerInfo() {
  const rows: Array<[string, string]> = [
    ['NAME', profile.name],
    ['CLASS', profile.trainerClassShort],
    ['REGION', profile.regionShort],
    ['SCHOOL', 'UNSW'],
    ['SINCE', String(profile.started)],
  ]
  return (
    <div className="bg-stripes absolute inset-0 flex" style={{ ['--s1' as string]: entry.color[0], ['--s2' as string]: entry.color[1] }}>
      <SceneBackdrop tones={entry.color} />
      <div className="relative w-[42%]">
        <div aria-hidden className="absolute bottom-[8%] left-[12%] h-[13%] w-[76%] rounded-[50%] bg-[#f8d8a8] shadow-[inset_0_-6px_0_#d8a870,0_0_0_3px_#1c1a24]" />
        <div className="absolute bottom-[13%] left-1/2 flex h-[76%] -translate-x-1/2 items-end">
          <TrainerSprite fill={0.98} />
        </div>
      </div>
      <div className="relative flex w-[58%] flex-col justify-center py-[4%] pr-[4%]">
        <PixelBox variant="plate" className="px-[5%] py-[4%]">
          <p className="font-display cq-text-xs m-0 mb-[5%] text-muted">TRAINER INFO</p>
          <dl className="font-display cq-text-xs m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-[0.85em]">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-dex-red">{k}</dt>
                <dd className="m-0 text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </PixelBox>
      </div>
    </div>
  )
}

function InfoPage() {
  return (
    <>
      <PixelBox className="space-y-5 px-[5%] py-[4%]">
        <Bullets items={profile.bio} />
        <Sources ids={['resume', 'linkedin']} />
      </PixelBox>
      <section>
        <Heading>CURRENTLY</Heading>
        <ul className="m-0 list-none space-y-2.5 p-0">
          {profile.currently.map((c) => (
            <li key={c} className="flex gap-2">
              <span aria-hidden className="text-dex-red">
                ▸
              </span>
              {c}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <Heading>AMBITION</Heading>
        <p className="m-0">{profile.ambitions}</p>
      </section>
      <section>
        <Heading>TRAINER RECORD</Heading>
        <p className="m-0">
          {experience.filter((e) => e.kind === 'work').length} jobs · {experience.filter((e) => e.kind === 'leadership').length} leadership roles ·{' '}
          {experience.filter((e) => e.kind === 'volunteer').length} volunteer roles.{' '}
          <a href="#/pc/experience" className="text-harbour underline">
            See the full log in the PC
          </a>
          .
        </p>
      </section>
    </>
  )
}

function StudiesPage() {
  return (
    <>
      {profile.education.map((ed) => (
        <PixelBox key={ed.school} className="px-[5%] py-[4%]">
          <p className="font-display m-0 text-[clamp(14px,3.4cqi,18px)] text-dex-red">{ed.school.toUpperCase()}</p>
          <p className="m-0 mt-1 font-semibold">{ed.award}</p>
          <p className="m-0 text-[14px] text-muted">{ed.years}</p>
          <ul className="m-0 mt-2 list-none space-y-2.5 p-0">
            {ed.points.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden className="text-dex-red">
                  ▸
                </span>
                {p}
              </li>
            ))}
          </ul>
          <Sources ids={ed.sources} className="mt-4" />
        </PixelBox>
      ))}
      <section>
        <Heading>LEGAL INTERESTS</Heading>
        <Tags items={profile.legalInterests} />
      </section>
    </>
  )
}

function SkillsPage() {
  return (
    <>
      {profile.skills.map((g) => (
        <section key={g.group}>
          <Heading>{g.group.toUpperCase()}</Heading>
          <Tags items={g.items} />
        </section>
      ))}
      <section>
        <Heading>LANGUAGES</Heading>
        <Tags items={profile.languages} />
      </section>
      <section>
        <Heading>CERTIFICATIONS</Heading>
        <ul className="m-0 list-none space-y-2.5 p-0">
          {profile.certifications.map((c) => (
            <li key={c.name}>
              <span className="font-semibold">{c.name}</span> · {c.issuer} · {c.issued}
              {'expires' in c && c.expires ? ` (expires ${c.expires})` : ''}
            </li>
          ))}
        </ul>
      </section>
      <Sources ids={['resume', 'linkedin']} />
    </>
  )
}

function StatsPage() {
  return (
    <>
      <PixelBox className="space-y-5 px-[5%] py-[5%]">
        {profile.stats.map((s) => (
          <StatBar key={s.label} label={s.label} value={s.value} />
        ))}
      </PixelBox>
      <p className="m-0 text-[14px] text-muted">These are playful, illustrative ratings — not measured scores.</p>
    </>
  )
}

function LikesPage() {
  return (
    <>
      <section>
        <Heading>INTERESTS</Heading>
        <Tags items={profile.interests} />
      </section>
      <section>
        <Heading>HOBBIES</Heading>
        <Tags items={profile.hobbies} />
      </section>
      <section>
        <Heading>PERSONALITY</Heading>
        <ul className="m-0 list-none space-y-2.5 p-0">
          {profile.personality.map((p) => (
            <li key={p} className="flex gap-2">
              <span aria-hidden className="text-dex-red">
                ▸
              </span>
              {p}
            </li>
          ))}
        </ul>
      </section>
      <p className="m-0 text-[14px]">
        Want the details? The <a href="#/pokedex" className="text-harbour underline">Pokédex</a> has an entry for each of these.
      </p>
    </>
  )
}
