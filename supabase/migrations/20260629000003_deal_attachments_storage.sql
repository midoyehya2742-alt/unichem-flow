-- Private Storage bucket for deal attachments.
-- Files are uploaded under deals/{deal_id}/{attachment_id}-{filename} and the
-- deals.attachments jsonb stores { id, name, size, type, path }. The app reads
-- them back via short-lived signed URLs (createSignedUrl). Previously
-- attachments were embedded as base64 data URLs in the jsonb column.

insert into storage.buckets (id, name, public)
values ('deal-attachments', 'deal-attachments', false)
on conflict (id) do nothing;

-- Any authenticated user may read (signed URLs) and upload. The bucket is
-- private, and deals themselves are already RLS-scoped per role; deletion is
-- limited to finance/admin.
drop policy if exists "deal attachments read" on storage.objects;
create policy "deal attachments read"
  on storage.objects for select to authenticated
  using (bucket_id = 'deal-attachments');

drop policy if exists "deal attachments insert" on storage.objects;
create policy "deal attachments insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'deal-attachments');

drop policy if exists "deal attachments delete" on storage.objects;
create policy "deal attachments delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'deal-attachments' and is_admin_or_finance());
