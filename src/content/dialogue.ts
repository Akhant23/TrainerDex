/**
 * All in-game dialogue. `{name}` is replaced with the visitor's chosen name.
 */
export const dialogue = {
  introPart1: [
    'Welcome to the world of AARYAN!',
    'This world is inhabited by people with all kinds of stories, experiences and ambitions.',
    "Today, you're about to discover one of them.",
    'But first — what should I call you?',
  ],
  introPart2: ['{name}! Nice to meet you.', 'Your adventure begins now!'],

  /** Said when the trainer sprite on the main menu is clicked. */
  spriteReactions: [
    'Oh! Hey there, {name}!',
    "Careful — I bruise easily. I'm a law student.",
    'Have you checked the PC yet? My resume lives there.',
    'Fun fact: this jersey has a +10 boost to confidence.',
    "I'd challenge you to a battle, but the arena's still being built.",
  ],
  /** Unlocked by clicking the sprite this many times in a row. */
  secretClicks: 10,
  secretReaction: '...OK, you found it. There is no secret. Or IS there?',

  menuWelcome: 'Welcome back, {name}! Where to next?',
} as const

export function fill(line: string, name: string): string {
  return line.replaceAll('{name}', name)
}
