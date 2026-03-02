

## Actualizacion 2026-02-18

**Lo hecho hoy:**
- Se corrigieron errores de build provocados por `||` faltantes en:
  - `src/AdminDashboard.jsx`
  - `src/BorrowerDashboard.jsx`
  - `src/MyInvestmentsList.jsx`
  - `src/RiskAnalystDashboard.jsx`
- Se reparo el componente `NavButton` en `src/components/Header.jsx` (estaba roto por comentarios en medio del return).
- El build de Vite vuelve a pasar sin errores (queda solo el warning de `hero-bg.jpg` sin resolver en build time).

**Pendiente para manana (E2E):**
- Continuar E2E de la oportunidad nueva desde el punto actual con flujos prestatario/analista/operaciones.
- Validar end-to-end: aprobacion final -> propuesta -> aceptacion -> firma notariada -> publicacion -> fondeo -> pago dirigido -> contrato/cronograma.

## Actualizacion 2026-02-19

**Lo hecho hoy:**
- Se estabilizo el flujo de aprobacion en analista corrigiendo errores 500 por RPC faltante (`apply_risk_decision_state`) y desalineacion de firma/parametros.
- Se mejoro el manejo de errores en frontend de analista (`RiskAnalystDashboard`): ahora muestra detalle real del backend en lugar de mensaje generico.
- Se corrigio UX del campo "Saldo Deudor Verificado": inicia vacio, persiste el valor ingresado por analista y se mostro prefijo `Bs.` con entrada decimal simple.
- Se corrigio ruta de CTA en correo de propuesta (`/borrower-dashboard`) y se agrego redireccion de compatibilidad desde `/dashboard-prestatario`.
- Se reforzo hardening para solicitudes duplicadas activas por email (backend + mensaje claro en frontend).
- Se unifico calculo de costos/cuota bajo SSOT en aprobacion y propuesta, incluyendo persistencia canonica de:
  - `interes_total`
  - `comision_servicio_seguro_total`
  - `costo_total_credito`
  - `cuota_promedio`
- Se saneo historial de migraciones Supabase:
  - legacy `20251127` movida a `supabase/sql/`
  - legacy `20260219` movida a `supabase/sql/`
  - `db push --linked` vuelve a funcionar y queda `Remote database is up to date`.
- Se documento en `MODE_DE_TRABAJO_CODEX.md` el procedimiento obligatorio de migraciones (naming, flujo, recovery y plan B).

**Pendiente para siguiente bloque:**
- Ejecutar una corrida E2E nueva completa para validar consistencia final SSOT:
  - propuesta (cuota/costos),
  - tabla de amortizacion,
  - correo de propuesta.
- Confirmar con SQL post-aprobacion que `oportunidades` persiste valores canonicos coherentes en todos los campos de costo.
- Registrar cierre funcional definitivo del capitulo "Aprobacion y propuesta" si la corrida E2E queda 100% consistente.

## Actualizacion 2026-02-23

**Lo hecho hoy:**
- Se completo hardening del flujo `pendiente_notariado` en prestatario:
  - tracker y copys alineados al flujo real (firma notariada antes de publicar),
  - se elimino uso de `alert()` nativo y se reemplazo por mensajes UI,
  - se agrego estado intermedio "firma agendada" con persistencia.
- Se implemento persistencia segura de "Ya agende mi firma":
  - migracion `20260222194000_notariado_agendado_tracking.sql` (columna `desembolsos.notariado_agendado_at`),
  - nueva edge function `mark-notary-scheduled` con validacion de ownership/estado (sin exponer update directo por frontend).
- Se mejoro UX de Operaciones en Desembolso Dirigido:
  - boton de notariado cambia a `Reemplazar contrato notariado` cuando ya esta validado,
  - tooltip de `Registrar pago dirigido` aclarado con secuencia operativa.
- Se corrigio control de publicacion en Operaciones:
  - boton `Publicar oportunidad` ahora usa estado real de oportunidad (`disponible/fondeada/activo/...`) para deshabilitarse,
  - muestra `Ya publicada` cuando corresponde,
  - refresh automatico al publicar.
- Se reforzo documentacion operativa:
  - `docs/MANUAL_OPERACIONES.md` actualizado con flujo completo (notariado -> publicacion -> fondeo -> desembolso -> cuotas/payouts),
  - `docs/MANUAL_ANALISTA_RIESGO.md` y `docs/MANUAL_SUPER_ADMIN_CEO.md` alineados al flujo vigente.
