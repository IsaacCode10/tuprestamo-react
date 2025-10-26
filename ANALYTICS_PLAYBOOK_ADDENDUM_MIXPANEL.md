**Mixpanel (MVP) - Plan y Frecuencia**
- Plan recomendado: Starter/Free por 3–6 meses; volumen esperado (<150k eventos/trim) cabe bien.
- Session Replay: mantener con muestreo bajo; 10–20% en dashboards autenticados, 5–10% en páginas públicas.
- Sin heartbeats por defecto: confiar en autocapture y eventos clave de funnel.
- Subir a Growth solo si rebasamos límites, necesitamos exportación DWH/Groups/SSO o MTU alto.

**Frecuencia de Sesiones**
- Base (costo-efectiva): sin “heartbeats”. Usar:
  - Autocapture (pageviews, clics relevantes).
  - Eventos explícitos en pasos críticos (auth, leads, KYC, inversión).
  - Session Replay con muestreo para estimar engagement.
- Opcional: Active Ping cada 60s solo en dashboards, con salvaguardas:
  - Solo si la pestaña está visible y hubo interacción en últimos 30s.
  - Máximo 5 pings por sesión y 1 por intervalo global (anti duplicados entre pestañas).
  - Desactivado en páginas públicas.

**Higiene de Eventos (MVP)**
- 5–15 eventos por sesión. Priorizar auth, funnels, calculadora (con resultados), lead submit, KYC start/finish, inversión/deposito.
- Deduplicar clics repetidos (<2s). Evitar `onChange` ruidosos de formularios.
- Identidad: `identify(user_id)` tras login; registrar super props (`role`, plan, device, `utm_*`).
- Entornos: solo producir en `production`. En `dev/preview` no inicializar o usar token distinto con muestreo 0%.
- Batching SDK: `batch_requests: true`, `batch_size: 10–20`.

**Señales para subir de plan**
- Rebasar consistentemente límites de Starter/Free (MTU/eventos/replays) o requerir retención prolongada/exportación.
- Equipo/seguridad: control de permisos, espacios, SSO.

**Términos clave (glosario)**
- Ajustar wrapper de `trackEvent`: crear una función intermedia que centraliza cada `mixpanel.track()`, aplicando reglas como deduplicación (evita spam), enriquecimiento de propiedades comunes y batching. Permite cambiar de proveedor sin tocar todos los componentes.
- Active Ping: evento periódico (p.ej. cada 60s) que se envía solo cuando el usuario está activo (pestaña visible + interacción reciente). Sirve para estimar “tiempo activo” sin inflar excesivamente el conteo de eventos. Siempre con límites por sesión y apagado por defecto.

**UTM como Superprops**
- El init registra `referrer_domain` y `landing_page` siempre, y UTMs en modo:
  - First-touch: `utm_first_*`, `first_gclid`, `first_fbclid` vía `register_once`.
  - Last-touch: `utm_last_*`, `last_gclid`, `last_fbclid` vía `register`.
- Auto-enriquecimiento de eventos: `Campaign Lead` y `Signed Up` adjuntan automáticamente UTMs actuales (incluye first/last) sin tocar los componentes.

**Variables útiles (.env.local)**
- `VITE_MIXPANEL_REPLAY_PUBLIC_PERCENT=5`
- `VITE_MIXPANEL_REPLAY_AUTH_PERCENT=15`
- `VITE_MIXPANEL_ENABLE_ACTIVE_PING=false`
- `VITE_MIXPANEL_ACTIVE_PING_INTERVAL_MS=60000`
- `VITE_MIXPANEL_ACTIVE_PING_MAX=5`
