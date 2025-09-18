# Estado del Proyecto: Tu Prestamo

**Fecha del último trabajo:** jueves, 18 de septiembre de 2025

---

## ALERTA DE SEGURIDAD CRÍTICA: LLAVES SECRETAS EXPUESTAS EN GITHUB

**Situación Actual:**
Se ha detectado que las llaves secretas de Google (GEMINI_API_KEY) y Supabase (SUPABASE_SERVICE_KEY) fueron accidentalmente subidas al repositorio de GitHub. Esto representa un riesgo de seguridad muy alto.

**Acciones URGENTES y CRÍTICAS (a realizar por Isaac):**

1.  **REVOCAR/REGENERAR LLAVES COMPROMETIDAS:**
    *   **Google API Key:** Eliminar la clave expuesta en Google Cloud Console y generar una nueva.
    *   **Supabase Service Key:** Regenerar la clave `service_role` en Supabase para invalidar la expuesta.

2.  **LIMPIAR HISTORIAL DE GIT:**
    *   Es CRÍTICO eliminar las llaves de todo el historial del repositorio de Git. Esto requiere herramientas como `git filter-repo` o `BFG Repo-Cleaner`.
    *   **NO REALIZAR NINGÚN `git commit` O `git push` ADICIONAL HASTA QUE ESTO ESTÉ RESUELTO.**
    *   Se guiará a Isaac en este proceso mañana.

3.  **ACTUALIZAR VARIABLES DE ENTORNO EN VERCEL:**
    *   Una vez generadas las nuevas llaves, actualizar los valores de `GEMINI_API_KEY` y `SUPABASE_SERVICE_KEY` en Vercel con las nuevas llaves seguras.

4.  **PREVENCIÓN FUTURA:**
    *   Nunca pegar llaves secretas directamente en archivos de texto o código. Siempre usar variables de entorno o archivos `.env` (excluidos por `.gitignore`).

---

**Próximo Paso:**
Retomar la limpieza del historial de Git y la configuración de las nuevas llaves mañana.