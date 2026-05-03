-- Migration: 20260503120007 — backfills, business rules, late tables (greenfield baseline).

begin;

with users_missing_profile as (
  select
    u.id,
    u.email,
    coalesce(
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(u.email, ''), '@', 1)
    ) as full_name,
    nullif(u.raw_user_meta_data ->> 'promo_code', '') as promo_code,
    case lower(trim(coalesce(u.raw_user_meta_data ->> 'account_type', '')))
      when 'personal' then 'personal'
      when 'business' then 'business'
      when 'platform_admin' then 'platform_admin'
      else null
    end as auth_signup_account_type
  from auth.users u
  left join public.profiles p
    on p.id = u.id
  where p.id is null
)
insert into public.profiles (
  id,
  email,
  full_name,
  promo_code,
  auth_signup_account_type
)
select
  id,
  email,
  full_name,
  promo_code,
  auth_signup_account_type
from users_missing_profile;

with users_without_workspace_membership as (
  select
    u.id,
    coalesce(
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(u.email, ''), '@', 1)
    ) as full_name,
    coalesce(
      nullif(u.raw_user_meta_data ->> 'workspace_name', ''),
      nullif(u.raw_user_meta_data ->> 'company', ''),
      case
        when coalesce(u.raw_user_meta_data ->> 'account_type', 'personal') = 'business'
          then coalesce(
            nullif(u.raw_user_meta_data ->> 'full_name', ''),
            nullif(u.raw_user_meta_data ->> 'name', ''),
            split_part(coalesce(u.email, ''), '@', 1)
          ) || ' Workspace'
        else coalesce(
          nullif(u.raw_user_meta_data ->> 'full_name', ''),
          nullif(u.raw_user_meta_data ->> 'name', ''),
          split_part(coalesce(u.email, ''), '@', 1)
        ) || ' Personal Workspace'
      end
    ) as workspace_name,
    case
      when coalesce(u.raw_user_meta_data ->> 'account_type', 'personal') = 'business'
        then 'business'::public.workspace_type
      else 'personal'::public.workspace_type
    end as workspace_type
  from auth.users u
  left join public.workspace_members wm
    on wm.user_id = u.id
  where wm.user_id is null
),
inserted_workspaces as (
  insert into public.workspaces (
    name,
    slug,
    type,
    owner_user_id
  )
  select
    uwm.workspace_name,
    left(
      coalesce(public.slugify(uwm.workspace_name), 'workspace') || '-' || replace(uwm.id::text, '-', ''),
      255
    ),
    uwm.workspace_type,
    uwm.id
  from users_without_workspace_membership uwm
  returning id, owner_user_id
),
ins_workspace_settings as (
  insert into public.workspace_settings (workspace_id)
  select iw.id
  from inserted_workspaces iw
  on conflict (workspace_id) do nothing
  returning workspace_id
),
ins_workspace_licenses as (
  insert into public.workspace_licenses (workspace_id)
  select iw.id
  from inserted_workspaces iw
  on conflict (workspace_id) do nothing
  returning workspace_id
)
select 1;

with users_without_workspace_membership as (
  select
    u.id
  from auth.users u
  left join public.workspace_members wm
    on wm.user_id = u.id
  where wm.user_id is null
),
target_workspaces as (
  select
    w.id as workspace_id,
    w.owner_user_id as user_id
  from public.workspaces w
  join users_without_workspace_membership uwm
    on uwm.id = w.owner_user_id
)
insert into public.workspace_members (
  workspace_id,
  user_id,
  role,
  status,
  joined_at
)
select
  tw.workspace_id,
  tw.user_id,
  'owner'::public.workspace_member_role,
  'active'::public.workspace_member_status,
  now()
from target_workspaces tw
on conflict (workspace_id, user_id) do update
set
  role = excluded.role,
  status = excluded.status,
  joined_at = coalesce(public.workspace_members.joined_at, excluded.joined_at),
  updated_at = now();

with first_workspace_per_user as (
  select distinct on (wm.user_id)
    wm.user_id,
    wm.workspace_id
  from public.workspace_members wm
  where wm.status = 'active'
  order by wm.user_id, wm.joined_at nulls last, wm.created_at, wm.id
)
update public.profiles p
set
  default_workspace_id = fw.workspace_id,
  updated_at = now()
