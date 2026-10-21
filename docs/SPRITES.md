# Sprites

Every character on the site is drawn in code from a small set of options, so Aaryan, the resort
staff and every visitor's avatar share one Black & White–style model. Nothing is a ripped asset.

## How it works

- **Battle / portrait sprite** — `src/sprites/character.ts` draws an 80×120 figure from an
  `Appearance` (skin, hair style + colour, eyes, face, top + trim/tie, hat, bottoms, shoes, up to
  three accessories), with BW proportions: tapered arms with elbows and hands (one relaxed, one in
  a pocket), three-tone shading lit from the upper left. It is built in separate layers (back hair, legs, torso, back arm, front arm, head,
  blinking head) so `src/ui/CharacterSprite.tsx` can animate them like BW: breathing, a head bob,
  hair sway, swinging arms, random blinks, a fist-pump victory pose, and a nod on the VS screen. Animation is off when the
  visitor turns on reduced motion.
- **Overworld walker** — `src/sprites/overworld.ts` draws a BW-style walker from the same
  appearance: 4 directions × 3 frames, used in the resort and the Medal Box room. They're built to
  read as older teens and young adults, not chibi kids: about 3¼ heads tall, a head narrower than
  the shoulders, a short neck, a torso tapering to the waist, arms reaching mid-thigh with a bend
  at the elbow, longer legs, and smaller eyes with brows and a nose. Every view (front, back,
  profile, riding) shares the same proportion constants. Arms carry a thin inner outline where they
  cross the body; the thick outline is only on the outer silhouette. The art is 48×64 and shown at
  half size, so walkers keep the same fine detail as the battle sprites.
  The idle animation is only for the battle/profile sprite — walkers stand still like in BW.
- **Proportions** — BW trainers carry their heads low: the head, hair and hat layers are dropped
  `NECK_DROP` (3 px) onto the shoulders, so the chin tucks onto the collar and only a sliver of neck
  shows under the jaw (front, side and back views alike).
- **Arms** — every arm on the large sprite, in every pose and view (idle, VS point, fist pump,
  throw, side view and all the idle gestures), is built by one function (`limb` in `character.ts`):
  a rounded deltoid that sits into the torso, an upper arm narrowing to the elbow, a forearm that
  swells just below the elbow and slims to the wrist, and clothes that follow it (a short sleeve
  squared off at a hem with bare arm below, or a long sleeve with a cuff), so thickness never
  changes between frames.
- **Hats** always sit on top: any hair above the brim is clipped away before the hat is drawn.
- **Creatures** — `src/sprites/creatures.ts` builds each creature from shapes, rendered twice: 40×40
  for small icons and 80×80 (`creatureArtHi`, finer outlines) for battles, the party screen and the
  creature that follows you. Every species has two views: the **front** (the foe in battle) and a
  **back** view (your own creature, seen over its shoulder toward the foe, as in Gen V). They
  breathe in a 4-frame idle loop like BW sprites.
- **Outline weight** — every outline is one *design* pixel thick: art drawn at 2× density (trainers,
  creatures, flyers) gets a 2-pixel outline, and walkers (drawn at 2× and shown at half size) are
  thickened the same way, so characters carry the same weight as the world's tiles and the UI's
  borders (see `docs/DESIGN.md`).
- **BW outlines and shading** — `src/sprites/bwstyle.ts` gives creatures Gen V "selective
  outlining": instead of one flat black line, each outline pixel is a dark shade of the colour it
  borders, a little lighter on the lit upper-left side and darkest along the bottom and right. Eyes
  and mouths stay pure ink. `formShade` adds a cool shadow band inside the lower-right silhouette
  and a warm rim light on the upper left, so big sprites read as rounded forms.
- **Held items** — `src/sprites/held.ts` draws the gavel, flag, pennant, guitar, cricket bat,
  needle, placard and ball in their own local space around a grip point. `HOLDS` places each
  species' item per view (front, back, flight) — position, rotation, scale, flip, behind/in front —
  and the builder draws the holder's paw, wing tip, flipper or leg over the grip afterwards, so the
  item is held rather than pasted on. A test checks every grip point is covered by the creature.

  | Creature | Item | Held by |
  |---|---|---|
  | Gavelion | gavel | right paw |
  | Hootour | flag | right wing tip (in flight: talons, streaming behind) |
  | Riffin | guitar | right flipper (in flight: slung across its back) |
  | Wicketoad | cricket bat | right hand, blade over the shoulder |
  | Campfly | pennant | a foreleg |
  | Stitchick | needle and thread | right wing |
  | Diplomoth | placard | front legs (in flight: hanging below) |
  | Strikaroo | ball | resting against its right foot |
- **Flying** — `src/sprites/flight.ts` draws the five flyers side-on in three layers per frame (far
  wing, body, near wing) over a four-frame cycle, with the body bobbing against the stroke:
  Megaphawk, Hootour and Riffin flap feathered wings (birds glide between bursts), Diplomoth
  flutters its fore- and hindwings, and Campfly buzzes with a pulsing glow.
