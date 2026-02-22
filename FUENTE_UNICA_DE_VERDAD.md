# FUENTE UNICA DE VERDAD (SINGLE SOURCE OF TRUTH)

Este documento explica la fuente unica de verdad (SSOT) para el flujo de pagos
prestatario -> operaciones -> pagos a inversionistas. La meta es que cualquier
persona (incluido un CTO nuevo) pueda entender la regla de negocio, el backend,
el frontend y el mecanismo de consistencia para que no falle.

## 1) Regla de negocio (que queremos garantizar)

- Cada cuota del prestatario tiene un registro canonico en el cronograma
  (`amortizaciones`).
- Cada cuota debe tener un "intent" (intencion de pago) en
  `borrower_payment_intents` con:
  - `installment_no` (numero de cuota).
  - `due_date` (fecha de vencimiento).
  - `expected_amount` (cuota fija con admin/seguro prorrateado).
- Cuando operaciones valida el pago, se marca el intent como `paid` y se
  generan automaticamente:
  - movimientos en `movimientos`.
  - payouts a inversionistas en `payouts_inversionistas`.
- La vista `borrower_schedule_view` es la unica fuente de verdad para el
  cronograma que ve el prestatario (no se debe mezclar otra fuente).

## 2) Modelo backend (fuente unica)

Tablas y vista clave:

- `amortizaciones` (canon de cuotas):
  - Un registro por cuota (installment).
  - Define `installment_no`, `due_date`, `payment`, `principal`, `interest`,
    `balance`, `status`.
- `borrower_payment_intents` (estado de pago de cada cuota):
  - Un registro por cuota.
  - Campos clave: `installment_no`, `due_date`, `expected_amount`, `status`,
    `paid_at`, `paid_amount`, `receipt_url`.
- `borrower_schedule_view` (vista SSOT):
  - Une `amortizaciones` con `borrower_payment_intents` para exponer en una sola
    salida: calendario + estado real del pago.

La vista debe tolerar inconsistencias temporales y hacer join por:

- `opportunity_id` + `due_date` cuando `due_date` existe.
- Fallback: `opportunity_id` + `installment_no` cuando `due_date` es NULL.

Esto asegura que el frontend siempre vea el estado correcto aun si hubo un
registro incompleto.

## 3) Frontend (consumo unico)

Componente actual: `src/BorrowerDashboard.jsx`

Regla de oro en frontend:

- El cronograma y el estado de pagos del prestatario se obtienen SOLO desde
  `borrower_schedule_view`.
- No se deben leer `amortizaciones` y `borrower_payment_intents` por separado.

Flujo:

1) El dashboard consulta `borrower_schedule_view` filtrando
   `opportunity_id` y `borrower_id`.
2) Se renderiza el cronograma con `installment_no`, `due_date`, `payment`.
3) El estado de cada cuota se toma de `borrower_status` y `paid_at`.
4) Si hay `receipt_url`, se firma y se permite ver el comprobante.

Esto es el contrato "frontend <-> backend" de SSOT.

## 4) Regla oficial de mora y dias de gracia

Regla oficial (alineada al Admin Dashboard):

- Dias de gracia: 3 dias calendario.
- `due_date` es la fecha contractual (del cronograma), nunca se cambia.
- `paid_at` es la fecha real de pago, puede ser antes o despues.
- Dias de atraso:
  - `days_past_due = max(0, hoy - due_date - 3 dias)`.
  - Si existe `paid_at`, usar `paid_at` en lugar de `hoy`.
- Estado sugerido (si se decide reflejarlo):
  - `pending`: no hay pago.
  - `paid`: pago completo dentro de gracia.
  - `paid_late`: pago completo despues de gracia (opcional).

Esta regla se usa para KPIs y buckets 0-30 / 31-60 / 61-90 / 90+.

Implementacion backend:

- Vista `borrower_mora_view` calcula `days_past_due`, `is_overdue` y `paid_late`
  usando la regla anterior. El frontend debe consumir esa vista para mora.