- Se mejoro contrato prestatario (`generate-contract`) con clausulas mas claras (mandato, transparencia, jurisdiccion, control documental).
- Se implemento respaldo documental para inversionista:
  - migracion `20260222190000_investor_contract_receipt.sql`,
  - nueva edge function `generate-investor-contract`,
  - generacion automatica al marcar intent de inversion como pagado,
  - acceso en `Mis Inversiones` con boton `Contrato`.
- Se agrego control de permisos en `generate-investor-contract` (solo `admin/operaciones`).

**Pendiente para continuar E2E (oportunidad 70):**
- En Operaciones:
  1) Confirmar `Notariado: OK` (ya cargado) y mantener `Publicar oportunidad` en estado correcto.
  2) Completar fondeo 100% (confirmando pagos de inversionistas en `Pagos de inversionistas / Por conciliar`).
  3) Registrar pago dirigido al banco (con comprobante) en `Desembolso dirigido`.
  4) Registrar primera cuota del prestatario como `Pagado`.
  5) Validar payouts generados y marcar al menos uno como `Pagado`.
- Validaciones SQL finales de cierre cashflow v2:
  - `movimientos` por tipo (`cobro_prestatario`, `payout_inversionista`, `comision_plataforma`, `admin_plataforma`, `spread_plataforma`, `seguro_passthrough`),
  - `fuente_unica_checks` con `status = ok` y `diferencia ~= 0`.
- Cierre final pendiente:
  - confirmar E2E completo sin brechas y registrar cierre tecnico/funcional del flujo.

## Actualizacion 2026-02-25

**Lo hecho hoy:**
- Se formalizo en modelo/documentacion el costo operativo por credito para unit economics y P&L:
  - Analista de riesgo: **Bs 50 por credito aprobado**.
  - Consulta INFOCRED: **Bs 11 por evaluacion**.
- Se actualizo el panel de administracion para reflejar estos costos en metricas de unit economics/P&L mensual (`src/AdminDashboard.jsx`).
- Se corrigio el estado visual del prestatario cuando la oportunidad esta publicada (evitando mostrar "100% fondeada" antes de tiempo) y se alineo el stepper al estado real.
- Se unifico CTA de correos para prestatario a **"IR A MI PANEL"** con ruta `/borrower-dashboard` en funciones de correo relevantes.
- Se reviso y habilito el digest semanal de inversionistas (`weekly_investor_digest`) en cron.
- Se corrigio un bug critico en inversiones: `gen_random_bytes(integer) does not exist`, aplicando migracion definitiva de `pgcrypto` y `search_path` para `create_investment_intent`.
- Se limpiaron textos con mojibake en Operaciones y se mejoraron copys de estado en `Desembolso dirigido`.
- Se implemento backend+frontend para mostrar mejor identificacion de inversionista en Operaciones (nombre/email via RPC `get_ops_profile_labels`), pero quedo incidencia de ejecucion en produccion.

**Pendiente para continuar (E2E):**
- Resolver incidencia `400` en `rpc/get_ops_profile_labels` para que Operaciones muestre `Nombre (email)` en lugar de solo ID corto.
- Continuar E2E de oportunidad **#70**:
  1) Completar fondeo con 2 inversiones (40% / 60%).
  2) Marcar pagos de inversionista en Operaciones y validar cambio a `fondeada`.
  3) Registrar pago dirigido con comprobante y verificar comunicacion al prestatario.
  4) Ejecutar primeras validaciones de cuota prestatario y payout inversionista.
- Correr validacion SQL de conciliacion final:
  - `movimientos` por tipo (incluyendo `admin_plataforma`, `spread_plataforma`, `seguro_passthrough`),
  - `fuente_unica_checks` en `status = ok` y `diferencia` cercana a 0.

## Actualizacion 2026-02-26

**Lo hecho hoy:**
- Se corrigio la incidencia de labels en Operaciones (RPC `get_ops_profile_labels`) con hardening y fix de estructura/tipos:
  - migraciones `20260226090000_harden_get_ops_profile_labels_rpc.sql`
  - `20260226100000_fix_get_ops_profile_labels_rpc_400.sql`
  - `20260226124500_fix_ops_investor_kyc_queue_casts.sql`
- Se mejoro UX en oportunidad de inversion:
  - bloqueo de nueva inversion cuando existe reserva activa,
  - ocultar formulario/copy de nueva reserva si ya hay intent activo,
  - bloquear acciones y medios de pago cuando comprobante ya fue enviado,
  - estado correcto cuando intent queda `paid`.
