## Actualización 2026-02-04

**Objetivo:** Solucionar el bug en "Operaciones -> Pagos a inversionistas" que impedía adjuntar un comprobante a un `payout` que ya estaba en estado "Pagado".

**Cambios Realizados:**
1.  **Refactorización del Componente (`src/AdminOperations.jsx`):** Se reescribió la lógica para subir comprobantes. Se eliminó el flujo confuso de botones ("Subir", "Cambiar", "Guardar") y se reemplazó por una acción atómica: un único botón "Adjuntar" o "Cambiar" que sube y guarda el archivo inmediatamente al seleccionarlo.
2.  **Corrección de Build (Commit enmendado):** El primer intento de despliegue falló por un error de sintaxis (`try/catch` incompleto) introducido en la refactorización. Se corrigió el error y se enmendó el commit anterior para mantener el historial limpio antes de volver a desplegar.

**Error Actual:**
- **Síntoma:** A pesar de que el despliegue fue exitoso, la funcionalidad sigue sin operar. Al hacer clic en "Adjuntar" y seleccionar un archivo, no ocurre nada. No se muestra ningún mensaje de "Subiendo...", de éxito, ni de error. El archivo no se guarda.
- **Diagnóstico Preliminar:** El fallo ocurre de forma silenciosa en el frontend. La función `handlePayoutReceiptChange` que debería ejecutarse no se está activando o se interrumpe prematuramente sin poder reportar un error en la interfaz.

**Pendiente para Mañana (o Siguiente Acción):**
- **Depuración en el Navegador:** Se le ha solicitado a Isaac que realice la acción de nuevo con la **consola del desarrollador (F12)** abierta para capturar el mensaje de error exacto que probablemente se está registrando allí. Este error es indispensable para diagnosticar la causa raíz (ej. un problema de permisos RLS, un error de red, etc.) y aplicar la solución correcta.

## Actualización 2026-02-04 (Fix definitivo comprobantes payouts)

**Resultado:** Ya se puede adjuntar comprobante en Operaciones → Pagos a inversionistas (op 61).

**Causa raíz:** RLS en Supabase:
- `storage.objects` no permitía `INSERT` en bucket `comprobantes-pagos` para `admin/ops`.
- `payouts_inversionistas` no permitía `UPDATE` para `admin/ops` (solo `service_role`).

**Solución aplicada (Supabase):**
- Nueva policy `ops_admin_upload_receipts` en `storage.objects` para `INSERT` en `comprobantes-pagos` para roles `admin/ops`.
- Nueva policy `po_update_admin_ops` en `payouts_inversionistas` para permitir `UPDATE` de `admin/ops`.

**Estado:** Comprobante adjuntado y visible como “Ver Comprobante”.

## Actualización 2026-02-04 (Alinear “Próximo pago” inversionista)

**Problema:** En panel inversionista, “Cobros acreditados” (payout real) no coincidía con “Próximo pago (Programado)”.  
Ejemplo op 61: payout real 518,71 vs programado 453,6477 (cronograma).

**Causa raíz:** `get_investor_installments` genera proyección con un monto desfasado respecto al cobro real del prestatario (BPI). El payout real sí estaba correcto.

**Solución aplicada (frontend):**
- “Próximo pago (Programado)” ahora usa el **monto real del último payout pagado** por oportunidad si existe; si no, usa el cronograma como fallback.

**Archivo:** `src/MyInvestmentsList.jsx`

## Actualización 2026-02-07

**Migraciones / Supabase**
- Migración creada y versionada: `20260207_ops_payout_receipts_policies.sql` (RLS para ops/admin en comprobantes y payouts).
- `20260207` marcada como `applied` en historial remoto.
- Persisten desajustes en historial por `20251127` (CLI v2.65.5 no alinea correctamente). Se posterga `db pull` hasta actualizar CLI o cerrar la brecha con repair controlado.

**Contrato (PDF)**
- Se mejoró el layout del contrato (word‑wrap, paginado) y se agregó soporte de logo vía `CONTRACT_LOGO_URL`.
- Edge function `generate-contract` desplegada nuevamente.
- Bucket `branding` creado (público) para el logo.

**Notas**
- Falta validar el nuevo PDF en una nueva oportunidad (evitamos regenerar contrato en op 61 para no alterar el flujo).

## Actualización 2026-02-03

**Lo hecho hoy:**
- Se corrigió la vulnerabilidad de seguridad `SECURITY DEFINER` en las vistas de la base de datos, aplicando una nueva migración.
- Se solucionó el bug en el panel de Operaciones que impedía subir un comprobante de pago a un inversionista si este ya había sido marcado como "pagado". Los cambios fueron desplegados a producción en Vercel.

