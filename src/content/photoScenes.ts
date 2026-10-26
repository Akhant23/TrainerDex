/**
 * Pixel-art versions of the Photo Album, one per photo (keyed by the photo's id).
 *
 * Each scene recreates its photo with the site's own character model rather than a filter: who is
 * in it, what they're wearing, how they're standing and what they're holding, against a simple
 * painted backdrop. Aaryan's outfit and pose come from that photo; friends appear as unnamed
 * trainers in the outfits they wear in the shot. Scenes are drawn as upper-body portraits (head to
 * waist) on a 240×150 canvas at the 2× character density, and rendered by ui/PhotoPortrait.tsx.
 *
 * Add a scene for a new photo here; photos without one show a "not yet drawn" plate instead.
 */
import type { Appearance, PoseFrame } from '../sprites/character'
import { HANDS_BEHIND_HEAD } from '../sprites/gestures'
import type { Outfit } from '../sprites/shirtPrints'
import { signature } from './aaryan'

export type SceneBackdrop = 'windows' | 'hall' | 'bags' | 'camp' | 'studio' | 'party' | 'lounge' | 'cinema' | 'cafe' | 'street' | 'store' | 'forest' | 'concert' | 'shelter'
export type SceneProp = 'sign' | 'bagPile' | 'palm' | 'discoBall' | 'partyLights' | 'stringLights' | 'sword' | 'pancakes' | 'gummy' | 'phone' | 'freezer' | 'arch'

export interface CastMember {
  look: Appearance
  pose?: PoseFrame
  /** sprite centre, in scene pixels (0–240) */
  x: number
  /** top of the sprite, in scene pixels (smaller = higher; 8 frames the head nicely) */
  y?: number
  /** face the other way */
  flip?: boolean
  /** drawing order: higher is nearer */
  z?: number
  /** this is Aaryan (for the accessible description) */
  me?: boolean
  /** a printed shirt, long undersleeves or gloves from the photo (sprites/shirtPrints.ts) */
  outfit?: Outfit
}

export interface PhotoScene {
  backdrop: SceneBackdrop
  cast: CastMember[]
  props?: Array<{ id: SceneProp; x: number; y: number; front?: boolean; flip?: boolean }>
  /** one line describing the pixel art, for screen readers */
  alt: string
}

/** Aaryan without the everyday extras; each scene adds what that photo shows. */
const me = (o: Partial<Appearance>): Appearance => ({ ...signature, accessories: [], ...o })
const friend = (o: Partial<Appearance>): Appearance => ({
  skin: 'tan', hair: 'short', hairColour: 'black', eyes: 'round', eyeColour: 'dark', face: 'smile',
  top: 'tee', topColour: 'white', accentColour: 'white', hat: 'none', hatColour: 'black',
  bottom: 'jeans', bottomColour: 'black', shoes: 'sneakers', shoeColour: 'black', accessories: [], ...o,
})

/* poses shared by several scenes */
const highFive: PoseFrame = { back: { el: [17, 36], wr: [13, 23], hand: 'open' }, mouth: 'grin' }
const handsBehindHead: PoseFrame = { ...HANDS_BEHIND_HEAD, mouth: 'grin' }
// the arm at its idle length: elbow up and out, the hand behind the neck (under the head layer)
const handOnNeck: PoseFrame = { front: { el: [59.8, 31], wr: [49.2, 27], hand: 'fist' }, mouth: 'calm' }
const bothForward: PoseFrame = { back: { el: [25, 53], wr: [33, 50], hand: 'fist' }, front: { el: [55, 53], wr: [47, 50], hand: 'fist' }, mouth: 'grin' }
const fingerGuns: PoseFrame = { back: { el: [21, 52], wr: [27, 47], hand: 'pointOut' }, front: { el: [59, 52], wr: [52, 47], hand: 'pointOut' }, mouth: 'smirk', brow: 'up' }
const armUp: PoseFrame = { front: { el: [60, 32], wr: [62, 18], hand: 'pointOut' }, mouth: 'grin' }
const armAround: PoseFrame = { front: { el: [64, 40], wr: [76, 36], hand: 'fist' } }
// one arm raised high, holding the phone up beside his head to frame the view (his face stays clear)
const phoneUp: PoseFrame = { front: { el: [59.5, 32], wr: [58, 22.5], hand: 'fist' }, mouth: 'calm' }
const glovesUp: PoseFrame = { back: { el: [15, 34], wr: [17, 21], hand: 'open' }, front: { el: [65, 34], wr: [63, 21], hand: 'open' }, mouth: 'calm' }
const peace: PoseFrame = { front: { el: [58, 51], wr: [50, 48], hand: 'open' }, mouth: 'smirk' }
const armsCrossed: PoseFrame = { back: { el: [25, 53], wr: [47, 51], hand: 'hidden' }, front: { el: [55, 53], wr: [33, 51], hand: 'fist' }, mouth: 'calm' }
const downAtSnack: PoseFrame = { back: { el: [26, 54], wr: [36, 52], hand: 'fist' }, front: { el: [54, 54], wr: [44, 52], hand: 'fist' }, eyes: 'down', tilt: 1, mouth: 'calm' }

