-- Root fix: borrower_schedule_view pasa a leer como fuente canonica borrower_payment_intents
-- y solo usa amortizaciones para desglose (principal/interes) por numero de cuota.
-- Esto evita que el panel del prestatario quede vacio si hubo limpieza de cronogramas legacy.

drop view if exists public.fuente_unica_checks;
drop view if exists public.borrower_schedule_view;

create view public.borrower_schedule_view as
with intents as (
  select
    b.id as borrower_payment_intent_id,
    b.opportunity_id,
    b.borrower_id,
    b.due_date,
    b.expected_amount,
    b.status as borrower_status,
    b.paid_at,
    b.paid_amount,
    b.receipt_url,
    b.updated_at as intent_updated_at,
    row_number() over (
      partition by b.opportunity_id
      order by b.due_date asc, b.id asc
    ) as installment_no
  from public.borrower_payment_intents b
),
amort as (
  select
    a.id as amortizacion_id,
    a.opportunity_id,
    a.installment_no,
    a.principal,
    a.interest,
    a.payment
  from public.amortizaciones a
),
base as (
  select
    i.borrower_payment_intent_id,
    i.opportunity_id,
    i.borrower_id,
    i.installment_no,
    i.due_date,
    coalesce(a.principal, 0::numeric) as principal,
    coalesce(a.interest, greatest(coalesce(i.expected_amount, 0) - coalesce(a.principal, 0), 0)) as interest,
    coalesce(i.expected_amount, a.payment, 0::numeric) as payment,
    a.amortizacion_id,
    coalesce(i.borrower_status, 'pending') as borrower_status,
    coalesce(i.borrower_status, 'pending') as amortizacion_status,
    i.expected_amount,
    i.paid_at,
    i.paid_amount,
    i.receipt_url,
    i.intent_updated_at
  from intents i
  left join amort a
    on a.opportunity_id = i.opportunity_id
   and a.installment_no = i.installment_no
)
select
  b.amortizacion_id,
  b.opportunity_id,
  b.installment_no,
  b.due_date,
  b.principal,
  b.interest,
  b.payment,
  greatest(
    coalesce(o.monto, 0)
      - coalesce(
          sum(coalesce(b.principal, 0)) over (
            partition by b.opportunity_id
            order by b.installment_no
            rows between unbounded preceding and current row
          ),
          0
        ),
    0
  ) as balance,
  b.amortizacion_status,
  b.borrower_payment_intent_id,
  b.borrower_id,
  b.expected_amount,
  b.borrower_status,
  b.paid_at,
  b.paid_amount,
  b.receipt_url,
  b.intent_updated_at
from base b
join public.oportunidades o on o.id = b.opportunity_id
order by b.opportunity_id, b.installment_no;

create view public.fuente_unica_checks as
select
  s.opportunity_id::bigint as opportunity_id,
  s.borrower_payment_intent_id,
  s.due_date,
  s.borrower_status,
  s.expected_amount as borrower_amount,
  coalesce(m.cobro, 0) as cobro_prestatario,
  coalesce(m.payouts, 0) as payouts_inversionistas,
  coalesce(m.comision, 0) as comision_plataforma,
  coalesce(m.admin_plataforma, 0) as admin_plataforma,
  coalesce(m.spread_plataforma, 0) as spread_plataforma,
  coalesce(m.seguro_passthrough, 0) as seguro_passthrough,
  coalesce(m.pending_movimientos, 0) as movimientos_pendientes,
  coalesce(p.pending_payouts, 0) as payouts_pending,
  coalesce(m.cobro, 0)
    - coalesce(m.payouts, 0)
    - coalesce(m.comision, 0)
    - coalesce(m.admin_plataforma, 0)
    - coalesce(m.spread_plataforma, 0)
    - coalesce(m.seguro_passthrough, 0) as diferencia,
  case
    when s.borrower_payment_intent_id is null then 'revisar'
    when s.borrower_status = 'paid' and coalesce(m.cobro, 0) = 0 then 'revisar'
    when abs(
      coalesce(m.cobro, 0)
        - coalesce(m.payouts, 0)
        - coalesce(m.comision, 0)
        - coalesce(m.admin_plataforma, 0)
        - coalesce(m.spread_plataforma, 0)
        - coalesce(m.seguro_passthrough, 0)
    ) < 0.01
      and coalesce(m.pending_movimientos, 0) = coalesce(p.pending_payouts, 0)
    then 'ok'
    else 'revisar'
  end as status,
  abs(
    coalesce(m.cobro, 0)
      - coalesce(m.payouts, 0)
      - coalesce(m.comision, 0)
      - coalesce(m.admin_plataforma, 0)
      - coalesce(m.spread_plataforma, 0)
      - coalesce(m.seguro_passthrough, 0)
  ) as divergence_amount
from borrower_schedule_view s
join oportunidades o on o.id = s.opportunity_id::bigint
left join (
  select
    opportunity_id,
    ref_borrower_intent_id,
    sum(case when lower(tipo) = 'cobro_prestatario' then amount else 0 end) as cobro,
    sum(case when lower(tipo) = 'payout_inversionista' then amount else 0 end) as payouts,
    sum(case when lower(tipo) = 'comision_plataforma' then amount else 0 end) as comision,
    sum(case when lower(tipo) = 'admin_plataforma' then amount else 0 end) as admin_plataforma,
    sum(case when lower(tipo) = 'spread_plataforma' then amount else 0 end) as spread_plataforma,
    sum(case when lower(tipo) = 'seguro_passthrough' then amount else 0 end) as seguro_passthrough,
    sum(case when lower(tipo) = 'payout_inversionista' and lower(status) = 'pending' then 1 else 0 end) as pending_movimientos
  from movimientos
  group by opportunity_id, ref_borrower_intent_id
) m on m.opportunity_id = s.opportunity_id::bigint
  and m.ref_borrower_intent_id::text = s.borrower_payment_intent_id::text
left join (
  select opportunity_id, count(*) filter (where lower(status) = 'pending') as pending_payouts
  from payouts_inversionistas
  group by opportunity_id
) p on p.opportunity_id = s.opportunity_id::bigint;

alter view public.fuente_unica_checks set (security_invoker = true);
