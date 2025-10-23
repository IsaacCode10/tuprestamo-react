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

## Flujo de Experiencia del Prestatario (Pre-Aprobación)

Para maximizar la conversión, el flujo operativo se enriquece con una experiencia de usuario diseñada para motivar al prestatario a completar el proceso.

1.  **Cálculo y Dashboard Provisional:** Tras la **Solicitud** (Paso 1 del flujo operativo), el sistema realiza un **cálculo provisional** basado en el monto **estimado**. Al activar su cuenta, el prestatario ve un dashboard con una **cuota mensual promedio estimada** y visualizaciones de su ahorro potencial.

2.  **Disclaimer para Transparencia:** Para gestionar expectativas, este dashboard incluye un aviso legal prominente:
    > *"LA CUOTA MENSUAL FINAL SE DEFINIRÁ CUANDO CONFIRMEMOS TU SALDO DEUDOR"*

3.  **Puente a la Verificación:** Este dashboard provisional actúa como una herramienta de conversión, incentivando al usuario a proceder con la carga de documentos para llegar a la **Verificación** (Paso 2 del flujo operativo) y obtener su oferta final.
