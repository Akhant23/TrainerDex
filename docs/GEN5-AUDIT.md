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
always share one scale and the saddle point, so the rider stays attached. (Seventh pass: still
the side-view sprite. Superseded by the rear view below.) Captures: `departure-flight-before.png`,
`departure-flight-after-right.png`, `departure-flight-after-left.png`.

## Flying away, seen from behind (eighth pass)

**Audit.** The player's mount is the first rideable flyer in their party (Megaphawk, Hootour or
Diplomoth; Megaphawk when there's none, as with the starter party); visitors ride all three. Each
had left- and native right-facing side frames (3 layers: far wing, body, near wing; 4 wingbeat
frames; 56×40 base grid drawn at 2×, shown at 0.58–0.62 world px per art px, flight frames
120–140 ms (Diplomoth 110 ms)), and the rider had per-direction side poses (48×64, shown at 0.5 world px per art
px, hips at (24, 46) on the saddle). No rear-facing or alternate-perspective flight frames existed
anywhere in the project, and no unused ones; the battle back sprites are perched poses. No external
sprite library was tried this pass (they were unreachable before; nothing to compare a rear flying
pose against).

**New art (original, drawn in code for this site).**

- `framesBack` for Megaphawk, Hootour and Diplomoth (`src/sprites/flight.ts`: `megaphawkBack`,
  `hootourBack`, `diplomothBack`): the same canvas, palette, outline and form-shading pipeline as
  the side frames, 4 wingbeat frames on the same timing. Birds: both wings beat out to the sides
  (a V, a wide flat span, a droop, a half-folded recovery), the wing shape shared with the side
  view (`featherWing`), tail fanned toward you, feet tucked. Megaphawk's crest and the rim of its
  megaphone past the right of its head; Hootour's ear tufts, the scarf knotted round its neck with
  its tail down the back (as on its battle back sprite) and the flag in its talons on its right;
  Diplomoth's fore- and hindwings spread with their eye spots, antennae, white ruff, segmented
  abdomen and the placard hanging below, its blank back toward you. Parts are outlined separately
  and stacked so each keeps its edge where it crosses another. Not a mirror or rotation of anything.
- `riderBackFor` (`src/sprites/overworld.ts`): the trainer astride, from behind: the back of the
  head and hair and any hat (shared with the standing back view, which is unchanged pixel for
  pixel), the back of the top (side panels, sleeve stripes, the flames up the wearer's right), arms
  reaching forward to hold on (only shoulders and upper arms show), legs either side of the mount's
  back with the shoes hanging below. Same canvas and hip point as the side riders. From behind the
  wearer's right is on your right, so it's drawn as itself; a test checks the flames' side.

**In the sequence.** Arrival, landing, the hop and take-off are unchanged (side view). In the
flight away, as the course bends north, mount and rider change to the rear view over a short eased
cross-fade (~140 ms) on the same spot and scale, then carry on north, shrinking in steps and fading
out. A cross-fade is a deliberate change of view, not an animated turn: the middle two or three
frames show both views faintly. Flyers without rear art keep the side view. Visitors leaving by
air use the same sequence, and a visitor's empty mount turns away the same way after dropping them
off. Captures (all in the real game in the browser): `rear-turn-hootour-from-right.png`,
`rear-turn-hootour-from-left.png`, `rear-turn-megaphawk.png`, `rear-turn-diplomoth.png`,
`rear-visitor-arrival.png`, `rear-visitor-leaving.png`; the art: `rear-mount-frames.png` (sprite
sheet), `rear-mount-with-rider.png` and `rear-rider-poses.png` (drawn by the game's own functions,
not in a scene); `npm run sprites:export` writes `flight-<mount>-back.png`.

**Provenance.**

| Asset | Kind |
|---|---|
| Side-view flight frames, side riders, the walker's back view, the battle back sprites | existing project art (this site's own, generated in code) |
| Rear-view flight frames (3 mounts × 4 frames), the rear rider | new original art, this pass |
| Pokémon Black/White gameplay footage | earlier passes only, for general style (proportions, outlines); nothing copied, no frames stored |
| Original sprite sheets | not used, not in the repository |

Nothing here is extracted or official Pokémon art.

## Open gaps

- Original BW overworld sprite sheets weren't reachable; walker numbers are footage-measured.
- Which BW moves dim the background was only observed for Electro Ball.
- Tile and backdrop colours are compared against compressed video, so they're approximate.
- The turn away is three discrete views (side, three-quarter, rear), one pose each per wingbeat
  frame; there's no in-between yaw animation beyond that.
- Only the three mounts have rear views (Riffin and Campfly never carry anyone away); the rear
  rider hides the watch and bracelets (the hands are forward, out of sight).
- The departure's timing and sizes are this site's own; BW2's Fly sequence hasn't been measured
  (confidence record in GEN5-TIMING.md).
- The hop is two existing poses (walking frame, seated rider) moved along a path; there's no
  dedicated jump or swing-a-leg-over frame. Optional future enhancement: one original pixel-art
  frame for the jump (knees tucked) and one for swinging a leg over, drawn in `overworld.ts` like
  the riding pose; not needed for the hop to read at native size.
