# Manual Super Admin / CEO (MVP)

## 1. Objetivo y rol
- Definir reglas de negocio, priorizar roadmap y validar en producción.
- Supervisar operaciones sin ejecutar cambios de código ni tocar datos sensibles.

## 2. Nomenclatura y vista rápida
- **Oportunidad 61**: ID corto de operación; usar este número en revisiones.
- **Prestatario/Inversionista**: mostrar nombre/email (o UUID abreviado).
- **Estados clave**: borrador, disponible, fondeada, activo, cerrado/en mora; payouts pendientes/pagados.
- **Fuente Única**: tabla de control en Admin Dashboard para detectar brechas entre cobros y pagos.

## 3. Flujos que puede operar
- **Validación de UI en producción**: revisar dashboards (Admin, Operaciones, Analista) y confirmar copys/estados.
- **Despliegues**: ejecutar bloque estándar `git add ... && git commit ... && npm run build && npx vercel --prod` solo cuando CTO lo provea.
- **Supabase**: puede ejecutar queries de lectura y verificar logs; no alterar schema sin migraciones preparadas.

## 4. Checklist de revisión (día a día)
- Oportunidades activas y porcentajes de fondeo.
- Pagos de prestatarios y pagos a inversionistas pendientes en Operaciones.
- Fuente Única: estados OK/Revisar por cuota (montos no-cero).
- Mora (Admin Dashboard): sección “Mora (cuotas vencidas)” con KPIs globales y tabla por oportunidad (cuotas/montos vencidos, % mora, días de atraso). Revisar 0-30/31-60/61-90/90+ y priorizar cuentas con mayor monto vencido.
- Notificaciones en producción (p. ej. payout pending/paid, pagos verificados).

## 5. Checklist E2E (validación con oportunidad real)
1) Confirmar que el prestatario subió comprobante de cuota.
2) Verificar que Operaciones marcó `Pagado` y se generaron payouts.
3) Verificar en panel inversionista: payout `Pagado` y comprobante visible.
4) Validar “Fuente Única” sin brechas.
5) Registrar evidencia (capturas y IDs).

## 6. Qué NO hacer
- No tocar código directamente.
- No editar datos de producción sin guías/migraciones del CTO.
- No publicar cambios sin build/deploy completo.

## 7. Incidencias y escalamiento
- **UI muestra inglés/errores**: anotar pantalla y URL, escalar a CTO.
- **No abre comprobante**: verificar rol (admin/ops) y reportar.
- **Brecha en Fuente Única**: escalar a Operaciones/CTO con IDs de oportunidad/cuota.
