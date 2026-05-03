-- Migration: 20260503120006 — storage buckets and policies (greenfield baseline).

begin;

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', false),
  ('workspace-private', 'workspace-private', false),
  ('workspace-public', 'workspace-public', true),
  ('generated-docs', 'generated-docs', false)
on conflict (id) do nothing;

create policy "avatars_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and public.path_first_segment_uuid(name) = auth.uid()
);

create policy "avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and public.path_first_segment_uuid(name) = auth.uid()
);

create policy "avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and public.path_first_segment_uuid(name) = auth.uid()
)
with check (
  bucket_id = 'avatars'
  and public.path_first_segment_uuid(name) = auth.uid()
);

create policy "avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and public.path_first_segment_uuid(name) = auth.uid()
);

create policy "workspace_private_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'workspace-private'
  and public.is_workspace_member(public.path_first_segment_uuid(name))
);

create policy "workspace_private_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'workspace-private'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "workspace_private_update_member"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'workspace-private'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
)
with check (
  bucket_id = 'workspace-private'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "workspace_private_delete_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'workspace-private'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "workspace_public_select_member_or_public"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'workspace-public'
  and (
    public.is_workspace_member(public.path_first_segment_uuid(name))
    or true
  )
);

create policy "workspace_public_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'workspace-public'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "workspace_public_update_member"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'workspace-public'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
)
with check (
  bucket_id = 'workspace-public'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "workspace_public_delete_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'workspace-public'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "generated_docs_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'generated-docs'
  and public.is_workspace_member(public.path_first_segment_uuid(name))
);

create policy "generated_docs_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'generated-docs'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "generated_docs_update_member"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'generated-docs'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
)
with check (
  bucket_id = 'generated-docs'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

create policy "generated_docs_delete_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'generated-docs'
  and public.can_manage_documents(public.path_first_segment_uuid(name))
);

commit;
