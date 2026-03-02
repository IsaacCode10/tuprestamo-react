-- Fix definitivo de panel inversionista:
-- 1) get_investor_installments filtra por oportunidad y usa cronograma canónico
-- 2) investor_next_payment_view calcula monto por inversionista (v2) y evita usar monto prestatario*0.99

create or replace function public.get_investor_installments(
  p_opportunity_id bigint,
  p_investor_id uuid
)
returns table (
  installment_no integer,
  due_date date,
  payment_borrower numeric,
  payment_investor_bruto numeric,
  payment_investor_neto numeric,
  weight numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with opp as (
    select
      o.id,
      coalesce(o.cashflow_model_version, 'v1') as cashflow_model_version,
      coalesce(o.tasa_rendimiento_inversionista, 0)::numeric as tasa_rendimiento_inversionista,
      greatest(coalesce(o.plazo_meses, 1), 1)::integer as plazo_meses,
      coalesce(o.comision_servicio_inversionista_porcentaje, 1)::numeric as comision_servicio_inversionista_porcentaje
    from public.oportunidades o
    where o.id = p_opportunity_id
    limit 1
  ),
  inv as (
    select coalesce(sum(i.amount), 0)::numeric as capital_investor
    from public.inversiones i
    where i.opportunity_id = p_opportunity_id
      and i.investor_id = p_investor_id
      and lower(trim(coalesce(i.status, ''))) = 'pagado'
  ),
  tot as (
    select coalesce(sum(i.amount), 0)::numeric as total_pagado
    from public.inversiones i
    where i.opportunity_id = p_opportunity_id
      and lower(trim(coalesce(i.status, ''))) = 'pagado'
  ),
  sched as (
    select
      row_number() over (order by x.due_date) as installment_no,
      x.due_date,
      x.expected_amount::numeric as payment_borrower
    from (
      select distinct on (bpi.due_date)
        bpi.due_date,
        bpi.expected_amount,
        bpi.id
      from public.borrower_payment_intents bpi
      where bpi.opportunity_id = p_opportunity_id
      order by bpi.due_date, bpi.id
    ) x
  ),
  calc as (
    select
      s.installment_no,
      s.due_date,
      s.payment_borrower,
      case
        when lower(o.cashflow_model_version) = 'v2' then
          case
            when (o.tasa_rendimiento_inversionista / 100 / 12) > 0
              then inv.capital_investor
                   * (o.tasa_rendimiento_inversionista / 100 / 12)
                   / nullif(1 - power(1 + (o.tasa_rendimiento_inversionista / 100 / 12), -o.plazo_meses), 0)
            else inv.capital_investor / nullif(o.plazo_meses, 0)
          end
        else s.payment_borrower * (inv.capital_investor / nullif(tot.total_pagado, 0))
      end as payment_investor_bruto,
      (inv.capital_investor / nullif(tot.total_pagado, 0)) as weight,
      o.comision_servicio_inversionista_porcentaje
    from sched s
    cross join inv
    cross join tot
    cross join opp o
    where inv.capital_investor > 0
      and tot.total_pagado > 0
  )
  select
    c.installment_no,
    c.due_date,
    round(c.payment_borrower, 2) as payment_borrower,
    round(c.payment_investor_bruto, 2) as payment_investor_bruto,
    round(c.payment_investor_bruto * (1 - c.comision_servicio_inversionista_porcentaje / 100), 2) as payment_investor_neto,
    c.weight
  from calc c
  order by c.installment_no;
$$;

create or replace view public.investor_next_payment_view as
with positions as (
  select
    i.investor_id,
    i.opportunity_id,
    sum(i.amount)::numeric as capital_investor
  from public.inversiones i
  where lower(trim(coalesce(i.status, ''))) = 'pagado'
  group by i.investor_id, i.opportunity_id
),
opp as (
  select
    o.id as opportunity_id,
    coalesce(o.cashflow_model_version, 'v1') as cashflow_model_version,
    coalesce(o.tasa_rendimiento_inversionista, 0)::numeric as tasa_rendimiento_inversionista,
    greatest(coalesce(o.plazo_meses, 1), 1)::integer as plazo_meses,
    coalesce(o.comision_servicio_inversionista_porcentaje, 1)::numeric as comision_servicio_inversionista_porcentaje
  from public.oportunidades o
),
next_sched as (
  select
    x.opportunity_id,
    x.due_date,
    x.expected_amount,
    row_number() over (partition by x.opportunity_id order by x.due_date) as rn
  from (
    select distinct on (bpi.opportunity_id, bpi.due_date)
      bpi.opportunity_id,
      bpi.due_date,
      bpi.expected_amount,
      bpi.id
    from public.borrower_payment_intents bpi
    where lower(trim(coalesce(bpi.status, ''))) = 'pending'
    order by bpi.opportunity_id, bpi.due_date, bpi.id
  ) x
),
next_pending_payout as (
  select
    p.investor_id,
    p.opportunity_id,
    p.amount,
    p.created_at,
    row_number() over (partition by p.investor_id, p.opportunity_id order by p.created_at, p.id) as rn
  from public.payouts_inversionistas p
  where lower(trim(coalesce(p.status, ''))) = 'pending'
),
tot as (
  select
    i.opportunity_id,
    sum(i.amount)::numeric as total_pagado
  from public.inversiones i
  where lower(trim(coalesce(i.status, ''))) = 'pagado'
  group by i.opportunity_id
),
projected as (
  select
    pos.investor_id,
    pos.opportunity_id,
    ns.due_date,
    case
      when lower(o.cashflow_model_version) = 'v2' then
        case
          when (o.tasa_rendimiento_inversionista / 100 / 12) > 0
            then pos.capital_investor
                 * (o.tasa_rendimiento_inversionista / 100 / 12)
                 / nullif(1 - power(1 + (o.tasa_rendimiento_inversionista / 100 / 12), -o.plazo_meses), 0)
          else pos.capital_investor / nullif(o.plazo_meses, 0)
        end
      else ns.expected_amount * (pos.capital_investor / nullif(t.total_pagado, 0))
    end as bruto
  from positions pos
  join opp o on o.opportunity_id = pos.opportunity_id
  join tot t on t.opportunity_id = pos.opportunity_id
  left join next_sched ns on ns.opportunity_id = pos.opportunity_id and ns.rn = 1
)
select
  p.investor_id,
  p.opportunity_id,
  round(
    case
      when npp.amount is not null then npp.amount
      else coalesce(proj.bruto, 0) * (1 - o.comision_servicio_inversionista_porcentaje / 100)
    end,
    2
  ) as expected_amount,
  case
    when npp.amount is not null then 'pending_payout'::text
    when proj.due_date is not null then 'programado'::text
    else 'sin_datos'::text
  end as source,
  coalesce(proj.due_date, (npp.created_at at time zone 'UTC')::date) as due_date
from positions p
join opp o on o.opportunity_id = p.opportunity_id
left join projected proj
  on proj.investor_id = p.investor_id
 and proj.opportunity_id = p.opportunity_id
left join next_pending_payout npp
  on npp.investor_id = p.investor_id
 and npp.opportunity_id = p.opportunity_id
 and npp.rn = 1;

grant execute on function public.get_investor_installments(bigint, uuid) to authenticated;
grant select on public.investor_next_payment_view to authenticated;
