# MODO TRABAJO CODEX (OBLIGATORIO)

Objetivo: calidad operativa de nivel produccion para evitar errores repetitivos en E2E.

## Regla base
- No se ejecuta ningun paso critico sin preflight tecnico completo.

## Preflight obligatorio antes de cada boton critico
1. **RPC unico por nombre**
   - Verificar en `pg_proc` que no haya overload ambiguo para el RPC a usar.
2. **Tipos compatibles**
   - Confirmar tipo real de IDs en tablas (`bigint` vs `uuid`) y tipo enviado por frontend.
3. **Contrato frontend-backend**
   - Revisar la llamada exacta en frontend (parametros y tipos) contra la firma SQL activa.
4. **Estado de datos previo**
   - Validar que el registro objetivo exista y este en estado procesable.
5. **Post-check definido**
   - Preparar queries de verificacion para confirmar impacto inmediatamente despues del click.

## Go / No-Go
- **GO**: solo si 1-5 estan en verde.
- **NO-GO**: si falla 1-5, primero se corrige codigo/migracion y luego se reintenta.

## Botones criticos cubiertos
- Marcar pagado (prestatario / inversionista)
- Registrar pago dirigido
- Publicar oportunidad
- Procesos que generan cronogramas, payouts o notificaciones

## Criterio de excelencia
- "Funciona" no alcanza. Debe quedar:
  - sin ambiguedades de firma RPC,
  - sin desalineacion de tipos,
  - con verificacion SQL antes y despues,
  - y con evidencia reproducible.

