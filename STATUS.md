## Actualización 2025-11-26

**Lo hecho hoy:**
- Portafolio inversionista: `MyInvestmentsList.jsx` ahora muestra cobros/payouts (`payouts_inversionistas`), comprobantes, CTA “Reinvertir”, y un bloque de notificaciones in-app recientes.
- Roadmaps actualizados (front/back, inversionista/prestatario) a estado MVP actual con reservas 48h, panel de operaciones, pagos con comprobante y cron de expiración.
- Mantenemos habilitado el listado/detalle de oportunidades con reserva de 48h, pago y comprobante; panel de Operaciones marca pagos (intents, cuotas prestatario, payouts inversionistas); cron de expiración activo.

**Qué falta revisar/ajustar:**
- Desplegar a Vercel para ver el nuevo portafolio con cobros/notificaciones y CTA de reinversión.
- Marcar notificaciones como leídas desde UI (opcional) y cablear `prefillAmount` al abrir oportunidades para reinvertir.
- Portafolio: aún falta mostrar cronograma y siguientes pagos cuando generemos payouts recurrentes.
- Analítica: instrumentar eventos clave (Viewed Marketplace, Created Intent, Uploaded Receipt, Intent Paid, Payout Received) e `identifyUser` en el front inversionista.
- Retiros siguen ocultos (no MVP).
- SEO/sitelinks: se actualizó `public/sitemap.xml` con `/calculadora` y `/calculadora-inversionista`. Pendiente desplegar a producción y en Search Console re-enviar sitemap + solicitar indexación de ambas URLs para mejorar visibilidad en Google.

**Siguientes pasos sugeridos (mañana):**
1) Probar en prod/staging el nuevo portafolio y CTA reinvertir; ajustar `prefillAmount` en oportunidades si hace falta.
2) Decidir si marcamos notificaciones como leídas al verlas y si añadimos reinversión directa con monto prellenado.
3) (Opcional) Instrumentar eventos de analítica en el flujo inversionista.
4) Planificar UI de pagos recurrentes y cronograma en portafolio cuando estén listos los payouts mensuales.

## Actualización 2025-11-25

**Lo hecho hoy (MVP refinado):**
- Panel prestatario (Propuesta): unificamos diseño con “Mi Solicitud”, mostramos monto neto, bruto, admin/seguro prorrateado fijo, transparencia total, tabla de amortización, tooltips, formateo monetario consistente y estado “Propuesta publicada” (stepper con paso 6).
- Flujo de aceptación: correo branded con logo y resumen (monto bruto/neto, tasa, plazo) y CTA al panel; al aceptar se marca `solicitudes.estado = prestatario_acepto` y `oportunidades.estado = disponible`, se muestra vista publicada.
- Reglas de cálculo: mínimo originación Bs 450 hasta 10k, gross-up por perfil sobre 10k; admin/seguro 0.15% mínimo 10 Bs, prorrateado para mantener cuota fija en UI.
- Documentación: actualizados CORE, Modelo V3, Modelo ingresos GTM y roadmaps; infograma actualizado.
- Panel inversionista (listado): rediseño de cards en grilla con brand kit; filtro de oportunidades para sólo mostrar las aceptadas por el prestatario (`disponible` + `solicitudes.prestatario_acepto`).

**Pendiente clave:**
- Desembolso indirecto: automatizar pago al banco acreedor y estado de préstamo activo tras fondeo.
- Panel inversionista: UI de oportunidades ya filtrada, pero falta pulir detalle/estilos y flujo de fondeo definitivo (intención, conciliación) + RLS acorde.

### Actualización de Estado - 24 de November de 2025

**Contexto:** Se cerró el flujo de aprobación de crédito con trazabilidad completa (analista → propuesta al prestatario → publicación a inversionistas) y se robusteció el panel del analista.

**Logros Clave:**
1.  **Decisión final con registro estándar:** El modal de aprobación/rechazo guarda razones estandarizadas en `decisiones_de_riesgo` (rol analista) y actualiza estados en `solicitudes`, `perfiles_de_riesgo` y `oportunidades`.
2.  **Propuesta al prestatario:** Al aprobar, se envía correo branded (logo, CTA, colores #00445A / #26C2B2) con asunto personalizado, link al panel y detalle de monto/plazo/tasa. El prestatario ve una “Propuesta de Crédito” con Aceptar/Rechazar; al aceptar se publica la oportunidad a inversionistas (`estado=disponible`).
3.  **Score INFOCRED:** Campo obligatorio para score (300–850) y nivel A–H; se persiste en `metricas_evaluacion` y se muestra en el Scorecard Digital.
4.  **Historial del analista:** Nueva vista de historial con últimas decisiones (aprobadas/rechazadas), motivos, perfil y datos básicos de solicitud/oportunidad. Si no hay casos en revisión, el panel muestra el historial.
5.  **UX del panel analista:** Persistencia de scroll/selección, cache de documentos para evitar parpadeos, modal scrollable.
6.  **Emails refinados:** Correo de propuesta con CTA “Ir a mi propuesta”, logo, colores de marca y copy claro; asunto incluye el nombre del cliente.

**Estado Actual:**
* Flujo de aprobación operativo: decisión del analista registra en DB, propuesta al prestatario lista para prueba final, publicación a inversionistas automática tras aceptación.
* Front y edges desplegados (Vercel + Supabase).

**Próximos Pasos:**
1. Probar end-to-end en producción/staging: aprobar un caso, recibir el nuevo correo, ingresar como prestatario y aceptar/rechazar la propuesta.
2. Verificar que al aceptar la propuesta la oportunidad queda visible en el marketplace inversionista con los datos finales.
3. Ajustar si es necesario el copy/CTA del correo tras la prueba real.
