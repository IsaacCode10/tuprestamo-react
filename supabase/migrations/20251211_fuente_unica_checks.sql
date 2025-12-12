-- Fuente Única: checks que garantizan una sola fuente de verdad
create or replace view public.fuente_unica_checks as
select
  o.id as opportunity_id,
  b.id as borrower_payment_intent_id,
  b.due_date,
  b.status as borrower_status,
  b.expected_amount as borrower_amount,
  coalesce(m.cobro, 0) as cobro_prestatario,
  coalesce(m.payouts, 0) as payouts_inversionistas,
  coalesce(m.comision, 0) as comision_plataforma,
  coalesce(m.pending_movimientos, 0) as movimientos_pendientes,
  coalesce(p.pending_payouts, 0) as payouts_pending,
  coalesce(m.cobro, 0) - coalesce(m.payouts, 0) - coalesce(m.comision, 0) as diferencia,
  case
    when abs(coalesce(m.cobro, 0) - coalesce(m.payouts, 0) - coalesce(m.comision, 0)) < 0.01
      and coalesce(m.pending_movimientos, 0) = coalesce(p.pending_payouts, 0)
    then 'ok'
    else 'revisar'
  end as status,
  abs(coalesce(m.cobro, 0) - coalesce(m.payouts, 0) - coalesce(m.comision, 0)) as divergence_amount
from borrower_payment_intents b
join oportunidades o on o.id = b.opportunity_id
left join (
  select
    opportunity_id,
    ref_borrower_intent_id,
    sum(case when lower(tipo) = 'cobro_prestatario' then amount else 0 end) as cobro,
    sum(case when lower(tipo) = 'payout_inversionista' then amount else 0 end) as payouts,
    sum(case when lower(tipo) = 'comision_plataforma' then amount else 0 end) as comision,
    sum(case when lower(tipo) = 'payout_inversionista' and lower(status) = 'pending' then 1 else 0 end) as pending_movimientos
  from movimientos
  group by opportunity_id, ref_borrower_intent_id
) m on m.opportunity_id = b.opportunity_id and m.ref_borrower_intent_id = b.id
left join (
  select opportunity_id, count(*) filter (where lower(status) = 'pending') as pending_payouts
  from payouts_inversionistas
  group by opportunity_id
) p on p.opportunity_id = b.opportunity_id;
