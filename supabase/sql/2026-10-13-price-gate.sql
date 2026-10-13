-- 2026-10-13  Vet prices are for signed-in accounts only
--
-- Applied earlier today. Recorded here because the change lives in the
-- database and nothing in git described it.
--
-- public.vet_prices carried
--     "Public can view vet prices"  SELECT  to anon  using (true)
-- so every price was readable by anyone holding the public anon key. The
-- website drew a blur over the price chips, but the numbers were fetched
-- first and sat in the DOM, so the gate was decoration. Dropping the policy
-- makes it real.
--
-- "Authenticated can view vet_prices" already existed, so signed-in users are
-- unaffected. Admin's insert/update/delete policies are untouched.

drop policy "Public can view vet prices" on public.vet_prices;
