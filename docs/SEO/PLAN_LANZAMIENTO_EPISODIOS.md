# Plan de Lanzamiento de Episodios — Finanzas de Isaac

Este documento define **canales y orden**, no copys (esos se redactan aparte, en otra
herramienta). Se repite para cada episodio nuevo de la serie.

---

## Canales disponibles

| Canal | Rol | Notas |
|---|---|---|
| Sitio propio | Base | Footer → hub `/finanzas-de-isaac` → episodio. Automático, no requiere acción manual por episodio. |
| Email (`blog_suscriptores`) | Exclusividad | Se avisa **antes** que en redes — es el incentivo de haberse suscripto. Pendiente conectar envío real (Brevo). |
| Facebook | Difusión | Link directo al artículo. |
| Instagram | Difusión | El feed no permite link clickeable — usar "link en bio" o Story con sticker de link. |
| LinkedIn | Autoridad/fundador | Link directo, tono más profesional (perfil de Isaac como fundador). |
| TikTok | Alcance nuevo | **No es un canal de "compartir artículo"** — requiere adaptar a video corto (30-60s) contando un fragmento de la historia, con CTA a "link en la bio" para leer completo. |

---

## Orden de lanzamiento recomendado

1. **Publicar** el artículo (`publicado = true`) y verificar que cargue en producción (no solo localhost).
2. **Email** a la lista de `blog_suscriptores` — primero que nadie, antes de redes.
3. **Redes sociales** (mismo día o al día siguiente del email):
   - LinkedIn
   - Facebook
   - Instagram (feed + story)
   - TikTok (video corto, se puede publicar con un poco más de margen ya que requiere producción de video)
4. **UTM por canal**, para poder medir en Mixpanel qué canal trae más lectores y cuál convierte mejor. Formato sugerido:
   - `?utm_source=instagram&utm_medium=social&utm_campaign=episodio-0`
   - `?utm_source=facebook&utm_medium=social&utm_campaign=episodio-0`
   - `?utm_source=linkedin&utm_medium=social&utm_campaign=episodio-0`
   - `?utm_source=email&utm_medium=newsletter&utm_campaign=episodio-0`
   - TikTok no soporta bien UTM en bio — aceptar que ese canal se mide más por alcance/video views que por clics medibles.

---

## Checklist de lanzamiento (repetir por episodio)

- [ ] Artículo publicado y verificado en producción
- [ ] Email enviado a `blog_suscriptores`
- [ ] Post en Facebook (con UTM)
- [ ] Post/Story en Instagram (con UTM)
- [ ] Post en LinkedIn (con UTM)
- [ ] Video en TikTok (link en bio)
- [ ] A las 48h: revisar en Mixpanel qué canal trajo más tráfico/conversión, y anotarlo abajo

## Resultados por episodio (completar después de cada lanzamiento)

| Episodio | Canal con más tráfico | Canal con mejor conversión | Notas |
|---|---|---|---|
| 0 | — | — | — |
