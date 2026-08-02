# Arquitectura SEO Escalable

Documento operativo para escalar SEO en Tu Préstamo con dos líneas separadas:

1. `Herramientas SEO`: páginas interactivas con calculadoras, simuladores o auditores.
2. `SEO puro estilo blog`: contenidos editoriales bajo la marca editorial provisional `Finanzas de Isaac`.

Objetivo:

- crecer tráfico orgánico sin contaminar la landing principal,
- mantener una arquitectura limpia,
- publicar nuevas páginas con una misma lógica de diseño, SEO y linking,
- y evitar que cada nueva iniciativa se construya desde cero.

---

## 1. Principio Rector

La home de `tuprestamobo.com` vende la propuesta principal.

Las páginas SEO:

- no viven en el hero,
- no entran todas al menú principal,
- no compiten con la landing comercial,
- y se distribuyen por rutas específicas, sitemap, Search Console, campañas, FAQs y enlaces internos contextuales.

Esto replica la lógica de compañías que ejecutan bien SEO:

- una home limpia y enfocada en conversión,
- clusters de contenido separados,
- páginas satélite con intención de búsqueda definida,
- hubs o índices por categoría,
- interlinking selectivo, no invasivo.

---

## 2. Arquitectura General del Sitio

### 2.1 Capas del sitio

- `Home principal`
  - propuesta de valor
  - conversión principal
  - marca
- `Herramientas`
  - capturan búsquedas de tipo calculadora, simulador, auditor, comparador
  - también sirven para campañas y redes
- `Blog / SEO editorial`
  - ataca búsquedas informativas puras
  - construye autoridad temática
  - alimenta enlaces internos hacia herramientas y páginas de producto
- `Páginas transaccionales`
  - formularios, calculadora principal, solicitud, páginas de inversión

### 2.2 Regla de linking

- La home enlaza muy poco.
- Las herramientas pueden enlazar a producto y a una o dos piezas relacionadas.
- El blog enlaza a herramientas y a producto.
- Un futuro hub editorial enlaza al blog.
- Un futuro hub de herramientas enlaza a las herramientas.

---

## 3. Arquitectura 1: Herramientas SEO

Estas páginas sirven para búsquedas con intención práctica:

- `calculadora tarjeta de crédito bolivia`
- `calcular tea bolivia`
- `intereses tarjeta de crédito bnb`
- `simulador refinanciar tarjeta`

### 3.1 Ruta recomendada

Crear un namespace dedicado:

- `/herramientas/`

Ejemplos:

- `/herramientas/calculadora-intereses-tarjeta-bolivia`
- `/herramientas/auditor-tarjetas-bolivia`
- `/herramientas/calculadora-tea-bolivia`
- `/herramientas/simulador-refinanciamiento-tarjetas`

Recomendación:

- Mantener la URL actual publicada `/auditor-de-tarjetas`.
- A futuro, normalizar todo bajo `/herramientas/...`.
- Si luego se migra, hacerlo con redirect `301`.

### 3.2 Estructura tipo de una herramienta

Todas las herramientas deben repetir el mismo esqueleto:

1. Hero SEO
   - H1 exacto de intención de búsqueda
   - subtítulo claro
   - 1 promesa concreta
   - 1 disclaimer corto

2. Módulo interactivo principal
   - inputs claros
   - ayudas simples
   - resultados arriba del fold en móvil

3. Resumen comparativo
   - resultado principal
   - costo actual
   - escenario comparativo

4. Bloque explicativo
   - qué significan los datos
   - cuándo conviene
   - cuándo no conviene

5. FAQ SEO
   - 3 a 6 preguntas
   - respuestas cortas, directas y específicas para Bolivia

6. CTA
   - “Solicita evaluación”
   - “Recibe tu auditoría”
   - “Calcula tu ahorro”

7. Enlaces internos contextuales
   - máximo 2 o 3
   - relacionados con intención del usuario

### 3.3 Diseño tipo para herramientas

Debe existir una plantilla visual única:

- Hero consistente
- módulo interactivo principal
- tarjetas resumen
- bloque editorial SEO
- FAQ
- CTA final

Reglas de diseño:

- mobile-first real,
- tipografía y colores de marca,
- cero diseño “blog”,
- cero ruido visual,
- resultados visibles sin mucho scroll,
- ayudas inline, no tooltips ocultos,
- tablas complejas reinterpretadas para móvil.

