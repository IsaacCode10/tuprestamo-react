# Estado del Proyecto - 26 de Octubre de 2025 (Actualización Noche)

**Misión Cumplida:** Sistema de Monitoreo Proactivo Implementado.

### Resumen Ejecutivo

Como solución a largo plazo para el riesgo de dependencia externa de la API de Google, se ha diseñado, implementado y desplegado una "función guardiana" (`monitor-gemini-model`).

1.  **Funcionalidad:** La Edge Function se ejecuta diariamente y verifica la validez del modelo de IA configurado. 
2.  **Sistema de Alertas:** Si detecta que el modelo ya no es válido, envía automáticamente un correo de alerta a los administradores (`ALERT_EMAIL`).
3.  **Infraestructura como Código:** La programación de la tarea se configuró en `supabase/config.toml`, asegurando que la configuración esté versionada y sea reproducible.
4.  **Documentación:** Se ha documentado la nueva función en su propio `README.md`.

Con esto, el sistema ahora es más resiliente y nos notificará proactivamente de problemas con la API de Gemini antes de que impacten a los usuarios.

### Próximos Pasos

*   Actualizar el manual de `LECCIONES_APRENDIDAS.md`.
*   Subir toda la documentación actualizada a GitHub.

# Estado del Proyecto - 28 de Octubre de 2025

Resumen ejecutivo (flujo INVERSIONISTA: avance y endurecimiento)

- Portafolio MVP (frontend):
  - Agregado `src/MyInvestmentsList.jsx` (lista inversiones del usuario desde `inversiones` + join mínimo con `oportunidades`).
  - Rutas protegidas nuevas: `/mis-inversiones` y `/retiro` en `src/App.jsx` usando `InvestorRoute`.

- Solicitud de retiro (MVP):
  - Agregado `src/WithdrawalForm.jsx` (inserta en `solicitudes` con `tipo_solicitud='retiro'`, registra monto y nota).

- Formulario de interés de inversionista (KYC mínimo y saneo):
  - Endurecido `src/InvestorInterestForm.jsx` con zod: email válido, teléfono solo dígitos (7–12), selección cerrada de 9 departamentos.
  - Cambio de mapeo `ciudad` → `departamento` al insertar en `solicitudes`.
  - Evento analítico: `Submitted Investor Interest`.

- Backend: onboarding automático de inversionistas (sin invitación manual):
  - Extendida `supabase/functions/handle-new-solicitud/index.ts` para manejar `tipo_solicitud='inversionista'`:
    - Genera link de invitación (Auth admin.generateLink type `invite`) con redirect a `/confirmar-y-crear-perfil`.
    - Envía correo de bienvenida vía Resend y marca `solicitudes.estado='contactado'`.
    - Ajustes de entregabilidad: `to: [email]`, `from: contacto@tuprestamobo.com`, adiciona `text` y `reply_to`, y loggea la respuesta (`Resend response (investor)`).

- Despliegue:
  - Redeploy realizado de `handle-new-solicitud` (pendiente prueba de entrega de correo con Resend Activity).

Qué falta / próximos pasos sugeridos (mañana)

- Verificar correo al inversionista:
  - Probar envío real (landing → “Quiero Invertir”), revisar logs `Resend response (investor)` y Resend Activity (deliver/bounce/blocked).
  - Confirmar dominio en Resend (SPF/DKIM) y Suppressions para el destinatario si fuera necesario.

- UI navegación:
  - Agregar CTAs en `src/InvestorDashboard.jsx` a `/mis-inversiones` y `/retiro` (archivo presenta caracteres de encoding; hacer ajuste con cuidado).

- RLS a confirmar:
  - `inversiones (SELECT)` por `investor_id = auth.uid()`.
  - `solicitudes (INSERT)` para inversionistas (con `user_id` si autenticado) y para retiros.

- Roles y perfiles:
  - Evitar seteo de rol desde cliente en `src/Auth.jsx` y mover asignación a function/trigger seguro post‑signup.

URLs útiles

- Portafolio: `/mis-inversiones`
- Retiros: `/retiro`
- Formulario de interés (landing): `/` → “Quiero Invertir”
- Edge Function: `handle-new-solicitud`

