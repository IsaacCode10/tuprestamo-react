-- Whitelist explicita para incluir leads de ANTES del corte general (2026-09-07) en la
-- reactivacion por WhatsApp - revisados uno por uno con Isaac, no un cambio de fecha global.
alter table public.solicitudes add column if not exists incluir_reactivacion_retroactiva boolean not null default false;

update public.solicitudes set incluir_reactivacion_retroactiva = true where id in (247, 254);
