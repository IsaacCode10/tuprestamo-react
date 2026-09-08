-- No permite dos solicitudes de prestatario ACTIVAS con la misma Cedula de Identidad.
-- Es un indice parcial (no una constraint UNIQUE plana) a proposito: una persona rechazada
-- o ya desembolsada puede volver a aplicar mas adelante - eso sigue permitido, solo se
-- bloquea tener MAS DE UNA activa al mismo tiempo. Ver caso real en
-- docs/MANUAL_ANALISTA_RIESGO.md seccion 6.
create unique index if not exists solicitudes_cedula_activa_unique
  on public.solicitudes (cedula_identidad)
  where tipo_solicitud = 'prestatario'
    and estado in ('pendiente', 'pre-aprobado', 'documentos-en-revision', 'aprobado_para_oferta');
