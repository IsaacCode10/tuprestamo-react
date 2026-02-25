-- Fix definitivo para create_investment_intent:
-- Evita errores intermitentes "function gen_random_bytes(integer) does not exist"
-- al asegurar pgcrypto y un search_path estable.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Search path estable para que la RPC siempre resuelva funciones de extensions.
alter function public.create_investment_intent(bigint, numeric)
set search_path = public, extensions;

-- Wrapper defensivo en public para no depender de search_path en futuras funciones.
create or replace function public.gen_random_bytes(integer)
returns bytea
language sql
immutable
as $$
  select extensions.gen_random_bytes($1);
$$;
