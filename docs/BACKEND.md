# Poké Pager + Battle Resort backend (Supabase + Cloudflare Turnstile)

The guestbook and the resort's shared avatars need three things: a **Supabase** project (database + admin login + one Edge
Function), a **Cloudflare Turnstile** widget (free bot check), and a few environment variables.
Everything is on free tiers. Budget about 20 minutes.

```
browser ──read approved──▶ Supabase REST (RLS: approved rows, public columns only)
browser ──send──▶ Edge Function submit-message ──▶ validate · Turnstile · rate limit ──▶ insert as "pending"
you (#/admin) ──sign in──▶ Supabase Auth ──▶ approve / reject / spam / delete (RLS: admins only)
browser ──read avatars──▶ Supabase REST (RLS: trainers not hidden, public columns only)
browser ──save avatar──▶ Edge Function save-trainer ──▶ validate · owner secret · rate limit ──▶ upsert (public at once)
you (#/admin → RESORT AVATARS) ──▶ hide / unhide / delete
```

What's public vs secret:

| Value | Where it goes | Secret? |
|---|---|---|
| Supabase project URL | `.env.local` → `VITE_SUPABASE_URL` | no |
| Supabase **anon** key | `.env.local` → `VITE_SUPABASE_ANON_KEY` | no (RLS protects the data) |
| Turnstile **site** key | `.env.local` → `VITE_TURNSTILE_SITE_KEY` | no |
| Turnstile **secret** key | `supabase secrets set` | **yes** |
| Rate-limit salt | `supabase secrets set` | **yes** |
| Supabase **service role** key | never — Supabase injects it into the Edge Function | **yes** |

Never put a secret in a `VITE_` variable: anything `VITE_` ships to every visitor.

---

## 1. Create the Supabase project

1. Sign up at **supabase.com** → **New project**.
2. Name it `trainerdex`, set a strong database password (save it in your password manager),
   region **Sydney (ap-southeast-2)**.
3. When it's ready: **Project Settings → API**. Copy the **Project URL** and the **anon public** key.

## 2. Create the database tables

1. In the dashboard open **SQL Editor → New query**.
2. Paste the whole of `supabase/migrations/20261020000000_poke_pager.sql` and **Run**.
3. New query again: paste `supabase/migrations/20261021000000_battle_resort.sql` and **Run**.
4. Check **Table Editor**: you should see `messages`, `admins` and `trainers`, all marked "RLS enabled".

## 3. Lock down sign-ups and create your admin login

1. **Authentication → Sign In / Providers → Email**: keep Email enabled, and turn **off**
   "Allow new users to sign up" (so only accounts you create exist).
2. **Authentication → Users → Add user → Create new user**: your email + a strong password,
   tick **Auto Confirm User**.
3. Make that user an admin — in the **SQL Editor** run (with your email):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

Being signed in isn't enough to moderate — only users in `admins` can see pending messages or change
anything. That's enforced in the database, not the website.

## 4. Create the Turnstile widget

1. Sign in at **dash.cloudflare.com** (free account) → **Turnstile → Add widget**.
2. Name `TrainerDex`; hostnames: `localhost` now, and your real domain later (e.g. `aaryankhan.dev`,
   plus the Vercel preview domain if you use one). Widget mode: **Managed**.
3. Copy the **Site key** (public) and the **Secret key** (secret).

## 5. Deploy the Edge Function

Run these in your own terminal — the login and secrets steps should be typed by you, not pasted into
chat.

```bash
brew install supabase/tap/supabase
```

```bash
cd ~/Documents/trainerdex && supabase login
```

```bash
supabase init
```

(If `supabase init` asks about VS Code / IntelliJ settings, answer **N**. It only adds `supabase/config.toml`.)

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

The project ref is the `xxxx` in `https://xxxx.supabase.co`.

```bash
supabase secrets set TURNSTILE_SECRET_KEY=your-turnstile-secret RATE_LIMIT_SALT=$(openssl rand -hex 24) ALLOWED_ORIGINS=http://localhost:5173
```

When the site is live, run the same command again with your real origin added, comma-separated:
`ALLOWED_ORIGINS=http://localhost:5173,https://your-domain`.

```bash
supabase functions deploy submit-message
```

```bash
supabase functions deploy save-trainer
```

```bash
supabase functions deploy forget-me
```

## 6. Point the website at it

