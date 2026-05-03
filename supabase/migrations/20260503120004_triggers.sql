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

commit;
