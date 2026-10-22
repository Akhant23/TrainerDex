# Gen V overworld sprite reference

The standard the overworld walkers (`src/sprites/overworld.ts`) are built to, and how it was
established.

## Source

- "Pokémon Black playthrough ~Longplay~", YouTube (`xUN6SP1igac`), 854×480. Frames at 29:30
  (Accumula Town: the player and two NPCs by the Pokémon Center) were drawn to a canvas at native
  resolution and enlarged nearest-neighbour for measuring. The DS screen fills ~2.06 screenshot px
  per DS px in those captures.
- Not reachable: The Spriters Resource (human-verification wall), Bulbapedia (maintenance).
  No original sprite sheet was available, so **the original frame dimensions aren't verified**;
  the numbers below are measured from footage and are approximate (±1 DS px).

## Measured (approximate)

| Property | BW (from footage) | Ours now | Ours before |
|---|---|---|---|
| Height | ~23–26 DS px (~1½ tiles) | ~24 world px | ~30 world px |
| Width | ~13–15 px | ~12–13½ head, ~14 with the arms (tenth pass; the head was ~16) | ~16 |
| Head + hair share of height | ~45–50% | ~48% (tenth pass; was ~52%) | ~35% |
| Neck | none: head sits on the shoulders | none | visible |
| Torso | short, about as wide as the head | ~5 px, head-width | long, tapered |
| Arms | stubs, small skin-coloured hands at the hips | stubs, 2 px hands | reach mid-thigh, elbow bend |
| Legs + feet | ~6 px, solid dark shoes | ~6 px | ~9 px |
| Face | two tall black eyes with a glint; no brows, nose or mouth | same (glasses as bold frames) | small eyes, brows, nose, mouth |
| Outline | 1 DS px dark, all round | 1 world px (2 art px); thinner where arms cross the body | same |
| Hair | big rounded mass, one lighter highlight band | same | smaller |

World px are treated as DS px: tiles are 16 px in both.

## Heads and hair (tenth pass)

The walkers' heads read too wide and the hair as blobs. The cause was in the generator, not in
any one sprite: the head is drawn in its own space and was stretched 1.32× sideways (1.12×
down), the back hair was an oval up to 10.4 units round a 7.8-unit face, and the ears sat
further out than the hair, so every head came out 30–32 art px wide (15–16 world px, wider than a
whole BW walker) and the same width whatever the hairstyle; in profile the hair ballooned
behind and above (a mushroom shape).

| | Before | After |
|---|---|---|
| Head space (x / y stretch, top row) | 1.32 / 1.12, row 12 | 1.14 / 1.06, row 13 (chin still on the shoulders) |
| Front head width (outline included) | 30–32 art px, every style | 24–27 (buzz, short, bun 24; wavy, mullet, curtains, curly 26; long 27); a hat's brim up to 2 more |
| Head share of the walker's height | ~52% | ~48% (BW: ~45–50%) |
| Profile depth | 28–31 | 26–28 (a little more than the width, as heads are) |
| Back hair | 9.8–10.4 units round a 7.8 face | 9–9.6 (big styles keep the extra volume) |
| Ears | ±8.4, radius 1.4 (set every head's width) | ±7.8, radius 1.2, tucked against the face |
| Wavy / mullet crown | three big round bumps | three tighter locks |

The face's marks (eyes, glasses, sunglasses, nose, earrings, the face's shading) were fixed sprite
coordinates tuned to the old stretch; they're now head-space points mapped through `headX`/`headY`,
so they follow the head (checked: at the old values they reproduce the old sprites pixel for pixel,
bar one half-pixel glasses-arm line). Every walker direction, walk frame and rider pose uses the
same head code, so all of them changed together; a test checks the head is identical in every walk
frame (bar the step's one-pixel bob). The large sprite (`character.ts`) was already in proportion
(head 0.76–0.83 of the shoulders); only curly hair, which puffed out wider than the shoulders, was
pulled in (38 → 32 art px). Tests: `src/sprites/proportions.test.ts`. Captures:
`docs/qa/heads-before-after.png` (committed left, now right, four directions, in-game scale),
`heads-large-before.png` / `heads-large-after.png`, `heads-riders.png`, and in the real site
`heads-in-resort.png`, `heads-in-resort-crop.png`.

## Conventions kept

- Three-tone shading per material (base, shade, light), shade on the right.
- Walk cycle: stand, step A, stand, step B; the stepping foot lifts and the body drops 1 art px
  (½ world px) on step frames; arms swing a pixel.
- Profiles are drawn per side: facing left shows the wearer's left side, facing right their right
  (the jersey's flames, a watch or bracelets stay on the correct side instead of being mirrored).

## Riders

Flyers only travel left or right. The rider for each direction is drawn from that side of the
wearer (`riderFor(look, 'left' | 'right')`) rather than mirroring the left rider, so the jersey's
flames, the watch and the bracelets stay where they belong; a symmetric outfit comes out as an
exact mirror, which a test checks. Capture: `docs/qa/riders-left-right.png`.

The mounts work the same way: each flyer has its own right-facing frames (`framesRight`), drawn
mirrored and then shaded, so the light stays upper-left and a held item (Hootour's flag) stays on
the near wing. Capture: `docs/qa/mounts-left-flipped-native.png`.

The riding sprite is the walking profile with the legs bent over the mount: same canvas
(48×64), same head and body rows, hips on the same pixel (`RIDER_HIP`, y 46). That's what lets
the hop onto or off a mount change pose mid-air without the head or body moving (GEN5-AUDIT.md,
sixth pass).

Flying away, the rider is drawn from behind (`riderBackFor`, eighth pass): astride, the back of
the head and top, legs either side of the mount, on the same canvas and hip point. From behind the
wearer's right is on your right, so it's never a mirror of a side pose.

## Identity kept at this size (Aaryan)

Mullet with the wavy top, bold rectangular glasses, white jersey with red sleeve stripes, side
panels, crest and 7, flames on his right side, black joggers and trainers, watch (left) and
bracelets (right). The Y-3 wordmark and the chain are too small to read and are left off.

## Comparisons

- `docs/qa/overworld-before-after.png`: old (adult) and new walkers for Aaryan and three regulars,
  front, step, left, right and back.
- `docs/qa/overworld-scene-before.jpg` / `overworld-scene-after.jpg`: the plaza with the old and
  new walkers (and the new tree canopy).
- The BW frames themselves aren't stored in the repo (copyrighted); re-capture them from the
  timestamp above.