**Pendiente para mañana:**
- **Validación por Isaac:** Probar en producción el flujo completo en el panel de Operaciones para la oportunidad 61. Confirmar que se puede seleccionar un archivo de comprobante y guardarlo exitosamente para un pago que ya figura como "pagado".

## Actualización 2026-01-16

**Seguridad (Supabase):**
- Resuelto warning de `SECURITY DEFINER` en `public.fuente_unica_checks` y permisos reducidos a `SELECT` para roles necesarios.
- RLS corregido para `borrower_payment_intents`, `desembolsos`, `solicitudes`, `investor_leads` usando `app_metadata.role`.
- Warnings de `Function Search Path Mutable` corregidos (search_path fijo en funciones listadas).
- OTP expiry ajustado a < 1 hora.

**Pendiente por plan (Free):**
- Leaked password protection: requiere plan Pro (Auth).
- Postgres upgrade: requiere plan Pro (Compute and Disk).

## Actualización 2025-12-18

**Lo hecho hoy:**
- Operaciones (UI): agrupamos cuotas de prestatarios por oportunidad con resumen (pendientes, monto, próxima cuota) y despliegue por op; ocultamos el input de recibo cuando ya hay comprobante y etiquetamos “Subido por el prestatario”.
- Operaciones (UI Payouts): agrupamos payouts por oportunidad con resumen de pendientes/neto, filtros de estado/búsqueda y lista expandible por op; se mantiene CSV y ver solo pendientes.
- Storage Supabase: habilitamos lectura de comprobantes para roles admin/ops en `comprobantes-pagos`, ya se pueden abrir los recibos de prestatario en Operaciones.

**No probado (limitación local):**
- `npm run build` falló en este entorno (WSL1 no soportado / Node no detectado). Falta correr build y deploy desde entorno compatible.

**Pendiente inmediato (validación E2E op 61, primera cuota):**
- Operaciones: abrir “Pagos de prestatarios” → ver Cuota #1 con comprobante y marcarla `paid` (dispara `process_borrower_payment`).
- Operaciones: en “Payouts”, confirmar generación de payouts `pending` (banco GANADERO / 1310978715), exportar CSV, marcar `paid` (dispara `mark_payout_paid`).
- Inversionista: confirmar notifs payout `pending`/`paid` y reflejo en “Mis Inversiones”.
- Admin: revisar “Fuente Única” con montos no-cero y estado OK/Revisar para la cuota pagada.
- Frontend: correr `npm run build` y `npx vercel --prod` desde entorno compatible.

## Actualización 2025-12-19

**Lo hecho hoy:**
- Operaciones (UI): estados en español, nombres legibles (nombre/email o UUID corto), botones de carga alineados a marca, feedback al marcar cuotas pagadas, acciones ocultas en cuotas pagadas, numeración real de cuotas, textos de pagos a inversionistas en español.
- AdminDashboard: sección de Mora (mora por monto/cuotas con buckets 0-30/31-60/61-90/90+) y tabla por oportunidad. Se calcula en frontend con 3 días de gracia.
- Documentación: manuales de Operaciones, Analista de Riesgo y Super Admin/CEO en `docs/`; Brand Kit actualizado con estilos de controles/tablas.

**Validación E2E (op 61, cuota 1):**
- Prestatario: subió comprobante; Ops marcó pagada la cuota y llegó notificación al prestatario.
- Pendiente: marcar `Pagado` el payout/inversionistas de op 61 y validar notifs en panel inversionista + Fuente Única OK.

**Pendientes para lanzar:**
- Operaciones: en Pagos a inversionistas, marcar `Pagado` los pendientes de op 61 (GANADERO / 1310978715) con comprobante si aplica.
- Inversionista: confirmar notificaciones y reflejo del pago en “Mis Inversiones”.
- Admin: validar Fuente Única para la cuota 1 (status OK/Revisar) y Mora en cero.
- Deploy frontend desde entorno compatible: `npm run build` + `npx vercel --prod`.
## Actualización 2026-01-22

**Lo hecho hoy:**
- SSOT Mora: creada vista `borrower_mora_view` en BD y AdminDashboard ahora consume esa vista (gracia 3 días en backend).
- SSOT Fuente Única: `fuente_unica_checks` ahora se alimenta de `borrower_schedule_view` + movimientos (cast a bigint); status más estricto cuando hay pago sin cobro.
- RLS: habilitada lectura de `desembolsos` para el prestatario dueño (via `oportunidades.user_id` o `solicitudes.user_id`).
- Panel prestatario: fix de timing para cargar desembolso/contrato cuando la sesión está lista; copy contextual en “Pago dirigido y contrato”.
- Backfill op 61: due_date alineado en `borrower_payment_intents`.
- Documentación: `FUENTE_UNICA_DE_VERDAD.md` con reglas SSOT y mora.

