create or replace view public.investor_payouts_view as
select
  p.id,
  p.opportunity_id,
  p.investor_id,
  p.amount,
  p.status,
  p.payment_intent_id,
  p.paid_at,
  p.receipt_url,
  p.notes,
  p.created_at,
  p.updated_at,
  o.monto as opportunity_monto,
  o.plazo_meses,
  o.perfil_riesgo,
  o.tasa_rendimiento_inversionista,
  o.estado as opportunity_estado
from public.payouts_inversionistas p
left join public.oportunidades o on o.id = p.opportunity_id;

grant select on public.investor_payouts_view to authenticated;
