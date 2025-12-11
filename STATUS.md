## Actualización 2025-12-10

**Lo hecho hoy:**
- Corregí en Supabase el cronograma de la oportunidad 61 usando el `paid_at` real (2025-12-04); la primera cuota quedó en 2026-01-05 y se regeneraron las filas en `amortizaciones`.
- Mejoras UI (pendientes de despliegue): botón de “Subir comprobante” movido a “Tu próxima cuota”, zoom/lightbox del QR del prestatario y scroll/cache persistente para reducir parpadeos.
- Layout persistente para rutas del prestatario (`/borrower-dashboard` y `/perfil`) para mantener estado y posición al navegar.
- Portafolio inversionista: bloque “Próximas cuotas (tu parte)” prorrateado con fuente única (RPC `get_investor_installments`, usa `borrower_payment_intents.expected_amount` + neto 1%); cronograma inversionista y prestatario ahora deben coincidir.
- Ops/Payouts: totales por oportunidad, total general, filtro “solo pendientes”, banco/CTA del inversionista, export CSV y badges de estado; notificación al inversionista al crear payout pending y al pagarlo.
- Ledger y contabilidad: tabla `movimientos` registra cobro prestatario, comisión 1%, payout inversionista y comisión de originación; Admin Dashboard muestra resumen mensual (cobros, payouts, comisión, originación, EBITDA aprox.) con export CSV.

**Pendientes:**
- Desplegar a Vercel los cambios de UI/scroll/QR y validar en producción que el panel no parpadea y que la carga/scroll se conserva.
- Confirmar en Ops y panel prestatario que la oportunidad 61 muestra primera cuota 2026-01-05 y siguientes en el cronograma.
- Aplicar migraciones (repair/push) para activar RPCs y ledger en Supabase (`get_investor_installments` alineado a borrower intents) y revalidar cuotas (523,95) en panel inversionista.
- Checks de consistencia (prioridad plan “Fuente Única”): cuota prestatario = suma de prorrata/inversionistas, bruto–neto = originación, payouts pending = movimientos pending.
- QA E2E post-push: op 61 en vitrina como fondeada/activa, cronograma prestatario e inversionista con misma cuota, Ops payouts con banco/CTA y CSV, notifs pending/paid, Admin EBITDA mostrando originación.
- Opcional: notifs email para payout pending/paid y conciliación semi-automática (match CSV).

## Actualización 2025-12-09

**Lo hecho hoy:**
- Implementé la capacidad del prestatario para subir comprobantes asociados a cada cuota desde el cronograma (botón, input oculto, recarga de intents y mensajes de éxito/error).
- Ajusté la lógica del componente para evitar 403 (se reutiliza el `user_id` correcto) y se mantienen las referencias a inputs mientras se sube un archivo.
- No pude hacer el deploy a Vercel hoy; lo completaré mañana antes de cerrar el flujo.

**Pendientes para mañana:**
- Validar en el entorno conectado a Supabase que el borrower visualiza el botón y puede subir el comprobante sin errores 403 y que el mensaje confirma el recibo.
- Confirmar que Operaciones ve el `receipt_url` actualizado y que el RPC `process_borrower_payment` puede marcar la cuota como pagada.
- Ejecutar el deploy pendiente (git pull, `npm run build`, `npx vercel --prod`) una vez que el flujo de comprobantes esté completamente probado.

## Actualización 2025-12-03

**Lo hecho hoy:**
- Desembolso dirigido: auto-creación de `desembolsos` al fondear 100% y visibilidad en Operaciones; contrato PDF y notifs listos al registrar pago dirigido.
- Marketplace: oportunidades fondeadas en modo vitrina (gris + cinta diagonal “FONDEADA”) y listado solo de aceptadas (`solicitudes.estado = prestatario_acepto`).
- UX pago intents: “Marcar pagado” deshabilita de inmediato y evita badge falso de comprobante nuevo.
- Desembolso UI: comprobante se sube y persiste al instante; contrato se genera automáticamente al registrar el pago dirigido; tooltip y orden de pestañas ajustados.
- Policies/bucket: bucket `contratos` creado con policy de lectura; policies simplificadas para `borrower_payment_intents` (lectura/escritura `authenticated`) para evitar 403 al registrar pago dirigido.

**Bug crítico resuelto (desembolsos no visibles):**
- Síntoma: pestaña “Desembolso dirigido” vacía pese a existir desembolso; botones inoperantes.
- Causa: RLS de `desembolsos` pedía rol `authenticated`, pero sesión en Ops estaba `anon` y la fila se creó antes de las policies/auto-creación.
- Fix: policies `ops_read_desembolsos` y `ops_update_desembolsos` para `authenticated`, re-login en Ops y recrear fila pendiente (o auto-creación al fondear). Confirmado con `db push` aplicado.

## Actualización 2025-12-02

**Lo hecho hoy:**
- Inversionista: notificación inmediata al subir comprobante (sin abrir menú); badge y banner “Pago en revisión” en detalle y portafolio; refresco automático de campana.
- Operaciones: badge “Nuevo comprobante” con timestamp y reseteo al abrir; `updated_at` se actualiza al subir recibo.
- Correo OPS: template de alerta de comprobante/pago con brand (header azul, CTA panel Operaciones).
- Admin: KPIs de oportunidades fondeadas (mes/total) en panel CEO.
- Analista de riesgo: lista compacta (más leads visibles), filtros mutuamente excluyentes; se muestran pre-aprobados aunque no tengan docs.

**Pendientes mañana:**
- Verificar en prod la vista analista con el lead real #216 (checklist/documents) y el cambio de filtros.
- Confirmar que el correo OPS usa el template nuevo en producción (edge `payment-intent-alert` desplegada).
- QA rápido post-build (investor notif + badge Ops + KPIs admin). 