- The main menu's first mount after a page load drops one frame while its portrait encodes its
  layers (GEN5-TIMING.md, frame timing); outside the flight, not changed.

## Ninth pass: Pokédex habitats, the three-quarter turn, a wider resort, cleaning his glasses

**Pokédex.** Entries no longer show an icon on a gradient. Each shows a habitat: a 256×192
pixel-art scene (the DS top screen's size) of where that side of Aaryan is found, with him in it,
dressed and posed for it, as a BW Pokédex shows a Pokémon in its habitat. 15 scenes, one per entry,
chosen from the entry's own text: Sydney Harbour at dusk (ORIGIN: born in Australia), a courtroom
(OBJECTION: mooting, witness examination), an eDiscovery review floor (DISCOVERY: Clayton Utz,
Relativity), a biotech lab (GENOME), a society merch stall (BRANDSTORM: the sold-out merch), the
campus walkway in O-Week (TOURGUIDE), a football pitch (STRIKER: the number 7), a cricket oval with
a coach's bucket of balls (BOUNDARY), a DJ booth (SELECTA), his music corner with the guitar case
(STRUMMER), a golden-hour lane with a camera (SHUTTER), a reading nook (PAGETURNER), a gaming den
(PLAYER TWO), chambers at night with briefs in pink tape (QUICKTYPE), a society panel event
(MULTITASK). Drawn in code (`src/sprites/habitat-kit.ts`, `src/sprites/habitats.ts`): flat fills,
ink outlines, a light edge and a shade band, stepped bands and dithers, no smoothing; Aaryan is the
site's own character model at 1:1 on the same grid. Several scenes have 2–4 frames of quiet motion
(water, lights, a screen, rain, bubbles) cycled every 560 ms, never with reduced motion.

The entry page follows the BW Pokédex's information page, adapted to the dual screen: on top, the
TrainerDex red bezel round a status strip (number, name, types), the habitat window (crisp at the
largest whole-pixel scale that fits, on the dex's green grid) and a HABITAT plate; below, on the
green grid, an info card (number and name, category, type chips, the entry's old emblem in a
footprint box, HABITAT and TYPE rows), the entry in a dex text box, sources, and a control bar
(PREV, position, NEXT; pinned so it's always in reach). The list shows the focused entry's habitat;
entries not yet seen show it in darkness with a "?". Phones use the full 4:3 top screen. Keyboard
navigation, BACK, PREV/NEXT (wrapping), links and the seen tracking are unchanged.

**Three-quarter turn.** Turning away from the side view to the rear view now passes through a
three-quarter view from behind for its ~140 ms (`framesQuarter` in `flight.ts`, `riderQuarterFor`
in `overworld.ts`): six mount poses (Megaphawk, Hootour, Diplomoth, each heading up-left and
up-right; four wingbeat frames each) and two rider poses. Each is drawn as itself: the head turned
toward the heading, the near wing full length in front of the body's edge, the far wing
foreshortened behind it, the body on the diagonal; what a mount carries on its right (Megaphawk's
megaphone, Hootour's flag) stays on its right, tucked behind the body heading left and in view
heading right. The rider shows the near ear (with the glasses' arm), near arm and near leg; the
back of the jersey keeps its flames on the wearer's right both ways (tested). No cross-fade any
more.

**A wider resort.** The plaza grew from 38 to 62 tiles across (`PLAZA_X` = 12 columns each side):
gardens to the west (a pool, flower beds, benches, trees, a lamp) and palm grounds to the east, the
three east–west paths running on into both, the beach and sea along the whole south. The edges
are trees (and palms on the beach), solid all the way round (tested), so there's no invisible wall
and nowhere to walk off. Past the map, `beyond` (maps.ts) fills everything the camera can see with
woods (round trees and palms, thicker further out, the odd flowered clearing), beach with palms and
the sea, chosen per tile from a hash so nothing repeats; the ground and the props are both drawn
from it. Everything placed by coordinates moved with the layout (`PLAZA_X + x`): buildings, doors,
signs, NPCs, the tower warps, the plaza battle's camera spot; visitors and travellers use the whole
width; the saved spot's storage key changed so an old position can't land somewhere wrong.

**Cleaning his glasses** replaces the pocket check on the main menu (SPRITES.md).

**Provenance (this pass).** All new art (habitats, the three-quarter mounts and riders, the held
glasses and cloth, the new resort layout and its scenery) is original, made in code for this site;
the Pokémon BW Pokédex screenshot supplied was a layout reference only. Nothing is extracted or
official art.

Captures: `dex-entry-objection.png`, `dex-entry-selecta.png`, `dex-list-unseen.png`,
`dex-entry-phone.png`, `dex-habitats-all.png`, `quarter-mount-poses.png`,
`quarter-turn-from-left.png`, `quarter-turn-from-right.png`, `resort-expanded.png`,
`glasses-clean-browser.png`, `glasses-clean-frames.png` (all but the two sprite sheets are the real
site in a browser).

