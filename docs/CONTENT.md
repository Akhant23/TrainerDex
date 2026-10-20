# Updating content

Everything personal lives in `src/content/`. Components read from these files, so you never need to
touch UI code to change what the site says. After editing, `npm run dev` hot-reloads instantly.

**Rule of thumb:** only verified facts go in here. If something comes from LinkedIn or your resume,
keep it consistent with those.

| File | What it controls |
|---|---|
| `profile.ts` | Name, Trainer ID, region, class, university, degree, interests, resume file |
| `dialogue.ts` | Intro script, main-menu sprite reactions, the secret click line |
| `menu.ts` | Main-menu tiles: label, colour, icon, one-line blurb, build phase, what's planned |
| `sprites.ts` | Which sprite art is used (built-in prototype or your PNGs), shiny odds |
| `experience.ts` | Every job, leadership and volunteer role (PC → Experience, resume text view) |
| `badges.ts` | The 8 badges: art, achievement entry, and which experience entries back them |
| `pokedex.ts` | The 15 Pokédex entries and the type list |
| `portfolio.ts` | Portfolio projects, media, case study fields; `published` hides one |
| `photos.ts` | The 10 album photos (empty until you add them) |
| `sources.ts` | Labels/links for "Source:" lines |

Every fact carries `sources` (resume, LinkedIn, LinkedIn volunteering, or "provided by Aaryan").

## Common edits

**Change the intro lines** — edit `introPart1` / `introPart2` in `dialogue.ts`. `{name}` becomes the
visitor's chosen name.

**Replace the resume** — overwrite `public/resume/resume.pdf`. The PC shows it inline, with download,
new-tab and full-screen buttons; phones default to the text version built from `experience.ts`.

**Fill in a portfolio case study** — in `portfolio.ts` set `role`, `tools`, and any `null` case-study
fields (challenge, strategy, result), then `confirmed: true`. Leave a field `null` rather than guess:
the site shows "Notes coming soon".

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

## Visitor data

Visitors' settings, chosen name, play time, Pokédex progress, badge shine, TRAINERDEX BADGE and Hall of Fame are stored only in their own browser (local storage,
key prefix `tdx:v1:`). Nothing is sent anywhere. **Settings → Reset save data** clears it.

## Open questions

Resolved on 20 Oct 2026: name (lead with **Aaryan Khan**), UNSOC title (VP Outreach), Tours
Coordinator dates (2025–2026), certifications (all 5), portfolio authorship (all Aaryan's — Canva +
Photoshop; 2024 = Marketing Director, 2025 = Marketing Coordinator), resume kept as-is with phone
and referees, album photos chosen.

Still open:
1. UNSW graduation: resume says **expected 2028** (used), LinkedIn says 2027.
2. Year unknown for **LawPLUS Trivia Night** (8 Apr — no weekday printed) and the two **Country Club: The Edit** pages, so they show role "Designer — UNSW Law Society marketing" without Director/Coordinator. Tell me the year and I'll set it.
3. Case-study **challenge / strategy / result** notes are empty for every piece (shows "Notes coming soon"). Real numbers — ticket sales, merch orders, reach — would make these much stronger.
4. **The Rager** stays hidden (`published: false`, files not in `public/`).
5. The resume lists one UNSW Future Students role (2023 – Present); LinkedIn splits it into Adviser (Nov 2023 – Dec 2024) and Enquiries Assistant (Dec 2024 – Present). The site follows LinkedIn.
