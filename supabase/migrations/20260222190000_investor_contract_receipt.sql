-- Investor contract receipt support
alter table if exists public.inversiones
  add column if not exists investor_contract_url text,
  add column if not exists investor_contract_generated_at timestamp with time zone;

