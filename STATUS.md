# Estado del Proyecto - 1 de Noviembre de 2025 (Día)

Resumen ejecutivo (flujo inversionista estable; validación E2E en curso)

- Seguimos validación E2E de KYC, email e infraestructura (Storage/Resend/RLS).

Pendientes Activos

1) Validar E2E KYC inversionista
   - Subir CI a bucket `documentos-inversionistas`, 1 sola ejecución (idempotencia), revisar "OCR compare", notificación y email sin duplicados y con acentos correctos.
2) Auto-invite con email existente
   - Enviar solicitud con email ya registrado; confirmar correo "Ya tienes una cuenta." y `solicitudes.estado='contactado'`.
3) UX Oportunidades (no verificado)
   - Navegación libre post-login; gate solo al intentar invertir.
4) Email de proyección (lead)
   - Validar en Resend/Gmail: meses, % visibles, CTA centrado, ancho compacto.
5) Analytics
   - Enriquecer `Calculator_Lead_Submitted` con `{ amount, term_months, dpf_rate, projected_gain }`.
6) RLS
   - `inversiones` SELECT por `investor_id = auth.uid()`.
   - `solicitudes` INSERT para inversionistas (con `user_id` si autenticado) y retiros.
7) Roles/Perfiles
   - Dejar de setear `role` desde cliente en `src/Auth.jsx`; mover asignación a function/trigger seguro post‑signup.
8) UI encoding residual
   - Corregir acentos visibles en `src/InvestorDashboard.jsx`, `src/App.jsx`, `src/Auth.jsx`.

Notas de Configuración

- Storage: bucket privado `documentos-inversionistas` (RLS apropiadas).
- Secrets Functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `APP_BASE_URL`, `GEMINI_API_KEY`/`GOOGLE_GEMINI_API_KEY`.

Enlaces útiles

- Portafolio: `/mis-inversiones`
- Retiros: `/retiro`
- Landing “Quiero Invertir”: `/`
- Edge Functions: `verificar-identidad-inversionista`, `handle-new-solicitud`, `save-investor-lead`, `create-notification`
