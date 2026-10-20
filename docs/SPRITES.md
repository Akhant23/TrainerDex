# The trainer sprite

## What exists now

`src/sprites/trainerData.ts` holds a **hand-placed 32×48 pixel-art prototype** built from the
mirror selfie in `content-source/trainer-reference/`. It's drawn as text — one character per pixel —
so it's fully editable and versionable.

| Pose | Status |
|---|---|
| Front idle (2-frame breathing) + blink | ✅ prototype |
| Victory (fist up) | ✅ prototype |
| Back (battle) | ✅ prototype, derived from the front |
| Trainer Card portrait | ✅ crop of the front |
| Shiny palette (platinum hair, black-and-gold kit) | ✅ |
| Walking (4-direction) | ⏳ Phase 4 |

**Limitations, honestly:** no image-generation tool was used. This is a careful manual pixel
translation of one photo, so it captures the distinctive features (wavy dark hair with a fringe,
black rectangular glasses, light moustache, stud earring, chain, the white #7 jersey with red
stripes and flame print, black drawstring trousers, watch) but it is a prototype, not a
professional likeness. The photo was a mirror selfie; left/right have been un-mirrored.

## Option A — tweak the built-in art

1. `npm run sprites:export` → PNGs appear in `sprites-export/` (1× for editing, 4× for viewing).
2. Edit the character grid in `trainerData.ts` directly (palette keys are listed at the top), **or**
   edit the 1× PNG in Aseprite / Piskel / LibreSprite and use Option B.
3. `npm test` checks every frame is still 32×48 and uses only known colours.

## Option B — drop in your own sprite sheets (no code changes)

1. Make a PNG with a **transparent background**, frames laid out **left-to-right in one row**, every
   frame the same size. Keep it small (pixel size, e.g. 32×48 or 64×64 per frame) — the site scales
   it up with nearest-neighbour so pixels stay crisp.
2. Put it in `public/sprites/`, e.g. `public/sprites/trainer-front.png`.
3. In `src/content/sprites.ts` fill in the matching entry:

   ```ts
   front: { src: '/sprites/trainer-front.png', frameWidth: 32, frameHeight: 48, frames: 2, fps: 2 },
   ```

   Entries: `front` (idle loop), `back`, `victory`, `portrait`. Anything left `null` keeps using the
   prototype, so you can replace one pose at a time.

A commissioned pixel artist, or an image model followed by manual clean-up in Aseprite, are both good
routes. Ask for: "Gen IV / Gen V trainer sprite style, transparent PNG, 1× pixel scale,
nearest-neighbour, limited palette, poses: front idle (2 frames), back, victory".