Create `.env.local` in the project root (it's git-ignored):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_TURNSTILE_SITE_KEY=0x4AAAA...
```

Restart `npm run dev`. The Poké Pager's "NO SIGNAL" notice disappears.

## 7. Test it end to end

1. Open **Poké Pager → Compose**, send a message. You should see "MESSAGE SENT!".
2. The inbox should **not** show it yet (it's pending).
3. Go to `/#/admin`, sign in, approve it under **PENDING**.
4. Back in the Pager, **Refresh** — it's there.
5. Try a message with a link or a swear word → friendly error. Send 4 in an hour → rate-limit error.
6. Open **Battle → make an avatar**. The panel should say "Saved — other visitors can see you now."
7. In a private window, make a second avatar and walk up to the first one: name tag, party and greeting should show.
8. Send a Pager message with **Show this above my avatar** ticked, approve it — it now pops up over that avatar.
9. `#/admin → RESORT AVATARS`: hide one, refresh the resort — it's gone. Unhide brings it back.
10. In the tower reception, drop an idea in the red suggestion box. It shows under `#/admin → SUGGESTIONS`, never in the public inbox.
11. Settings → Reset save data. Your avatar disappears from the resort and the messages/suggestions you sent are deleted (the function reports how many).

### Security checklist

- [x] Browser can't insert or update (no RLS insert policy; column grants limit reads to public columns).
- [x] Only `admins` can read pending messages or moderate (RLS + `is_admin()`).
- [x] Validation, honeypot, link + profanity filter, Turnstile and rate limiting all run server-side.
- [x] IPs are never stored — only a salted SHA-256 hash, visible to the service role only.
- [x] Messages render as plain text (React escapes everything; no `dangerouslySetInnerHTML`).
- [x] No admin password or secret in the frontend.
- [x] Resort avatars: only listed options are accepted (server re-parses every field), names and greetings run the same link + profanity filter, each avatar can only be edited with the random secret kept in its creator's browser (stored as a SHA-256 hash), 5 new avatars per IP per day, and admins can hide or delete. Hidden avatars stay hidden when edited.
- [x] Battle records (titles, wins, losses) are saved with each avatar. They're reported by the visitor's own browser, so treat them as for-fun, not proof; values are capped and checked as whole numbers.
- [x] Suggestions are stored as `kind = 'suggestion'` and RLS never returns them to visitors.
- [x] "Forget me": every message carries a SHA-256 of a random secret held only by the sender's browser (never readable by visitors); `forget-me` deletes those messages and the matching avatar.
- [x] "Match my photo" runs entirely in the browser — the photo is never uploaded or stored.
- [x] The Champion pin (`appearance.badge = 'champion'`) is a cosmetic field of the look. The server keeps it only if it's exactly `'champion'` and drops anything else (it never rejects the save over it). Like battle records, it's self-reported: tower progress lives only in the visitor's browser, so it can't be verified server-side.

### Redeploy needed for the Champion pin

`supabase/functions/_shared/appearance.ts` now accepts the optional `badge` field. Until
`save-trainer` is redeployed (`supabase functions deploy save-trainer`), the live function keeps
parsing with the old rules. It strips the unknown field and saves the rest, so nothing breaks,
but other visitors won't see anyone's pin yet. Your own pin always shows in your own browser.

## Phone as a controller (Supabase Realtime)

The desktop's phone icon (wide screens only) pairs a phone as a second-screen controller. It needs no
new tables, functions or secrets: it uses Realtime **broadcast** and **presence** on public channels
with the same anon key the site already ships. Realtime must allow public channels (Supabase's
default; if *Realtime → Settings → Allow public access* is turned off, pairing fails with
"Couldn't reach the pairing service").

- **Pairing:** the desktop makes a random 8-character code (31-symbol alphabet, ≈40 bits) shown as
  text and in a QR code linking to `<current origin>/#/controller?c=CODE`. The code never goes over
  the network. The channel name and the signing key are two separate SHA-256 hashes of it, so
  knowing a channel (or a session id) is not enough to send anything.
- **Every message is signed** (HMAC-SHA256 with the key, direction-tagged). Phone messages also carry
  a per-pairing session nonce from the desktop and a rising sequence number, so replays are
  ignored. The desktop parses every message strictly (exact fields, known buttons only) and
  rate-limits input.
- **What a phone can do:** press D-pad / A / B / START, or pick one of the options the desktop is
  showing. These are replayed as the same keys the keyboard uses (`src/systems/commands.ts`). The
  admin page (`#/admin`) refuses remote input entirely.
- **One phone per desktop:** a second phone gets "already connected".
- **Lifetimes:** an unused code expires after 5 minutes; a phone that drops off has 45 s to come
  back; 30 minutes without input ends the pairing. Either side can disconnect. Refreshing either
  device reconnects without pairing again (the session lives in that tab's sessionStorage).

**Testing on a local network.** The phone must be able to open the desktop's address, so
`localhost` won't do (the panel warns about this). Run the dev server on the network:

```bash
npm run dev -- --host
```

then open the site on the computer at the printed `Network:` address (e.g.
`http://192.168.0.67:5173`) before pairing, with both devices on the same Wi-Fi (no client
isolation). Plain-http LAN pages have no Web Crypto `subtle`, which is why the signing uses a small
built-in SHA-256 (`src/systems/sha256.ts`).

## Visit metrics (admin → METRICS)

The METRICS tab shows who visits: visitors, LinkedIn traffic, organisations, returning visits, time
on site, sections opened, visitors per day, a visitor table with each one's timeline, breakdowns
(sources, organisations, places, countries, referrers, devices, browsers, systems, utm / `?ref=`
tags) and personal links.

**Set up (once):**

```bash
supabase db push
```

```bash
supabase functions deploy track-visit forget-me
```

The migration (`20261027000000_visit_metrics.sql`) adds `visits`, `ip_lookups`, `visit_daily` and
`personal_links`, all behind RLS (admins read; nothing for visitors). `track-visit` uses the same
`ALLOWED_ORIGINS` secret as the other functions.

**How it works:** the site (`src/systems/analytics.ts`) reports a visit's start (referrer, tags, a
personal-link code), each menu section opened, and the seconds the page was visible. The function
works out browser, system and device from the User-Agent, and network and place from the IP via
ip-api.com (free, non-commercial; cached a week). Bots and link previews are ignored; 60 visits an
hour per IP at most.

**Privacy:**

- [x] Visitors can switch it off in Settings → VISIT STATS. Browsers with Do Not Track or Global
      Privacy Control on are never counted. Local dev servers don't report unless the
      `tdx:v1:metrics-dev` localStorage flag is set.
- [x] Visits, IP addresses and network lookups are kept 180 days, then folded into daily totals
      (`purge_old_visits()`, run now and then by `track-visit`).
- [x] Settings → Reset save data deletes this browser's visits too (`forget-me`, by the random
      visitor id).
- [x] Personal links: `/?p=<code>` labels every later visit from that browser (the code is kept in
      its localStorage).
