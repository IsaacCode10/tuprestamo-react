# Manual de Lecciones Aprendidas: Tu Préstamo

Este documento es la fuente de verdad para las lecciones técnicas cruciales aprendidas durante el desarrollo. Su propósito es evitar repetir errores y acelerar la resolución de problemas.

---

## Lección 1: El Círculo de Confianza de Supabase (La Saga del Bug de Documentos - 26/Oct/2025)

### El Problema

Un bug persistente impedía que la subida de documentos se reflejara en el frontend. El usuario subía un archivo, la interfaz mostraba "Analizando...", y luego volvía al estado "Pendiente" sin mostrar "Completado" ni errores, a pesar de que la función de análisis en el backend funcionaba perfectamente.

### El Diagnóstico: Una Cadena de 3 Errores

La solución no fue una sola, sino la caza de tres bugs interconectados que se ocultaban uno detrás del otro:

1.  **Bug de Frontend (UI State):**
    *   **Causa:** El código en `BorrowerDashboard.jsx` obtenía la lista de documentos, pero **nunca actualizaba el estado del componente** con esa lista (`setDocuments` faltaba).
    *   **Solución:** Se añadió la línea de código faltante.

2.  **Bug de Backend (Dependencia Externa - API de Gemini):**
    *   **Causa:** La Edge Function `analizar-documento-v2` usaba un nombre de modelo de IA (`gemini-1.5-flash-latest`) que Google había dado de baja.
    *   **Solución:** Se obtuvo el nuevo nombre del modelo (`gemini-2.5-flash`) y se actualizó el código de la función. La lección clave es que los nombres de los modelos de IA deben ser tratados como configuración en `Secrets`.

3.  **Bug de Permisos (RLS - El Verdadero Villano):**
    *   **Causa:** Faltaba una **Política de Seguridad (RLS)** en la tabla `documentos` para la operación de `SELECT`. El usuario podía escribir el documento, pero no tenía permiso para leerlo después.
    *   **Solución:** Se añadió la política de RLS para permitir a cada usuario leer sus propios documentos.

### La Regla de Oro: El Círculo de Confianza de Supabase

Para que una funcionalidad full-stack en Supabase funcione, debemos respetar siempre este "Círculo de Confianza":

1.  **El Frontend (Navegador):** Opera como **usuario autenticado** y sus permisos están **limitados por RLS**. Necesita una política para cada acción (`SELECT`, `INSERT`, etc.).
2.  **El Backend (Edge Functions):** Opera como **Super Administrador** usando la `SERVICE_ROLE_KEY`. **Ignora todas las políticas de RLS** para tener control total.

**Diagnóstico Rápido para el Futuro:** Si una operación falla silenciosamente (no hay errores, pero los datos no aparecen), el sospechoso #1 es **siempre una política de `SELECT` de RLS que falta**.

### Mitigación a Largo Plazo: Monitoreo Proactivo

Como resultado directo del Bug #2 (Dependencia Externa), se identificó un riesgo operativo: un cambio en la API de un tercero podía romper una funcionalidad crítica sin previo aviso.

*   **Solución Implementada:** Se creó una "función guardiana" llamada `monitor-gemini-model`.
*   **Funcionamiento:**
    *   **Disparador:** Se ejecuta automáticamente todos los días a las 9:00 AM UTC, programada vía `supabase/config.toml`.
    *   **Acción:** Realiza una llamada de prueba a la API de Gemini para verificar que el modelo configurado es válido y operativo.
    *   **Alerta:** Si la prueba falla, envía inmediatamente un correo de alerta a los administradores (definidos en el secreto `ALERT_EMAIL`), permitiendo una acción correctiva antes de que los usuarios se vean afectados.

Esta medida de resiliencia transforma al sistema de reactivo (esperar a que los usuarios reporten un problema) a proactivo (detectar el problema automáticamente).