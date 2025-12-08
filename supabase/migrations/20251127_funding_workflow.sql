-- Migración: flujo de fondeo, intents, expiración y payload de contrato
-- Incluye funciones:
-- 1) get_opportunity_details_with_funding
-- 2) create_investment_intent
-- 3) mark_payment_intent_paid
-- 4) expire_payment_intents_sql
-- 5) get_contract_payload
-- 6) get_opportunities_publicadas

set check_function_bodies = off;

-- Asegura que podamos redefinir las funciones aunque cambie el retorno
drop function if exists public.get_opportunity_details_with_funding(bigint);
drop function if exists public.create_investment_intent(bigint, numeric);
drop function if exists public.mark_payment_intent_paid(uuid, numeric);
drop function if exists public.expire_payment_intents_sql();
drop function if exists public.get_contract_payload(bigint);
drop function if exists public.get_opportunities_publicadas();

create or replace function public.get_opportunity_details_with_funding(p_opportunity_id bigint)
returns table (
  id bigint,
  created_at timestamptz,
  solicitud_id bigint,
  monto numeric,
  plazo_meses integer,
  tasa_interes_anual numeric,
  motivo text,
  riesgo text,
  estado text,
  perfil_riesgo text,
  tasa_interes_prestatario numeric,
  tasa_rendimiento_inversionista numeric,
  comision_originacion_porcentaje numeric,
  comision_servicio_inversionista_porcentaje numeric,
  user_id uuid,
  cargo_servicio_seguro_porcentaje numeric,
  interes_total numeric,
  comision_servicio_seguro_total numeric,
  costo_total_credito numeric,
  cuota_promedio numeric,
  saldo_deudor_verificado numeric,
  total_funded numeric,
  saldo_pendiente numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_paid numeric;
begin
  select coalesce(sum(amount), 0)
  into v_total_paid
  from inversiones
  where opportunity_id = p_opportunity_id
    and status = 'pagado';

  return query
  select
    o.id,
    o.created_at,
    o.solicitud_id,
    o.monto,
    o.plazo_meses,
    o.tasa_interes_anual,
    o.motivo,
    o.riesgo,
    o.estado,
    o.perfil_riesgo,
    o.tasa_interes_prestatario,
    o.tasa_rendimiento_inversionista,
    o.comision_originacion_porcentaje,
    o.comision_servicio_inversionista_porcentaje,
    o.user_id,
    o.cargo_servicio_seguro_porcentaje,
    o.interes_total,
    o.comision_servicio_seguro_total,
    o.costo_total_credito,
    o.cuota_promedio,
    o.saldo_deudor_verificado,
    v_total_paid as total_funded,
    greatest(o.monto - v_total_paid, 0) as saldo_pendiente
  from oportunidades o
  where o.id = p_opportunity_id;
end;
$$;

-- Listado público de oportunidades (incluye fondeadas para vitrina)
create or replace function public.get_opportunities_publicadas()
returns table (
  id bigint,
  created_at timestamptz,
  monto numeric,
  plazo_meses integer,
  tasa_rendimiento_inversionista numeric,
  comision_servicio_inversionista_porcentaje numeric,
  perfil_riesgo text,
  estado text,
  total_funded numeric,
  saldo_pendiente numeric
)
language sql
security definer
set search_path = public
as $$
  select
    o.id,
    o.created_at,
    o.monto,
    o.plazo_meses,
    o.tasa_rendimiento_inversionista,
    o.comision_servicio_inversionista_porcentaje,
    o.perfil_riesgo,
    o.estado,
    coalesce(sum(case when i.status = 'pagado' then i.amount else 0 end), 0) as total_funded,
    greatest(o.monto - coalesce(sum(case when i.status = 'pagado' then i.amount else 0 end), 0), 0) as saldo_pendiente
  from oportunidades o
  left join inversiones i on i.opportunity_id = o.id
  join solicitudes s on s.id = o.solicitud_id
  where o.estado in ('disponible', 'fondeada')
    and s.estado = 'prestatario_acepto'
  group by o.id, o.created_at, o.monto, o.plazo_meses, o.tasa_rendimiento_inversionista, o.comision_servicio_inversionista_porcentaje, o.perfil_riesgo, o.estado
  order by o.created_at desc;
$$;


create or replace function public.create_investment_intent(p_opportunity_id bigint, p_amount numeric)
returns payment_intents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_op oportunidades%rowtype;
  v_total_paid numeric;
  v_reserved numeric;
  v_available numeric;
  v_expires_at timestamptz;
  v_intent payment_intents%rowtype;
  v_investor uuid;
begin
  v_investor := auth.uid();
  if v_investor is null then
    raise exception 'Debes iniciar sesión para invertir';
  end if;

  select *
  into v_op
  from oportunidades
  where id = p_opportunity_id
    and estado in ('disponible', 'fondeada', 'activo')
  limit 1;

  if not found then
    raise exception 'Oportunidad no disponible o inexistente';
  end if;

  select coalesce(sum(amount), 0)
  into v_total_paid
  from inversiones
  where opportunity_id = p_opportunity_id
    and status = 'pagado';

  select coalesce(sum(amount), 0)
  into v_reserved
  from inversiones
  where opportunity_id = p_opportunity_id
    and status in ('pendiente_pago', 'intencion');

  v_available := greatest(v_op.monto - v_total_paid - v_reserved, 0);

  if p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;

  if p_amount > v_available then
    raise exception 'No hay saldo disponible para este monto (cupo: %)', v_available;
  end if;

  v_expires_at := now() + interval '48 hours';

  insert into payment_intents (
    id,
    opportunity_id,
    investor_id,
    expected_amount,
    status,
    reference_code,
    payment_channel,
    expires_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    p_opportunity_id,
    v_investor,
    p_amount,
    'pending',
    encode(gen_random_bytes(6), 'hex'),
    'qr_generico',
    v_expires_at,
    now(),
    now()
  )
  returning * into v_intent;

  insert into inversiones (opportunity_id, investor_id, amount, status, payment_intent_id, created_at)
  values (p_opportunity_id, auth.uid(), p_amount, 'pendiente_pago', v_intent.id, now());

  return v_intent;
end;
$$;


create or replace function public.mark_payment_intent_paid(p_payment_intent_id uuid, p_paid_amount numeric default null)
returns payment_intents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent payment_intents%rowtype;
  v_total_paid numeric;
  v_op oportunidades%rowtype;
begin
  update payment_intents
  set status = 'paid',
      paid_at = now(),
      paid_amount = coalesce(p_paid_amount, expected_amount),
      updated_at = now()
  where id = p_payment_intent_id
  returning * into v_intent;

  if not found then
    raise exception 'Intento de pago no encontrado';
  end if;

  update inversiones
  set status = 'pagado'
  where payment_intent_id = v_intent.id;

  select coalesce(sum(amount), 0)
  into v_total_paid
  from inversiones
  where opportunity_id = v_intent.opportunity_id
    and status = 'pagado';

  select * into v_op from oportunidades where id = v_intent.opportunity_id;

  if v_op.id is null then
    raise exception 'Oportunidad no encontrada';
  end if;

  if v_total_paid >= coalesce(v_op.monto, 0) then
    update oportunidades
    set estado = 'fondeada'
    where id = v_intent.opportunity_id;

    -- Crear desembolso pendiente si no existe
    if not exists (select 1 from desembolsos where opportunity_id = v_intent.opportunity_id) then
      insert into desembolsos (opportunity_id, monto_bruto, monto_neto, estado, created_at)
      values (
        v_intent.opportunity_id,
        v_op.monto,
        coalesce(v_op.saldo_deudor_verificado, v_op.monto),
        'pendiente',
        now()
      );
    end if;
  end if;

  return v_intent;
end;
$$;


create or replace function public.expire_payment_intents_sql()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update payment_intents
  set status = 'expired',
      updated_at = now()
  where status = 'pending'
    and expires_at < now();

  update inversiones
  set status = 'expirado'
  where payment_intent_id in (
    select id from payment_intents
    where status = 'expired'
  );
end;
$$;


create or replace function public.get_contract_payload(p_opportunity_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
begin
  with invs as (
    select
      opportunity_id,
      sum(case when status = 'pagado' then amount else 0 end) as total_pagado,
      jsonb_agg(
        jsonb_build_object(
          'investor_id', investor_id,
          'amount', amount,
          'status', status
        )
      ) filter (where investor_id is not null) as inversionistas
    from inversiones
    where opportunity_id = p_opportunity_id
    group by opportunity_id
  )
  , disb as (
    select monto_neto
    from desembolsos
    where opportunity_id = p_opportunity_id
    order by created_at desc
    limit 1
  )
  select jsonb_build_object(
    'opportunity', jsonb_build_object(
      'id', o.id,
      'monto_bruto', o.monto,
      'monto_neto', coalesce(o.saldo_deudor_verificado, d.monto_neto, o.monto),
      'plazo_meses', o.plazo_meses,
      'tasa_interes_prestatario', o.tasa_interes_prestatario,
      'perfil_riesgo', o.perfil_riesgo,
      'comision_originacion_porcentaje', o.comision_originacion_porcentaje,
      'cargo_servicio_seguro_porcentaje', o.cargo_servicio_seguro_porcentaje,
      'cuota_promedio', o.cuota_promedio
    ),
    'borrower', jsonb_build_object(
      'nombre_completo', s.nombre_completo,
      'cedula_identidad', s.cedula_identidad,
      'email', s.email,
      'telefono', s.telefono,
      'departamento', s.departamento
    ),
    'funding', jsonb_build_object(
      'total_pagado', coalesce(i.total_pagado, 0),
      'monto_objetivo', o.monto,
      'inversionistas', coalesce(i.inversionistas, '[]'::jsonb)
    )
  )
  into v_payload
  from oportunidades o
  left join solicitudes s on s.id = o.solicitud_id
  left join invs i on i.opportunity_id = o.id
  where o.id = p_opportunity_id;

  return coalesce(v_payload, '{}'::jsonb);
end;
$$;

create or replace function public.reopen_opportunity_if_unfunded(p_opportunity_id bigint)
returns oportunidades
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_paid numeric;
  v_op oportunidades%rowtype;
begin
  select * into v_op from oportunidades where id = p_opportunity_id for update;
  if not found then
    raise exception 'Oportunidad no existe';
  end if;

  select coalesce(sum(amount), 0) into v_total_paid
  from inversiones
  where opportunity_id = p_opportunity_id
    and lower(trim(status)) = 'pagado';

  if v_total_paid > 0 then
    raise exception 'No se puede reabrir; tiene pagos acreditados (%)', v_total_paid;
  end if;

  update oportunidades
  set estado = 'disponible'
  where id = p_opportunity_id;

  return (select * from oportunidades where id = p_opportunity_id);
end;
$$;

-- Registrar pago dirigido: marca desembolso pagado y avanza estados de oportunidad/solicitud
create or replace function public.registrar_pago_dirigido(
  p_opportunity_id bigint,
  p_comprobante_url text default null,
  p_contract_url text default null
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
begin
  -- Traer o crear desembolso
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

  -- Avanza estado de oportunidad y solicitud
  select solicitud_id into v_solicitud_id from oportunidades where id = p_opportunity_id;
  update oportunidades set estado = 'activo' where id = p_opportunity_id;
  if v_solicitud_id is not null then
    update solicitudes set estado = 'desembolsado' where id = v_solicitud_id;
  end if;

  -- Generar cronograma solo si no existe
  if not exists (select 1 from amortizaciones where opportunity_id = p_opportunity_id) then
    select
      o.monto,
      o.plazo_meses,
      o.tasa_interes_prestatario,
      coalesce(v_disb.paid_at, now())
    into
      v_monto,
      v_plazo,
      v_tasa,
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
      for i in 1..v_plazo loop
        v_interest := v_balance * v_rate;
        v_principal := v_payment - v_interest;
        if v_principal < 0 then v_principal := 0; end if;
        v_balance := greatest(v_balance - v_principal, 0);
        insert into amortizaciones (opportunity_id, installment_no, due_date, principal, interest, payment, balance, status)
        values (
          p_opportunity_id,
          i,
          v_start_date + (i || ' month')::interval,
          v_principal,
          v_interest,
          v_payment,
          v_balance,
          'pendiente'
        );
      end loop;
    end if;
  end if;

  return v_disb;
end;
$$;
