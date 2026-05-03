-- Migration: 20260503120002 — tables, indexes, seed insert (greenfield baseline).

begin;

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
  is_platform_admin boolean not null default false,
  auth_signup_account_type text,
  constraint profiles_auth_signup_account_type_chk check (
    auth_signup_account_type is null
    or auth_signup_account_type in ('personal', 'business', 'platform_admin')
  ),
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

comment on column public.profiles.is_platform_admin is
  'Trusted operators only; set in SQL by super-admins. Enables cross-tenant admin API via RLS policies.';
comment on column public.profiles.auth_signup_account_type is
  'Signup metadata: personal | business | platform_admin. Written only by handle_new_auth_user().';

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

commit;
