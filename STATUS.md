# Estado del Proyecto — 7 Nov 2025 (Tarde)
Vigente: 2025-11-07

Convención de actualización
- Mantener este bloque como vigente (última fecha).
- Borrar lo ya implementado; solo listar pendientes/QA actuales.
- Opcional: mover el bloque anterior a “Historial — <fecha>”.

Resumen
- Menú móvil: overlay + panel lateral con bloqueo de scroll, foco inicial, trap de tabulación y Escape para cerrar.
- “Cómo Funciona” (móvil): rediseñado con tarjetas apiladas (Opción 1), mayor legibilidad y estética.
- Supabase Auth Linking (Google): componente para vincular/desvincular cuentas integrado en perfiles.
- Despliegue: cambios publicados en Vercel producción para verificación.

Producción
- URL activa: https://tuprestamo-react-a0y2o8gpt-isaac-alfaros-projects.vercel.app

Cambios por archivo
- `src/components/Header.css`: estilos para `.mobile-menu-overlay` y `.mobile-menu-panel` (slide-in, sombras) y elementos del menú móvil.
- `src/components/Header.jsx`: mejoras de a11y (foco, Escape, trap, scroll lock) y estructura del panel móvil.
- `src/components/ComoFunciona.css`: layout móvil con tarjetas apiladas (100% ancho, padding 16px, radius, shadow).
- `src/components/ComoFunciona.jsx`: import de estilos móviles.
- `src/components/AuthLinker.jsx`: nuevo componente de vinculación de identidades (Google) vía Supabase Auth v2.
- `src/InvestorProfile.jsx`, `src/Profile.jsx`: integración de `AuthLinker` bajo la sección “Seguridad”.

Pendientes (Supabase Dashboard — requeridos)
1) Activar proveedor Google (Authentication → Providers → Google → ON).
2) Configurar Client ID/Secret de Google y autorizar redirect: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`.
3) Authentication → Settings: Site URL (dominio Vercel prod), Additional Redirect URLs (previews de Vercel + `http://localhost:5173`).
4) Activar “Allow linking of multiple identities”.

QA sugerido
- Vincular Google desde Perfil: listar identidades, vincular, confirmar retorno a la app, ver método en la lista.
- Desvincular: no permitir si quedaría la cuenta sin método o si es email/password.
- Menú móvil: abrir/cerrar, bloqueo de scroll, Escape y navegación por Tab dentro del panel.
- “Cómo Funciona” (móvil): 5 tarjetas apiladas, tipografía legible y spacing correcto.

Siguientes pasos (opcionales)
- Pantalla de Auth: añadir botón “Continuar con Google” (sign-in social estándar).
- Header: exponer `aria-expanded`/`aria-controls` en el botón y animar a “X” al abrir.
- Apple Sign-in: planificar setup (Service ID, Team ID, Key ID, Private Key) y habilitar provider.

Nota
Este STATUS reemplaza versiones previas extensas. Mantenerlo breve y accionable a partir de ahora.

---

## Historial — 3 Nov 2025 (Noche)

Resumen rápido

- KYC inversionista estable: el estado se mantiene en “Verificada”, sin regresiones.
- Notificaciones restauradas: Toast automático en dashboard y badge rojo en el header.
- Cuenta bancaria: se promueve desde `verification_drafts` a `cuentas_bancarias_inversionistas` al quedar verificado.
- Auditoría OCR: se registra en `analisis_documentos` (proveedor + datos extraídos) tras la verificación.
- Despliegues: Supabase Functions y Vercel en producción actualizados.

Siguiente E2E (mañana)

- Repetir flujo completo: registro → verificación CI → correo con CTA → dashboard con Toast → verificación persiste → cuenta bancaria creada/actualizada → oportunidades visibles.
- Validar en DB: `analisis_documentos` y `cuentas_bancarias_inversionistas` contienen filas para el usuario verificado.

---

