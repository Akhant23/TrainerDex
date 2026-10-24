/**
 * The Photo Album: 15 moments, chosen from Aaryan's "Photos for Pokedex" set (plus his LinkedIn headshot).
 * Files live in public/photos/ (1600px, EXIF/GPS stripped) with -thumb.jpg versions for the grid.
 * Originals: content-source/photos-zip/ (git-ignored).
 */
export interface Photo {
  /** stable id (the file name), used to look up the photo's pixel-art portrait (photoScenes.ts) */
  id: string
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

export const ALBUM_SIZE = 15

const p = (file: string, width: number, height: number) => ({ id: file, src: `/photos/${file}.jpg`, thumb: `/photos/${file}-thumb.jpg`, width, height })

export const photos: Photo[] = [
  {
    ...p('01-headshot', 1194, 1600),
    title: 'Headshot',
    caption: 'The professional profile photo — white shirt, big smile.',
    category: 'Portrait',
    dexEntry: 'Its LinkedIn form. Evolves into its casual form after 5 pm.',
    alt: 'Me smiling in a crisp white button-up shirt, standing in front of tall windows in a bright modern building.',
  },
  {
    ...p('02-law-ball', 1202, 1600),
    title: 'Law Ball Night',
    caption: 'UNSW Law Ball 2024, “Tale As Old As Time”, at Sydney Town Hall — the same night as the “See you tonight” story in my portfolio.',
    category: 'Law & Society',
    date: '20 September 2024',
    dexEntry: 'Celebrates a successful campaign with a high five. Very effective.',
    alt: 'Me in a black shirt and tie high-fiving a friend beside a “Tale as Old as Time — UNSW Law Ball — 20 Sep 24” welcome sign in an ornate hall.',
  },
  {
    ...p('03-tour-bags', 1200, 1600),
    title: 'O-Week HQ',
    caption: 'In a Yellow Shirts tee, lying on a mountain of O-Week tour bags.',
    category: 'Leadership',
    dexEntry: 'Tour bags for 3,500 first-years have to go somewhere. It chose to nap on them.',
    alt: 'Me smiling, lying back on a huge pile of cream O-Week drawstring bags, wearing a yellow “Need help? Yellow Shirts” T-shirt.',
  },
  {
    ...p('04-law-camp', 1200, 1600),
    title: 'Law Camp 2026',
    caption: 'Tropical night at Law Camp 2026, with fellow camp leaders.',
    category: 'Community',
    date: '2026',
    dexEntry: 'Returns to First Year Camp every year. Leis optional, palm trees inflatable.',
    alt: 'Me in white linen with three friends in front of a “Law Camp 2026” sign decorated with pineapples, fairy lights and inflatable palm trees.',
  },
  {
    ...p('05-merch-shoot', 1066, 1600),
    title: 'Lookbook',
    caption: 'In front of the lens at a studio shoot.',
    category: 'Creative',
    dexEntry: 'Comfortable on both sides of the camera.',
    alt: 'Me posing in a lavender hoodie against a plain white studio backdrop.',
  },
  {
    ...p('06-twenty-first', 1600, 1066),
    title: 'The Big 2-1',
    caption: 'My 21st, with the boys in traditional dress.',
    category: 'Milestone',
    dexEntry: 'Evolved at level 21.',
    alt: 'Me in a cream sherwani at the centre of a group of friends in kurtas, arms around each other, in front of a floral arch and a “Happy 21st” sign.',
  },
  {
    ...p('07-kit-check', 1600, 1200),
    title: 'Kit Check',
    caption: 'Matching energy, different kits.',
    category: 'Football',
    dexEntry: 'Team kit equipped. Ready for kick-off.',
    alt: 'Me in a white Spider-Man style jersey posing with a friend in a red-and-blue football jersey in a living room.',
  },
  {
    ...p('08-player-two', 1200, 1600),
    title: 'Player Two',
    caption: 'Diamond sword in hand, football game on the big screen.',
    category: 'Gaming',
    dexEntry: 'Equipped: one (1) diamond sword. Attack rose sharply!',
    alt: 'Me in glasses holding a large pixelated diamond sword prop in front of a projector screen showing a football video game.',
  },
  {
    ...p('09-disco', 1200, 1600),
    title: 'Disco Mode',
    caption: 'White shirts, sunglasses indoors, one disco ball.',
    category: 'Friends',
    dexEntry: 'Gains a speed boost whenever a disco ball is present.',
    alt: 'Me in sunglasses, white shirt and tie, carrying a friend on my shoulders under a disco-ball balloon and green party lights.',
  },
  {
    ...p('10-side-quest', 1200, 1600),
    title: 'Side Quest',
    caption: 'A very tall stack of pancakes, documented properly.',
    category: 'Food',
    dexEntry: 'Side quest accepted. Reward: dessert.',
    alt: 'Me in glasses smiling and holding up a plate with a tall stack of fluffy pancakes topped with fruit.',
  },
  {
    ...p('11-with-rehan', 1600, 1200),
    title: 'Night Out',
    caption: 'Out with Rehan on a winter night.',
    category: 'Friends',
    date: '15 August 2026',
    dexEntry: 'Travels in pairs after dark. Puffer jackets increase DEFENCE against the cold.',
    alt: 'Me and my friend Rehan in black jackets posing together outside a lit-up venue at night.',
  },
  {
    ...p('12-gummy-bear', 1600, 1200),
    title: 'Midnight Snack',
    caption: 'Just after midnight, holding a giant gummy bear.',
    category: 'Friends',
    date: '16 August 2026',
    dexEntry: 'Recovers HP after midnight by consuming one (1) gummy bear.',
    alt: 'Me in a black hoodie sitting on a ledge outside a convenience store at night, holding a large gummy bear in a packet, an ice-cream freezer behind me.',
  },
  {
    ...p('13-hike', 1200, 1600),
    title: 'Trail Shot',
    caption: 'Stopping mid-hike to photograph a waterfall gully.',
    category: 'Outdoors',
    date: '26 September 2026',
    dexEntry: 'Can’t pass a good view without catching it on camera first.',
    alt: 'Me in a white T-shirt with a crossbody bag, raising my phone to take a photo in a shaded rainforest gully with sunlight and falling water.',
  },
  {
    ...p('14-front-row', 1600, 1200),
    title: 'Front Row',
    caption: 'In the crowd, deep in the night, peace signs up.',
    category: 'Friends',
    date: '3 October 2026',
    dexEntry: 'Thrives in loud crowds. Phone torches raise its SPEED.',
    alt: 'Two friends posing in a packed, dark crowd under stage lights — one in a white spider-web tee, one in a red sports jersey giving a peace sign.',
  },
  {
    ...p('15-blonde-wig', 1600, 1200),
    title: 'Golden Era',
    caption: 'A blonde wig, white gloves and complete commitment to the bit.',
    category: 'Just for Fun',
    date: 'October 2024',
    dexEntry: 'Changes form for special occasions. This one was a big swing.',
    alt: 'Me in a bright blonde wig, white gloves and a pink-and-white anime jersey, posing under a picnic shelter.',
  },
]
