-- Run this in the Supabase SQL editor to add support for multiple named
-- trackers (e.g. one per kid), on top of the original supabase-schema.sql.

create table if not exists public.trackers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal_hours integer not null default 60,
  night_goal_hours integer not null default 10,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.trackers enable row level security;

create policy "Authenticated users can read trackers"
  on public.trackers for select
  to authenticated
  using (true);

create policy "Authenticated users can insert trackers"
  on public.trackers for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update trackers"
  on public.trackers for update
  to authenticated
  using (true);

create policy "Authenticated users can delete trackers"
  on public.trackers for delete
  to authenticated
  using (true);

alter publication supabase_realtime add table public.trackers;

-- Create a default tracker and attach all existing sessions to it, so
-- nothing you've already logged is lost.
insert into public.trackers (id, name, created_by)
select '00000000-0000-0000-0000-000000000001', 'Driving Hours', user_id
from public.driving_sessions
limit 1
on conflict (id) do nothing;

alter table public.driving_sessions
  add column if not exists tracker_id uuid references public.trackers(id) on delete cascade;

update public.driving_sessions
  set tracker_id = '00000000-0000-0000-0000-000000000001'
  where tracker_id is null;

alter table public.driving_sessions
  alter column tracker_id set not null;