---

# Estado del Proyecto - 26 de Octubre de 2025

**Misión Cumplida:** Bug Crítico de Carga de Documentos Solucionado y Documentado.

### Resumen Ejecutivo

Se ha diagnosticado y resuelto exitosamente el bug persistente que impedía la correcta visualización del estado de los documentos en el Dashboard del Prestatario. La solución implicó una depuración profunda que reveló una cadena de tres errores distintos:

1.  **Bug de Estado en el Frontend:** Se corrigió el componente `BorrowerDashboard.jsx` que no actualizaba la lista de documentos en la interfaz.
2.  **Bug de API Externa:** Se actualizó el nombre del modelo de IA en la Edge Function `analizar-documento-v2` para reflejar los cambios en la API de Google Gemini.
3.  **Bug de Permisos (RLS):** Se implementó la política de seguridad (RLS) de `SELECT` faltante en la tabla `documentos`, permitiendo que el frontend pudiera leer los documentos que el propio usuario había subido.

### Documentación Creada

Para capitalizar el conocimiento adquirido y prevenir futuros errores, se ha creado un manual técnico detallado.

*   **Nueva Guía:** `DOCUMENTACION/LECCIONES_APRENDIDAS.md` - Contiene una autopsia completa del bug y la explicación de la arquitectura de permisos "El Círculo de Confianza de Supabase".

### Próximos Pasos

*   **Inmortalizar los Cambios:** Subir el código corregido y la nueva documentación a GitHub.
*   **Discusión Estratégica:** Evaluar la implementación de un sistema de monitoreo proactivo para dependencias externas como la API de Google (ver Propuesta en `LECCIONES_APRENDIDAS.md`).

---

# Estado del Proyecto - 24 de Octubre de 2025 (Actualización Noche)

Asunto: Mixpanel operativo en producción con Autocapture y Session Replay

Resumen: Se completó la migración a Mixpanel y se verificó en producción (tuprestamo.com) la recepción de eventos en Live View, así como la reproducción de sesiones. Se resolvió el bug de inicialización ausente y se protegieron llamadas cuando el SDK no está inicializado.


# Estado del Proyecto - 29 de Octubre de 2025

Resumen ejecutivo (flujo INVERSIONISTA: UX, navegaci�n, legales, branding)

- Email de invitaci�n (Edge Function):
  - Personalizaci�n con NOMBRE en asunto y saludo; cierre �Atentamente, El equipo de Tu Pr�stamo�.
  - Removido el texto de descargo.
  - Se incluye full_name en metadata para que Supabase muestre Display Name correctamente.

- Confirmaci�n y perfil:
  - Ocultamos Header solo en p�ginas de confirmaci�n; branding visible en dashboards.
  - `ConfirmAndSetPassword`: asegura `profiles` (nombre/rol/email) y actualiza metadata (`full_name`).
  - Nuevo perfil de inversionista: `/perfil-inversionista` (tel�fono + cambio de contrase�a). Men� �Mi Perfil� enruta por rol.

- Navegaci�n del inversionista (Header nuevo):
  - Men�s centrados: Invertir ? (Oportunidades, Buscar/Filtrar), Portafolio ? (Mis Inversiones, Retiros + KPIs), Cuenta ? (Verificaci�n de identidad, Centro de Ayuda).
  - Cierre por click fuera, cierre al cambiar de ruta, evita men�s simult�neos; dropdown posicionados bajo cada bot�n.
  - Ocultamos CTA de landing en �rea inversionista.

- P�ginas nuevas y consistencia:
  - Centro de Ayuda inversionista: `/faq-inversionista` (+ evento `Viewed Investor FAQ`).
  - Legales: `/terminos` y `/privacidad` (contenido base, con �Volver al Panel� si rol inversionista/admin).
  - Breadcrumbs + barra �Volver� en Oportunidades, Detalle, Mis Inversiones, Retiros, Verificaci�n y FAQ. Tambi�n en Borrower y Admin.

- Footer y visibilidad:
  - Sticky footer; versi�n completa en �rea inversionista; compactado de espacios; redes en l�nea; enlaces a FAQ/T�rminos/Privacidad.

