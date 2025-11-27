# Integración Pendiente: Prestatario + Inversionista (Fase Final MVP)

Objetivo: cerrar el flujo end-to-end sin custodia, usando QR genérico hoy y dejando bases listas para pasar a QR/API bancaria trazable. Incluye marketplace, fondeo, desembolso dirigido y cobranza/distribución mensual.

## Checklist MVP rápido (prioridad)
- Tablas + RLS listas: `inversiones`, `payment_intents`, `movimientos`, `desembolsos`.
- RPC `get_opportunity_details_with_funding` para detalle + barra de fondeo (fuente única de saldo pendiente/overbooking).
- Conciliación manual (CSV) que actualiza intents/reservas y sube oportunidades a `fondeada`; reservado para webhook PSP/API banco.
- Trigger/lógica: al 100% fondeo marcar `fondeada`, expirar reservas y crear orden de pago dirigido.
- Ledger básico: registrar cobro prestatario y distribución inversionista (comisión plataforma incluida).
- UI: QR pago en detalle de oportunidad; QR mensual en panel prestatario; estados claros en portafolio.

## 1) Esquema y estados clave (DB)
- Tabla `inversiones` (intenciones de fondeo):
  - `id`, `opportunity_id`, `investor_id`, `amount`, `status` (`intencion`, `pendiente_pago`, `pagado`, `expirado`, `cancelado`), `payment_intent_id`, `created_at`.
  - RLS: inversionista solo ve sus filas; admin/ops ve todo.
- Tabla `payment_intents` (cobros a inversionistas):
  - `id`, `opportunity_id`, `investor_id`, `expected_amount`, `status` (`pending`, `paid`, `expired`, `unmatched`, `failed`), `reference_code` (reservado para QR con referencia), `payment_channel` (`qr_generico`), `expires_at`, `paid_at`, `paid_amount`, `reconciliation_notes`, `metadata` (JSON para PSP futuro).
  - RLS: inversionista ve su intent; admin/ops ve todo.
- RPC `get_opportunity_details_with_funding(opportunity_id)`:
  - Devuelve oportunidad + `total_funded` = SUM(`inversiones.amount` where status=`pagado`) + `saldo_pendiente`.
  - Úsalo en detalle de oportunidad y en validaciones de overbooking.
- Oportunidades:
  - Estados: `borrador` → `disponible` (tras aceptación prestatario) → `fondeada` (total_funded >= monto) → `activo` (desembolso realizado) → `cerrado` (pagado) / `en_mora`.
  - Al pasar a `fondeada`, bloquear nuevas intenciones y crear tarea de pago dirigido.

## 2) Flujo de fondeo inversionista (sin PSP hoy, listo para PSP mañana)
1. Intención + cobro al umbral:
   - Reserva blanda: registrar intención solo cuando hay saldo pendiente. Opcional: activar cobro al llegar a umbral de fondeo (p.ej. ≥90% cubierto por intenciones) para minimizar costo de oportunidad; antes de ese umbral, solo se cola la reserva.
   - Cuando se habilita el cobro (umbral alcanzado o saldo pendiente disponible), crear `payment_intent` con `expected_amount` = saldo pendiente (o parte), `expires_at` = ahora + 48–72h, `status=pending`.
   - Crear `inversiones` vinculada con `status=pendiente_pago`.
2. UI muestra QR genérico + instrucciones:
   - “Paga exactamente Bs X antes de DD/MM HH:MM. Si no se acredita, la reserva expira.”
   - Botón “Ya pagué” solo informa; la confirmación real es la conciliación.
3. Conciliación (manual/CSV hoy):
   - Script/cron empareja movimientos del extracto con `payment_intents` pendientes por monto exacto + ventana de tiempo.
   - Si match: `payment_intent.status=paid`, `paid_at/paid_amount` set, `inversion.status=pagado`.
   - Si no match: marcar `unmatched` y queue para revisión; opcional pedir comprobante solo si cae aquí.
4. Control de overbooking:
   - Antes de crear intent, validar `saldo_pendiente > 0`; si no, bloquear.
   - Tras conciliación, recalcular `total_funded`; si >= monto, set `oportunidades.estado=fondeada` y expirar intents pendientes.

