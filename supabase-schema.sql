-- Run this in the Supabase SQL editor for your project.

create table if not exists public.driving_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  minutes integer not null,
  notes text,
  night boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.driving_sessions enable row level security;

-- Everyone signed in can see and manage all sessions (shared family tracker).
-- If you want to restrict to only the session's own creator, change the
-- USING/WITH CHECK clauses to `auth.uid() = user_id`.
create policy "Authenticated users can read sessions"
  on public.driving_sessions for select
  to authenticated
  using (true);

create policy "Authenticated users can insert sessions"
  on public.driving_sessions for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update sessions"
  on public.driving_sessions for update
  to authenticated
  using (true);

create policy "Authenticated users can delete sessions"
  on public.driving_sessions for delete
  to authenticated
  using (true);

-- Enable realtime so multiple devices see new sessions live.
alter publication supabase_realtime add table public.driving_sessions;
