# Gen V visual audit

Where the site stands against Pokémon Black and White's visual principles, what the reference
standard is, and what's still open. Updated 22 Oct 2026 (fifth pass: the departure; second pass: battle flow, poses, idle
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
| Hootour | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED (fourth pass; live-tested with LEAD BY EXAMPLE) | flag hoisted and leaned back → swept forward (the held item moves with the wing) |
| Stitchick | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED (fourth pass; previews and tests only: not on a reachable opponent team) | needle cocked back → jab |
| Datadillo | SPECIES-SPECIFIC POSE IMPLEMENTED AND VISUALLY CHECKED (fourth pass; previews and tests only) | head tucks in → rolls into an armoured ball (new original artwork) |

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
| Tile palette and seams | Fourth pass: compared against Route 1 (28:00) and Accumula Town (29:30). Paving now lays 2×2-tile slabs with faint joints (was a joint on every tile); grass picks one of four tuft patterns by position (was identical every 16 px); a 1-px curb where paving meets grass; paving nudged slightly toward Accumula's lavender-grey. Direct visual comparison, colour approximate (video). Grass and tree greens unchanged: the footage is in BW's autumn. |
| Ledge shading | UNVERIFIED: the plaza has no ledges like Accumula's raised plaza. |

### Battle backgrounds

The backdrops are deliberately location-specific: each battle shows the real map behind it.
They're not meant to reproduce particular BW environments, and they aren't claimed to.

| Backdrop | Location | Kind | Compared |
|---|---|---|---|
| Reception | tower lobby (quick battles) | deliberate location-specific | Fourth pass, against the general BW layout (no matching original environment): the foe's platform sat on the reception counter; the camera spot moved (y 8 → 10) so it rests on open floor. Horizon (back wall's floor line) ~30% height. Palette: own design, approximation. |
| Tower floors 1–5 | each floor's room | deliberate location-specific | Horizon ~30%, foe platform on open floor in front of the back wall, as in BW; no change. Palette: own design. |
| Plaza | the resort plaza (visitor challenges) | deliberate location-specific | The foe's platform sat over the fountain; camera spot moved (12,19 → 10,20) to open paving. Palette: own design. |

All backdrops: the static vignette was lightened (BW battle backgrounds are high-key; the darker
moments now come from the special-move dimming). Captures: `docs/qa/backdrops-before.jpg`,
`backdrops-after.jpg`. No backdrop reproduces a specific original environment, and none is claimed
to.

Foe platform at 44% of the field height and yours cut off by the bottom edge, as in the BW
footage frames.

## Leaving the resort by air (fifth pass)

BACK (on the resort screen) and EXIT (in the menu) now ask *Would you like to leave the Battle
Resort?* in the game's own dialogue box, YES / NO. NO closes the box and play carries on. YES
locks input and runs `src/resort/departure.ts`, a pure timeline driven by elapsed time:

| Phase | ms | What happens |
|---|---|---|
| prepare | 600 | the player turns towards the side the mount will come from; the follower goes back in its ball (a red-and-white flash) |
| approach | 2200 | the mount glides in from off-screen on that side, descending, and lands beside the player |
| boarding | 700 | the player hops onto the saddle in an arc (sixth pass: see below) |
| takeoff | 1100 | a gradual lift that carries on in the direction it faces; the shadow shrinks |
| flight | 2800 | on across the resort, bending north (away from the camera), smaller and higher, fading out over the last ~20% |
| complete | — | fade out, then the existing exit destination (`/`), exactly as before |

The mount is the first flyer in the party that can carry a rider (Megaphawk, Hootour,
Diplomoth), else Megaphawk. Indoors (no sky) and with reduced motion it fades straight out. The
timer is cleared on unmount, and the prompt can't reopen or the sequence run twice. The phase
timings are this site's own choice; BW2's Fly cut-in wasn't measured.

