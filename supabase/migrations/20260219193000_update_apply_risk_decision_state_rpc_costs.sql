-- Align RPC payload with approved-offer SSOT cost fields.
-- Keeps the function signature compatible with registrar-decision-final.

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
  p_costo_total_credito numeric default null
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
        costo_total_credito = coalesce(p_costo_total_credito, costo_total_credito)
    where solicitud_id = p_solicitud_id;
    if not found then
      raise exception 'oportunidad for solicitud % not found', p_solicitud_id;
    end if;

    return;
  end if;

  raise exception 'invalid decision %', p_decision;
end;
$$;
