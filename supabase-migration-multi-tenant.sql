-- Run this in the Supabase SQL editor to convert the app from "everyone
-- signed in sees everything" into real multi-tenant households. Each
-- household is a private group (e.g. one family); trackers belong to a
-- household; only members of that household can see or edit its data.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substring(md5(random()::text) from 1 for 6),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Security-definer helper so RLS policies can check "households the
-- current user belongs to" without recursively re-triggering RLS on
-- household_members itself.
create or replace function public.user_household_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select household_id from public.household_members where user_id = auth.uid();
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- Includes "or created_by = auth.uid()" so a user can see the household
-- they just created via `insert ... select()`, before their own
-- household_members row exists (INSERT...RETURNING is subject to the
-- SELECT policy too, otherwise the whole insert gets rolled back).
create policy "Members can read their households"
  on public.households for select
  to authenticated
  using (
    id in (select public.user_household_ids())
    or created_by = auth.uid()
  );

create policy "Authenticated users can create a household"
  on public.households for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Members can read their own membership rows"
  on public.household_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or household_id in (select public.user_household_ids())
  );

create policy "Users can add themselves to a household"
  on public.household_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can remove their own membership"
  on public.household_members for delete
  to authenticated
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.households;
alter publication supabase_realtime add table public.household_members;

-- Scope trackers to a household.
alter table public.trackers
  add column if not exists household_id uuid references public.households(id) on delete cascade;

-- Create a default household from whoever already has data, and attach
-- all existing users/trackers to it so nothing is lost.
insert into public.households (id, name, created_by)
select '00000000-0000-0000-0000-000000000002', 'My Household',
  (select created_by from public.trackers order by created_at limit 1)
where exists (select 1 from public.trackers)
  and not exists (select 1 from public.households where id = '00000000-0000-0000-0000-000000000002');

insert into public.household_members (household_id, user_id)
select distinct '00000000-0000-0000-0000-000000000002'::uuid, user_id
from public.driving_sessions
on conflict do nothing;

insert into public.household_members (household_id, user_id)
select distinct '00000000-0000-0000-0000-000000000002'::uuid, created_by
from public.trackers
on conflict do nothing;

update public.trackers
  set household_id = '00000000-0000-0000-0000-000000000002'
  where household_id is null;

alter table public.trackers
  alter column household_id set not null;

-- Replace the old "any authenticated user" policies with household checks.
drop policy if exists "Authenticated users can read trackers" on public.trackers;
drop policy if exists "Authenticated users can insert trackers" on public.trackers;
drop policy if exists "Authenticated users can update trackers" on public.trackers;
drop policy if exists "Authenticated users can delete trackers" on public.trackers;

create policy "Household members can read trackers"
  on public.trackers for select
  to authenticated
  using (household_id in (select public.user_household_ids()));

create policy "Household members can insert trackers"
  on public.trackers for insert
  to authenticated
  with check (household_id in (select public.user_household_ids()));

create policy "Household members can update trackers"
  on public.trackers for update
  to authenticated
  using (household_id in (select public.user_household_ids()));

create policy "Household members can delete trackers"
  on public.trackers for delete
  to authenticated
  using (household_id in (select public.user_household_ids()));

drop policy if exists "Authenticated users can read sessions" on public.driving_sessions;
drop policy if exists "Authenticated users can insert sessions" on public.driving_sessions;
drop policy if exists "Authenticated users can update sessions" on public.driving_sessions;
drop policy if exists "Authenticated users can delete sessions" on public.driving_sessions;

create policy "Household members can read sessions"
  on public.driving_sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.trackers t
      where t.id = driving_sessions.tracker_id
        and t.household_id in (select public.user_household_ids())
    )
  );

create policy "Household members can insert sessions"
  on public.driving_sessions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.trackers t
      where t.id = driving_sessions.tracker_id
        and t.household_id in (select public.user_household_ids())
    )
  );

create policy "Household members can update sessions"
  on public.driving_sessions for update
  to authenticated
  using (
    exists (
      select 1 from public.trackers t
      where t.id = driving_sessions.tracker_id
        and t.household_id in (select public.user_household_ids())
    )
  );

create policy "Household members can delete sessions"
  on public.driving_sessions for delete
  to authenticated
  using (
    exists (
      select 1 from public.trackers t
      where t.id = driving_sessions.tracker_id
        and t.household_id in (select public.user_household_ids())
    )
  );
