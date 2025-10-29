# Estado del Proyecto - 26 de Octubre de 2025 (Actualizaci√≥n Noche)

**Misi√≥n Cumplida:** Sistema de Monitoreo Proactivo Implementado.

### Resumen Ejecutivo

Como soluci√≥n a largo plazo para el riesgo de dependencia externa de la API de Google, se ha dise√±ado, implementado y desplegado una "funci√≥n guardiana" (`monitor-gemini-model`).

1.  **Funcionalidad:** La Edge Function se ejecuta diariamente y verifica la validez del modelo de IA configurado. 
2.  **Sistema de Alertas:** Si detecta que el modelo ya no es v√°lido, env√≠a autom√°ticamente un correo de alerta a los administradores (`ALERT_EMAIL`).
3.  **Infraestructura como C√≥digo:** La programaci√≥n de la tarea se configur√≥ en `supabase/config.toml`, asegurando que la configuraci√≥n est√© versionada y sea reproducible.
4.  **Documentaci√≥n:** Se ha documentado la nueva funci√≥n en su propio `README.md`.

Con esto, el sistema ahora es m√°s resiliente y nos notificar√° proactivamente de problemas con la API de Gemini antes de que impacten a los usuarios.

### Pr√≥ximos Pasos

*   Actualizar el manual de `LECCIONES_APRENDIDAS.md`.
*   Subir toda la documentaci√≥n actualizada a GitHub.

# Estado del Proyecto - 28 de Octubre de 2025

Resumen ejecutivo (flujo INVERSIONISTA: avance y endurecimiento)

- Portafolio MVP (frontend):
  - Agregado `src/MyInvestmentsList.jsx` (lista inversiones del usuario desde `inversiones` + join m√≠nimo con `oportunidades`).
  - Rutas protegidas nuevas: `/mis-inversiones` y `/retiro` en `src/App.jsx` usando `InvestorRoute`.

- Solicitud de retiro (MVP):
  - Agregado `src/WithdrawalForm.jsx` (inserta en `solicitudes` con `tipo_solicitud='retiro'`, registra monto y nota).

- Formulario de inter√©s de inversionista (KYC m√≠nimo y saneo):
  - Endurecido `src/InvestorInterestForm.jsx` con zod: email v√°lido, tel√©fono solo d√≠gitos (7‚Äì12), selecci√≥n cerrada de 9 departamentos.
  - Cambio de mapeo `ciudad` ‚Üí `departamento` al insertar en `solicitudes`.
  - Evento anal√≠tico: `Submitted Investor Interest`.

- Backend: onboarding autom√°tico de inversionistas (sin invitaci√≥n manual):
  - Extendida `supabase/functions/handle-new-solicitud/index.ts` para manejar `tipo_solicitud='inversionista'`:
    - Genera link de invitaci√≥n (Auth admin.generateLink type `invite`) con redirect a `/confirmar-y-crear-perfil`.
    - Env√≠a correo de bienvenida v√≠a Resend y marca `solicitudes.estado='contactado'`.
    - Ajustes de entregabilidad: `to: [email]`, `from: contacto@tuprestamobo.com`, adiciona `text` y `reply_to`, y loggea la respuesta (`Resend response (investor)`).

- Despliegue:
  - Redeploy realizado de `handle-new-solicitud` (pendiente prueba de entrega de correo con Resend Activity).

Qu√© falta / pr√≥ximos pasos sugeridos (ma√±ana)

- Verificar correo al inversionista:
  - Probar env√≠o real (landing ‚Üí ‚ÄúQuiero Invertir‚Äù), revisar logs `Resend response (investor)` y Resend Activity (deliver/bounce/blocked).
  - Confirmar dominio en Resend (SPF/DKIM) y Suppressions para el destinatario si fuera necesario.

- UI navegaci√≥n:
  - Agregar CTAs en `src/InvestorDashboard.jsx` a `/mis-inversiones` y `/retiro` (archivo presenta caracteres de encoding; hacer ajuste con cuidado).

- RLS a confirmar:
  - `inversiones (SELECT)` por `investor_id = auth.uid()`.
  - `solicitudes (INSERT)` para inversionistas (con `user_id` si autenticado) y para retiros.

- Roles y perfiles:
  - Evitar seteo de rol desde cliente en `src/Auth.jsx` y mover asignaci√≥n a function/trigger seguro post‚Äësignup.

URLs √∫tiles

- Portafolio: `/mis-inversiones`
- Retiros: `/retiro`
- Formulario de inter√©s (landing): `/` ‚Üí ‚ÄúQuiero Invertir‚Äù
- Edge Function: `handle-new-solicitud`

---

# Estado del Proyecto - 26 de Octubre de 2025

**Misi√≥n Cumplida:** Bug Cr√≠tico de Carga de Documentos Solucionado y Documentado.

### Resumen Ejecutivo

Se ha diagnosticado y resuelto exitosamente el bug persistente que imped√≠a la correcta visualizaci√≥n del estado de los documentos en el Dashboard del Prestatario. La soluci√≥n implic√≥ una depuraci√≥n profunda que revel√≥ una cadena de tres errores distintos:

