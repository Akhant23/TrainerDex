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
- **Overworld walker** — `src/sprites/overworld.ts` draws a BW-style chibi (big head, small body,
  arms flared out, outlined and shaded) from the same appearance: 4 directions × 3 frames, used in
  the resort and the Medal Box room. The art is 48×64 and shown at half size, so walkers keep the
  same fine detail as the battle sprites.
  The idle animation is only for the battle/profile sprite — walkers stand still like in BW.
- **Hats** always sit on top: any hair above the brim is clipped away before the hat is drawn.
- **Creatures** — `src/sprites/creatures.ts` builds each creature from shapes, rendered twice: 40×40
  for small icons and 80×80 (`creatureArtHi`, finer outlines) for battles, the party screen and the
  creature that follows you. They breathe in a 4-frame idle loop like BW sprites.
- **Colours** — the colour tables (`SKINS`, `HAIR_COLOURS`, `CLOTH_COLOURS`, `EYE_COLOURS`) are at the
  top of `character.ts`. Each entry is `[base, shade, light]`.

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