## Actualización 2025-12-01

**Lo hecho hoy:**
- Calculadora inversionista: ajustada tabla de “Escenarios de retorno” para móviles (layout fijo sin desbordes) y agregado tooltip en “Ganancia adicional” que muestra cuánto sería el extra si reinvierte mensualmente.
- Revertido el experimento de doble columna/reinversión y restaurado el diseño original de la tabla y el correo de proyección (una sola columna de “Tu Préstamo” y ganancia estándar).
- Inversionista/Operaciones:
  - Validación de monto con formato es-BO (punto miles/coma o punto decimales) y mensajes de error del RPC mostrados tal cual.
  - RPC `create_investment_intent` endurecido (requiere sesión, limpia cupo por pagados, reference_code fijo).
  - Botón “Reabrir (sin pagos)” en Operaciones + RPC `reopen_opportunity_if_unfunded` para evitar que oportunidades queden ocultas por estados erróneos; auto-refresh y botón “Refrescar”.
  - Comprobantes: policies de storage/notifications y update de `receipt_url`; panel Operaciones ahora firma URLs del bucket privado y ya muestra el comprobante subido.
  - Notificación in-app al subir comprobante con banner destacado; secretos configurados para alertas (resend) con OPS_ALERT_TO/CC y función `payment-intent-alert` desplegada.
  - Estilos de botones en marketplace alineados al brand (primario/acento).

**Pendientes:**
- Probar en web móvil/desktop el tooltip y el ajuste de tabla.
- Desplegar a Vercel cuando se valide.
- Probar mañana el flujo inversionista end-to-end con sesión vigente: crear reserva, subir comprobante, ver notificación (campana), verificar link de comprobante en Operaciones y alertas a OPS.

## Actualización 2025-11-27

**Lo hecho hoy:**
- Inversionista: reserva permite “Cambiar monto” (cancela intent pendiente y crea otra), descarga de QR y zoom modal, validación de comprobantes (PDF/JPG/PNG/WebP <=5MB).
- Notificaciones: badge con conteo, CTA de reserva lleva al detalle; RLS activadas en notifications/payment_intents/payouts_inversionistas/borrower_payment_intents/movimientos/desembolsos/cuentas_bancarias_inversionistas con lectura admin.
- Portafolio: CTA “Pagar ahora” en pendientes; KPI total invertido sólo suma inversiones pagadas; panel Operaciones muestra nombre/email de inversionista y comprobante si existe.
- Reminder 24h: función `payment-intent-reminder` desplegada, cron agendado, secrets configurados.

**Pendientes / verificar tras RLS:**
- Probar end-to-end UI (detalle, reservas, portafolio, Operaciones) con RLS activo y rol admin para asegurar visibilidad en panel Ops.
- Desplegar a Vercel los cambios recientes (QR, cambiar monto, nombres en Operaciones) si no se ha hecho.
- Revisar sitemap/SEO pendientes y analítica inversionista.

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
## Actualización 2025-12-04

**Lo hecho hoy:**
- Ajustes Operaciones (no desplegados aún): comprobante de pago dirigido se sube y persiste al instante, enlaces firmados para comprobante/contrato, tooltip + ícono de ayuda, pestañas reordenadas y botón de “Marcar pagado” endurecido.
- Backend: migración `20251127_funding_workflow.sql` reaplicada (repair + db push) y `get_contract_payload` ahora usa `coalesce(saldo_deudor_verificado, desembolsos.monto_neto, monto)` para evitar neto 0 en contratos.
- Storage: bucket `contratos` creado y policy de lectura para autenticados; comprobantes siguen en `comprobantes-pagos`.

**Estado/Pendientes:**
- Contrato (opportunity 61) aún muestra neto 0 en PDF porque la función `generate-contract` responde 500 al invocarla; falta depurar logs de la edge y re-invocar con la service key para regenerar el contrato con el neto correcto.
- Verificar que `saldo_deudor_verificado` esté poblado en `oportunidades` (fuente del neto).
- Desplegar front pendiente (Ops UI) y luego regenerar contrato: 
  - `git add src/AdminOperations.jsx`
  - `git commit -m "Persist disbursement receipts, sign URLs, and clarify directed payment flow"`
  - `npm run build`
  - `npx vercel --prod`
- Supabase ya tiene el `db push` aplicado tras `migration repair`; no requiere otro push salvo cambios nuevos.

## Nota 2025-12-05 (fin de día)
- Se desplegó `registrar-decision-final` (ajuste para guardar neto/cuota), pero no se aplicó aún `supabase db push` para la migración `20251127` en esta jornada.
- `generate-contract` sigue devolviendo 500; pendiente repetir `migration repair --status reverted 20251127 && supabase db push` y re-invocar la función para regenerar el contrato con neto/cuota correctos.
## Actualización 2025-12-11

**Lo hecho hoy:**
- Creado el view `fuente_unica_checks` en Supabase (SQL + migración) para resumir cobros, payouts, comisiones y estados pendientes en una sola fuente de verdad.
- Actualizado el `AdminDashboard` para consumir esa vista y mostrar la tabla “Fuente Única” con gap, pendientes y estado OK/Revisar por cuota.
- Verifiqué la UI con `npm run build` (Vite informa el warning de chunks grandes pero completa el build).

**Pendientes:**
- `supabase db push` para llevar la vista a la base real y habilitar las validaciones en producción.
- Desplegar a Vercel para que Ops/CEO vean la nueva sección y confirmar el cron de cuota/cross-checks.
- Revisar el warning de chunks grandes antes del próximo despliegue si sumamos más código pesado.
