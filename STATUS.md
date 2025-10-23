# Estado del Proyecto - 23 de Octubre de 2025 (Fin del Día)

**Misión Cumplida:** Se ha implementado y desplegado a producción la **versión 1 del Plan de Analítica de Producto** utilizando PostHog.

### Resumen de la Implementación de Analítica

Se ha establecido una base sólida para la medición del comportamiento del usuario en toda la aplicación. Los siguientes hitos fueron completados:

1.  **Cimientos Técnicos:**
    *   Se configuró PostHog y se creó un hook centralizado (`useAnalytics.js`) para una gestión de eventos limpia y escalable.
    *   Se implementó la identificación de usuarios (`posthog.identify()`) en el momento del login para asociar toda la actividad a perfiles específicos.

2.  **Funnels de Conversión Medibles:**
    *   **Funnel del Prestatario:** Se instrumentó el flujo completo, desde la visualización del formulario de solicitud hasta el éxito o fracaso en la subida de cada documento.
    *   **Funnel del Inversionista:** Se mide el recorrido desde que el inversionista ve el mercado de oportunidades hasta que completa una inversión.

3.  **Medición de Features Clave:**
    *   **Calculadora de Ahorros:** Se registran todas las interacciones y los resultados generados, permitiendo analizar su efectividad como herramienta de conversión.
    *   **Captura de Leads:** Se implementó el seguimiento de campañas de marketing a través de parámetros UTM para medir la efectividad de los canales de adquisición.

**Resultado Final:** La plataforma ahora cuenta con una visibilidad analítica completa sobre sus flujos de usuario más críticos, permitiendo la toma de decisiones basada en datos.

---
---
*Contenido Anterior del STATUS.md:*

# Estado del Proyecto - 23 de Octubre de 2025

---

## GUÍA DEFINITIVA PARA LA INTEGRACIÓN DE IA (GEMINI)

**Propósito:** Documentar de forma inmutable la configuración correcta para la integración con modelos de IA de Google, para evitar futuros errores y pérdidas de tiempo.

### Lección Aprendida (La Batalla del 23 de Octubre)

Tras una ardua sesión de depuración, se descubrió que los repetidos errores `404 Not Found` y `400 Bad Request` al llamar a la función `analizar-documento-v2` se debían a una confusión entre dos métodos distintos de autenticación y uso de las APIs de Google.

### Los Dos Caminos de Autenticación (¡LEER PRIMERO!)

1.  **Camino A: Google Cloud / Vertex AI (NO USAR POR AHORA)**
    *   **Endpoint:** `aiplatform.googleapis.com`
    *   **Autenticación:** Requiere una **Service Account** (el archivo JSON que se guarda en el secreto `GOOGLE_CREDENTIALS`).
    *   **Estado Actual:** **BLOQUEADO**. Nuestro proyecto `tuprestamo-ai`, por ser nuevo, no tiene permisos para usar los modelos de Gemini a través de esta vía. Intentar usar este camino resulta en errores `404 Not Found` para cualquier modelo.

2.  **Camino B: Google AI Studio (EL ÚNICO CAMINO QUE FUNCIONA)**
    *   **Endpoint:** `generativelanguage.googleapis.com`
    *   **Autenticación:** Requiere una **API Key** simple, generada desde la consola de Google AI Studio.
    *   **Estado Actual:** **OPERATIVO Y CORRECTO**. Este es el método que debemos usar.

### Configuración Correcta y Final

*   **Secreto en Supabase:** El secreto llamado `GEMINI_API_KEY` **DEBE** contener la llave de API generada en **Google AI Studio**.
*   **Endpoint en el Código:** La URL usada en la función debe ser `https://generativelanguage.googleapis.com/...`
*   **Nombre del Modelo:** El nombre del modelo no es estático. Se debe obtener ejecutando el diagnóstico de abajo. A fecha de hoy, el modelo correcto es `gemini-2.5-flash`.

### Cómo Diagnosticar Problemas de IA en el Futuro

Si la función de análisis vuelve a fallar con un error 4xx, seguir estos pasos:

1.  **Verificar el Secreto:** Asegurarse de que `GEMINI_API_KEY` en Supabase sigue siendo la llave de **Google AI Studio**.
2.  **Listar Modelos Disponibles:** Ejecutar el siguiente comando en una terminal local (CMD o PowerShell), reemplazando `TU_API_KEY_DE_AI_STUDIO` por la llave real:
    ```bash
    curl "https://generativelanguage.googleapis.com/v1/models?key=TU_API_KEY_DE_AI_STUDIO"
    ```
