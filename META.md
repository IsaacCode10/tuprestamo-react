# Meta (Facebook/WhatsApp/Instagram) — Referencia operativa

Documento de referencia para todo lo que tocamos en el ecosistema de Meta: cuentas, WhatsApp
Business, catálogo, Píxel, plantillas. Objetivo: no tener que re-descubrir la arquitectura de
cuentas ni los pasos cada vez — esto se armó después de perder tiempo real con la conexión del
catálogo (ver sección "Lecciones aprendidas" abajo).

Original armado en el proyecto `capibara-kids-ecommerce`, copiado acá porque la misma cuenta
de Meta (RendimaxOficial) se usa para más de un negocio.

---

## 1. Arquitectura de cuentas — la parte confusa

Capibara Kids usa **dos portfolios comerciales distintos** de Meta, no uno solo. Esto no es un
error, es cómo quedó armado, y hay que tenerlo siempre presente:

| Portfolio | Qué vive ahí | Por qué |
|---|---|---|
| **RendimaxOficial** | La cuenta de WhatsApp Business (WABA) de Capi, las plantillas de mensaje, el catálogo de productos conectado a WhatsApp | Cuando se armó el bot no había más portfolios disponibles para crear uno nuevo dedicado a Capibara Kids |
| **capibarakidsbolivia** | Instagram (@capibarakidsbolivia), la Página de Facebook "Capibara Kids" | Se creó por separado, es la identidad social "oficial" de la marca |

**Regla práctica: todo lo que sea específicamente de WhatsApp (catálogo, plantillas, número,
configuración del WABA) se hace parado en el portfolio RendimaxOficial.** Instagram, la Página
de Facebook y el Píxel pueden seguir donde están, no hace falta moverlos.

**Confirmado (2026-09-07): el bot de Tu Préstamo (Sofía) también vive bajo el portfolio
RendimaxOficial** — la cuenta de WhatsApp aparece ahí como "Tu Prestamo Bolivia", separada de
la de Capibara Kids. Mismo portfolio, dos cuentas de WhatsApp distintas.

### Identificadores clave (Tu Préstamo)

| Qué | Valor |
|---|---|
| Cuenta de WhatsApp Manager | "Tu Prestamo Bolivia" |
| ID visible en la URL de WhatsApp Manager (Plantillas de mensajes) | `575867435405537` |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` | en `tuprestamo-bot/.env.local` y en los secrets de Supabase del proyecto `paijuvlccnkxjwjpoffe` (no se listan acá, son credenciales) |

### Identificadores clave (Capibara Kids)

| Qué | Valor |
|---|---|
| WABA (WhatsApp Business Account) de Capi | `1510718187474528` — propiedad de RendimaxOficial |
| Número de Capi (el bot) | `+591 69915633` (`WA_BOT_NUMBER` en `src/config.js`) |
| Número de soporte de Isaac | `59178271936` (`WA_NUMBER` en `src/config.js`) |
| Píxel de Meta ("Capibara Kids Web") | `1796455668012937` — usado en `index.html` (fbq init) |
| Instagram | @capibarakidsbolivia |

---

## 2. Links directos

| Herramienta | Link | Para qué |
|---|---|---|
| WhatsApp Manager | `business.facebook.com/wa/manage/home/` | Plantillas, catálogo conectado, número, estadísticas |
| Commerce Manager | `business.facebook.com/commerce/` | Crear/editar catálogos de productos |
| Configuración del negocio | `business.facebook.com/settings/` | Usuarios, socios, activos comerciales, permisos |
| Meta Business Suite | `business.facebook.com/` | Vista general, Página de Facebook, Instagram |

En WhatsApp Manager, el selector de cuenta arriba a la derecha ("Capibara Kids ▾") es distinto
al selector de portfolio de arriba a la izquierda — si algo no aparece, revisar los dos.

---

## 3. Cómo crear/editar un catálogo de productos de WhatsApp

**Regla de oro (aprendida a las malas, ver sección 5): el catálogo tiene que crearse
DIRECTAMENTE parado en el portfolio dueño del WABA (RendimaxOficial para Capibara Kids).
Compartirlo desde otro portfolio como socio NO alcanza para que WhatsApp Manager lo pueda
conectar, aunque Commerce Manager sí muestre acceso válido.**

Pasos:

1. Cambiar el portfolio arriba a la izquierda al que sea dueño del WABA que corresponda.
2. Ir a **Commerce Manager** (`business.facebook.com/commerce/`).
3. Crear catálogo nuevo → tipo **"Productos online"** (ojo: esto no se puede cambiar después).
4. "Conectar con una plataforma de socios" → dejar **apagado** si se cargan los productos a
   mano (pocos productos).
5. Portfolio comercial: confirmar que sea el correcto (dueño del WABA).
6. En "Conectar con seguimiento": conectar el píxel de Meta correspondiente si aparece.
7. En "Subir productos" → **"Agregar los productos manualmente"** para pocos productos, o
   "Conectar con una lista de datos" si son muchos y se van a actualizar seguido.
8. El aviso de "agregá al menos 5 productos" es solo para anuncios de catálogo Advantage+ — no
   hace falta si el objetivo es solo mostrar el catálogo en WhatsApp.
9. Volver a **WhatsApp Manager → Catálogo → "Elegir un catálogo"** — ahí debería aparecer, ya
   parado en el portfolio correcto de punta a punta.

---

## 4. Plantillas de mensaje de WhatsApp (templates) — ejemplo Capibara Kids

| Plantilla | Categoría | Nota |
|---|---|---|
| `cupon_referido` | Marketing (reclasificada por Meta) | Apelación enviada, revisión hasta 21 oct 2026 |
| `pedido_resena` | Utilidad | Sin problemas |
| `referido_nivel` | Marketing (reclasificada por Meta) | Apelación enviada, revisión hasta 21 oct 2026 |
| `nuevo_comprobante` | — | Activa |

**Sobre la reclasificación a "Marketing":** Meta puede recategorizar una plantilla de Utilidad a
Marketing si considera que el contenido es promocional (ej. avisar sobre un cupón ganado).
Cuesta más por conversación y tiene reglas de entrega más estrictas. Se puede apelar desde
WhatsApp Manager → Plantillas → Actualizaciones de la categoría → seleccionar → "Solicitar
revisión", con una explicación de por qué el mensaje es informativo sobre algo que ya pasó
(una compra, un pago), no publicidad no solicitada.

---

## 5. Lecciones aprendidas (para no repetir el mismo lío)

- **Compartir un catálogo entre portfolios (Configuración del negocio → Socios → "Otorgar a un
  socio acceso a tus activos") funciona para Commerce Manager, pero NO alcanza para que
  WhatsApp Manager pueda conectar ese catálogo a un WABA que pertenece a otro portfolio.**
  Se probó dos veces, con acceso confirmado ("Acceso total" en Socios, productos visibles sin
  error desde el negocio que recibió el permiso), y WhatsApp Manager seguía sin encontrarlo un
  día después. La solución real: crear el catálogo directo parado en el portfolio dueño del
  WABA, no compartirlo desde otro lado.
- **Las etiquetas de Twitter Card no sirven de mucho si no hay cuenta de Twitter/X activa** —
  WhatsApp (el canal que suele importar más en Bolivia) usa Open Graph para las vistas previas
  de links, no Twitter Card.
- **El selector de cuenta de WhatsApp Manager (arriba a la derecha) es distinto al selector de
  portfolio comercial (arriba a la izquierda)** — confundirlos genera errores de "no tenés
  acceso" que en realidad son de navegación, no de permisos reales.
