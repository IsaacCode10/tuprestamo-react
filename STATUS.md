# Estado del Proyecto - 3 de Noviembre de 2025 (Noche)

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
  - Idempotencia de notificación (solo si cambió el estado via UPDATE…RETURNING).
  - Inserta auditoría en `analisis_documentos` (proveedor + datos extraídos).
  - Si estado = “verificado”: upsert de cuenta bancaria desde `verification_drafts` → `cuentas_bancarias_inversionistas` (por `user_id`).
- Infra: redeploy de Functions (Supabase) y deploy de producción (Vercel).

---

Problemas abiertos (prioridad alta)

1) OCR KYC (mejora del prompt)
   - Extraer: `numero_ci`, `expiracion` (con meses literales), `candidatos_numero_ci`, `ocr_confidence`.
   - Normalizar fecha (p. ej., “12 de Abril de 2031” → YYYY-MM-DD) y bloquear si expiración vencida.

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
  - Actualiza `profiles.estado_verificacion` (idempotente) y notifica (in‑app + email con CTA consistente).
  - Si estado = “verificado”: upsert de cuenta bancaria en `cuentas_bancarias_inversionistas` desde `verification_drafts`.
- Front:
  - Dashboard: Toast automático; Realtime; pill oculta en “verificado”.
  - Header: badge rojo visible al haber no leídas; no se auto‑marcan como leídas.

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

