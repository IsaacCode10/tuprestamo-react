# Estrategia de Reactivación por WhatsApp — Tu Préstamo

Documento de **negocio**, no técnico — para eso está `GUIA_DEFINITIVA_BOT_WHATSAPP.md`
(secciones 10 a 10.8, un nivel arriba de este repo, compartida con Capibara Kids). Acá se
responde "qué hacemos, a quién, cuánto, y por qué" — no "cómo está construido en código".
El copy en sí se rige por `FRAMEWORK_CONVERSION.md` (Cialdini/LIFT). Este documento conecta
los dos: qué campaña existe, y qué reglas de negocio aplica.

---

## 1. Objetivo

Recuperar leads del funnel de prestatario que dejaron algo a medio camino, usando WhatsApp
en vez de email — decisión de fondo: en Bolivia la gente revisa WhatsApp mucho más que el
correo, y el email de bienvenida/activación se estaba perdiendo (ver `STATUS.md`,
actualización 2026-09-07 por la mañana, sobre el mensaje de éxito del formulario que
todavía dice "atento a tu correo").

## 2. Cómo funciona, en una frase

**Un robot revisa la base cada 30 minutos, y a cada persona que califica le manda
exactamente UN mensaje de WhatsApp, una sola vez — nunca una secuencia de varios toques.**

