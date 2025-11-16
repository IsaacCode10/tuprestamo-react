# Estado del Proyecto - 15 Nov 2025 (Correcciones en producción)
Vigente: 2025-11-15

Resumen ejecutivo
- La reducción del formulario a 9 preguntas rompió el cálculo de `monto_solicitado`/`plazo_meses` y, por ende, las secciones “Resumen de tu Solicitud”, “Calcula tu Ahorro”, “Propuesta de Ahorro” y “Transparencia Total” no se actualizaban.
- Refactoricé `handle-new-solicitud` para persistir el “gross-up” (monto/tasa/plazo/tasas A/B/C) en `solicitudes` y `oportunidades`, centralicé `ensureAuthorizationPreprint` y reconstruí el dashboard para que siempre derive los valores actuales desde `simulation`.
- El stepper ahora muestra “Verificación Inicial” tan pronto cambia el estado y las secciones del panel usan los valores editables de la calculadora; ya está desplegado en https://tuprestamo-react-5hrumydcr-isaac-alfaros-projects.vercel.app.

Notas
- Confirmar por E2E con `rendimax.oficialbo@gmail.com` que la solicitud avanza a `pre-aprobado` para que el stepper pase al paso “Sube tus Documentos”.
- Verificar en Supabase que `oportunidades` mantiene el monto bruto, plazo y tasas antes de cerrar el flujo.

# Estado del Proyecto  15 Nov 2025 (Correcciones en producción)
Vigente: 2025-11-15

Resumen ejecutivo
- La reducción del formulario a 9 preguntas rompió el cálculo de `monto_solicitado`/`plazo_meses` y, por ende, las secciones Resumen de tu Solicitud, Calcula tu Ahorro, Propuesta de Ahorro y Transparencia Total no se actualizaban.
- Refactoricé `handle-new-solicitud` para persistir el gross-up (monto/tasa/plazo/tasas A/B/C) en `solicitudes` y `oportunidades`, centralicé `ensureAuthorizationPreprint` y reconstruí el dashboard para que siempre derive los valores actuales desde `simulation`.
- El stepper ahora muestra Verificación Inicial tan pronto cambia el estado y las secciones del panel usan los valores editables de la calculadora; ya está desplegado en https://tuprestamo-react-5hrumydcr-isaac-alfaros-projects.vercel.app.

Notas
- Confirmar por E2E con `rendimax.oficialbo@gmail.com` que la solicitud avanza a `pre-aprobado` para que el stepper pase al paso Sube tus Documentos.
- Verificar en Supabase que `oportunidades` mantiene el monto bruto, plazo y tasas antes de cerrar el flujo.
# Estado del Proyecto â 14 Nov 2025 (Cierre de jornada)
Vigente: 2025-11-14

Resumen ejecutivo
- Bug principal: la autorizaciÃ³n INFOCRED no aparece porque utorizacion_infocred_preimpresa no se registra al completar los documentos.
- Intentos fallidos: generamos ensureAuthorizationPreprint, bloqueamos la carga de la carta firmada hasta que el PDF existe y desplegamos en vercel, pero sintetizar-perfil-riesgo sigue arrojando duplicate key.
- PrÃ³ximo paso: maÃ±ana revisaremos el log de sintetizar-perfil-riesgo, garantizaremos el upsert y confirmaremos en public.documentos que el preimpreso existe para activar la descarga.

Notas
- Documentar los pasos y seguir el checklist de QA antes de reactivar la subida manual (descarga â firma â subida).


# Estado del Proyecto â 13 Nov 2025 (Tarde)
Vigente: 2025-11-13

ConvenciÃ³n de actualizaciÃ³n
- Mantener este bloque como vigente (Ãºltima fecha).
- Borrar lo ya implementado; solo listar pendientes / QA actuales.
- El bloque anterior se mueve a Historial para preservar el contexto del 7/11.

Resumen
- El Document Manager actualiza `documents` mediante `onDocumentUploaded` tan pronto Supabase confirma el upsert, evitando recargas completas para reflejar las subidas.
- Se aÃ±adieron listeners Realtime para `documentos` y `analisis_documentos` que alimentan `documents` y `analyzedDocTypes`, deduplicando nuevos tipos y registrando estados de canal.
- La invocaciÃ³n a `analizar-documento-v2` dispara `refreshData` (fetch silencioso), manteniendo sincronizados `solicitud` y los anÃ¡lisis sin forzar loaders.

ProducciÃ³n
- URL activa: https://tuprestamo-react-a0y2o8gpt-isaac-alfaros-projects.vercel.app

