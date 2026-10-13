-- Undo for 2026-10-13-price-gate.sql
--
-- This re-opens the leak. It exists so the change is reversible, not because
-- it should ever be run.
create policy "Public can view vet prices"
  on public.vet_prices for select
  to anon
  using (true);
