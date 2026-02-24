# Modelo de Negocio V3: Refinanciamiento Dirigido

Este documento describe el modelo de negocio y la lógica de cálculo para el producto MVP de Tu Préstamo, enfocado en el refinanciamiento de deudas de tarjetas de crédito.

## Principio Fundamental: Liquidación Total y Cero Riesgo de Desvío

El objetivo principal del producto es liquidar el **100% de la deuda** de la tarjeta de crédito del cliente. Para garantizar esto y eliminar el riesgo de que los fondos se utilicen para otros fines, el modelo se basa en dos pilares:

1.  **Verificación Obligatoria:** El monto del préstamo no se basa en la solicitud del cliente, sino en la **verificación del saldo deudor exacto** de su extracto de tarjeta de crédito por parte de un analista de Tu Préstamo.
2.  **Desembolso Dirigido:** El monto neto del préstamo se transfiere **directamente a la institución financiera** acreedora para pagar la deuda, nunca a la cuenta personal del prestatario.

## Límites del Préstamo (MVP)

Para la fase inicial del producto (MVP), se establecen los siguientes límites para las solicitudes de refinanciamiento:

*   **Monto Mínimo:** 5,000 Bs.
*   **Monto Máximo:** 70,000 Bs.

Estos límites se aplican al **monto de la deuda que el cliente desea refinanciar**. El monto final del préstamo será ajustado hacia arriba (Gross-Up) para cubrir las comisiones, como se detalla a continuación.

## El Problema del "Neto vs. Bruto"

Una lógica de cálculo ingenua llevaría a un fracaso operativo.

**Ejemplo del Flujo Incorrecto:**
*   **Deuda a Pagar (Verificada):** Bs. 10,000
*   Si se aprueba un préstamo por Bs. 10,000...
*   **Comisión de Originación (3%):** Bs. 300
*   **Monto Real a Desembolsar:** 10,000 - 300 = **Bs. 9,700**
*   **Resultado:** Queda un saldo de Bs. 300 en la tarjeta del cliente. La deuda no se liquida, el producto falla en su promesa.

## La Solución: Cálculo Inverso ("Gross-Up")

Para resolver esto, el **Monto Total del Préstamo** debe ser una cifra "bruta" que, después de descontar nuestra comisión, resulte en el monto "neto" exacto necesario para pagar la deuda.

### Fórmula Clave:
`Monto Total del Préstamo = Saldo Deudor Verificado / (1 - Tasa de Comisión)`

**Excepción por mínimo operativo (MVP):**
* Si el **saldo verificado ≤ Bs. 10.000**, la **originación es fija de Bs. 450** y el **monto bruto = neto + 450** (marcamos `minApplied=true`).
* Si el **saldo verificado > Bs. 10.000**, se aplica la fórmula de gross-up con la comisión por perfil (A 3%, B 4%, C 5%).

### Política de Notariado (MVP)

*   El costo de firma de contrato notariado (referencia operativa: **~Bs. 150** por operación) es **absorbido por Tu Préstamo**.
*   Para el prestatario, este costo se comunica como **incluido**: no se agrega un cargo extra separado.
*   En términos de unidad económica, este monto se descuenta del margen de originación de la plataforma.

**Ejemplo del Flujo Correcto:**
1.  **Saldo Deudor Verificado (Neto a Pagar):** Bs. 10,000
2.  **Cálculo del Préstamo (Bruto):**
    *   `Monto Total del Préstamo = 10,000 / (1 - 0.03)`
    *   `Monto Total del Préstamo = 10,000 / 0.97`
    *   `Monto Total del Préstamo = Bs. 10,309.28`
3.  **Verificación del Cálculo:**
    *   **Monto que el cliente nos deberá:** Bs. 10,309.28
    *   **Nuestra Comisión (3% de 10,309.28):** Bs. 309.28
    *   **Monto Neto a Desembolsar (Préstamo - Comisión):** `10,309.28 - 309.28` = **Bs. 10,000.00**
4.  **Resultado:** Éxito. Se desembolsan los Bs. 10,000 exactos para liquidar la deuda. El cliente nos debe el monto bruto, y sus cuotas se calculan sobre esa base.

## Flujo Operativo Resumido

1.  **Solicitud:** Cliente pide un monto **estimado**.
2.  **Verificación:** Analista ingresa el **saldo deudor verificado** (el neto).
3.  **Cálculo:** El sistema aplica el "gross-up" para obtener el **monto total del préstamo** (el bruto).
4.  **Aprobación:** Se aprueba el préstamo por el monto bruto.
5.  **Desembolso:** Se transfiere el monto neto al banco acreedor.

## Regla Financiera de Spread (Plataforma)

Para mantener consistencia entre promesa comercial y contabilidad:

* El prestatario paga según su tasa activa (A/B/C).
* El inversionista cobra según su tasa pasiva objetivo (A/B/C), menos su comisión de servicio aplicable.
* La diferencia por cuota se registra como **`spread_plataforma`**.

