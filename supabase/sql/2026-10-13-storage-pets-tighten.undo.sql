-- Undo for 2026-10-13-storage-pets-tighten.sql
--
-- This restores the permissive versions, which let anyone with the public
-- anon key overwrite or delete any user's pet photo. Reversibility only.
begin;

drop policy "Users can upload pet photos" on storage.objects;
drop policy "Users can update pet photos" on storage.objects;
drop policy "Users can delete pet photos" on storage.objects;

create policy "Users can upload pet photos"
  on storage.objects for insert
  to public with check (bucket_id = 'pets');

create policy "Users can update pet photos"
  on storage.objects for update
  to public using (bucket_id = 'pets');

create policy "Users can delete pet photos"
  on storage.objects for delete
  to public using (bucket_id = 'pets');

commit;
