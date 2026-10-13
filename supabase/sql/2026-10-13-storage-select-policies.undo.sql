-- Undo for 2026-10-13-storage-select-policies.sql
--
-- Running this breaks ALL pet-photo and avatar uploads again. It exists so
-- the change is reversible, not because it should be run.
drop policy "Public can view pet photos" on storage.objects;
drop policy "Public can view avatars" on storage.objects;
