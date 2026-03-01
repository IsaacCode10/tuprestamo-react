-- Fix definitivo (sin romper flujo):
-- 1) Evita cronogramas/intents duplicados en re-ejecuciones de registrar_pago_dirigido.
-- 2) Alinea expected_amount del intent a cuota_promedio (cuota total comunicada al prestatario).
-- 3) Sanea históricos con pending duplicados: expira intents pending cuyo monto no coincide
--    con cuota_promedio, solo cuando existe al menos una serie pending válida para la oportunidad.

-- Saneamiento de datos históricos (idempotente)
with to_expire as (
  select b.id
  from borrower_payment_intents b
  join oportunidades o on o.id = b.opportunity_id
  where lower(coalesce(b.status, '')) in ('pending', 'unmatched')
    and o.cuota_promedio is not null
    and exists (
      select 1
      from borrower_payment_intents b2
      where b2.opportunity_id = b.opportunity_id
        and lower(coalesce(b2.status, '')) in ('pending', 'unmatched')
        and round(b2.expected_amount::numeric, 2) = round(o.cuota_promedio::numeric, 2)
    )
    and round(b.expected_amount::numeric, 2) <> round(o.cuota_promedio::numeric, 2)
)
update borrower_payment_intents
set status = 'expired',
    updated_at = now()
where id in (select id from to_expire);

create or replace function public.registrar_pago_dirigido(
  p_opportunity_id bigint,
  p_comprobante_url text default null,
  p_contract_url text default null,
  p_audit jsonb default null
)
returns desembolsos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_disb desembolsos%rowtype;
  v_solicitud_id bigint;
  v_monto numeric;
  v_plazo integer;
  v_tasa numeric;
  v_rate numeric;
  v_payment numeric;
  v_balance numeric;
  v_interest numeric;
  v_principal numeric;
  v_start_date timestamptz;
  v_due date;
  v_cuota_total numeric;
begin
  select * into v_disb
  from desembolsos
  where opportunity_id = p_opportunity_id
  order by created_at desc
  limit 1
  for update;

  if not found then
    insert into desembolsos (
      opportunity_id, monto_bruto, monto_neto, estado, comprobante_url, contract_url, paid_at, created_at
    )
    select
      o.id,
      o.monto,
      coalesce(o.saldo_deudor_verificado, o.monto),
      'pagado',
      p_comprobante_url,
      p_contract_url,
      now(),
      now()
    from oportunidades o
    where o.id = p_opportunity_id
    returning * into v_disb;
  else
    update desembolsos
    set estado = 'pagado',
        paid_at = coalesce(v_disb.paid_at, now()),
        comprobante_url = coalesce(p_comprobante_url, v_disb.comprobante_url),
        contract_url = coalesce(p_contract_url, v_disb.contract_url)
    where id = v_disb.id
    returning * into v_disb;
  end if;

  begin
    insert into movimientos (opportunity_id, investor_id, tipo, amount, currency, nota, status, created_at, settled_at)
    values (
      p_opportunity_id,
      null,
      'comision_originacion',
      greatest(coalesce(v_disb.monto_bruto, 0) - coalesce(v_disb.monto_neto, 0), 0),
      'BOB',
      'Comisión de originación (desembolso)',
      'posted',
      coalesce(v_disb.paid_at, now()),
      coalesce(v_disb.paid_at, now())
    );
  exception when others then
    null;
  end;

  select solicitud_id into v_solicitud_id from oportunidades where id = p_opportunity_id;
  update oportunidades set estado = 'activo' where id = p_opportunity_id;
  if v_solicitud_id is not null then
    update solicitudes set estado = 'desembolsado' where id = v_solicitud_id;
  end if;

  -- Guard definitivo: solo generar cronograma/intents si no existe ninguno de los dos.
  if not exists (select 1 from amortizaciones where opportunity_id = p_opportunity_id)
     and not exists (select 1 from borrower_payment_intents where opportunity_id = p_opportunity_id) then

    select
      o.monto,
      o.plazo_meses,
      o.tasa_interes_prestatario,
      o.cuota_promedio,
      coalesce(v_disb.paid_at, now())
    into
      v_monto,
      v_plazo,
      v_tasa,
      v_cuota_total,
      v_start_date
    from oportunidades o
    where o.id = p_opportunity_id;

    v_monto := coalesce(v_monto, v_disb.monto_bruto, v_disb.monto_neto, 0);
    v_plazo := coalesce(v_plazo, 24);
    v_tasa := coalesce(v_tasa, 0);

    if v_monto > 0 and v_plazo > 0 then
      v_rate := v_tasa / 100 / 12;
      if v_rate > 0 then
        v_payment := v_monto * v_rate / (1 - power(1 + v_rate, -v_plazo));
      else
        v_payment := v_monto / v_plazo;
      end if;
      v_balance := v_monto;
      v_due := public.next_monthly_payment_day5(v_start_date);

      for i in 1..v_plazo loop
        v_interest := round(v_balance * v_rate, 2);
        v_principal := round(v_payment - v_interest, 2);
        if i = v_plazo then
          v_principal := v_balance;
          v_payment := v_principal + v_interest;
        end if;
        v_balance := greatest(v_balance - v_principal, 0);

        insert into amortizaciones(opportunity_id, installment_no, due_date, principal, interest, payment, created_at)
        values (p_opportunity_id, i, v_due, v_principal, v_interest, round(v_payment, 2), now());

        insert into borrower_payment_intents(
          opportunity_id, borrower_id, due_date, expected_amount, status, created_at, updated_at
        )
        select
          p_opportunity_id,
          o.user_id,
          v_due,
          round(coalesce(v_cuota_total, v_payment), 2),
          'pending',
          now(),
          now()
        from oportunidades o
        where o.id = p_opportunity_id;

        v_due := (v_due + interval '1 month')::date;
      end loop;
    end if;
  end if;

  return v_disb;
end;
$$;

grant execute on function public.registrar_pago_dirigido(bigint, text, text, jsonb) to authenticated;