from first_workspace_per_user fw
where p.id = fw.user_id
  and p.default_workspace_id is null;

 

create or replace function public.is_business_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace_id
      and w.type = 'business'
      and w.archived_at is null
  );
$$;

create or replace function public.can_manage_business_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_business_workspace(target_workspace_id)
    and public.can_manage_workspace(target_workspace_id);
$$;

create or replace function public.can_manage_business_operations(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_business_workspace(target_workspace_id)
    and public.can_manage_operations(target_workspace_id);
$$;

create or replace function public.enforce_business_workspace_for_team_and_dispatch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  v_workspace_id := coalesce(new.workspace_id, old.workspace_id);

  if v_workspace_id is null then
    raise exception 'A workspace_id is required.';
  end if;

  if not public.is_business_workspace(v_workspace_id) then
    raise exception 'This action is only available for business workspaces.';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists enforce_business_workspace_on_workspace_invitations on public.workspace_invitations;
create trigger enforce_business_workspace_on_workspace_invitations
before insert or update on public.workspace_invitations
for each row execute function public.enforce_business_workspace_for_team_and_dispatch();

drop trigger if exists enforce_business_workspace_on_jobs on public.jobs;
create trigger enforce_business_workspace_on_jobs
before insert or update on public.jobs
for each row execute function public.enforce_business_workspace_for_team_and_dispatch();

drop trigger if exists enforce_business_workspace_on_job_events on public.job_events;
create trigger enforce_business_workspace_on_job_events
before insert or update on public.job_events
for each row execute function public.enforce_business_workspace_for_team_and_dispatch();

drop trigger if exists enforce_business_workspace_on_job_assignments on public.job_assignments;
create trigger enforce_business_workspace_on_job_assignments
before insert or update on public.job_assignments
for each row execute function public.enforce_business_workspace_for_team_and_dispatch();

drop trigger if exists enforce_business_workspace_on_job_assignment_members on public.job_assignment_members;
create trigger enforce_business_workspace_on_job_assignment_members
before insert or update on public.job_assignment_members
for each row execute function public.enforce_business_workspace_for_team_and_dispatch();

drop trigger if exists enforce_business_workspace_on_job_assignment_assets on public.job_assignment_assets;
create trigger enforce_business_workspace_on_job_assignment_assets
before insert or update on public.job_assignment_assets
for each row execute function public.enforce_business_workspace_for_team_and_dispatch();


drop policy if exists "workspace_members_manage_admin" on public.workspace_members;
create policy "workspace_members_manage_admin"
on public.workspace_members
for all
to authenticated
using (public.can_manage_business_workspace(workspace_id))
with check (public.can_manage_business_workspace(workspace_id));

drop policy if exists "workspace_invitations_select_manager" on public.workspace_invitations;
create policy "workspace_invitations_select_manager"
on public.workspace_invitations
for select
to authenticated
using (public.can_manage_business_workspace(workspace_id));

drop policy if exists "workspace_invitations_manage_manager" on public.workspace_invitations;
create policy "workspace_invitations_manage_manager"
on public.workspace_invitations
for all
to authenticated
using (public.can_manage_business_workspace(workspace_id))
with check (public.can_manage_business_workspace(workspace_id));

drop policy if exists "project_members_select_member" on public.project_members;
create policy "project_members_select_member"
on public.project_members
for select
to authenticated
using (
  public.is_business_workspace(workspace_id)
  and public.is_workspace_member(workspace_id)
);

drop policy if exists "project_members_manage_ops" on public.project_members;
create policy "project_members_manage_ops"
on public.project_members
for all
to authenticated
using (public.can_manage_business_operations(workspace_id))
with check (public.can_manage_business_operations(workspace_id));

drop policy if exists "jobs_select_member" on public.jobs;
create policy "jobs_select_member"
on public.jobs
for select
to authenticated
using (
  public.is_business_workspace(workspace_id)
  and public.is_workspace_member(workspace_id)
);

drop policy if exists "jobs_manage_ops" on public.jobs;
create policy "jobs_manage_ops"
on public.jobs
for all
to authenticated
using (public.can_manage_business_operations(workspace_id))
with check (public.can_manage_business_operations(workspace_id));

drop policy if exists "job_events_select_member" on public.job_events;
create policy "job_events_select_member"
on public.job_events
for select
to authenticated
using (
  public.is_business_workspace(workspace_id)
  and public.is_workspace_member(workspace_id)
);

drop policy if exists "job_events_manage_ops" on public.job_events;
create policy "job_events_manage_ops"
on public.job_events
for all
to authenticated
using (public.can_manage_business_operations(workspace_id))
with check (public.can_manage_business_operations(workspace_id));

drop policy if exists "job_assignments_select_member" on public.job_assignments;
create policy "job_assignments_select_member"
on public.job_assignments
for select
to authenticated
using (
  public.is_business_workspace(workspace_id)
  and public.is_workspace_member(workspace_id)
);

drop policy if exists "job_assignments_manage_ops" on public.job_assignments;
create policy "job_assignments_manage_ops"
on public.job_assignments
for all
to authenticated
using (public.can_manage_business_operations(workspace_id))
with check (public.can_manage_business_operations(workspace_id));

drop policy if exists "job_assignment_members_select_member" on public.job_assignment_members;
create policy "job_assignment_members_select_member"
on public.job_assignment_members
for select
to authenticated
using (
  public.is_business_workspace(workspace_id)
  and public.is_workspace_member(workspace_id)
);

drop policy if exists "job_assignment_members_manage_ops" on public.job_assignment_members;
create policy "job_assignment_members_manage_ops"
on public.job_assignment_members
for all
to authenticated
using (public.can_manage_business_operations(workspace_id))
with check (public.can_manage_business_operations(workspace_id));

drop policy if exists "job_assignment_assets_select_member" on public.job_assignment_assets;
create policy "job_assignment_assets_select_member"
on public.job_assignment_assets
for select
to authenticated
using (
  public.is_business_workspace(workspace_id)
  and public.is_workspace_member(workspace_id)
);

drop policy if exists "job_assignment_assets_manage_ops" on public.job_assignment_assets;
create policy "job_assignment_assets_manage_ops"
on public.job_assignment_assets
for all
to authenticated
using (public.can_manage_business_operations(workspace_id))
with check (public.can_manage_business_operations(workspace_id));

create or replace function public.accept_workspace_invitation(
  target_invitation_token uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_invitation public.workspace_invitations%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select email
  into v_user_email
  from auth.users
  where id = v_user_id;

  select *
  into v_invitation
  from public.workspace_invitations
  where invitation_token = target_invitation_token
    and accepted_at is null
    and expires_at > now();

  if v_invitation.id is null then
    raise exception 'Invitation is invalid or expired.';
  end if;

  if not public.is_business_workspace(v_invitation.workspace_id) then
    raise exception 'Workspace invitations are only available for business workspaces.';
  end if;

  if lower(coalesce(v_user_email, '')) <> lower(v_invitation.email) then
    raise exception 'Invitation email does not match the signed-in user.';
  end if;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    status,
    invited_at,
    joined_at
  )
  values (
    v_invitation.workspace_id,
    v_user_id,
    v_invitation.role,
    'active',
    v_invitation.created_at,
    now()
  )
  on conflict (workspace_id, user_id) do update
    set role = excluded.role,
        status = 'active',
        invited_at = coalesce(public.workspace_members.invited_at, excluded.invited_at),
        joined_at = coalesce(public.workspace_members.joined_at, excluded.joined_at),
        updated_at = now();

  update public.workspace_invitations
  set accepted_at = now()
  where id = v_invitation.id;

  return v_invitation.workspace_id;
end;
$$;

 

create table if not exists public.marketplace_listings (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces on delete cascade on update cascade,
  name text not null,
  type text not null,
  condition text not null,
  price numeric not null,
  currency text not null,
  seller text not null,
  location text not null,
  description text,
  specs text[],
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index idx_marketplace_listings_workspace_id on public.marketplace_listings (workspace_id);

alter table public.marketplace_listings enable row level security;

create policy "marketplace_listings_select_member"
on public.marketplace_listings
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "marketplace_listings_insert_member"
on public.marketplace_listings
for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

create policy "marketplace_listings_update_member"
on public.marketplace_listings
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "marketplace_listings_delete_member"
on public.marketplace_listings
for delete
to authenticated
using (public.is_workspace_member(workspace_id));


create table if not exists public.professionals (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces on delete cascade on update cascade,
  name text not null,
  title text not null,
  discipline text not null,
  experience text not null,
  location text not null,
  rate numeric not null,
  rate_per text not null,
  currency text not null,
  availability text not null,
  rating numeric default 0,
  reviews integer default 0,
  skills text[],
  bio text,
  certifications text[],
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index idx_professionals_workspace_id on public.professionals (workspace_id);

alter table public.professionals enable row level security;

create policy "professionals_select_member"
on public.professionals
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "professionals_insert_member"
on public.professionals
for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

create policy "professionals_update_member"
on public.professionals
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "professionals_delete_member"
on public.professionals
for delete
to authenticated
using (public.is_workspace_member(workspace_id));

 

create table if not exists public.project_activities (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.projects (id) on delete cascade on update cascade,
  user_id uuid references auth.users (id) on delete set null,
  content text not null,
  activity_type text not null default 'note',
  created_at timestamp with time zone default now() not null
);

create index idx_project_activities_project_id on public.project_activities (project_id);

alter table public.project_activities enable row level security;

create policy "project_activities_select_member"
on public.project_activities
for select
to authenticated
using (
  exists (
    select 1 from public.project_members
    where project_id = project_activities.project_id
    and user_id = auth.uid()
  )
);

create policy "project_activities_insert_member"
on public.project_activities
for insert
to authenticated
with check (
  exists (
    select 1 from public.project_members
    where project_id = project_activities.project_id
    and user_id = auth.uid()
  )
);

create policy "project_activities_delete_member"
on public.project_activities
for delete
to authenticated
using (
  exists (
    select 1 from public.project_members
    where project_id = project_activities.project_id
    and user_id = auth.uid()
  )
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  entry_date date not null,
  task text not null,
  hours numeric(6,2) not null check (hours > 0),
  billable boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_time_entries_workspace_user_date
  on public.time_entries (workspace_id, user_id, entry_date desc);

create table if not exists public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  entry_date date not null,
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  vendor text,
  reimbursable boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_expense_entries_workspace_user_date
  on public.expense_entries (workspace_id, user_id, entry_date desc);

drop trigger if exists set_updated_at_time_entries on public.time_entries;
create trigger set_updated_at_time_entries
before update on public.time_entries
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_expense_entries on public.expense_entries;
create trigger set_updated_at_expense_entries
before update on public.expense_entries
for each row execute function public.set_updated_at();

alter table public.time_entries enable row level security;
alter table public.expense_entries enable row level security;

drop policy if exists "time_entries_select_member" on public.time_entries;
create policy "time_entries_select_member"
on public.time_entries
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "time_entries_insert_own" on public.time_entries;
create policy "time_entries_insert_own"
on public.time_entries
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and user_id = auth.uid()
);

drop policy if exists "time_entries_update_own" on public.time_entries;
create policy "time_entries_update_own"
on public.time_entries
for update
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and user_id = auth.uid()
)
with check (
  public.is_workspace_member(workspace_id)
  and user_id = auth.uid()
);

drop policy if exists "time_entries_delete_own" on public.time_entries;
create policy "time_entries_delete_own"
on public.time_entries
for delete
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and user_id = auth.uid()
);

drop policy if exists "expense_entries_select_member" on public.expense_entries;
create policy "expense_entries_select_member"
on public.expense_entries
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "expense_entries_insert_own" on public.expense_entries;
create policy "expense_entries_insert_own"
on public.expense_entries
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and user_id = auth.uid()
);

drop policy if exists "expense_entries_update_own" on public.expense_entries;
create policy "expense_entries_update_own"
on public.expense_entries
for update
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and user_id = auth.uid()
)
with check (
  public.is_workspace_member(workspace_id)
  and user_id = auth.uid()
);

drop policy if exists "expense_entries_delete_own" on public.expense_entries;
create policy "expense_entries_delete_own"
on public.expense_entries
for delete
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and user_id = auth.uid()
);

commit;
