-- 2026-10-13  SELECT policies for the pets and avatars buckets
--
-- Every pet-photo and profile-photo upload failed for every user with
--     "new row violates row-level security policy for table objects"
-- even though storage.objects had a permissive INSERT policy for both
-- buckets and the files were well under the 5 MB limit with an allowed
-- mime type. The upload never reached Storage at all.
--
-- Cause: there was no SELECT policy on storage.objects for either bucket.
-- Only `receipts` had one, which is why receipt uploads always worked.
-- Supabase's storage API inserts the object row with a RETURNING clause,
-- and PostgreSQL applies SELECT policies to RETURNING — so with no SELECT
-- policy the insert is refused and reported as a check violation. Verified
-- against a local PostgreSQL 16 with the same policy shape: a plain INSERT
-- succeeds, the same INSERT ... RETURNING fails with that exact message.
--
-- Both buckets are already public = true, so their contents are served
-- world-readable through the public URL. These policies expose nothing new;
-- they make RLS agree with what the buckets already are.

create policy "Public can view pet photos"
  on storage.objects for select
  to public
  using (bucket_id = 'pets');

create policy "Public can view avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
