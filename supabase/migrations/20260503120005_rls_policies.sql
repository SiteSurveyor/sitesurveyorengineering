-- Migration: 20260503120005 — RLS and table policies (greenfield baseline).
-- Contains the FINAL versions of all policies, consolidated from all migrations.

begin;

-- ── Enable RLS on all tables ──

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
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_orders enable row level security;
alter table public.professionals enable row level security;
alter table public.project_activities enable row level security;
alter table public.time_entries enable row level security;
alter table public.expense_entries enable row level security;
alter table public.promo_code_rules enable row level security;
alter table public.payment_methods enable row level security;

-- ── Profiles ──

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

create policy "profiles_update_platform_admin"
on public.profiles
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ── Workspaces ──

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

-- ── Workspace settings ──

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

-- ── Workspace licenses ──

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

-- ── License events ──

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

-- ── Workspace members (business workspace only for management) ──

create policy "workspace_members_select_member"
on public.workspace_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "workspace_members_select_platform_admin"
on public.workspace_members
for select
to authenticated
using (public.is_platform_admin());

create policy "workspace_members_manage_admin"
on public.workspace_members
for all
to authenticated
using (public.can_manage_business_workspace(workspace_id))
with check (public.can_manage_business_workspace(workspace_id));

-- ── Workspace invitations (business workspace only) ──

create policy "workspace_invitations_select_manager"
on public.workspace_invitations
for select
to authenticated
using (public.can_manage_business_workspace(workspace_id));

create policy "workspace_invitations_manage_manager"
on public.workspace_invitations
for all
to authenticated
using (public.can_manage_business_workspace(workspace_id))
with check (public.can_manage_business_workspace(workspace_id));

-- ── Organizations ──

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

-- ── Contacts ──

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

-- ── Projects ──

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

-- ── Project members (business workspace only) ──

create policy "project_members_select_member"
on public.project_members
for select
to authenticated
using (
  public.is_business_workspace(workspace_id)
  and public.is_workspace_member(workspace_id)
);

create policy "project_members_manage_ops"
on public.project_members
for all
to authenticated
using (public.can_manage_business_operations(workspace_id))
with check (public.can_manage_business_operations(workspace_id));

-- ── Project contacts ──

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

-- ── Jobs (business workspace only, writes platform admin only) ──

create policy "jobs_select_member"
on public.jobs
for select
to authenticated
using (
  public.is_business_workspace(workspace_id)
  and public.is_workspace_member(workspace_id)
);

create policy "jobs_insert_platform_admin"
on public.jobs
for insert
to authenticated
with check (public.is_platform_admin());

create policy "jobs_update_platform_admin"
on public.jobs
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "jobs_delete_platform_admin"
on public.jobs
for delete
to authenticated
using (public.is_platform_admin());

-- ── Job events (business workspace only) ──

create policy "job_events_select_member"
on public.job_events
for select
to authenticated
using (
  public.is_business_workspace(workspace_id)
  and public.is_workspace_member(workspace_id)
);

create policy "job_events_manage_ops"
on public.job_events
for all
to authenticated
using (public.can_manage_business_operations(workspace_id))
with check (public.can_manage_business_operations(workspace_id));

-- ── Job assignments (business workspace only) ──

create policy "job_assignments_select_member"
on public.job_assignments
for select
to authenticated
using (
  public.is_business_workspace(workspace_id)
  and public.is_workspace_member(workspace_id)
);

create policy "job_assignments_manage_ops"
on public.job_assignments
for all
to authenticated
using (public.can_manage_business_operations(workspace_id))
with check (public.can_manage_business_operations(workspace_id));

-- ── Job assignment members (business workspace only) ──

create policy "job_assignment_members_select_member"
on public.job_assignment_members
for select
to authenticated
using (
  public.is_business_workspace(workspace_id)
  and public.is_workspace_member(workspace_id)
);

