-- Migration: 20260503120003 — functions and RPCs (greenfield baseline).

begin;

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
  signup_account_type_value text;
begin
  full_name_value := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  signup_account_type_value := case lower(trim(coalesce(new.raw_user_meta_data ->> 'account_type', '')))
    when 'personal' then 'personal'
    when 'business' then 'business'
    when 'platform_admin' then 'platform_admin'
    else null
  end;

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
    default_workspace_id,
    auth_signup_account_type
  )
  values (
    new.id,
    new.email,
    full_name_value,
    nullif(new.raw_user_meta_data ->> 'promo_code', ''),
    created_workspace_id,
    signup_account_type_value
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        promo_code = coalesce(excluded.promo_code, public.profiles.promo_code),
        default_workspace_id = coalesce(public.profiles.default_workspace_id, excluded.default_workspace_id),
        auth_signup_account_type = coalesce(
          public.profiles.auth_signup_account_type,
          excluded.auth_signup_account_type
        ),
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

-- Bypasses RLS on profiles lookup; otherwise profiles_select_platform_admin + is_platform_admin() recurse infinitely.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_platform_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

comment on function public.is_platform_admin() is
  'True when profiles.is_platform_admin for auth.uid(). SECURITY DEFINER avoids RLS recursion.';

-- ── Business workspace helpers (from post_deploy) ──

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

-- ── License status guard (platform admin only, with billing sync bypass) ──

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

comment on function public.enforce_workspace_license_status_platform_admin() is
  'Rejects workspace_licenses.status updates unless profiles.is_platform_admin is true for auth.uid().';

-- ── Tier → cap alignment ──

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

-- ── Usage helpers ──

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

-- ── Promo code application ──

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

-- ── Seat / cap enforcement ──

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

-- ── Usage snapshot RPC ──

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

-- ── Payment method default setter ──

create or replace function public.set_default_payment_method(
  p_workspace_id uuid,
  p_method_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.has_workspace_role(p_workspace_id, array['owner'::public.workspace_member_role, 'admin'::public.workspace_member_role])
    or public.is_platform_admin()
  ) then
    raise exception 'Insufficient permissions to set default payment method.';
  end if;

  update public.payment_methods
  set is_default = false, updated_at = now()
  where workspace_id = p_workspace_id
    and is_default = true;

  update public.payment_methods
  set is_default = true, updated_at = now()
  where id = p_method_id
    and workspace_id = p_workspace_id;
end;
$$;

-- ── Admin expanded capabilities RPCs ──

create or replace function public.admin_list_audit_log(
  p_limit  int     default 50,
  p_offset int     default 0,
  p_workspace_id uuid default null,
  p_action text   default null
)
returns table (
  id          bigint,
  workspace_id uuid,
  actor_user_id uuid,
  entity_table text,
  entity_id    uuid,
  action       text,
  details      jsonb,
  created_at   timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform administrators may read the audit log.';
  end if;

  return query
    select
      a.id,
      a.workspace_id,
      a.actor_user_id,
      a.entity_table,
      a.entity_id,
      a.action,
      a.details,
      a.created_at
    from audit.activity_log a
    where (p_workspace_id is null or a.workspace_id = p_workspace_id)
      and (p_action is null or a.action = p_action)
    order by a.created_at desc
    limit p_limit
    offset p_offset;
end;
$$;

comment on function public.admin_list_audit_log(int, int, uuid, text) is
  'SECURITY DEFINER RPC so platform admins can read audit.activity_log without direct schema access.';

create or replace function public.admin_workspace_summary(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform administrators may access workspace summaries.';
  end if;

  select jsonb_build_object(
    'projects',  (select count(*) from public.projects    where workspace_id = p_workspace_id),
    'assets',    (select count(*) from public.assets      where workspace_id = p_workspace_id),
    'invoices',  (select count(*) from public.invoices    where workspace_id = p_workspace_id),
    'quotes',    (select count(*) from public.quotes      where workspace_id = p_workspace_id),
    'contacts',  (select count(*) from public.contacts    where workspace_id = p_workspace_id),
    'jobs',      (select count(*) from public.jobs        where workspace_id = p_workspace_id),
    'members',   (select count(*) from public.workspace_members where workspace_id = p_workspace_id)
  ) into result;

  return result;
end;
$$;

comment on function public.admin_workspace_summary(uuid) is
  'Returns entity counts for a workspace. Platform admin only.';

commit;
