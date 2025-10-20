# Estado al 19 de Octubre de 2025 (Fin del Día)

### Tarea Principal: Diagnóstico y Corrección del Flujo de Pre-Aprobación Automática

**Contexto:** Tras un despliegue, se detectó un error crítico donde el dashboard del prestatario no mostraba los datos de la pre-aprobación (tasa, cuota, etc.), a pesar de que el usuario recibía el correo de bienvenida. Esto se debía a que la `oportunidad` no se enlazaba correctamente con la `solicitud`.

**Resumen de la Sesión de Debugging:**

Se realizó una depuración profunda que reveló y corrigió una cascada de problemas de arquitectura:

1.  **Relación de Base de Datos:** Se estableció la `foreign key` correcta entre las tablas `solicitudes` y `oportunidades` para permitir la unión de datos.
2.  **Ambigüedad en Consulta:** Se especificó en el código del `BorrowerDashboard.jsx` qué relación usar, eliminando un error de ambigüedad.
3.  **Diagnóstico del Motor de Decisión:** Se confirmó que el código de la Edge Function `handle-new-solicitud` era conceptualmente correcto, pero no se estaba ejecutando como se esperaba.
4.  **Análisis de Logs:** Gracias a los logs provistos por Isaac, se identificó el bug principal: la función creaba la `oportunidad` pero **no guardaba el ID de esta en la `solicitud` original**, dejando el enlace roto.
5.  **Corrección del Motor de Decisión:** Se modificó la función `handle-new-solicitud` para que realice este enlace crucial y se desplegó en Supabase.
6.  **Diagnóstico y Corrección del Perfil de Usuario:** Se detectó un error final donde el perfil público del usuario no se creaba. Se implementó un 'trigger' en la base de datos para automatizar la creación de perfiles, solucionando el problema de raíz.
7.  **Actualización de Documentación:** Se actualizó el `ROADMAP_BACKEND_PRESTATARIO.md` para que refleje el flujo automático actual, eliminando la confusión con documentación obsoleta.

**Estado Actual:**

*   Todos los arreglos en el código y la base de datos han sido completados y desplegados.
*   El último script SQL para el 'trigger' de perfiles fue ejecutado con éxito por Isaac.

**Próximo Paso Crítico (Responsable: Isaac):**

*   Queda pendiente realizar la **prueba completa (end-to-end)** con un usuario de prueba nuevo (borrando los datos anteriores) para verificar que el flujo de pre-aprobación y el dashboard funcionan correctamente de principio a fin.

---

# Estado al 19 de Octubre de 2025

## Tarea Principal: Finalización de la Página de Calculadora de Ahorro y Correcciones en Formulario Interactivo

Se completaron los ajustes finales en el flujo de la nueva página de la calculadora de ahorros y se abordaron bugs reportados por el CEO en el formulario de solicitud.

### Resumen de la Implementación

1.  **Validación de Formulario Corregida:**
    *   Se implementó la validación para el campo de correo electrónico en el formulario interactivo (`InteractiveForm.jsx`). Ahora, el campo es obligatorio y solo acepta formatos de email válidos, previniendo la entrada de datos incorrectos.

2.  **Ajustes en la Calculadora de Ahorro:**
    *   Se realizaron múltiples intentos para solucionar un bug visual donde el botón de cierre ("X") del modal del formulario no era visible, a pesar de ser funcional.
    *   Se investigó y se intentó corregir un bug donde la barra de progreso del formulario no se actualizaba visualmente para el usuario al avanzar entre las preguntas.

### Tareas Pendientes (Bugs)

A petición del CEO, se pausan las correcciones de los siguientes bugs de UI para priorizar otras áreas. Quedan registrados para ser retomados:

*   **Bug 1: Botón de Cierre Invisible:** En el modal del formulario de solicitud, el botón de cierre ("X") es funcional (cierra el modal al hacer clic en su área) pero es completamente invisible. Múltiples intentos de corrección vía CSS y JSX no han resuelto el problema de visibilidad.
*   **Bug 2: Barra de Progreso Estática:** La barra de progreso en el `InteractiveForm` no refleja visualmente el avance del usuario al completar las preguntas. La lógica de actualización de estado parece correcta, pero el cambio de ancho no se renderiza en la UI.

### Siguiente Paso

*   Continuar con las siguientes tareas de desarrollo según la priorización del CEO.

