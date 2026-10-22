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

## Charged moves and background dimming (third pass)

A uniform stretch slowed the throw as much as the charge, so charged moves now use a two-part
warp (`STAGING`, `warpFor` in fx.ts): the wind-up is stretched by its own factor, the rest keeps
the move's normal pacing. Dimming (`STAGING[move].dim`) darkens only the scenery and platforms;
the battlers, effects and HUD stay bright, as in the Electro Ball frames.

| Move | Analogue | Before: impact / end | After: launch / impact / end | Dim |
|---|---|---|---|---|
| OVERCLOCK | Electro Ball (~2.1 / ~2.4 / ~3.8 s) | 1.12 / 2.05 s | 1.86 / 2.31 / 3.24 s | 0–2.59 s, 42% |
| BASS DROP | charged special | 1.30 / 2.30 | 1.15 / 1.80 / 2.81 | none: its own effect darkens the screen |
| HYPE CAMPAIGN | charged special | 1.01 / 2.27 | 0.76 / 1.31 / 2.57 | — |
| LEAD BY EXAMPLE | charged special | 1.01 / 1.87 | 0.74 / 1.34 / 2.21 | — |
| OBJECTION | charged special | 1.01 / 1.73 | 0.77 / 1.32 / 2.04 | — |
| SPLICE, CATALYST, POWER CHORD | beam specials | unchanged | unchanged | while the beam fires, 35% |

Live check (OVERCLOCK in a quick battle, recorded per frame from the page): HUD off, camera on
the attacker, dim on and wind-up pose at 0 ms; strike pose at +1.27 s; camera cut to the target at
+2.04 s; pose cleared +2.53 s; dim off +2.58 s; HUD back +3.25 s; then damage. All within ~10 ms
of the planned values. Which BW moves dim was only observed for Electro Ball; applying it to the
three beam specials is a judgement call (IMPLEMENTED BUT NOT VERIFIED AGAINST ORIGINAL FOOTAGE).

## Known differences

- OVERCLOCK now lands at ~2.3 s (Electro Ball ~2.4 s) but ends at ~3.2 s vs ~3.8 s: BW's spark
  aftermath is longer.
