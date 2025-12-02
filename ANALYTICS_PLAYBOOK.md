# Playbook de Analítica — Tu Préstamo (Mixpanel)

Filosofía: medir lo esencial para tomar decisiones y crecer sin inflar costos. Taxonomía clara, eventos limpios y propiedades útiles. Todo en este archivo (se integró el addendum).

---

## Plan y alcance
- Plan objetivo: Starter/Free por 3–6 meses; volumen esperado MVP <150k eventos/trim (cabe bien).
- Subir a Growth solo si rebasamos límites sostenidos o necesitamos exportaciones/SSO/retención extendida.
- Session Replay muestreado (bajo) y sin heartbeats por defecto.

## Herramienta y entornos
- Mixpanel Browser SDK con autocapture + Session Replay muestreado.
- Producción únicamente por defecto; en `dev/preview` no se envían eventos.

## Arquitectura técnica (`src/analytics.js`)
- Expuestos: `initMixpanel`, `trackEvent`, `identifyUser`, `setSuperProperties`, `resetMixpanel`.
- Reglas globales: dedup 2s por nombre, batching (`batch_requests`, `batch_size: 20`), Session Replay por muestreo, Active Ping opcional (apagado por defecto, máx 5 pings/sesión).

## Session Replay y Active Ping
- Muestreo recomendado (ajustable por .env): públicos 5% (`VITE_MIXPANEL_REPLAY_PUBLIC_PERCENT`), dashboards 15% (`VITE_MIXPANEL_REPLAY_AUTH_PERCENT`). `record_sessions_percent` siempre en 0; el wrapper decide.
- Active Ping opcional (`VITE_MIXPANEL_ENABLE_ACTIVE_PING=false`): cada 60s, solo pestaña visible + interacción <30s, máx 5 por sesión, compuerta cross-tab. Apagado en rutas públicas.

## UTMs y atribución
- En init se registran `referrer_domain`, `landing_page` y UTMs:
  - First-touch (`register_once`): `utm_first_*`, `first_gclid`, `first_fbclid`.
  - Last-touch (`register`): `utm_last_*`, `last_gclid`, `last_fbclid`.
- Enriquecimiento automático: `Campaign Lead` y `Signed Up` adjuntan UTMs actuales.

## Taxonomía base (Title Case)
- Autenticación: `Signed Up`, `Logged In`, `Logged Out`, `Login Failed`.
- Growth: `Campaign Lead` (con UTMs).
- Prestatario: `Viewed Loan Application Form`, `Started Loan Application`, `Submitted Loan Application` { loan_amount, loan_term }, `Viewed Borrower Dashboard`; docs: `Started Document Upload` / `Successfully Uploaded Document` / `Failed Document Upload` { document_type, error_message }.
- Calculadora pública: `Interacted With Calculator` { input_changed }, `Calculated Loan Result` { result_amount, result_term, monthly_payment }.

## Taxonomía clave — Inversionista (MVP fondeo)
- Descubrimiento: `Viewed Marketplace`; `Viewed Loan Details` { loan_id, loan_amount, remaining_amount, risk, rate }.
- Reserva/pago:
  - `Created Investment Intent` { opportunity_id, amount, payment_channel, expires_at }.
  - `Receipt Uploaded` { opportunity_id, intent_id, expected_amount, intent_status, expires_at, file_type }.
  - `Payment Under Review Shown` { opportunity_id, intent_id, expected_amount, intent_status, expires_at, has_receipt }.
  - `Payment Intent Expired` { opportunity_id, intent_id, expected_amount, intent_status, expires_at } (cliente ve la expiración).
  - `Payment Marked Paid` (cuando Operaciones marque pagado; props: opportunity_id, intent_id, paid_amount, paid_at).
- Notificaciones y navegación: `Notification Clicked` { type, destination, opportunity_id }, `Portfolio Viewed` { investments_count, pending_reviews }.
- Payouts (cuando apliquen): `Payout Received` { opportunity_id, amount, installment_no, status }.

## Higiene de datos
- Meta: 5–15 eventos por sesión. Evitar onChange ruidosos.
- Props comunes: rol (`borrower`/`investor`), dispositivo, `utm_*`, `referrer_domain`.
- Identidad: `identifyUser(user_id, { $email, role, kyc_status })` tras login/registro. `resetMixpanel()` en logout.
- Dedup en wrapper: ventana 2s. Eventos de UI se envían solo una vez por intent/opportunity (respetar guards en componentes).

## Variables de entorno (.env.local)
- `VITE_MIXPANEL_TOKEN=...`
- `VITE_MIXPANEL_REPLAY_PUBLIC_PERCENT=5`
- `VITE_MIXPANEL_REPLAY_AUTH_PERCENT=15`
- `VITE_MIXPANEL_ENABLE_ACTIVE_PING=false`
- `VITE_MIXPANEL_ACTIVE_PING_INTERVAL_MS=60000`
- `VITE_MIXPANEL_ACTIVE_PING_MAX=5`

## Gobernanza y escalamiento
- Revisar cuota mensual de eventos/replays antes de subir muestreo.
- Si se requieren exports/SSO/retención extendida → evaluar Growth.

## Qué estamos trackeando hoy (MVP inversionista)
- Vistas: `Viewed Marketplace`, `Viewed Loan Details`.
- Reserva: `Created Investment Intent`.
- Comprobante: `Receipt Uploaded`, `Payment Under Review Shown`, `Payment Intent Expired` (cliente).
- Notifs: insert en DB + `Notification Clicked` (UI).
- Pendiente a añadir cuando esté en back: `Payment Marked Paid`, `Payout Received`.

