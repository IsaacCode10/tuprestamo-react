# Calendario de Episodios — "14 Años con la Tarjeta"

Serie editorial de `Finanzas de Isaac`. Cada episodio combina una historia real de viaje
(la del Mundial Brasil 2014 y, después, otros viajes por Latinoamérica) con **un concepto
financiero específico** sobre tarjetas de crédito en Bolivia. La historia engancha; el
concepto deja la idea que la persona se lleva y conecta con el producto de Tu Préstamo.

**Cadencia:** 1 episodio nuevo cada 15 días.

**Origen de esta lista:** los 6 conceptos y sus keywords ya estaban definidos en el
generador de artículos anterior (`AdminGeneradorArticulos.jsx`, eliminado en la
reconstrucción del 2026-07-26). Se recuperan acá para no perder ese trabajo y para que
cada episodio nuevo tenga objetivo claro antes de escribirse.

---

## Tabla maestra

| # | Concepto financiero (objetivo) | Keyword SEO objetivo | Viaje / País | Estado | Fecha estimada |
|---|---|---|---|---|---|
| 0 | Cómo conseguí mi primera tarjeta — el origen | cómo sacar tarjeta de crédito Bolivia primera vez | Brasil, 2014 (Mundial) | ✅ Publicado | 2026-07-26 |
| 1 | Los cargos por compra en el extranjero — la comisión que no ves | comisión compra en el extranjero tarjeta de crédito Bolivia | Brasil, 2014 (continúa el viaje — primer Airbnb, Cuiabá) | ⬜ En progreso — historia reescrita 2026-09-02, falta armado final | 2026-08-17 |
| 2 | El pago mínimo — la trampa | pago mínimo tarjeta de crédito Bolivia | A definir | ⬜ Pendiente | 2026-09-01 |
| 3 | TNA vs TEA — la tasa que no te dicen | diferencia TNA TEA tarjeta de crédito Bolivia | A definir | ⬜ Pendiente | 2026-09-16 |
| 4 | El mantenimiento mensual — el cargo oculto | mantenimiento tarjeta de crédito Bolivia cuánto cuesta | A definir | ⬜ Pendiente | 2026-10-01 |
| 5 | El interés compuesto — cómo crece la deuda | interés compuesto tarjeta de crédito Bolivia cómo funciona | A definir | ⬜ Pendiente | 2026-10-16 |
| 6 | El refinanciamiento — la salida (cierre de serie) | refinanciar tarjeta de crédito Bolivia cómo funciona | A definir | ⬜ Pendiente | 2026-10-31 |

**Países disponibles para las historias** (del formulario original, elegí libremente para
cada episodio): Argentina, Uruguay, Chile, Ecuador, Paraguay, Colombia, Perú.

**Nota de continuidad:** el pie del Episodio 0 ya quedó redactado apuntando a
`Ep. 1 · Los pasajes de avión a Brasil — la compra más estresante de mi vida`. El Episodio 1
sigue siendo sobre Brasil (pasajes + Airbnb en Cuiabá), así que esa promesa se cumple tal cual
— no hace falta tocar `nav_siguiente_titulo` del Episodio 0.

**Historial de cambios al calendario:**
- 2026-08-17: se agregó el concepto "Cargos por compra en el extranjero" como Episodio 1 nuevo
  (no estaba en la lista original de 6). Los episodios que venían después se corrieron un lugar
  (pago mínimo pasa a ser el 2, y así sucesivamente); el refinanciamiento sigue siendo el cierre
  de la serie, ahora como episodio 6.

---

## Regla del final abierto (importante)

El monto acumulado total (el "reveal" grande, tipo "Bs 60.720 en 11 años") **solo se muestra
en el episodio final de la serie** (el último de la tabla maestra — hoy el 6, el
refinanciamiento; revisar el número si el calendario vuelve a cambiar). En todos los episodios
anteriores, el cierre del capítulo debe dejar **dos puertas abiertas**, nunca cerradas:

