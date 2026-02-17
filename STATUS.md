## Actualizacion 2026-02-11

**Lo hecho hoy:**
- Bug critical: `handle-new-solicitud` fallaba con "Database error creating new user".
- Causa: trigger en `auth.users` llamaba `public.apply_role_from_allowlist()` que no existia.
- Fix aplicado en Supabase: funcion no-op `public.apply_role_from_allowlist(uuid)`.
- Resultado: correo de pre-aprobacion llega correctamente y la creacion de usuario funciona.
- Se creo migracion: `supabase/migrations/20260211_apply_role_allowlist_noop.sql`.

**Pendiente:**
- Hacer `supabase db push --linked` para aplicar la migracion en remoto y dejarlo versionado.
- Decidir si el trigger `apply_role_from_allowlist_trigger` se mantiene o se elimina cuando se implemente allowlist real.
- Continuar flujo E2E con nueva oportunidad para validar videollamada, boleta electricidad y agendar firma.

## Actualizacion 2026-02-11 (tarde)

**Lo hecho hoy:**
- Se resolvio el bloqueo de alta de usuarios: el trigger `apply_role_from_allowlist_trigger` llamaba a una funcion inexistente. Se creo `public.apply_role_from_allowlist(uuid)` como no-op. Flujo de pre-aprobacion y correo OK.
- Se aplico la migracion `20260211_apply_role_allowlist_noop.sql` y se marco como applied en remoto.
- Se agrego recuperacion de contrasena en `Auth`: link "Olvide mi contrasena" con `resetPasswordForEmail`.
- Se corrigio error `userId is not defined` en `BorrowerDashboard`.
- Se oculto la seccion de amortizacion hasta estado `desembolsado/activo/en_curso/pagado`.
- Se agrego CTA claro antes de Documentos: "Siguiente paso: sube tu documentacion" con boton de scroll.

**Pendiente para manana:**
- Hacer `git push` + `npm run build` + `npx vercel --prod` para los commits: `07cd451`, `5943184`, `a953183`, `b5717f5`.
- Validar en produccion:
  - Recuperacion de contrasena envia correo y redirige a `confirmar-y-crear-perfil`.
  - CTA de documentos aparece antes de la seccion y hace scroll.
  - Amortizacion no aparece en etapas tempranas.
- Continuar flujo E2E con nueva oportunidad (videollamada, boleta de electricidad, agendar firma, notariado OK, pago dirigido, contrato/cronograma).

## Actualizacion 2026-02-13

**Lo hecho hoy:**
- Se actualizo `VITE_SUPABASE_ANON_KEY` en Vercel luego de la rotacion de claves.
- Prueba de "Olvide mi contrasena": error en consola `401 (Unauthorized)` con mensaje **Invalid API key** en `/auth/v1/recover`.

**Pendiente para manana (2026-02-14):**
- Verificar que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` correspondan al mismo proyecto Supabase.
- Confirmar que las variables esten actualizadas en Production/Preview/Development y hacer **redeploy**.
- Reintentar recuperacion de contrasena y revisar Network (request a `/auth/v1/recover` + header `apikey`) y logs de Supabase Auth.

## Actualizacion 2026-02-17

**Lo hecho hoy:**
- Se corrigio el flujo de recuperacion de contrasena: `auth/v1/recover` ya envia correos (error 535 por SMTP resuelto con nueva API key en Resend usada como password SMTP en Supabase).
- Se actualizo el template de email "Reset Password" en Supabase con estilo del Brand Kit.
- Se agrego aviso en UI: "Revisa tu bandeja de Spam" al solicitar recuperacion de contrasena.
- Se implemento template de rechazo en `handle-new-solicitud` (antes estaba vacio) con tono politico y coherente a Brand Kit.
- Se ajusto el correo de contacto en rechazo a `contacto@tuprestamobo.com`.
- Se ajustaron colores de botones en Auth para alternancia visual (Iniciar Sesion + Refinanciar Tarjeta mismo color, Olvide mi contrasena + Quiero Invertir mismo color).
- Se documento en `MODE_DE_TRABAJO_CODEX.md` que siempre debo entregar comandos de deploy al finalizar implementaciones (sin preguntar).
- Se corrigio el flujo de reintentos: si el email ya existe, se reutiliza el usuario y se envia magic link, evitando error 500.
- Se elimino trigger duplicado en `solicitudes` y se actualizo el trigger restante para invocar la Edge Function.

**Pendiente:**
- Deploy de cambios recientes (frontend + functions):
  - `src/Auth.jsx` (mensaje de spam),
  - `src/Auth.css` (colores),
  - `supabase/functions/handle-new-solicitud/index.ts` (template rechazo).
- Continuar flujo E2E con nueva oportunidad (videollamada, boleta electricidad, agendar firma, notariado, pago dirigido, contrato/cronograma).
