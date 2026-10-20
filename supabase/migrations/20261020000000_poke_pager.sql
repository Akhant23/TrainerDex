-- Poké Pager guestbook: messages, moderation and admin access.
--
-- Security model
--   * Visitors (anon) can only READ approved messages, and only the public columns.
--   * Nobody can INSERT from the browser. New messages go through the `submit-message`
--     Edge Function, which validates, checks Turnstile, rate-limits, then inserts as
--     `pending` using the service role.
--   * Admins are signed-in users listed in `public.admins`. They can read everything and
--     change status / delete. Being signed in alone grants nothing.

-- ---------- types ----------
do $$ begin
  create type public.message_status as enum ('pending', 'approved', 'rejected', 'spam');
exception when duplicate_object then null; end $$;

-- ---------- tables ----------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 24),
  message     text not null check (char_length(message) between 1 and 280),
  avatar      text not null default 'trainer' check (char_length(avatar) <= 24),
  status      public.message_status not null default 'pending',
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  -- salted hash of the sender's IP, used only for rate limiting; never exposed to visitors
  ip_hash     text
);

create index if not exists messages_status_created_idx on public.messages (status, created_at desc);
create index if not exists messages_ip_recent_idx on public.messages (ip_hash, created_at desc);

create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- helper ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- row level security ----------
alter table public.messages enable row level security;
alter table public.admins enable row level security;

drop policy if exists "visitors read approved" on public.messages;
create policy "visitors read approved"
  on public.messages for select
  to anon, authenticated
  using (status = 'approved' or public.is_admin());

drop policy if exists "admins update" on public.messages;
create policy "admins update"
  on public.messages for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete" on public.messages;
create policy "admins delete"
  on public.messages for delete
  to authenticated
  using (public.is_admin());

-- no insert policy at all: browser inserts are impossible; the Edge Function uses the service role

drop policy if exists "admins see admins" on public.admins;
create policy "admins see admins"
  on public.admins for select
  to authenticated
  using (user_id = auth.uid());

-- ---------- column privileges ----------
-- Visitors may only ever see these columns (ip_hash and status stay private).
revoke all on public.messages from anon;
grant select (id, name, message, avatar, created_at) on public.messages to anon;

revoke all on public.messages from authenticated;
-- signed-in users (admins, via RLS) see status too, but ip_hash stays readable only by the service role
grant select (id, name, message, avatar, created_at, status, reviewed_at), update (status), delete on public.messages to authenticated;

revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;

-- stamp reviews automatically
create or replace function public.stamp_review()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists messages_stamp_review on public.messages;
create trigger messages_stamp_review
  before update on public.messages
  for each row execute function public.stamp_review();
