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
- **Overworld walker** — `src/sprites/overworld.ts` draws a 24×32 chibi (big head, outlined, shaded)
  from the same appearance: 4 directions × 3 frames, used in the resort and the Medal Box room.
  The idle animation is only for the battle/profile sprite — walkers stand still like in BW.
- **Colours** — the colour tables (`SKINS`, `HAIR_COLOURS`, `CLOTH_COLOURS`, `EYE_COLOURS`) are at the
  top of `character.ts`. Each entry is `[base, shade, light]`.

## Changing Aaryan

All of Aaryan's looks are in `src/content/aaryan.ts`:

- `signature` — the everyday look (main menu, Trainer Card, Champion floor). Wavy black hair, slim
  clear glasses, white jersey with red trim, black joggers and sneakers; silver chain, a stud in
  each ear, a watch on one wrist, bracelets on the other, and a belt chain. No beard.
- `shinySignature` — the 1-in-128 shiny colours.
- `towerStages` — one look per Battle Tower floor, taken from photos of each period (outfits only):
  SBHS uniform → first-year shirt and tie → Marketing Director suit → Yellow Shirts tours → Champion.

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