Esto es una decisión deliberada, no una limitación que vayamos a corregir: mismo criterio
que usa Capibara Kids en sus propios flujos de reactivación ("arranca simple a propósito:
nada de secuencia de varios toques"). Si un solo mensaje no alcanza, se decide agregar un
segundo toque más adelante, no se asume de entrada.

## 3. Los tres segmentos activos

| | **Frío** (`reactivacion_solicitud_fria`) | **Caliente** (`reactivacion_solicitud_caliente`) | **Documentos** (`reactivacion_solicitud_documentos`) |
|---|---|---|---|
| **Quién es** | Empezó el formulario de solicitud (dejó nombre + email + celular) pero nunca lo terminó | Terminó toda la solicitud, pero nunca entró a su cuenta/dashboard | Solicitud aprobada, ya activó su cuenta y subió al menos 1 documento, pero no todos los requeridos |
| **Tabla de origen** | `solicitudes_parciales` | `solicitudes` | `solicitudes` + `documentos` |
| **Nivel de compromiso** | Bajo — recién está conociendo el producto | Alto — ya mandó CI, ingresos, deuda, todo | **El más alto de los tres** — ya cruzó el filtro del scorecard y ya empezó a subir papeles |
| **Objetivo del mensaje** | Que termine el formulario | Que active su cuenta y vea el estado | Que termine de subir los documentos que le faltan |
| **Botones** | "Por el formulario" / "Sigo por WhatsApp" | "Entrar a mi cuenta" / "Que me llame un asesor" | "Termino por WhatsApp" / "Termino por la web" / "Necesito ayuda" |
| **Espera antes de mandar** | 6 horas sin actividad | 6 horas sin actividad | 6 horas desde la **última subida real** de documento (no desde que se creó la solicitud) |

## 4. Cadencia y volumen — la pregunta clave

- **Frecuencia de revisión**: cada 30 minutos (`pg_cron`), corriendo ya mismo en producción
  — no hace falta activar nada manualmente.
- **Espera antes del primer envío**: 6 horas desde la última actividad de esa persona.
- **Cuántos mensajes recibe cada persona**: **uno solo, para siempre.** Una vez enviado, se
  marca (`contactado_at` en `solicitudes_parciales`, `reactivacion_enviada_at` en
  `solicitudes`) y esa persona **nunca vuelve a entrar en la selección**, aunque sigan
  pasando los 30 minutos de revisión. No hay reintento, no hay recordatorio de
  seguimiento, no hay un segundo mensaje si no contesta.
- **Automático desde la aprobación de Meta**: en cuanto una plantilla pasa a estado
  `APPROVED`, el próximo ciclo de 30 minutos ya la usa — no hace falta ningún paso manual
  para "prender" el envío. Mientras la plantilla esté en `PENDING`, el envío falla
  silenciosamente (queda registrado en los logs de la Edge Function) y esa persona sigue
  disponible para el próximo intento una vez aprobada.

## 5. Corte de fecha + whitelist retroactiva (revisado 2026-09-08)

Regla general: ninguna de las dos campañas toca datos de antes del **2026-09-07** — el
filtro de fecha (`FECHA_CORTE`) sigue hardcodeado en las Edge Functions, no es un flag que
se pueda desactivar sin querer.

**Excepción explícita:** el 2026-09-08 Isaac revisó **todo el historial de solicitudes**
de `prestatario` (ver tabla completa abajo, sección 8.1) y aprobó incluir a **2 personas
puntuales de antes del corte** en la campaña caliente, vía la columna
`solicitudes.incluir_reactivacion_retroactiva` (nunca moviendo la fecha de corte general,
para no colar a nadie que no se revisó uno por uno):
- **Jose Antonio Ayala Marmañaz** (ID 247) — pre-aprobado, nunca contestó los mensajes.
- **Eva López Mamani** (ID 254) — pre-aprobado, tiene tarjeta de crédito real, nunca subió
  ningún documento (nunca activó su cuenta).

Mismo criterio, columna separada (`incluir_reactivacion_documentos_retroactiva` — a
propósito distinta de la de arriba, para que nadie califique para dos campañas por error)
para el segmento de documentos incompletos:
- **Adelia Ari Quispe** (ID 263) — ya subió 3 documentos.
- **Luis Brian Equilea Belzu** (ID 269) — ya subió 2 documentos.

## 6. Costo

Meta cobra por conversación iniciada por el negocio con plantillas categoría `MARKETING`
(a diferencia de las respuestas del bot dentro de la ventana de 24hs, que son gratis hasta
el límite del plan). Cada mensaje de reactivación enviado consume ese costo — al ser un
solo mensaje por persona (no una secuencia), el gasto es proporcional a cuánta gente
abandona el formulario o no activa su cuenta, no se multiplica por reintentos.

## 7. Qué pasa cuando tocan cada botón (en términos de negocio, no de código)

- **"Por el formulario"** → Sofía le manda el link para retomar el formulario público.
- **"Sigo por WhatsApp"** → arranca la conversación normal de calificación de Sofía, como
  si hubiera escrito por su cuenta.
- **"Entrar a mi cuenta"** → Sofía le genera un acceso directo y personal a su cuenta (un
  link de un solo uso, no una contraseña que tenga que recordar o crear).
- **"Que me llame un asesor"** → Sofía le confirma que alguien lo va a llamar, **y le llega
  un WhatsApp a Isaac en el momento** con el nombre y teléfono para que haga la llamada.
  Ninguna opción hace que el cliente tenga que llamar a nadie.
- **"Termino por WhatsApp"** → Sofía le va pidiendo, un documento a la vez, que mande la
  foto o el PDF de cada uno que le falta — quedan guardados en el mismo lugar que si los
  hubiera subido desde la web, el analista de riesgo los ve igual.
- **"Termino por la web"** → mismo mecanismo de link de acceso directo, pero apuntado
  directo a la pantalla de subida de documentos de su dashboard (no a la pantalla de "creá
  tu contraseña", porque esta persona ya activó su cuenta antes).
- **"Necesito ayuda"** → Sofía le confirma que un asesor lo va a ayudar, **y le llega un
  WhatsApp a Isaac con el detalle exacto de qué documentos le faltan** — para que la ayuda
  sea útil desde el primer mensaje, no tenga que preguntar de cero.

## 8.1 Revisión completa del historial (2026-09-08) — registro para no repetir el análisis

Isaac revisó cada solicitud de `prestatario` existente antes del corte para decidir quién
entra retroactivamente. Resultado, para no repetir la discusión si alguien pregunta "¿por
qué a este sí y a este no?":

**Excluidos definitivamente de esta campaña:**
- IDs 213, 217, 218, 221-236, 244, 245, 246, 258, 260 — prueba interna de Isaac (mismo
  patrón de emails ya identificado en el análisis de Mixpanel).
- IDs 264, 266, 268, 270 (Luis Zenón Segundo Padilla) — CI duplicada reaplicando con datos
  alterados cada vez, tratado como intento de fraude (ver
  `docs/MANUAL_ANALISTA_RIESGO.md` sección 6). Marcados `rechazado`.
- IDs 255, 256 (Ángela Linda Paz Núñez) — duplicado real (error de tipeo, no fraude), pero
  contactada por Isaac y descartada: no entendió la propuesta de valor. Marcados `rechazado`.
- ID 216 (Saith Ricaldez) y 249 (Emiliano Ballejos) — no tienen tarjeta de crédito, no son
  público objetivo (249 además es amigo de Isaac).
- ID 220 (Angel Miranda) — rechazado. **Regla general: nunca se reactiva a un rechazado con
  estas plantillas** — ambas asumen que hay una cuenta/oferta esperando, lo cual sería falso
  para alguien ya rechazado. Ver nota abajo sobre una posible campaña futura distinta para
  este caso.
- ID 241 (Davy) y 250 (Rodrigo Fernando) — amigos de Isaac / no tienen tarjeta de crédito.
- ID 257 (Anatalia Monteiro) — número no boliviano. **Regla de seguridad de Isaac: solo se
  aceptan solicitudes de números de teléfono bolivianos**, sin excepción.
- ID 261 (Adhemar Alan Rodo Sosa) — el lead más avanzado (único con documentación 100%
  completa), pero **excluido a propósito de la automatización**: está en manejo manual
  directo de Isaac (pendiente de constituir la SRL para poder pedir el servicio de
  INFOCRED y cerrar su análisis). No tiene sentido que Sofía le escriba en paralelo.

**Incluidos retroactivamente** (ver sección 5): IDs 247 y 254.

**Tercer segmento identificado y construido (2026-09-08):**
- ID 263 (Adelia Ari Quispe, 3 documentos subidos) y ID 269 (Luis Brian Equilea Belzu, 2
  documentos subidos) — **ya activaron su cuenta y ya subieron algo, pero no completaron
  todos los documentos requeridos.** Ninguna de las 2 plantillas anteriores les quedaba
  bien ("Entrá a tu cuenta" no aplica si ya entraron, "Terminá el formulario" tampoco si el
  formulario ya está hecho) — de ahí salió la tercera plantilla,
  `reactivacion_solicitud_documentos` (ver sección 3), incluidos retroactivamente arriba.

## 8. Decisiones de negocio tomadas (registro, no repetir la discusión)

- 2026-09-07: WhatsApp en vez de (o adicional a) email para reactivación — el copy de
  bienvenida del formulario web sigue mencionando "atento a tu correo", pendiente de
  actualizar cuando se confirme que el canal WhatsApp funciona.
- 2026-09-07: un solo mensaje por persona, sin secuencia — decisión explícita de simpleza
  para el MVP, revisar si hace falta más adelante.
- 2026-09-07: nunca tocar leads de antes de la fecha de lanzamiento de esta campaña.
- 2026-09-07: "que me llamen" en vez de "llamar" — nadie quiere llamar, sí quieren que los
  llamen (decisión de copy con impacto directo en el diseño técnico de los botones).
- 2026-09-08: la 3ra plantilla ofrece 3 caminos, no 2 — además de la elección de canal
  (WhatsApp vs. web), se suma "Necesito ayuda" para quien no se frenó por preferencia sino
  por no entender el trámite. No se lo manda al mismo flujo guiado (probablemente se
  vuelva a frenar igual) sino a ayuda humana directa, mismo patrón que "que me llame un
  asesor".
- 2026-09-08: el link de "seguir por la web" para alguien que YA activó su cuenta antes va
  directo al dashboard, no a la pantalla de crear contraseña — esa pantalla es solo para la
  primera activación (ver `GUIA_DEFINITIVA_BOT_WHATSAPP.md` 10.8).

## 9. Pendiente / próximos pasos

- [ ] Confirmar aprobación de las 3 plantillas en Meta (`PENDING` al momento de escribir
      esto) — falta crear `reactivacion_solicitud_documentos` en el editor de Meta con el
      copy y los 3 botones de la sección 3.
- [ ] Probar el flujo guiado de subida por WhatsApp con un caso real antes de confiar en
      él del todo — está construido y deployado, pero nunca corrió con un archivo real de
      un cliente (descarga de media de Meta + Storage + `documentos`).
- [ ] Medir en Mixpanel/CRM del bot cuántos de los mensajes de reactivación efectivamente
      convierten (terminan el formulario / activan la cuenta) — todavía no hay un evento
      dedicado para esto, evaluar si hace falta.
- [ ] Decidir si un segundo toque (a las 24/48hs) suma o resta, una vez que haya datos
      reales del primer mensaje.
- [ ] Actualizar el mensaje de éxito del formulario (`LoanRequestForm.jsx`) para no decir
      solo "atento a tu correo" si WhatsApp termina siendo el canal principal.
- [ ] Aplicar el mismo patrón de estrategia a otros segmentos si surgen (ej. inversionistas
      que dejaron el formulario de interés a medias) — documentar acá, no crear un tercer
      lugar disperso.
- [ ] **Campaña futura separada para rechazados** (no estas plantillas): el correo
      automático de rechazo ya promete "intentá de nuevo en unos meses" pero nadie lo
      recontacta de verdad. Evaluar una plantilla honesta tipo "¿tu situación cambió?"
      mandada varios meses después del rechazo — nunca reusar las plantillas actuales para
      esto, asumen una cuenta/oferta activa que un rechazado no tiene.
- [ ] Arreglar `normalizarWhatsapp()` (le antepone "591" a cualquier número que no empiece
      así) antes de que algún número no boliviano vuelva a colarse en el flujo — hoy no es
      urgente porque la regla es no aceptar números no bolivianos, pero es un bug latente
      si esa regla se relaja alguna vez.

## 10. Referencias

- Cómo está construido técnicamente: `../GUIA_DEFINITIVA_BOT_WHATSAPP.md`, Parte 10
  (patrón general) y 10.7/10.8 (lecciones de estructura de plantillas y de auth).
- Por qué dice lo que dice cada mensaje: `FRAMEWORK_CONVERSION.md` (Cialdini/LIFT).
- Código real: `supabase/functions/send-reactivacion-fria`,
  `supabase/functions/send-reactivacion-caliente`,
  `supabase/functions/send-reactivacion-documentos` (este repo), y
  `tuprestamo-bot/src/app/api/webhook/route.ts` +
  `tuprestamo-bot/src/lib/whatsapp.ts` (manejo de los botones y descarga de archivos).