### 3.4 Metadata tipo para herramientas

Cada herramienta debe definir:

- `title`
- `meta description`
- canonical
- `WebPage`
- `SoftwareApplication`
- `FAQPage`

Opcional según caso:

- `FinancialProduct`
- `HowTo`

### 3.5 Naming convention

- Nombre interno de archivo:
  - `ToolInterestCalculatorPage.jsx`
  - `ToolTeaCalculatorPage.jsx`
- Nombre público:
  - “Calculadora de intereses de tarjeta de crédito en Bolivia”
- Slug:
  - corto
  - descriptivo
  - sin stop words innecesarias

### 3.6 Plantilla editorial para herramientas

Usar este orden:

```md
H1: [keyword principal]
Subtítulo: [beneficio + claridad]

Sección 1: Herramienta interactiva
Sección 2: Resultado principal
Sección 3: Qué significa este cálculo
Sección 4: Cuándo te conviene / cuándo no
Sección 5: FAQ SEO
Sección 6: CTA
```

### 3.7 Qué NO hacer en herramientas

- no meterlas todas en la home,
- no poner decenas de links en el menú,
- no usar títulos creativos que maten el SEO,
- no usar solo UI sin texto rastreable,
- no esconder escenarios negativos si el cálculo no favorece a Tu Préstamo,
- no hacer una herramienta por keyword mínima sin intención real.

---

## 4. Arquitectura 2: Blog SEO Puro

Marca editorial propuesta:

- `Finanzas de Isaac`

Objetivo:

- capturar búsquedas informativas puras,
- educar,
- construir autoridad temática,
- y derivar tráfico a herramientas o producto cuando tenga sentido.

Este espacio no es una herramienta ni una landing de campaña. Es contenido SEO puro.

### 4.1 Ruta recomendada

Crear un namespace dedicado:

- `/finanzas-de-isaac/`

Ejemplos:

- `/finanzas-de-isaac/que-es-la-tea-en-bolivia`
- `/finanzas-de-isaac/como-funciona-el-pago-minimo-de-una-tarjeta`
- `/finanzas-de-isaac/por-que-las-tarjetas-se-vuelven-caras`
- `/finanzas-de-isaac/como-salir-de-la-deuda-de-tarjeta-en-bolivia`

### 4.2 Clusters temáticos del blog

#### Cluster A: Tarjetas de crédito

- qué es la TNA
- qué es la TEA
- qué es el pago mínimo
- cómo se calculan intereses
- qué cargos cobra una tarjeta
- qué significa diferimiento

#### Cluster B: Deuda personal

- cómo salir de la deuda
- refinanciar vs seguir pagando mínimo
- consolidación de deuda
- errores comunes al usar tarjetas

#### Cluster C: Educación financiera

- presupuesto personal
- fondo de emergencia
- costo financiero real
- cómo leer un extracto bancario

#### Cluster D: Comparativas

- tarjeta vs préstamo personal
- pago mínimo vs cuota fija
- DPF vs inversión en préstamos

### 4.3 Estructura tipo de artículo

Todos los artículos deben repetir el mismo diseño:

1. Hero editorial
   - categoría
   - H1
   - resumen de 1 a 2 líneas

2. Introducción corta
   - responder la pregunta rápido

3. Desarrollo
   - bloques H2 y H3
   - ejemplos Bolivia
   - lenguaje simple

4. Caja de resumen
   - “Qué debes recordar”

5. CTA contextual
   - hacia una herramienta
   - o hacia producto
   - solo si tiene sentido

6. FAQ
   - 2 a 4 preguntas

7. Artículos relacionados

### 4.4 Diseño tipo del blog

La plantilla debe ser consistente y simple:

- ancho de lectura cómodo,
- tipografía editorial,
- encabezados claros,
- tabla de contenidos opcional,
- tarjetas de relacionados,
- caja de resumen,
- CTA discreto pero visible,
- cero look de landing publicitaria.

### 4.5 Metadata tipo para blog

Cada artículo debe tener:

- `title`
- `meta description`
- canonical
- `Article`
- `FAQPage` si aplica
- breadcrumbs si el sistema lo soporta

### 4.6 Plantilla editorial para blog

```md
Categoría
H1
Resumen

H2: respuesta corta a la intención
H2: explicación principal
H2: ejemplo aplicado a Bolivia
H2: errores comunes / recomendaciones
H2: conclusión
FAQ
CTA relacionado
```

