-- Visit metrics for the admin's METRICS tab: who visits, from where, for how long, and which
-- sections they open.
--
-- Security model
--   * Visitors can't read or write any of this from the browser. The site reports visits to the
--     `track-visit` Edge Function, which validates everything and writes with the service role.
--   * Admins (public.is_admin()) can read visits and daily totals, and manage personal links.
--   * Retention: visits (with their IP and network lookup) are kept 180 days, then folded into
--     daily totals by public.purge_old_visits(). IP lookups are cached for 7 days.
--   * A browser can delete its own visits through `forget-me` (by its random visitor id).

-- ---------- tables ----------
create table if not exists public.visits (
  id              uuid primary key default gen_random_uuid(),
  -- one row per browser tab session; the id is random and made by the browser
  session_id      text not null unique check (session_id ~ '^[a-z0-9]{16,40}$'),
  -- random per browser (localStorage), so repeat visits can be recognised
  visitor_id      text not null check (visitor_id ~ '^[a-z0-9]{16,40}$'),
  started_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  -- seconds the page was actually visible
  active_seconds  integer not null default 0 check (active_seconds between 0 and 14400),
  returning_visit boolean not null default false,
  source          text not null check (source in ('linkedin', 'search', 'social', 'referral', 'tagged', 'direct')),
  referrer_host   text check (char_length(referrer_host) <= 120),
  landing         text check (char_length(landing) <= 200),
  utm_source      text check (char_length(utm_source) <= 80),
  utm_medium      text check (char_length(utm_medium) <= 80),
  utm_campaign    text check (char_length(utm_campaign) <= 80),
  ref             text check (char_length(ref) <= 80),
  link_code       text check (char_length(link_code) <= 16),
  label           text check (char_length(label) <= 80),
  ip              inet,
  ip_host         text check (char_length(ip_host) <= 200),
  org             text check (char_length(org) <= 120),
  isp             text check (char_length(isp) <= 120),
  asn             text check (char_length(asn) <= 120),
  city            text check (char_length(city) <= 80),
  region          text check (char_length(region) <= 80),
  country         text check (char_length(country) <= 80),
  country_code    text check (char_length(country_code) <= 2),
  device          text check (device in ('desktop', 'mobile', 'tablet')),
  os              text check (char_length(os) <= 40),
  os_version      text check (char_length(os_version) <= 20),
  browser         text check (char_length(browser) <= 40),
  browser_version text check (char_length(browser_version) <= 20),
  -- the menu sections opened during the visit, in order, each once
  sections        text[] not null default '{}' check (cardinality(sections) <= 20)
);

create index if not exists visits_started_idx on public.visits (started_at desc);
create index if not exists visits_visitor_idx on public.visits (visitor_id, started_at desc);
create index if not exists visits_ip_recent_idx on public.visits (ip, started_at desc);

-- a week's cache of IP → network/place lookups, so a visitor isn't looked up on every visit
create table if not exists public.ip_lookups (
  ip           inet primary key,
  looked_up_at timestamptz not null default now(),
  host         text,
  org          text,
  isp          text,
  asn          text,
  city         text,
  region       text,
  country      text,
  country_code text
);

-- what's left of visits older than 180 days
create table if not exists public.visit_daily (
  day      date primary key,
  visits   integer not null default 0,
  visitors integer not null default 0,
  linkedin integer not null default 0
);

-- labelled links for one person each: every visit from that browser carries the label
create table if not exists public.personal_links (
  code       text primary key check (code ~ '^[a-z0-9]{6,16}$'),
  label      text not null check (char_length(btrim(label)) between 1 and 80),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- ---------- row level security ----------
alter table public.visits enable row level security;
alter table public.ip_lookups enable row level security;
alter table public.visit_daily enable row level security;
alter table public.personal_links enable row level security;

drop policy if exists "admins read visits" on public.visits;
create policy "admins read visits" on public.visits for select to authenticated using (public.is_admin());

drop policy if exists "admins read daily" on public.visit_daily;
create policy "admins read daily" on public.visit_daily for select to authenticated using (public.is_admin());

drop policy if exists "admins read links" on public.personal_links;
create policy "admins read links" on public.personal_links for select to authenticated using (public.is_admin());
drop policy if exists "admins add links" on public.personal_links;
create policy "admins add links" on public.personal_links for insert to authenticated with check (public.is_admin());
drop policy if exists "admins rename links" on public.personal_links;
create policy "admins rename links" on public.personal_links for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete links" on public.personal_links;
create policy "admins delete links" on public.personal_links for delete to authenticated using (public.is_admin());

-- ip_lookups has no policies at all: only the service role (the Edge Function) touches it

-- ---------- privileges ----------
revoke all on public.visits, public.ip_lookups, public.visit_daily, public.personal_links from anon, authenticated;
grant select on public.visits, public.visit_daily to authenticated;
grant select, insert, update (label), delete on public.personal_links to authenticated;

-- ---------- retention ----------
-- Folds visits older than 180 days into daily totals (Australia/Sydney days), then deletes them,
-- and drops IP lookups older than a week. Called now and then by `track-visit`.
create or replace function public.purge_old_visits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - interval '180 days';
  removed integer;
begin
  insert into public.visit_daily as d (day, visits, visitors, linkedin)
  select (started_at at time zone 'Australia/Sydney')::date,
         count(*),
         count(distinct visitor_id),
         count(*) filter (where source = 'linkedin')
  from public.visits
  where started_at < cutoff
  group by 1
  on conflict (day) do update
    set visits = d.visits + excluded.visits,
        visitors = d.visitors + excluded.visitors,
        linkedin = d.linkedin + excluded.linkedin;

  delete from public.visits where started_at < cutoff;
  get diagnostics removed = row_count;
  delete from public.ip_lookups where looked_up_at < now() - interval '7 days';
  return removed;
end $$;

revoke all on function public.purge_old_visits() from public, anon, authenticated;
