# Estado del Proyecto - 1 de Noviembre de 2025 (Noche)

Resumen de hoy (flujo INVERSIONISTA)

- UI filtros Oportunidades: segmented control (Tasa 10/12/15 y Plazo 12/18/24) con aplicación instantánea; estilos alineados a Brand Kit.
- Risk badges: colores de marca (A=accent, B=primary, C=accent-2); valor de rendimiento neto en color de acento.
- Botones estandarizados (Brand Kit) en Mis Inversiones, Retiros y Verificación (input file con botón “Seleccionar archivo”, submit “Enviar Verificación”).
- Notificación KYC por correo: create-notification ahora soporta cta_label + link_url para CTA en emails.
- Edge Function verificar-identidad-inversionista: hotfix para aprobar por CI (sin nombre). Deploy realizado.

Problemas abiertos (prioridad alta)

1) Email KYC duplicado y sin CTA
   - Síntoma: llega 2 veces “Tu verificación fue aprobada” y sin botón.
   - Causa probable: send idempotency faltante (dos ejecuciones paralelas notifican) y falta de link_url/cta_label en el payload desde verificar-identidad-inversionista.
   - Acciones: notificar sólo si UPDATE … RETURNING cambió estado (usar updated.length>0) y enviar link_url + cta_label coherente (aprobado → /oportunidades | Ver Oportunidades; revisión → /investor-dashboard | Ir a mi Panel).

2) Inconsistencia de estado en panel
   - Síntoma: correo dice “aprobada” pero el panel muestra “Verificación: En revisión”.
   - Causa probable: el frontend no refetchéa profiles.estado_verificacion tras el cambio (estado cacheado) o el hook de perfil no invalida al volver.
   - Acciones: forzar refetch del perfil al entrar a /investor-dashboard y tras completar verificación; opcional: suscripción a cambios de perfil o polling leve.

3) Notificaciones in-app no visibles automáticamente
   - Síntoma: la notificación aparece solo al abrir el menú (“Hola, Isaac”).
   - Causa probable: el fetch de notificaciones está atado a abrir el menú; falta banner/Toast en el dashboard.
   - Acciones: al entrar al dashboard, leer la última 
otifications.type='kyc_status' no leída y mostrar Toast con CTA; marcar como leída al cerrar/abrir.

Nota para Gemini Code Assist: flujo backend KYC inversionista (actual y esperado)

- Upload: el inversionista sube CI anverso a bucket privado documentos-inversionistas (ruta guardada en erification_drafts durante KYC).
- Trigger/Invoke: la app invoca Edge Function erificar-identidad-inversionista con { user_id, url_archivo, tipo_documento: 'ci_inversionista_anverso' }.
- Function (actual):
  - Genera URL firmada (prioriza documentos-inversionistas).
  - Obtiene perfil (profiles.id = user_id).
  - Llama a Gemini (OCR). Hotfix: aprueba con ciOK (solo CI), sin nombre.
  - Actualiza profiles.estado_verificacion.
  - Llama create-notification para insertar notificación + enviar correo (pendiente idempotencia + CTA consistente).
- Function (esperado):
  - Prompt OCR: extraer 
umero_ci, expiracion, candidatos_numero_ci, ocr_confidence.
  - Normalizar fecha “12 de Abril de 2031” → YYYY-MM-DD; aprobar por CI; bloquear si expiración vencida.
  - Encolar revisión manual en public.kyc_review_queue cuando falle (ilegible, mismatch, vencida).
  - Notificar una sola vez (idempotencia) y con CTA coherente.
- Notificación in-app: public.notifications (RLS por usuario). Email vía Resend usando plantillas de supabase/functions/_shared/email.ts con CTA.
- Front: el dashboard debe refetchéar perfil y mostrar Toast de KYC sin abrir menú.

Siguiente (para mañana)

- Implementar idempotencia + CTA en erificar-identidad-inversionista (UPDATE … RETURNING; link_url y cta_label).
- Refactor de hook de perfil o refetch en dashboard tras KYC aprobado.
- Toast automático en dashboard (última notificación KYC no leída con CTA y dismiss).
- Completar prompt OCR con expiración + encolado kyc_review_queue (ya creada) y panel admin mínimo para revisión.

---
# Estado del Proyecto - 1 de Noviembre de 2025 (DÃ­a)

Resumen ejecutivo (flujo inversionista estable; validaciÃ³n E2E en curso)

- Seguimos validaciÃ³n E2E de KYC, email e infraestructura (Storage/Resend/RLS).

Pendientes Activos

1) Validar E2E KYC inversionista
   - Subir CI a bucket `documentos-inversionistas`, 1 sola ejecuciÃ³n (idempotencia), revisar "OCR compare", notificaciÃ³n y email sin duplicados y con acentos correctos.
2) Auto-invite con email existente
   - Enviar solicitud con email ya registrado; confirmar correo "Ya tienes una cuenta." y `solicitudes.estado='contactado'`.
3) UX Oportunidades (no verificado)
   - NavegaciÃ³n libre post-login; gate solo al intentar invertir.
4) Email de proyecciÃ³n (lead)
   - Validar en Resend/Gmail: meses, % visibles, CTA centrado, ancho compacto.
5) Analytics
   - Enriquecer `Calculator_Lead_Submitted` con `{ amount, term_months, dpf_rate, projected_gain }`.
6) RLS
   - `inversiones` SELECT por `investor_id = auth.uid()`.
   - `solicitudes` INSERT para inversionistas (con `user_id` si autenticado) y retiros.
7) Roles/Perfiles
   - Dejar de setear `role` desde cliente en `src/Auth.jsx`; mover asignaciÃ³n a function/trigger seguro postâ€‘signup.
8) UI encoding residual
   - Corregir acentos visibles en `src/InvestorDashboard.jsx`, `src/App.jsx`, `src/Auth.jsx`.

Notas de ConfiguraciÃ³n

- Storage: bucket privado `documentos-inversionistas` (RLS apropiadas).
- Secrets Functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `APP_BASE_URL`, `GEMINI_API_KEY`/`GOOGLE_GEMINI_API_KEY`.

Enlaces Ãºtiles

- Portafolio: `/mis-inversiones`
- Retiros: `/retiro`
- Landing â€œQuiero Invertirâ€: `/`
- Edge Functions: `verificar-identidad-inversionista`, `handle-new-solicitud`, `save-investor-lead`, `create-notification`
