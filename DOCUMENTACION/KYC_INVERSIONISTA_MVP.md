KYC Inversionista (MVP)

Objetivo: verificar identidad de inversionistas con el mínimo de configuración, sin Webhooks ni creación de nuevos buckets.

Componentes

- Bucket: `documentos-prestatarios` (privado, ya existe).
- Frontend: `src/InvestorVerification.jsx` sube el CI, inserta en `public.documentos` e invoca la Edge Function.
- Edge Function: `supabase/functions/verificar-identidad-inversionista/index.ts` descarga el archivo con URL firmada, usa Gemini y actualiza `profiles.estado_verificacion`.

Variables necesarias (Supabase → Secrets)

- `GEMINI_API_KEY` (preferido) o `GOOGLE_GEMINI_API_KEY`.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (propias del proyecto, ya configuradas para Functions).

Paso a paso para QA

1. Iniciar sesión como usuario con rol `inversionista`.
2. Navegar a `/verificar-cuenta` y completar:
   - Número de CI.
   - Subir imagen del CI (anverso).
   - Cuenta bancaria.
3. Confirmar en Supabase → Functions → `verificar-identidad-inversionista` → Logs.
4. Revisar `public.profiles.estado_verificacion` (verificado o requiere_revision_manual).

Notas y seguridad

- El bucket es privado y la función usa `createSignedUrl`.
- La función ignora documentos que no sean `ci_inversionista_anverso`.
- Para producción, se recomienda añadir RLS en `public.documentos` y en `public.profiles` (trigger que bloquee cambios de `estado_verificacion` desde cliente). Los snippets se encuentran en conversaciones previas y pueden añadirse cuando se requiera endurecer el acceso.

