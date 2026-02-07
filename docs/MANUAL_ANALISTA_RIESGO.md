# Manual del Analista de Riesgo (MVP)

## 1. Objetivo y rol
- Evaluar solicitudes, validar documentos y definir la propuesta final (monto bruto, neto, tasa, plazo).
- Garantizar que el préstamo cubra el saldo deudor verificado (sin desvío) y que el riesgo esté correctamente clasificado.

## 2. Nomenclatura en la plataforma
- **Oportunidad 61**: número corto de operación; usar este ID en comunicaciones internas.
- **Prestatario**: se muestra como nombre/email; si falta, UUID abreviado (ej. `f6b6…b8b7`).
- **Estados solicitud/oportunidad**: borrador, disponible, fondeada, activo, cerrado/en mora.
- **Documentos**: CI, extracto de tarjeta, comprobantes; ubicados en `documentos-prestatarios` (privado).

## 3. Flujo de trabajo (RiskAnalystDashboard)
1) **Revisión inicial**: abrir la solicitud en el panel de analista; validar datos básicos y documentos cargados.
2) **Verificación de saldo deudor**: revisar extracto; registrar `saldo_deudor_verificado` en el scorecard.
3) **Clasificación de riesgo**: revisar scorecard (perfil A/B/C) y antecedentes; ajustar si aplica.
4) **Cálculo de oferta**:
   - Gross-up automático: originación mínima 450 hasta 10k; sobre 10k aplicar % por perfil (A/B/C).
   - Confirmar tasa y plazo aprobados.
5) **Guardar decisión**: guardar en `decisiones_de_riesgo`; actualizar oportunidad/solicitud.
6) **Propuesta final**: disparar propuesta al prestatario (correo/notif) y publicar oportunidad (estado `disponible`) tras aceptación.

## 4. Checklist por solicitud
- Documentos completos y legibles (CI, extracto tarjeta).
- Saldo verificado registrado y consistente con la oferta.
- Tasa/plazo asignados según perfil; originación aplicada correctamente.
- Oportunidad publicada solo cuando el prestatario acepta la propuesta.

## 5. Incidencias comunes
- **Documento ilegible/faltante**: solicitar recarga; no aprobar hasta validar saldo.
- **Saldo inconsistente**: volver a calcular gross-up y ajustar oferta antes de publicar.
- **Estado en inglés**: refrescar; si persiste, reportar a soporte.

## 6. Checklist diario
- Revisar nuevas solicitudes y documentos pendientes.
- Completar decisiones en cola y publicar oportunidades aprobadas.
- Coordinar con Operaciones si hay cambios de datos que afecten pagos/cronos.
