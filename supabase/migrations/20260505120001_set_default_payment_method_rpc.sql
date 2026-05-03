begin;

-- Atomically set a single payment method as the default for a workspace.
-- Resets all other methods in the workspace to non-default first.
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
  -- Only allow workspace admins or platform admins
  if not (
    public.has_workspace_role(p_workspace_id, array['owner'::public.workspace_member_role, 'admin'::public.workspace_member_role])
    or public.is_platform_admin()
  ) then
    raise exception 'Insufficient permissions to set default payment method.';
  end if;

  -- Unset all defaults for this workspace
  update public.payment_methods
  set is_default = false, updated_at = now()
  where workspace_id = p_workspace_id
    and is_default = true;

  -- Set the chosen method as default
  update public.payment_methods
  set is_default = true, updated_at = now()
  where id = p_method_id
    and workspace_id = p_workspace_id;
end;
$$;

commit;
