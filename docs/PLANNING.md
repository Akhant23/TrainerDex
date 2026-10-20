# The TrainerDex — Phase 1 Plan

Status: Phase 1 (planning) complete · Phase 2 (design foundation) implemented · Phases 3–6 pending.

---

## 1. Creative direction

**One sentence:** *You've just switched on a DS, and the cartridge inside is someone's life.*

The TrainerDex is a short, playable Gen IV/V-style game whose world is Aaryan. A visitor is a
trainer who has wandered into his region. Every section maps onto a mechanic players already
know, so nobody has to learn the interface:

| Real-world thing | In-game metaphor | Why it works |
|---|---|---|
| Bio, interests | Trainer info screen + Pokédex entries | Entries are short, numbered, collectible |
| Experience, roles | Trainer Card + Badge Case | Badges = verified milestones; flipping the card = "more detail" |
| Resume, portfolio | PC in a Pokémon Centre (boxes of stored work) | Boxes are a natural filterable grid |
| Photos | Photo album / "memories" Dex | 10 numbered entries, "seen/caught" counter |
| Guestbook | Poké Pager (handheld comms device) | Messages arrive like calls on a Pokégear |
| Interests as gameplay | Battle vs. Trainer Aaryan | Moves are his skills; types are his interests |

**Tone.** Warm, a bit cheeky, never cringe. Dialogue is written like an NPC who is slightly too
proud of his trainer (the "professor" voice), with the occasional dry joke. Professional facts are
always stated plainly inside the playful frame — a recruiter should never have to decode a pun to
find a job title or a date.

**Visual era.** HeartGold/SoulSilver for the menus and touch-screen tiles, Platinum for dialogue
boxes and the Trainer Card, Black/White for the bolder colour blocks and battle transitions.
Everything is **original**: no Nintendo/Game Freak sprites, logos, fonts, music or UI art are
copied. Inspiration is in the *language* (dialogue boxes with a ▼ cursor, notched pixel borders,
scrolling diagonal-stripe backgrounds, a two-screen layout), not the assets.

**Identity of its own.** The TrainerDex has a signature accent — **"Dex Red" + "Sydney Harbour
Blue"** — and a recurring motif: a small four-point sparkle (✦) used for shiny states, badges and
the logo. It reads as Pokémon-adjacent at a glance and as its own thing on a second look.

**Balance (from brief):** 40% nostalgia · 30% personal story · 20% gameplay · 10% professional
utility — with the hard rule that the resume is never more than one click away.

---

## 2. Homepage design

### First visit
1. **Boot screen** — black; a white "DS-style" boot line wipes in, then the TrainerDex logo drops
   with a shine pass. "PRESS START" blinks. A **Skip intro** button is always visible.
2. **Sound prompt** — "Play with sound?" (YES / NO). Nothing makes noise until a YES. (Browser
   autoplay rules agree with us.)
3. **Professor dialogue** — dark spotlight stage; the trainer sprite fades in on a platform. Lines:
   - "Welcome to the world of AARYAN!"
   - "This world is inhabited by people with all kinds of stories, experiences and ambitions."
   - "Today, you're about to discover one of them."
   - "But first — what should I call you?" → optional name entry (defaults to TRAINER).
   - "{NAME}! Your adventure begins now!"
4. **Shrink-and-flash transition** (Gen IV style) into the main menu.

The intro is remembered in local storage and only replays from **Settings → Replay intro**.

### Main menu (every visit)
Two screens, like the DS:

- **Top screen — Trainer status.** Animated diagonal-stripe background; Aaryan's sprite on a
  battle platform (idle bob + blink; click to react); a status plate with name, **ID No.**,
  region, trainer class, badges and **PLAY TIME** (how long *this visitor* has spent here, counted
  only while the tab is visible).
- **Bottom screen — Touch menu.** Eight large HGSS-style tiles, each with an original pixel icon
  and its own colour. Arrow keys / WASD move the cursor, Enter/Space/Z selects, Esc/X goes back.
- **System bar.** Sound toggle, music toggle, and a permanent **RESUME** shortcut.

### Layouts
- **Wide desktop (landscape ≥ 1024px):** screens side by side inside a DS-like shell with a hinge —
  avoids a 1000px-tall stacked layout on laptop screens.
