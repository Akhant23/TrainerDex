/**
 * Creative portfolio — originals in content-source/portfolio/, web copies in public/portfolio/.
 *
 * All published pieces were designed by Aaryan (Canva + Photoshop): 2024 work as Marketing
 * Director, 2025 work as Marketing Coordinator. Years come from the printed date + weekday.
 * Case-study fields left null (challenge, strategy, result) show "Notes coming soon" —
 * fill them in rather than letting the site guess. `confirmed: false` = year still unknown.
 */
export const categories = ['Marketing', 'Branding', 'Graphic Design', 'Social Media', 'Campaigns', 'Events', 'Strategy', 'Other'] as const
export type Category = (typeof categories)[number]

export type Media =
  | { kind: 'image'; src: string; width: number; height: number; alt: string }
  | { kind: 'video'; src: string; poster: string; width: number; height: number; alt: string }

export interface CaseStudy {
  mission: string | null
  challenge: string | null
  strategy: string | null
  execution: string | null
  result: string | null
}

export interface Project {
  id: string
  title: string
  org: string
  /** Format, e.g. "Facebook event cover". */
  type: string
  categories: Category[]
  /** As printed on the piece, when there is one. */
  date: string | null
  thumb: string
  media: Media[]
  /** null = not yet confirmed by Aaryan. */
  role: string | null
  tools: string[] | null
  summary: string
  caseStudy: CaseStudy
  /** false hides the project from the site. */
  published: boolean
  confirmed: boolean
}

const cover = (id: string, alt: string): Media => ({ kind: 'image', src: `/portfolio/${id}.jpg`, width: 1600, height: 838, alt })
const story = (id: string, alt: string, w = 1080, h = 1920): Media => ({ kind: 'video', src: `/portfolio/${id}.mp4`, poster: `/portfolio/${id}-thumb.jpg`, width: w, height: h, alt })
const todo: Omit<CaseStudy, 'mission' | 'execution'> = { challenge: null, strategy: null, result: null }

