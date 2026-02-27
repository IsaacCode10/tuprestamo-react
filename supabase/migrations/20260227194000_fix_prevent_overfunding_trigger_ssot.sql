-- Root cause fix:
-- The error was being raised by trigger function public.prevent_overfunding(),
-- not by create_investment_intent().
-- We re-align the trigger to the same SSOT rule for cupo:
-- consumed = sum(inversiones where status in pagado/pendiente_pago/intencion).

create or replace function public.prevent_overfunding()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status text;
  v_meta numeric := 0;
  v_consumed_without_row numeric := 0;
  v_amount_new numeric := 0;
  v_available numeric := 0;
  v_after numeric := 0;
begin
  -- Only validate rows that consume funding cupo.
  v_status := lower(trim(coalesce(new.status, '')));
  if v_status not in ('pagado', 'pendiente_pago', 'intencion') then
    return new;
  end if;

  select coalesce(o.monto, 0)
    into v_meta
  from public.oportunidades o
  where o.id = new.opportunity_id
  for update;

  if v_meta <= 0 then
    return new;
  end if;

  select coalesce(sum(i.amount), 0)
    into v_consumed_without_row
  from public.inversiones i
  where i.opportunity_id = new.opportunity_id
    and lower(trim(coalesce(i.status, ''))) in ('pagado', 'pendiente_pago', 'intencion')
    and (tg_op <> 'UPDATE' or i.id <> new.id);

  v_amount_new := round(coalesce(new.amount, 0)::numeric, 2);
  v_after := round(v_consumed_without_row, 2) + v_amount_new;

  if v_after > round(v_meta, 2) then
    v_available := greatest(round(v_meta, 2) - round(v_consumed_without_row, 2), 0);
    raise exception 'No hay saldo disponible para este monto (cupo actual: %)', v_available
      using detail = format(
        'trigger=prevent_overfunding op=%s opportunity_id=%s requested=%s meta=%s consumed=%s',
        tg_op,
        new.opportunity_id,
        v_amount_new,
        round(v_meta, 2),
        round(v_consumed_without_row, 2)
      ),
      hint = 'Reduce monto o libera cupo expirando/cancelando reservas activas.';
  end if;

  return new;
end;
$$;
