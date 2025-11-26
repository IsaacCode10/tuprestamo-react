# Roadmap General del Inversionista (MVP actualizado)

Flujo completo desde que llega del landing hasta que cobra retornos, con reservas de 48h, pagos mensuales y conciliación manual/semiautomática.

**Leyenda:** `[✅ Completado]` `[🚧 En Progreso]` `[❌ Pendiente]`

---

### Fase 1: Llegada y Alta de Cuenta `[🚧 En Progreso]`
1. **Landing → Formulario:** El usuario se registra desde el landing con rol inversionista (onboarding self-service).  
2. **Auth + Profile:** Se crea cuenta en Supabase Auth, registro en `profiles` con rol inversionista y estado KYC `no_iniciado`.  
3. **KYC:** El inversionista sube CI y datos bancarios (`InvestorVerification.jsx`), edge `verificar-identidad-inversionista` actualiza `estado_verificacion`.  
4. **Bienvenida:** Notificación/email de bienvenida (opcional) con CTA al dashboard.

### Fase 2: Explorar y Reservar `[✅ Completado]`
1. **Dashboard/Marketplace:** `Opportunities.jsx` lista oportunidades `disponible` (prestatario aceptó). Cards en grilla con rendimiento bruto/neta, plazo, cupo restante y barra de fondeo.  
2. **Detalle:** `OpportunityDetail.jsx` muestra resumen, beneficios (pagos mensuales, reinversión, comisión 1%), medios de pago.  
3. **Reserva (48h):** RPC `create_investment_intent` valida cupo, crea `payment_intent` + `inversion` `pendiente_pago`. Countdown 48h, botón renovar si expira.  
4. **Pago y comprobante:** El inversionista paga (QR/transferencia) y sube comprobante (bucket privado `comprobantes-pagos`). Sección de pago en la misma vista.

### Fase 3: Conciliación y Fondeo `[🚧 En Progreso]`
1. **Expiración automática:** Cron cada 15 min marca `payment_intents` vencidos como `expired` y libera cupo.  
2. **Conciliación manual (Operaciones):** `/admin/operaciones` pestaña intents; “Marcar pagado” usa RPC `mark_payment_intent_paid` → `inversion`=`pagado`, recálculo fondeo, oportunidad pasa a `fondeada` si se llena.  
3. **Notificación in-app:** Se inserta en `notifications` al marcar pagado.  
4. **Payout inicial:** (Pendiente) Al fondear, generar orden de desembolso dirigido al banco del prestatario (manual hoy).

### Fase 4: Cobranza y Retornos `[🚧 En Progreso]`
1. **Cuotas prestatario:** `borrower_payment_intents` (pending/paid/expired/mora). Operaciones marca pagado (RPC `process_borrower_payment`) con comprobante.  
2. **Generación de payouts:** `process_borrower_payment` crea `payouts_inversionistas` pending, distribuyendo el pago (capital+interés) menos 1% servicio.  
3. **Pago a inversionistas:** Operaciones marca payout `paid` (RPC `mark_payout_paid`) con comprobante; notificación in-app al inversionista.  
4. **Portafolio:** `MyInvestmentsList.jsx` muestra inversiones y estado; pendiente mostrar cronograma y pagos recibidos.  
5. **Retiros:** (Pendiente) Flujo de retiros formal; el botón fue removido del front actual.

### Pendientes clave para salida pública
- Añadir emails/alerts (opcional) usando Brand Kit en `create-notification` si se requiere.  
- Reemplazar QR/datos de transferencia con datos reales del banco.  
- Mostrar pagos recibidos/payouts en el portafolio.  
- Automatizar generación de cuotas y payouts desde el plan de pagos.  
- Asegurar RLS/roles en `/admin/operaciones` (solo admin/analista).  