Cambios por archivo
- `src/BorrowerDashboard.jsx`: DocumentManager recibe `onDocumentUploaded` y `onRefreshData`, actualiza el estado local con la fila devuelta y mantiene la UI sin recargar.
- `src/BorrowerDashboard.jsx`: Nuevos canales Realtime para `documentos` y `analisis_documentos`, manejadores con `Set` para `analyzedDocTypes` y eliminaciÃ³n del refresh manual.

Pendientes (Supabase Dashboard â requeridos)
1) Verificar que los canales `documentos-solicitud-<id>` y `analisis-docs-solicitud-<id>` permanezcan suscritos tras navegaciones y despliegues.
2) Confirmar que `analizar-documento-v2` + `refreshData` refresca los registros relevantes sin intervenciÃ³n del usuario.
3) Auditar `analyzedDocTypes` para evitar duplicados y garantizar el orden esperado.

QA sugerido
- Subir un documento desde Borrower Dashboard: la tarjeta debe mostrar el progreso, finalizar sin recargar y agregar el registro a la lista.
- Generar un evento en `analisis_documentos`: el estado en pantalla (documentos analizados/checkbox) debe actualizarse de inmediato y la consola mostrar el log del canal.
- Validar que `refreshData` ejecuta un fetch silencioso tras el anÃ¡lisis y que campos derivados (timestamps, estado) cambian en la UI.

Pendientes E2E (lanzamiento)
- E2E Prestatario
  - Subir cada documento requerido y confirmar que aparece sin recargar gracias a `onDocumentUploaded`.
  - Enviar el anÃ¡lisis y validar que `analyzedDocTypes` se actualiza al momento y habilita la siguiente etapa.
  - Asegurarse de que `analizar-documento-v2` dispara `refreshData` y sincroniza `solicitud`/`analisis_documentos` con la vista.

Siguientes pasos (opcionales)
- Medir mÃ©tricas de los canales Realtime para detectar desconexiones antes de que afecten a usuarios.
- Evaluar aÃ±adir un indicador en la UI que muestre que un documento estÃ¡ en anÃ¡lisis mientras `analysing` estÃ© activo.

Nota
Este STATUS reemplaza versiones previas extensas. Mantenerlo breve y accionable a partir de ahora.


---

## Historial â 7 Nov 2025 (Tarde)
Vigente: 2025-11-07

ConvenciÃ³n de actualizaciÃ³n
- Mantener este bloque como vigente (Ãºltima fecha).
- Borrar lo ya implementado; solo listar pendientes/QA actuales.
- Opcional: mover el bloque anterior a âHistorial â <fecha>â.

Resumen
- Landing: Hero restaurado (refinanciÃ¡ con mejores tasas), se eliminÃ³ âComparativaâ, Beneficios con Ã­conos y grilla 3+2 centrada, SEO actualizado.
- MenÃº mÃ³vil: overlay lateral robusto (bloqueo de scroll, foco, Escape, trap de Tab); fixes de visibilidad y altura (auto/max-height, borde redondeado).
- CÃ³mo Funciona: sin marcas de terceros; desembolso dirigido al banco; originaciÃ³n por nivel A 3% / B 4% / C 5%; CSS incluido para build.
- FAQ Inversionista: modelo no-custodia (sin âFondos disponiblesâ/âRetirosâ); sin breadcrumbs/back cuando no hay sesiÃ³n.
- Legales: Privacidad y TÃ©rminos sin placeholders de âÃltima actualizaciÃ³nâ ni stack tecnolÃ³gico; Ley aplicable: Bolivia.
- Infra: build corregido (faltante `src/components/ComoFunciona.css`).

ProducciÃ³n
- URL activa: https://tuprestamo-react-a0y2o8gpt-isaac-alfaros-projects.vercel.app

Cambios por archivo
- `src/components/Header.css`: estilos para `.mobile-menu-overlay` y `.mobile-menu-panel` (slide-in, sombras) y elementos del menÃº mÃ³vil.
- `src/components/Header.jsx`: mejoras de a11y (foco, Escape, trap, scroll lock) y estructura del panel mÃ³vil.
- `src/components/ComoFunciona.css`: layout mÃ³vil con tarjetas apiladas (100% ancho, padding 16px, radius, shadow).
- `src/components/ComoFunciona.jsx`: import de estilos mÃ³viles.
- `src/components/AuthLinker.jsx`: nuevo componente de vinculaciÃ³n de identidades (Google) vÃ­a Supabase Auth v2.
- `src/InvestorProfile.jsx`, `src/Profile.jsx`: integraciÃ³n de `AuthLinker` bajo la secciÃ³n âSeguridadâ.