---

# Estado al 17 de Octubre de 2025

## Tarea Principal: Refactorización Estratégica de la Calculadora de Ahorro

A raíz del feedback del CEO, se tomó la decisión estratégica de abandonar la implementación de la calculadora en una ventana modal y migrarla a una página dedicada para mejorar la experiencia de usuario y optimizar la conversión.

### Resumen de la Implementación

1.  **Pivote de Arquitectura (Modal a Página Dedicada):**
    *   Se creó una nueva ruta principal en la aplicación: `/calculadora`.
    *   Se desarrolló un nuevo componente `CalculatorPage.jsx` que sirve como contenedor para la herramienta, con un diseño de página espacioso, títulos claros y un llamado a la acción (CTA) explícito.
    *   Se refactorizó por completo el componente `PublicSavingsCalculator.jsx`, eliminando toda la lógica de modal para convertirlo en un componente puro y reutilizable.
    *   Se actualizó el `Header` para que el botón "CALCULADORA DE AHORRO" ahora dirija a la nueva página `/calculadora`.
    *   Se limpiaron los componentes `App.jsx` y `LandingPage.jsx`, eliminando el código y el estado relacionados con el antiguo modal.

2.  **Ajustes de Lógica de Negocio y UI/UX:**
    *   **Límites de Préstamo:** Se definieron y documentaron los montos de préstamo para el MVP: **Mínimo 5,000 Bs.** y **Máximo 70,000 Bs.**
    *   **Validación de Formularios:** Se implementó la validación de estos límites en el formulario de solicitud de préstamo (`LoanRequestForm.jsx`), mejorando el componente `InteractiveForm.jsx` para soportar validación de rangos numéricos.
    *   **Rango de Tasas:** Se ajustó el rango de la tasa de interés del banco en la calculadora a **18% - 50%** para enfocarla en leads relevantes.
    *   **Ajuste del Header:** Se redujo la altura del `Header` principal (logo de 120px a 80px) para dar más visibilidad a la herramienta en la nueva página y reducir la necesidad de scroll.

### Siguiente Paso Crítico (Mañana)

*   **Continuar la depuración y mejora de la UI/UX** de la nueva página `/calculadora` basándose en el feedback del CEO.

---

# Estado al 16 de Octubre de 2025 (Fin del Día)

## Tarea Principal: Implementación de la Calculadora de Ahorros Pública

Se ha completado la implementación de una nueva herramienta de conversión clave en la página de inicio.

### Resumen de la Implementación

1.  **Estrategia y Ubicación:**
    *   Siguiendo la nueva directriz estratégica, se reemplazó el enlace "Cómo Funciona" en el `Header` principal por "Calculadora de Ahorro".
    *   La calculadora se implementó como una **ventana modal** para darle máxima prominencia, en lugar de estar incrustada en la página.

2.  **Diseño y Flujo de Conversión:**
    *   El diseño se inspiró en el ejemplo de `yotepresto.com`, utilizando sliders para los montos y botones para los plazos, creando una experiencia de usuario moderna e intuitiva.
    *   Se diseñó un **embudo de conversión directo**: `Clic en Calculadora -> Simulación -> Clic en "¡Quiero este Ahorro!" -> Cierre de calculadora y apertura del formulario de solicitud de préstamo`.

3.  **Lógica de Negocio:**
    *   La calculadora utiliza las **tres tasas de interés oficiales** (15%, 17%, 20%) para mostrar al usuario una comparación transparente de los posibles escenarios de ahorro, similar al modelo de `yotepresto.com`.

4.  **Detalles Técnicos:**
    *   Se creó el nuevo componente `PublicSavingsCalculator.jsx` y su hoja de estilos `PublicSavingsCalculator.css`.
    *   Se modificó `App.jsx` para gestionar el estado de visibilidad del modal.
    *   Se modificó `Header.jsx` para incluir el botón que dispara la apertura del modal.
    *   Se modificó `LandingPage.jsx` para renderizar el modal y gestionar el flujo de conversión hacia el formulario de solicitud.
    *   La calculadora es totalmente interactiva y recalcula los ahorros en tiempo real a medida que el usuario ajusta los valores.

### Siguiente Paso Crítico (Responsable: Isaac)

*   **Probar la nueva funcionalidad:** Mañana, Isaac debe probar el flujo completo de la nueva calculadora de ahorros en el entorno de desarrollo.

