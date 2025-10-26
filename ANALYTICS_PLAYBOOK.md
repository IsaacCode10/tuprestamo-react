# Playbook de Analítica de Producto — TU PRESTAMO (Mixpanel)

Filosofía: medimos lo esencial para tomar decisiones y crecer, sin inflar costos. Mantener una taxonomía clara, eventos limpios y propiedades útiles.

---

### Herramienta
- Mixpanel Browser SDK con autocapture y Session Replay muestreado.
- Producción únicamente por defecto. En `dev/preview` no se envían eventos.

### Arquitectura Técnica
- Servicio central: `src/analytics.js` expone `initMixpanel`, `trackEvent`, `identifyUser`, `setSuperProperties`.
- Reglas globales en el wrapper:
  - Deduplicación de eventos por nombre en ventana de 2s.
  - Batching activo (`batch_requests`, `batch_size: 20`).
  - Session Replay muestreado por ruta (públicas vs dashboards).
  - Active Ping opcional (apagado por defecto) con límites estrictos.

### UTMs y Atribución
- En init: se registran `referrer_domain`, `landing_page` y UTMs con dos modalidades:
  - First-touch: `utm_first_*`, `first_gclid`, `first_fbclid` (via `register_once`).
  - Last-touch: `utm_last_*`, `last_gclid`, `last_fbclid` (via `register`).
- Enriquecimiento automático de eventos clave: `Campaign Lead` y `Signed Up` adjuntan UTMs actuales.
- Buenas prácticas: mantener lista corta y consistente de `utm_source` y nombres de campaña.

### Session Replay y Costos
- Muestreo recomendado (ajustable por .env):
  - Públicos: 5% (`VITE_MIXPANEL_REPLAY_PUBLIC_PERCENT`).
  - Dashboards autenticados: 15% (`VITE_MIXPANEL_REPLAY_AUTH_PERCENT`).
- Active Ping (opcional): medir “tiempo activo” real cada 60s solo con pestaña visible e interacción reciente, máximo 5 pings/sesión. Apagado por defecto (`VITE_MIXPANEL_ENABLE_ACTIVE_PING=false`).

### Taxonomía de Eventos (Title Case)
- Autenticación: `Signed Up`, `Logged In`, `Logged Out`, `Login Failed`.
- Growth: `Campaign Lead` (con UTMs).
- Prestatario:
  - `Viewed Loan Application Form`
  - `Started Loan Application`
  - `Submitted Loan Application` { loan_amount, loan_term }
  - `Viewed Borrower Dashboard`
  - Documentos: `Started Document Upload`, `Successfully Uploaded Document`, `Failed Document Upload` { document_type, error_message }
- Inversionista:
  - `Viewed Marketplace`
  - `Viewed Loan Details` { loan_id, loan_amount }
  - `Completed Investment` { investment_amount, loan_id }
- Calculadora (pública):
  - `Interacted With Calculator` { input_changed }
  - `Calculated Loan Result` { result_amount, result_term, monthly_payment }

### Higiene de Datos
- Meta: 5–15 eventos por sesión. Evitar ruido de formularios `onChange` salvo acciones clave.
- Propiedades comunes: rol (`borrower`/`investor`), dispositivo, `utm_*`, `referrer_domain`.
- Identidad: `identifyUser(user_id, { $email, role })` tras login/registro.
- Reset en logout: `resetMixpanel()` limpia superprops y sesión.

### Variables de Entorno útiles (.env.local)
- `VITE_MIXPANEL_TOKEN=...`
- `VITE_MIXPANEL_REPLAY_PUBLIC_PERCENT=5`
- `VITE_MIXPANEL_REPLAY_AUTH_PERCENT=15`
- `VITE_MIXPANEL_ENABLE_ACTIVE_PING=false`
- `VITE_MIXPANEL_ACTIVE_PING_INTERVAL_MS=60000`
- `VITE_MIXPANEL_ACTIVE_PING_MAX=5`

### Escalamiento de Plan
- Empezar con Starter/Free: volumen estimado del MVP (<150k eventos/trim) cabe bien.
- Subir a Growth si: superas límites del free de forma sostenida, requieres retención extendida/exports/Groups/SSO, o crece el equipo y la gobernanza.

