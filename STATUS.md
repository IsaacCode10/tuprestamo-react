# Estado del Proyecto - 17 Nov 2025 (Refinamiento de flujos)
Vigente: 2025-11-17

Resumen ejecutivo
- Bajo el nuevo boton de "Necesito ayuda para subir un documento" registramos en `document_help_requests` cada alerta donde el lead pidio asistencia, asi Sarai ya no necesita tocar Supabase y puede enfocarse en los leads completos desde su panel.
- El DocumentManager permite subir la carta firmada desde el inicio sin intentar que la IA la analice, y solo los otros archivos pasan por `analizar-documento-v2`.
- El dashboard de Sarai muestra un toggle "Solo completos" y una seccion de "Solicitudes que pidieron ayuda" con los datos que llegan de `document_help_requests`, manteniendo el resto del panel intacto.

Notas
- Los logs de diagnostico quedan solo en modo desarrollo (`diagLog`) para mantener la consola limpia; el flujo sigue obteniendo la URL firmada.
- Recomiendo validar manana la subida completa y el reporte de ayuda para confirmar que todo esta listo antes de cerrar QA.
# Estado del Proyecto - 15 Nov 2025 (Correcciones en producciÃ³n)
Vigente: 2025-11-15

Resumen ejecutivo
- La reducciÃ³n del formulario a 9 preguntas rompiÃ³ el cÃ¡lculo de `monto_solicitado`/`plazo_meses` y, por ende, las secciones â€œResumen de tu Solicitudâ€, â€œCalcula tu Ahorroâ€, â€œPropuesta de Ahorroâ€ y â€œTransparencia Totalâ€ no se actualizaban.
- RefactoricÃ© `handle-new-solicitud` para persistir el â€œgross-upâ€ (monto/tasa/plazo/tasas A/B/C) en `solicitudes` y `oportunidades`, centralicÃ© `ensureAuthorizationPreprint` y reconstruÃ­ el dashboard para que siempre derive los valores actuales desde `simulation`.
- El stepper ahora muestra â€œVerificaciÃ³n Inicialâ€ tan pronto cambia el estado y las secciones del panel usan los valores editables de la calculadora; ya estÃ¡ desplegado en https://tuprestamo-react-5hrumydcr-isaac-alfaros-projects.vercel.app.

Notas
- Confirmar por E2E con `rendimax.oficialbo@gmail.com` que la solicitud avanza a `pre-aprobado` para que el stepper pase al paso â€œSube tus Documentosâ€.
- Verificar en Supabase que `oportunidades` mantiene el monto bruto, plazo y tasas antes de cerrar el flujo.

# Estado del Proyecto Â— 15 Nov 2025 (Correcciones en producciÃ³n)
Vigente: 2025-11-15

Resumen ejecutivo
- La reducciÃ³n del formulario a 9 preguntas rompiÃ³ el cÃ¡lculo de `monto_solicitado`/`plazo_meses` y, por ende, las secciones Â“Resumen de tu SolicitudÂ”, Â“Calcula tu AhorroÂ”, Â“Propuesta de AhorroÂ” y Â“Transparencia TotalÂ” no se actualizaban.
- RefactoricÃ© `handle-new-solicitud` para persistir el Â“gross-upÂ” (monto/tasa/plazo/tasas A/B/C) en `solicitudes` y `oportunidades`, centralicÃ© `ensureAuthorizationPreprint` y reconstruÃ­ el dashboard para que siempre derive los valores actuales desde `simulation`.
- El stepper ahora muestra Â“VerificaciÃ³n InicialÂ” tan pronto cambia el estado y las secciones del panel usan los valores editables de la calculadora; ya estÃ¡ desplegado en https://tuprestamo-react-5hrumydcr-isaac-alfaros-projects.vercel.app.

Notas
- Confirmar por E2E con `rendimax.oficialbo@gmail.com` que la solicitud avanza a `pre-aprobado` para que el stepper pase al paso Â“Sube tus DocumentosÂ”.
- Verificar en Supabase que `oportunidades` mantiene el monto bruto, plazo y tasas antes de cerrar el flujo.
# Estado del Proyecto Ã¢Â€Â” 14 Nov 2025 (Cierre de jornada)
Vigente: 2025-11-14

