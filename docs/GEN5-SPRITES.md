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
| Width | ~13–15 px | ~14–15 | ~16 |
| Head + hair share of height | ~45–50% | ~50% | ~35% |
| Neck | none: head sits on the shoulders | none | visible |
| Torso | short, about as wide as the head | ~5 px, head-width | long, tapered |
| Arms | stubs, small skin-coloured hands at the hips | stubs, 2 px hands | reach mid-thigh, elbow bend |
| Legs + feet | ~6 px, solid dark shoes | ~6 px | ~9 px |
| Face | two tall black eyes with a glint; no brows, nose or mouth | same (glasses as bold frames) | small eyes, brows, nose, mouth |
| Outline | 1 DS px dark, all round | 1 world px (2 art px); thinner where arms cross the body | same |
| Hair | big rounded mass, one lighter highlight band | same | smaller |

World px are treated as DS px: tiles are 16 px in both.

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