### 4.7 Qué NO hacer en blog

- no mezclarlo con campañas,
- no meter herramientas dentro del flujo editorial,
- no escribir artículos inflados sin intención clara,
- no publicar posts por calendario si no atacan una keyword útil,
- no usar títulos clickbait sin coincidencia con search intent.

---

## 5. Relación Entre Herramientas y Blog

La lógica correcta es:

- el blog educa,
- las herramientas convierten la curiosidad en acción,
- el producto convierte la acción en lead.

### 5.1 Flujo recomendado

Blog -> Herramienta -> Producto

Ejemplo:

- Artículo: `Qué es la TEA en Bolivia`
- Link interno: `Calculadora de intereses de tarjeta de crédito`
- CTA final: `Descubre si te conviene refinanciar`

### 5.2 Qué enlaza a qué

- Un artículo puede enlazar a 1 herramienta.
- Una herramienta puede enlazar a 1 o 2 artículos o FAQs.
- No hacer mallas internas artificiales.

---

## 6. Hubs Recomendados

No ahora, pero sí cuando haya volumen.

### 6.1 Hub de herramientas

Ruta sugerida:

- `/herramientas`

Contenido:

- índice de herramientas
- breve explicación de para qué sirve cada una
- cards limpias

### 6.2 Hub editorial

Ruta sugerida:

- `/finanzas-de-isaac`

Contenido:

- portada del blog
- categorías
- artículos destacados
- últimos artículos

Estos hubs sí pueden vivir en el footer o en enlaces secundarios, no en el hero.

---

## 7. Sistema de Publicación Escalable

### 7.1 Carpeta local recomendada en el repo

```text
docs/SEO/
  ARQUITECTURA_SEO_ESCALABLE.md
  CALENDARIO_KEYWORDS.md
  PLANTILLA_HERRAMIENTA.md
  PLANTILLA_ARTICULO_BLOG.md
```

### 7.2 Convención operativa

Antes de crear una página nueva, definir:

1. keyword principal
2. intención de búsqueda
3. tipo de página
   - herramienta
   - blog
4. CTA final
5. enlace interno entrante
6. enlace interno saliente

### 7.3 Checklist de publicación

- slug limpio
- H1 correcto
- title SEO
- meta description
- schema
- contenido rastreable
- CTA claro
- enlaces internos útiles
- sitemap actualizado
- indexación solicitada en Search Console

---

## 8. Plantilla Maestra: Herramienta

```md
Keyword principal:
Intención:
Slug:
CTA final:

Hero:
- H1
- subtítulo
- disclaimer corto

Herramienta:
- inputs
- ayudas simples
- resultado

Bloque SEO:
- explicación
- cuándo conviene
- cuándo no conviene

FAQ:
- 3 a 6 preguntas

Schema:
- WebPage
- SoftwareApplication
- FAQPage
```

---

## 9. Plantilla Maestra: Blog SEO Puro

```md
Keyword principal:
Intención:
Slug:
Categoría:
CTA relacionado:

Hero editorial:
- categoría
- H1
- resumen

Contenido:
- respuesta corta
- explicación
- ejemplo Bolivia
- recomendaciones
- cierre

FAQ:
- 2 a 4 preguntas

Schema:
- Article
- FAQPage opcional
```

---

## 10. Recomendación Ejecutiva

### Fase 1

- Mantener herramientas como landings independientes.
- No agregarlas al hero.
- No saturar la home.
- Enlazarlas desde sitemap, Search Console y algunas páginas relevantes.

### Fase 2

- Lanzar `Finanzas de Isaac` como hub editorial.
- Publicar artículos clusterizados.
- Conectar artículos -> herramientas -> producto.

### Fase 3

- Crear hubs visibles en footer o navegación secundaria.
- Medir qué cluster trae tráfico y qué cluster convierte mejor.

---

## 11. Decisión Recomendadа Hoy

Implementar esta estructura:

- Herramientas:
  - mantener `auditor-de-tarjetas` como pieza activa
  - siguiente batch bajo `/herramientas/`

- Blog:
  - crear más adelante `Finanzas de Isaac`
  - todo el SEO puro vive ahí

Esto te da dos máquinas distintas:

- una para captar intención transaccional o semi-transaccional,
- otra para capturar demanda informativa de Google a largo plazo.