Resumen ejecutivo
- Bug principal: la autorizaciÃƒÂ³n INFOCRED no aparece porque utorizacion_infocred_preimpresa no se registra al completar los documentos.
- Intentos fallidos: generamos ensureAuthorizationPreprint, bloqueamos la carga de la carta firmada hasta que el PDF existe y desplegamos en vercel, pero sintetizar-perfil-riesgo sigue arrojando duplicate key.
- PrÃƒÂ³ximo paso: maÃƒÂ±ana revisaremos el log de sintetizar-perfil-riesgo, garantizaremos el upsert y confirmaremos en public.documentos que el preimpreso existe para activar la descarga.

Notas
- Documentar los pasos y seguir el checklist de QA antes de reactivar la subida manual (descarga Ã¢Â†Â’ firma Ã¢Â†Â’ subida).


# Estado del Proyecto Ã¢Â€Â” 13 Nov 2025 (Tarde)
Vigente: 2025-11-13

ConvenciÃƒÂ³n de actualizaciÃƒÂ³n
- Mantener este bloque como vigente (ÃƒÂºltima fecha).
- Borrar lo ya implementado; solo listar pendientes / QA actuales.
- El bloque anterior se mueve a Historial para preservar el contexto del 7/11.

Resumen
- El Document Manager actualiza `documents` mediante `onDocumentUploaded` tan pronto Supabase confirma el upsert, evitando recargas completas para reflejar las subidas.
- Se aÃƒÂ±adieron listeners Realtime para `documentos` y `analisis_documentos` que alimentan `documents` y `analyzedDocTypes`, deduplicando nuevos tipos y registrando estados de canal.
- La invocaciÃƒÂ³n a `analizar-documento-v2` dispara `refreshData` (fetch silencioso), manteniendo sincronizados `solicitud` y los anÃƒÂ¡lisis sin forzar loaders.

ProducciÃƒÂ³n
- URL activa: https://tuprestamo-react-a0y2o8gpt-isaac-alfaros-projects.vercel.app

Cambios por archivo
- `src/BorrowerDashboard.jsx`: DocumentManager recibe `onDocumentUploaded` y `onRefreshData`, actualiza el estado local con la fila devuelta y mantiene la UI sin recargar.
- `src/BorrowerDashboard.jsx`: Nuevos canales Realtime para `documentos` y `analisis_documentos`, manejadores con `Set` para `analyzedDocTypes` y eliminaciÃƒÂ³n del refresh manual.

Pendientes (Supabase Dashboard Ã¢Â€Â” requeridos)
1) Verificar que los canales `documentos-solicitud-<id>` y `analisis-docs-solicitud-<id>` permanezcan suscritos tras navegaciones y despliegues.
2) Confirmar que `analizar-documento-v2` + `refreshData` refresca los registros relevantes sin intervenciÃƒÂ³n del usuario.
3) Auditar `analyzedDocTypes` para evitar duplicados y garantizar el orden esperado.

QA sugerido
- Subir un documento desde Borrower Dashboard: la tarjeta debe mostrar el progreso, finalizar sin recargar y agregar el registro a la lista.
- Generar un evento en `analisis_documentos`: el estado en pantalla (documentos analizados/checkbox) debe actualizarse de inmediato y la consola mostrar el log del canal.
- Validar que `refreshData` ejecuta un fetch silencioso tras el anÃƒÂ¡lisis y que campos derivados (timestamps, estado) cambian en la UI.

Pendientes E2E (lanzamiento)
- E2E Prestatario
  - Subir cada documento requerido y confirmar que aparece sin recargar gracias a `onDocumentUploaded`.
  - Enviar el anÃƒÂ¡lisis y validar que `analyzedDocTypes` se actualiza al momento y habilita la siguiente etapa.
  - Asegurarse de que `analizar-documento-v2` dispara `refreshData` y sincroniza `solicitud`/`analisis_documentos` con la vista.

Siguientes pasos (opcionales)
- Medir mÃƒÂ©tricas de los canales Realtime para detectar desconexiones antes de que afecten a usuarios.
- Evaluar aÃƒÂ±adir un indicador en la UI que muestre que un documento estÃƒÂ¡ en anÃƒÂ¡lisis mientras `analysing` estÃƒÂ© activo.

Nota
Este STATUS reemplaza versiones previas extensas. Mantenerlo breve y accionable a partir de ahora.


---