Pendientes (Supabase Dashboard â requeridos)
1) Activar proveedor Google (Authentication â Providers â Google â ON).
2) Configurar Client ID/Secret de Google y autorizar redirect: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`.
3) Authentication â Settings: Site URL (dominio Vercel prod), Additional Redirect URLs (previews de Vercel + `http://localhost:5173`).
4) Activar âAllow linking of multiple identitiesâ.

QA sugerido
- Vincular Google desde Perfil: listar identidades, vincular, confirmar retorno a la app, ver mÃ©todo en la lista.
- Desvincular: no permitir si quedarÃ­a la cuenta sin mÃ©todo o si es email/password.
- MenÃº mÃ³vil: abrir/cerrar, bloqueo de scroll, Escape y navegaciÃ³n por Tab dentro del panel; sin âespacio blancoâ extra.
- âCÃ³mo Funcionaâ (mÃ³vil): 5 tarjetas apiladas, tipografÃ­a legible y spacing correcto.

Pendientes E2E (lanzamiento)
- E2E Inversionista
  - Registro/inicio sin sesiÃ³n â ver Landing correcta (Hero/Beneficios).
  - KYC completo â estado verificado persiste; sin breadcrumbs/back en FAQ si no hay sesiÃ³n.
  - Explorar Oportunidades â invertir (mÃ­n. Bs 700) â al 100%: flujo marca financiada.
  - Pagos: en cada ciclo, transferencia automÃ¡tica del neto a cuenta bancaria (no hay âRetirosâ ni âFondos disponiblesâ).
  - Notificaciones: creaciÃ³n y lectura manual (no auto-leÃ­das).

- E2E Prestatario
  - Solicitud â verificaciÃ³n de saldo deudor â cÃ¡lculo gross-up segÃºn nivel (A/B/C).
  - AprobaciÃ³n â fondeo â desembolso dirigido al banco acreedor (no a la cuenta del prestatario).
  - AmortizaciÃ³n: generar tabla (ejecutar `sql/amortizacion.sql` y `generate_amortizacion(...)`).
  - Dashboard prestatario: CTA âPago Extraâ (registro de intenciÃ³n) y UX estable.

Siguientes pasos (opcionales)
- Pantalla de Auth: aÃ±adir botÃ³n âContinuar con Googleâ (sign-in social estÃ¡ndar).
- Header: exponer `aria-expanded`/`aria-controls` en el botÃ³n y animar a âXâ al abrir.
- Apple Sign-in: planificar setup (Service ID, Team ID, Key ID, Private Key) y habilitar provider.

Nota
Este STATUS reemplaza versiones previas extensas. Mantenerlo breve y accionable a partir de ahora.


---

## Historial â 3 Nov 2025 (Noche)

Resumen rÃ¡pido

- KYC inversionista estable: el estado se mantiene en âVerificadaâ, sin regresiones.
- Notificaciones restauradas: Toast automÃ¡tico en dashboard y badge rojo en el header.
- Cuenta bancaria: se promueve desde `verification_drafts` a `cuentas_bancarias_inversionistas` al quedar verificado.
- AuditorÃ­a OCR: se registra en `analisis_documentos` (proveedor + datos extraÃ­dos) tras la verificaciÃ³n.
- Despliegues: Supabase Functions y Vercel en producciÃ³n actualizados.

Siguiente E2E (maÃ±ana)

- Repetir flujo completo: registro â verificaciÃ³n CI â correo con CTA â dashboard con Toast â verificaciÃ³n persiste â cuenta bancaria creada/actualizada â oportunidades visibles.
- Validar en DB: `analisis_documentos` y `cuentas_bancarias_inversionistas` contienen filas para el usuario verificado.

---

Resumen de hoy (flujo INVERSIONISTA)

- UI Oportunidades: filtros segmentados (Tasa 10/12/15, Plazo 12/18/24) con estilos Brand Kit.
- Dashboard (src/InvestorDashboard.jsx):
  - Corrige acentos y copy. Oculta la pill cuando estado = verificado.
  - Muestra Toast de KYC automÃ¡ticamente (sin abrir menÃº).
  - Suscripciones Realtime para perfil (UPDATE) y notificaciones (INSERT).
- Header (src/components/Header.jsx):
  - Badge rojo de notificaciones restablecido.
  - Ya no marca como leÃ­das al abrir la campana; persisten hasta acciÃ³n del usuario.
- VerificaciÃ³n (supabase/functions/verificar-identidad-inversionista):
  - Idempotencia de notificaciÃ³n (solo si cambiÃ³ el estado vÃ­a UPDATE RETURNING).
  - Inserta auditorÃ­a en `analisis_documentos` (proveedor + datos extraÃ­dos).
  - Si estado = âverificadoâ: upsert de cuenta bancaria desde `verification_drafts` â `cuentas_bancarias_inversionistas` (por `user_id`).
