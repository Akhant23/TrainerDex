/**
 * In-game dialogue for the intro, menu and Pokédex. The words themselves live in dialogue.csv
 * (see script.ts); `{name}` is replaced with the visitor's chosen name.
 */
import { line, lines } from './script'

export const dialogue = {
  introPart1: lines('intro.part1'),
  introPart2: lines('intro.part2'),

  /** Said when the trainer sprite on the main menu is clicked. */
  spriteReactions: lines('menu.spriteReactions'),
  /** Unlocked by clicking the sprite this many times in a row. */
  secretClicks: 10,
  secretReaction: line('menu.secret'),

  /**
   * Pokédex Easter egg: 1 in `odds` chance when opening an entry. Three lines: he appears, one
   * of the vignettes (picked at random) says what he's up to, and he flees.
   */
  rareEncounter: {
    odds: 12,
    appear: line('pokedex.rareEncounter.appear'),
    vignettes: {
      charger: line('pokedex.rareEncounter.charger'),
      deadline: line('pokedex.rareEncounter.deadline'),
      valorant: line('pokedex.rareEncounter.valorant'),
    },
    fled: line('pokedex.rareEncounter.fled'),
  },

  menuWelcome: line('menu.welcome'),
}

export function fill(line: string, name: string): string {
  return line.replaceAll('{name}', name)
}