## Historial Ã¢Â€Â” 7 Nov 2025 (Tarde)
Vigente: 2025-11-07

ConvenciÃƒÂ³n de actualizaciÃƒÂ³n
- Mantener este bloque como vigente (ÃƒÂºltima fecha).
- Borrar lo ya implementado; solo listar pendientes/QA actuales.
- Opcional: mover el bloque anterior a Ã¢Â€ÂœHistorial Ã¢Â€Â” <fecha>Ã¢Â€Â.

Resumen
- Landing: Hero restaurado (refinanciÃƒÂ¡ con mejores tasas), se eliminÃƒÂ³ Ã¢Â€ÂœComparativaÃ¢Â€Â, Beneficios con ÃƒÂ­conos y grilla 3+2 centrada, SEO actualizado.
- MenÃƒÂº mÃƒÂ³vil: overlay lateral robusto (bloqueo de scroll, foco, Escape, trap de Tab); fixes de visibilidad y altura (auto/max-height, borde redondeado).
- CÃƒÂ³mo Funciona: sin marcas de terceros; desembolso dirigido al banco; originaciÃƒÂ³n por nivel A 3% / B 4% / C 5%; CSS incluido para build.
- FAQ Inversionista: modelo no-custodia (sin Ã¢Â€ÂœFondos disponiblesÃ¢Â€Â/Ã¢Â€ÂœRetirosÃ¢Â€Â); sin breadcrumbs/back cuando no hay sesiÃƒÂ³n.
- Legales: Privacidad y TÃƒÂ©rminos sin placeholders de Ã¢Â€ÂœÃƒÂšltima actualizaciÃƒÂ³nÃ¢Â€Â ni stack tecnolÃƒÂ³gico; Ley aplicable: Bolivia.
- Infra: build corregido (faltante `src/components/ComoFunciona.css`).

ProducciÃƒÂ³n
- URL activa: https://tuprestamo-react-a0y2o8gpt-isaac-alfaros-projects.vercel.app

Cambios por archivo
- `src/components/Header.css`: estilos para `.mobile-menu-overlay` y `.mobile-menu-panel` (slide-in, sombras) y elementos del menÃƒÂº mÃƒÂ³vil.
- `src/components/Header.jsx`: mejoras de a11y (foco, Escape, trap, scroll lock) y estructura del panel mÃƒÂ³vil.
- `src/components/ComoFunciona.css`: layout mÃƒÂ³vil con tarjetas apiladas (100% ancho, padding 16px, radius, shadow).
- `src/components/ComoFunciona.jsx`: import de estilos mÃƒÂ³viles.
- `src/components/AuthLinker.jsx`: nuevo componente de vinculaciÃƒÂ³n de identidades (Google) vÃƒÂ­a Supabase Auth v2.
- `src/InvestorProfile.jsx`, `src/Profile.jsx`: integraciÃƒÂ³n de `AuthLinker` bajo la secciÃƒÂ³n Ã¢Â€ÂœSeguridadÃ¢Â€Â.

Pendientes (Supabase Dashboard Ã¢Â€Â” requeridos)
1) Activar proveedor Google (Authentication Ã¢Â†Â’ Providers Ã¢Â†Â’ Google Ã¢Â†Â’ ON).
2) Configurar Client ID/Secret de Google y autorizar redirect: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`.
3) Authentication Ã¢Â†Â’ Settings: Site URL (dominio Vercel prod), Additional Redirect URLs (previews de Vercel + `http://localhost:5173`).
4) Activar Ã¢Â€ÂœAllow linking of multiple identitiesÃ¢Â€Â.

QA sugerido
- Vincular Google desde Perfil: listar identidades, vincular, confirmar retorno a la app, ver mÃƒÂ©todo en la lista.
- Desvincular: no permitir si quedarÃƒÂ­a la cuenta sin mÃƒÂ©todo o si es email/password.
- MenÃƒÂº mÃƒÂ³vil: abrir/cerrar, bloqueo de scroll, Escape y navegaciÃƒÂ³n por Tab dentro del panel; sin Ã¢Â€Âœespacio blancoÃ¢Â€Â extra.
- Ã¢Â€ÂœCÃƒÂ³mo FuncionaÃ¢Â€Â (mÃƒÂ³vil): 5 tarjetas apiladas, tipografÃƒÂ­a legible y spacing correcto.

