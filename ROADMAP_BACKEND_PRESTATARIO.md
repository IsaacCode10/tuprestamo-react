# Roadmap de Backend del Prestatario (MVP actual)

Flujo server-side desde la solicitud hasta el pago mensual y comprobantes. Leyenda: `[✅ Completado]` `[🚧 En Progreso]` `[❌ Pendiente]`.

---

### Etapa 1: Solicitud y decisión inicial [✅]
- Insert en `solicitudes` vía `LoanRequestForm.jsx` con consentimiento buró.
- Trigger → edge `handle-new-solicitud`: scorecard, perfil de riesgo, cálculo preliminar, creación de `oportunidad` provisional y cuenta Auth.
- Actualiza `solicitudes` a `pre-aprobado` o `rechazado` y envía correo de bienvenida/estado.

### Etapa 2: Activación y documentos [✅]
- Magic link/activación de contraseña.
- Documentos se almacenan y el estado se refleja en `BorrowerDashboard.jsx`. IA/auto-parse pendiente.

### Etapa 3: Síntesis y propuesta final [🚧]
- Función `sintetizar-perfil-riesgo` pendiente de automatizar; hoy revisión manual en Scorecard.
- Analista registra `saldo_deudor_verificado`, calcula monto bruto (incluye originación mínima 450), tasa y plazo; guarda en `decisiones_de_riesgo`, `oportunidades` y `solicitudes`.
- Edge/envío de correo de propuesta final; dashboard muestra transparencia (incluye comisión de originación bajo Costos Únicos al Desembolso).

### Etapa 4: Publicación y fondeo [✅]
- Al aceptar la propuesta, la `oportunidad` pasa a `disponible` y se publica en el marketplace inversionista.
- El monto publicado coincide con el monto aprobado (bruto), evitando discrepancias.

### Etapa 5: Préstamo activo y cobranza [🚧]
- `borrower_payment_intents`: cuotas mensuales con `expected_amount`, `due_date`, `status`, `receipt_url` opcional.
- Operaciones marca pago vía RPC `process_borrower_payment` (puede adjuntar comprobante). Genera `payouts_inversionistas` pendientes descontando 1% comisión servicio.
- Bucket `comprobantes-pagos` guarda recibos (público-no, privado). Notificaciones in-app al registrar pago.
- Pendiente: generación automática del plan de pagos y cron de vencimientos/notificaciones.

### Etapa 6: Payouts a inversionistas y cierre [🚧]
- RPC `mark_payout_paid` permite a Operaciones cargar comprobante y notificar inversionistas.
- Falta: completar UI/portafolio para que prestatario vea histórico de pagos y próximos vencimientos.
