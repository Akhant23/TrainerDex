import type { SourceId } from './sources'

/**
 * Core trainer details. Edit freely — every screen reads from here.
 * Only put verified facts in this file (see docs/CONTENT.md).
 */
export const profile = {
  name: 'AARYAN',
  fullName: 'Aaryan Tahzeeb Khan',
  pronouns: 'he/him',
  /** Shown as "ID No." on the menu and Trainer Card. Any 5 digits you like. */
  trainerId: '00007',
  region: 'Sydney, Australia',
  regionShort: 'SYDNEY',
  trainerClass: 'Law / Biotechnology Student',
  trainerClassShort: 'LAW / BIOTECH',
  specialisation: 'Law, Science, Marketing & Creativity',
  university: 'UNSW Sydney',
  degree: 'Bachelor of Laws / Bachelor of Science (Biotechnology)',
  /** Year the adventure started (first year at UNSW). */
  started: 2023,

  bio: [
    'Aaryan Khan is a fourth-year Law / Science (Biotechnology) student at UNSW Sydney and a Paralegal in Clayton Utz’s Data Intelligence & Risk Advisory team.',
    'Alongside the degree he has spent three years as a UNSW Student Ambassador, led O-Week campus tours for a post-COVID record of 3,500 first-years, and ran marketing for the UNSW Law Society.',
    'He does his best work in leadership roles, and his strongest moves are presentation, communication and people management.',
  ],

  /** Legal areas he's most interested in (resume + LinkedIn About). */
  legalInterests: ['Dispute resolution', 'Intellectual property', 'Competition & consumer law', 'Pro bono'],

  /** Broader interests from the TrainerDex brief. */
  interests: [
    'Law and the legal profession',
    'Biotechnology and science',
    'Marketing, branding and creative design',
    'Leadership and volunteering',
    'Football and cricket',
    'Music and DJing',
    'Guitar',
    'Photography',
    'Technology and gaming',
  ],

  hobbies: ['DJing', 'Cricket', 'Football', 'Reading', 'Guitar', 'Photography', 'Gaming'],

  personality: ['Works late to hit a deadline', 'Most at home leading a team', 'Explains things clearly — on a tour, a panel or a phone line'],

  currently: [
    'Paralegal · Clayton Utz',
    'Student Ambassador · UNSW Future Student Recruitment',
    'Future Students Enquiries Assistant · UNSW',
    'Media Subcommittee · UNSW CompClub',
  ],

  ambitions: 'Building a legal career — with dispute resolution, intellectual property, competition law and pro bono work at the top of the list.',

  /**
   * Playful, illustrative ratings — not measurements. Tweak to taste (0–100).
   */
  stats: [
    { label: 'CREATIVITY', value: 86 },
    { label: 'LEADERSHIP', value: 90 },
    { label: 'COMMUNICATION', value: 94 },
    { label: 'ANALYSIS', value: 82 },
    { label: 'ADAPTABILITY', value: 85 },
    { label: 'CURIOSITY', value: 88 },
  ],

  education: [
    {
      school: 'University of New South Wales',
      award: 'Bachelor of Laws / Bachelor of Science (Biotechnology)',
      years: '2023 – expected 2028',
      points: [
        'Competes in Mooting, Witness Examination, Negotiation and Mediation — every year of the degree.',
        'Academic interests: Intellectual Property, Competition & Consumer Law, Pro Bono.',
      ],
      sources: ['resume', 'linkedin'] as SourceId[],
    },
    {
      school: 'Sydney Boys High School',
      award: 'Higher School Certificate',
      years: '2017 – 2022',
      points: [
        'Platinum Award (2022) — for extensive involvement in school life and success across 10 areas of achievement.',
        'GPS Football 2017–22 (Captain 2017) · GPS Cricket 2017–22 · GPS Athletics 2017–19 · GPS Debating.',
        'People and Animal Welfare Society 2021–22 · Enviro Team 2021–22 · Peer Support Leader 2019 · Peer Support Mentor 2020.',
      ],
      sources: ['resume', 'linkedin'] as SourceId[],
    },
  ],

  certifications: [
    { name: 'First Aid', issuer: 'Allens Training', issued: 'Dec 2025', expires: 'Dec 2028' },
    { name: 'LEAP Academy Short Course', issuer: 'LEAP Legal Software', issued: 'Sep 2024' },
    { name: 'Coaching – Education (Authorisation or Endorsement)', issuer: 'Department for Education', issued: 'Sep 2023' },
    { name: 'Working With Children Check', issuer: 'Service NSW', issued: 'Jul 2023', expires: 'Jul 2028' },
    { name: 'Hospitality Skill Certification for Bartender', issuer: 'Parramatta RSL Club', issued: 'May 2023' },
  ],

  skills: [
    { group: 'Legal tech', items: ['Relativity', 'Aderant Expert Time', 'LEAP'] },
    { group: 'Creative', items: ['Photoshop', 'Illustrator', 'Premiere Pro', 'Canva Pro', 'WordPress'] },
    { group: 'Office', items: ['Microsoft Office (120 WPM, 99% accuracy)', 'Microsoft Dynamics 365 CRM'] },
    { group: 'People', items: ['Team building', 'Communication', 'Client liaison', 'Public speaking', 'Coaching & mentoring'] },
  ],

  languages: ['English', 'Bengali'],

  links: [{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/aaryan-khan' }],

  /** As printed on the resume. */
  contact: {
    email: 'aaryankhan235@gmail.com',
    phone: '0452 532 826',
  },

  referees: [
    { name: 'Bernice Zandona', title: 'Enquiries Team Lead', org: 'UNSW Future Students Enquiries' },
    { name: 'Rebecca Ceely', title: 'Undergraduate Recruitment Manager', org: 'UNSW Future Student Recruitment' },
    { name: 'Jasmine Campbell', title: 'Practice Operations Manager', org: 'Clayton Utz' },
  ],

  resume: {
    file: '/resume/resume.pdf',
    available: true,
  },
} as const