**Pendiente para E2E y lanzamiento:**
- Operaciones: en Pagos a inversionistas, marcar `Pagado` los pendientes de op 61 (GANADERO / 1310978715) con comprobante si aplica.
- Inversionista: confirmar notificaciones payout `pending`/`paid` y reflejo en “Mis Inversiones”.
- Admin: validar Fuente Única para cuota 1 (status OK/Revisar) y Mora en cero.
- Frontend: deploy a Vercel con los cambios de AdminDashboard y BorrowerDashboard.
- Backend: asegurar que la creación de `borrower_payment_intents` siempre guarde `due_date` (y/o `installment_no`) para evitar joins vacíos en SSOT.
## Actualización 2026-01-25

**Lo hecho hoy:**
- Panel inversionista: UI simplificada con tabs Inversiones/Pagos, 3 KPIs y tabla minimalista alineada al Brand Kit.
- SSOT inversionista: creada vista `investor_payouts_view` y el panel ahora consulta esa vista.
- Producción: vista `investor_payouts_view` creada manualmente en Supabase para desbloquear el panel.
- Migraciones: renombrada `20260122_update_fuente_unica_checks.sql` a `20260123_update_fuente_unica_checks.sql`; `20251127_funding_workflow.sql` restaurada a versión canónica remota y la versión modificada quedó en `20260125_funding_workflow_followups.sql`.
- Config Supabase: `major_version` actualizado a 17 en `supabase/config.toml`.

**Pendiente para lanzamiento:**
- Operaciones: marcar `Pagado` payouts de op 61 (GANADERO / 1310978715) con comprobante si aplica.
- Inversionista: validar notificaciones payout `pending`/`paid` y reflejo en “Mis Inversiones”.
- Admin: validar Fuente Única (status OK/Revisar) y Mora en cero.
- Migraciones: alinear historial (resolver desajuste de `20251127`) y aplicar `20260123` + `20260125` con `supabase db push`.
- Frontend: `npm run build` + `npx vercel --prod` desde entorno compatible.

**Nota SSOT (inversionista):**
- Pagos reales SOLO desde `investor_payouts_view` (nunca usar cronograma para montos reales).
- Cronograma (`get_investor_installments`) SOLO para “programado” cuando no hay payout real.
- No truncar cronograma al calcular “Cuota X de N”.

## Actualización 2026-01-26

**Revisión RLS/Storage antes de marcar payout como pagado (pendiente para mañana):**
- RLS de `notifications` bloquea inserts de Ops hacia inversionistas: todas las policies permiten insertar solo si `user_id = auth.uid()`. Cuando Ops marca payout pagado, intenta insertar notificación para otro usuario y puede fallar.
- Opciones a implementar: (1) Edge Function con `service_role` para insertar notificaciones, o (2) policy que permita a `admin/ops` insertar notificaciones para cualquier `user_id`. Pendiente confirmar rol exacto de Ops (`profiles.role`).
- Faltan revisar policies de `storage.objects` para validar lectura de comprobantes por inversionista y carga por Ops. Query pendiente:
  `select schemaname, tablename, policyname, roles, cmd, qual, with_check from pg_policies where schemaname = 'storage' and tablename = 'objects' order by policyname;`


## Actualizaci??n 2026-01-29

**Lo hecho hoy:**
- Se elimin?? la notificaci??n duplicada en frontend al marcar payout pagado; ahora la notificaci??n queda solo desde el backend (RPC `mark_payout_paid`).
- Se ajust?? la regla de acciones en Operaciones: el bot??n ???Marcar pagado??? solo aparece si el status del payout es `pending`; en otros estados muestra ???Sin acciones (ya pagado)???.
- Se actualiz?? el modo de trabajo: siempre entregar bloque de comandos de deploy cuando se haga un cambio.
- Se revisaron policies de `storage.objects` y buckets: lectura de comprobantes est?? permitida para inversionistas (policies `auth_read_receipts` e `investor_read_payout_receipts`).

**Pendiente:**
- Deploy frontend con los cambios de `AdminOperations` y confirmar en producci??n que el bot??n no aparece cuando el payout est?? pagado.
- Validar si `receipt_url` se guarda en `payouts_inversionistas` al marcar pagado con comprobante y que el inversionista vea el enlace (refrescar panel).