## 3) Desembolso dirigido al banco acreedor (post-fondeo)
- Al marcar `fondeada`, crear orden de pago al banco acreedor (manual hoy, API mañana). Registrar en tabla `desembolsos`:
  - `opportunity_id`, `monto_bruto`, `monto_neto`, `estado` (`pendiente`, `en_proceso`, `pagado`, `fallido`), `comprobante_url` (opcional), `paid_at`.
- Tras pago exitoso:
  - `oportunidades.estado=activo`.
  - Notificar prestatario (“Pagamos tu tarjeta; tu QR mensual está listo”) y mostrar comprobante si lo hay.

## 4) Cobranza mensual al prestatario (QR genérico hoy)
- Generar “payment schedule” para cuotas mensuales (fecha_vencimiento, monto_cuota_fija, breakdown capital/interés/admin+seguro).
- Por cada cuota:
  - Crear `borrower_payment_intent` (análogo a inversionistas) con `expected_amount` = cuota fija + admin/seguro prorrateado mostrado, `expires_at` = fecha de vencimiento + gracia (p.ej. 3 días).
  - UI prestatario muestra QR genérico con monto exacto y fecha de vencimiento.
- Conciliación de pagos prestatario:
  - Match por monto exacto + ventana; si match, registrar `pago_cuota` y actualizar saldo.
  - Si no paga, estado `en_mora` y aplica cargos según política (definir luego).

## 5) Distribución a inversionistas (sin custodiar saldo)
- Cada pago de cuota confirmado genera movimientos:
  - Calcular capital + interés por tabla de amortización.
  - Descontar `comision_servicio_inversionista` (1% del pago total capital+interés).
  - Descontar admin/seguro (0.15% min 10 Bs) según regla de negocio; seguro puede ser pass-through si aplica.
  - Pro-rata por participación (monto invertido / total_funded).
- Crear tabla `movimientos`:
  - Tipos: `cobro_prestatario`, `pago_inversionista`, `comision_plataforma`, `seguro_pass_through`.
  - Campos: `id`, `opportunity_id`, `investor_id` (nullable), `amount`, `currency`, `tipo`, `related_payment_intent_id`, `nota`, `created_at`.
- Pagos a inversionistas:
  - Hoy: lote manual (transferencias) usando `movimientos` como orden de pago y la cuenta bancaria verificada del inversionista.
  - Futuro: integrarlo a API bancaria/PSP para payouts automáticos (usa `metadata` y `status` en `movimientos`).

## 6) UI/UX a implementar
- Marketplace:
  - Filtros existentes; añadir “saldo por fondear” y “vence el DD/MM” si usas expiración de campaña.
  - Card/Detalle: barra de progreso con `total_funded`, CTA “Invertir” → modal con QR e instrucciones (monto exacto, expiración).
- Detalle de oportunidad:
  - Estado: disponible / fondeada / activa.
  - Tabla de inversión del usuario: status de su reserva (pendiente pago / pagado / expirado) y botón “renovar” si expiró.
- Portafolio:
  - Lista de inversiones con estado, monto, fecha de expiración de pago, monto pagado, y link a detalle.
  - Al fondearse: mostrar “Préstamo activo” y cronograma; cuando llegue cada pago, mostrar abono y fecha estimada de transferencia.
- Prestatario:
  - Tras fondeo: card “Pagamos tu banco” + QR mensual con monto exacto y fecha límite.
  - Historial de pagos (estado pagado/pendiente/mora).

## 7) Operación y conciliación (MVP manual, escalable)
- Proceso diario (inversionistas y prestatarios):
  - Descargar extracto bancario.
  - Script de conciliación: match pagos por monto+ventana; actualizar `payment_intents`, `inversiones`, `borrower_payment_intents`.
  - Revisar “unmatched” y asignar manualmente; solo pedir comprobante si sigue sin match.
- Al 100% fondeo: ejecutar pago dirigido y cambiar estados.
- Reportes mínimos: tabla de oportunidades con fondeo % y estado; cola de “unmatched”; cola de pagos a inversionistas pendientes de transferencia.

## 8) Preparar salto a QR/API trazable (futuro cercano)
- Mantén `reference_code`, `psp_provider`, `psp_payment_id`, `metadata` en `payment_intents`.
- Encapsula conciliación en una función/servicio; mañana se reemplaza la entrada CSV por webhook.
- Añade `webhook_events` (tabla) para idempotencia cuando conectes PSP.