- **Tablet / narrow desktop:** classic vertical DS stack.
- **Mobile:** no shell. A compact top status strip + a full-height touch menu with big targets.
  Sprites stay integer-scaled, dialogue text never drops below 16px.

---

## 3. Navigation structure

```
Boot / Intro (first visit only, skippable)
└── Main Menu  (#/)
    ├── 1. Trainer Profile       #/profile    bio, education, interests, stats, sprite
    ├── 2. Pokédex               #/pokedex    numbered entries about Aaryan (+ rare encounter)
    ├── 3. Trainer Card & Badges #/card       flip card, badge case, polish, achievement entries
    ├── 4. PC Storage            #/pc
    │     ├── Access Resume      #/pc/resume      embedded PDF, download, new tab, text view
    │     ├── Access Portfolio   #/pc/portfolio   boxes, filters → case study #/pc/portfolio/:id
    │     ├── View Experience    #/pc/experience
    │     └── Log Out
    ├── 5. Photo Album           #/album      10 memories → #/album/:n
    ├── 6. Battle Simulator      #/battle     starter → battle → results → Hall of Fame
    ├── 7. Poké Pager            #/pager      inbox, compose
    └── 8. Settings              #/settings   text speed, sound, music, motion, replay intro, reset
Hidden:   #/admin   (moderation, Supabase Auth — not linked in the menu)
Shortcut: RESUME button in the system bar → #/pc/resume from anywhere
```

Hash routing is used so every section is deep-linkable (a recruiter can be sent straight to
`/#/pc/resume`) and it works on any static host without rewrite rules.

---

## 4. Visual design system

### Pixel unit
Everything is drawn on a **pixel unit `--u`** (4px desktop, 3px mobile). Borders, corner notches,
shadows and sprite scales are whole multiples of it, so nothing ever looks half-pixel blurry.
Sprites render with `image-rendering: pixelated` at integer scale only.

### Colour tokens
| Token | Hex | Use |
|---|---|---|
| `ink` | `#1c1a24` | outlines, text |
| `paper` | `#f8f8f0` | dialogue/box fill |
| `frame` | `#4a5068` | Platinum-style box border |
| `frame-hi` | `#a8b8d8` | inner border highlight |
| `dex-red` | `#e0383e` | primary accent, Pokédex, profile |
| `harbour` | `#2f5fb8` | secondary accent, PC |
| `gold` | `#f0b830` | badges, Trainer Card, shiny |
| `leaf` | `#4fa850` | success, HP high |
| `amber` | `#f0a020` | HP mid |
| `ember` | `#d83820` | HP low, battle |
| `shell` | `#2a2c38` | DS body |
| `screen-bg` | `#101018` | behind screens |

Each menu section has its own tile colour (profile red, Pokédex orange, card gold, PC blue,
album pink, battle crimson, pager teal, settings slate) used for its header bar and backdrop.

### Type
- **Display + body:** *Pixelify Sans* (OFL, self-hosted) — body 500, headings 600. A thicker pixel face where i, l and I are all distinct (DotGothic16 was tried in Oct 2026 but drew them as identical bars).
- **Logo only:** *Press Start 2P*.
- Body line-height 1.6; longer text is split into ▸ dot points where it reads as a list.
- Minimum body size 16px; uppercase only for short labels.

### Components (Phase 2)
`PixelBox` (notched pixel border, variants: dialogue / panel / plate), `DialogueBox`
(typewriter, ▼ advance cursor, click/Enter/Space to advance, instant-complete on first press),
`ChoiceMenu` (▶ cursor, arrow keys, wraps), `PixelButton`, `Toggle`, `Slider`, `StatBar`
(animated HP-style bar), `PixelIcon` (16×16 icons from data), `TrainerSprite`, `ScreenWipe`
transition, `SectionScreen` (header + back button), `DSShell` (responsive two-screen frame).

### Motion
- Transitions are 250–600ms, stepped (`steps()`) where a real DS would be stepped.
- `prefers-reduced-motion` (or Settings → Motion: Reduced) replaces wipes with fades, stops
  background scrolling and the sprite bob.

---

## 5. Technical architecture

