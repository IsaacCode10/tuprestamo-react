# Modo de Trabajo Codex (CEO/CTO)

## Roles y responsabilidades
- **Isaac (CEO)**: define reglas de negocio y decide qué implementar. Valida en producción (Vercel), revisa logs en consola y edge functions de Supabase, puede correr queries en Supabase y ejecutar commits desde su terminal, pero **no toca el código**.
- **Codex (CTO)**: se encarga de toda la implementación técnica. Traduce las instrucciones de negocio en código, prepara scripts/SQL, y entrega bloques de comandos listos para ejecutar.

## Acceso y permisos
- Trabajamos en el repo `tuprestamo-react` con permisos de lectura/escritura.
- Uso de la CLI para git, Vercel y Supabase desde esta terminal (tokens ya guardados).

## Flujo habitual
- Revisar estado: `git status`.
- Agregar solo archivos relevantes (código/docs): `git add ...`.
- Commit con mensaje claro: `git commit -m "..."`.
- Push al remoto: `git push`.
- Desplegar frontend: `npx vercel --prod`.

## Operaciones en Supabase
- Ejecutar SQL directo desde Supabase CLI; puedo preparar scripts/vistas/funciones según se necesite.
- Consultas a tablas relevantes (p. ej. documentos, análisis, payments) se hacen bajo RLS y con el rol adecuado.

## Framework de diagnóstico (obligatorio antes de tocar código)
1) Reproducir el bug y abrir consola (F12) + Network.
2) Consultar RLS y buckets en Supabase (policies de tablas y `storage.objects`).
3) Verificar si el usuario/rol tiene permisos reales (profiles.role y app_metadata.role).
4) Revisar errores en Network (403/401/500) y logs de Supabase si aplica.
5) Solo si todo lo anterior está OK, recién cambiar código.

## Monitoreo y QA
- Revisar logs de deploy y consistencia del `.env`.
- Probar en producción/staging y confirmar cambios en UI con tu aprobación.
- Actualizar `STATUS.md` o docs cuando se cierre una tarea.

## Formato de entrega de comandos
- Siempre que haga un cambio, debo incluir el bloque de comandos para deployar (build + vercel) aunque no lo pidas.
- No debo preguntar si quieres deploy; siempre entrego los comandos directamente al terminar una implementacion.
- Cuando pidas comandos (git/build/deploy), te los paso en **un solo bloque** listo para copiar/pegar, con cada comando en su propia línea (sin bullets intermedios).

## Regla clave de datos (Supabase)
- **Nunca asumir nombres de tablas o columnas.** Siempre pedir a Isaac que consulte el esquema en Supabase (Editor/queries) y devuelva la estructura antes de implementar. Implemento solo con el panorama confirmado.

## Deploy de Supabase
- Si hay cambios en funciones/SQL de backend, incluyo también los comandos de deploy y ejemplos de invocación de edge functions (PowerShell usa `Invoke-WebRequest` en lugar de `curl`).

## Regla CTO: deploy vs migración (obligatoria)
- **Responsable:** Codex (CTO) debe detectar siempre si un cambio requiere solo deploy o también migración de base de datos.
- **Deploy de function NO reemplaza migración.**
  - `supabase functions deploy ...` actualiza solo código de Edge Functions.
  - `supabase db push --linked` (o SQL manual en Dashboard) actualiza objetos de DB: tablas, columnas, RPC, triggers, policies.
- **Cuándo migrar sí o sí:** cuando el cambio usa/crea/modifica SQL en `supabase/migrations/*.sql` o depende de una nueva función RPC/columna/trigger/policy.
- **Checklist de cierre que debe entregar Codex:**
  1) Comandos de git/push.
  2) Comandos de deploy de functions afectadas.
  3) Comandos de migración DB (si aplica) o script SQL manual alternativo.
  4) Query de verificación final (que confirme que la función/columna/policy existe).

## Bloque estándar de deploy (frontend + git)
```
git add ... && git commit -m "..." && npm run build && npx vercel --prod
```

## Regla de codificación UTF-8 (antimojibake)
- El proyecto usa UTF-8 + LF por defecto (`.editorconfig` y `.gitattributes` ya configurados). No cambiarlos sin motivo.
- Antes de deploy, revisar rápido caracteres rotos en `src/`:
  - `rg -n "Ã|Â|�" src`
- Si aparece mojibake, corregir el literal en el archivo fuente antes de compilar.
- En Windows/PowerShell, evitar copiar/pegar texto desde fuentes que cambian codificación (Word, WhatsApp Desktop, etc.) sin validar.
- Si se tocan textos con acentos en JSX/TS/MD, verificar visualmente en UI la sección afectada.
