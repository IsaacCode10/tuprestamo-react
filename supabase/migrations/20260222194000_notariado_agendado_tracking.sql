-- Track borrower confirmation that notary appointment was scheduled.
alter table if exists public.desembolsos
  add column if not exists notariado_agendado_at timestamp with time zone;

