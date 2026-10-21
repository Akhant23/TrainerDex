# Gen V visual audit

Where the site stands against Pokémon Black and White's visual principles, what the reference
standard is, and what's still open. Updated 22 Oct 2026 (second pass: battle flow, poses, idle
gestures, platforms; see GEN5-TIMING.md and QA-CHECKLIST.md).

## Ground rules

- **All art is original and generated in code.** The creatures, moves and trainers are the site's
  own; nothing from the Nintendo games is imported or redistributed. Original BW sprites are used
  only as *viewing references* for proportions, outlines, shading and animation behaviour.
- **One renderer.** Battle sprites are pixel strips stepped by CSS `steps()` (no tweening); the
  Battle Resort is a 2.5D canvas renderer (`src/resort/render.ts`); move effects are canvas recipes
  (`src/battle/fx.ts`). No second engine.
- **Remotion** is not installed in this project or this Claude Code environment (no package, plugin
  or skill); it lives in the owner's Cowork environment. It would suit offline previews or
  comparison videos only, not the interactive renderer, so nothing depends on it; the timing
  comparison used in-browser contact sheets instead (GEN5-TIMING.md). The existing preview tooling is `npm run sprites:export` (sprite sheets)
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

## Battle flow (second pass)

Measured against White 2 footage (GEN5-TIMING.md) and now matched in `Fight.tsx`:

- The HUD hides while a move plays; the camera pushes in on the attacker, cuts to the target just
  before the hit and eases back; damage (flicker + HP drain) follows the animation.
- Move effects and battler motion are stretched to Gen V pacing by kind (`tempoFor`).
- Attack poses (`src/battle/poses.ts`): Byterat (crouch → bite), Megaphawk (wings up → blast),
  Gavelion (bristle → roar), front and back views, damaging moves only. Everything else keeps
  the plain motion.
- Idle gestures (`IDLE_GESTURES`, scheduled by `src/ui/useCreatureIdle.ts`): blinks and one bigger
  gesture for Byterat, Megaphawk, Gavelion and Helixor; every creature's loop has its own speed
  and phase. Gestures start on the loop's rest frame, never overlap, pause while that creature
  acts or poses, and end cleanly when the tab hides.
- Battle platforms are opaque pixel-art discs matched to the ground (grass, stone, floor), as in
  BW, replacing translucent banded pads with a dark outline.

## Open gaps

- **Poses and gestures for the other species.** Only the test set has them; the system is
  validated, so extending it is per-species art work.
- **Charged special moves** run shorter than BW's (Electro Ball lands at ~2.4 s; the slowest
  recipe here lands at ~1.3 s), and BW's background dim for special moves isn't reproduced.
- **Idle length.** Loops are still 4 frames; variation comes from gestures, per-sprite timing and
  phase, not longer artwork.
- **Overworld** (compared against Accumula Town, Route 1 and a Pokémon Center from a Black
  longplay): camera tilt, depth sorting, contact shadows and character-to-building scale follow
  the same principles. Not changed this pass: BW's softer ledge/building contact shading, denser
  clustered tree foliage, and its walkers being chunkier than ours (ours were deliberately made
  more adult). UNVERIFIED in detail: tile palette and seams side by side.
- **Battle backgrounds** here are the real map behind the battle (reception, tower floors, plaza)
  rather than BW's generic environments; only the platforms were compared and changed. Each
  backdrop's horizon and palette are UNVERIFIED against a specific BW environment.
