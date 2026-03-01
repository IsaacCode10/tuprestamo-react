-- Root fix (sin ocultar en UI):
-- 1) Elimina cuotas legacy expiradas no canonicas (monto distinto a cuota_promedio).
-- 2) Impide que vuelvan a coexistir dos cronogramas en borrower_payment_intents.
-- 3) Evita duplicados exactos por fecha dentro de una oportunidad.

-- 1) Limpieza de historico legacy (solo expiradas y sin asientos contables asociados)
delete from public.borrower_payment_intents b
using public.oportunidades o
where b.opportunity_id = o.id
  and lower(coalesce(b.status, '')) = 'expired'
  and round(coalesce(b.expected_amount, 0)::numeric, 2) <> round(coalesce(o.cuota_promedio, b.expected_amount, 0)::numeric, 2)
  and not exists (
    select 1
    from public.movimientos m
    where m.ref_borrower_intent_id::text = b.id::text
  );

-- 2) Regla anti doble-cronograma por monto no canonico
create or replace function public.enforce_single_borrower_schedule()
returns trigger
language plpgsql
as $$
declare
  v_canonical numeric;
begin
  select round(coalesce(o.cuota_promedio, new.expected_amount, 0)::numeric, 2)
    into v_canonical
  from public.oportunidades o
  where o.id = new.opportunity_id;

  if v_canonical is null then
    v_canonical := round(coalesce(new.expected_amount, 0)::numeric, 2);
  end if;

  if round(coalesce(new.expected_amount, 0)::numeric, 2) <> v_canonical then
    raise exception
      using message = format(
        'Cronograma no canonico bloqueado para oportunidad %s (expected_amount=%s, cuota_promedio=%s)',
        new.opportunity_id,
        round(coalesce(new.expected_amount, 0)::numeric, 2),
        v_canonical
      );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_single_borrower_schedule on public.borrower_payment_intents;
create trigger trg_enforce_single_borrower_schedule
before insert on public.borrower_payment_intents
for each row
execute function public.enforce_single_borrower_schedule();

-- 3) Unicidad por oportunidad + fecha (evita duplicados por reintentos)
create unique index if not exists uq_borrower_intents_opportunity_due_date
  on public.borrower_payment_intents(opportunity_id, due_date);

