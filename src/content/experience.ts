import type { SourceId } from './sources'

/**
 * Work, leadership and volunteering — transcribed from the resume and LinkedIn exports
 * (Oct 2026). Dates are 'YYYY-MM'; end: null means current.
 * Where the two sources disagree, see docs/CONTENT.md → "Open questions".
 */
export type ExperienceKind = 'work' | 'leadership' | 'volunteer'

export interface Experience {
  id: string
  title: string
  org: string
  team?: string
  kind: ExperienceKind
  start: string
  end: string | null
  location?: string
  points: string[]
  skills: string[]
  sources: SourceId[]
}

export const experience: Experience[] = [
  /* ---------------- Work ---------------- */
  {
    id: 'clayton-utz',
    title: 'Paralegal',
    org: 'Clayton Utz',
    team: 'Data Intelligence & Risk Advisory',
    kind: 'work',
    start: '2025-10',
    end: null,
    points: [
      'High-volume document review and eDiscovery using tools such as Relativity.',
      'First Line Review — exercising discretionary decision-making to interpret nuanced factual scenarios.',
      'Assists lawyers and partners across regulatory investigations, financial services and dispute matters by reviewing evidence, analysing documentation and preparing matter materials.',
      'Works with multidisciplinary legal and advisory teams on regulatory compliance, financial services and commercial risk.',
    ],
    skills: ['Relativity', 'Aderant Expert Time', 'Document review', 'Client liaison', 'Attention to detail'],
    sources: ['resume', 'linkedin'],
  },
  {
    id: 'unsw-enquiries',
    title: 'Future Students Enquiries Assistant',
    org: 'UNSW',
    team: 'Future Students Enquiries',
    kind: 'work',
    start: '2024-12',
    end: null,
    location: 'Kensington, NSW · Hybrid',
    points: [
      'Provides accurate, timely information to prospective students and stakeholders across inbound and outbound channels and events.',
      'Meets or exceeds individual and team KPIs on case resolution volume, customer satisfaction and SLA adherence.',
      'Keeps applicant records current in the UNSW CRM (Microsoft Dynamics 365).',
      'Takes part in high-volume conversion calling campaigns to drive applications, acceptances and enrolments.',
    ],
    skills: ['Microsoft Dynamics 365 CRM', 'Communication', 'Customer service'],
    sources: ['resume', 'linkedin'],
  },
  {
    id: 'unsw-ambassador',
    title: 'Student Ambassador',
    org: 'UNSW',
    team: 'Future Student Recruitment',
    kind: 'work',
    start: '2023-11',
    end: null,
    location: 'Kensington, NSW · On-site',
    points: [
      'Promotes UNSW at school visits, campus tours, careers markets and Open and Info Days.',
      "Markets UNSW's undergraduate degrees — admission requirements, selection, student services and university life — to students, parents and careers advisers.",
      'Consults with suppliers of physical information resources to maintain service levels and manage costs.',
    ],
    skills: ['Presentation', 'Educational outreach', 'Public speaking'],
    sources: ['resume', 'linkedin'],
  },
  {
    id: 'unsw-adviser',
    title: 'Future Students Adviser',
    org: 'UNSW',
    team: 'Future Students Office',
    kind: 'work',
    start: '2023-11',
    end: '2024-12',
    location: 'Hybrid',
    points: [
      'Administrative and customer service support for the Future Students Office.',
      'Phone and email enquiries during peak seasons on CRM, plus clerical duties, activity planning and workshop development.',
      'Advised domestic and international students, parents and careers advisers on facilities and study at UNSW.',
    ],
    skills: ['Microsoft Dynamics 365 CRM', 'Communication'],
    sources: ['resume', 'linkedin'],
  },
  {
    id: 'alliance',
    title: 'Law Clerk',
    org: 'Alliance Compensation & Litigation Lawyers',
    kind: 'work',
    start: '2024-12',
    end: '2025-03',
    location: 'Fairfield, NSW · On-site',
    points: [
      "Drafted documents for Workers Compensation, Common Law and Public Liability claims — letters, claim forms, particulars, submissions, pleadings, briefs to counsel, schedules, chronologies and applications.",
      'Liaised with clients, insurers and third parties.',
      'Updated the practice management system and assisted with the firm’s marketing plans.',
    ],
    skills: ['LEAP', 'Legal drafting', 'Client liaison'],
    sources: ['resume', 'linkedin'],
  },
  {
    id: 'sbhs-coach',
    title: 'Cricket Coach',
    org: 'Sydney Boys High School',
    kind: 'work',
    start: '2023-09',
    end: '2024-10',
    location: 'Surry Hills, NSW · Part-time',
    points: [
      'Taught fundamental and advanced cricket technique while building team culture.',
      'Designed team sessions and individualised training plans for 11 players over 3 months.',
      'Encouraged leadership through rotating role allocation within the team.',
    ],
    skills: ['Coaching & mentoring', 'Team building'],
    sources: ['resume', 'linkedin'],
  },

  /* ---------------- Leadership ---------------- */
  {
    id: 'arc-tours-coordinator',
    title: 'O-Week Tours Coordinator',
    org: 'Arc – UNSW Student Life',
    team: 'Yellow Shirts',
    kind: 'leadership',
    start: '2025-06',
    end: '2026-06',
    points: [
      'Led campus tours that introduced over 3,000 first-year students to key university areas and services.',
      'Designed tour routes, rosters and group allocations; managed tour-bag logistics and marshalling throughout O-Week.',
      'Designed and delivered the training for all tour volunteers.',
      'Liaised with faculties on general and tailored tours, and built on past virtual tours to keep O-Week hybrid and accessible.',
      'Managed partnerships and sponsorships to source merchandise for tour bags.',
    ],
    skills: ['Event logistics', 'Training design', 'Stakeholder management', 'Public speaking'],
    sources: ['resume', 'linkedinVolunteering'],
  },
  {
    id: 'lawsoc-marketing-coordinator',
    title: 'Marketing Coordinator',
    org: 'UNSW Law Society',
    kind: 'leadership',
    start: '2024-12',
    end: '2025-11',
    points: [
      'Trained and led a team of 6 Marketing Directors producing sponsored, external and internal marketing for every Law Society event (Canva Pro and Adobe Suite).',
      'Wrote the portfolio’s marketing guidelines and strategy.',
      'Delegated requests to directors and relayed information between coordinators and the Vice-President (Administration).',
      'Maintained professional standards and sponsor obligations across all marketing material; liaised with local and international sponsors.',
    ],
    skills: ['Team leadership', 'Brand guidelines', 'Sponsor relations', 'Canva Pro', 'Adobe Suite'],
    sources: ['resume', 'linkedinVolunteering'],
  },
  {
    id: 'lawsoc-marketing-director',
    title: 'Marketing Director',
    org: 'UNSW Law Society',
    kind: 'leadership',
    start: '2023-10',
    end: '2024-12',
    points: [
      'Created sponsored, external and internal event cover photos and graphics for society events open to all UNSW law students.',
      'Worked with the executive to design wearable merchandise, adapting to feedback from law students.',
    ],
    skills: ['Graphic design', 'Merchandise design', 'Canva Pro', 'Photoshop', 'Illustrator', 'Premiere Pro'],
    sources: ['resume', 'linkedinVolunteering'],
  },
  {
    id: 'sleg-marketing-director',
    title: 'Marketing Director',
    org: 'Student Legal Education Group',
    kind: 'leadership',
    start: '2024-12',
    end: '2025-11',
    points: [
      'Designed and updated the Prospectus sent to schools, law firms and community centres.',
      'Video, content and website creation; built and maintained the SLEG website on WordPress.',
      'Ran recruitment campaigns and kept an active social media presence.',
    ],
    skills: ['WordPress', 'Video', 'Content strategy'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'unsoc-vp',
    title: 'Vice-President Outreach',
    org: 'UNSW United Nations Society (UNSOC)',
    kind: 'leadership',
    start: '2023-10',
    end: '2024-12',
    points: [
      'Spearheaded physical and online marketing for a newly founded society, reaching an audience of over 2,000 students.',
      'Grew the society’s campus presence through social media marketing and student-centric engagement.',
      'Ran a multi-week social media recruitment campaign for new directors and subcommittee members.',
      'Designed wearable merchandise for the executive and members.',
    ],
    skills: ['Social media marketing', 'Recruitment campaigns', 'Merchandise design'],
    sources: ['resume', 'linkedinVolunteering'],
  },
  {
    id: 'btb-vp-marketing',
    title: 'Vice-President Marketing',
    org: 'Beyond The Bounds (BTB)',
    kind: 'leadership',
    start: '2023-06',
    end: '2024-01',
    points: [
      'Spearheaded physical and online marketing for a newly founded society, reaching over 300 students.',
      'Led a team of 6 across digital marketing, publications and merchandising.',
    ],
    skills: ['Team leadership', 'Digital marketing'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'arc-squad-leader',
    title: 'Squad Leader',
    org: 'Arc – UNSW Student Life',
    kind: 'leadership',
    start: '2024-07',
    end: '2025-03',
    points: [
      'Co-led a team of 16 O-Week volunteers, building a healthy team culture and decision-making frameworks.',
      'As Band Manager, recruited leaders and members and organised performances.',
      'In Logistics & Development, recruited for development programs and scheduled 200+ interviews with conflict-checking spreadsheets.',
    ],
    skills: ['Team leadership', 'Recruitment', 'Scheduling'],
    sources: ['linkedinVolunteering'],
  },

  /* ---------------- Volunteering ---------------- */
  {
    id: 'compclub-media',
    title: 'Media Subcommittee',
    org: 'UNSW CompClub',
    kind: 'volunteer',
    start: '2026-03',
    end: null,
    points: ['Creates long- and short-form digital content promoting CompClub initiatives and high school workshops.'],
    skills: ['Video', 'Social media'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'lawsoc-cu-panellist',
    title: 'Clayton Utz Paralegal Panellist',
    org: 'UNSW Law Society',
    kind: 'volunteer',
    start: '2026-09',
    end: '2026-09',
    points: [
      'Represented Clayton Utz on a Private Law Careers panel, covering paralegal work, skills, team culture and exposure to legal technology and AI.',
      'Gave practical advice on securing paralegal roles.',
    ],
    skills: ['Public speaking'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'lawsoc-internal-panellist',
    title: 'Internal Paralegal Panellist',
    org: 'UNSW Law Society',
    kind: 'volunteer',
    start: '2026-07',
    end: '2026-07',
    points: ['Spoke as a paralegal at a Big Six Australian law firm on early career pathways, clerkship preparation and paralegal recruitment.'],
    skills: ['Public speaking'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'lawsoc-method',
    title: 'The Method Volunteer',
    org: 'UNSW Law Society',
    kind: 'volunteer',
    start: '2026-07',
    end: '2026-08',
    points: ['One-on-one career coaching for junior law students: reviewing LinkedIn profiles, resumes and cover letters, and advising on interviews and networking.'],
    skills: ['Mentoring'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'lawsoc-careers-fair',
    title: 'PIC & PLC Careers Fair Volunteer',
    org: 'UNSW Law Society',
    kind: 'volunteer',
    start: '2026-04',
    end: '2026-04',
    points: ['Represented the Department of Home Affairs stall, talking with students about graduate pathways.'],
    skills: ['Communication'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'lawsoc-camp-leader',
    title: 'Camp Leader',
    org: 'UNSW Law Society',
    kind: 'volunteer',
    start: '2024-03',
    end: '2026-03',
    points: ['Camp leader at the annual First Year Camp in 2024, 2025 and 2026 — building connections between first-years and keeping everyone safe.'],
    skills: ['Pastoral care'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'lawplus-mentor',
    title: 'LawPLUS Mentor',
    org: 'UNSW Law Society',
    kind: 'volunteer',
    start: '2024-02',
    end: '2026-05',
    points: ['Social mentor for first-year law students across the term.'],
    skills: ['Mentoring'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'enactus-hr',
    title: 'Human Resources Subcommittee',
    org: 'Enactus UNSW',
    kind: 'volunteer',
    start: '2025-03',
    end: '2025-11',
    points: ['Organised society bonding events, including road trips of up to 100 members over 3–7 days.'],
    skills: ['Event planning'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'digsoc-hr',
    title: 'Human Resources Subcommittee',
    org: 'UNSW Digital Society',
    kind: 'volunteer',
    start: '2024-03',
    end: '2024-11',
    points: ['Helped run society-wide bonding events and road trips.'],
    skills: ['Event planning'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'arc-yellow-shirt',
    title: 'Yellow Shirts Volunteer',
    org: 'Arc – UNSW Student Life',
    kind: 'volunteer',
    start: '2023-11',
    end: '2024-02',
    points: ['Helped run O-Week across five days, from guiding first-years to social activities.'],
    skills: [],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'unsoc-discovermun',
    title: 'DiscoverMUN Mentor',
    org: 'UNSW United Nations Society (UNSOC)',
    kind: 'volunteer',
    start: '2023-05',
    end: '2023-05',
    points: ['Introduced high school students to Model United Nations and taught them how to delegate.'],
    skills: ['Mentoring', 'Debate'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'umcg-publications',
    title: 'Publications Subcommittee',
    org: 'UNSW Microfinance Consulting Group (UMCG)',
    kind: 'volunteer',
    start: '2023-03',
    end: '2023-11',
    points: ['Wrote blog posts, news articles and content for the annual publication on socio-political pressures on financial markets.'],
    skills: ['Writing'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'unsoc-events',
    title: 'Events Subcommittee',
    org: 'UNSW United Nations Society (UNSOC)',
    kind: 'volunteer',
    start: '2023-03',
    end: '2023-11',
    points: ['Ran internal and inter-university events and liaised with human rights speakers for panel events.'],
    skills: ['Event planning'],
    sources: ['linkedinVolunteering'],
  },
  {
    id: 'crimsoc-events',
    title: 'Events Subcommittee',
    org: 'UNSW Criminology Society',
    kind: 'volunteer',
    start: '2023-03',
    end: '2023-11',
    points: ['Ran internal and inter-university events and liaised with human rights speakers for panel events.'],
    skills: ['Event planning'],
    sources: ['linkedinVolunteering'],
  },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}
export function formatRange(start: string, end: string | null): string {
  if (end === start) return formatMonth(start)
  return `${formatMonth(start)} – ${end ? formatMonth(end) : 'Present'}`
}
export function experienceById(id: string): Experience | undefined {
  return experience.find((e) => e.id === id)
}
