-- Monetisation (no PSP): workspace entitlements on workspace_licenses, seat & usage enforcement,
-- promo signup rules, optional marketplace order log for manual / future settlement.

begin;

-- ── License status guard: allow trusted internal updates (e.g. promo) via session flag ──
create or replace function public.enforce_workspace_license_status_platform_admin()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if coalesce(current_setting('app.billing_license_sync', true), '') = '1' then
      return new;
    end if;
    if not public.is_platform_admin() then
      raise exception 'License status may only be changed by platform administrators';
    end if;
  end if;
  return new;
end;
$$;

-- ── Entitlement columns on workspace_licenses ──
alter table public.workspace_licenses
  add column if not exists seat_limit integer,
  add column if not exists project_cap integer,
  add column if not exists asset_cap integer,
  add column if not exists storage_cap_bytes bigint;

comment on column public.workspace_licenses.seat_limit is 'Max active members + pending invites; NULL = unlimited.';
comment on column public.workspace_licenses.project_cap is 'Max projects; NULL = unlimited.';
comment on column public.workspace_licenses.asset_cap is 'Max assets; NULL = unlimited.';
comment on column public.workspace_licenses.storage_cap_bytes is 'Max attachment bytes; NULL = unlimited.';

update public.workspace_licenses wl
set
  seat_limit = coalesce(wl.seat_limit, case when wl.tier = 'free' then 1 when wl.tier = 'pro' then 25 else null end),
  project_cap = coalesce(wl.project_cap, case when wl.tier = 'free' then 12 when wl.tier = 'pro' then 80 else null end),
  asset_cap = coalesce(wl.asset_cap, case when wl.tier = 'free' then 60 when wl.tier = 'pro' then 400 else null end),
  storage_cap_bytes = coalesce(wl.storage_cap_bytes, case when wl.tier = 'free' then 536870912 when wl.tier = 'pro' then 5368709120 else null end);

alter table public.workspace_licenses
  alter column seat_limit set default 1,
  alter column project_cap set default 12,
  alter column asset_cap set default 60,
  alter column storage_cap_bytes set default 536870912;

-- When admins change tier in-app, snap caps to tier defaults unless promo/billing sync flag is set.
create or replace function public.workspace_license_align_caps_with_tier()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.tier is distinct from old.tier
     and coalesce(current_setting('app.billing_license_sync', true), '') <> '1'
  then
    case new.tier
      when 'free' then
        new.seat_limit := 1;
        new.project_cap := 12;
        new.asset_cap := 60;
        new.storage_cap_bytes := 536870912;
      when 'pro' then
        new.seat_limit := 25;
        new.project_cap := null;
        new.asset_cap := null;
        new.storage_cap_bytes := 5368709120;
      when 'enterprise' then
        new.seat_limit := null;
        new.project_cap := null;
        new.asset_cap := null;
        new.storage_cap_bytes := null;
    end case;
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_license_tier_caps on public.workspace_licenses;
create trigger workspace_license_tier_caps
before update on public.workspace_licenses
for each row
execute function public.workspace_license_align_caps_with_tier();

-- ── Marketplace orders (manual reconciliation / future PSP; no gateway wired) ──
create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_workspace_id uuid not null references public.workspaces (id) on delete cascade,
  listing_workspace_id uuid not null references public.workspaces (id) on delete cascade,
  listing_id uuid not null references public.marketplace_listings (id) on delete restrict,
  amount numeric(12, 2) not null,
  currency text not null,
  platform_fee_amount numeric(12, 2) not null default 0,
  provider text not null default 'manual',
  external_payment_ref text unique,
  payment_status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_orders_buyer on public.marketplace_orders (buyer_workspace_id);
create index if not exists idx_marketplace_orders_listing on public.marketplace_orders (listing_id);

comment on table public.marketplace_orders is 'Optional order log (e.g. manual reconciliation). No payment processor is integrated.';

alter table public.marketplace_orders enable row level security;

create policy "marketplace_orders_select_participant"
on public.marketplace_orders
for select
to authenticated
using (
  public.is_workspace_member(buyer_workspace_id)
  or public.is_workspace_member(listing_workspace_id)
);

-- ── Promo rules → workspace entitlements at signup ──
create table if not exists public.promo_code_rules (
  code text primary key,
  trial_days integer,
  signup_tier public.license_tier,
  signup_license_status public.license_status default 'trialing',
  seat_bonus integer not null default 0,
  project_cap_boost integer not null default 0,
  asset_cap_boost integer not null default 0,
  active boolean not null default true
);