Resumen de hoy (flujo INVERSIONISTA)

- UI Oportunidades: filtros segmentados (Tasa 10/12/15, Plazo 12/18/24) con estilos Brand Kit.
- Dashboard (src/InvestorDashboard.jsx):
  - Corrige acentos y copy. Oculta la pill cuando estado = verificado.
  - Muestra Toast de KYC automáticamente (sin abrir menú).
  - Suscripciones Realtime para perfil (UPDATE) y notificaciones (INSERT).
- Header (src/components/Header.jsx):
  - Badge rojo de notificaciones restablecido.
  - Ya no marca como leídas al abrir la campana; persisten hasta acción del usuario.
- Verificación (supabase/functions/verificar-identidad-inversionista):
  - Idempotencia de notificación (solo si cambió el estado vía UPDATE RETURNING).
  - Inserta auditoría en `analisis_documentos` (proveedor + datos extraídos).
  - Si estado = “verificado”: upsert de cuenta bancaria desde `verification_drafts` → `cuentas_bancarias_inversionistas` (por `user_id`).
- Infra: redeploy de Functions (Supabase) y deploy de producción (Vercel).

---

Problemas abiertos (prioridad alta)

1) OCR KYC (mejora del prompt)
   - Extraer: `numero_ci`, `expiracion` (con meses literales), `candidatos_numero_ci`, `ocr_confidence`.
   - Normalizar fecha (p. ej., “12 de abril de 2031” → YYYY-MM-DD) y bloquear si expiración vencida.

2) Revisión manual (cuando OCR falla)
   - Encolar en `public.kyc_review_queue` (crear tabla) y agregar panel admin mínimo para aprobar/rechazar.

3) Email deliverability (unificación remitente)
   - Unificar remitente en funciones a `notificaciones@tuprestamobo.com` (Reply-To `contacto@tuprestamobo.com`).
   - Revisar SPF/DKIM/DMARC y supresión en Resend.

4) Auditoría OCR (enriquecimiento)
   - Guardar también: `user_id`, `tipo_documento` y `url_archivo` en `analisis_documentos` para trazabilidad completa.

---

Flujo KYC inversionista (actual)

- Upload: CI a Storage/bucket `documentos-inversionistas`; ruta guardada en `verification_drafts`.
- Invocación: Edge `verificar-identidad-inversionista` con `{ user_id, url_archivo, tipo_documento }`.
- Función:
  - URL firmada; OCR con Gemini; parseo robusto de JSON.
  - Auditoría: inserta en `analisis_documentos` (proveedor + datos extraídos).
  - Actualiza `profiles.estado_verificacion` (idempotente) y notifica (in-app + email con CTA consistente).
  - Si estado = “verificado”: upsert de cuenta bancaria en `cuentas_bancarias_inversionistas` desde `verification_drafts`.
- Front:
  - Dashboard: Toast automático; Realtime; pill oculta en “verificado”.
  - Header: badge rojo visible al haber no leídas; no se auto-marcan como leídas.

---

Siguiente (para mañana)

- Completar prompt OCR (expiración/normalización/confidence) + bloqueo por vencimiento.
- Diseñar y crear `kyc_review_queue` + vista admin mínima.
- Unificar remitente emails y revisar entregabilidad en Resend.
- Enriquecer `analisis_documentos` con `user_id`/`tipo_documento`/`url_archivo`.

Notas de Configuración

- Storage: bucket privado `documentos-inversionistas` (RLS apropiadas).
- Secrets Functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `APP_BASE_URL`, `GEMINI_API_KEY`/`GOOGLE_GEMINI_API_KEY`.

Enlaces útiles

- Portafolio: `/mis-inversiones`
- Retiros: `/retiro`
- Landing “Quiero Invertir”: `/`
- Edge Functions: `verificar-identidad-inversionista`, `handle-new-solicitud`, `save-investor-lead`, `create-notification`
