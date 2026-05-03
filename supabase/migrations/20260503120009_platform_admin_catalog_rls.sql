-- Jobs catalog, marketplace listings, and professionals directory: writes restricted to platform operators.

begin;

drop policy if exists "jobs_manage_ops" on public.jobs;

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

drop policy if exists "marketplace_listings_insert_member" on public.marketplace_listings;
drop policy if exists "marketplace_listings_update_member" on public.marketplace_listings;
drop policy if exists "marketplace_listings_delete_member" on public.marketplace_listings;

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

drop policy if exists "professionals_insert_member" on public.professionals;
drop policy if exists "professionals_update_member" on public.professionals;
drop policy if exists "professionals_delete_member" on public.professionals;

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

commit;