- Se reforzo copy comercial (sin tecnicismos internos) y se actualizo `BRAND_KIT.md` con regla explicita de lenguaje cliente.
- Se mejoro `Mis Inversiones`:
  - KPIs mas coherentes (capital pagado),
  - montos con 2 decimales consistentes,
  - consolidacion por oportunidad,
  - fila expandible por movimientos,
  - fix de solapamiento de botones en la columna de acciones.
- Se corrigieron textos mojibake en header de inversionista (`Requiere revisión`, `En revisión`).
- Se implemento gate visible de KYC en marketplace (`/oportunidades`) con mensajes por estado:
  - `no_iniciado`, `pendiente_revision`, `requiere_revision_manual`,
  - refresh de estado por realtime y al volver a pestaña.
- Se implemento enforcement backend (SSOT) para inversiones:
  - migracion `20260226113000_enforce_kyc_in_create_investment_intent.sql`,
  - exige `estado_verificacion = verificado` para crear intent,
  - evita doble reserva activa por inversionista/oportunidad.
- Se implemento flujo manual en Operaciones para KYC inversionista:
  - nueva pestaña **Verificación inversionistas** en `AdminOperations`,
  - RPCs:
    - `get_ops_investor_kyc_queue()`
    - `ops_set_investor_kyc_status(...)`
  - acciones: aprobar verificacion / solicitar correccion + notificacion `kyc_status`.

**Pendiente para mañana (continuar E2E):**
- Validar en UI la nueva pestaña **Verificación inversionistas** con caso real (`tp7`) y confirmar transición:
  - `requiere_revision_manual` -> `verificado`.
- Probar flujo completo de un inversionista nuevo verificado (`tp8`):
  - verificar identidad -> habilitar inversion -> crear intent -> subir comprobante -> marcar pagado.
- Retomar E2E de oportunidad `#70`:
  1) completar fondeo 100%,
  2) registrar pago dirigido,
  3) validar estados/correos de prestatario e inversionista.
- Ejecutar chequeos SQL de cierre de caja:
  - `movimientos` por tipo (v2),
  - `fuente_unica_checks` con `status = ok`.

## Actualizacion 2026-03-02

**Lo hecho hoy:**
- Se cerro la correccion de fuente de datos para panel inversionista en escenarios multi-oportunidad:
  - nueva migracion `20260302113000_fix_investor_schedule_and_next_payment_v2.sql`.
  - `get_investor_installments` ya no mezcla oportunidades y usa cronograma canónico por oportunidad.
  - `investor_next_payment_view` ya no calcula con `borrower_amount * 0.99`; ahora calcula monto por inversionista consistente con cashflow `v2` y prioriza `pending_payout` cuando existe.
- Se valido en SQL y UI la coherencia de “Proximo pago” para los 3 inversionistas de la oportunidad `#70`:
  - `tp9`: Bs `47,92` (correcto),
  - `tp8`: Bs `158,13` (correcto),
  - `i.alfaro`: Bs `127,78` en op70 + coexistencia con op61.
- Se mejoro UX de `Mis Inversiones` para multi-oportunidad sin tocar logica transaccional:
  - priorizacion de pago mas critico en el KPI “Proximo pago” (incluyendo vencido),
  - contexto adicional `+N pagos en otras oportunidades` con ejemplo de monto/fecha.
- Se confirmo que el flujo de pagos/payouts de la cuota 1 de op70 ya refleja:
  - registro de pago prestatario,
  - distribucion a inversionistas,
  - notificaciones y correos en eventos de payout.

**Pendiente para cierre y lanzamiento:**
- Ejecutar **1 E2E final completo** en una oportunidad nueva desde cero (sin datos legacy) y registrar evidencia:
  1) publicacion,
  2) fondeo 100%,
  3) pago dirigido,
  4) cuota prestatario #1 pagada,
  5) payout inversionistas marcado pagado.
- Correr auditoria SQL final del E2E nuevo:
  - `fuente_unica_checks` en `status = ok`,
  - conciliacion waterfall con `diferencia = 0`,
  - validacion de `investor_next_payment_view` para inversionista con multi-oportunidad.
- Documentar politica operativa final de fechas de cobro/pago (prestatario/inversionista) en documentos de negocio y dejar backlog tecnico de migracion definitiva de fechas si se decide cambio de calendario.
