-- Amortización y pagos extra — Tu Préstamo (Supabase/Postgres)
-- Ejecutar este script en Supabase SQL Editor.

-- Requisitos comunes
create extension if not exists pgcrypto; -- para gen_random_uuid()

-- 1) Solicitudes de pago extra (para el MVP de "intención")
create table if not exists public.pagos_extra_solicitados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  monto numeric(12,2) not null check (monto > 0),
  capital_antes numeric(14,2),
  tasa_anual numeric(7,4),
  plazo_antes integer,
  created_at timestamp with time zone default now()
);

create index if not exists idx_pagos_extra_user on public.pagos_extra_solicitados(user_id);

-- 2) Tabla de amortización por préstamo (usamos oportunidades.id como identificador del préstamo)
create table if not exists public.amortizaciones (
  id bigserial primary key,
  opportunity_id uuid not null,
  installment_no integer not null,
  due_date date not null,
  principal numeric(14,2) not null default 0,
  interest numeric(14,2) not null default 0,
  payment numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  status text not null default 'pendiente', -- pendiente | pagado | vencido
  created_at timestamp with time zone default now()
);

create index if not exists idx_amort_by_opportunity on public.amortizaciones(opportunity_id);
create unique index if not exists ux_amort_unique_installment on public.amortizaciones(opportunity_id, installment_no);

create or replace function public.next_monthly_payment_day5(p_reference timestamptz)
returns date
language sql
immutable
as $$
  select case
    when date_part('day', coalesce(p_reference, now())) <= 5
      then (date_trunc('month', coalesce(p_reference, now())) + interval '4 days')::date
    else ((date_trunc('month', coalesce(p_reference, now())) + interval '1 month') + interval '4 days')::date
  end;
$$;

-- 3) Función: generar amortización (método francés) manteniendo cuota fija
create or replace function public.generate_amortizacion(
  p_opportunity_id uuid,
  p_principal numeric,
  p_annual_pct numeric,
  p_months integer,
  p_first_due date
) returns void language plpgsql as $$
declare
  v_P numeric := coalesce(p_principal, 0);
  v_r numeric := coalesce(p_annual_pct, 0)/100/12;
  v_N int := coalesce(p_months, 0);
  v_payment numeric;
  v_balance numeric := v_P;
  v_interest numeric;
  v_principal_part numeric;
  v_due date := public.next_monthly_payment_day5(coalesce(p_first_due, now()));
  i int;
begin
  if v_N <= 0 or v_P <= 0 then
    return;
  end if;

  -- limpiar amortización previa
  delete from public.amortizaciones where opportunity_id = p_opportunity_id;

  if v_r = 0 then
    v_payment := v_P / v_N;
  else
    v_payment := v_P * v_r / (1 - power(1+v_r, -v_N));
  end if;

  for i in 1..v_N loop
    v_interest := round(v_balance * v_r, 2);
    v_principal_part := round(v_payment - v_interest, 2);
    v_balance := round(v_balance - v_principal_part, 2);

    insert into public.amortizaciones(
      opportunity_id, installment_no, due_date, principal, interest, payment, balance, status
    ) values (
      p_opportunity_id, i, v_due, v_principal_part, v_interest, round(v_principal_part+v_interest,2), greatest(v_balance,0), 'pendiente'
    );

    v_due := (v_due + interval '1 month')::date;
  end loop;
end;
$$;

-- 4) (Opcional) Trigger al pasar a estado 'desembolsado' para generar la tabla
-- Ajusta nombres de columnas/tabla según tu modelo real.
-- Se asume tabla public.oportunidades con columnas: id (uuid), monto numeric, plazo_meses int,
-- tasa_interes_prestatario numeric, fecha_desembolso date.
--
-- create or replace function public.on_oportunidad_desembolsada() returns trigger language plpgsql as $$
-- begin
--   if NEW.estado = 'desembolsado' then
--     perform public.generate_amortizacion(
--       NEW.id,
--       NEW.monto,
--       NEW.tasa_interes_prestatario,
--       NEW.plazo_meses,
--       coalesce(NEW.fecha_desembolso, current_date)
--     );
--   end if;
--   return NEW;
-- end; $$;
--
-- drop trigger if exists trg_oportunidad_desembolsada on public.oportunidades;
-- create trigger trg_oportunidad_desembolsada
--   after update of estado on public.oportunidades
--   for each row
--   when (NEW.estado = 'desembolsado' and coalesce(OLD.estado,'') is distinct from 'desembolsado')
--   execute function public.on_oportunidad_desembolsada();

-- 5) Ejemplo de uso manual
-- select public.generate_amortizacion(
--   '00000000-0000-0000-0000-000000000000'::uuid, -- opportunity_id
--   12000,   -- principal (Bs)
--   24,      -- tasa anual (%)
--   24,      -- meses
--   current_date + interval '30 days' -- primer vencimiento
-- );

-- Nota de seguridad (RLS):
-- Habilita RLS y políticas para que cada usuario solo vea su amortización si lo deseas.
-- alter table public.amortizaciones enable row level security;
-- create policy "amortizacion_owner_can_read" on public.amortizaciones
--   for select using (
--     exists (
--       select 1 from public.oportunidades o
--       where o.id = amortizaciones.opportunity_id
--       and o.user_id = auth.uid() -- ajusta a tu columna real del prestatario
--     )
--   );
