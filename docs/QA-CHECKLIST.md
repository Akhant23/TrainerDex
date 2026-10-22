# Visual regression checklist

Run after any change to sprites, battle animation, the overworld or the battle flow. Automated
checks come first; the manual pass covers what tests can't see.

## Automated

```
npx tsc -b && npx vitest run && npx oxlint && npm run build
```

What the tests guard (behaviour, not pixels, so correct art changes don't break them):

| Area | Test file | Checks |
|---|---|---|
| Creature idles | `src/sprites/creatures.test.ts` | every species/view has 4 valid frames, frame 0 = the still, the loop moves |
| Gestures + poses | `src/battle/animation.test.ts` | gesture/pose frames valid and different from rest; schedule reproducible, non-overlapping, no back-to-back repeats, safe for single-gesture views; poses run wind-up → strike → idle and fall back for status moves and species without poses |
| Move pacing | `src/battle/animation.test.ts` | every move's stretched length is within the measured Gen V ranges (docs/GEN5-TIMING.md) |
| Trainer gestures | `src/sprites/gestures.test.ts` | start/end on idle, valid at 1× and 2× |
| Flying scale | `src/resort/ambient.test.ts` | airScale endpoints, smooth growth, take-off mirrors landing |
| NPC persistence | `src/resort/resort.test.ts` | visitors keep their tiles across arrivals, departures and player movement |
| Departure + arrival | `src/resort/departure.test.ts` | phase order, smooth per-frame movement, lands beside (not on) the trainer, rider aboard exactly from the pose change, take-off without a stall, fades out exactly at the end, visitors hand over when their feet touch down, landing side avoids blocked tiles, both directions mirror, mount choice |
| Distance scaling | `src/resort/ambient.test.ts` | arrival grows smoothly to full size; stepped shrinking is exact on the ground, within one step of true size, steps under 3% |
| Mount direction | `src/sprites/creatures.test.ts` | every flyer has valid right-facing frames that aren't just the left ones mirrored |
| Three-quarter turn | `src/sprites/creatures.test.ts` | every mount has its own valid pose for each way it turns (not one mirrored into the other); the three-quarter riders keep the jersey's flames on the wearer's right |
| Habitats | `src/sprites/habitats.test.ts` | every entry has its own habitat; every frame paints the whole window; painting is repeatable; animated ones change; Aaryan is in each |
| Glasses gesture | `src/sprites/gestures.test.ts` | glasses on at both ends, never both on the face and in a hand, held things move without jumps; the pocket check is gone |
| Wider resort | `src/resort/resort.test.ts` | solid edges all round, the original layout intact at PLAZA_X, the gardens walkable, the scenery beyond uses real tiles without repeating |
| Rear view | `src/sprites/creatures.test.ts`, `src/resort/departure.test.ts` | every mount has valid rear frames (not the side view or its mirror) with the seat on its back; only mounts have them; the rear rider is its own pose, seated like the side riders, with the jersey's flames on the wearer's right; the turn happens once, briefly, in the flight, after most of the drift |

## Previews

- `npm run sprites:export`: sprite sheets in `sprites-export/` (walkers, battle poses, gestures).
- `npm run sprites:fx`: every move, frame by frame, in `sprites-export/fx-<type>.png`.
- `docs/qa/`: reference captures from the last pass (platforms before/after, camera sequence,
  creature poses and gestures).

## Dev hooks (dev server only)

- `window.__battleFx.slow = 0.1`: slow move effects to inspect them.
- `window.__aaryanGesture('wave')`: play a trainer gesture on the main menu.
- `window.__resortAmbient.nextGuest = 0`: bring a travelling trainer in now.
- `window.__resortChars()`: everyone on the current map and where they stand.
- `window.__resortMe()`: the player's tile, facing and the running departure (start time, spot, mount, side).
- `window.__resortGuestsLeave()`: send every travelling trainer home now (to watch them board).

A hidden browser tab throttles animation frames and timers, so timing checks must run with the
page visible. A locked Mac screen hides every Chromium page, including the in-app browser pane;
headless Chrome (`--headless=new` with a scratch `--user-data-dir`, driven over the DevTools
protocol) keeps the page visible at 60 fps. If headless Chrome brings `chrome://settings/help` to
the front, close that tab or the game tab stops animating. Frame timing: log every
`requestAnimationFrame` interval and long task across the event, several runs each cold (reload)
and warm, and count frames over 20 / 33 / 50 ms and where they fall (GEN5-TIMING.md has the
baseline). A single late frame isn't a defect until it repeats at the same point.

## Manual pass

Use a 1280×800 desktop window and a 375×812 phone viewport.

1. **Idle**: start a quick battle (`#/battle/quick`). Both creatures loop out of step with each
   other; leave it 30 s and a gesture plays (Byterat: sniff), then the loop resumes without a
   jump. No console errors.
2. **Idle, long**: leave the battle idle for 2 minutes. No two identical big gestures in a row,
   no stuck gesture after switching tabs and back.
3. **Physical attack with movement**: use TACKLE or BYTE. HUD hides, the camera pushes in on the
   attacker, cuts to the target, then returns; HP drains after.
4. **Projectile**: use OVERCLOCK or OBJECTION. Charge on the attacker, travel, impact on target.
5. **Status move**: use FIREWALL/REBRAND. The camera stays on the user; no pose.
6. **Attack without a species pose**: any move by a species not in `ATTACK_POSES` (e.g. Brushfox).
   Plain movement, no broken frame.
7. **Attack with a pose**: Byterat, Megaphawk or Gavelion. Wind-up, strike near the hit, then idle.
8. **Return to idle**: after any move the creature is back on its loop, at rest, with no stuck pose.
9. **Trainer animation**: main menu, `__aaryanGesture` for each gesture; each returns to breathing.
10. **Flyer with a rider**: resort plaza, `__resortAmbient.nextGuest = 0`: the rider stays on the
    saddle, the pair grows smoothly to ground size on landing.
11. **Flying → walking**: compare `__resortChars()` before and after a landing. No visitor moves.
12. **Battle background**: the reception battle uses the floor platform, the plaza battle the
    stone one; no dark outline around platforms.
13. **Overworld scene**: walk the plaza: buildings occlude walkers and flyers behind them, the
    camera follows, lighting doesn't jump near buildings.
14. **Walkers**: in the plaza, walkers are ~1½ tiles tall with big heads; name tags sit just
    above them; walk each direction (left and right show different sides of the jersey).
15. **Charged move + dimming**: OVERCLOCK: long charge with the background dimmed behind the
    battlers (HUD and creatures not dimmed), quick throw, dim gone before the HP drains.
16. **Reduced motion**: Settings → reduced motion. No camera moves, short effect timings, no
    gestures or idles.
17. **Leaving the resort**: in the plaza press BACK (or EXIT in the menu). The prompt appears;
    keys don't move you. NO: the box closes and you can walk. YES: the follower flashes back into
    its ball, a flyer lands beside you (not on anyone), you crouch, jump, turn at the top and
    settle onto the saddle with no jump in your head or body; it lifts off and flies on, then
    turns three-quarters away for a moment and then shows mount and rider from behind (rider on
    the saddle) and flies away north, shrinking, and fades out; then the main menu. Repeat from the left and the right half
    of the plaza (the mount faces the way it flies; Hootour's flag is on the near wing). Keys,
    BACK and EXIT during it do nothing. Indoors or with reduced motion it fades straight out.
18. **Visitors by air**: `__resortAmbient.nextGuest = 0` until one flies in: the mount lands
    beside their spot, they hop off onto it and stay; the mount flies away empty. Then
    `__resortGuestsLeave()`: they turn, their mount lands, they hop on and fly off. No visitor
    flickers or vanishes at the hand-overs; `__resortChars()` shows no one else moved.
19. **Pokédex**: open several entries: each shows its habitat (the scene matches the entry), the
    info page (emblem, HABITAT, TYPE, entry, sources), PREV/NEXT and arrow keys move (wrapping at
    the ends), BACK returns to the list with the cursor kept; unseen entries in the list show a
    dark habitat with "?". Check a phone viewport too.
20. **Resort edges**: walk into the west gardens and the east grounds and along the beach to each
    end: trees or palms close it off (no invisible wall), and past them the woods, beach and sea
    carry on with no flat colour or hard edge.
21. **Cleaning his glasses**: main menu, `__aaryanGesture('cleanGlasses')`: glasses off with the
    hand, wiped with a cloth, back on; then breathing.

