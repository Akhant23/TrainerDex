# Gen V visual audit

Where the site stands against Pokémon Black and White's visual principles, what the reference
standard is, and what's still open. Updated 22 Oct 2026.

## Ground rules

- **All art is original and generated in code.** The creatures, moves and trainers are the site's
  own; nothing from the Nintendo games is imported or redistributed. Original BW sprites are used
  only as *viewing references* for proportions, outlines, shading and animation behaviour.
- **One renderer.** Battle sprites are pixel strips stepped by CSS `steps()` (no tweening); the
  Battle Resort is a 2.5D canvas renderer (`src/resort/render.ts`); move effects are canvas recipes
  (`src/battle/fx.ts`). No second engine.
- **Remotion** is not installed in this project or this Claude Code environment (no package, plugin
  or skill). It would suit offline previews or demo videos only, not the interactive renderer, so
  nothing depends on it. The existing preview tooling is `npm run sprites:export` (sprite sheets)
  and `npm run sprites:fx` (every move, frame by frame).

## Inventory

| System | Where | State |
|---|---|---|
| Creatures (15 species) | `src/sprites/creatures.ts` | Front + back art at 40×40 and 80×80, form shading, selective (tinted) outlines, held items |
| Creature idles | `idleFrames` + `CreatureSprite` | **Per-species** 4-frame loops (see below) with the breath on top |
| Moves (39 + Struggle) | `src/battle/fx.ts`, `BattleFx.tsx` | Per-move canvas recipes: anticipation, travel, impact, aftermath, attacker motion; misses, cleanup, reduced motion |
| Large trainer sprite | `src/sprites/character.ts` | Layered 80×120 (2× hi-res), BW proportions, shared limb builder, 5 idle gestures + breathing |
| Overworld walkers | `src/sprites/overworld.ts` | 48×64 shown at half size, adult proportions, 4 directions × 3 frames, riding pose |
| Flyers + riders | `src/sprites/flight.ts`, `src/resort/ambient.ts` | 3-layer wing cycles, saddle points, altitude-based depth scale shared by mount and rider |
| Resort world | `src/resort/*` | 2.5D perspective ground, depth-sorted buildings/people, sky band, day/night lighting |
| NPC state | `settleVisitors` in `maps.ts` | Spots persist across arrivals/departures (landing no longer reshuffles anyone) |
| UI | `src/styles/index.css` (`gv-*`) | BW-style panels, HUDs, text boxes, Pixel font |

## Reference standard (from original BW sprites)

- **Battle sprites:** dark *tinted* outlines rather than pure black, 3–4 tones per material,
  occasional dither on large flat areas, silhouettes readable at 1×.
- **Idle animation:** the body stays put; *parts* move on their own (Charizard's wings beat to
  different heights and its tail flame changes shape every frame; small Pokémon flick tails and
  ears). Not a whole-sprite float or scale.
- **Overworld trainers:** compact but adult-proportioned, heavy outer outline, lighter inner lines,
  clear 3-frame walk.
- **Battle trainers:** larger, more detailed art made separately, never an enlarged walker.
- **Moves:** each type has its own visual language and timing: physical moves lunge and land,
  projectiles travel and burst, status moves stay on the user (auras, symbols).

## Creature idle motions

| Species | Idle |
|---|---|
| Gavelion | mane spikes bristle; tail tuft sways (back) |
| Helixor | the helix twist travels up its body |
| Brushfox | paint-tipped tail sways |
| Subwoof | speaker cone pulses, sound marks pulse; tail wags (back) |
| Strikaroo | tail lifts, an ear twitches |
| Hootour | ear tufts quiver, it glances about |
| Byterat | cable tail flicks, an ear twitches |
| Beakerbun | bubbles rise, liquid sloshes, an ear twitches |
| Riffin | free flipper strums |
| Wicketoad | throat sac swells; eye bump twitches (back) |
| Campfly | wings buzz, lantern glow pulses |
| Megaphawk | wings lift, crest sways, megaphone crackles |
| Stitchick | glances side to side; taps a foot (back) |
| Diplomoth | wings flutter |
| Datadillo | tail flicks, a pulse runs down its circuits |

Frame 0 is always the still art, so icons, the Pokédex and reduced motion are unchanged; tests
check every species and view.

## Open gaps

- **Per-species attack poses.** Move recipes animate the attacker's position (lunge, jump, dive,
  cast) but creatures don't change pose mid-attack. BW mostly does the same, but some species
  could get a wind-up frame.
- **Idle length.** Idles are 4-frame loops; BW's are often 30–90 frames. Longer loops (an
  occasional blink or a bigger gesture) would need a frame scheduler like the trainer's
  `useGestures`.
- **Battle backgrounds and the overworld tileset** were overhauled in earlier passes; they haven't
  been re-compared against BW screenshots in this pass.
- **References not reachable from here:** The Spriters Resource sits behind a human check and
  YouTube footage can't be reviewed frame by frame from this environment, so move timing hasn't been
  compared against original footage.
