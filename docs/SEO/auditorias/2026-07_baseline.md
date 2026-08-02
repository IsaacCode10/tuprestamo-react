# Auditoría SEO — Julio 2026 (Línea Base)

**Tipo:** Auditoría completa — BASELINE (primera auditoría, sin período anterior)  
**Fecha:** 2026-07-06  
**Realizada por:** Isaac Alfaro + CTO (Claude)  
**Artifact visual:** [Ver reporte completo](https://claude.ai/code/artifact/f11aa1e8-1fd9-48d3-803f-1b837d3eee49)

---

## 1. Métricas del período

Esta es la auditoría de línea base. No hay período anterior para comparar.
Los datos de Search Console y Analytics estarán disponibles a partir de la próxima auditoría (una vez que se configuren — ver accionables).

| Métrica | Baseline (Julio 2026) |
|---|---|
| Páginas indexadas en Google | **1** (solo homepage) |
| Meta description | **Ausente** |
| H1 en homepage | **No detectado** |
| Schema.org | **Ausente** |
| Google Search Console | **Sin verificar** |
| Google Analytics 4 | **Sin configurar** |
| Backlinks externos (estimado) | **0–10** |
| Score SEO general | **3 / 10** |

---

## 2. Mercado y contexto (solo baseline)

| Dato | Valor | Fuente |
|---|---|---|
| Tarjetas de crédito activas en Bolivia | +300,000 | Linkser (vía Isaac Alfaro) |
| Créditos refinanciados en 2024 | 57,000 | ASFI |
| Mora sistema financiero boliviano | 3.2% (fin 2024) | ASFI |
| Usuarios de internet en Bolivia | ~8.2 millones | Estimación 2026 |
| Fintechs bolivianas en el mismo nicho | **0** | Búsqueda directa julio 2026 |

---

## 3. Keywords identificadas

| Keyword | Intención | Vol. est. /mes (BO) | Competencia | Prioridad |
|---|---|---|---|---|
| refinanciar tarjeta crédito Bolivia | Transaccional | 50–200 | Baja | Muy alta |
| refinanciamiento tarjeta crédito Bolivia | Transaccional | 50–150 | Baja | Muy alta |
| préstamos online Bolivia | Comercial | 500–1,200 | Media | Alta |
| cómo pagar deuda tarjeta crédito | Informacional | 200–600 | Media | Alta |
| reprogramar deuda tarjeta Bolivia | Transaccional | 100–400 | Media (bancos) | Alta |
| tasas tarjeta crédito Bolivia | Informacional | 200–500 | Media (bancos) | Alta |
| fintech Bolivia préstamo | Informacional | 100–300 | Baja | Alta |
| crédito rápido Bolivia | Comercial | 300–800 | Media | Media |

**Nota:** Volúmenes son estimaciones calibradas. Para datos exactos: configurar Google Keyword Planner con cuenta boliviana.

---

## 4. Hallazgos

### Críticos

- **Sin Google Search Console verificado** → Google no reporta qué keywords generan impresiones ni clics. Sin esto, las próximas auditorías no tendrán datos reales.
- **Sin meta description** → Google genera su propio snippet automático, que puede no representar el producto correctamente.
- **Sin H1 en el homepage** → La señal semántica más básica para Google sobre el tema de la página está ausente.

### Altos

- **Solo 1 página indexada** → El sitio no tiene páginas de contenido (blog, herramientas, FAQ) que capturen búsquedas informacionales. Todo el potencial SEO está comprimido en el homepage.
- **Sin Schema.org** → Google no puede leer el producto semánticamente (FinancialProduct, Organization). Se pierden posibles rich snippets.
- **Title tag mejorable** → "Tu Préstamo Bolivia — Refinanciá e Invertí" no incluye la keyword de producto con intención de búsqueda.

### Medios

- **Sin backlinks externos** → Dominio joven sin autoridad acumulada. El contenido de calidad y presencia en medios bolivianos puede resolver esto gradualmente.
- **Sin blog / contenido educativo** → Las búsquedas informacionales (la mayoría del volumen) no tienen dónde aterrizar.

### Positivos

- HTTPS activo
- Mobile responsive (React app)
- Cero competencia fintech boliviana en los keywords target
- Los bancos ocupan "reprogramación" pero dejan libre "refinanciamiento tarjeta crédito" — ventana de oportunidad clara

---

## 5. Accionables — Checklist julio 2026

Ordenados por impacto. Objetivo: completar los primeros 4 antes de la próxima auditoría.

### Configuración base (esta semana)

- [ ] **Verificar tuprestamobo.com en Google Search Console**  
  Ir a search.google.com/search-console → Agregar propiedad → Verificar con HTML tag o DNS

- [ ] **Registrar Google Analytics 4**  
  Crear propiedad GA4 → instalar el script en la app React (via gtag o react-ga4)

- [ ] **Enviar sitemap a Search Console**  
  Generar sitemap.xml del sitio y enviarlo en Search Console → Sitemaps

### Correcciones técnicas homepage (esta semana)

- [ ] **Corregir title tag**  
  Cambiar a: *"Refinanciá tu Tarjeta de Crédito en Bolivia | Tu Préstamo"*  
  Máximo 60 caracteres. Incluye keyword de producto.

- [ ] **Agregar meta description**  
  Texto: *"Refinancia tu deuda de tarjeta de crédito boliviana con tasa más baja. 100% digital. Aprobación en 48 horas."*  
  Máximo 155 caracteres.

- [ ] **Agregar H1 visible al homepage**  
  El H1 debe ser la propuesta de valor principal visible sin hacer scroll.

- [ ] **Agregar Schema.org en JSON-LD**  
  Implementar: `FinancialProduct` + `Organization`. Permite que Google entienda el producto semánticamente y muestre rich snippets.

### Contenido (próximo mes)

- [ ] **Crear primera página de contenido SEO**  
  Tema recomendado: *"Cómo refinanciar tu tarjeta de crédito en Bolivia paso a paso"*  
  Keyword: `refinanciar tarjeta crédito Bolivia` — intención transaccional, competencia baja.

- [ ] **Correr Google Keyword Planner desde cuenta boliviana**  
  Para validar volúmenes reales de los keywords identificados en esta auditoría.

### Crecimiento (próximo trimestre)

- [ ] **Crear 3–4 páginas adicionales de contenido** (blog o herramientas)  
  Opciones: calculadora de ahorro, "¿Cuánto pagás de más en tu tarjeta?", "Diferencia entre TNA y TEA"

- [ ] **Evaluar Google Search Ads**  
  Keywords de alta intención / baja competencia. CPC bajo en Bolivia. Presupuesto estimado: $100–200/mes para primeros tests.

---

## 6. Landscape competitivo (solo baseline)

| Actor | Tipo | Keyword que rankea | Amenaza |
|---|---|---|---|
| BCP, Banco Unión, Banco Económico | Bancos tradicionales | reprogramación créditos | Media — keyword diferente |
| BDP | Banco estatal | refinanciamiento créditos | Media — producto diferente |
| ASFI | Gobierno | formulario refinanciamiento | Baja — informacional |
| Digitt | Fintech México | refinanciamiento TDC | Nula — no opera en Bolivia |
| Tu Préstamo Bolivia | Fintech Bolivia | (no aparece aún) | — |

---

## 7. Próxima auditoría

**Fecha tentativa:** Agosto 2026 (pulso mensual)  
**Tipo:** Pulso mensual — revisar si los accionables técnicos se implementaron  
**Foco:** Verificar que Search Console ya muestre datos. Revisar indexación post-correcciones.  
**Auditoría trimestral siguiente:** Octubre 2026