- Copy y verificaci�n:
  - Sustituimos �Estado KYC� por �Verificaci�n de identidad� y estados: Pendiente / En revisi�n / Requiere revisi�n / Verificada (Header y Dashboard).

- Branding (logo):
  - Logo transparente actualizado (public + src/assets). Header balanceado a 72px desktop / 52px mobile.

- Correcciones:
  - `NotificationBell` con `notifications=[]` para evitar TypeError.
  - `App.jsx`: restaurado `isDashboardPage` y Footer completo en rutas inversionista.
  - Header inversionista solo si hay sesi�n con rol v�lido.
  - Fix de sintaxis en `InvestorDashboard.jsx` (compilaci�n Vercel).

Pr�ximos pasos sugeridos

- Verificaci�n autom�tica del inversionista:
  - Confirmar trigger a `verificar-identidad-inversionista` al insertar en `documentos` (bucket inversionistas).
  - Validar RLS de `documentos`/`inversiones`/`solicitudes` para rol inversionista.

- Marketplace y filtros:
  - Implementar filtros en `/oportunidades` (riesgo, plazo, tasa m�nima) y mantener gating de verificaci�n al invertir.

- Entregabilidad de correos (Resend):
  - Revisar activity/logs de `handle-new-solicitud`; validar SPF/DKIM.

- UX/branding:
  - Considerar SVG del logo para nitidez y �shrink on scroll�.

Notas de despliegue

- Frontend: cambios en `main` desplegados por Vercel.
- Backend (cuando cambie redirect):
  - `supabase secrets set APP_BASE_URL=https://www.tuprestamobo.com`
  - `supabase functions deploy handle-new-solicitud`

---

# Estado del Proyecto - 31 de Octubre de 2025

Resumen ejecutivo (Calculadora Inversionista, Landing CTAs y pulido UX)

- Calculadora del Inversionista (MVP listo para captación):
  - Plazos restringidos a 12/18/24 meses (en línea con el modelo de negocio).
  - Selector DPF con tasas actuales: 3.0%, 3.5% y 4.0%.
  - Tres escenarios de retorno Tu Préstamo: 10%, 12% y 15% anual.
  - Layout en dos columnas (inputs a la izquierda, resultados a la derecha), consistente con la Calculadora de Ahorro.
  - Bloque comparativo “versus” (Nuestra mejor tasa vs promedio vs DPF) inspirado en referencia visual; resalta montos finales.
  - Sección “Diferencias clave” con flujo y liquidez; fila “Trámite” reemplaza “Horizonte del MVP” (100% en línea vs presencial en banco).
  - Textos corregidos (acentos y mojibake) y CTA centrados; botón del modal “Ver mi Proyección” corregido.

- Landing – CTAs por segmento:
  - Inversionistas: orden dinámico según sesión/estado verificación (no logueado/no verificado → Calculadora primero; verificado → Ver Oportunidades primero). Archivo: `src/components/Inversionistas.jsx`.
  - Prestatarios: copy con acentos corregidos y botón “Calculadora de Ahorro” añadido debajo de “Completa tu Solicitud”. Archivo: `src/components/Prestatarios.jsx`.

- Estilos y navegación:
  - Hoja dedicada `src/InvestorCalculator.css` para mantener consistencia visual con la calculadora de ahorro.
  - Menú Header incluye acceso a `/calculadora-inversionista` (verificado en producción).

- Despliegue:
  - Cambios empujados a `main` y desplegados en Vercel. Usar recarga dura o `?v=<ts>` para evitar caché.

Dónde nos quedamos / Próximos pasos (mañana)

1) Versus: añadir tercera fila “Ganancia adicional vs DPF” (destacar el diferencial en Bs).
2) Ruido de consola anónimo: silenciar 403/406 en `src/hooks/useProfile.js` cuando no hay sesión.
3) Leads: throttle anti‑spam en `save-investor-lead` (cooldown por email/IP) y confirmar secretos (RESEND_API_KEY, APP_BASE_URL, SUPABASE_SERVICE_ROLE_KEY).
4) Analítica: enriquecer eventos de Mixpanel con `{ amount, term_months, dpf_rate, projected_gain }` en `Calculator_Lead_Submitted`.
5) UI: pulir espaciados/contrastes de la tabla “versus” para máxima legibilidad en mobile.
6) QA: probar E2E lead → email de proyección (Resend Activity) → registro → dashboard verificado.