create policy "job_assignment_members_manage_ops"
on public.job_assignment_members
for all
to authenticated
using (public.can_manage_business_operations(workspace_id))
with check (public.can_manage_business_operations(workspace_id));

-- ── Job assignment assets (business workspace only) ──

create policy "job_assignment_assets_select_member"
on public.job_assignment_assets
for select
to authenticated
using (
  public.is_business_workspace(workspace_id)
  and public.is_workspace_member(workspace_id)
);

create policy "job_assignment_assets_manage_ops"
on public.job_assignment_assets
for all
to authenticated
using (public.can_manage_business_operations(workspace_id))
with check (public.can_manage_business_operations(workspace_id));

-- ── Assets ──

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

-- ── Asset calibrations ──

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

-- ── Asset maintenance events ──

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

-- ── Quotes ──

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

-- ── Quote items ──

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

-- ── Invoices ──

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

-- ── Invoice items ──

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

-- ── Payments ──

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

-- ── Attachments ──

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

-- ── Notifications ──

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

-- ── Marketplace listings (writes platform admin only) ──

create policy "marketplace_listings_select_member"
on public.marketplace_listings
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "marketplace_listings_insert_platform_admin"
on public.marketplace_listings
for insert
to authenticated
with check (public.is_platform_admin());

create policy "marketplace_listings_update_platform_admin"
on public.marketplace_listings
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "marketplace_listings_delete_platform_admin"
on public.marketplace_listings
for delete
to authenticated
using (public.is_platform_admin());

-- ── Marketplace orders ──

create policy "marketplace_orders_select_participant"
on public.marketplace_orders
for select
to authenticated
using (
  public.is_workspace_member(buyer_workspace_id)
  or public.is_workspace_member(listing_workspace_id)
);

-- ── Professionals directory (writes platform admin only) ──

create policy "professionals_select_member"
on public.professionals
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "professionals_insert_platform_admin"
on public.professionals
for insert
to authenticated
with check (public.is_platform_admin());

create policy "professionals_update_platform_admin"
on public.professionals
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "professionals_delete_platform_admin"
on public.professionals
for delete
to authenticated
using (public.is_platform_admin());

-- ── Project activities ──

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

-- ── Time entries ──

create policy "time_entries_select_member"
on public.time_entries
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "time_entries_insert_own"
on public.time_entries
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and user_id = auth.uid()
);

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

create policy "time_entries_delete_own"
on public.time_entries
for delete
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and user_id = auth.uid()
);

-- ── Expense entries ──

create policy "expense_entries_select_member"
on public.expense_entries
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "expense_entries_insert_own"
on public.expense_entries
for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and user_id = auth.uid()
);

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

create policy "expense_entries_delete_own"
on public.expense_entries
for delete
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and user_id = auth.uid()
);

-- ── Promo code rules ──

create policy "promo_code_rules_select_authenticated"
on public.promo_code_rules
for select
to authenticated
using (active);

-- ── Payment methods ──

create policy "payment_methods_select"
on public.payment_methods
for select
to authenticated
using (public.is_workspace_member(workspace_id) or public.is_platform_admin());

create policy "payment_methods_insert"
on public.payment_methods
for insert
to authenticated
with check (
  public.has_workspace_role(workspace_id, array['owner'::public.workspace_member_role, 'admin'::public.workspace_member_role])
  or public.is_platform_admin()
);

create policy "payment_methods_update"
on public.payment_methods
for update
to authenticated
using (
  public.has_workspace_role(workspace_id, array['owner'::public.workspace_member_role, 'admin'::public.workspace_member_role])
  or public.is_platform_admin()
);

create policy "payment_methods_delete"
on public.payment_methods
for delete
to authenticated
using (
  public.has_workspace_role(workspace_id, array['owner'::public.workspace_member_role, 'admin'::public.workspace_member_role])
  or public.is_platform_admin()
);

commit;
