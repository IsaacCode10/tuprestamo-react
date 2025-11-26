# Integración Pendiente: Prestatario + Inversionista (Fase Final MVP)

Objetivo: cerrar el flujo end-to-end sin custodia, usando QR genérico hoy y dejando bases listas para pasar a QR/API bancaria trazable. Incluye marketplace, fondeo, desembolso dirigido y cobranza/distribución mensual.

## Checklist MVP rápido (prioridad)
- Crear tablas y RLS: `inversiones`, `payment_intents`, `movimientos`, `desembolsos` (nombres a confirmar).
- RPC `get_opportunity_details_with_funding` para detalle + barra de fondeo.
- Conciliación manual (CSV) con estados de intentos de pago; reservado para webhook PSP/API banco.
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
1) Crear migración de `payment_intents`, `inversiones`, `movimientos`, `desembolsos` con RLS.  
2) Implementar RPC `get_opportunity_details_with_funding`.  
3) Ajustar front de detalle de oportunidad para usar el RPC y mostrar QR/instrucciones + expiración.  
4) Añadir expiración de reservas y lógica de bloqueo de overbooking en front y en DB (constraint o trigger).  
5) Implementar script/función de conciliación manual (lee CSV) que actualiza intents/inversiones.  
6) Al fondear, set `oportunidades.estado=fondeada` y crear registro en `desembolsos`; preparar UI prestatario con QR mensual.  
7) Crear ledger de `movimientos` y flujo de distribución al confirmar cada pago de prestatario.  
8) Añadir notificaciones (inversionista: pago recibido/reserva expirada; prestatario: fondeo completado/pago mensual disponible).  
9) Documentar operativa diaria y checklist de conciliación.  
10) Planificar integración PSP/API banco: usar campos reservados y probar con sandbox cuando esté disponible.
