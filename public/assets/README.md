# Hand-drawn sprite slots

Every sprite on the site is drawn in code, so this folder can stay empty. Put a finished PNG here
to replace a generated sprite:

1. `npm run sprites:export` writes editable starting points to `sprites-export/assets/`, laid out
   like this folder (`trainer/battle`, `trainer/portraits`, `trainer/overworld`, `creatures`).
   Files ending `@2x-detail` are the same pose drawn at twice the resolution.
2. Edit one (or draw from scratch at the size in `manifest.json`) and save it here under the same
   path, without the `@2x-detail` suffix. Transparent background, hard pixel edges.
3. Add the slot id (e.g. `aaryan.vs`) to `enabledAssets` in `src/content/sprites.ts`, or the
   creature id to `enabledCreatures`.

If a file is missing or fails to load, the site quietly falls back to the generated sprite.
`manifest.json` lists every slot: file, use, frame size, frame layout and facing. It's written by
the export script from `src/content/sprites.ts`, so edit that file, not the JSON.
