# Updating content

Everything personal lives in `src/content/`. Components read from these files, so you never need to
touch UI code to change what the site says. After editing, `npm run dev` hot-reloads instantly.

**Rule of thumb:** only verified facts go in here. If something comes from LinkedIn or your resume,
keep it consistent with those.

| File | What it controls |
|---|---|
| `profile.ts` | Name, Trainer ID, region, class, university, degree, interests, resume file |
| `dialogue.csv` | Every line of dialogue (intro, menu, tower, staff, signs, creatures) — see below |
| `menu.ts` | Main-menu tiles: label, colour, icon, one-line blurb, build phase, what's planned |
| `sprites.ts` | Which sprite art is used (built-in prototype or your PNGs), shiny odds |
| `experience.ts` | Every job, leadership and volunteer role (PC → Experience, resume text view) |
| `badges.ts` | The 8 badges: art, achievement entry, and which experience entries back them |
| `pokedex.ts` | The 15 Pokédex entries and the type list |
| `portfolio.ts` | Portfolio projects, media, case study fields; `published` hides one |
| `photos.ts` | The 10 album photos (empty until you add them) |
| `sources.ts` | Labels/links for "Source:" lines |

Every fact carries `sources` (resume, LinkedIn, LinkedIn volunteering, or "provided by Aaryan").

## Dialogue: `src/content/dialogue.csv`

Every line anyone says — your intro and menu lines, each tower floor, the resort staff, signs,
system messages, and your following creature's reactions and cries — is in one spreadsheet.