Esto significa que el spread:

* no desaparece,
* no se "regala" por error al inversionista,
* y queda auditable en el ledger para P&L.

## Costos Unitarios de Evaluación (P&L)

Además del waterfall de caja por cuota, Tu Préstamo reconoce costos unitarios de originación comercial:

* **Analista de riesgo:** Bs 50 por crédito aprobado.
* **Consulta INFOCRED:** Bs 11 por consulta.

Estos costos se descuentan en el P&L gerencial mensual (no en el ledger transaccional de cuotas):

`resultado_neto_aprox = EBITDA_aprox - (aprobados_mes * 50) - (consultas_infocred_mes * 11)`

## Flujo de Experiencia del Prestatario (Pre-Aprobación)

Para maximizar la conversión, el flujo operativo se enriquece con una experiencia de usuario diseñada para motivar al prestatario a completar el proceso.

1.  **Cálculo y Dashboard Provisional:** Tras la **Solicitud** (Paso 1 del flujo operativo), el sistema realiza un **cálculo provisional** basado en el monto **estimado**. Al activar su cuenta, el prestatario ve un dashboard con una **cuota mensual promedio estimada** y visualizaciones de su ahorro potencial.

2.  **Disclaimer para Transparencia:** Para gestionar expectativas, este dashboard incluye un aviso legal prominente:
    > *"LA CUOTA MENSUAL FINAL SE DEFINIRÁ CUANDO CONFIRMEMOS TU SALDO DEUDOR"*

3.  **Puente a la Verificación:** Este dashboard provisional actúa como una herramienta de conversión, incentivando al usuario a proceder con la carga de documentos para llegar a la **Verificación** (Paso 2 del flujo operativo) y obtener su oferta final.

## Estados del Panel del Prestatario (UI)

Esta sección documenta los estados que se muestran en el panel del prestatario y la lógica de avance que aplica la UI. La fuente de verdad en UI es `solicitud.estado`, y en algunos pasos se complementa con el estado de la oportunidad y el desembolso.

### Pasos del progreso (stepper)

1. Solicitud Recibida
2. Verificación Inicial
3. Sube tus Documentos
4. Revisión Final
5. Préstamo Aprobado
6. Propuesta Publicada
7. 100% Fondeada
8. Préstamo desembolsado

### Mapeo principal de estados (solicitud.estado)

| solicitud.estado | Paso UI | Qué ve el prestatario |
| --- | --- | --- |
| `pendiente` | 1–2 | Solicitud recibida / verificación inicial (sin oferta aún) |
| `pre-aprobado` | 3 | Solicitud preaprobada, pendiente de documentos |
| `documentos-en-revision` | 4 | Revisión final de documentos |
| `aprobado` | 5 | Propuesta lista (vista de oferta) |
| `aprobado_para_oferta` | 5 | Propuesta lista (vista de oferta) |
| `prestatario_acepto` | 6 | Oportunidad publicada y en fondeo |
| `fondeada` | 7 | 100% fondeada, previo al desembolso |
| `pago_dirigido` / `desembolsado` / `activo` / `pagado` | 8 | Préstamo desembolsado o activo, con cronograma |

### Reglas adicionales de avance en la UI

- Si el prestatario sube todos sus documentos (`allDocumentsUploaded = true`), el stepper fuerza el paso **Revisión Final** aunque el estado aún no haya cambiado a `documentos-en-revision`.
- Si la oportunidad está en estado `fondeada` o existe un desembolso, el stepper avanza al paso **100% Fondeada**.
- Si la oportunidad está en `desembolsado` / `activo` / `pagado`, o el desembolso está pagado, el stepper marca **Préstamo desembolsado**.

Nota: la UI refleja estados; las transiciones se definen en backend/operaciones. Si un estado nuevo se agrega en backend, se debe mapear aquí para mantener coherencia.

## Cargos Recurrentes al Prestatario (MVP)

* **Admin + Seguro:** `0,15% mensual` sobre saldo, con **mínimo 10 Bs/mes** (cargo decreciente incluido en la cuota simulada).
* **Base de cálculo:** Siempre el saldo deudor verificado (neto). El bruto se calcula vía gross-up o suma del mínimo según corresponda.
* **Presentación en la propuesta:** Para mantener una **cuota fija comunicada al cliente**, el total de admin/seguro calculado con la regla anterior se **prorratea en partes iguales** entre las cuotas y se suma a la cuota de capital+interés. El costo total no cambia; solo la presentación.

## Trazabilidad Contable (Auditoría)

Cada cuota debe permitir reconciliar:

1. Cobro bruto al prestatario.
2. Payout al inversionista.
3. Comisión de servicio inversionista.
4. Spread de plataforma.
5. Componente admin plataforma.
6. Componente seguro pass-through.

Objetivo: que la suma por cuota y por oportunidad cuadre en reportes de administración, fuente única de verdad y auditorías.