# Estado del Proyecto - 30 de Octubre de 2025

Resumen ejecutivo (móvil, KYC inversor, notificaciones y DX de despliegue)

- Header móvil (MVP world‑class):
  - Se reemplazó navegación horizontal por botón hamburguesa + overlay de menú vertical. En desktop no cambia.
  - Se corrigieron textos con acentos (mojibake) y se implementó chevrón por CSS.
  - Se movió la campana de notificaciones al menú de usuario; se añadió indicador rojo en “Hola, <Nombre>” cuando hay no leídas.

- Notificaciones end‑to‑end (MVP):
  - Tabla public.notifications con RLS; Edge Function create-notification (in‑app + email via Resend).
  - erificar-identidad-inversionista ahora emite notificación al finalizar (aprobado o requiere revisión).
  - Frontend: carga real al abrir el menú, contador, realtime (INSERT), y “marcar todas como leídas”.

- KYC Inversor – verificación automática:
  - Edge Function robustecida: URL firmada; compatibilidad GEMINI_API_KEY/GOOGLE_GEMINI_API_KEY.
  - Bucket unificado: documentos-prestatarios para evitar pasos manuales.
  - Frontend InvestorVerification.jsx reescrito: subida inmediata del CI, autosave con debounce a erification_drafts (servidor) y localStorage, restaura borrador, envío idempotente y limpieza de borrador.

- DX de despliegue:
  - ercel.json: Cache-Control: no-store para / e index.html, evitando cache del app shell y permitiendo ver cambios de inmediato.
  - Ajustes de rutas: /perfil-inversionista incluido en área inversionista para mostrar el header correcto.

Cambios en archivos (principales)

- src/components/Header.jsx y Header.css: menú móvil, chevrón CSS, indicador de no leídas y fixes de acentos.
- supabase/functions/create-notification/index.ts: nueva función.
- supabase/functions/verificar-identidad-inversionista/index.ts: notifica al usuario tras actualizar estado.
- supabase/sql/notifications.sql: tabla y RLS de notificaciones.
- src/InvestorVerification.jsx: autosave + upload inmediato + restauración.
- ercel.json: no‑store de HTML.

Despliegues/secretos

- Edge Functions a desplegar (si no se hizo aún):
  - supabase functions deploy create-notification
  - supabase functions deploy verificar-identidad-inversionista
- Secrets (opcional email): RESEND_API_KEY
- Recarga de esquema PostgREST tras cambios de esquema/policies: select pg_notify('pgrst','reload schema');

Bug pendiente (bloqueante para KYC)

- Error: “Could not find the 'numero_ci' column of 'profiles' in the schema cache”.
  - Estado: persiste al enviar el formulario de Verificación.
  - Causa probable: PostgREST no ve la columna nueva o RLS bloquea el UPDATE.
  - Acciones realizadas: se sugirió crear public.profiles.numero_ci y recargar esquema; se sugirieron policies RLS mínimas.
  - Plan de mañana:
    1) Verificar la columna en DB: select numero_ci from public.profiles limit 1; (sin error).
    2) Recargar PostgREST: select pg_notify('pgrst','reload schema'); o Settings → API → Reload/Restart.
    3) Confirmar RLS:
       - profiles: UPDATE self (policy profiles_update_self).
       - documentos: INSERT/SELECT self (policies documentos_insert_own, documentos_select_own).
    4) Reprobar envío desde la app; verificar inserción en public.documentos y logs en erificar-identidad-inversionista.

Notas rápidas

- El input de archivo nunca puede “recordarse” por seguridad; por eso se resolvió con subida inmediata y guardado del path.
- Si el preview de Vercel no refleja cambios, usar el dominio de Producción (con vercel.json ya sin cache) o ?v=<commit>.
