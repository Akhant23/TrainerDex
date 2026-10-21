# Gen V move timing reference

How the battle pacing was checked against the original games, what was measured, and how
confident each value is. Re-run this protocol when changing `tempoFor` (src/battle/fx.ts) or the
battle flow in `Fight.tsx`.

## Sources

| Source | Access | Used for |
|---|---|---|
| "Pokemon Generation V - All move animations (Sound effects only)", HeroLinik, YouTube (`bNW2L2DtPIg`); recorded in Pokémon White 2 on melonDS, 640×360 | Accessible; frame-stepped in the browser | Move timing, battle camera, HUD, backgrounds |
| "Pokémon Black playthrough ~Longplay~", YouTube (`xUN6SP1igac`) | Accessible after ads | Overworld comparison (route, Accumula Town, Pokémon Center) |
| PokéAPI Gen V animated sprites (GitHub) | Viewable one at a time | Idle animation principles |
| The Spriters Resource | **Blocked** by a human-verification check (not attempted further) | — |
| Bulbapedia / Bulbagarden Archives | **Down for maintenance** on 22 Oct 2026 | — |
| Pokémon Showdown backgrounds | Accessible, but fan-made, not original assets | Not used |

White 2 shares Black/White's battle engine and move animations; differences between the
versions weren't checked.

## Protocol

1. Seek the footage to the move ("X used MOVE!" text box); moves are in alphabetical order.
2. Draw frames at a fixed step (0.2–0.5 s) onto a contact sheet in the page (a canvas can draw a
   cross-origin video frame for display), with each frame's timestamp printed on it.
3. Note: end of the text, animation start (HUD hides / camera moves), anticipation, impact
   (hit spark or burst on the target), aftermath, camera return / HUD back.
4. Values are ±1 sample step. Nothing here is frame-exact; treat them as approximations.

## Measurements

Times are from the end of the "used MOVE!" text.

| Move | Kind | Anticipation | Impact | Ends (HUD back) | Notes | Confidence |
|---|---|---|---|---|---|---|
| Tackle | physical contact | camera pushes in on the target while the attacker charges off-screen, ~0.4 s | ~0.65 s | ~1.6 s, then the target flickers ~0.6 s | | medium-high (0.2 s steps) |
| Bounce (2nd turn) | dive from above | camera pushes in on the target | ~0.9 s | ~1.7 s | turn 1: attacker vanishes ("sprang up!") | medium (0.25 s) |
| Egg Bomb | projectile | egg rises over the attacker, ~0.3 s; travels ~0.5 s | ~1.05 s | ~2.1 s | camera wide → attacker → target → wide | medium (0.25 s) |
| Electro Ball | elemental, screen effect | camera on attacker; **background darkens**; ball charges ~1.2 s | ~2.4 s | ~3.8 s | full-screen streak on release | medium (0.3 s) |
| Synthesis | status / heal | glow on user ~1.5 s | — | ~3.2 s, then HP sparkle ~1.5 s | | medium (0.75 s) |

Behaviours seen in every sample:

- The **HUD (HP boxes) hides** for the whole move animation and comes back after it.
- The **camera moves**: in on the attacker for the wind-up, cut or pan to the target for the hit,
  back to the wide shot at the end.
- **Damage follows the animation**: the target flickers and the HP bar drains after the camera
  returns, not at the moment of impact.

## What the site does now

| | Before | After |
|---|---|---|
| Contact moves (e.g. TACKLE) | impact 0.2 s, total 0.6 s | impact 0.48 s, total 1.44 s (`tempoFor` ×2.4) |
| Jump / dive (BUNNY HOP, DIVE BOMB) | impact 0.42–0.56 s | 0.84–0.9 s (×2, ×1.6) |
| Damaging cast moves (projectiles, beams) | impact 0.3–0.72 s, total 0.8–1.3 s | impact 0.54–1.3 s, total 1.4–2.3 s (×1.8) |
| Status moves | 0.76–1.0 s | 1.7–2.2 s (×2.2) |
| HUD | stayed up | hides for the move, returns after |
| Camera | static | pushes in on the attacker, cuts to the target 0.26 s before the hit, eases back |
| Damage timing | at impact | after the animation and camera return |

Reduced motion keeps the old short timings with no camera movement.

## Known differences

- Charged special moves (Electro Ball ~2.4 s to impact) run longer in BW than any recipe here;
  the slowest (BASS DROP) now lands at ~1.3 s.
- BW darkens the background for many special moves; recipes only do this where their own
  effect includes a tint.
- BW's camera pans in 3D; here it's a 2D push-in (scale 1.14 on your side, 1.28 on the foe's)
  with the same nearest-neighbour look.