- **Riding** — Megaphawk, Hootour and Diplomoth are big enough to carry a trainer. Each frame has a
  saddle point; the rider (`riderFor` in `overworld.ts`: seated, one leg bent over the mount, a hand
  forward holding on) is drawn between the body and the near wing, so the wing sweeps over their
  legs and the pair move as one. Surfers (Riffin, Subwoof, Wicketoad) carry a seated rider behind
  their head, low in the water. `npm run sprites:export` writes `flight-<id>.png` previews.
- **Distance** — flyers are drawn smaller the further away they are, with mount and rider always
  sharing one scale: sky flyers (beyond the map) at about 0.42–0.62× ground size (`skyScale`), and
  travellers flying in at about half size at cruising height, growing smoothly to full size as
  they touch down (`airScale` in `src/resort/ambient.ts`, by altitude); take-off runs it backwards.
  Arrivals are depth-sorted by their landing spot, so buildings in front of it still cover them.
- **Side view** — `renderSide` draws the same appearance in profile (hair falling down the back,
  glasses arm, one shoe forward). The back view (`renderBack`) and ball throw are used at the start
  of battles.
- **Colours** — the colour tables (`SKINS`, `HAIR_COLOURS`, `CLOTH_COLOURS`, `EYE_COLOURS`) are at the
  top of `character.ts`. Each entry is `[base, shade, light]`.

## Poses and scales

The large trainer sprite is drawn from continuous shapes, so it can be rasterised at 80×120 or at
2× (160×240, same design, finer outlines). `CharacterSprite` uses the 2× art whenever it lands on
whole device pixels: at even scales, or at any scale on a high-density screen.

| Context | What's used | Size |
|---|---|---|
| Map (walking) | overworld walker, 4 directions × 3 frames | 48×64 art, shown at 24×32 |
| Profile, menu, Trainer Card | battle sprite, `idle` (breathing, blinking) | 80×120 (or 2×) |
| Trainer Card ID photo, messages | `portrait`, a head-and-shoulders crop | 40×46 (or 2×) |
| Avatar Studio turnaround | `idle` → `side` → `back` → `side` mirrored | 80×120 at 2× |
| VS screen | `point`, nodding, cropped to a bust by the band | 80×120 at 2–4× |
| Start of a battle | your trainer from behind (`back`), then `throw` with a ball | 80×120, cropped by the screen edge |
| Win | `victory` (fist pump) | 80×120 |
| Creatures | front (foe, party, icons) or back (your creature in battle); 80×80 hi-res or 40×40 | |

`side` is a true profile facing right (`renderSide` in `character.ts`); mirror it for left.
All sprites are drawn at whole-number scales with `image-rendering: pixelated`, never smoothed.
The idle animation is only for the large sprites; map walkers stand still, as in BW.

## Idle gestures (main menu)

On the main menu Aaryan breathes by default, and every 7–13 s he plays one of five gestures:
hands behind the head, ruffling his hair, searching his pockets, smirking and pointing at you, or
(rarely) waving. Tapping him always waves. The clips are in `src/sprites/gestures.ts` and the
scheduler is `src/ui/useGestures.ts`.

- A gesture is a list of keyframes: a `PoseFrame` (arm elbow/wrist points and hand shape, plus face
  overrides: eyes, mouth, brow, hair ruffle, head tilt) and how long to hold it. Arms are tweened
  between keyframes with 70 ms in-between frames.
- Every clip starts and ends on the standing idle, so it hands back to breathing without a jump.
- Gestures never repeat back to back and never interrupt each other: a tap during a gesture is
  ignored. Weights live in `GESTURE_WEIGHTS`.
- Only the standing `idle` pose gestures, and nothing plays with reduced motion on, in a hidden
  tab, or when a hand-drawn sprite replaces the procedural one.
- Frames are cached per body part and preloaded shortly after the menu opens.
- To add one: append keyframes to `GESTURES`, give it a weight, and the tests check it starts and
  ends on idle and renders at 1× and 2×. In dev, `window.__aaryanGesture('wave')` plays one on demand.

`npm run sprites:export` also writes `gesture-<id>@2x.png` strips and a close-up sheet for review.

## Photo portraits