- Open it in Excel, Numbers or Google Sheets. Columns: **key** (don't change), **speaker**,
  **where** (when it's said, for your reference) and **text** (edit freely).
- Several rows with the same key are said in order, one dialogue box each. Add or delete rows to
  make a speech longer or shorter. For `follower.react`, one row is picked at random.
- `{name}` = the visitor's name, `{creature}` = their creature, `{place}` = where they are,
  `{cleared}` / `{next}` = tower floors. Lines starting with ▸ show as bullet points.
- Save as CSV (UTF-8) and either replace the file or send it back to me. `npm test` checks that
  no key the game needs has gone missing.

## Common edits

**Replace the resume** — overwrite `public/resume/resume.pdf`. The PC shows it inline, with download,
new-tab and full-screen buttons; phones default to the text version built from `experience.ts`.

**Fill in a portfolio case study** — in `portfolio.ts` set `role`, `tools` and any case-study
fields you have something real for (challenge, strategy, result). Fields left `null` are simply not
shown — don't fill them with guesses.

**Swap an album photo** — export at ~1600px on the long edge into `public/photos/NN-name.jpg` plus a
~420px `NN-name-thumb.jpg`, **strip location metadata** (phone photos carry GPS), then edit its entry in
`photos.ts`. Unused originals from the zip are in `content-source/photos-zip/` (git-ignored).

**Add a Pokédex entry** — append to `pokedex.ts` with the next `no`. Art can be any icon in
`src/sprites/icons.ts` or a badge id.

**Change the Trainer ID** — `trainerId` in `profile.ts`.

**Rename or recolour a menu tile** — `menu.ts`. `color` is `[main, dark]`.

## Battle tuning

Everything balance-related lives in `src/battle/data.ts`: the type chart, moves (power, accuracy,
PP, effects), creature base stats, and per-difficulty teams, levels and potions. After changing
numbers run `npm test` — the balance suite plays 450 simulated battles and checks Casual stays easy,
Champion stays hard-but-beatable, and the difficulties stay in order. Current simulated win rates for
a strong player: Casual ~100%, Standard ~74%, Champion ~25%.

Creature art is drawn from shapes in `src/sprites/creatures.ts` (see `raster.ts`); `npm run
sprites:export` writes PNG previews to `sprites-export/`.

## Battle Resort and the tower

- **Aaryan's looks per floor** — `src/content/aaryan.ts`: `signature` (everyday / Champion), `shinySignature`, and `towerStages` (floor, title, years, look, intro line, defeat line). Each look uses the same options visitors pick from.
- **The five floors** (from your photos): 1 SBHS student (brown blazer, blue piping, dark red tie) · 2 first-year (colour-run paint tee, March 2023) · 3 Marketing Director (black suit, Law Ball 2024) · 4 Yellow Shirts tours (O-Week tee, bucket hat, crossbody bag) · 5 Champion (today's look).
- **Floor teams and difficulty** — `src/battle/tower.ts` (`floors`: AI tier, Aaryan's team and levels, your level, potions, which creatures each floor unlocks). Each floor introduces creatures from that stage of the story. `npm test` simulates every floor and checks the climb stays beatable and gets harder (current starter-party win rates: 100%, 100%, 90%, 65%, 32%).
- **Creatures** — `src/battle/data.ts` (stats, moves, types) and `src/sprites/creatures.ts` (art). The six introduced in the tower, all drawn from real parts of the story: WICKETOAD (school cricket coaching), CAMPFLY (First Year Camp leader), MEGAPHAWK (marketing campaigns), STITCHICK (the merch he designed), DIPLOMOTH (DiscoverMUN mentoring) and DATADILLO (data & risk work at Clayton Utz).
- **Suggestion box** — in the tower reception. Ideas arrive in `#/admin → SUGGESTIONS` and are never shown publicly.
- **Resort maps** — `src/resort/maps.ts` (each character is a tile from `src/resort/tiles.ts`; buildings are `structures` drawn in `src/resort/structures.ts`; signs' text lives in `things`). The 2.5D view (tilted floor + upright sprites) is `src/resort/render.ts`.
- **Staff lines** — `src/resort/npcs.ts` (guide, lifeguard, receptionist).
- **Avatar options** — `supabase/functions/_shared/appearance.ts` is the single list used by the studio and the server. Adding an option means drawing it in `src/sprites/character.ts` and `overworld.ts` too (see docs/SPRITES.md).

## Medals and Easter eggs

`src/content/medals.ts` lists the 19 medals (name, description, tier, hidden + hint). The rules that
award them live in `src/systems/progress.ts` (collections, battles, polishing) and in the screens that
trigger them (shiny/secret on the main menu, resume in the PC, rare encounter in the Pokédex, the
Konami code in `src/systems/konami.ts`). Rare-encounter odds are in `dialogue.ts` and its lines in `dialogue.csv`; shiny
odds in `sprites.ts`.

The walking sprite is generated in `src/sprites/overworld.ts` (4 directions × 3 frames) and appears
in the Medal Box room.

## Visitor data

Visitors' settings, chosen name, play time, Pokédex progress, badge shine, TRAINERDEX BADGE, Hall of Fame, medals and tower progress are stored only in their own browser (local storage,
key prefix `tdx:v1:`). The only things ever sent are a Pager message they choose to send and, once Supabase is set up, their resort avatar (look, trainer name, greeting, party), which other visitors can see. **Settings → Reset save data** clears it.

## Open questions

None outstanding (20 Oct 2026). Decisions on record:

- Name: lead with **Aaryan Khan**; resume PDF kept as-is, with phone and referees.
- Graduation: **expected 2028** (LinkedIn now matches).
- Portfolio: all Aaryan's (Canva + Photoshop). 2024 pieces as Marketing Director (incl. LawPLUS Trivia Night); 2025 pieces as Marketing Coordinator. Country Club: The Edit (2025) was a merch campaign co-led with the co-coordinator.
- Merch: 2024 hoodie, socks and Law Camp leader shirt designed by Aaryan; the range sold out in both 2024 and 2025, and the Dean wore it both years.
- O-Week tours: 3,500 tourees, the highest since COVID (from Aaryan; LinkedIn says 3,000+).
- UNSW Future Students: one role, renamed in Dec 2024 — shown once under its current name, Nov 2023 – present.
- The Rager stays hidden.

