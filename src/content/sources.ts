/**
 * Where each fact came from. Every experience, badge and Dex entry lists its sources so
 * it can be checked, and the site shows them on detail screens.
 */
export const sources = {
  resume: { label: 'Resume (2026)', href: '/resume/resume.pdf' },
  linkedin: { label: 'LinkedIn profile', href: 'https://www.linkedin.com/in/aaryan-khan' },
  linkedinVolunteering: { label: 'LinkedIn · Volunteering', href: 'https://www.linkedin.com/in/aaryan-khan/details/volunteering-experiences/' },
  aaryan: { label: 'Provided by Aaryan', href: undefined },
} as const

export type SourceId = keyof typeof sources
