# Roadmap de Backend del Inversionista (MVP actual)

Cobertura del flujo completo: landing → reserva 48h → pago → conciliación → payouts, con RLS y cron. Leyenda: `[✅ Completado]` `[🚧 En Progreso]` `[❌ Pendiente]`.

---

### Etapa 1: Onboarding y seguridad [✅]
- Auth Supabase rol inversionista, creación de `profiles` vía trigger/edge post-signup.
- RLS: inversionistas solo leen oportunidades `disponible`/`fondeada`; accesan sus `inversiones`, `payment_intents`, `notifications`.
- Bienvenida opcional desde edge (Resend) con CTA al dashboard.

### Etapa 2: Publicación y lectura de oportunidades [✅]
- Oportunidades pasan a `disponible` cuando el prestatario acepta; RPC `get_opportunity_details_with_funding` devuelve fondeo confirmado.
- RLS abierta de lectura para oportunidades públicas; filtros por estado/solicitud.

### Etapa 3: Reserva y pago [✅]
- RPC `create_investment_intent(opportunity_id, amount)` valida cupo (monto pendiente) y crea:
  - `payment_intents` (status `pending`, `expires_at` +48h, `expected_amount`, `reference_code`, `payment_channel`).
  - `inversiones` ligadas con status `pendiente_pago`.
- Bucket privado `comprobantes-pagos` para recibos.
- Edge `expire-payment-intents` + `pg_cron` cada 15 min ejecutan `expire_payment_intents_sql` para liberar cupo.

### Etapa 4: Conciliación y fondeo [✅]
- Panel `/admin/operaciones` (solo admin/analista) usa RPC `mark_payment_intent_paid` para:
  - marcar intent `paid`, setear inversión `pagado`, recálculo de fondeo y estado de oportunidad (`fondeada` si cumple 100%).
  - insertar notificación in-app al inversionista.
- Botón “Expirar” disponible para liberar cupo manualmente (usa RPC de expiración).

### Etapa 5: Cobranza y retornos [🚧]
- Tabla `borrower_payment_intents` almacena cuotas de prestatario (pending/paid/expired/mora) con recibo opcional.
- RPC `process_borrower_payment` marca cuota pagada, descuenta comisión 1% y crea `payouts_inversionistas` en `pending` por inversionista.
- RPC `mark_payout_paid` marca pago a inversionista y notifica.
- Pendiente: automatizar generación de `borrower_payment_intents` desde el cronograma, y mostrar en el portafolio del inversionista.

### Mejores prácticas / pendientes clave
- Sustituir datos dummy de QR/transferencia por los definitivos del banco.
- Agregar emails opcionales (Resend) al marcar pago/payout, respetando cuota gratuita.
- Auditoría: logs de conciliación en `notifications`/`movimientos` si se habilita ledger.
- Endurecer límites por usuario (monto máximo por oportunidad) y antifraude básico.