---

# Estado al 16 de Octubre de 2025

## Tarea Principal: Solucionar error 500 en la Edge Function `analizar-documento-v2`.

### Resumen del Bug y Diagnóstico Final

Al subir un documento, la función `analizar-documento-v2` fallaba con un error 500. Tras una intensa depuración, se ha llegado a la causa raíz definitiva.

1.  **Análisis del Error:** El error 500 era causado por una respuesta `404 Not Found` de la API de Google Vertex AI, indicando que el modelo de IA solicitado no se encontraba o el proyecto no tenía acceso.

2.  **Depuración Sistemática del Nombre del Modelo:** Se realizaron múltiples intentos para corregir el identificador del modelo, probando las siguientes opciones basadas en la documentación oficial:
    *   `gemini-pro-vision` (obsoleto)
    *   `gemini-2.0-flash` (incorrecto)
    *   `gemini-1.5-flash-latest` (incorrecto)
    *   `gemini-1.5-flash` (alias, falló)
    *   `gemini-1.5-flash-001` (versión explícita, falló)

3.  **Prueba Definitiva con API Explorer:** Para aislar el problema, se utilizó la herramienta "API Explorer" de Google Cloud para llamar a la API directamente, sin pasar por nuestro código. La llamada falló con el mismo error 404.

### Conclusión y Bloqueo

**La causa raíz no está en nuestro código.** El problema es una falta de acceso o permisos en el proyecto de Google Cloud `tuprestamo-ai` para utilizar los modelos de Gemini en la región `us-central1`.

**El trabajo en el flujo de análisis de documentos está BLOQUEADO.**

### Siguiente Paso Crítico (Responsable: Isaac)

*   **Contactar al Soporte de Google Cloud:** Isaac ha creado un ticket en el "Google Issue Tracker" (el canal recomendado para este tipo de problema técnico) proveyendo toda la evidencia recopilada.
*   **Esperar la resolución por parte de Google.** Una vez que Google habilite el acceso al modelo para el proyecto, el código existente en Supabase debería funcionar sin necesidad de más cambios.

---
# Estado al 15 de Octubre de 2025

## Tarea Principal: Solucionar error en la carga de documentos del prestatario.

Se ha pausado el debugging a petición de Isaac para documentar el estado actual.

### Resumen del Bug

Al intentar subir un documento en el `BorrowerDashboard`, el proceso falla.

1.  **Error Inicial:** `404 Not Found` al llamar a `/api/analizar-documento`.
    *   **Diagnóstico:** El frontend intentaba llamar a una ruta de API estilo Vercel que no se ejecuta con nuestro servidor de desarrollo local (`npm run dev`).

2.  **Error Actual:** `500 Internal Server Error` al llamar a la nueva Edge Function `analizar-documento-v2`.
    *   **Diagnóstico:** La función es encontrada, pero está fallando internamente en el servidor de Supabase.

### Pasos de Solución Realizados

1.  **Refactorización a Arquitectura Supabase-nativa:**
    *   Se creó una nueva Edge Function `analizar-documento-v2`.
    *   Se migró toda la lógica de análisis con IA (Inteligencia Artificial) del antiguo archivo (`api/analizar-documento.js`) a la nueva función.
    *   Se desplegó la nueva función en Supabase.
    *   Se modificó el frontend (`BorrowerDashboard.jsx`) para que llame a esta nueva función, solucionando el error 404.

2.  **Primer Intento de Debugging del Error 500:**
    *   Se revisaron los logs de la función, que reportaban un error: `Maximum call stack size exceeded`.
    *   **Causa:** Se identificó un bug en el código que procesaba los archivos, causando un desbordamiento de memoria con archivos grandes.
    *   **Solución:** Se corrigió el código para manejar los archivos de forma más eficiente y se redesplegó la función.

3.  **Segundo Intento de Debugging del Error 500:**
    *   Se detectó que faltaba la clave de la API de Gemini en la configuración del proyecto.
    *   **Solución:** Isaac agregó el "secret" `GEMINI_API_KEY` al proyecto de Supabase.

### Estado Actual y Bloqueo

A pesar de las correcciones de código y la adición de la API key, el **error 500 persiste**. La función `analizar-documento-v2` sigue fallando en el servidor por una razón aún no determinada.

### Siguiente Paso Crítico

