# Manual de Lecciones Aprendidas: Tu Préstamo

Este documento es la fuente de verdad para las lecciones técnicas cruciales aprendidas durante el desarrollo. Su propósito es evitar repetir errores y acelerar la resolución de problemas.

---

## Lección 1: El Círculo de Confianza de Supabase (La Saga del Bug de Documentos - 26/Oct/2025)

### El Problema

Un bug persistente impedía que la subida de documentos se reflejara en el frontend. El usuario subía un archivo, la interfaz mostraba "Analizando...", y luego volvía al estado "Pendiente" sin mostrar "Completado" ni errores, a pesar de que la función de análisis en el backend funcionaba perfectamente.

### El Diagnóstico: Una Cadena de 3 Errores

La solución no fue una sola, sino la caza de tres bugs interconectados que se ocultaban uno detrás del otro:

1.  **Bug de Frontend (UI State):**
    *   **Síntoma:** La UI nunca se actualizaba.
    *   **Causa:** El código en `BorrowerDashboard.jsx` obtenía la lista de documentos de la base de datos, pero **nunca actualizaba el estado del componente** con esa lista. La línea `setDocuments(docsData)` faltaba.
    *   **Solución:** Se añadió la línea faltante para que la UI pudiera "pintar" los datos que recibía.

2.  **Bug de Backend (Dependencia Externa - API de Gemini):**
    *   **Síntoma:** Después de arreglar el primer bug, la subida fallaba con un error `500 Internal Server Error` en la consola.
    *   **Causa:** La Edge Function `analizar-documento-v2` usaba un nombre de modelo de IA (`gemini-1.5-flash-latest`) que Google había dado de baja. La API de Gemini devolvía un error `404 Not Found`.
    *   **Solución:** Se ejecutó el comando `curl` documentado en `STATUS.md` para obtener la lista de modelos actual. Se identificó el nuevo nombre (`gemini-2.5-flash`) y se actualizó el código de la función. **Lección Clave:** Los nombres de los modelos de IA no son permanentes y deben ser tratados como configuración (en Secrets), no como código fijo.

3.  **Bug de Permisos (RLS - El Verdadero Villano):**
    *   **Síntoma:** Después de arreglar los dos bugs anteriores, la UI seguía sin actualizarse, pero esta vez no había NINGÚN error. Los logs de la Edge Function eran perfectos.
    *   **Causa:** Este fue el problema raíz. Faltaba una **Política de Seguridad (RLS)** en la tabla `documentos`. El usuario tenía permiso para `INSERT` (subir el archivo), pero no tenía permiso para `SELECT` (leer sus propios archivos después). Por lo tanto, la UI pedía la lista actualizada, la base de datos devolvía una lista vacía (por seguridad), y la UI mostraba "Pendiente".
    *   **Solución:** Se añadió la política de RLS crucial:
        ```sql
        CREATE POLICY "Permitir a usuarios leer sus propios documentos"
        ON public.documentos
        FOR SELECT
        USING (auth.uid() = user_id);
        ```

### La Regla de Oro: El Círculo de Confianza de Supabase

Para que una funcionalidad full-stack en Supabase funcione, debemos respetar siempre este "Círculo de Confianza":

1.  **El Frontend (El Navegador del Usuario):**
    *   Opera como un **usuario autenticado**. 
    *   Sus permisos están **limitados por RLS**.
    *   Para CUALQUIER operación (`SELECT`, `INSERT`, `UPDATE`, `DELETE`), debe existir una política de RLS en la tabla que le otorgue permiso explícitamente, usualmente usando `auth.uid()` para asegurar que solo acceda a sus propios datos.

2.  **El Backend (Las Edge Functions):**
    *   Operan como un **Super Administrador**.
    *   Deben usar la `SUPABASE_SERVICE_ROLE_KEY` para inicializar su cliente.
    *   Este rol **ignora y se salta TODAS las políticas de RLS**. Le permite leer o modificar cualquier dato en cualquier tabla, lo cual es necesario para tareas administrativas o procesos que involucran a múltiples usuarios.

**Diagnóstico Rápido para el Futuro:**

Si una operación falla silenciosamente (no hay errores, pero los datos no aparecen), el sospechoso #1 es **siempre una política de `SELECT` de RLS que falta**.
