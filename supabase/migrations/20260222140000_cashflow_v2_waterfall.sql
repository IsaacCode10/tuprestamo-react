-- Cashflow v2: preserve historical opportunities (v1) and apply canonical waterfall for new approvals.

alter table if exists public.oportunidades
  add column if not exists cashflow_model_version text default 'v1',
  add column if not exists admin_plataforma_porcentaje numeric default 0.10,
  add column if not exists seguro_passthrough_porcentaje numeric default 0.05;

create or replace function public.apply_risk_decision_state(
  p_solicitud_id bigint,
  p_decision text,
  p_motivo text default null,
  p_neto_verificado numeric default null,
  p_monto_bruto numeric default null,
  p_plazo_meses integer default null,
  p_cuota_promedio numeric default null,
  p_perfil_riesgo text default null,
  p_tasa_interes_prestatario numeric default null,
  p_tasa_interes_anual numeric default null,
  p_tasa_rendimiento_inversionista numeric default null,
  p_comision_originacion_porcentaje numeric default null,
  p_comision_servicio_inversionista_porcentaje numeric default null,
  p_cargo_servicio_seguro_porcentaje numeric default null,
  p_interes_total numeric default null,
  p_comision_servicio_seguro_total numeric default null,
  p_costo_total_credito numeric default null,
  p_originacion_bruta numeric default null,
  p_costo_notariado numeric default null,
  p_originacion_neta numeric default null,
  p_notariado_absorbido boolean default null,
  p_cashflow_model_version text default null,
  p_admin_plataforma_porcentaje numeric default null,
  p_seguro_passthrough_porcentaje numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_solicitud_id is null then
    raise exception 'p_solicitud_id is required';
  end if;

  if p_decision = 'Rechazado' then
    update public.solicitudes
    set estado = 'rechazado_final'
    where id = p_solicitud_id;
    if not found then
      raise exception 'solicitud % not found', p_solicitud_id;
    end if;

    update public.perfiles_de_riesgo
    set estado = 'revisado_rechazado'
    where solicitud_id = p_solicitud_id;

    update public.oportunidades
    set estado = 'descartada',
        motivo = p_motivo
    where solicitud_id = p_solicitud_id;
    if not found then
      raise exception 'oportunidad for solicitud % not found', p_solicitud_id;
    end if;

    return;
  end if;

  if p_decision = 'Aprobado' then
    update public.solicitudes
    set estado = 'aprobado_para_oferta',
        monto_solicitado = coalesce(p_neto_verificado, p_monto_bruto, monto_solicitado),
        saldo_deuda_tc = coalesce(p_neto_verificado, saldo_deuda_tc),
        plazo_meses = coalesce(p_plazo_meses, plazo_meses)
    where id = p_solicitud_id;
    if not found then
      raise exception 'solicitud % not found', p_solicitud_id;
    end if;

    update public.perfiles_de_riesgo
    set estado = 'revisado_aprobado'
    where solicitud_id = p_solicitud_id;

    update public.oportunidades
    set estado = 'borrador',
        monto = coalesce(p_monto_bruto, monto),
        plazo_meses = coalesce(p_plazo_meses, plazo_meses),
        saldo_deudor_verificado = coalesce(p_neto_verificado, p_monto_bruto, saldo_deudor_verificado),
        cuota_promedio = coalesce(p_cuota_promedio, cuota_promedio),
        perfil_riesgo = coalesce(p_perfil_riesgo, perfil_riesgo),
        tasa_interes_prestatario = coalesce(p_tasa_interes_prestatario, tasa_interes_prestatario),
        tasa_interes_anual = coalesce(p_tasa_interes_anual, tasa_interes_anual),
        tasa_rendimiento_inversionista = coalesce(p_tasa_rendimiento_inversionista, tasa_rendimiento_inversionista),
        comision_originacion_porcentaje = coalesce(p_comision_originacion_porcentaje, comision_originacion_porcentaje),
        comision_servicio_inversionista_porcentaje = coalesce(p_comision_servicio_inversionista_porcentaje, comision_servicio_inversionista_porcentaje),
        cargo_servicio_seguro_porcentaje = coalesce(p_cargo_servicio_seguro_porcentaje, cargo_servicio_seguro_porcentaje),
        interes_total = coalesce(p_interes_total, interes_total),
        comision_servicio_seguro_total = coalesce(p_comision_servicio_seguro_total, comision_servicio_seguro_total),
        costo_total_credito = coalesce(p_costo_total_credito, costo_total_credito),
        originacion_bruta = coalesce(p_originacion_bruta, originacion_bruta),
        costo_notariado = coalesce(p_costo_notariado, costo_notariado),
        originacion_neta = coalesce(p_originacion_neta, originacion_neta),
        notariado_absorbido = coalesce(p_notariado_absorbido, notariado_absorbido),
        cashflow_model_version = coalesce(p_cashflow_model_version, cashflow_model_version),
        admin_plataforma_porcentaje = coalesce(p_admin_plataforma_porcentaje, admin_plataforma_porcentaje),
        seguro_passthrough_porcentaje = coalesce(p_seguro_passthrough_porcentaje, seguro_passthrough_porcentaje)
    where solicitud_id = p_solicitud_id;
    if not found then
      raise exception 'oportunidad for solicitud % not found', p_solicitud_id;
    end if;

    return;
  end if;

  raise exception 'invalid decision %', p_decision;
end;
$$;

create or replace function public.process_borrower_payment(p_intent_id uuid, p_receipt_url text default null)
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
  v_payout_id uuid;
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
        receipt_url = coalesce(p_receipt_url, receipt_url)
  where id = p_intent_id;

  insert into notifications (user_id, type, title, body, link_url, created_at, priority)
  values (v_row.borrower_id, 'loan_paid', 'Pago recibido', 'Registramos tu pago de cuota. Gracias por mantenerte al día.', null, v_now, 'normal');

  select coalesce(sum(amount) filter (where status = 'pagado'), 0)
  into v_total_invested
  from inversiones
  where opportunity_id = v_row.opportunity_id;

  if v_total_invested <= 0 then
    raise exception 'No hay inversiones pagadas para distribuir';
  end if;

  insert into movimientos (opportunity_id, investor_id, tipo, amount, currency, ref_borrower_intent_id, nota, status, created_at, settled_at)
  values (v_row.opportunity_id, null, 'cobro_prestatario', v_row.expected_amount, 'BOB', v_row.id, concat('Cuota prestatario ', v_row.id), 'posted', v_now, v_now);

  -- Modelo histórico (v1): mantiene comportamiento anterior para no romper operaciones activas.
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

      insert into payouts_inversionistas(opportunity_id, investor_id, amount, status, notes, created_at)
      values (v_row.opportunity_id, v_inv.investor_id, v_net, 'pending', concat('Pago prestatario intent ', p_intent_id), v_now)
      returning id into v_payout_id;

      insert into movimientos (opportunity_id, investor_id, tipo, amount, currency, ref_borrower_intent_id, nota, status, created_at, settled_at)
      values (v_row.opportunity_id, null, 'comision_plataforma', v_commission, 'BOB', v_row.id, concat('Comisión 1% cuota ', v_row.id), 'posted', v_now, v_now);

      insert into movimientos (opportunity_id, investor_id, tipo, amount, currency, ref_borrower_intent_id, ref_payout_id, nota, status, created_at)
      values (v_row.opportunity_id, v_inv.investor_id, 'payout_inversionista', v_net, 'BOB', v_row.id, v_payout_id, concat('Payout de cuota ', v_row.id), 'pending', v_now);
    end loop;

    return;
  end if;

  -- Modelo nuevo (v2): paga al inversionista por tasa pasiva objetivo y registra spread/admin/seguro.
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

    insert into payouts_inversionistas(opportunity_id, investor_id, amount, status, notes, created_at)
    values (v_row.opportunity_id, v_inv.investor_id, v_net, 'pending', concat('Pago prestatario intent ', p_intent_id, ' (v2)'), v_now)
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
    -- Mantiene regla vigente del producto: mínimo combinado Bs 10/mes para admin+seguro.
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

drop view if exists public.fuente_unica_checks;

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
) m on m.opportunity_id = s.opportunity_id::bigint and m.ref_borrower_intent_id = s.borrower_payment_intent_id
left join (
  select opportunity_id, count(*) filter (where lower(status) = 'pending') as pending_payouts
  from payouts_inversionistas
  group by opportunity_id
) p on p.opportunity_id = s.opportunity_id::bigint;

alter view public.fuente_unica_checks set (security_invoker = true);