Pendientes E2E (lanzamiento)
- E2E Inversionista
  - Registro/inicio sin sesiÃƒÂ³n Ã¢Â†Â’ ver Landing correcta (Hero/Beneficios).
  - KYC completo Ã¢Â†Â’ estado verificado persiste; sin breadcrumbs/back en FAQ si no hay sesiÃƒÂ³n.
  - Explorar Oportunidades Ã¢Â†Â’ invertir (mÃƒÂ­n. Bs 700) Ã¢Â†Â’ al 100%: flujo marca financiada.
  - Pagos: en cada ciclo, transferencia automÃƒÂ¡tica del neto a cuenta bancaria (no hay Ã¢Â€ÂœRetirosÃ¢Â€Â ni Ã¢Â€ÂœFondos disponiblesÃ¢Â€Â).
  - Notificaciones: creaciÃƒÂ³n y lectura manual (no auto-leÃƒÂ­das).

- E2E Prestatario
  - Solicitud Ã¢Â†Â’ verificaciÃƒÂ³n de saldo deudor Ã¢Â†Â’ cÃƒÂ¡lculo gross-up segÃƒÂºn nivel (A/B/C).
  - AprobaciÃƒÂ³n Ã¢Â†Â’ fondeo Ã¢Â†Â’ desembolso dirigido al banco acreedor (no a la cuenta del prestatario).
  - AmortizaciÃƒÂ³n: generar tabla (ejecutar `sql/amortizacion.sql` y `generate_amortizacion(...)`).
  - Dashboard prestatario: CTA Ã¢Â€ÂœPago ExtraÃ¢Â€Â (registro de intenciÃƒÂ³n) y UX estable.

Siguientes pasos (opcionales)
- Pantalla de Auth: aÃƒÂ±adir botÃƒÂ³n Ã¢Â€ÂœContinuar con GoogleÃ¢Â€Â (sign-in social estÃƒÂ¡ndar).
- Header: exponer `aria-expanded`/`aria-controls` en el botÃƒÂ³n y animar a Ã¢Â€ÂœXÃ¢Â€Â al abrir.
- Apple Sign-in: planificar setup (Service ID, Team ID, Key ID, Private Key) y habilitar provider.

Nota
Este STATUS reemplaza versiones previas extensas. Mantenerlo breve y accionable a partir de ahora.


---

## Historial Ã¢Â€Â” 3 Nov 2025 (Noche)

Resumen rÃƒÂ¡pido

- KYC inversionista estable: el estado se mantiene en Ã¢Â€ÂœVerificadaÃ¢Â€Â, sin regresiones.
- Notificaciones restauradas: Toast automÃƒÂ¡tico en dashboard y badge rojo en el header.
- Cuenta bancaria: se promueve desde `verification_drafts` a `cuentas_bancarias_inversionistas` al quedar verificado.
- AuditorÃƒÂ­a OCR: se registra en `analisis_documentos` (proveedor + datos extraÃƒÂ­dos) tras la verificaciÃƒÂ³n.
- Despliegues: Supabase Functions y Vercel en producciÃƒÂ³n actualizados.

Siguiente E2E (maÃƒÂ±ana)

- Repetir flujo completo: registro Ã¢Â†Â’ verificaciÃƒÂ³n CI Ã¢Â†Â’ correo con CTA Ã¢Â†Â’ dashboard con Toast Ã¢Â†Â’ verificaciÃƒÂ³n persiste Ã¢Â†Â’ cuenta bancaria creada/actualizada Ã¢Â†Â’ oportunidades visibles.
- Validar en DB: `analisis_documentos` y `cuentas_bancarias_inversionistas` contienen filas para el usuario verificado.

---

Resumen de hoy (flujo INVERSIONISTA)

- UI Oportunidades: filtros segmentados (Tasa 10/12/15, Plazo 12/18/24) con estilos Brand Kit.
- Dashboard (src/InvestorDashboard.jsx):
  - Corrige acentos y copy. Oculta la pill cuando estado = verificado.
  - Muestra Toast de KYC automÃƒÂ¡ticamente (sin abrir menÃƒÂº).
  - Suscripciones Realtime para perfil (UPDATE) y notificaciones (INSERT).
- Header (src/components/Header.jsx):
  - Badge rojo de notificaciones restablecido.
  - Ya no marca como leÃƒÂ­das al abrir la campana; persisten hasta acciÃƒÂ³n del usuario.
