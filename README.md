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
| 4. Interactive | ◐ | **Battle simulator done** (9 original creatures, 3 difficulties, TRAINERDEX BADGE, Hall of Fame). Still to do: visitor achievements, Easter eggs, walking sprite |
| 5. Backend | ⏳ | Poké Pager guestbook + moderation (Supabase) |
| 6. Testing & launch | ⏳ | a11y, Lighthouse, deploy |

The Poké Pager opens an "under construction" screen that says so and lists what's planned.
See [docs/CONTENT.md](docs/CONTENT.md#open-questions) for facts still waiting on confirmation.

## Running it

Needs Node 20+ (`brew install node`).

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # sprite data, storage, formatting tests
npm run build        # type-check + production build into dist/
npm run sprites:export   # write the prototype sprites to sprites-export/ as PNGs
```

Controls: arrows move · Enter / Space / Z = A · Esc / X / Backspace = B · 1–8 jump to a menu tile.

## Where things live

```
src/content/      ← all personal content + dialogue (edit these, not the components)
src/sprites/      pixel-art data (trainer, icons, battle creatures) + renderer
src/battle/       deterministic battle engine, data (types, moves, creatures, difficulty) + tests
src/ui/           design-system components (PixelBox, DialogueBox, ChoiceMenu, TrainerSprite …)
src/screens/      Intro, MainMenu, Settings, section screens
src/systems/      settings, visitor/play time, audio synth, input, safe storage
src/app/          App, hash router, DS shell, system bar
public/sprites/   drop-in sprite sheets (override the prototype)
public/resume/    resume.pdf
content-source/   original uploads — git-ignored, never shipped
docs/             PLANNING.md, CONTENT.md, SPRITES.md
```

- Updating text and details: [docs/CONTENT.md](docs/CONTENT.md)
- Replacing or editing the trainer sprite: [docs/SPRITES.md](docs/SPRITES.md)

## What I still need from you

See **Open questions** in [docs/CONTENT.md](docs/CONTENT.md#open-questions): two portfolio years, case-study results, and the graduation year.

**Needed for Phase 5–6:** a free **Supabase** project and **Cloudflare Turnstile** site (I'll walk you through both), and a **Vercel** or Netlify account. Optional custom domain.
