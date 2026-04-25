begin;

create extension if not exists pgcrypto;

create schema if not exists private;
create schema if not exists audit;

revoke all on schema private from public, anon, authenticated;
revoke all on schema audit from public, anon, authenticated;

DO $$ BEGIN 
  create type public.workspace_type as enum ('personal', 'business');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN 
  create type public.workspace_member_role as enum (
  'owner',
  'admin',
  'ops_manager',
  'finance',
  'sales',
  'technician',
  'viewer'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN 
  create type public.workspace_member_status as enum ('active', 'invited', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.organization_type as enum (
  'client',
  'vendor',
  'government',
  'partner',
  'lead',
  'subcontractor'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.project_status as enum (
  'draft',
  'active',
  'completed',
  'on_hold',
  'archived'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.job_status as enum (
  'planned',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.assignment_status as enum (
  'draft',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.quote_status as enum (
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.invoice_status as enum (
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.asset_kind as enum (
  'instrument',
  'vehicle',
  'equipment',
  'other'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.asset_status as enum (
  'available',
  'deployed',
  'maintenance',
  'retired'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.calibration_status as enum (
  'scheduled',
  'passed',
  'failed',
  'expired'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.attachment_visibility as enum (
  'private',
  'workspace',
  'public'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN 
  create type public.notification_status as enum (
  'unread',
  'read',
  'archived'
);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  create type public.license_tier as enum ('free', 'pro', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  create type public.license_status as enum (
    'trialing',
    'active',
    'past_due',
    'suspended',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  professional_title text,
  promo_code text,
  phone text,
  bio text,
  avatar_path text,
  default_workspace_id uuid,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  type public.workspace_type not null,
  owner_user_id uuid not null references auth.users (id) on delete restrict,
  billing_email text,
  currency_code text not null default 'USD',
  timezone text not null default 'Africa/Harare',
  country_code text not null default 'ZW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.profiles
  add constraint profiles_default_workspace_id_fkey
  foreign key (default_workspace_id)
  references public.workspaces (id)
  on delete set null;

create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  default_currency text not null default 'USD',
  timezone text not null default 'Africa/Harare',
  country_code text not null default 'ZW',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_licenses (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  tier public.license_tier not null default 'free',
  status public.license_status not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  trial_ends_at timestamptz,
  is_manual boolean not null default true,
  notes text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_member_role not null default 'viewer',
  status public.workspace_member_status not null default 'active',
  title text,
  work_email text,
  work_phone text,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role public.workspace_member_role not null default 'viewer',
  invited_by uuid references auth.users (id) on delete set null,
  invitation_token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  organization_type public.organization_type not null default 'client',
  email text,
  phone text,
  address text,
  city text,
  country_code text not null default 'ZW',
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  full_name text not null,
  title text,
  contact_type text,
  email text,
  phone text,
  last_contact_at timestamptz,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  code text,
  name text not null,
  description text,
  phase text,
  datum text,
  progress numeric(5,2) not null default 0 check (progress >= 0 and progress <= 100),
  points integer not null default 0,
  status public.project_status not null default 'draft',
  starts_on date,
  ends_on date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (workspace_id, code)
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table public.project_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  relation text,
  created_at timestamptz not null default now(),
  unique (project_id, contact_id)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  description text,
  job_type text,
  location text,
  status public.job_status not null default 'planned',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.job_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  job_id uuid references public.jobs (id) on delete cascade,
  title text not null,
  event_type text not null default 'other',
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  job_id uuid references public.jobs (id) on delete cascade,
  assignment_date date not null,
  status public.assignment_status not null default 'draft',
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  asset_code text,
  name text not null,
  kind public.asset_kind not null default 'instrument',
  category text,
  make text,
  model text,
  serial_number text,
  status public.asset_status not null default 'available',
  purchase_date date,
  purchase_cost numeric(12,2),
  current_value numeric(12,2),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (workspace_id, asset_code)
);

create table public.job_assignment_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  assignment_id uuid not null references public.job_assignments (id) on delete cascade,
  workspace_member_id uuid not null references public.workspace_members (id) on delete cascade,
  assignment_role text,
  created_at timestamptz not null default now(),
  unique (assignment_id, workspace_member_id)
);

create table public.job_assignment_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  assignment_id uuid not null references public.job_assignments (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (assignment_id, asset_id)
);

create table public.asset_calibrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  calibration_date date not null,
  next_calibration_date date,
  calibration_status public.calibration_status not null default 'scheduled',
  certificate_number text,
  certificate_path text,
  provider_name text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.asset_maintenance_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  serviced_on date not null,
  description text not null,
  cost numeric(12,2) not null default 0,
  provider_name text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  quote_number text not null,
  issue_date date not null default current_date,
  expires_on date,
  status public.quote_status not null default 'draft',
  currency_code text not null default 'USD',
  subtotal numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  accepted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, quote_number)
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  line_number integer not null default 1,
  description text not null,
  qty numeric(12,2) not null default 1,
  unit text,
  rate numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  invoice_number text not null,
  issue_date date not null default current_date,
  due_date date,
  status public.invoice_status not null default 'draft',
  currency_code text not null default 'USD',
  subtotal numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  paid_at timestamptz,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, invoice_number)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  line_number integer not null default 1,
  description text not null,
  qty numeric(12,2) not null default 1,
  unit text,
  rate numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  paid_on date not null default current_date,
  amount numeric(12,2) not null,
  payment_method text,
  reference text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity_table text not null,
  entity_id uuid not null,
  bucket_name text not null,
  storage_path text not null,
  visibility public.attachment_visibility not null default 'private',
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket_name, storage_path)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text,
  status public.notification_status not null default 'unread',
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table private.webhook_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit.activity_log (
  id bigint generated always as identity primary key,
  workspace_id uuid,
  actor_user_id uuid,
  entity_table text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.license_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  changed_by uuid references auth.users (id) on delete set null,
  previous_tier public.license_tier,
  new_tier public.license_tier,
  previous_status public.license_status,
  new_status public.license_status,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_workspace_members_user_id on public.workspace_members (user_id);
create index idx_workspace_members_workspace_id on public.workspace_members (workspace_id);
create index idx_workspace_invitations_workspace_id on public.workspace_invitations (workspace_id);
create index idx_workspace_invitations_email on public.workspace_invitations (lower(email));
create index idx_organizations_workspace_id on public.organizations (workspace_id);
create index idx_contacts_workspace_id on public.contacts (workspace_id);
create index idx_projects_workspace_id on public.projects (workspace_id);
create index idx_projects_workspace_status on public.projects (workspace_id, status);
create index idx_jobs_workspace_id on public.jobs (workspace_id);
create index idx_jobs_workspace_status on public.jobs (workspace_id, status);
create index idx_job_events_workspace_date on public.job_events (workspace_id, event_date);
create index idx_job_assignments_workspace_date on public.job_assignments (workspace_id, assignment_date);
create index idx_assets_workspace_kind_status on public.assets (workspace_id, kind, status);
create index idx_asset_calibrations_asset_id on public.asset_calibrations (asset_id);
create index idx_quotes_workspace_status on public.quotes (workspace_id, status);
create index idx_invoices_workspace_status on public.invoices (workspace_id, status);
create index idx_invoices_due_date on public.invoices (due_date);
create index idx_payments_invoice_id on public.payments (invoice_id);
create index idx_notifications_user_status on public.notifications (user_id, status);
create index idx_attachments_entity on public.attachments (workspace_id, entity_table, entity_id);
create index idx_audit_activity_workspace_created_at on audit.activity_log (workspace_id, created_at desc);
create index idx_workspace_licenses_tier_status on public.workspace_licenses (tier, status);
create index idx_license_events_workspace_created_at on public.license_events (workspace_id, created_at desc);

insert into public.workspace_licenses (workspace_id)
select w.id
from public.workspaces w
on conflict (workspace_id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.log_workspace_license_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.tier is distinct from new.tier or old.status is distinct from new.status or old.notes is distinct from new.notes then
      insert into public.license_events (
        workspace_id,
        changed_by,
        previous_tier,
        new_tier,
        previous_status,
        new_status,
        notes
      )
      values (
        new.workspace_id,
        auth.uid(),
        old.tier,
        new.tier,
        old.status,
        new.status,
        new.notes
      );
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.license_events (
      workspace_id,
      changed_by,
      previous_tier,
      new_tier,
      previous_status,
      new_status,
      notes
    )
    values (
      new.workspace_id,
      auth.uid(),
      null,
      new.tier,
      null,
      new.status,
      new.notes
    );
    return new;
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.path_first_segment_uuid(path text)
returns uuid
language plpgsql
immutable
as $$
declare
  first_segment text;
begin
  first_segment := split_part(path, '/', 1);

  if first_segment ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return first_segment::uuid;
  end if;

  return null;
end;
$$;

create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g')),
    ''
  );
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

create or replace function public.has_workspace_role(
  target_workspace_id uuid,
  allowed_roles public.workspace_member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = any (allowed_roles)
  );
$$;

create or replace function public.can_manage_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_workspace_role(
    target_workspace_id,
    array['owner'::public.workspace_member_role, 'admin'::public.workspace_member_role]
  );
$$;

create or replace function public.get_workspace_license_tier(target_workspace_id uuid)
returns public.license_tier
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select wl.tier
      from public.workspace_licenses wl
      where wl.workspace_id = target_workspace_id
      limit 1
    ),
    'free'::public.license_tier
  );
$$;

create or replace function public.is_workspace_license_active(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_licenses wl
    where wl.workspace_id = target_workspace_id
      and wl.status in ('trialing', 'active')
      and (wl.ends_at is null or wl.ends_at > now())
  );
$$;

create or replace function public.workspace_has_tier(
  target_workspace_id uuid,
  minimum_tier public.license_tier
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      case public.get_workspace_license_tier(target_workspace_id)
        when 'free' then 1
        when 'pro' then 2
        when 'enterprise' then 3
      end as actual_rank,
      case minimum_tier
        when 'free' then 1
        when 'pro' then 2
        when 'enterprise' then 3
      end as required_rank
  )
  select actual_rank >= required_rank from ranked;
$$;

create or replace function public.can_manage_operations(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_workspace_role(
    target_workspace_id,
    array[
      'owner'::public.workspace_member_role,
      'admin'::public.workspace_member_role,
      'ops_manager'::public.workspace_member_role
    ]
  );
$$;

create or replace function public.can_manage_finance(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_workspace_role(
    target_workspace_id,
    array[
      'owner'::public.workspace_member_role,
      'admin'::public.workspace_member_role,
      'finance'::public.workspace_member_role
    ]
  );
$$;

create or replace function public.can_manage_sales(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_workspace_role(
    target_workspace_id,
    array[
      'owner'::public.workspace_member_role,
      'admin'::public.workspace_member_role,
      'sales'::public.workspace_member_role
    ]
  );
$$;

create or replace function public.can_manage_assets(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_workspace_role(
    target_workspace_id,
    array[
      'owner'::public.workspace_member_role,
      'admin'::public.workspace_member_role,
      'ops_manager'::public.workspace_member_role,
      'technician'::public.workspace_member_role
    ]
  );
$$;

create or replace function public.can_manage_documents(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_workspace_role(
    target_workspace_id,
    array[
      'owner'::public.workspace_member_role,
      'admin'::public.workspace_member_role,
      'ops_manager'::public.workspace_member_role,
      'finance'::public.workspace_member_role,
      'sales'::public.workspace_member_role
    ]
  );
$$;

create or replace function public.shares_workspace_with_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs
      on theirs.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid()
      and mine.status = 'active'
      and theirs.user_id = target_profile_id
      and theirs.status = 'active'
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  full_name_value text;
  workspace_name_value text;
  workspace_type_value public.workspace_type;
  workspace_slug_value text;
  created_workspace_id uuid;
begin
  full_name_value := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  workspace_type_value := case
    when coalesce(new.raw_user_meta_data ->> 'account_type', 'personal') = 'business'
      then 'business'::public.workspace_type
    else 'personal'::public.workspace_type
  end;

  workspace_name_value := coalesce(
    nullif(new.raw_user_meta_data ->> 'workspace_name', ''),
    nullif(new.raw_user_meta_data ->> 'company', ''),
    case
      when workspace_type_value = 'business' then full_name_value || ' Workspace'
      else full_name_value || ' Personal Workspace'
    end
  );

  workspace_slug_value := public.slugify(workspace_name_value);

  insert into public.workspaces (
    name,
    slug,
    type,
    owner_user_id
  )
  values (
    workspace_name_value,
    workspace_slug_value,
    workspace_type_value,
    new.id
  )
  returning id into created_workspace_id;

  insert into public.workspace_settings (workspace_id)
  values (created_workspace_id);

  insert into public.workspace_licenses (workspace_id)
  values (created_workspace_id)
  on conflict (workspace_id) do nothing;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    status,
    joined_at
  )
  values (
    created_workspace_id,
    new.id,
    'owner',
    'active',
    now()
  );

  insert into public.profiles (
    id,
    email,
    full_name,
    promo_code,
    default_workspace_id
  )
  values (
    new.id,
    new.email,
    full_name_value,
    nullif(new.raw_user_meta_data ->> 'promo_code', ''),
    created_workspace_id
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        promo_code = coalesce(excluded.promo_code, public.profiles.promo_code),
        default_workspace_id = coalesce(public.profiles.default_workspace_id, excluded.default_workspace_id),
        updated_at = now();

  return new;
end;
$$;

create or replace function public.create_business_workspace(
  workspace_name text,
  workspace_slug text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_workspace_id uuid;
  v_slug text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if coalesce(trim(workspace_name), '') = '' then
    raise exception 'Workspace name is required.';
  end if;

  v_slug := public.slugify(coalesce(nullif(workspace_slug, ''), workspace_name));

  insert into public.workspaces (
    name,
    slug,
    type,
    owner_user_id
  )
  values (
    trim(workspace_name),
    v_slug,
    'business',
    v_user_id
  )
  returning id into v_workspace_id;

  insert into public.workspace_settings (workspace_id)
  values (v_workspace_id);

  insert into public.workspace_licenses (workspace_id)
  values (v_workspace_id)
  on conflict (workspace_id) do nothing;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    status,
    joined_at
  )
  values (
    v_workspace_id,
    v_user_id,
    'owner',
    'active',
    now()
  );

  update public.profiles
  set default_workspace_id = coalesce(default_workspace_id, v_workspace_id),
      updated_at = now()
  where id = v_user_id;

  return v_workspace_id;
end;
$$;

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

create or replace function public.set_default_workspace(
  target_workspace_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'You are not a member of this workspace.';
  end if;

  update public.profiles
  set default_workspace_id = target_workspace_id,
      updated_at = now()
  where id = v_user_id;

  return true;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

drop trigger if exists log_workspace_license_event_trigger on public.workspace_licenses;
create trigger log_workspace_license_event_trigger
after insert or update on public.workspace_licenses
for each row execute function public.log_workspace_license_event();

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles',
    'workspaces',
    'workspace_settings',
    'workspace_licenses',
    'workspace_members',
    'organizations',
    'contacts',
    'projects',
    'jobs',
    'job_events',
    'job_assignments',
    'assets',
    'asset_calibrations',
    'asset_maintenance_events',
    'quotes',
    'quote_items',
    'invoices',
    'invoice_items',
    'payments'
  ]
  loop
    execute format('drop trigger if exists set_updated_at_%1$s on public.%1$s', target_table);
    execute format(
      'create trigger set_updated_at_%1$s before update on public.%1$s for each row execute function public.set_updated_at()',
      target_table
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.workspace_licenses enable row level security;
alter table public.license_events enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.organizations enable row level security;
alter table public.contacts enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_contacts enable row level security;
alter table public.jobs enable row level security;
alter table public.job_events enable row level security;
alter table public.job_assignments enable row level security;
alter table public.assets enable row level security;
alter table public.job_assignment_members enable row level security;
alter table public.job_assignment_assets enable row level security;
alter table public.asset_calibrations enable row level security;
alter table public.asset_maintenance_events enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.attachments enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_select_self_or_shared_workspace"
on public.profiles
for select
to authenticated
using (
  id = auth.uid() or public.shares_workspace_with_profile(id)
);

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "workspaces_select_member"
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id));

create policy "workspace_settings_select_member"
on public.workspace_settings
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "workspace_settings_update_manager"
on public.workspace_settings
for update
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "workspace_licenses_select_member"
on public.workspace_licenses
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "workspace_licenses_update_manager"
on public.workspace_licenses
for update
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "workspace_licenses_insert_manager"
on public.workspace_licenses
for insert
to authenticated
with check (public.can_manage_workspace(workspace_id));

create policy "license_events_select_member"
on public.license_events
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "workspace_members_select_member"
on public.workspace_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "workspace_members_manage_admin"
on public.workspace_members
for all
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "workspace_invitations_select_manager"
on public.workspace_invitations
for select
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "workspace_invitations_manage_manager"
on public.workspace_invitations
for all
to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id));

create policy "organizations_select_member"
on public.organizations
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "organizations_manage_member"
on public.organizations
for insert
to authenticated
with check (public.can_manage_sales(workspace_id) or public.can_manage_workspace(workspace_id));

create policy "organizations_update_member"
on public.organizations
for update
to authenticated
using (public.can_manage_sales(workspace_id) or public.can_manage_workspace(workspace_id))
with check (public.can_manage_sales(workspace_id) or public.can_manage_workspace(workspace_id));

create policy "organizations_delete_manager"
on public.organizations
for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "contacts_select_member"
on public.contacts
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "contacts_manage_member"
on public.contacts
for insert
to authenticated
with check (public.can_manage_sales(workspace_id) or public.can_manage_workspace(workspace_id));

create policy "contacts_update_member"
on public.contacts
for update
to authenticated
using (public.can_manage_sales(workspace_id) or public.can_manage_workspace(workspace_id))
with check (public.can_manage_sales(workspace_id) or public.can_manage_workspace(workspace_id));

create policy "contacts_delete_manager"
on public.contacts
for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "projects_select_member"
on public.projects
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "projects_manage_ops"
on public.projects
for insert
to authenticated
with check (public.can_manage_operations(workspace_id) or public.can_manage_sales(workspace_id));

create policy "projects_update_ops"
on public.projects
for update
to authenticated
using (public.can_manage_operations(workspace_id) or public.can_manage_sales(workspace_id))
with check (public.can_manage_operations(workspace_id) or public.can_manage_sales(workspace_id));

create policy "projects_delete_manager"
on public.projects
for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "project_members_select_member"
on public.project_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "project_members_manage_ops"
on public.project_members
for all
to authenticated
using (public.can_manage_operations(workspace_id))
with check (public.can_manage_operations(workspace_id));

create policy "project_contacts_select_member"
on public.project_contacts
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "project_contacts_manage_ops"
on public.project_contacts
for all
to authenticated
using (public.can_manage_operations(workspace_id) or public.can_manage_sales(workspace_id))
with check (public.can_manage_operations(workspace_id) or public.can_manage_sales(workspace_id));

create policy "jobs_select_member"
on public.jobs
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "jobs_manage_ops"
on public.jobs
for all
to authenticated
using (public.can_manage_operations(workspace_id))
with check (public.can_manage_operations(workspace_id));

create policy "job_events_select_member"
on public.job_events
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "job_events_manage_ops"
on public.job_events
for all
to authenticated
using (public.can_manage_operations(workspace_id))
with check (public.can_manage_operations(workspace_id));

create policy "job_assignments_select_member"
on public.job_assignments
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "job_assignments_manage_ops"
on public.job_assignments
for all
to authenticated
using (public.can_manage_operations(workspace_id))
with check (public.can_manage_operations(workspace_id));

create policy "job_assignment_members_select_member"
on public.job_assignment_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "job_assignment_members_manage_ops"
on public.job_assignment_members
for all
to authenticated
using (public.can_manage_operations(workspace_id))
with check (public.can_manage_operations(workspace_id));

create policy "job_assignment_assets_select_member"
on public.job_assignment_assets
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "job_assignment_assets_manage_ops"
on public.job_assignment_assets
for all
to authenticated
using (public.can_manage_operations(workspace_id))
with check (public.can_manage_operations(workspace_id));

create policy "assets_select_member"
on public.assets
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "assets_manage_member"
on public.assets
for insert
to authenticated
with check (public.can_manage_assets(workspace_id));

create policy "assets_update_member"
on public.assets
for update
to authenticated
using (public.can_manage_assets(workspace_id))
with check (public.can_manage_assets(workspace_id));

create policy "assets_delete_manager"
on public.assets
for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "asset_calibrations_select_member"
on public.asset_calibrations
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "asset_calibrations_manage_member"
on public.asset_calibrations
for all
to authenticated
using (public.can_manage_assets(workspace_id))
with check (public.can_manage_assets(workspace_id));

create policy "asset_maintenance_select_member"
on public.asset_maintenance_events
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "asset_maintenance_manage_member"
on public.asset_maintenance_events
for all
to authenticated
using (public.can_manage_assets(workspace_id))
with check (public.can_manage_assets(workspace_id));

create policy "quotes_select_member"
on public.quotes
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "quotes_manage_member"
on public.quotes
for insert
to authenticated
with check (public.can_manage_sales(workspace_id) or public.can_manage_finance(workspace_id));

create policy "quotes_update_member"
on public.quotes
for update
to authenticated
using (public.can_manage_sales(workspace_id) or public.can_manage_finance(workspace_id))
with check (public.can_manage_sales(workspace_id) or public.can_manage_finance(workspace_id));

create policy "quotes_delete_manager"
on public.quotes
for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "quote_items_select_member"
on public.quote_items
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "quote_items_manage_member"
on public.quote_items
for all
to authenticated
using (public.can_manage_sales(workspace_id) or public.can_manage_finance(workspace_id))
with check (public.can_manage_sales(workspace_id) or public.can_manage_finance(workspace_id));

create policy "invoices_select_member"
on public.invoices
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "invoices_manage_finance"
on public.invoices
for insert
to authenticated
with check (public.can_manage_finance(workspace_id));

create policy "invoices_update_finance"
on public.invoices
for update
to authenticated
using (public.can_manage_finance(workspace_id))
with check (public.can_manage_finance(workspace_id));

create policy "invoices_delete_manager"
on public.invoices
for delete
to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "invoice_items_select_member"
on public.invoice_items
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "invoice_items_manage_finance"
on public.invoice_items
for all
to authenticated
using (public.can_manage_finance(workspace_id))
with check (public.can_manage_finance(workspace_id));

create policy "payments_select_member"
on public.payments
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "payments_manage_finance"
on public.payments
for all
to authenticated
using (public.can_manage_finance(workspace_id))
with check (public.can_manage_finance(workspace_id));

create policy "attachments_select_member_or_public"
on public.attachments
for select
to authenticated
using (
  visibility = 'public'
  or public.is_workspace_member(workspace_id)
);

create policy "attachments_manage_member"
on public.attachments
for insert
to authenticated
with check (public.can_manage_documents(workspace_id));

create policy "attachments_update_member"
on public.attachments
for update
to authenticated
using (public.can_manage_documents(workspace_id))
with check (public.can_manage_documents(workspace_id));

create policy "attachments_delete_member"
on public.attachments
for delete
to authenticated
using (public.can_manage_documents(workspace_id));

create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', false),
  ('workspace-private', 'workspace-private', false),
  ('workspace-public', 'workspace-public', true),
  ('generated-docs', 'generated-docs', false)
on conflict (id) do nothing;

create policy "avatars_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and public.path_first_segment_uuid(name) = auth.uid()
);

create policy "avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and public.path_first_segment_uuid(name) = auth.uid()
);

create policy "avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and public.path_first_segment_uuid(name) = auth.uid()
)
with check (
  bucket_id = 'avatars'
  and public.path_first_segment_uuid(name) = auth.uid()
);

create policy "avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and public.path_first_segment_uuid(name) = auth.uid()
);

create policy "workspace_private_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'workspace-private'
  and public.is_workspace_member(public.path_first_segment_uuid(name))
);

create policy "workspace_private_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'workspace-private'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "workspace_private_update_member"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'workspace-private'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
)
with check (
  bucket_id = 'workspace-private'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "workspace_private_delete_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'workspace-private'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "workspace_public_select_member_or_public"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'workspace-public'
  and (
    public.is_workspace_member(public.path_first_segment_uuid(name))
    or true
  )
);

create policy "workspace_public_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'workspace-public'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "workspace_public_update_member"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'workspace-public'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
)
with check (
  bucket_id = 'workspace-public'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "workspace_public_delete_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'workspace-public'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "generated_docs_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'generated-docs'
  and public.is_workspace_member(public.path_first_segment_uuid(name))
);

create policy "generated_docs_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'generated-docs'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "generated_docs_update_member"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'generated-docs'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
)
with check (
  bucket_id = 'generated-docs'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "generated_docs_delete_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'generated-docs'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

 

with users_missing_profile as (
  select
    u.id,
    u.email,
    coalesce(
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(u.email, ''), '@', 1)
    ) as full_name,
    nullif(u.raw_user_meta_data ->> 'promo_code', '') as promo_code
  from auth.users u
  left join public.profiles p
    on p.id = u.id
  where p.id is null
)
insert into public.profiles (
  id,
  email,
  full_name,
  promo_code
)
select
  id,
  email,
  full_name,
  promo_code
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
)
insert into public.workspace_settings (workspace_id)
select iw.id
from inserted_workspaces iw
on conflict (workspace_id) do nothing;

insert into public.workspace_licenses (workspace_id)
select iw.id
from inserted_workspaces iw
on conflict (workspace_id) do nothing;

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