export const photoScenes: Record<string, PhotoScene> = {
  '01-headshot': {
    backdrop: 'windows',
    cast: [{ me: true, x: 120, look: me({ hair: 'wavy', top: 'shirt', topColour: 'white', accentColour: 'white', face: 'grin', bottom: 'slacks' }) }],
    alt: 'Pixel-art me in a crisp white shirt, smiling, in front of tall bright windows.',
  },
  '02-with-rehan': {
    backdrop: 'street',
    cast: [
      { me: true, x: 88, y: 18, look: me({ top: 'hoodie', topColour: 'black', accentColour: 'black', accessories: ['chain'] }), pose: armsCrossed },
      { x: 160, look: friend({ skin: 'tan', hair: 'curtains', top: 'jacket', topColour: 'black', accessories: ['glasses'], face: 'calm' }), pose: { back: { el: [16, 25], wr: [6, 9], hand: 'open' } }, z: 1 },
    ],
    alt: 'Pixel-art me in a black jacket and chain, arms crossed, with a friend in a black puffer leaning an arm over my head at night.',
  },
  '03-tour-bags': {
    backdrop: 'bags',
    cast: [{ me: true, x: 120, y: 18, look: me({ top: 'tee', topColour: 'yellow', accentColour: 'black', bottom: 'joggers' }), pose: handsBehindHead }],
    props: [{ id: 'bagPile', x: 120, y: 132, front: true }],
    alt: 'Pixel-art me in a yellow Yellow Shirts tee, hands behind my head, sinking into a pile of O-Week tour bags.',
  },
  '04-law-ball': {
    backdrop: 'hall',
    cast: [
      { x: 64, look: friend({ skin: 'light', hair: 'short', top: 'suit', topColour: 'black', accentColour: 'black', bottom: 'slacks', shoes: 'formal' }), pose: { back: { el: [17, 36], wr: [13, 23], hand: 'open' }, mouth: 'grin' }, flip: true },
      { me: true, x: 160, look: me({ top: 'shirt', topColour: 'black', accentColour: 'maroon', bottom: 'slacks', shoes: 'formal' }), pose: highFive, z: 1 },
    ],
    props: [{ id: 'sign', x: 110, y: 104, front: true }],
    alt: 'Pixel-art me in a black shirt and maroon tie high-fiving a friend in a dark suit beside the Law Ball welcome sign.',
  },
  '05-merch-shoot': {
    backdrop: 'studio',
    cast: [{ me: true, x: 120, look: me({ hair: 'wavy', top: 'hoodie', topColour: 'lavender', accentColour: 'lavender', bottom: 'joggers' }), pose: handOnNeck }],
    alt: 'Pixel-art me in a lavender hoodie with a hand on the back of my neck, against a plain studio backdrop.',
  },
  '06-twenty-first': {
    backdrop: 'party',
    cast: [
      { x: 52, look: friend({ skin: 'tan', hair: 'short', top: 'shirt', topColour: 'green', accentColour: 'green' }), pose: armAround },
      { x: 188, look: friend({ skin: 'brown', hair: 'curly', top: 'shirt', topColour: 'teal', accentColour: 'teal', accessories: ['glasses'] }), flip: true, pose: armAround },
      { me: true, x: 120, look: me({ hair: 'wavy', top: 'blazer', topColour: 'tan', accentColour: 'tan', face: 'grin' }), z: 1 },
    ],
    props: [{ id: 'arch', x: 120, y: 4 }],
    alt: 'Pixel-art me in a cream sherwani at my 21st, arms round two friends in kurtas under a floral arch.',
  },
  '07-kit-check': {
    backdrop: 'lounge',
    cast: [
      { x: 70, look: friend({ skin: 'brown', hair: 'curly', top: 'tee', topColour: 'red' }), outfit: { print: 'webStripes', underSleeves: 'black' }, pose: bothForward },
      { me: true, x: 166, look: me({ top: 'tee', topColour: 'white', bottom: 'joggers', accessories: ['chain'] }), outfit: { print: 'spiderJersey', underSleeves: 'black' }, pose: fingerGuns, z: 1 },
    ],
    alt: 'Pixel-art me in a white jersey with a big navy spider, black sleeves underneath, striking a pose next to a friend in a red-and-navy striped kit.',
  },
  '08-aml-group': {
    backdrop: 'party',
    cast: [
      { x: 34, look: friend({ skin: 'brown', hair: 'short', top: 'blazer', topColour: 'navy', accentColour: 'red', hat: 'bucket', hatColour: 'white', face: 'calm', bottom: 'slacks', shoes: 'formal' }) },
      { x: 78, look: friend({ skin: 'deep', hair: 'curly', top: 'suit', topColour: 'black', accentColour: 'pink', accessories: ['sunglasses'], face: 'smirk', bottom: 'slacks', shoes: 'formal' }) },
      { x: 166, look: friend({ skin: 'brown', hair: 'curly', top: 'shirt', topColour: 'black', accentColour: 'black', face: 'grin', bottom: 'slacks', shoes: 'formal' }) },
      { x: 208, look: friend({ skin: 'light', hair: 'wavy', top: 'shirt', topColour: 'white', accentColour: 'white', face: 'smile', bottom: 'slacks', bottomColour: 'navy', shoes: 'formal' }), flip: true, pose: armAround },
      { me: true, x: 120, y: 14, look: me({ top: 'suit', topColour: 'black', accentColour: 'lavender', face: 'grin', bottom: 'slacks', shoes: 'formal', accessories: ['earring', 'watch'] }), z: 1 },
    ],
    alt: 'Pixel-art me in a black suit and purple tie, grinning at the front of the AML crew in suits and ties, one in a white hat.',
  },
  '09-law-camp': {
    backdrop: 'camp',
    cast: [
      { x: 38, look: friend({ skin: 'tan', hair: 'long', top: 'tank', topColour: 'tan', bottom: 'skirt', bottomColour: 'tan' }) },
      { x: 92, look: friend({ skin: 'light', hair: 'long', top: 'tank', topColour: 'orange', bottom: 'shorts', bottomColour: 'white' }), z: 1 },
      { me: true, x: 150, look: me({ hair: 'wavy', top: 'shirt', topColour: 'white', accentColour: 'white', face: 'grin' }), z: 1 },
      { x: 204, look: friend({ skin: 'light', hair: 'short', top: 'tee', topColour: 'red', accentColour: 'green' }), pose: armAround },
    ],
    props: [{ id: 'stringLights', x: 120, y: 2 }, { id: 'palm', x: 10, y: 150, front: true }, { id: 'palm', x: 230, y: 150, front: true, flip: true }],
    alt: 'Pixel-art me in white linen with three friends at Law Camp, under fairy lights between two inflatable palm trees.',
  },
  '10-disco': {
    backdrop: 'party',
    cast: [
      { x: 120, y: -14, look: friend({ skin: 'brown', hair: 'curtains', top: 'shirt', topColour: 'white', accentColour: 'white', accessories: ['sunglasses'], face: 'grin' }), pose: armUp },
      { me: true, x: 118, y: 52, look: me({ top: 'shirt', topColour: 'white', accentColour: 'black', accessories: ['sunglasses'], face: 'grin' }), pose: { back: { el: [16, 50], wr: [14, 40], hand: 'fist' }, mouth: 'grin' }, z: 1 },
    ],
    props: [{ id: 'partyLights', x: 120, y: 30 }, { id: 'discoBall', x: 64, y: 10 }],
    alt: 'Pixel-art me in sunglasses, white shirt and black tie, carrying a friend on my shoulders under a disco ball.',
  },
  '11-side-quest': {
    backdrop: 'cafe',
    cast: [{ me: true, x: 120, look: me({ top: 'tee', topColour: 'white', accentColour: 'white', accessories: ['glasses'], face: 'grin' }), pose: bothForward }],
    props: [{ id: 'pancakes', x: 120, y: 122, front: true }],
    alt: 'Pixel-art me in glasses, grinning over a plate of tall fluffy pancakes topped with fruit.',
  },
  '12-gummy-bear': {
    backdrop: 'store',
    cast: [{ me: true, x: 112, y: 16, look: me({ top: 'hoodie', topColour: 'black', accentColour: 'black', accessories: ['chain'] }), pose: downAtSnack }],
    props: [{ id: 'freezer', x: 120, y: 34 }, { id: 'gummy', x: 112, y: 138, front: true }],
    alt: 'Pixel-art me in a black hoodie outside a convenience store at night, looking down at a giant gummy bear.',
  },
  '13-hike': {
    backdrop: 'forest',
    cast: [{ me: true, x: 120, y: 12, look: me({ top: 'tee', topColour: 'white', accentColour: 'white', accessories: ['bag'] }), pose: phoneUp }],
    props: [{ id: 'phone', x: 154, y: 36, front: true }],
    alt: 'Pixel-art me in a white tee with a crossbody bag, holding my phone up high beside my head to snap a rainforest waterfall.',
  },
  '14-front-row': {
    backdrop: 'concert',
    cast: [
      { me: true, x: 82, look: me({ top: 'tee', topColour: 'white', accessories: ['bag'] }), outfit: { print: 'webTee' } },
      { x: 162, look: friend({ skin: 'brown', hair: 'short', top: 'tee', topColour: 'black', accessories: ['bag', 'chain', 'bracelet'], face: 'smirk' }), outfit: { print: 'redStripes' }, pose: peace, z: 1 },
    ],
    alt: 'Pixel-art me in a white tee printed all over with a black spider web, and a friend in a black jersey with red stripes throwing up a peace sign in a crowd under stage lights.',
  },
  '15-blonde-wig': {
    backdrop: 'shelter',
    cast: [{ me: true, x: 120, look: me({ hair: 'long', hairColour: 'blonde', top: 'tee', topColour: 'white', accessories: ['chain'] }), outfit: { print: 'animeJersey', gloves: 'white' }, pose: glovesUp }],
    alt: 'Pixel-art me in a bright blonde wig, white gloves and a pastel anime jersey with pink sleeves, both hands up, under a picnic shelter.',
  },
}
