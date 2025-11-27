-- Cancela una intención de inversión pendiente (inversionista actual)
drop function if exists public.cancel_investment_intent(uuid);

create or replace function public.cancel_investment_intent(p_payment_intent_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update payment_intents
  set status = 'cancelado',
      updated_at = now()
  where id = p_payment_intent_id
    and investor_id = auth.uid()
    and status = 'pending';

  update inversiones
  set status = 'cancelado'
  where payment_intent_id = p_payment_intent_id
    and investor_id = auth.uid()
    and status in ('pendiente_pago', 'intencion');
end;
$$;

grant execute on function public.cancel_investment_intent(uuid) to authenticated;
