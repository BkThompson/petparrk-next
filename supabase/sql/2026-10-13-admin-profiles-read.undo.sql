-- Undo for 2026-10-13-admin-profiles-read.sql
drop policy "Admins can view all profiles" on public.profiles;
