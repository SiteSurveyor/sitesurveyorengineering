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

commit;