export const portfolio: Project[] = [
  {
    id: 'evening-with-the-barristers',
    title: 'An Evening with the Barristers',
    org: 'UNSW Law Society',
    type: 'Event cover',
    categories: ['Graphic Design', 'Events', 'Social Media'],
    date: 'Thu 12 June 2025',
    thumb: '/portfolio/evening-with-the-barristers-thumb.jpg',
    media: [cover('evening-with-the-barristers', 'Event cover: a dark barristers’ library with line-drawn Lady Justice and scales, title “An Evening with the Barristers”, Law 111, Thu 12 June, 6–8pm.')],
    role: 'Designer — as Marketing Coordinator, UNSW Law Society (2025)',
    tools: ['Canva', 'Photoshop'],
    summary: 'Cover for a careers evening with barristers in Law 111. A chambers library photo is overlaid with white line illustrations of Lady Justice and her scales, under a dark title band.',
    caseStudy: { mission: 'Promote a barristers’ careers evening to UNSW law students.', execution: 'Photographic chambers backdrop, hand-drawn line art of Lady Justice and the scales, and a high-contrast title band carrying venue, date and time.', ...todo },
    published: true,
    confirmed: true,
  },
  {
    id: 'exec-eoy-party',
    title: 'Executive End of Year Party',
    org: 'UNSW Law Society',
    type: 'Event cover',
    categories: ['Graphic Design', 'Events'],
    date: 'Thu 14 Nov 2024',
    thumb: '/portfolio/exec-eoy-party-thumb.jpg',
    media: [cover('exec-eoy-party', 'Event cover: deep green botanical background, glowing serif title “Executive End of Year Party”, illustrated cocktails on a bar, Henley’s Bar & Kitchen, Thursday 14 Nov, 7pm–late.')],
    role: 'Designer — as Marketing Director, UNSW Law Society (2024)',
    tools: ['Canva', 'Photoshop'],
    summary: 'End-of-year celebration for the society executive at Henley’s Bar & Kitchen. A deep green botanical background, a glowing serif title with a script “Party”, and a row of watercolour cocktails on a bar.',
    caseStudy: { mission: 'Invite the Law Society executive to its end-of-year party.', execution: 'Green botanical texture, glowing serif/script type pairing and illustrated cocktails staged on a bar counter.', ...todo },
    published: true,
    confirmed: true,
  },
  {
    id: 'first-year-eot-drinks',
    title: 'First Year End of Term Drinks',
    org: 'UNSW Law Society',
    type: 'Event cover',
    categories: ['Graphic Design', 'Events'],
    date: 'Fri 19 Apr 2024',
    thumb: '/portfolio/first-year-eot-drinks-thumb.jpg',
    media: [cover('first-year-eot-drinks', 'Event cover: cream background, bold black wide type “First Year End of Term Drinks”, four watercolour cocktails on a pink-to-orange gradient band, Roundhouse, Fri 19 Apr, 6:30–9:30pm.')],
    role: 'Designer — as Marketing Director, UNSW Law Society (2024)',
    tools: ['Canva', 'Photoshop'],
    summary: 'End-of-term drinks for first-year law students at the Roundhouse. Wide black display type framing a pink-to-orange gradient band of watercolour cocktails.',
    caseStudy: { mission: 'Get first-year law students to end-of-term drinks at the Roundhouse.', execution: 'Clean cream layout with oversized wide type, and a saturated gradient strip of cocktail illustrations as the focal point.', ...todo },
    published: true,
    confirmed: true,
  },
  {
    id: 'first-year-eot-celebration',
    title: 'First Year End of Term Celebration',
    org: 'UNSW Law Society · LawPLUS',
    type: 'Event cover',
    categories: ['Graphic Design', 'Events'],
    date: 'Thu 10 April 2025',
    thumb: '/portfolio/first-year-eot-celebration-thumb.jpg',
    media: [cover('first-year-eot-celebration', 'Event cover: monochrome line illustration of cocktails, condensed headline “First Year End of Term” with handwritten “Celebration”, UNSW Roundhouse Beer Garden, Thu 10 April, 6:30–10pm, sponsored by Clayton Utz.')],
    role: 'Designer — as Marketing Coordinator, UNSW Law Society (2025)',
    tools: ['Canva', 'Photoshop'],
    summary: 'A sponsored LawPLUS celebration at the UNSW Roundhouse Beer Garden. Monochrome line-drawn cocktails, a condensed headline over a handwritten script, and a grid footer with sponsor branding.',
    caseStudy: { mission: 'Promote the first-year end-of-term celebration and credit its sponsor.', execution: 'Black-and-white line illustration, condensed + script type contrast, editorial grid for logistics, and a sponsor bar.', ...todo },
    published: true,
    confirmed: true,
  },
  {
    id: 'lawplus-trivia-night',
    title: 'LawPLUS Trivia Night',
    org: 'UNSW Law Society · LawPLUS',
    type: 'Event cover',
    categories: ['Graphic Design', 'Events'],
    date: '8 Apr',
    thumb: '/portfolio/lawplus-trivia-night-thumb.jpg',
    media: [cover('lawplus-trivia-night', 'Event cover: Hollywood theme with red velvet curtain, gold art-deco frames, film strips and a gold statuette; “LawPLUS Trivia Night”, Colombo Theatre B, 8 Apr, 6:30–8:30pm, sponsored by Clayton Utz.')],
    role: 'Designer — UNSW Law Society marketing',
    tools: ['Canva', 'Photoshop'],
    summary: 'Movie-themed trivia night in Colombo Theatre B. Red velvet curtains, gold art-deco framing, curling film strips and an awards statuette, with a sponsor bar.',
    caseStudy: { mission: 'Promote a movie-themed LawPLUS trivia night.', execution: 'Awards-night visual language — velvet, gold deco ornament, film strips and a statuette — with sponsor branding.', ...todo },
    published: true,
    confirmed: false,
  },
  {
    id: 'suits-and-scrubs',
    title: 'Suits & Scrubs Pub Crawl',
    org: 'UNSW Law Society × UNSW MedSoc',
    type: 'Event cover',
    categories: ['Graphic Design', 'Events'],
    date: 'Friday 19 July 2024',
    thumb: '/portfolio/suits-and-scrubs-thumb.jpg',
    media: [cover('suits-and-scrubs', 'Event cover: a surgeon in scrubs and a lawyer in a suit at a dimly lit bar, curved glowing script “Suits & Scrubs”, LawSoc x MedSoc pub crawl, Friday 19 July, 7pm–late.')],
    role: 'Designer — as Marketing Director, UNSW Law Society (2024)',
    tools: ['Canva', 'Photoshop'],
    summary: 'Joint pub crawl with MedSoc. A suit and a set of scrubs side by side at a warm-lit bar, with glowing retro script arcing around them.',
    caseStudy: { mission: 'Promote a joint Law Society × MedSoc pub crawl.', execution: 'A single scene that tells the collab story — suit meets scrubs — with warm bar lighting and arched retro script.', ...todo },
    published: true,
    confirmed: true,
  },
  {
    id: 'country-club-page-2',
    title: 'Country Club: The Edit — The Hoodie',
    org: 'UNSW Law Society',
    type: 'Merch lookbook (animated)',
    categories: ['Branding', 'Campaigns', 'Social Media'],
    date: null,
    thumb: '/portfolio/country-club-page-2-thumb.jpg',
    media: [story('country-club-page-2', 'Animated lookbook page: two models in Law Society hoodies on a golf course, serif title “Country Club — The Edit”, “The Hoodie”.', 1080, 1350)],
    role: 'Designer — UNSW Law Society marketing',
    tools: ['Canva', 'Photoshop'],
    summary: 'Page from “Country Club: The Edit”, a Law Society merch lookbook shot on a golf course. Editorial serif type introduces the hoodie.',
    caseStudy: { mission: 'Launch a Law Society merch range with an editorial, country-club look.', execution: 'Golf-course photoshoot, editorial serif and script type, and animated pages for social.', ...todo },
    published: true,
    confirmed: false,
  },
  {
    id: 'country-club-pages-6-7',
    title: 'Country Club: The Edit — Behind the Scenes',
    org: 'UNSW Law Society',
    type: 'Merch lookbook (animated)',
    categories: ['Branding', 'Campaigns', 'Social Media'],
    date: null,
    thumb: '/portfolio/country-club-pages-6-7-thumb.jpg',
    media: [story('country-club-pages-6-7', 'Animated lookbook spread: “Behind the Scenes” on a golf course, then a collage of shoot photos and crewneck flat-lays.', 1080, 1350)],
    role: 'Designer — UNSW Law Society marketing',
    tools: ['Canva', 'Photoshop'],
    summary: 'Behind-the-scenes spread from the same lookbook: an animated title over the course, then a collage of shoot photos and product flat-lays.',
    caseStudy: { mission: 'Show the people and process behind the merch launch.', execution: 'Animated transition from title card to a photo collage mixing candid shoot moments with product flat-lays.', ...todo },
    published: true,
    confirmed: false,
  },
  {
    id: 'winter-merch-2024',
    title: 'Winter Merch 2024 — Sales Open',
    org: 'UNSW Law Society',
    type: 'Instagram story (animated)',
    categories: ['Campaigns', 'Social Media', 'Marketing'],
    date: 'Sales close Thu 6 June 2024',
    thumb: '/portfolio/winter-merch-2024-thumb.jpg',
    media: [story('winter-merch-2024', 'Animated story on a purple starry background: polaroid photos of students in Law Society merch, handwritten callouts “2024 Exclusive!”, “Laptop Sleeve!?”, “LawSocks!”, “Sales open now!”.')],
    role: 'Designer — as Marketing Director, UNSW Law Society (2024)',
    tools: ['Canva', 'Photoshop'],
    summary: 'Sales-open story for the 2024 winter merch drop. Polaroid-style product photos and handwritten callouts (“Laptop Sleeve!?”, “LawSocks!”) over a purple night sky.',
    caseStudy: { mission: 'Drive sales of the 2024 winter merch range before the 6 June close.', execution: 'Scrapbook polaroids, hand-lettered callouts and a starry purple palette, animated for Instagram stories.', ...todo },
    published: true,
    confirmed: true,
  },
  {
    id: 'tale-as-old-as-time',
    title: 'Law Ball 2024 — “See You Tonight”',
    org: 'UNSW Law Society',
    type: 'Instagram story (animated)',
    categories: ['Events', 'Social Media'],
    date: '20 Sep 2024',
    thumb: '/portfolio/tale-as-old-as-time-thumb.jpg',
    media: [story('tale-as-old-as-time', 'Animated story: an enchanted rose under a glass dome on a dark stage, glowing title “Tale As Old As Time — Law Ball 2024 — See You Tonight!”, Sydney Town Hall, 20 Sep 2024.')],
    role: 'Designer — as Marketing Director, UNSW Law Society (2024)',
    tools: ['Canva', 'Photoshop'],
    summary: 'Day-of story for Law Ball 2024 at Sydney Town Hall, themed “Tale As Old As Time”: a glowing rose under glass on a dark stage.',
    caseStudy: { mission: 'Build excitement on the day of Law Ball 2024.', execution: 'Fairy-tale theme carried by a single enchanted-rose motif, soft glow type and a slow reveal.', ...todo },
    published: true,
    confirmed: true,
  },
  {
    id: 'jd-international-ball-story',
    title: 'JD/PG & International Law Ball — 1 Week to Go',
    org: 'UNSW Law Society',
    type: 'Instagram story (animated)',
    categories: ['Events', 'Social Media'],
    date: '11 October 2024',
    thumb: '/portfolio/jd-international-ball-story-thumb.jpg',
    media: [story('jd-international-ball-story', 'Animated countdown story: dark silk background, glowing title “JD/PG & International Law Ball”, script “A Gilded Masquerade”, “1 week to go”, L’Aqua Darling Harbour, 11 October 2024.')],
    role: 'Designer — as Marketing Director, UNSW Law Society (2024)',
    tools: ['Canva', 'Photoshop'],
    summary: 'Countdown story for “A Gilded Masquerade” at L’Aqua Darling Harbour. Dark silk, glowing serif and an elegant script, counting down to the ball.',
    caseStudy: { mission: 'Count down to the JD/PG & International Law Ball.', execution: 'Monochrome silk texture, glowing type and a big countdown numeral for a premium, masquerade feel.', ...todo },
    published: true,
    confirmed: true,
  },
  {
    id: 'the-rager',
    title: 'The Rager',
    org: 'Personal',
    type: 'Party invite',
    categories: ['Graphic Design', 'Other'],
    date: 'Sat 14 Nov',
    thumb: '/portfolio/the-rager-thumb.jpg',
    media: [cover('the-rager', 'Party invite styled as a group chat with notification cards, red cups, snacks and drinks around a photo of a crowded house party.')],
    role: 'Designer & host',
    tools: null,
    summary: 'A personal house-party invite designed as a phone group chat, surrounded by sticker-style cut-outs and notifications.',
    caseStudy: { mission: null, execution: null, ...todo },
    // Hidden by default: personal party with alcohol branding — your call whether it goes public.
    published: false,
    confirmed: false,
  },
]

export const publishedPortfolio = portfolio.filter((p) => p.published)
