# Roadmap de Frontend del Prestatario (MVP actual)

Describe el recorrido visible en la UI, desde el landing hasta el pago mensual con QR, alineado a transparencia total. Leyenda: `[✅ Completado]` `[🚧 En Progreso]` `[❌ Pendiente]`.

---

### Etapa 1: Descubrimiento y Solicitud [✅]
- **Landing + simulador**: calculadora pública y CTA a solicitar.
- **Formulario inicial (`LoanRequestForm.jsx`)**: datos básicos + consentimiento buró.

### Etapa 2: Activación de cuenta [✅]
- **Correo de bienvenida** con enlace a elegir contraseña.
- **`BorrowerActivateAccount.jsx`** para setear contraseña y entrar al panel.

### Etapa 3: Dashboard de conversión y documentos [✅]
- **`BorrowerDashboard.jsx`** muestra cuota estimada y ahorro potencial (sobre monto estimado) con disclaimer: “La cuota final se define al confirmar tu saldo deudor”.
- CTA a **cargar documentos** requeridos; estado de pendientes/OK.

### Etapa 4: Oferta final y publicación [✅]
- Estado **En revisión** hasta que riesgo valida documentos.
- Vista de **propuesta** con monto bruto (incluye originación), neto a banco, tasa, plazo, admin+seguro, tabla de amortización y transparencia total.
- CTA **Aceptar** → la oportunidad pasa a `disponible` para inversionistas; el prestatario ve “Publicada”.
- Se muestra **comisión de originación** destacada bajo “Costos Únicos al Desembolso”.

### Etapa 5: Préstamo activo y pagos mensuales [🚧]
- Al fondearse, el panel debe cambiar a **Préstamo Activo** y mostrar plan de pagos.
- **QR mensual en el panel**: generar y mostrar QR / datos de pago cada mes (hoy manual). Texto claro de fecha límite y monto.
- **Subida de comprobante**: el prestatario puede subir evidencia de pago mensual (bucket privado).
- Estado de cuota: pendiente/pagada/mora. Notificación in-app al registrar pago.

### Etapa 6: Experiencia continua [🚧]
- Historial de pagos y próximos vencimientos en cards compactas.
- Alertas in-app y, si aplica, email/SMS recordatorio (cuidar quota de Resend).
- Botón de soporte / ayuda contextual para pagos.