3.  **Analizar la Respuesta:** La respuesta del comando mostrará una lista de modelos. Buscar el modelo multimodal más adecuado (ej: que contenga "flash", "vision", etc.). El nombre a usar en el código es el que aparece después de `models/`.
    *   *Ejemplo de respuesta:* `{ "name": "models/gemini-2.5-flash", ... }` -> Usar `gemini-2.5-flash`.
4.  **Actualizar y Desplegar:** Corregir el nombre del modelo en el archivo `supabase/functions/analizar-documento-v2/index.ts` y desplegar la función.

---

### Bloqueo Actual (23 de Octubre, 2025)

*   **Problema:** La plataforma de Supabase está fallando al intentar desplegar cualquier función. El comando `supabase functions deploy` resulta en un error `500 - The operation was aborted due to timeout`.
*   **Causa:** Problema interno de la infraestructura de Supabase, fuera de nuestro control.
*   **Acción:** Pausar los intentos de despliegue y reintentar mañana (24 de Octubre). El código de la función `analizar-documento-v2` está **correcto y listo para ser desplegado** en cuanto la plataforma de Supabase se recupere.

---
---
*Contenido Anterior del STATUS.md:*

# Estado del Proyecto - 23 de Octubre de 2025 (Fin del Día)

**Misión Cumplida:** Se solucionó exitosamente el bug crítico que impedía la visualización de los datos de la oferta provisional (cuota, ahorro) en el Dashboard del Prestatario, que mostraba `N/A`.

### Resumen del Proceso de Diagnóstico y Solución

1.  **Problema Inicial:** El Dashboard del Prestatario no mostraba los cálculos del préstamo (`Cuota Mensual`, etc.) después de una pre-aprobación exitosa.

2.  **Diagnóstico del Backend:**
    *   Se descubrió que el `opportunity_id` no se estaba guardando en la tabla `solicitudes` cuando la Edge Function `handle-new-solicitud` se ejecutaba. La operación de `UPDATE` fallaba silenciosamente sin generar errores en los logs.
    *   **Causa Raíz:** Se identificó que la causa era una **política de seguridad a nivel de fila (RLS)** que faltaba para el `service_role`.

3.  **Diagnóstico del Frontend:**
    *   Una vez solucionado el problema del backend, se detectó un segundo problema: el frontend (`BorrowerDashboard.jsx`) seguía sin mostrar los datos.
    *   **Causa Raíz:** La lógica para obtener los datos (`fetchData`) usaba un método de "join" implícito que estaba fallando.

4.  **Solución Implementada (Multi-capa):**
    *   **Backend:** Isaac creó una nueva política de RLS en la tabla `solicitudes` otorgando permisos completos (`ALL`) al rol `service_role`. **Esto fue el arreglo fundamental.**
    *   **Frontend:** Se refactorizó la función `fetchData` en `BorrowerDashboard.jsx` para usar una consulta explícita y más robusta.
    *   **Documentación:** Se actualizaron 5 documentos clave para reflejar la regla de negocio del "Dashboard Provisional de Conversión".
    *   **Despliegue:** Se subieron todos los cambios a GitHub, lo que generó un nuevo despliegue en Vercel donde la solución fue verificada con éxito.

**Resultado Final:** El Dashboard del Prestatario ahora funciona según lo diseñado.

---

### Tarea Posterior: Alineación de Calculadoras por Transparencia Total

*   **Problema Identificado:** Se detectó una discrepancia significativa entre la calculadora de marketing de la landing page y la calculadora "realista" del dashboard del prestatario. La primera ignoraba todas las comisiones.
*   **Decisión Estratégica:** Isaac decidió optar por la "Transparencia Total", alineando ambas calculadoras para que muestren un resultado consistente y realista desde el primer contacto con el usuario.
*   **Acción Ejecutada:**
    *   Se modificó el componente `PublicSavingsCalculator.jsx`.
    *   Se reemplazó su motor de cálculo simple por una réplica del motor de cálculo del backend, que incluye la estimación de la **Comisión de Originación** y la **Comisión de Servicio/Seguro**.
    *   Se actualizaron los textos y disclaimers para reflejar la inclusión de todas las comisiones.
*   **Estado Actual:** Los cambios fueron subidos a GitHub para un nuevo despliegue en Vercel. La verificación de que la calculadora pública ahora muestra los valores correctos (ej: ~Bs. 508.41) está **pendiente por parte de Isaac**.