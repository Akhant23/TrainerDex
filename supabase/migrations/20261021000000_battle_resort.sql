-- Battle Resort: visitors' public avatars ("trainers") and linking pager messages to them.
--
-- Security model
--   * Visitors (anon) can READ trainers that aren't hidden, and only the public columns.
--   * Nobody can INSERT or UPDATE from the browser. Saves go through the `save-trainer` Edge
--     Function, which validates (names are filtered), checks ownership with a hashed secret,
--     rate-limits new avatars per IP, then writes with the service role.
--   * Avatars go public immediately. Admins can hide (and unhide) or delete them.

-- ---------- table ----------
create table if not exists public.trainers (
  id          uuid primary key,
  name        text not null check (char_length(name) between 1 and 16),
  greeting    text not null default 'Hi!' check (char_length(greeting) between 1 and 60),
  appearance  jsonb not null check (jsonb_typeof(appearance) = 'object' and pg_column_size(appearance) < 2048),
  party       text[] not null check (cardinality(party) between 1 and 3),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- sha-256 of the owner's random secret (kept in their browser); proves who may edit
  secret_hash text not null,
  -- salted hash of the creator's IP, used only for rate limiting; never exposed
  ip_hash     text
);

create index if not exists trainers_visible_recent_idx on public.trainers (hidden, updated_at desc);
create index if not exists trainers_ip_recent_idx on public.trainers (ip_hash, created_at desc);

-- ---------- row level security ----------
alter table public.trainers enable row level security;

drop policy if exists "visitors read visible trainers" on public.trainers;
create policy "visitors read visible trainers"
  on public.trainers for select
  to anon, authenticated
  using (not hidden or public.is_admin());

drop policy if exists "admins update trainers" on public.trainers;
create policy "admins update trainers"
  on public.trainers for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete trainers" on public.trainers;
create policy "admins delete trainers"
  on public.trainers for delete
  to authenticated
  using (public.is_admin());

-- no insert policy: only the Edge Function (service role) creates trainers

-- ---------- column privileges ----------
revoke all on public.trainers from anon;
grant select (id, name, greeting, appearance, party, updated_at) on public.trainers to anon;

revoke all on public.trainers from authenticated;
grant select (id, name, greeting, appearance, party, updated_at, created_at, hidden), update (hidden), delete on public.trainers to authenticated;

-- ---------- link pager messages to a trainer ----------
alter table public.messages add column if not exists trainer_id uuid references public.trainers (id) on delete set null;
create index if not exists messages_trainer_idx on public.messages (trainer_id, created_at desc);

grant select (trainer_id) on public.messages to anon, authenticated;

-- ---------- creature suggestions ----------
-- Suggestions arrive through the same Edge Function as messages but are never shown publicly:
-- only admins can read them.
alter table public.messages add column if not exists kind text not null default 'message' check (kind in ('message', 'suggestion'));

drop policy if exists "visitors read approved" on public.messages;
create policy "visitors read approved"
  on public.messages for select
  to anon, authenticated
  using ((status = 'approved' and kind = 'message') or public.is_admin());

grant select (kind) on public.messages to authenticated;

-- ---------- "forget me" ----------
-- sha-256 of the sender's random browser secret, so a visitor can later delete what they sent.
-- Never readable by visitors.
alter table public.messages add column if not exists owner_hash text;
create index if not exists messages_owner_idx on public.messages (owner_hash);