*   **Revisar nuevamente los logs de la función `analizar-documento-v2`** en el dashboard de Supabase para ver cuál es el *nuevo* mensaje de error después de los últimos cambios. Esto nos dirá por qué sigue fallando y cuál es el siguiente paso para solucionarlo.

---

# Estado al 14 de Octubre de 2025 (Fin del Día v2)

## Tareas Completadas Hoy

1.  **Sincronización del Dashboard del Prestatario:** Se corrigió un bug mayor en el `BorrowerDashboard`. Ahora, la tarjeta de resumen (`StatusCard`) y la calculadora de ahorros (`SavingsCalculator`) están completamente sincronizadas.
2.  **Refactorización de Componentes:** Se reestructuraron `BorrowerDashboard.jsx` y `SavingsCalculator.jsx` para centralizar el estado de la simulación. Esto elimina la lógica duplicada y hace que la interfaz sea más robusta y predecible.
3.  **Mejora de UX:** Se eliminó el botón "Recalcular" de la calculadora de ahorros, ya que ahora todos los cálculos se actualizan en tiempo real, creando una experiencia de usuario más fluida e intuitiva.

## Siguiente Paso Crítico (Mañana)

*   Continuar con el plan original: **Construir la Edge Function `sintetizar-perfil-riesgo`**. Este sigue siendo el principal bloqueo para avanzar con el flujo del analista de riesgo.

---

# Estado al 14 de Octubre de 2025 (Fin del Día)

## Tareas Completadas Hoy

1.  **Corrección de Bug en Dashboard:** Se solucionó el error que mostraba "N/A" en la "Cuota Mensual (Promedio)" del dashboard del prestatario.
2.  **Añadido Disclaimer Legal:** Se agregó el texto "Estos son cálculos preliminares..." al dashboard para gestionar las expectativas del cliente.
3.  **Definición de Lógica de Negocio Clave:** Se estableció el modelo de "Refinanciamiento Dirigido" y la fórmula de cálculo "Gross-Up" para asegurar la liquidación del 100% de la deuda.
4.  **Preparación para Desarrollo:**
    *   Se creó la rama de Git `feat/refinanciamiento-dirigido`.
    *   Se añadió la columna `saldo_deudor_verificado` a la tabla `oportunidades` en la base de datos.

## Bloqueo Identificado

*   La Edge Function `sintetizar-perfil-riesgo` está vacía (es un placeholder). Esta función es indispensable para crear los perfiles que el analista de riesgo debe revisar. El trabajo en el dashboard del analista está bloqueado hasta que esta función sea construida.

## Siguiente Paso Crítico (Plan para Mañana)

*   **Construir la Edge Function `sintetizar-perfil-riesgo`:** Escribir el código completo de la función que:
    1.  Reciba una `solicitud_id`.
    2.  Consulte las tablas `solicitudes` y `documentos`.
    3.  Calcule métricas preliminares (DTI, Score de Confianza).
    4.  Inserte un nuevo registro en `perfiles_de_riesgo` con el estado 'listo_para_revision', incluyendo el `monto_solicitado`.

---

# Estado al 14 de Octubre de 2025

## Tareas Completadas

Se ha finalizado la implementación de la nueva regla de negocio sobre el costo mínimo de servicio.

1.  **`SavingsCalculator.jsx` Actualizada:** La calculadora de ahorro en el frontend ahora refleja la lógica del backend.
2.  **Centralización de Lógica en Backend:** El backend es ahora la única fuente de verdad para todos los cálculos de costos, incluyendo la nueva regla de un costo mínimo de 10 Bs. Los resultados se persisten en la base de datos.
3.  **Simplificación del Dashboard del Prestatario:** El dashboard ha sido refactorizado para leer directamente los datos calculados del backend, eliminando lógica duplicada y reduciendo su complejidad.
4.  **Sincronización de Lógica:** La simulación en la `SavingsCalculator` es un espejo 1:1 del cálculo real del backend, garantizando consistencia para el usuario.

## Resumen de Impacto

Se ha implementado la directiva de negocio clave. Adicionalmente, la arquitectura del sistema es ahora más robusta, centralizada y fácil de mantener para futuras modificaciones.

## Siguiente Paso Crítico

**Isaac debe realizar una solicitud de prueba completa (end-to-end)** para verificar que los nuevos cálculos se aplican y muestran correctamente en todo el flujo de la aplicación.