**Stack:** React 19 + TypeScript + Vite, Tailwind CSS v4 (layout utilities) + a small hand-written
pixel CSS layer, Motion for React (transitions), Vitest (logic tests). Supabase (Postgres + Auth +
Edge Functions) for the guestbook in Phase 5. Hosting: Vercel (or Netlify — both work, it's static).

**No Phaser.** The battle is turn-based UI, not a physics game; a pure TypeScript state machine +
React rendering is smaller, testable and accessible. (Decision can be revisited.)

```
src/
  app/            App, router (hash), providers, DSShell
  content/        ← everything personal lives here (edit these, not components)
    profile.ts      name, ID, class, bio, interests …
    dialogue.ts     intro + sprite reaction lines
    menu.ts         menu entries, colours, routes
    sprites.ts      which sprite source to use (built-in prototype or your PNG sheet)
    (Phase 3)       experience.ts, badges.ts, portfolio.ts, photos.ts, pokedex.ts
  sprites/        pixel-art data + renderer (matrices → canvas → cached data URLs)
  ui/             PixelBox, DialogueBox, ChoiceMenu, PixelButton, Toggle, StatBar, PixelIcon …
  screens/        Intro, MainMenu, Settings, sections (lazy-loaded per route)
  systems/        storage (safe localStorage), settings store, playtime, audio (WebAudio synth),
                  input (keyboard A/B/arrows)
  battle/         (Phase 4) engine.ts — deterministic, seedable state machine + tests
  styles/         tokens + pixel CSS
public/
  sprites/        drop-in sprite sheets that override the built-in prototype
  resume/         resume.pdf (authoritative file)
  portfolio/ photos/   optimised media (Phase 3)
supabase/         (Phase 5) migrations, RLS policies, edge function
content-source/   original uploads, kept out of the build
```

**State:** React context for settings/audio; everything persisted goes through one safe storage
module (try/catch, versioned keys, works in private mode). No global state library needed.

**Code splitting:** each section is `React.lazy`-loaded, so the first paint ships only the shell,
intro and menu.

**Audio:** every sound effect and the menu theme are **synthesised at runtime with WebAudio** from
original note data — no audio files, no licensing questions, ~0 KB of assets. Off until the
visitor opts in.

**Guestbook (Phase 5):** browser → Supabase **Edge Function** (`submit-message`) which validates,
filters profanity, verifies a Cloudflare Turnstile token, rate-limits by hashed IP, and inserts with
`status = 'pending'`. RLS: anonymous users can only `select` approved messages and cannot insert
directly. Admin = Supabase Auth user whose id is in an `admins` table; moderation goes through
RLS-protected updates. No secrets in the client — only the public anon key.

### External services needed
| Service | For | Cost | Needed by |
|---|---|---|---|
| Supabase | guestbook DB, admin auth, edge function | free tier | Phase 5 |
| Cloudflare Turnstile | anti-bot on guestbook | free | Phase 5 |
| Vercel or Netlify | hosting | free tier | Phase 6 |
| (optional) domain | e.g. akhant.dev | ~$15/yr | Phase 6 |

---

## 6. Roadmap

| Phase | Scope | Done when |
|---|---|---|
| **1. Planning** | this document | ✅ |
| **2. Foundation** | Vite app, design system, DS shell, intro, dialogue engine, main menu, navigation, settings + save animation, sprite prototype + override pipeline, audio engine, playtime | ✅ builds, tests pass, works on desktop + mobile |
| **3. Personal content** | Profile, Pokédex, Trainer Card + badges + polishing, PC (resume viewer, portfolio boxes, case studies, experience), Photo Album | all content from verified sources; resume downloads |
| **4. Interactive** | Battle engine + UI + difficulty + reward badge + Hall of Fame, visitor achievements, Easter eggs, walking sprite, remaining SFX/victory music | battle engine unit-tested; playable on touch |
| **5. Backend** | Supabase schema, RLS, edge function, Turnstile, Poké Pager, admin dashboard | message round-trip tested end-to-end on a real project |
| **6. Testing & launch** | a11y pass, Lighthouse, cross-device QA, deploy, docs | deployed URL |

---

## 7. Assets & information needed

See the "What I need from you" list in the README for the live checklist.
