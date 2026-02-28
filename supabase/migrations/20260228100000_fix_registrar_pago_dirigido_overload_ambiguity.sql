-- Fix definitivo de ambigüedad RPC en PostgREST:
-- Existían dos overloads de registrar_pago_dirigido (3 y 4 parámetros),
-- lo que rompe la resolución de la llamada desde cliente.
-- Dejamos solo la firma con auditoría (4 parámetros).

drop function if exists public.registrar_pago_dirigido(bigint, text, text);

grant execute on function public.registrar_pago_dirigido(bigint, text, text, jsonb) to authenticated;
