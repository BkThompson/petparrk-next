-- 2026-10-13  Scope the pets bucket's writes to the owner's own folder
--
-- The three write policies on the pets bucket checked only
--     bucket_id = 'pets'
-- with no folder condition and applied to the public role. So anyone holding
-- the public anon key — signed out, straight from the browser console — could
-- upload into any user's folder, overwrite any user's pet photo, or delete
-- them. The avatars bucket already had the folder check; pets never did.
--
-- Every upload path in the app writes to `${user.id}/...`:
--     app/profile/[username]/page.js   ${session.user.id}/${petId}.${ext}
--     app/profile/[username]/page.js   ${session.user.id}/${data.id}.${ext}
--     lib/useProfileState.js           ${session.user.id}/${petId}.${ext}
--     lib/petCardApi.js                ${user.id}/${petId}.${ext}
--     lib/petCardApi.js                ${user.id}/${petId}_hero_${slot}.${ext}
-- so the folder check matches all of them, including the hero variant.
-- Checked before applying: every existing folder in the bucket is a UUID,
-- nothing sits in the root, so no existing file became unmanageable.
--
-- to authenticated rather than public: there is no legitimate anonymous
-- upload. anon would fail the uid check anyway (auth.uid() is null, and
-- null = text yields null, not true), so this is belt and braces.
--
-- Verified against a local PostgreSQL 16 with stand-ins for auth.uid() and
-- storage.foldername(): owner insert allowed, hero filename allowed, writing
-- into another user's folder blocked, cross-user overwrite 0 rows, cross-user
-- delete 0 rows, anonymous insert blocked, owner delete allowed.

begin;

drop policy "Users can upload pet photos" on storage.objects;
drop policy "Users can update pet photos" on storage.objects;
drop policy "Users can delete pet photos" on storage.objects;

create policy "Users can upload pet photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'pets'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can update pet photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'pets'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can delete pet photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'pets'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

commit;
