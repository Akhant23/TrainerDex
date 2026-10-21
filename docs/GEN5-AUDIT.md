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

## Third pass (compact walkers, staging, poses, idles, scenery)

### Attack poses by species

| Species | Status | Pose |
|---|---|---|
| Byterat | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED | crouch, ears flat → bite |
| Megaphawk | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED | wings up → megaphone blast |
| Gavelion | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED | mane bristles → roar |
| Helixor | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED (subtle) | coils → springs up, tongue out |
| Brushfox | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED | tail cocked → brush sweep |
| Subwoof | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED (subtle) | cone draws in → pushes out |
| Strikaroo | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED | tail high → kick |
| Beakerbun | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED (subtle) | liquid churns → bubbles burst |
| Riffin | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED | flipper up → strum |
| Wicketoad | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED | sac swells → empties |
| Campfly | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED | lantern blazes → wings snap down |
| Diplomoth | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED | wings spread → fold for the gust |
| Hootour | FALLBACK ANIMATION USED, ARTWORK REQUIRED | the held flag would have to move with the wing |
| Stitchick | FALLBACK ANIMATION USED, ARTWORK REQUIRED | needle and thread in the wing |
| Datadillo | FALLBACK ANIMATION USED, ARTWORK REQUIRED | a rolled-up ball form |

All poses are original art drawn for this site, checked in enlarged previews
(`docs/qa/creature-poses-gestures.png`, `creature-poses-batch2.png`); there are no original-game
attack frames for these creatures to compare against.

### Idle animations

Repetition came mainly from the base loop playing uninterrupted (only 4 species had gestures),
not from the loop length. **Artwork:** loops are still 4 frames; no frames were duplicated to
fake length. **Scheduling:** 12 of 15 species now blink now and then (8 added this pass) and 4 also
have a bigger gesture; every sprite loops at its own speed and phase; gestures yield while that
creature acts and resume after. Beakerbun, Diplomoth and Datadillo have no blink (their eyes are
1–2 px marks that can't close convincingly).

### Overworld (vs Accumula Town, Route 1, a Pokémon Center)

| Aspect | Result |
|---|---|
| Walker proportions | Redesigned to BW's compact build (GEN5-SPRITES.md). Measured from footage: approximate. |
| Tree foliage | Rebuilt as dense, scalloped leaf clumps lit upper-left (was three big blobs). Compared visually. |
| Building contact shading | Added: two stepped bands along each building's base outdoors. Compared visually. |
| Character-to-building scale | Walkers ~1½ tiles; doors and buildings unchanged. Consistent with the footage. |
| Tile palette and seams | UNVERIFIED: not compared side by side; no change. |
| Ledge shading | UNVERIFIED: the plaza has no ledges like Accumula's raised plaza. |

### Battle backgrounds

The backdrops are deliberately location-specific: each battle shows the real map behind it.
They're not meant to reproduce particular BW environments, and they aren't claimed to.

| Backdrop | Location | Kind | Compared |
|---|---|---|---|
| Reception | tower lobby (quick battles) | deliberate location-specific | platform only (BW indoor-style floor disc); horizon and palette UNVERIFIED |
| Tower floors 1–5 | each floor's room | deliberate location-specific | platform only; UNVERIFIED |
| Plaza | the resort plaza (visitor challenges) | deliberate location-specific | platform only (stone); UNVERIFIED |

Foe platform at 44% of the field height and yours cut off by the bottom edge, as in the BW
footage frames.

## Open gaps

- Original BW overworld sprite sheets weren't reachable; walker numbers are footage-measured.
- Poses for Hootour, Stitchick and Datadillo need new artwork.
- Which BW moves dim the background was only observed for Electro Ball.
- Tile palette and seam fidelity, and each backdrop's horizon and palette, are unverified.
- Riders are mirrored when flying right (the walk cycle draws each side; the riding pose doesn't).