**Mount direction.** Flyers used to be drawn facing left and mirrored to fly right, which moved a
held item (Hootour's flag) to the far wing and put the light on the wrong side. Every flyer now
has native right-facing frames (`framesRight` in `flight.ts`), drawn through a mirroring grid
*before* shading, so the light stays upper-left and a held item is redrawn on the near wing.
Riders were already per-direction. Captures: `docs/qa/mounts-left-flipped-native.png` (left,
old mirror, new right for every flyer).

## Flight polish (sixth pass)

**Browser verification.** The in-app browser pane couldn't render: the Mac's session was locked
(`CGSSessionScreenIsLocked = 1`), so Chromium marked the page hidden and stopped animation frames
(0–3 per second). The site was tested instead in headless Chrome (a scratch profile, driven over
the DevTools protocol), where the page is visible at 60 fps and real key presses go through the
game's own input. Every capture below is the game's own canvas in that browser, not an offline
render. One quirk of that browser: it sometimes brings its own `chrome://settings/help` tab to
the front, which hides the game tab exactly like the locked screen; the driver closes it.

**Boarding without a pose jump.** Before, the player landed on the mount's back as the *standing*
sprite facing the mount, then was replaced by the seated rider facing the other way, ~10 px lower
(`docs/qa/departure-boarding-before.png`). Now the hop moves one point, the hips, from above the
player's feet to the saddle. The walking and riding sprites share the head and body rows (38 of
the 46 rows above the hip are identical) and put the hips on the same pixel, so drawing whichever
sprite with its hips on that point keeps the head and body still; only the legs change. In order:
a short crouch held on the ground (seventh pass: it used to start rising at once), the jump
(facing the mount, with their shadow staying on the ground and fading as they rise), a turn to
face the way it will fly at the top of the
arc, the change to the seated pose in the air just above the saddle (78% through the hop, drawn
between the wings like any rider), settling onto the saddle while the mount sinks one pixel under
the weight. Captures: `departure-boarding-after-right.png`, `departure-boarding-after-left.png`.

**Landing and dismounting (visiting trainers).** Travellers by air used to turn from mount+rider
into a standing walker the instant they touched down, and back again when leaving. They now use
the same timeline and hop (`arrivalAt` / `departureAt`): the mount lands beside their spot, they
hop forward off its back onto the spot, and it flies away empty; leaving, they turn to where the
mount will land, stay a normal (talkable) NPC until it has landed, hop on and fly off. At each
hand-over the hop and the walker overlap for 250 ms in the same place, so neither is missing for
a frame while the walker list updates (measured in the browser: the list updates 33 ms after the
hand-over). Captures: `visitor-landing.png`, `visitor-boarding.png`.

**Landing side.** The mount comes from the nearer map edge unless its two landing tiles there are
a wall, a tree, the map edge or someone standing (the first browser run from the left landed it on
an NPC); new visitors don't fly in during your own departure.

**Flying away (distance effect, not a rear view).** Only left- and right-facing flight art
exists. The battle *back* sprites were checked as a possible rear view: Megaphawk's and Hootour's
are perched poses with folded wings; Diplomoth's has spread wings but is 80×80 battle art at a
different scale, and there is no rider-from-behind art at all, so none is used. The existing
side-view flight was made to read better as "away": one continuous take-off + flight curve (no
stall at the phase change), sideways drift that eases off as the course bends north, size shrinking
in ~3% steps (exactly full size on the ground) so nearest-neighbour scaling doesn't shimmer, and a
fade over the last ~20% so it's gone when the sequence ends instead of popping out. Mount and rider
always share one scale and the saddle point, so the rider stays attached. **It is still the
side-view sprite: a convincing distance effect, not a rear-facing animation.** Captures:
`departure-flight-before.png`, `departure-flight-after-right.png`, `departure-flight-after-left.png`.

## Open gaps

- Original BW overworld sprite sheets weren't reachable; walker numbers are footage-measured.
- Which BW moves dim the background was only observed for Electro Ball.
- Tile and backdrop colours are compared against compressed video, so they're approximate.
- Flyers only fly left or right; the departure's flight away is a left/right flyer drifting north,
  shrinking and fading, not a true away-from-camera view (no rear-facing flight art exists).
- The departure's timing and sizes are this site's own; BW2's Fly sequence hasn't been measured
  (confidence record in GEN5-TIMING.md).
- The hop is two existing poses (walking frame, seated rider) moved along a path; there's no
  dedicated jump or swing-a-leg-over frame. Optional future enhancement: one original pixel-art
  frame for the jump (knees tucked) and one for swinging a leg over, drawn in `overworld.ts` like
  the riding pose; not needed for the hop to read at native size.
- The main menu's first mount after a page load drops one frame while its portrait encodes its
  layers (GEN5-TIMING.md, frame timing); outside the flight, not changed.
