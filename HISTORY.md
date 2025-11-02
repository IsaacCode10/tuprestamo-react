# Historial de Cambios (Resueltos)

## 1 de Noviembre de 2025 (Tarde)
- InvestorDashboard: no bloquea por verificación; banner no bloqueante y CTAs activos (`src/InvestorDashboard.jsx`).
- Notificaciones: panel en Header, lista y marca leídas (`src/components/Header.jsx`, `src/components/NotificationBell.jsx`).
- KYC (Edge): acentos corregidos, filtro estricto, idempotencia y matching robusto (sin duplicados) (`supabase/functions/verificar-identidad-inversionista/index.ts`).
- Storage: bucket `documentos-inversionistas` priorizado; fallback al anterior (compatibilidad) (`src/InvestorVerification.jsx` + Edge).
- Auto‑invite inversionista: maneja email existente con correo “Ingresar/Restablecer” (`supabase/functions/handle-new-solicitud/index.ts`).
- Email de proyección: plantilla compacta, meses, % visibles, CTA centrado (`supabase/functions/save-investor-lead/index.ts`, `supabase/functions/_shared/email.ts`).
- Deploys: Vercel (frontend), Functions: verificar-identidad-inversionista, create-notification, save-investor-lead, handle-new-solicitud.

## 28 de Octubre de 2025
- Portafolio MVP: `src/MyInvestmentsList.jsx`; rutas protegidas `/mis-inversiones`, `/retiro` en `src/App.jsx`.
- Retiro (MVP): `src/WithdrawalForm.jsx`.
- Formulario interés inversionista endurecido (zod, mapeo departamento, evento analytics).
- Onboarding inversionista automático vía `handle-new-solicitud` (invite + email Resend).
- Redeploy de `handle-new-solicitud`.

## 26 de Octubre de 2025 (Noche)
- “monitor-gemini-model”: función guardiana diaria, alertas por email (`supabase/functions/monitor-gemini-model/index.ts`), scheduler en `supabase/config.toml`.
