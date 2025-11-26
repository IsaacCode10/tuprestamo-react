# Roadmap de Frontend del Inversionista (MVP actual)

Recorre el journey desde el landing hasta el cobro de retornos, priorizando conversión y claridad. Usa la leyenda: `[✅ Completado]` `[🚧 En Progreso]` `[❌ Pendiente]`.

---

### Etapa 1: Registro y Verificación [✅]
- **Landing → Registro**: alta self-service (rol inversionista) con Supabase Auth.
- **Activación**: email de verificación y redirección al dashboard.
- **Onboarding ligero**: banner “Completa tu perfil” (datos básicos + cuenta de abono); aceptación de TyC y riesgo en-modal.

### Etapa 2: Explorar y Reservar [✅]
- **Marketplace (`Opportunities.jsx`)**: grilla responsive con riesgo (A/B/C), monto bruto, tasa BRUTA, plazo, cupo restante y barra de fondeo. Filtros por rendimiento/plazo, selección actual visible.
- **Detalle (`OpportunityDetail.jsx`)**: layout 2 columnas (detalles + reserva). Beneficios en una línea: pagos mensuales capital+interés, reinversión, comisión 1% sobre pago cobrado (tooltip en rend. neto). Reserva con CTA “Invertir ahora”.
- **Reserva 48h**: invoca RPC `create_investment_intent` (valida cupo); crea inversión `pendiente_pago` + intent con expiración. Countdown y botón renovar. No se muestra “retiro”.
- **Pago y comprobante**: en la misma vista se selecciona medio (QR/Transferencia), se muestra QR/CTA descargar o datos bancarios, y se sube comprobante (bucket privado `comprobantes-pagos`).

### Etapa 3: Conciliación y Estado de la Oportunidad [✅]
- **Expiración automática**: cron 15 min libera cupo de intents vencidos.
- **Confirmación Ops**: cuando Operaciones marca pagado, la inversión pasa a `pagado`, se recalcula fondeo y la oportunidad salta a `fondeada` si se llenó. Notificación in-app al inversionista.
- **Renew/UX**: si expira, CTA “Renovar reserva” crea nuevo intent sin perder contexto.

### Etapa 4: Portafolio y Retornos [🚧]
- **Portafolio**: `MyInvestmentsList.jsx` debe listar inversiones, estado del pago inicial, progreso de fondeo y pagos recibidos. (Pendiente conectar payouts distribuidos).
- **Notificaciones in-app**: mostrar avisos por intent pagado, expirado y payout acreditado.
- **Reinversión**: CTA a oportunidades desde cada cobro (pendiente de wiring).
- **Retiros**: flujo de retiros está oculto; definir UI cuando habilitemos custodia/abono en cuenta.

### Etapa 5: Analítica y Conversión [🚧]
- Eventos sugeridos: `Viewed Marketplace`, `Applied Filters`, `Viewed Opportunity Detail`, `Created Investment Intent`, `Uploaded Receipt`, `Intent Paid`, `Payout Received`.
- Identidad: `identifyUser` tras login con rol inversionista y estado de verificación.