- BW's camera pans in 3D; here it's a 2D push-in (scale 1.14 on your side, 1.28 on the foe's)
  with the same nearest-neighbour look.

## Flight sequences: reference and confidence record

No footage of BW2's Fly (or of a trainer mounting a flying Pokémon) has been measured, and no
original sprite sheets were reachable, so nothing below is an original-game measurement. These
are the site's own values, recorded so later changes can be measured against them.

Status key: **A** compared against original footage; **B** checked visually against an original
reference without frame measurement; **C** estimated from the Gen V style; **D** tested only in
the site's own rendering (in a real browser unless marked offline); **E** not yet verified.

| Animation | Value (source: `src/resort/departure.ts`, `ambient.ts`) | Status |
|---|---|---|
| Leave prompt → mount appears | 600 ms (prepare; follower recall flash over its second half) | C, D |
| Mount approach | 2200 ms; from 150 px to the side at 105 px altitude, ease-out to touchdown 30 px beside the trainer | C, D |
| Boarding hop | 700 ms; crouch held on the ground for the first 12% (84 ms), then a 10 px arc over the rest; turn at the top of the jump; seated pose from 78%; mount sinks 1 px over the last 22%; ground shadow shrinks and fades as they rise (seventh pass, below) | C, D |
| Take-off + flight away | 1100 + 2800 ms as one curve: climb to 150 px (smoothstep), drift 120 px sideways (done by 55%; was 75%, eighth pass), 320 px north (from 25%, accelerating), fade over the last 20% | C, D |
| Turn to the rear view | at 40% of take-off + flight (≈1.56 s after leaving the ground, ≈460 ms into the flight phase), an eased cross-fade over 3.6% (≈140 ms); rear view until the end | C, D |
| Size with altitude | `airScale`: 1.0 on the ground → 0.52 at 150 px, times the map's perspective scale; drawn in steps of 2^(1/24) (~2.9%) | C, D |
| Visitor arrival by air | 2600 ms approach from 150 px altitude, 700 ms alighting hop, then 1100 + 2400 ms empty mount flying away | C, D |
| Visitor leaving by air | as the player's departure; walker hand-over 250 ms before the hop | C, D |
| Fade before leaving the page | 450 ms, unchanged | D |
| Mount facing (left/right, held item on near wing) | native right-facing frames | D (browser, both directions) |
| Total departure | 7400 ms + 450 ms fade; measured in the browser: phases within one frame of plan, page left at 7867–7877 ms | D |
| Any of the above against BW2 | — | E |

Remotion wasn't used: there's no original footage to compare against, and the browser contact
sheets already capture the real renderer frame by frame.

### Changes in the seventh pass (hop polish)

| What | Before | After | Why | Evidence |
|---|---|---|---|---|
| Crouch before the jump | crouch frame shown for the first 12%, but the arc was already rising (sin starts at full slope), so the "crouch" left the ground at once | held on the ground for 12% (84 ms), then the jump over the remaining 88% (turn and pose change keyed to the jump, not the whole hop) | the push-off didn't read; it looked like a slide upwards | 1× captures every 45 ms in the browser (`docs/qa/hop-1x-before.png` vs `hop-1x-after-right.png`) |
| Feet at the start / end of the hop | 1 world px above where the world draws a walker (walkers are drawn at spot + 1) | the same point (`FEET_DY`) | a half-pixel hop at hand-over; visitors' overlap doubled the outline | `render.ts` actor drawing vs `mountItems` |
| Trainer's shadow during the hop | none (popped off as the hop began, popped on at hand-over) | the walker's own shadow on the ground, shrinking and fading as they rise onto the mount | visible pop at 1× | same captures |
| Visitor hand-over | both drawn for 250 ms (overlap) | the trip draws the walker only on frames where the world isn't (`present`) | overlap would have doubled the shadow | `visitor-landing-handover.png`, `visitor-boarding-handover.png` |
| Mount vs trainer on the same row | equal depth: the tie put the mount in front after hand-over, behind during the hop | mount half a row behind: trainer always in front | the visitor popped behind the mount's head at hand-over | first hand-over capture (Megaphawk) |

Timings (phase lengths, totals) are unchanged.

### Frame timing (seventh pass)

Protocol: headless Chrome (60 Hz, visible page), the resort on a fixed tile, one run = enter the
resort, press BACK → YES (or force a visitor by air), log every `requestAnimationFrame` interval and
every long task (PerformanceObserver) from 200 ms before the start to 8.2 s after. "Cold" = page
reloaded before the run; "warm" = left and re-entered the resort. Late frame = interval > 20 ms
(one missed vsync ≈ 33 ms, two ≈ 50 ms). Script: a scratch DevTools-protocol driver (not in the repo).

| Scenario | Runs | Frames | > 20 ms | > 33 ms | > 50 ms | Where |
|---|---|---|---|---|---|---|
| Idle plaza (baseline) | 3 | 1438 | 0 | 0 | 0 | — |
| Departures, warm (dev) | 6 | 3024 | 0 | 0 | 0 | — |
| Departures with the old recorder's canvas copies | 6 | 3023 | 1 | 0 | 0 | 8122 ms (after leaving) |
| Departures, cold (dev) | 5 | 2515 | 5 | 0 | 0 | 8093–8126 ms, 4 of 5 runs (after leaving) |
| Departures, cold (production build) | 5 | 2517 | 3 | 0 | 0 | 8123–8135 ms ×2 (after leaving); 18 ms after YES ×1 |
| Departures, 4× CPU throttle | 4 | 2014 | 1 | 1 | 1 | 8145 ms, 62 ms long task (first run, after leaving) |
| Departures, 8× CPU throttle | 3 | 1507 | 0 | 0 | 0 | 118 ms long task at 8093 ms (first run, after leaving; next frame fell outside the window) |
| Visitor arrivals by air, cold | 4 | 1947 | 0 | 0 | 0 | — |
| After the hop changes: departures from the right ×5, left half ×5 (tile 12,19: an NPC on the left landing tiles sent the mount in from the right), from the left ×5 (tile 13,13), visitor arrivals cold ×3, departures at 4× CPU ×3 | 23 | 10554 | 3 | 1 | 0 | every late frame after leaving, in the first run after a reload (8117–8140 ms) |

Findings:

- **No late frame during the flight itself** (0 to ~7870 ms, when the page leaves) in any of these
  runs, including 8× CPU throttling. A CPU profile of a cold departure shows the page busy ~10% of
  the time (≈1.3–2.3 ms per frame), flat across approach, hop, take-off and flight; first-use
  sprite building (rider and walker canvases) ≈7 ms in total, spread across frames; GC ≈6 ms over
  7.8 s. **TESTED; NO REPRODUCIBLE PERFORMANCE ISSUE FOUND** in the flight.
- **Reproducible, but outside the flight:** ~250 ms after the page leaves the resort, on the first
  visit to the main menu after a page load, one frame runs to 33 ms (50 ms / a 62 ms long task with
  4× throttling). The profile puts it in the main menu mounting its large trainer portrait:
  `CharacterSprite` encoding layers with `canvas.toDataURL` (12 ms in one frame, 8–10 ms in the
  next few). Later visits (cached) don't show it. This is the likeliest source of the earlier
  33 / 50 ms observations, whose recorders kept logging after the page had left. Not changed here
  (it's the menu, not the flight; one frame on first visit); an optional follow-up.
- One late frame on the frame YES was pressed (1 of ~40 departures, production, first run):
  not reproduced, treated as noise.
- The earlier recorder's full-canvas copies did not cause late frames in the flight.

### Rear view (eighth pass)

| What | Before | After | Why | Evidence |
|---|---|---|---|---|
| View while flying away | side view all the way | side → rear view (new original art) | a genuine away-from-you view | browser captures `docs/qa/rear-turn-*.png` |
| Sideways drift | done by 75% of take-off + flight | done by 55% | so the mount isn't sliding sideways once it faces away (≥85% of the drift is done when the turn ends; after it, movement is >3× more north than sideways; both tested) | estimated, then checked in the browser captures |
| Turn timing | — | starts at 40%, cross-fade 140 ms (first tried 195 ms: the half-and-half frames looked muddy), eased | brief enough not to read as a double image, long enough not to pop | visual comparison of 195 ms and 140 ms in the browser |
| Turn (ninth pass) | cross-fade side → rear over 140 ms | side → three-quarters from behind for the same 140 ms (its own pose per mount and per way it turns, and a matching rider) → rear; no cross-fade | a turn, not a dissolve | browser captures `docs/qa/quarter-turn-from-left.png`, `quarter-turn-from-right.png` |
| Scale and position at the turn | — | both views drawn at the same centre and scale | no jump in size or position | browser captures |

Status: C (estimated, this site's own) and D (verified only on the site, in the browser). Nothing
here is measured against BW2's Fly. Frame timing with the rear view (4 departures, 2 cold visitor
arrivals, 2988 frames): no late frames during the flight or the turn; the only one is the known
main-menu frame after leaving, on a cold first run.

The 140 ms three-quarter moment is this site's own estimate (the length of the cross-fade it
replaced), not a measured BW2 timing; the departure's total length is unchanged (7400 ms + 450 ms
fade; measured in the browser after this change: phases on time, the page left at 7874–7881 ms).
Frame timing after the ninth pass (resort widened, scenery past the edges, three-quarter poses):
7 departures from both sides and 3 cold visitor arrivals, 5003 frames, none late.

