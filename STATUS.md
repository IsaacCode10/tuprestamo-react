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

