-- Grants for funding RPCs (evita 404 de PostgREST por falta de permisos)

grant execute on function public.get_opportunity_details_with_funding(bigint)
  to anon, authenticated;

grant execute on function public.create_investment_intent(bigint, numeric)
  to authenticated;

grant execute on function public.mark_payment_intent_paid(uuid, numeric)
  to authenticated, service_role;

grant execute on function public.expire_payment_intents_sql()
  to service_role;

grant execute on function public.get_contract_payload(bigint)
  to authenticated, service_role;

grant execute on function public.reopen_opportunity_if_unfunded(bigint)
  to authenticated, service_role;
