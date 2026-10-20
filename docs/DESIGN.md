# Visual design rules

The site takes its visual language from Pokémon Black & White (Gen V) without imitating a console
or an emulator: there is no DS body, hinge or screen bezel. The scene and the menu are two framed
game windows laid out for the web (side by side on wide screens, stacked on tablets, unframed on
phones). Tokens live at the top of `src/styles/index.css` (`--gv-*`); components below them.

## One weight for everything

Sprites and UI share one rule: **outlines are one design pixel thick, in the same ink**
(`--gv-ink`, `#14121e`).

- Art drawn at 2× density (80×120 trainers, 80×80 creatures, flyers) gets a 2-fine-pixel outline
  (`HiGrid.outline` thickens to the grid's density); walkers (48×64 shown at half size) are
  thickened the same way. That puts characters at the same weight as the 16 px world tiles.
- UI outlines are `--u × 0.67`–`--u` (2–4 px depending on breakpoint) — the same visual weight as a
  sprite outline at its display size. No hairlines.

## Light and depth

Lit from the upper left, like the sprites.

- **Bevel:** a light edge along the top (`--gv-hi`), a darker rim along the bottom (`--gv-lo`).
- **Drop:** a hard, unblurred shadow straight down (`--gv-drop`). No soft web shadows.
- **Creature shading:** `formShade` in `src/sprites/bwstyle.ts` adds a cool shadow band inside the
  lower-right silhouette and a warm rim light on the upper left; `selectiveOutline` tints each
  outline pixel from the colour it borders (darker on the shadow side). Icons (40×40) stay flat.

## Components

| Class | Use |
|---|---|
| `.ds-screen` frame (`--gv-window`) | a game window: dark line · light band · dark line, rounded, hard drop |
| `.pixel-box` | panels and text boxes (notched outline, inner band, drop); `--dark` for battle text |
| `.pixel-btn` | small buttons (bevel, outline, drop; presses down one design pixel) |
| `.gv-tile` | big menu/command buttons: lit band across the top, faint weave, dark rim, gold pulsing ring when selected (`data-selected`), drops when pressed. Set `--tile` (and optionally `--tile-dark`). |
| `.gv-card` / `.gv-card--selected` | light cards and list rows |
| `.gv-toggle` | on/off chips (`aria-pressed`) |
| `.gv-chip` | icon plates on tiles and headers |
| `.gv-header`, `.gv-titlebar` | dark menu bands; a section's coloured title bar |
| `.gv-hud` | battle plates: dark two-tone bar, slanted end, ink traced round the slant |
| `.gv-bubble` | overworld speech bubbles with a tail |
| `.gv-pad` | the touch D-pad |
| `.gv-label` | bold labels with a hard dark drop |

## Type

Pixelify Sans throughout (display weight 600 for labels, 500 for reading text at ≥15 px with
1.6 line height); Press Start 2P only for the logo and the VS mark.

## Motion

Stepped timing (`steps()`), short (`--gv-fast` 90 ms) for presses and hovers; selection pulses
(`--gv-pulse`). Reduced motion stops pulses and decorative movement.

## Scale

Sprites are drawn at whole-number scales with `image-rendering: pixelated`; the 2× art is used
when it lands on whole device pixels. The 2.5D world is the exception: it is projected, so sprites
there scale continuously with distance (nearest-neighbour, never smoothed).
