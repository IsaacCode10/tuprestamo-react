# Estado del Proyecto - 18 Nov 2025 (Punto de Pausa)
Vigente: 2025-11-18

## Resumen del Bug
- **Síntoma:** El Dashboard de Analista de Riesgo muestra un perfil "fantasma" (Sin Nombre, valores en 0 y N/A) para la solicitud de `rendimax.oficialbo@gmail.com`.
- **Diagnóstico Preliminar:** La interfaz está renderizando valores de fallback porque el registro correspondiente en la tabla `perfiles_de_riesgo` está vacío, con campos nulos, o no se actualiza correctamente después del análisis de documentos.
- **Bloqueo Actual:** Se intentó consultar la base de datos directamente con `supabase sql` para verificar los datos, pero la ejecución fue denegada por restricciones de seguridad del entorno del CLI.

## Próximo Paso Pendiente
- **Acción Requerida:** Esperando que Isaac ejecute manualmente la siguiente consulta en su terminal y comparta el resultado para continuar con el diagnóstico.
- **Comando a ejecutar:**
```sql
SELECT s.id as solicitud_id, s.nombre_completo, s.email, s.estado as estado_solicitud, p.id as perfil_id, p.estado as estado_perfil, p.datos_sintetizados
FROM solicitudes s
LEFT JOIN perfiles_de_riesgo p ON s.id = p.solicitud_id
WHERE s.email = 'rendimax.oficialbo@gmail.com'
ORDER BY s.created_at DESC
LIMIT 1;
```

---

# Estado del Proyecto - 18 Nov 2025 (Analista de Riesgo)
Vigente: 2025-11-18

Resumen ejecutivo
- El Risk Analyst Dashboard sigue mostrando “Isaac Aguirre / Sin nombre / Bs. 0” porque la consulta a `perfiles_de_riesgo` no entrega la fila real mientras el estado permanece en `pending`. Eso activa el fallback (perfil vacío) y la UI nunca sale del mensaje “Solicitudes que pidieron ayuda”.
- Aunque Document Manager detecta que todos los documentos requeridos fueron analizados y actualiza `document_help_requests` a `resolved`, la API no refleja eso, por lo que la tarjeta lateral sigue en `pending` y el panel de Sarai no avanza al estadio “Scorecard real”.
- La prioridad del día es asegurar que `perfiles_de_riesgo.estado` pase a uno de los valores que consumimos (p. ej. `documentos-en-revision` o `pre-aprobado`) y que el ticket de ayuda asociado (solicitud 30) ya no esté en `pending`.

Notas
- Ejecutá la query `update document_help_requests set status = 'resolved' where solicitud_id = 30 and status = 'pending';` para limpiar la cola mientras se resuelve la causa raíz.
- Confirmá en Supabase que la fila de `perfiles_de_riesgo` tiene `estado` en `listo_para_revision`/`documentos-en-revision`/`pre-aprobado`/`pendiente` y que `datos_sintetizados` contiene nombre/CI/ingresos/score, así el dashboard cargará los datos reales sin fallback.