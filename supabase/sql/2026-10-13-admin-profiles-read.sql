-- 2026-10-13  Admins can read every profile
--
-- public.profiles had exactly three policies and none of them gave admins a
-- read. The one SELECT policy is
--     (is_public = true) OR (auth.uid() = id)
-- which is correct for the public profile pages, but it also applied to the
-- Admin page: Admin reads profiles with the ordinary anon-key client under the
-- signed-in user's role, so it could only ever see public profiles plus the
-- admin's own row. Every private user was invisible there, along with their
-- status, is_flagged and flag_reason — the moderation fields Admin exists to
-- act on.
--
-- Policies are OR'd together, so this only ever widens access for admins. It
-- cannot restrict what the existing public policy already allows.
--
-- is_admin_with(permission text) is the SECURITY DEFINER helper the other
-- tables' policies already use, which avoids the catch-22 of reading
-- admin_users from inside an admin_users policy.

create policy "Admins can view all profiles"
  on public.profiles for select
  to authenticated
  using (is_admin_with('any'));
