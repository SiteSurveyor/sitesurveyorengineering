-- Migration: add is_global flag to marketplace_listings and professionals
-- so platform-admin-managed catalog entries are visible to all authenticated users.

begin;

-- ── Add is_global columns ──
alter table public.marketplace_listings
  add column if not exists is_global boolean not null default false;

alter table public.professionals
  add column if not exists is_global boolean not null default false;

-- ── Update select policies: all authenticated users can see global entries ──

-- Drop old select policies that only show workspace-scoped entries
-- and replace them with policies that also expose is_global=true rows.

-- Marketplace listings
drop policy if exists "marketplace_listings_select_member"
  on public.marketplace_listings;

create policy "marketplace_listings_select_member_or_global"
  on public.marketplace_listings
  for select
  to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or is_global = true
  );

-- Professionals directory
drop policy if exists "professionals_select_member"
  on public.professionals;

create policy "professionals_select_member_or_global"
  on public.professionals
  for select
  to authenticated
  using (
    public.is_workspace_member(workspace_id)
    or is_global = true
  );

-- ── Backfill: existing admin-managed rows become global ──
-- (These were only insertable by platform admins via existing policies.)
update public.marketplace_listings set is_global = true
  where is_global = false;

update public.professionals set is_global = true
  where is_global = false;

commit;