Each album photo has a pixel-art version under its description, drawn by `src/ui/PhotoPortrait.tsx`
from a scene in `src/content/photoScenes.ts` (keyed by the photo's `id`). A scene is a backdrop, a
cast of trainer sprites (each with their look from the photo: hair, outfit, accessories, and a
`PoseFrame` for the pose), optional props, and an `alt` description for screen readers. People are
the same layered sprite as Aaryan, so proportions match across the site. A photo with no scene
shows a small "Pixel portrait not drawn yet" plate instead.

## Battle move animations

Each of the 39 moves has its own animation recipe in `src/battle/fx.ts`, played by
`src/screens/battle/BattleFx.tsx` on a pixel canvas over the battle field (176 px wide, scaled up
crisp). A recipe is a set of timed layers — anticipation at the attacker, travel, impact, aftermath —
built from shared painters (projectiles, beams, rings, bursts, rain, orbits, stamps, barriers),
plus the moment the hit lands (`impact`) and the attacker's body motion (lunge, jump, dive or cast).

- The battle waits for `impact` before showing damage, so the HP bar drops as the hit connects.
- A miss is known in advance: contact layers are dropped, the shot flies past and puffs, and the
  target sidesteps.
- Only one effect plays at a time (a new one ends the last), and timers back up the animation
  frames, so nothing lingers or stalls in a background tab.
- With reduced motion on, a move shows only a static hit marker: no travel, flashes or shakes.
- Moves share a look per type (LAW: gavels and paper; SCIENCE: flasks and helices; TECH: data and
  barriers; MUSIC: notes and sound waves; CREATIVE: stars, sketches and confetti; SPORT: balls and
  speed lines; LEADER: flags, gold and warmth) but each has its own identity — a test fails if two
  moves draw the same thing.

`npm run sprites:fx` renders every move frame by frame to `sprites-export/fx-<type>.png` for review.

## Replacing art with hand-drawn sprites

Everything is generated in code, so nothing needs replacing. When there is finished art:

1. `npm run sprites:export` writes editable starting points to `sprites-export/assets/`, laid out
   like `public/assets/`:

   | Slot | File | Frame | Layout |
   |---|---|---|---|
   | `aaryan.front` | `trainer/battle/aaryan-front.png` | 80×120 | standing, facing the viewer |
   | `aaryan.vs` | `trainer/portraits/aaryan-vs.png` | 80×120 | pointing right; head and chest in the top half |
   | `aaryan.victory` | `trainer/battle/aaryan-victory.png` | 80×120 | fist raised |
   | `aaryan.portrait` | `trainer/portraits/aaryan-portrait.png` | 40×46 | head and shoulders |
   | `aaryan.overworld` | `trainer/overworld/aaryan-walk.png` | 48×64 × 12 | one row: down, up, left, right × (stand, step A, step B) |
   | creature `<id>` | `creatures/<id>.png` | 80×80 | facing left |

   `@2x-detail` files are the same pose at twice the resolution. Trainer poses can be drawn at a
   whole multiple of the frame size; the walk sheet must be exactly 48×64 per frame.
   `trainer/reference/aaryan-turnaround@2x-detail.png` (front, side, back, throw) is for reference.
2. Save the finished PNG (transparent background, hard pixel edges) to `public/assets/` at the
   path above.
3. Add the slot id to `enabledAssets` in `src/content/sprites.ts` (or the creature id to
   `enabledCreatures`).

Overrides apply to Aaryan's everyday look wherever it appears (menu, Profile, VS, Champion, Medal
Box walker, Trainer Card photo). A missing or broken file logs a warning and the generated sprite
is shown instead. `src/content/sprites.ts` is the source of truth; the export script writes
`public/assets/manifest.json` from it (file, use, size, frame layout, facing, transparency).
Visitors' avatars are always generated, since they're built from options.

## Changing Aaryan

All of Aaryan's looks are in `src/content/aaryan.ts`:

- `signature` — the everyday look (main menu, Trainer Card, Champion floor). Black hair with a wavy
  top and fringe, worn as a modern mullet; bold rectangular glasses; white jersey with red trim, black joggers and sneakers; silver chain, a stud in
  each ear, a watch on one wrist, bracelets on the other, and a belt chain. No beard.
- `shinySignature` — the 1-in-128 shiny colours.
- `towerStages` — one look per Battle Tower floor, taken from photos of each period (outfits only):
  SBHS uniform (brown blazer, blue piping, dark red tie, grey trousers, black belt and shoes) →
  first-year colour run (paint-splashed tee) → Marketing Director suit → Yellow Shirts tours → Champion.

Change any field to another option id (the lists are in `supabase/functions/_shared/appearance.ts`)
and the battle sprite, portrait and walker all update. `npm run sprites:export` writes PNG previews
of every stage to `sprites-export/` so you can check them side by side.

## Adding an avatar option

1. Add the id to the list in `supabase/functions/_shared/appearance.ts` (the studio and the server
   both read this list — the server rejects anything not on it).
2. Draw it in `character.ts` (the layer it belongs to) and in `overworld.ts`.
3. If it's a colour, add it to the matching colour table.
4. Run `npm test` — it renders every option and fails on unknown colours or wrong sizes.

## Visitors' avatars

The Avatar Studio (Battle → AVATAR) lets visitors pick from the same options. **Match my photo**
reads a photo in the browser only, samples the skin, hair and clothing colours, and picks the
nearest options; the photo is never uploaded or kept. The code is `src/systems/photoColours.ts`.