## 9) Riesgos y mitigaciones
- Overbooking: validar saldo antes de crear intent y expirar intents al fondear.
- Costo de oportunidad: expiración corta (48–72h) y cobro solo cuando hay cupo.
- Conciliación ambigua: usar montos exactos únicos y ventana estrecha; fallback manual.
- Trazabilidad de pagos a inversionistas: registrar `movimientos` y estado de payout; requiere disciplina operativa hasta automatizar.

## 10) Próximos pasos concretos (orden sugerido)
**Plan de trabajo para hoy (orden sugerido)**
1) Migraciones + RLS: `payment_intents`, `inversiones`, `movimientos`, `desembolsos`.  
2) RPC `get_opportunity_details_with_funding` y consumirlo en front (detalle/portafolio) para barra de fondeo y saldo disponible.  
3) Front fondeo inversionista: QR/instrucciones + expiración, estado de la reserva, bloqueo de overbooking, expiración de reservas.  
4) Conciliación manual (CSV) que marca `payment_intents`/`inversiones` pagados, expira pendientes y sube a `fondeada` cuando llegue al 100%.  
5) Desembolso dirigido al banco acreedor: set `oportunidades.estado=fondeada` → crear `desembolsos`, marcar `activo` tras pago y mostrar comprobante en prestatario.  
6) Cobranza prestatario: schedule mensual, `borrower_payment_intents` con QR, estados pagado/pendiente/mora.  
7) Distribución inversionistas: ledger `movimientos`, comisión 1%, admin/seguro, pro-rata y marcado de payouts manuales.  
8) Notificaciones y analítica: eventos clave (Viewed Marketplace, Created Intent, Uploaded Receipt, Intent Paid, Payout Received) e identify; notifs de reserva expirada, fondeo completado, pago recibido.  
9) Operativa diaria: checklist de conciliación, expiración y pagos a inversionistas; reportes de “unmatched”.  
10) SEO/launch: desplegar sitemap (calculadora/inversionista) y reindexar en Search Console; QA e2e y vercel prod.

## 11) Contrato y mandato (MVP sin firma electrónica)
- Cuándo: al marcar `fondeada` (total pagado = `oportunidades.monto`), generar PDF de contrato + mandato de pago dirigido y notificar.
- Datos a usar:
  - Prestatario (`solicitudes`): `nombre_completo`, `cedula_identidad`, `email`, `telefono`, `departamento`.
  - Préstamo (`oportunidades`): `id`, `monto` (bruto), `saldo_deudor_verificado` (neto a pagar al banco), `plazo_meses`, `tasa_interes_prestatario`, `riesgo`/`perfil_riesgo`, `comision_originacion_porcentaje`, `cargo_servicio_seguro_porcentaje`, `cuota_promedio`.
  - Inversionistas (`inversiones` pagadas): `investor_id`, `amount` y datos básicos (nombre/email) para acuse de participación.
  - Desembolso (`desembolsos`): `comprobante_url`, `paid_at` para el correo post-pago al banco acreedor.
- Contenido mínimo del PDF:
  1) Encabezado con logo (public/Logo-Tu-Prestamo.png), colores #00445A / #26C2B2, fecha y número de operación (`oportunidades.id`).
  2) Contrato de préstamo: monto bruto, neto a pagar al banco, tasa, plazo, cronograma (tabla), comisiones (originación, admin+seguro prorrateado), obligación de pago y cesión/participación permitida.
  3) Mandato de pago dirigido: autorización del prestatario para que Tu Préstamo pague su tarjeta con los fondos de inversionistas.
  4) Declaración de riesgos y mora básica (si se define interés/cargo por mora).
  5) Firma/acuse: clickwrap (hash + storage) por ahora; sello Tu Préstamo.
- Notificaciones:
  - Prestatario: al fondear, email/notif “Tu préstamo fue fondeado; pagaremos tu banco” con link/adjunto al PDF.
  - Tras pago dirigido: email/notif con `desembolsos.comprobante_url`, cronograma y QR de primera cuota.
  - Inversionista: email/acuse con monto y % (amount / `oportunidades.monto`), recordando que los pagos dependen del préstamo subyacente.
