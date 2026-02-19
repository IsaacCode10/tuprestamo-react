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

## Actualizacion 2026-02-18

**Lo hecho hoy:**
- Se corrigieron errores de build provocados por `||` faltantes en:
  - `src/AdminDashboard.jsx`
  - `src/BorrowerDashboard.jsx`
  - `src/MyInvestmentsList.jsx`
  - `src/RiskAnalystDashboard.jsx`
- Se reparo el componente `NavButton` en `src/components/Header.jsx` (estaba roto por comentarios en medio del return).
- El build de Vite vuelve a pasar sin errores (queda solo el warning de `hero-bg.jpg` sin resolver en build time).

**Pendiente para manana (E2E):**
- Continuar E2E de la oportunidad nueva desde el punto actual con flujos prestatario/analista/operaciones.
- Validar end-to-end: aprobacion final -> propuesta -> aceptacion -> firma notariada -> publicacion -> fondeo -> pago dirigido -> contrato/cronograma.

## Actualizacion 2026-02-19

**Lo hecho hoy:**
- Se estabilizo el flujo de aprobacion en analista corrigiendo errores 500 por RPC faltante (`apply_risk_decision_state`) y desalineacion de firma/parametros.
- Se mejoro el manejo de errores en frontend de analista (`RiskAnalystDashboard`): ahora muestra detalle real del backend en lugar de mensaje generico.
- Se corrigio UX del campo "Saldo Deudor Verificado": inicia vacio, persiste el valor ingresado por analista y se mostro prefijo `Bs.` con entrada decimal simple.
- Se corrigio ruta de CTA en correo de propuesta (`/borrower-dashboard`) y se agrego redireccion de compatibilidad desde `/dashboard-prestatario`.
- Se reforzo hardening para solicitudes duplicadas activas por email (backend + mensaje claro en frontend).
- Se unifico calculo de costos/cuota bajo SSOT en aprobacion y propuesta, incluyendo persistencia canonica de:
  - `interes_total`
  - `comision_servicio_seguro_total`
  - `costo_total_credito`
  - `cuota_promedio`
- Se saneo historial de migraciones Supabase:
  - legacy `20251127` movida a `supabase/sql/`
  - legacy `20260219` movida a `supabase/sql/`
  - `db push --linked` vuelve a funcionar y queda `Remote database is up to date`.
- Se documento en `MODE_DE_TRABAJO_CODEX.md` el procedimiento obligatorio de migraciones (naming, flujo, recovery y plan B).

**Pendiente para siguiente bloque:**
- Ejecutar una corrida E2E nueva completa para validar consistencia final SSOT:
  - propuesta (cuota/costos),
  - tabla de amortizacion,
  - correo de propuesta.
- Confirmar con SQL post-aprobacion que `oportunidades` persiste valores canonicos coherentes en todos los campos de costo.
- Registrar cierre funcional definitivo del capitulo "Aprobacion y propuesta" si la corrida E2E queda 100% consistente.
