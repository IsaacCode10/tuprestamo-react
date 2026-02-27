-- Align UI "saldo por invertir" with backend reservation rules.
-- create_investment_intent already descuenta reservas activas (pendiente_pago/intencion);
-- these read RPCs must expose the same available cupo.

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
  v_total_reserved numeric;
begin
  select coalesce(sum(amount), 0)
  into v_total_paid
  from inversiones
  where opportunity_id = p_opportunity_id
    and status = 'pagado';

  select coalesce(sum(amount), 0)
  into v_total_reserved
  from inversiones
  where opportunity_id = p_opportunity_id
    and status in ('pendiente_pago', 'intencion');

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
    greatest(o.monto - v_total_paid - v_total_reserved, 0) as saldo_pendiente
  from oportunidades o
  where o.id = p_opportunity_id;
end;
$$;

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
  with funded as (
    select
      opportunity_id,
      coalesce(sum(case when status = 'pagado' then amount else 0 end), 0) as total_funded,
      coalesce(sum(case when status in ('pendiente_pago', 'intencion') then amount else 0 end), 0) as total_reserved
    from inversiones
    group by opportunity_id
  )
  select
    o.id,
    o.created_at,
    o.monto,
    o.plazo_meses,
    o.tasa_rendimiento_inversionista,
    o.comision_servicio_inversionista_porcentaje,
    o.perfil_riesgo,
    o.estado,
    coalesce(f.total_funded, 0) as total_funded,
    greatest(o.monto - coalesce(f.total_funded, 0) - coalesce(f.total_reserved, 0), 0) as saldo_pendiente
  from oportunidades o
  join solicitudes s on s.id = o.solicitud_id
  left join funded f on f.opportunity_id = o.id
  where s.estado in ('prestatario_acepto', 'desembolsado')
    and (
      o.estado in ('disponible', 'fondeada')
      or (o.estado = 'activo' and coalesce(f.total_funded, 0) >= o.monto)
    )
  order by o.created_at desc;
$$;
