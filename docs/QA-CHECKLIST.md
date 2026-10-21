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

A hidden browser tab throttles animation frames and timers, so timing checks must run with the
page visible.

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
