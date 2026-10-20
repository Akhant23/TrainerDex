/**
 * The Photo Album: 10 moments, chosen from Aaryan's "Photos for Pokedex" set.
 * Files live in public/photos/ (1600px, EXIF/GPS stripped) with -thumb.jpg versions for the grid.
 * Originals: content-source/photos-zip/ (git-ignored).
 */
export interface Photo {
  src: string
  thumb: string
  width: number
  height: number
  title: string
  caption: string
  category: string
  /** Optional, free text e.g. "March 2025". */
  date?: string
  /** One playful line in Dex voice. */
  dexEntry: string
  alt: string
}

export const ALBUM_SIZE = 10

const p = (file: string, width: number, height: number) => ({ src: `/photos/${file}.jpg`, thumb: `/photos/${file}-thumb.jpg`, width, height })

export const photos: Photo[] = [
  {
    ...p('01-golden-hour', 1066, 1600),
    title: 'Golden Hour',
    caption: 'On the sand just after sunset.',
    category: 'Portrait',
    dexEntry: 'Most often sighted at dusk, when the light is doing all the work.',
    alt: 'Aaryan standing on a beach at sunset in a dark jacket, sea and pastel sky behind him.',
  },
  {
    ...p('02-law-ball', 1202, 1600),
    title: 'Law Ball Night',
    caption: 'UNSW Law Ball 2024, “Tale As Old As Time”, at Sydney Town Hall — the same night as the “See you tonight” story in his portfolio.',
    category: 'Law & Society',
    date: '20 September 2024',
    dexEntry: 'Celebrates a successful campaign with a high five. Very effective.',
    alt: 'Aaryan in a black shirt and tie high-fiving a friend beside a “Tale as Old as Time — UNSW Law Ball — 20 Sep 24” welcome sign in an ornate hall.',
  },
  {
    ...p('03-tour-bags', 1200, 1600),
    title: 'O-Week HQ',
    caption: 'In a Yellow Shirts tee, lying on a mountain of O-Week tour bags.',
    category: 'Leadership',
    dexEntry: 'Tour bags for 3,000+ first-years have to go somewhere. It chose to nap on them.',
    alt: 'Aaryan smiling, lying back on a huge pile of cream O-Week drawstring bags, wearing a yellow “Need help? Yellow Shirts” T-shirt.',
  },
  {
    ...p('04-law-camp', 1200, 1600),
    title: 'Law Camp 2026',
    caption: 'Tropical night at Law Camp 2026, with fellow camp leaders.',
    category: 'Community',
    date: '2026',
    dexEntry: 'Returns to First Year Camp every year. Leis optional, palm trees inflatable.',
    alt: 'Aaryan in white linen with three friends in front of a “Law Camp 2026” sign decorated with pineapples, fairy lights and inflatable palm trees.',
  },
  {
    ...p('05-merch-shoot', 1066, 1600),
    title: 'Lookbook',
    caption: 'In front of the lens at a studio shoot.',
    category: 'Creative',
    dexEntry: 'Comfortable on both sides of the camera.',
    alt: 'Aaryan posing in a lavender hoodie against a plain white studio backdrop.',
  },
  {
    ...p('06-twenty-first', 1600, 1066),
    title: 'The Big 2-1',
    caption: 'Aaryan’s 21st, with the boys in traditional dress.',
    category: 'Milestone',
    dexEntry: 'Evolved at level 21.',
    alt: 'Aaryan in a cream sherwani at the centre of a group of friends in kurtas, arms around each other, in front of a floral arch and a “Happy 21st” sign.',
  },
  {
    ...p('07-kit-check', 1600, 1200),
    title: 'Kit Check',
    caption: 'Matching energy, different kits.',
    category: 'Football',
    dexEntry: 'Team kit equipped. Ready for kick-off.',
    alt: 'Aaryan in a white Spider-Man style jersey posing with a friend in a red-and-blue football jersey in a living room.',
  },
  {
    ...p('08-player-two', 1200, 1600),
    title: 'Player Two',
    caption: 'Diamond sword in hand, football game on the big screen.',
    category: 'Gaming',
    dexEntry: 'Equipped: one (1) diamond sword. Attack rose sharply!',
    alt: 'Aaryan in glasses holding a large pixelated diamond sword prop in front of a projector screen showing a football video game.',
  },
  {
    ...p('09-disco', 1200, 1600),
    title: 'Disco Mode',
    caption: 'White shirts, sunglasses indoors, one disco ball.',
    category: 'Friends',
    dexEntry: 'Gains a speed boost whenever a disco ball is present.',
    alt: 'Aaryan in sunglasses, white shirt and tie, carrying a friend on his shoulders under a disco-ball balloon and green party lights.',
  },
  {
    ...p('10-side-quest', 1200, 1600),
    title: 'Side Quest',
    caption: 'A very tall stack of pancakes, documented properly.',
    category: 'Food',
    dexEntry: 'Side quest accepted. Reward: dessert.',
    alt: 'Aaryan in glasses smiling and holding up a plate with a tall stack of fluffy pancakes topped with fruit.',
  },
]
