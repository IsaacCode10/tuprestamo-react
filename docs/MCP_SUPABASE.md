# Supabase MCP (Modelo de Contexto del Protocolo)

Conecta herramientas de IA (Cursor/Codex) a Supabase en modo seguro para acelerar desarrollo y QA.

## Configuración Rápida (Local / Cursor)

- Archivo: `.cursor/mcp.json` (ya agregado)

```
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=paijuvlccnkxjwjpoffe"
    }
  }
}
```

- Al iniciar, tu cliente MCP pedirá autenticarse en Supabase (OAuth en navegador). Autoriza SOLO la organización/proyecto de desarrollo.
- Recomendado: Mantener “aprobación manual” de llamadas a herramientas activada en el cliente.

## Alcance y Permisos

- Proyecto: limitado al ref `paijuvlccnkxjwjpoffe` (TUPRESTAMOBO – dev/staging).
- Producción: NO conectar. Si es imprescindible, usar solo lectura y supervisión manual.
- Grupos de funciones: por defecto están habilitadas DB y Functions; Storage puede requerir habilitarse según el cliente.

## Seguridad y Buenas Prácticas

- No apuntar a producción. Usar datos de desarrollo/ofuscados.
- Mantener “Solo lectura” para SQL cuando sea posible.
- Revisar detalles de cada herramienta antes de aprobar (mitiga prompt injection).
- No compartir esta conexión con usuarios finales; uso interno de desarrollo/QA.

## Uso Típico en Este Proyecto

- Base de Datos
  - Consultar `solicitudes` (por estado, fecha), `oportunidades`, `analisis_documentos`, `perfiles_de_riesgo`.
  - Ver esquema, RLS, triggers relacionados a `solicitudes` y oportunos.

- Functions
  - Invocar `handle-new-solicitud` (payload con `record`), `analizar-documento-v2` (filePath, documentType, solicitud_id), `sintetizar-perfil-riesgo` (solicitud_id) para QA.

- Storage
  - Listar `documentos-prestatarios/` por `user_id`/`solicitud_id`.
  - Generar URL firmada para `autorizacion_infocred_preimpresa.pdf`.

## Ejemplos de Consultas (en lenguaje natural al asistente)

- “Lista las últimas 10 filas de `solicitudes` con estado ‘pre-aprobado’ y sus `opportunity_id`.”
- “Para `solicitud_id=...`, ¿qué `document_type` existen en `analisis_documentos`? ¿Faltan requeridos según `situacion_laboral`?”
- “Invoca `analizar-documento-v2` con `{ filePath, documentType:'autorizacion_infocred_firmada', solicitud_id }` y muéstrame el JSON resultante.”
- “Genera un link firmado al archivo `{user_id}/{solicitud_id}_autorizacion_infocred_preimpresa.pdf` en `documentos-prestatarios`.”

## CI/Headless (Opcional)

Si tu cliente MCP no soporta OAuth en navegador (CI), usa PAT + headers:

```
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=${SUPABASE_PROJECT_REF}",
      "headers": {
        "Authorization": "Bearer ${SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

Variables requeridas en CI: `SUPABASE_ACCESS_TOKEN` (PAT de dev) y `SUPABASE_PROJECT_REF`.

---

Ante dudas o para extender permisos (p.ej. habilitar Storage), avísanos y ajustamos el alcance.