- Infra: redeploy de Functions (Supabase) y deploy de producciÃ³n (Vercel).

---

Problemas abiertos (prioridad alta)

1) OCR KYC (mejora del prompt)
   - Extraer: `numero_ci`, `expiracion` (con meses literales), `candidatos_numero_ci`, `ocr_confidence`.
   - Normalizar fecha (p. ej., â12 de abril de 2031â â YYYY-MM-DD) y bloquear si expiraciÃ³n vencida.

2) RevisiÃ³n manual (cuando OCR falla)
   - Encolar en `public.kyc_review_queue` (crear tabla) y agregar panel admin mÃ­nimo para aprobar/rechazar.

3) Email deliverability (unificaciÃ³n remitente)
   - Unificar remitente en funciones a `notificaciones@tuprestamobo.com` (Reply-To `contacto@tuprestamobo.com`).
   - Revisar SPF/DKIM/DMARC y supresiÃ³n en Resend.

4) AuditorÃ­a OCR (enriquecimiento)
   - Guardar tambiÃ©n: `user_id`, `tipo_documento` y `url_archivo` en `analisis_documentos` para trazabilidad completa.

---

Flujo KYC inversionista (actual)

- Upload: CI a Storage/bucket `documentos-inversionistas`; ruta guardada en `verification_drafts`.
- InvocaciÃ³n: Edge `verificar-identidad-inversionista` con `{ user_id, url_archivo, tipo_documento }`.
- FunciÃ³n:
  - URL firmada; OCR con Gemini; parseo robusto de JSON.
  - AuditorÃ­a: inserta en `analisis_documentos` (proveedor + datos extraÃ­dos).
  - Actualiza `profiles.estado_verificacion` (idempotente) y notifica (in-app + email con CTA consistente).
  - Si estado = âverificadoâ: upsert de cuenta bancaria en `cuentas_bancarias_inversionistas` desde `verification_drafts`.
- Front:
  - Dashboard: Toast automÃ¡tico; Realtime; pill oculta en âverificadoâ.
  - Header: badge rojo visible al haber no leÃ­das; no se auto-marcan como leÃ­das.

---

Siguiente (para maÃ±ana)

- Completar prompt OCR (expiraciÃ³n/normalizaciÃ³n/confidence) + bloqueo por vencimiento.
- DiseÃ±ar y crear `kyc_review_queue` + vista admin mÃ­nima.
- Unificar remitente emails y revisar entregabilidad en Resend.
- Enriquecer `analisis_documentos` con `user_id`/`tipo_documento`/`url_archivo`.

Notas de ConfiguraciÃ³n

- Storage: bucket privado `documentos-inversionistas` (RLS apropiadas).
- Secrets Functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `APP_BASE_URL`, `GEMINI_API_KEY`/`GOOGLE_GEMINI_API_KEY`.

Enlaces Ãºtiles

- Portafolio: `/mis-inversiones`
- Retiros: `/retiro`
- Landing âQuiero Invertirâ: `/`
- Edge Functions: `verificar-identidad-inversionista`, `handle-new-solicitud`, `save-investor-lead`, `create-notification`

---

## Actualizacion â 7 Nov 2025 (Noche)

Implementado hoy
- Branding meta/OG/Twitter corregido y assets public agregados (SEO/preview).
- Landing: posicionamiento "Cero comisiones por pago anticipado" (Hero, Beneficios, Comparativa, FAQ).
- Prepagos (MVP): boton "Realizar Pago Extra" en dashboard del prestatario aprobado/desembolsado.
  - Modal con simulacion local (metodo frances): mantiene cuota y reduce plazo; muestra ahorro en intereses.
  - Registra intencion en tabla pagos_extra_solicitados (si existe) y evento analytics.
- SQL base: sql/amortizacion.sql con tablas mortizaciones y pagos_extra_solicitados + funcion generate_amortizacion(...).
- Google Sign-In: revertido en /auth y en activacion; se retomara con Custom Domain (Supabase Pro).

Pendientes inmediatos
- Ejecutar sql/amortizacion.sql en Supabase (SQL Editor) para crear tablas y funcion.
- Generar cronograma al "desembolsar" (ejecutar generate_amortizacion(...) manual o activar trigger opcional del script).
- Definir donde mostrar la tabla de amortizacion en el dashboard y leer public.amortizaciones.
- Mantener calculadoras sin logica de prepago (confirmado).

Rutas/archivos claves
- index.html, src/components/LandingPage.jsx
- src/components/Hero.jsx, src/components/Beneficios.jsx, src/components/Comparativa.jsx, src/components/FAQ.jsx
- src/BorrowerDashboard.jsx (CTA y modal), src/utils/amortization.js
- sql/amortizacion.sql

