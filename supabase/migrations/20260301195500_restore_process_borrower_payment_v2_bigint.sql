-- Fix definitivo: restaurar process_borrower_payment con waterfall v2
-- para firma bigint (entorno actual usa borrower_payment_intents.id numerico).

create or replace function public.process_borrower_payment(
  p_intent_id bigint,
  p_receipt_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row borrower_payment_intents%rowtype;
  v_opp oportunidades%rowtype;
  v_total_invested numeric;
  v_now timestamptz := now();
  v_share numeric;
  v_commission numeric;
  v_net numeric;
  v_payout_id bigint;
  v_inv inversiones%rowtype;
  v_rate_inv numeric;
  v_n integer;
  v_gross_due_inv numeric;
  v_total_net_payout numeric := 0;
  v_total_fee_inv numeric := 0;
  v_amort amortizaciones%rowtype;
  v_starting_balance numeric := 0;
  v_service_pct_total numeric := 0;
  v_admin_pct numeric := 0.10;
  v_seguro_pct numeric := 0.05;
  v_admin_amount numeric := 0;
  v_seguro_amount numeric := 0;
  v_spread_amount numeric := 0;
  v_residual numeric := 0;
  v_alloc_pct_sum numeric := 0;
begin
  select * into v_row from borrower_payment_intents where id = p_intent_id for update;
  if not found then
    raise exception 'Pago no encontrado';
  end if;

  select * into v_opp from oportunidades where id = v_row.opportunity_id;
  if not found then
    raise exception 'Oportunidad no encontrada';
  end if;

  update borrower_payment_intents
    set status = 'paid',
        paid_at = coalesce(v_row.paid_at, v_now),
        paid_amount = coalesce(v_row.paid_amount, v_row.expected_amount),
        receipt_url = coalesce(p_receipt_url, receipt_url),
        updated_at = v_now
  where id = p_intent_id;

  begin
    insert into notifications (user_id, type, title, body, link_url, created_at, priority)
    values (v_row.borrower_id, 'loan_paid', 'Pago recibido', 'Registramos tu pago de cuota. Gracias por mantenerte al día.', null, v_now, 'normal');
  exception when others then
    null;
  end;

  select coalesce(sum(amount) filter (where status = 'pagado'), 0)
  into v_total_invested
  from inversiones
  where opportunity_id = v_row.opportunity_id;

  if v_total_invested <= 0 then
    raise exception 'No hay inversiones pagadas para distribuir';
  end if;

  insert into movimientos (opportunity_id, investor_id, tipo, amount, currency, ref_borrower_intent_id, nota, status, created_at, settled_at)
  values (v_row.opportunity_id, null, 'cobro_prestatario', v_row.expected_amount, 'BOB', v_row.id, concat('Cuota prestatario ', v_row.id), 'posted', v_now, v_now);

  -- Compatibilidad histórica v1.
  if coalesce(v_opp.cashflow_model_version, 'v1') <> 'v2' then
    for v_inv in
      select investor_id, amount
      from inversiones
      where opportunity_id = v_row.opportunity_id
        and status = 'pagado'
    loop
      v_share := v_row.expected_amount * (v_inv.amount / v_total_invested);
      v_commission := v_share * 0.01;
      v_net := v_share - v_commission;

      insert into payouts_inversionistas(opportunity_id, investor_id, amount, status, notes, created_at, updated_at)
      values (v_row.opportunity_id, v_inv.investor_id, v_net, 'pending', concat('Pago prestatario intent ', p_intent_id), v_now, v_now)
      returning id into v_payout_id;

      insert into movimientos (opportunity_id, investor_id, tipo, amount, currency, ref_borrower_intent_id, nota, status, created_at, settled_at)
      values (v_row.opportunity_id, null, 'comision_plataforma', v_commission, 'BOB', v_row.id, concat('Comisión 1% cuota ', v_row.id), 'posted', v_now, v_now);

      insert into movimientos (opportunity_id, investor_id, tipo, amount, currency, ref_borrower_intent_id, ref_payout_id, nota, status, created_at)
      values (v_row.opportunity_id, v_inv.investor_id, 'payout_inversionista', v_net, 'BOB', v_row.id, v_payout_id, concat('Payout de cuota ', v_row.id), 'pending', v_now);
    end loop;
    return;
  end if;

  -- Modelo v2 (waterfall completo).
  v_rate_inv := coalesce(v_opp.tasa_rendimiento_inversionista, 0) / 100 / 12;
  v_n := greatest(coalesce(v_opp.plazo_meses, 24), 1);

  for v_inv in
    select investor_id, amount
    from inversiones
    where opportunity_id = v_row.opportunity_id
      and status = 'pagado'
  loop
    if v_rate_inv > 0 then
      v_gross_due_inv := v_inv.amount * v_rate_inv / (1 - power(1 + v_rate_inv, -v_n));
    else
      v_gross_due_inv := v_inv.amount / v_n;
    end if;

    v_commission := v_gross_due_inv * (coalesce(v_opp.comision_servicio_inversionista_porcentaje, 1) / 100);
    v_net := greatest(v_gross_due_inv - v_commission, 0);

    v_total_net_payout := v_total_net_payout + v_net;
    v_total_fee_inv := v_total_fee_inv + v_commission;

    insert into payouts_inversionistas(opportunity_id, investor_id, amount, status, notes, created_at, updated_at)
    values (v_row.opportunity_id, v_inv.investor_id, v_net, 'pending', concat('Pago prestatario intent ', p_intent_id, ' (v2)'), v_now, v_now)
    returning id into v_payout_id;

    insert into movimientos (opportunity_id, investor_id, tipo, amount, currency, ref_borrower_intent_id, nota, status, created_at, settled_at)
    values (v_row.opportunity_id, null, 'comision_plataforma', v_commission, 'BOB', v_row.id, concat('Comisión servicio inversionista ', v_row.id), 'posted', v_now, v_now);

    insert into movimientos (opportunity_id, investor_id, tipo, amount, currency, ref_borrower_intent_id, ref_payout_id, nota, status, created_at)
    values (v_row.opportunity_id, v_inv.investor_id, 'payout_inversionista', v_net, 'BOB', v_row.id, v_payout_id, concat('Payout de cuota ', v_row.id), 'pending', v_now);
  end loop;

  select *
  into v_amort
  from amortizaciones a
  where a.opportunity_id = v_row.opportunity_id
    and (v_row.due_date is not null and a.due_date = v_row.due_date)
  order by a.installment_no
  limit 1;

  if found then
    v_starting_balance := coalesce(v_amort.balance, 0) + coalesce(v_amort.principal, 0);
  else
    v_starting_balance := coalesce(v_opp.monto, 0);
  end if;

  v_service_pct_total := greatest(coalesce(v_opp.cargo_servicio_seguro_porcentaje, 0), 0) / 100;
  v_admin_pct := greatest(coalesce(v_opp.admin_plataforma_porcentaje, 0.10), 0) / 100;
  v_seguro_pct := greatest(coalesce(v_opp.seguro_passthrough_porcentaje, 0.05), 0) / 100;
  v_alloc_pct_sum := v_admin_pct + v_seguro_pct;

  if v_service_pct_total > 0 and v_starting_balance > 0 then
    v_residual := greatest(v_starting_balance * v_service_pct_total, 10);
    if v_alloc_pct_sum > 0 then
      v_admin_amount := v_residual * (v_admin_pct / v_alloc_pct_sum);
      v_seguro_amount := v_residual * (v_seguro_pct / v_alloc_pct_sum);
    else
      v_admin_amount := v_residual;
      v_seguro_amount := 0;
    end if;
  end if;

  v_residual := coalesce(v_row.expected_amount, 0) - v_total_net_payout - v_total_fee_inv - v_admin_amount - v_seguro_amount;
  if v_residual < -0.01 then
    raise exception 'Waterfall inconsistente para intent %: residual negativo (%)', p_intent_id, v_residual;
  end if;
  v_spread_amount := greatest(v_residual, 0);

  if v_admin_amount > 0 then
    insert into movimientos (opportunity_id, investor_id, tipo, amount, currency, ref_borrower_intent_id, nota, status, created_at, settled_at)
    values (v_row.opportunity_id, null, 'admin_plataforma', round(v_admin_amount, 2), 'BOB', v_row.id, concat('Admin plataforma cuota ', v_row.id), 'posted', v_now, v_now);
  end if;

  if v_seguro_amount > 0 then
    insert into movimientos (opportunity_id, investor_id, tipo, amount, currency, ref_borrower_intent_id, nota, status, created_at, settled_at)
    values (v_row.opportunity_id, null, 'seguro_passthrough', round(v_seguro_amount, 2), 'BOB', v_row.id, concat('Seguro passthrough cuota ', v_row.id), 'posted', v_now, v_now);
  end if;

  if v_spread_amount > 0 then
    insert into movimientos (opportunity_id, investor_id, tipo, amount, currency, ref_borrower_intent_id, nota, status, created_at, settled_at)
    values (v_row.opportunity_id, null, 'spread_plataforma', round(v_spread_amount, 2), 'BOB', v_row.id, concat('Spread plataforma cuota ', v_row.id), 'posted', v_now, v_now);
  end if;
end;
$$;

grant execute on function public.process_borrower_payment(bigint, text) to authenticated;

