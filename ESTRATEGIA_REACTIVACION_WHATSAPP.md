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

## 3. Los dos segmentos activos

| | **Frío** (`reactivacion_solicitud_fria`) | **Caliente** (`reactivacion_solicitud_caliente`) |
|---|---|---|
| **Quién es** | Empezó el formulario de solicitud (dejó nombre + email + celular) pero nunca lo terminó | Terminó toda la solicitud, pero nunca entró a su cuenta/dashboard |
| **Tabla de origen** | `solicitudes_parciales` | `solicitudes` |
| **Nivel de compromiso** | Bajo — recién está conociendo el producto | Alto — ya mandó CI, ingresos, deuda, todo |
| **Objetivo del mensaje** | Que termine el formulario | Que active su cuenta y vea el estado |
| **Botones** | "Por el formulario" / "Sigo por WhatsApp" | "Entrar a mi cuenta" / "Que me llame un asesor" |
| **Espera antes de mandar** | 6 horas sin actividad | 6 horas sin actividad |

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

## 5. Corte de fecha (no negociable, decisión explícita de Isaac)

Ninguna de las dos campañas toca datos de antes del **2026-09-07**. Un lead viejo que
llenó el formulario a medias en julio, por ejemplo, **nunca** va a recibir este mensaje —
el filtro de fecha está hardcodeado en el código de las dos Edge Functions
(`FECHA_CORTE`), no es un flag que se pueda desactivar sin tocar el código a propósito.

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

## 8. Decisiones de negocio tomadas (registro, no repetir la discusión)

- 2026-09-07: WhatsApp en vez de (o adicional a) email para reactivación — el copy de
  bienvenida del formulario web sigue mencionando "atento a tu correo", pendiente de
  actualizar cuando se confirme que el canal WhatsApp funciona.
- 2026-09-07: un solo mensaje por persona, sin secuencia — decisión explícita de simpleza
  para el MVP, revisar si hace falta más adelante.
- 2026-09-07: nunca tocar leads de antes de la fecha de lanzamiento de esta campaña.
- 2026-09-07: "que me llamen" en vez de "llamar" — nadie quiere llamar, sí quieren que los
  llamen (decisión de copy con impacto directo en el diseño técnico de los botones).

## 9. Pendiente / próximos pasos

- [ ] Confirmar aprobación de las 2 plantillas en Meta (estado `PENDING` al momento de
      escribir esto).
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

## 10. Referencias

- Cómo está construido técnicamente: `../GUIA_DEFINITIVA_BOT_WHATSAPP.md`, Parte 10
  (patrón general) y 10.7/10.8 (lecciones de estructura de plantillas y de auth).
- Por qué dice lo que dice cada mensaje: `FRAMEWORK_CONVERSION.md` (Cialdini/LIFT).
- Código real: `supabase/functions/send-reactivacion-fria`,
  `supabase/functions/send-reactivacion-caliente` (este repo), y
  `tuprestamo-bot/src/app/api/webhook/route.ts` (manejo de los botones).
