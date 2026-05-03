-- Only platform operators may change license status (tier/notes still editable by workspace managers).

begin;

create or replace function public.enforce_workspace_license_status_platform_admin()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if not public.is_platform_admin() then
      raise exception 'License status may only be changed by platform administrators';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.enforce_workspace_license_status_platform_admin() is
  'Rejects workspace_licenses.status updates unless profiles.is_platform_admin is true for auth.uid().';

drop trigger if exists workspace_license_status_guard on public.workspace_licenses;
create trigger workspace_license_status_guard
before update on public.workspace_licenses
for each row
execute function public.enforce_workspace_license_status_platform_admin();

commit;
