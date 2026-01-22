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
