# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## KYC Inversionista (MVP)

Flujo mínimo para verificar identidad de inversionistas sin Webhooks ni configuración manual de Storage:

- Bucket usado: `documentos-prestatarios` (privado, ya existente).
- Frontend: al subir CI, inserta en `public.documentos` y luego invoca la Edge Function.
- Edge Function: descarga el archivo con URL firmada, extrae `nombre_completo` y `numero_ci` con Gemini y actualiza `profiles.estado_verificacion`.

Rutas relevantes

- Frontend: `src/InvestorVerification.jsx` – sube CI al bucket, inserta documento y llama la función.
- Función: `supabase/functions/verificar-identidad-inversionista/index.ts` – usa `documentos-prestatarios` y `GEMINI_API_KEY` (o `GOOGLE_GEMINI_API_KEY`).

Variables requeridas (Supabase → Secrets)

- `GEMINI_API_KEY` (recomendado) o `GOOGLE_GEMINI_API_KEY`.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (ya presentes en el entorno de Functions).

Cómo probar

1. Iniciar sesión como inversionista y abrir `/verificar-cuenta`.
2. Subir imagen del CI (anverso) y completar datos.
3. Revisar logs en Supabase → Functions → `verificar-identidad-inversionista`.
4. Verificar en `public.profiles` el campo `estado_verificacion`.

Notas

- No se requieren Database Webhooks para el MVP (el frontend invoca la función directamente).
- Si luego se desea mayor robustez, se puede añadir un Webhook para disparar la función en cada INSERT de `documentos`.
