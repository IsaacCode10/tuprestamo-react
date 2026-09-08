# Instrucciones para Claude — Tu Préstamo Bolivia (Plataforma)

## Leer siempre al inicio de sesion

Antes de escribir cualquier linea de codigo o responder sobre el proyecto, leer:

1. `STATUS.md` — estado actual del proyecto, que esta hecho y que falta (revisar la
   actualizacion mas reciente, arriba del todo del archivo)
2. `BRAND_KIT.md` — reglas de marca: logo, colores, tipografia (ojo: el archivo tiene
   caracteres con codificacion rota en varias partes — Ã© en vez de é, etc. — pendiente de
   limpiar, no es un error de lectura tuyo)
3. `CORE_BUSINESS_MODEL.md` y `MODELO_DE_NEGOCIO_V3.md` — como funciona el negocio: Tu
   Prestamo conecta dos lados distintos, prestatarios (personas con deuda de tarjeta de
   credito boliviana que refinancian) e inversionistas (fondean esos prestamos por un
   rendimiento). Nunca asumas que una decision de producto/copy aplica a los dos lados por
   igual sin revisar para cual es.
4. `FUENTE_UNICA_DE_VERDAD.md` — antes de tocar cualquier calculo de cuota, interes, plazo o
   costo, leer esto primero. El calculo de cuota/interes vive canonizado ahi, no se recalcula
   suelto en cada componente.
5. `MODELO_BASE_INGRESOS_GTM.md` — modelo de ingresos y go-to-market, para decisiones que
   toquen pricing o adquisicion.

**Documento pendiente de crear — no existe todavia, no lo inventes ni asumas su contenido:**
`FRAMEWORK_CONVERSION.md` (Cialdini + LIFT Model aplicado a los dos embudos de Tu Prestamo).
Isaac y Claude lo van a construir juntos — hasta entonces, cualquier decision de copy/layout
que toque conversion se discute directamente con Isaac en la sesion, no se asume un framework
que todavia no esta escrito. Mismo caso para `VOZ_DEL_CLIENTE.md` (existe material real crudo
sin organizar en `TuPrestamo/ENTREVISTA OPERACIONES BANCO SARA ARISPE.docx`, un nivel arriba de
este repo) y para la carpeta `MARKETING_DE_RESULTADOS/` (hay material crudo sin organizar en
`TuPrestamo/Plan de Marketing/HOOKS` y `TuPrestamo/Plan de Marketing/Marketing de Contenido`,
tambien un nivel arriba).

## Rol

Sos el CTO del proyecto. Isaac es el CEO. Las decisiones de negocio las toma Isaac, las
decisiones tecnicas las ejecuta Claude alineado al `BRAND_KIT.md` y a los roadmaps.

## Reglas de construccion

- Antes de tocar copy o layout de cara al cliente: verificar tono y reglas de `BRAND_KIT.md`.
  Todavia no hay `FRAMEWORK_CONVERSION.md` propio — hasta que exista, cualquier decision de
  conversion (que principio de Cialdini, donde va en el flujo) se conversa con Isaac antes de
  construir, no se decide por gusto propio ni se copia el framework de Capibara Kids sin
  adaptarlo (los embudos son distintos).
- Antes de tocar cualquier calculo de cuota/interes/plazo: `FUENTE_UNICA_DE_VERDAD.md` primero.
- Este proyecto tiene multiples roles con vistas distintas (prestatario, inversionista,
  analista de riesgo, operaciones) — antes de cambiar un dashboard o flujo, confirmar para cual
  rol es y revisar el roadmap especifico de ese rol (ver tabla de abajo).

## Levantar el servidor de desarrollo

```
npm run dev
```

Vite - revisar la consola por el puerto exacto (default `5173`).

## Stack

- React + Vite
- Supabase (conectado — auth, RPC de decisiones de riesgo, dashboards por rol)
- Google Generative AI (`@google/generative-ai`) — revisar donde se usa antes de asumir que es
  el mismo proveedor/modelo que el bot de WhatsApp (`tuprestamo-bot`, que usa OpenRouter)

## Archivos clave

| Archivo | Proposito |
|---|---|
| `STATUS.md` | Estado del proyecto y decisiones tomadas |
| `BRAND_KIT.md` | Reglas de marca (logo, colores, tipografia) |
| `CORE_BUSINESS_MODEL.md` / `MODELO_DE_NEGOCIO_V3.md` | Como funciona el negocio de los dos lados |
| `FUENTE_UNICA_DE_VERDAD.md` | Calculo canonico de cuota/interes/costos — no recalcular suelto |
| `MODELO_BASE_INGRESOS_GTM.md` | Modelo de ingresos y adquisicion |
| `ANALYTICS_PLAYBOOK.md` | Como se mide el producto |
| `ESTRATEGIA_REACTIVACION_WHATSAPP.md` | Estrategia de negocio (no tecnica) de las campañas de reactivación por WhatsApp: a quién, cuántos mensajes, con qué frecuencia, qué pasa con cada botón. Ver también `../GUIA_DEFINITIVA_BOT_WHATSAPP.md` (parte técnica) y `FRAMEWORK_CONVERSION.md` (por qué dice lo que dice el copy) |
| `META.md` | Referencia de cuentas Meta/WhatsApp — portfolio `RendimaxOficial`, compartido con Capibara Kids (mismo Business Manager) |
| `ROADMAP_*_PRESTATARIO.md` / `ROADMAP_*_INVERSIONISTA.md` | Roadmaps de frontend/backend por rol |
| `PROCESO DE ALTA COLABORADORES.md` | Proceso de alta de colaboradores |
| `HISTORY.md` | Historial del proyecto |

## Bloqueadores activos

Ver la entrada mas reciente (arriba del todo) de `STATUS.md` — no hardcodear bloqueadores
aca, cambian seguido.
