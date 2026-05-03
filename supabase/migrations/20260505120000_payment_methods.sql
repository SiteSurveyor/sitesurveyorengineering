begin;

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type text not null check (type in ('Card', 'Mobile Money', 'Bank Transfer')),
  label text not null,
  detail text not null,
  holder text,
  expiry text,
  is_default boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_methods_workspace on public.payment_methods (workspace_id);

alter table public.payment_methods enable row level security;

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
