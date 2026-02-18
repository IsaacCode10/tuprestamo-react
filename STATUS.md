## Actualizacion 2026-02-17

**Lo hecho hoy:**
- Se corrigio el flujo de recuperacion de contrasena: `auth/v1/recover` ya envia correos (error 535 por SMTP resuelto con nueva API key en Resend usada como password SMTP en Supabase).
- Se actualizo el template de email "Reset Password" en Supabase con estilo del Brand Kit.
- Se agrego aviso en UI: "Revisa tu bandeja de Spam" al solicitar recuperacion de contrasena.
- Se implemento template de rechazo en `handle-new-solicitud` (antes estaba vacio) con tono politico y coherente a Brand Kit.
- Se ajusto el correo de contacto en rechazo a `contacto@tuprestamobo.com`.
- Se ajustaron colores de botones en Auth para alternancia visual (Iniciar Sesion + Refinanciar Tarjeta mismo color, Olvide mi contrasena + Quiero Invertir mismo color).
- Se documento en `MODE_DE_TRABAJO_CODEX.md` que siempre debo entregar comandos de deploy al finalizar implementaciones (sin preguntar).
- Se corrigio el flujo de reintentos: si el email ya existe, se reutiliza el usuario y se envia magic link, evitando error 500.
- Se elimino trigger duplicado en `solicitudes` y se actualizo el trigger restante para invocar la Edge Function.
- Se unifico el remitente de correos a **Tu Préstamo** en funciones (branding consistente).
- Se corrigio el flujo de documentos completos: ahora exige `autorizacion_infocred_firmada` antes de enviar el correo.
- Se corrigio el gross-up en el panel de analista para respetar el minimo Bs 450 cuando neto ≤ 10.000.
- Se endurecio backend: si existe `saldo_deudor_verificado`, se ignora el bruto manual y se recalcula con regla oficial.
- Se documento en SSOT la regla de gross-up y la prioridad del backend.

## Actualizacion 2026-02-17 (tarde)

**Lo hecho hoy:**
- Se desplegaron funciones con remitente unificado (Tu Préstamo) en emails.
- Se desplego el fix de reintentos con usuario existente + magic link.
- Se desplego el fix de documentos completos (requiere `autorizacion_infocred_firmada`).
- Se identifico el origen del error de gross-up en el panel de analista (calculaba siempre por porcentaje).

**Pendiente para mas tarde/manana:**
- Deploy de frontend pendiente (Auth copy/colores + RiskAnalyst gross-up UI) si no se hizo aun.
- Deploy de `registrar-decision-final` con recalculo forzado del bruto (si no se hizo aun).
- Continuar E2E de la nueva oportunidad: analista -> decision final -> propuesta -> aceptacion -> pago dirigido -> contrato/cronograma.

**Pendiente:**
- Deploy de cambios recientes (frontend + functions):
  - `src/Auth.jsx` (mensaje de spam),
  - `src/Auth.css` (colores),
  - `supabase/functions/handle-new-solicitud/index.ts` (template rechazo).
- Continuar flujo E2E con nueva oportunidad (videollamada, boleta electricidad, agendar firma, notariado, pago dirigido, contrato/cronograma).
