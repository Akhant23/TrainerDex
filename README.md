# The TrainerDex

The interactive, Gen IV/V-style personal site of **Aaryan Khan**, a Law / Biotechnology student at UNSW Sydney.

> A fan-inspired personal project. Not affiliated with Nintendo, Game Freak, Creatures or The Pokémon Company.
> All sprites, icons, music and sound effects are original.

## Status

| Phase | | |
|---|---|---|
| 1. Planning | ✅ | [docs/PLANNING.md](docs/PLANNING.md) |
| 2. Design foundation | ✅ | DS shell, intro, dialogue engine, main menu, navigation, settings + save, sprite prototype, audio, play time |
| 3. Personal content | ✅ | Profile, Pokédex (15 entries), Trainer Card + 8 badges + polishing, PC (resume viewer, 11 portfolio case studies, 27-entry experience log), Photo Album (10 memories) |
| 4. Interactive | ✅ | Battle simulator (15 original creatures, 3 difficulties, TRAINERDEX BADGE, Hall of Fame), 19 visitor medals + Medal Box, Easter eggs, walking sprite |
| 4b. Battle Resort | ✅ | BW-style animated sprites, a 2.5D walkable resort (plaza → tower reception → 5 floors of Aaryan's life stages → Champion), VS intro screens, avatar studio (camera / upload colour-matching, randomise), other visitors' avatars, profiles + speech bubbles, a creature suggestion box (online features once Supabase is set up) |
| 5. Backend | ◐ | Poké Pager UI, admin dashboard (#/admin: messages + resort avatars), Supabase schema + RLS, Edge Functions (`submit-message`, `save-trainer`, `forget-me`) with validation / Turnstile / rate limiting — **built; needs your Supabase project to go live** ([docs/BACKEND.md](docs/BACKEND.md)) |
| 6. Testing & launch | ⏳ | a11y, Lighthouse, deploy |

Until Supabase is configured the Poké Pager shows a "NO SIGNAL" notice and the resort runs in offline mode (you, the staff and the tower, but no other visitors) instead of pretending to work.
See [docs/CONTENT.md](docs/CONTENT.md#open-questions) for facts still waiting on confirmation.

## Running it

Needs Node 20+ (`brew install node`).

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # sprite data, storage, formatting tests
npm run build        # type-check + production build into dist/
npm run sprites:export   # write Aaryan's sprites (every tower stage) to sprites-export/ as PNGs
```

Controls: arrows move · Enter / Space / Z = A · Esc / X / Backspace = B · 1–8 jump to a menu tile.
In the Battle Resort: arrows / WASD walk (hold Shift to run), A / Enter talks; on phones use the on-screen pad.

Easter eggs (spoilers): keep poking Aaryan on the menu; 1-in-128 shiny; 1-in-12 wild encounter when opening a Pokédex entry; ↑↑↓↓←→←→BA; visit after midnight. All tracked in the Medal Box (★ MEDALS on the main menu, or Settings → Medal Box).

## Where things live

```
src/content/      ← all personal content + dialogue (edit these, not the components)
src/sprites/      pixel-art data: BW-style character model (character.ts), overworld walker, icons, creatures + renderer
src/battle/       deterministic battle engine, data (types, moves, creatures, difficulty), tower floors + tests
src/resort/       resort tiles, maps, staff NPCs + tests
src/ui/           design-system components (PixelBox, DialogueBox, ChoiceMenu, TrainerSprite …)
src/screens/      Intro, MainMenu, Settings, section screens, resort/ (Resort, AvatarStudio), battle/
src/systems/      settings, visitor/play time, audio synth, input, safe storage
src/app/          App, hash router, DS shell, system bar
public/resume/    resume.pdf
content-source/   original uploads — git-ignored, never shipped
docs/             PLANNING.md, CONTENT.md, SPRITES.md, BACKEND.md
supabase/         migrations (tables, RLS) + Edge Functions submit-message and save-trainer
```

- Updating text and details: [docs/CONTENT.md](docs/CONTENT.md)
- Changing Aaryan's looks, the tower stages or the avatar options: [docs/SPRITES.md](docs/SPRITES.md)

## What I still need from you

Content questions are all settled (see [docs/CONTENT.md](docs/CONTENT.md#open-questions)). More portfolio results or numbers would always strengthen the case studies.

**Needed now:** a free Supabase project and Cloudflare Turnstile widget — step-by-step in [docs/BACKEND.md](docs/BACKEND.md). **For Phase 6:** a Vercel or Netlify account, optional custom domain.
