-- Migration: 20260503120005 — RLS and table policies (greenfield baseline).

begin;

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
with check (
  id = auth.uid()
  and (
    is_platform_admin is not distinct from (
      select p.is_platform_admin
      from public.profiles p
      where p.id = auth.uid()
    )
  )
  and (
    auth_signup_account_type is not distinct from (
      select p.auth_signup_account_type
      from public.profiles p
      where p.id = auth.uid()
    )
  )
);

create policy "profiles_select_platform_admin"
on public.profiles
for select
to authenticated
using (public.is_platform_admin());

create policy "workspaces_select_member"
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id));

create policy "workspaces_select_platform_admin"
on public.workspaces
for select
to authenticated
using (public.is_platform_admin());

create policy "workspaces_update_platform_admin"
on public.workspaces
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

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

create policy "workspace_licenses_select_platform_admin"
on public.workspace_licenses
for select
to authenticated
using (public.is_platform_admin());

create policy "workspace_licenses_insert_platform_admin"
on public.workspace_licenses
for insert
to authenticated
with check (public.is_platform_admin());

create policy "workspace_licenses_update_platform_admin"
on public.workspace_licenses
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "workspace_licenses_delete_platform_admin"
on public.workspace_licenses
for delete
to authenticated
using (public.is_platform_admin());

create policy "license_events_select_member"
on public.license_events
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "license_events_select_platform_admin"
on public.license_events
for select
to authenticated
using (public.is_platform_admin());

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

commit;