1. **La puerta al próximo episodio** — ya resuelta con `nav_siguiente_titulo` / el bloque `snav`.
2. **La puerta al costo total** — nunca revelar el número final antes de tiempo. En vez de eso,
   cerrar con una promesa tipo *"ese número te lo muestro al final de esta serie"* — sin dar la cifra.

En la práctica, para todos los episodios salvo el último de la tabla maestra: **no usar el
marcador `[REVEAL]`** ni completar `reveal_label` / `reveal_numero` / `reveal_sub` (dejarlos en
`null`). El cierre del capítulo es un párrafo de texto normal que genera intriga, no una caja
de reveal. Recién en el episodio final (hoy, el 6 — el refinanciamiento) se arma el reveal
grande con el número acumulado real de los 11 años.

---

## Checklist por episodio (repetir para cada uno)

### 1. Definir antes de escribir
- [ ] Confirmar el concepto financiero (ya viene de la tabla maestra)
- [ ] Confirmar país/año del viaje
- [ ] Confirmar el dato numérico real que va a sorprender (límite, tasa, monto acumulado)

### 2. Contenido (en `/admin/editor-articulos`)
- [ ] Escribir el título
- [ ] Pegar la historia completa (se autoguarda solo)
- [ ] Subir foto 1 y foto 2, con sus pies de foto
- [ ] Pedir revisión con el skill "Editor de sección" (`GUIA_CONTENIDO_IA_SEO.md`, sección
      9bis) antes de pasar al armado a mano — corta volver a armar todo si el borrador
      cambia mucho después

### 3. Terminar de armar (a mano, junto con Isaac)
- [ ] Ubicar la frase destacada (párrafo entre comillas en el texto)
- [ ] Insertar marcador `[FOTO2]` en el punto correcto de la historia (usar `[FOTO2-DOC]` si
      la foto 2 es una captura/comprobante — correo, recibo — para que no se recorte)
- [ ] Insertar subtítulos `## ...` donde corresponda
- [ ] Armar la tabla de datos (`tabla_titulo` / `tabla_filas`) + marcador `[TABLA]` — solo con datos que el contrato realmente indica, no cálculos
- [ ] **Si NO es el último episodio de la tabla maestra:** cerrar con un párrafo de intriga (sin `[REVEAL]`, sin revelar el número acumulado) — ver "Regla del final abierto" más arriba
- [ ] **Si ES el último episodio (el refinanciamiento):** armar el reveal del monto acumulado (`reveal_label` / `reveal_numero` / `reveal_sub`) + marcador `[REVEAL]`
- [ ] Escribir 3 FAQs reales (no genéricas — ver `GUIA_CONTENIDO_IA_SEO.md`)
- [ ] Escribir el CTA (eyebrow, título, texto, botón)
- [ ] Actualizar `nav_siguiente_titulo` del episodio **anterior** para que apunte a este

### 4. SEO (antes de marcar `publicado = true`)
- [ ] `seo_title` ≤ 60 caracteres (el H1 puede ser más largo/narrativo, el title tag no)
- [ ] `seo_description` ≤ 155 caracteres
- [ ] Slug limpio y final
- [ ] Agregar la URL a `public/sitemap.xml`

### 5. QA editorial (checklist anti-genérico de `GUIA_CONTENIDO_IA_SEO.md`)
- [ ] ¿Hay al menos 1 ejemplo concreto?
- [ ] ¿Hay contexto boliviano real?
- [ ] ¿El primer párrafo responde algo rápido (si el episodio apunta a intención de búsqueda directa, no solo narrativa)?
- [ ] ¿Hay tramos de 3+ oraciones cortas seguidas (efecto telegráfico)? Corregir salvo que sea un golpe de efecto intencional aislado
- [ ] ¿El CTA está justificado?
- [ ] ¿Suena a Isaac, no a plantilla?

### 6. Lanzamiento
- [ ] `update articulos set ... publicado = true where id = '...'`
- [ ] Verificar en producción (no solo localhost)
- [ ] Marcar el episodio como ✅ en la tabla maestra de este documento
