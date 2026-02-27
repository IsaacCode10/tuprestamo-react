-- Hardening definitivo:
-- 1) Normaliza estados históricos con espacios/mayúsculas.
-- 2) Sincroniza intents activos incoherentes para liberar cupo fantasma.
-- 3) Expone RPC canónico de saldo disponible para invertir (mismo criterio que create_investment_intent).

-- 1) Normalización de estados
update public.payment_intents
set status = lower(trim(coalesce(status, '')))
where status is not null
  and status <> lower(trim(status));

update public.inversiones
set status = lower(trim(coalesce(status, '')))
where status is not null
  and status <> lower(trim(status));

-- 2) Sincronización de intents activos inconsistentes
-- 2.1 Si el intent quedó "pending/unmatched" pero la inversión ya está pagada, marcar intent como paid.
update public.payment_intents pi
set status = 'paid',
    paid_at = coalesce(pi.paid_at, now()),
    paid_amount = coalesce(pi.paid_amount, pi.expected_amount),
    updated_at = now()
where lower(trim(coalesce(pi.status, ''))) in ('pending', 'unmatched')
  and exists (
    select 1
    from public.inversiones i
    where i.payment_intent_id = pi.id
      and lower(trim(coalesce(i.status, ''))) = 'pagado'
  );

-- 2.2 Si el intent quedó "pending/unmatched" y no tiene inversión activa asociada, expirar para liberar cupo.
update public.payment_intents pi
set status = 'expired',
    updated_at = now()
where lower(trim(coalesce(pi.status, ''))) in ('pending', 'unmatched')
  and (
    coalesce(pi.expires_at, now()) <= now()
    or not exists (
      select 1
      from public.inversiones i
      where i.payment_intent_id = pi.id
        and lower(trim(coalesce(i.status, ''))) in ('pendiente_pago', 'intencion')
    )
  );

-- 3) RPC canónico de saldo disponible para invertir.
create or replace function public.get_opportunity_available_for_investment(p_opportunity_id bigint)
returns table (
  opportunity_id bigint,
  monto_objetivo numeric,
  total_pagado numeric,
  total_reservado_activo numeric,
  saldo_disponible numeric
)
language sql
security definer
set search_path = public
as $$
  with paid as (
    select coalesce(sum(i.amount), 0) as total_pagado
    from public.inversiones i
    where i.opportunity_id = p_opportunity_id
      and lower(trim(coalesce(i.status, ''))) = 'pagado'
  ),
  reserved as (
    select coalesce(sum(pi.expected_amount), 0) as total_reservado
    from public.payment_intents pi
    where pi.opportunity_id = p_opportunity_id
      and lower(trim(coalesce(pi.status, ''))) in ('pending', 'unmatched')
      and coalesce(pi.expires_at, now()) > now()
  )
  select
    o.id as opportunity_id,
    round(coalesce(o.monto, 0), 2) as monto_objetivo,
    round(p.total_pagado, 2) as total_pagado,
    round(r.total_reservado, 2) as total_reservado_activo,
    greatest(round(coalesce(o.monto, 0), 2) - round(p.total_pagado, 2) - round(r.total_reservado, 2), 0) as saldo_disponible
  from public.oportunidades o
  cross join paid p
  cross join reserved r
  where o.id = p_opportunity_id;
$$;

grant execute on function public.get_opportunity_available_for_investment(bigint) to authenticated;
