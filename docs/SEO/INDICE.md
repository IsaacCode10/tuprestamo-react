# SEO — Índice Maestro

Carpeta central de inteligencia SEO para Tu Préstamo Bolivia.

---

## Documentos de Estrategia

| Documento | Descripción |
|---|---|
| [ARQUITECTURA_SEO_ESCALABLE.md](ARQUITECTURA_SEO_ESCALABLE.md) | Estructura de herramientas, blog y hubs |
| [GUIA_CONTENIDO_IA_SEO.md](GUIA_CONTENIDO_IA_SEO.md) | Reglas editoriales para contenido con IA |
| [CALENDARIO_EPISODIOS.md](CALENDARIO_EPISODIOS.md) | Calendario y checklist de episodios de "14 Años con la Tarjeta" (cada 15 días) |
| [PLAN_LANZAMIENTO_EPISODIOS.md](PLAN_LANZAMIENTO_EPISODIOS.md) | Canales y orden de difusión por episodio (FB/IG/LinkedIn/TikTok/email) — sin copys |

---

## Auditorías

### Cadencia recomendada

Las empresas que ejecutan bien SEO separan dos tipos de revisión:

- **Pulso mensual** (30 min): Search Console, páginas indexadas, keywords en movimiento, errores nuevos. No es un análisis profundo — es un chequeo de signos vitales.
- **Auditoría trimestral** (2-3 hs): análisis completo técnico + keywords + competencia + contenido. De esta auditoría salen los accionables del próximo trimestre.

Para la etapa actual de Tu Préstamo, donde el sitio es joven y se construye activamente, hacer **pulso mensual + auditoría completa cada 3 meses** es el balance correcto.

### Historial

| Fecha | Tipo | Score SEO | Páginas indexadas | Artifact | Archivo |
|---|---|---|---|---|---|
| Julio 2026 | Baseline (completa) | 3/10 | 1 | [Ver reporte](https://claude.ai/code/artifact/f11aa1e8-1fd9-48d3-803f-1b837d3eee49) | [2026-07_baseline.md](auditorias/2026-07_baseline.md) |

### Accionables abiertos

Items pendientes de implementar del último ciclo. Tildar aquí cuando se completen.

- [ ] Verificar tuprestamobo.com en Google Search Console y enviar sitemap
- [ ] Registrar Google Analytics 4
- [ ] Corregir title tag: "Refinanciá tu Tarjeta de Crédito en Bolivia | Tu Préstamo"
- [ ] Agregar meta description al homepage
- [ ] Agregar H1 visible al homepage
- [ ] Agregar Schema.org (FinancialProduct + Organization) en JSON-LD
- [ ] Crear 4–5 páginas de contenido SEO (blog o recursos)
- [ ] Correr Google Keyword Planner desde cuenta boliviana para volúmenes reales
- [ ] Evaluar Google Search Ads en keywords de alta intención / baja competencia

---

## Cómo agregar una auditoría nueva

1. Copiar `auditorias/PLANTILLA_AUDITORIA.md`
2. Renombrar como `YYYY-MM_tipo.md` (ej: `2026-10_trimestral.md`)
3. Completar cada sección con los datos reales de Search Console
4. Crear el artifact visual si es auditoría completa (trimestral)
5. Agregar una fila al historial de arriba
6. Mover los items completados del período anterior a "Resueltos" en el archivo de auditoría anterior
7. Actualizar "Accionables abiertos" en este índice