1.  **Bug de Estado en el Frontend:** Se corrigi√≥ el componente `BorrowerDashboard.jsx` que no actualizaba la lista de documentos en la interfaz.
2.  **Bug de API Externa:** Se actualiz√≥ el nombre del modelo de IA en la Edge Function `analizar-documento-v2` para reflejar los cambios en la API de Google Gemini.
3.  **Bug de Permisos (RLS):** Se implement√≥ la pol√≠tica de seguridad (RLS) de `SELECT` faltante en la tabla `documentos`, permitiendo que el frontend pudiera leer los documentos que el propio usuario hab√≠a subido.

### Documentaci√≥n Creada

Para capitalizar el conocimiento adquirido y prevenir futuros errores, se ha creado un manual t√©cnico detallado.

*   **Nueva Gu√≠a:** `DOCUMENTACION/LECCIONES_APRENDIDAS.md` - Contiene una autopsia completa del bug y la explicaci√≥n de la arquitectura de permisos "El C√≠rculo de Confianza de Supabase".

### Pr√≥ximos Pasos

*   **Inmortalizar los Cambios:** Subir el c√≥digo corregido y la nueva documentaci√≥n a GitHub.
*   **Discusi√≥n Estrat√©gica:** Evaluar la implementaci√≥n de un sistema de monitoreo proactivo para dependencias externas como la API de Google (ver Propuesta en `LECCIONES_APRENDIDAS.md`).

---

# Estado del Proyecto - 24 de Octubre de 2025 (Actualizaci√≥n Noche)

Asunto: Mixpanel operativo en producci√≥n con Autocapture y Session Replay

Resumen: Se complet√≥ la migraci√≥n a Mixpanel y se verific√≥ en producci√≥n (tuprestamo.com) la recepci√≥n de eventos en Live View, as√≠ como la reproducci√≥n de sesiones. Se resolvi√≥ el bug de inicializaci√≥n ausente y se protegieron llamadas cuando el SDK no est√° inicializado.


# Estado del Proyecto - 29 de Octubre de 2025

Resumen ejecutivo (flujo INVERSIONISTA: UX, navegaciÛn, legales, branding)

- Email de invitaciÛn (Edge Function):
  - PersonalizaciÛn con NOMBRE en asunto y saludo; cierre ìAtentamente, El equipo de Tu PrÈstamoî.
  - Removido el texto de descargo.
  - Se incluye full_name en metadata para que Supabase muestre Display Name correctamente.

- ConfirmaciÛn y perfil:
  - Ocultamos Header solo en p·ginas de confirmaciÛn; branding visible en dashboards.
  - `ConfirmAndSetPassword`: asegura `profiles` (nombre/rol/email) y actualiza metadata (`full_name`).
  - Nuevo perfil de inversionista: `/perfil-inversionista` (telÈfono + cambio de contraseÒa). Men˙ ìMi Perfilî enruta por rol.

- NavegaciÛn del inversionista (Header nuevo):
  - Men˙s centrados: Invertir ? (Oportunidades, Buscar/Filtrar), Portafolio ? (Mis Inversiones, Retiros + KPIs), Cuenta ? (VerificaciÛn de identidad, Centro de Ayuda).
  - Cierre por click fuera, cierre al cambiar de ruta, evita men˙s simult·neos; dropdown posicionados bajo cada botÛn.
  - Ocultamos CTA de landing en ·rea inversionista.

- P·ginas nuevas y consistencia:
  - Centro de Ayuda inversionista: `/faq-inversionista` (+ evento `Viewed Investor FAQ`).
  - Legales: `/terminos` y `/privacidad` (contenido base, con ìVolver al Panelî si rol inversionista/admin).
  - Breadcrumbs + barra ìVolverî en Oportunidades, Detalle, Mis Inversiones, Retiros, VerificaciÛn y FAQ. TambiÈn en Borrower y Admin.

- Footer y visibilidad:
  - Sticky footer; versiÛn completa en ·rea inversionista; compactado de espacios; redes en lÌnea; enlaces a FAQ/TÈrminos/Privacidad.

- Copy y verificaciÛn:
  - Sustituimos ìEstado KYCî por ìVerificaciÛn de identidadî y estados: Pendiente / En revisiÛn / Requiere revisiÛn / Verificada (Header y Dashboard).

- Branding (logo):
  - Logo transparente actualizado (public + src/assets). Header balanceado a 72px desktop / 52px mobile.

- Correcciones:
  - `NotificationBell` con `notifications=[]` para evitar TypeError.
  - `App.jsx`: restaurado `isDashboardPage` y Footer completo en rutas inversionista.
  - Header inversionista solo si hay sesiÛn con rol v·lido.
  - Fix de sintaxis en `InvestorDashboard.jsx` (compilaciÛn Vercel).

PrÛximos pasos sugeridos

- VerificaciÛn autom·tica del inversionista:
  - Confirmar trigger a `verificar-identidad-inversionista` al insertar en `documentos` (bucket inversionistas).
  - Validar RLS de `documentos`/`inversiones`/`solicitudes` para rol inversionista.

- Marketplace y filtros:
  - Implementar filtros en `/oportunidades` (riesgo, plazo, tasa mÌnima) y mantener gating de verificaciÛn al invertir.

- Entregabilidad de correos (Resend):
  - Revisar activity/logs de `handle-new-solicitud`; validar SPF/DKIM.

- UX/branding:
  - Considerar SVG del logo para nitidez y ìshrink on scrollî.

Notas de despliegue

- Frontend: cambios en `main` desplegados por Vercel.
- Backend (cuando cambie redirect):
  - `supabase secrets set APP_BASE_URL=https://www.tuprestamobo.com`
  - `supabase functions deploy handle-new-solicitud`