- VerificaciÃƒÂ³n (supabase/functions/verificar-identidad-inversionista):
  - Idempotencia de notificaciÃƒÂ³n (solo si cambiÃƒÂ³ el estado vÃƒÂ­a UPDATE RETURNING).
  - Inserta auditorÃƒÂ­a en `analisis_documentos` (proveedor + datos extraÃƒÂ­dos).
  - Si estado = Ã¢Â€ÂœverificadoÃ¢Â€Â: upsert de cuenta bancaria desde `verification_drafts` Ã¢Â†Â’ `cuentas_bancarias_inversionistas` (por `user_id`).
- Infra: redeploy de Functions (Supabase) y deploy de producciÃƒÂ³n (Vercel).

---

Problemas abiertos (prioridad alta)

1) OCR KYC (mejora del prompt)
   - Extraer: `numero_ci`, `expiracion` (con meses literales), `candidatos_numero_ci`, `ocr_confidence`.
   - Normalizar fecha (p. ej., Ã¢Â€Âœ12 de abril de 2031Ã¢Â€Â Ã¢Â†Â’ YYYY-MM-DD) y bloquear si expiraciÃƒÂ³n vencida.

2) RevisiÃƒÂ³n manual (cuando OCR falla)
   - Encolar en `public.kyc_review_queue` (crear tabla) y agregar panel admin mÃƒÂ­nimo para aprobar/rechazar.

3) Email deliverability (unificaciÃƒÂ³n remitente)
   - Unificar remitente en funciones a `notificaciones@tuprestamobo.com` (Reply-To `contacto@tuprestamobo.com`).
   - Revisar SPF/DKIM/DMARC y supresiÃƒÂ³n en Resend.

4) AuditorÃƒÂ­a OCR (enriquecimiento)
   - Guardar tambiÃƒÂ©n: `user_id`, `tipo_documento` y `url_archivo` en `analisis_documentos` para trazabilidad completa.

---

Flujo KYC inversionista (actual)

- Upload: CI a Storage/bucket `documentos-inversionistas`; ruta guardada en `verification_drafts`.
- InvocaciÃƒÂ³n: Edge `verificar-identidad-inversionista` con `{ user_id, url_archivo, tipo_documento }`.
- FunciÃƒÂ³n:
  - URL firmada; OCR con Gemini; parseo robusto de JSON.
  - AuditorÃƒÂ­a: inserta en `analisis_documentos` (proveedor + datos extraÃƒÂ­dos).
  - Actualiza `profiles.estado_verificacion` (idempotente) y notifica (in-app + email con CTA consistente).
  - Si estado = Ã¢Â€ÂœverificadoÃ¢Â€Â: upsert de cuenta bancaria en `cuentas_bancarias_inversionistas` desde `verification_drafts`.
- Front:
  - Dashboard: Toast automÃƒÂ¡tico; Realtime; pill oculta en Ã¢Â€ÂœverificadoÃ¢Â€Â.
  - Header: badge rojo visible al haber no leÃƒÂ­das; no se auto-marcan como leÃƒÂ­das.

---

Siguiente (para maÃƒÂ±ana)

- Completar prompt OCR (expiraciÃƒÂ³n/normalizaciÃƒÂ³n/confidence) + bloqueo por vencimiento.
- DiseÃƒÂ±ar y crear `kyc_review_queue` + vista admin mÃƒÂ­nima.
- Unificar remitente emails y revisar entregabilidad en Resend.
- Enriquecer `analisis_documentos` con `user_id`/`tipo_documento`/`url_archivo`.

Notas de ConfiguraciÃƒÂ³n

- Storage: bucket privado `documentos-inversionistas` (RLS apropiadas).
- Secrets Functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `APP_BASE_URL`, `GEMINI_API_KEY`/`GOOGLE_GEMINI_API_KEY`.

Enlaces ÃƒÂºtiles

- Portafolio: `/mis-inversiones`
- Retiros: `/retiro`
- Landing Ã¢Â€ÂœQuiero InvertirÃ¢Â€Â: `/`
- Edge Functions: `verificar-identidad-inversionista`, `handle-new-solicitud`, `save-investor-lead`, `create-notification`

---

## Actualizacion Ã¢Â€Â” 7 Nov 2025 (Noche)

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



