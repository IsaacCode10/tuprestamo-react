# Edge Function: `monitor-gemini-model`

## Propósito

Esta función actúa como un "guardián" proactivo para nuestra integración con la API de Google Gemini. Se ejecuta diariamente para verificar que el modelo de IA que usamos sigue siendo válido y accesible.

El objetivo es detectar cambios por parte de Google (ej: nombres de modelos obsoletos) *antes* de que afecten la funcionalidad de análisis de documentos para nuestros usuarios.

## Lógica

1.  Se ejecuta automáticamente a través de un Cron Job definido en `supabase/config.toml`.
2.  Realiza una llamada de `generateContent` a la API de Google usando el modelo definido en el secreto `GEMINI_MODEL`.
3.  Si la llamada es exitosa, la función termina silenciosamente con un estado `healthy`.
4.  Si la llamada falla (ej: por un error 404 Not Found), envía un correo electrónico de ALERTA a las direcciones configuradas en el secreto `ALERT_EMAIL`.

## Configuración (Secretos Requeridos)

- `GEMINI_API_KEY`: La llave de API de Google AI Studio.
- `GEMINI_MODEL`: El nombre del modelo a monitorear (ej: `gemini-2.5-flash`).
- `RESEND_API_KEY`: La llave de API para enviar correos de alerta.
- `ALERT_EMAIL`: Una lista de correos separados por comas que recibirán las alertas.

## Prueba Manual

Para forzar una ejecución y verificar el estado actual, usa el siguiente comando, reemplazando los placeholders:

```bash
curl -i -H "Authorization: Bearer <TU_SUPABASE_ANON_KEY>" "https://<TU_PROYECTO_REF>.supabase.co/functions/v1/monitor-gemini-model"
```
