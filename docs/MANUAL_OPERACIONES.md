# Manual de Operaciones (MVP)

## 1. Objetivo y rol
- Garantizar la conciliación y el flujo de pagos (prestatario → plataforma → inversionistas) sin pérdidas ni duplicados.
- Verificar documentación (comprobantes) y ejecutar los pasos operativos en tiempo y forma.

## 2. Nomenclatura y etiquetas en la plataforma
- **Oportunidad 61**: número corto de la operación. Usar este número en toda comunicación interna.
- **Prestatario**: se muestra como “Nombre (email)” si existe; si no, un UUID abreviado (ej. `f6b6…b8b7`).
- **Inversionista**: “Nombre (email)” o UUID abreviado.
- **Cuotas**: “Cuota #X (vence DD/MM/AAAA)” + estado (Pendiente, Pagado, Expirado, Por conciliar).
- **Pagos a inversionistas**: resumen por oportunidad con neto pendiente y lista de pagos (estado en español).
- **ID interno**: visible en texto secundario solo para soporte/queries.

## 3. Procedimientos clave
### 3.0 Orden operativo recomendado (prestatario aprobado)
1) **Desembolso dirigido**:
   - Verificar `Notariado: Pendiente`.
   - Subir contrato notariado firmado.
   - Confirmar que cambie a `Notariado: OK`.
   - Publicar oportunidad.
2) **Pagos de inversionistas / Por conciliar**:
   - Confirmar pagos de inversionistas hasta llegar a fondeo 100%.
3) **Desembolso dirigido**:
   - Registrar pago dirigido al banco acreedor (con comprobante).
4) **Pagos de prestatarios**:
   - Al recibir cuota, marcar `Pagado`.
5) **Pagos a inversionistas**:
   - Ejecutar transferencias y marcar `Pagado`.
6) **Fuente Única**:
   - Validar que la cuota quede en estado `OK`.

### 3.1 Pagos de prestatarios
1) Ver “Pagos de prestatarios” → Oportunidad N → expandir.
2) Abrir comprobante (Ver). Si falta, cargar solo si llegó por otro canal.
3) Marcar `Pagado` cuando corresponda (dispara `process_borrower_payment` y genera payouts).

### 3.2 Pagos a inversionistas
1) Ir a “Pagos a inversionistas” (resumen por oportunidad).
2) Revisar neto pendiente, banco/CTA y comprobantes (si existen).
3) Exportar CSV si se pagará en lote.
4) Marcar `Pagado` (dispara `mark_payout_paid` y notifica al inversionista).

### 3.3 Desembolso dirigido
1) Subir **contrato notariado** en la fila de la oportunidad.
2) Verificar estado: `Notariado: OK`.
3) Pulsar **Publicar oportunidad** (habilita fondeo en marketplace).
4) Una vez fondeada, subir comprobante de pago al banco.
5) Pulsar **Registrar pago dirigido** (genera/actualiza contrato, notifica a prestatario/inversionistas, actualiza cronograma).

### 3.4 Pagos de inversionistas (fondeo)
1) Revisar intents de pago de inversionistas.
2) Marcar `Pagado` solo cuando el pago esté confirmado.
3) Confirmar que la oportunidad pase a `fondeada` al completar el monto objetivo.
4) Verificar que se genere constancia de inversión para cada inversión pagada.

### 3.5 Por conciliar
1) Revisar comprobantes subidos pendientes de confirmación.
2) Confirmar o rechazar según extracto/soporte bancario.
3) No marcar `Pagado` sin respaldo.

### 3.6 Reabrir oportunidad
- Solo si no hay pagos acreditados. Botón “Reabrir (sin pagos)” en pagos de inversionistas.

### 3.7 Fuente Única
- En Admin Dashboard: revisar tabla “Fuente Única” por cuota. Verificar montos no-cero y estado OK/Revisar. Si marca “Revisar”, validar cobros vs payouts y repetir conciliación.

## 4. Checklist diario
- Descargar extracto bancario y conciliar pagos de prestatarios.
- Validar comprobantes pendientes y marcar `Pagado` los que apliquen.
- Generar/exportar CSV de pagos a inversionistas y marcar `Pagado` tras transferir.
- Revisar Fuente Única para cuotas del día y resolver discrepancias.
- Registrar desembolsos dirigidos pendientes (si aplica).

## 5. Checklist operativo E2E (con oportunidad real)
1) Prestatario acepta propuesta y pasa a `pendiente_notariado`.
2) Operaciones sube contrato notariado y verifica `Notariado: OK`.
3) Operaciones publica oportunidad para fondeo.
4) Operaciones confirma pagos de inversionistas hasta `fondeada`.
5) Operaciones registra pago dirigido al banco (con comprobante).
6) Prestatario sube comprobante de cuota en su panel.
7) Operaciones valida comprobante y marca `Pagado` en “Pagos de prestatarios”.
8) Verificar que se generan payouts `pending` en “Pagos a inversionistas”.
9) Ejecutar transferencias a inversionistas (CSV si aplica) y marcar payouts `Pagado`.
10) Verificar en panel inversionista: pago `Pagado` + comprobante + constancia/contrato de inversión.
11) Admin valida “Fuente Única” en estado `OK`.
12) Registrar evidencias (capturas) y cerrar ciclo.

## 6. Incidencias comunes
- **Estado en inglés**: refrescar; los estados se muestran en español. Si persiste, reportar a soporte.
- **Comprobante no abre**: revisar permisos de rol (admin/ops) o volver a cargar el archivo.
- **Pago duplicado**: no marcar `Pagado` si el status no es Pendiente/Por conciliar; escalar a soporte antes de aplicar manualmente.

## 7. Próximos manuales sugeridos
- Analista de Riesgo (flujos de aprobación, scoring, documentos).
- Super Admin/CEO (toggles, despliegues, contingencias).
