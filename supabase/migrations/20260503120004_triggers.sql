-- Migration: 20260503120004 — triggers (greenfield baseline).

begin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

drop trigger if exists log_workspace_license_event_trigger on public.workspace_licenses;
create trigger log_workspace_license_event_trigger
after insert or update on public.workspace_licenses
for each row execute function public.log_workspace_license_event();

-- ── set_updated_at triggers for all tables ──

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
    'payments',
    'time_entries',
    'expense_entries'
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

-- ── Business workspace enforcement ──

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

-- ── License status guard ──

drop trigger if exists workspace_license_status_guard on public.workspace_licenses;
create trigger workspace_license_status_guard
before update on public.workspace_licenses
for each row
execute function public.enforce_workspace_license_status_platform_admin();

-- ── Tier → cap alignment ──

drop trigger if exists workspace_license_tier_caps on public.workspace_licenses;
create trigger workspace_license_tier_caps
before update on public.workspace_licenses
for each row
execute function public.workspace_license_align_caps_with_tier();

-- ── Promo code application on profile insert ──

drop trigger if exists profiles_apply_promo_entitlements on public.profiles;
create trigger profiles_apply_promo_entitlements
after insert on public.profiles
for each row
execute function public.trigger_profiles_apply_promo_entitlements();

-- ── Seat / usage cap enforcement ──

drop trigger if exists workspace_members_seat_limit on public.workspace_members;
create trigger workspace_members_seat_limit
before insert on public.workspace_members
for each row
execute function public.enforce_workspace_seat_limit_on_member();

drop trigger if exists workspace_invitations_seat_limit on public.workspace_invitations;
create trigger workspace_invitations_seat_limit
before insert on public.workspace_invitations
for each row
execute function public.enforce_workspace_seat_limit_on_invitation();

drop trigger if exists projects_workspace_cap on public.projects;
create trigger projects_workspace_cap
before insert on public.projects
for each row
execute function public.enforce_workspace_project_cap();

drop trigger if exists assets_workspace_cap on public.assets;
create trigger assets_workspace_cap
before insert on public.assets
for each row
execute function public.enforce_workspace_asset_cap();

drop trigger if exists attachments_storage_cap on public.attachments;
create trigger attachments_storage_cap
before insert on public.attachments
for each row
execute function public.enforce_workspace_storage_cap();

commit;