comment on table public.promo_code_rules is 'Maps signup promo codes to license trials and cap boosts.';

alter table public.promo_code_rules enable row level security;

create policy "promo_code_rules_select_authenticated"
on public.promo_code_rules
for select
to authenticated
using (active);

insert into public.promo_code_rules (code, trial_days, signup_tier, signup_license_status, seat_bonus, project_cap_boost, asset_cap_boost, active)
values
  ('EARLYBIRD', 21, 'pro', 'trialing', 5, 10, 25, true),
  ('FIELDCREW', 14, 'pro', 'trialing', 2, 5, 15, true)
on conflict (code) do nothing;

-- ── Helpers ──
create or replace function public.workspace_occupied_seats(p_workspace_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select count(*)::integer from public.workspace_members m where m.workspace_id = p_workspace_id and m.status = 'active'), 0)
    + coalesce((select count(*)::integer from public.workspace_invitations i where i.workspace_id = p_workspace_id and i.expires_at > now()), 0);
$$;

create or replace function public.workspace_active_project_count(p_workspace_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.projects p
  where p.workspace_id = p_workspace_id
    and p.archived_at is null
    and p.status <> 'archived'::public.project_status;
$$;

-- ── Promo application (trigger + service tooling) ──
create or replace function public.apply_promo_code_to_workspace(p_workspace_id uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.promo_code_rules%rowtype;
  v_code text := lower(trim(coalesce(p_code, '')));
begin
  if v_code = '' then
    return;
  end if;

  select * into r
  from public.promo_code_rules
  where lower(code) = v_code and active;

  if not found then
    return;
  end if;

  perform set_config('app.billing_license_sync', '1', true);

  if r.signup_tier = 'pro' then
    update public.workspace_licenses wl
    set
      tier = 'pro',
      status = coalesce(r.signup_license_status, wl.status),
      trial_ends_at = case
        when r.trial_days is not null then now() + (r.trial_days::text || ' days')::interval
        else wl.trial_ends_at
      end,
      seat_limit = 25 + coalesce(r.seat_bonus, 0),
      project_cap = null,
      asset_cap = null,
      storage_cap_bytes = 5368709120,
      notes = trim(both ' ' from concat(coalesce(wl.notes, ''), ' promo:', r.code)),
      is_manual = false,
      updated_at = now()
    where wl.workspace_id = p_workspace_id;
    return;
  end if;

  if r.signup_tier = 'enterprise' then
    update public.workspace_licenses wl
    set
      tier = 'enterprise',
      status = coalesce(r.signup_license_status, wl.status),
      trial_ends_at = case
        when r.trial_days is not null then now() + (r.trial_days::text || ' days')::interval
        else wl.trial_ends_at
      end,
      seat_limit = null,
      project_cap = null,
      asset_cap = null,
      storage_cap_bytes = null,
      notes = trim(both ' ' from concat(coalesce(wl.notes, ''), ' promo:', r.code)),
      is_manual = false,
      updated_at = now()
    where wl.workspace_id = p_workspace_id;
    return;
  end if;

  update public.workspace_licenses wl
  set
    trial_ends_at = case
      when r.trial_days is not null then now() + (r.trial_days::text || ' days')::interval
      else wl.trial_ends_at
    end,
    seat_limit = case
      when wl.seat_limit is null then null
      else wl.seat_limit + r.seat_bonus
    end,
    project_cap = case
      when wl.project_cap is null then null
      else wl.project_cap + r.project_cap_boost
    end,
    asset_cap = case
      when wl.asset_cap is null then null
      else wl.asset_cap + r.asset_cap_boost
    end,
    notes = trim(both ' ' from concat(coalesce(wl.notes, ''), ' promo:', r.code)),
    is_manual = false,
    updated_at = now()
  where wl.workspace_id = p_workspace_id;
end;
$$;

revoke all on function public.apply_promo_code_to_workspace(uuid, text) from public;
grant execute on function public.apply_promo_code_to_workspace(uuid, text) to service_role;

create or replace function public.trigger_profiles_apply_promo_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.promo_code is not null
     and trim(new.promo_code) <> ''
     and new.default_workspace_id is not null
  then
    perform public.apply_promo_code_to_workspace(new.default_workspace_id, new.promo_code);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_apply_promo_entitlements on public.profiles;
create trigger profiles_apply_promo_entitlements
after insert on public.profiles
for each row
execute function public.trigger_profiles_apply_promo_entitlements();

-- ── Seat limits ──
create or replace function public.enforce_workspace_seat_limit_on_member()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  lim integer;
  occ integer;
begin
  select wl.seat_limit into lim
  from public.workspace_licenses wl
  where wl.workspace_id = new.workspace_id;

  if lim is null then
    return new;
  end if;

  occ := public.workspace_occupied_seats(new.workspace_id);
  if occ >= lim then
    raise exception 'Workspace seat limit reached (%). Upgrade your plan or revoke pending invites.', lim;
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_members_seat_limit on public.workspace_members;
create trigger workspace_members_seat_limit
before insert on public.workspace_members
for each row
execute function public.enforce_workspace_seat_limit_on_member();

create or replace function public.enforce_workspace_seat_limit_on_invitation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  lim integer;
  occ integer;
begin
  select wl.seat_limit into lim
  from public.workspace_licenses wl
  where wl.workspace_id = new.workspace_id;

  if lim is null then
    return new;
  end if;

  occ := public.workspace_occupied_seats(new.workspace_id);
  if occ >= lim then
    raise exception 'Workspace seat limit reached (%). Upgrade your plan or remove pending invites.', lim;
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_invitations_seat_limit on public.workspace_invitations;
create trigger workspace_invitations_seat_limit
before insert on public.workspace_invitations
for each row
execute function public.enforce_workspace_seat_limit_on_invitation();

-- ── Usage caps: projects & assets & storage ──
create or replace function public.enforce_workspace_project_cap()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  cap integer;
  cnt integer;
begin
  select wl.project_cap into cap
  from public.workspace_licenses wl
  where wl.workspace_id = new.workspace_id;

  if cap is null then
    return new;
  end if;

  cnt := public.workspace_active_project_count(new.workspace_id);
  if cnt >= cap then
    raise exception 'Project limit reached (%). Upgrade your plan.', cap;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_workspace_cap on public.projects;
create trigger projects_workspace_cap
before insert on public.projects
for each row
execute function public.enforce_workspace_project_cap();

create or replace function public.enforce_workspace_asset_cap()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  cap integer;
  cnt integer;
begin
  select wl.asset_cap into cap
  from public.workspace_licenses wl
  where wl.workspace_id = new.workspace_id;

  if cap is null then
    return new;
  end if;

  select count(*)::integer into cnt
  from public.assets a
  where a.workspace_id = new.workspace_id;

  if cnt >= cap then
    raise exception 'Asset (instrument) limit reached (%). Upgrade your plan.', cap;
  end if;
  return new;
end;
$$;

drop trigger if exists assets_workspace_cap on public.assets;
create trigger assets_workspace_cap
before insert on public.assets
for each row
execute function public.enforce_workspace_asset_cap();

create or replace function public.enforce_workspace_storage_cap()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  cap bigint;
  used bigint;
  add_bytes bigint;
begin
  select wl.storage_cap_bytes into cap
  from public.workspace_licenses wl
  where wl.workspace_id = new.workspace_id;

  if cap is null then
    return new;
  end if;

  select coalesce(sum(a.size_bytes), 0)::bigint into used
  from public.attachments a
  where a.workspace_id = new.workspace_id;

  add_bytes := coalesce(new.size_bytes, 0)::bigint;
  if used + add_bytes > cap then
    raise exception 'Storage limit reached. Free space or upgrade your plan.';
  end if;
  return new;
end;
$$;

drop trigger if exists attachments_storage_cap on public.attachments;
create trigger attachments_storage_cap
before insert on public.attachments
for each row
execute function public.enforce_workspace_storage_cap();

-- ── RPC: usage snapshot for UI ──
create or replace function public.get_workspace_usage(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  wl public.workspace_licenses%rowtype;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Not allowed';
  end if;

  select * into wl from public.workspace_licenses where workspace_id = p_workspace_id;

  return jsonb_build_object(
    'tier', wl.tier,
    'status', wl.status,
    'seat_limit', wl.seat_limit,
    'seats_used', public.workspace_occupied_seats(p_workspace_id),
    'project_cap', wl.project_cap,
    'projects_used', public.workspace_active_project_count(p_workspace_id),
    'asset_cap', wl.asset_cap,
    'assets_used', (select count(*)::integer from public.assets a where a.workspace_id = p_workspace_id),
    'storage_cap_bytes', wl.storage_cap_bytes,
    'storage_used_bytes', (select coalesce(sum(a.size_bytes), 0)::bigint from public.attachments a where a.workspace_id = p_workspace_id)
  );
end;
$$;

grant execute on function public.get_workspace_usage(uuid) to authenticated;

commit;
