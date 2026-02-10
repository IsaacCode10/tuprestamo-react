-- Add minimal fields for videollamada (solicitudes) and contrato notariado (desembolsos)

alter table public.solicitudes
  add column if not exists videollamada_ok boolean not null default false,
  add column if not exists videollamada_at timestamp with time zone;

alter table public.desembolsos
  add column if not exists notariado_ok boolean not null default false,
  add column if not exists notariado_url text;
