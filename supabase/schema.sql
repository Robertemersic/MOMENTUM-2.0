-- ============================================================
--  Momentum — database schema
--  Run this ONCE in your Supabase project's SQL Editor.
--  It creates a single key/value table for all planner data
--  and locks it down so each user only sees their own rows.
-- ============================================================

create table if not exists entries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  key         text not null,
  value       jsonb,
  updated_at  timestamptz not null default now(),
  unique (user_id, key)
);

-- index for fast lookups by user + key prefix
create index if not exists entries_user_key_idx on entries (user_id, key);

-- Row Level Security: the database itself refuses cross-user reads/writes.
alter table entries enable row level security;

-- Each policy checks that the row's user_id equals the logged-in user.
create policy "read own entries"
  on entries for select
  using (auth.uid() = user_id);

create policy "insert own entries"
  on entries for insert
  with check (auth.uid() = user_id);

create policy "update own entries"
  on entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own entries"
  on entries for delete
  using (auth.uid() = user_id);

-- Keep updated_at fresh on every write.
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists entries_touch on entries;
create trigger entries_touch
  before update on entries
  for each row execute function touch_updated_at();