## 4.1) Regla oficial de Gross-Up (monto bruto vs neto)

- **Saldo deudor verificado (neto)** proviene del extracto del cliente.
- **Si el neto ≤ Bs 10.000:** aplicar **mínimo fijo de Bs 450**.
  - **Bruto = neto + 450**.
- **Si el neto > Bs 10.000:** aplicar **gross-up** por comisión según perfil (A 3%, B 4%, C 5%).
  - **Bruto = neto / (1 - comisión)**.
- Esta regla se usa en el cálculo de propuesta y en la aprobación final; no debe variar entre frontend y backend.
- **Backend manda:** si existe `saldo_deudor_verificado`, el backend **ignora** cualquier `monto_bruto_aprobado` manual y recalcula el bruto con la regla oficial.
- **Política MVP de notariado:** Tu Préstamo absorbe el costo del contrato notariado (referencia operativa: **Bs 150** por préstamo desembolsado).
  - No existe un cargo adicional al prestatario por este concepto.
  - El costo se cubre internamente con la comisión de originación (impacta margen neto, no el cálculo bruto/neto del cliente).

## 5) Loop de 3 capas (para que no falle)

El objetivo es evitar que el join falle o que la vista muestre NULLs cuando el
pago ya existe. Se implementa en tres capas:

### Capa 1: Datos base consistentes (creacion de intents)

Al crear `borrower_payment_intents`, SIEMPRE:

- Asignar `installment_no`.
- Asignar `due_date` (copiado desde `amortizaciones`).
- Asignar `expected_amount`.

Sin esto, la vista no puede unir la cuota con su estado.

### Capa 2: Vista robusta (tolerante a fallos)

La vista `borrower_schedule_view` debe soportar datos incompletos:

- Join principal por `due_date`.
- Fallback por `installment_no` si `due_date` es NULL.

Esto evita que el frontend se quede "sin estado" aun si hubo una falla previa.

### Capa 3: Validacion y autocorreccion (backfill)

Se agrega un chequeo periodico (job, cron o funcion manual) que:

- Busca intents con `due_date` NULL.
- Rellena `due_date` desde `amortizaciones` por `installment_no`.

Esto arregla datos historicos y evita que se repita el error.

## 6) Checklist operativo (cuando algo "no actualiza")

1) Verificar `borrower_payment_intents`:
   - La cuota existe.
   - Tiene `status = paid`.
   - Tiene `due_date` correcto.
2) Verificar `borrower_schedule_view`:
   - La cuota refleja `borrower_status = paid`.
   - `borrower_payment_intent_id` no es NULL.
3) Verificar `movimientos` y `payouts_inversionistas`:
   - Se generaron movimientos para ese intent.
   - Hay payouts en `pending` listos para marcar como pagados.

## 7) Criterio de calidad (clase mundial)

La SSOT es "clase mundial" si cumple:

- El frontend NO puede inventar estados: siempre consume la vista.
- El backend NO permite intents sin los campos de join.
- La vista es tolerante a fallos y no rompe la UI.
- Existe mecanismo de backfill para reparar historicos.

## 8) Acciones recomendadas inmediatas (si se detecta el bug)

- Backfill de `due_date` en `borrower_payment_intents`.
- Ajuste de `borrower_schedule_view` con fallback por `installment_no`.
- Confirmar que el flujo de creacion de intents siempre setea `due_date`.

Con esto, la fuente unica de verdad queda estable y confiable.

## 9) Atomicidad en decisión de riesgo (Aprobado/Rechazado)

- Para evitar estados parciales, la transición crítica del analista (solicitud/perfil/oportunidad) debe ejecutarse de forma **atómica**.
- Se implementa por RPC transaccional: `public.apply_risk_decision_state(...)`.
- Regla operativa:
  - Si falla una actualización, **no se confirma ninguna**.
  - Recién después de confirmar estado en BD se envían correos/notificaciones.
