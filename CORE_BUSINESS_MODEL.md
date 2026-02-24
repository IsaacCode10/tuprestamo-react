### **DECLARACIÓN DE MODELO DE NEGOCIO v3.0 - TU PRÉSTAMO**

#### **1. Filosofía y Principios**

Este documento define el modelo de negocio CORE de "Tu Préstamo". Nuestro principio fundamental es crear un ecosistema financiero **justo, transparente y de triple ganancia (win-win-win)** donde:
1.  Los **Prestatarios** accedan a créditos más baratos y transparentes que en la banca tradicional.
2.  Los **Inversionistas** obtengan un rendimiento superior al del mercado, con un riesgo gestionado.
3.  **Tu Préstamo** genere ingresos sostenibles para operar, innovar y escalar.

Toda decisión futura se medirá contra los principios y estructuras definidos en este documento.

#### **2. Modelo de Riesgo y Precios**

Clasificamos a cada prestatario en un nivel de riesgo (A, B, C) basado en nuestro Scorecard. Este nivel determina las tasas de interés del crédito.

| Nivel de Riesgo | Tasa de Interés (Prestatario) | Rendimiento (Inversionista) |
| :-------------- | :---------------------------- | :-------------------------- |
| **Nivel A**     | 15% Anual                     | 10% Anual                   |
| **Nivel B**     | 17% Anual                     | 12% Anual                   |
| **Nivel C**     | 20% Anual                     | 15% Anual                   |

#### **3. Modelo de Comisiones**

Nuestras comisiones están diseñadas para ser claras y alineadas al riesgo.

*   **Para el Prestatario:**
    *   **Comisión por Originación (Variable con mínimo):** Un pago único al desembolso, que premia a los mejores perfiles.
        *   **Regla de mínimo:** Para netos ≤ Bs 10.000, se cobra Bs 450 fijos (bruto = neto + 450).
        *   **Sobre netos > 10.000:** se aplica gross-up con el % por nivel para mantener el neto intacto:
            *   **Nivel A:** 3.0%
            *   **Nivel B:** 4.0%
            *   **Nivel C:** 5.0%
        *   **Notariado (MVP):** Tu Préstamo absorbe internamente el costo del contrato notariado (referencia operativa ~Bs 150). No se cobra una línea adicional al prestatario.
    *   **Comisión por Servicio y Seguro:** `0.15% mensual` sobre el **saldo deudor**, con un **mínimo de 10 Bs por mes**. Unifica los costos de administración y el seguro de desgravamen en un solo cargo transparente y decreciente. En la UI de propuesta mostramos un cargo mensual **prorrateado fijo** (total de admin/seguro dividido entre las cuotas) para mantener la cuota fija comunicada, sin alterar el costo total calculado con la regla oficial.

*   **Para el Inversionista:**
    *   **Comisión por Servicio:** `1%` sobre **cada pago recibido** (capital + interés). Este modelo nos alinea con el éxito del inversionista, cobrando sobre el flujo de caja total que ayudamos a generar.

#### **3.1 Spread de Plataforma (Activo - Pasivo)**

Además de las comisiones, Tu Préstamo captura un ingreso financiero por diferencial de tasa:

- **Tasa activa (prestatario):** según perfil A/B/C.
- **Tasa pasiva objetivo (inversionista):** según perfil A/B/C.
- **Spread plataforma:** diferencia entre el flujo cobrado al prestatario y el flujo pagado al inversionista (después de su comisión de servicio), por cuota.

Regla de control:

- El rendimiento del inversionista debe respetar la tasa pasiva objetivo publicada.
- Cualquier diferencia positiva entre cobro y payout se registra como `spread_plataforma`.
- No se considera "ingreso del viento"; debe quedar en ledger y en reportes.

#### **4. Análisis de Unidad Económica: Caso de Estudio (Crédito 10,000 Bs - Nivel B - 12 meses)**

**4.1. Propuesta de Valor para el PRESTATARIO (Ahorro Real)**

Comparación del costo anual de una deuda de 10,000 Bs contra un caso real (Tarjeta BNB, T.E.A. 26.83%).

| Concepto                        | Tarjeta de Crédito (BNB Real) | Tu Préstamo (Nivel B) |
| :------------------------------ | :---------------------------- | :-------------------- |
| Tasa de Interés Anual           | 26.83%                        | **17%**               |
| **Costos del Crédito (1 año):**  |                               |                       |
| - Intereses Pagados             | ~1,488 Bs                     | ~920 Bs               |
| - Cargo Mantenimiento de Cuenta | **1,200 Bs** (100 Bs/mes)     | 0 Bs                  |
| - Comisión de Originación       | 0 Bs                          | 400 Bs (4.0%)         |
| - Comisión Servicio y Seguro    | 0 Bs                          | ~132 Bs               |
| **COSTO TOTAL DEL CRÉDITO**     | **~2,688 Bs**                 | **~1,452 Bs**         |
| **AHORRO TOTAL ANUAL**          |                               | **~1,236 Bs**         |

**4.2. Propuesta de Valor para el INVERSIONISTA (Ganancia Superior)**

Comparación del rendimiento anual de invertir 10,000 Bs contra un DPF bancario (Tasa 3.5%).

| Concepto                        | DPF Bancario              | Tu Préstamo (Nivel B) |
| :------------------------------ | :------------------------ | :-------------------- |
| Rendimiento Bruto Anual         | 3.5%                      | **12%**               |
| **Ganancias del Inversionista:** |                           |                       |
| - Intereses Brutos Generados    | 350 Bs                    | ~662 Bs               |
| - Comisión por Servicio         | 0 Bs                      | ~107 Bs (1% del flujo)|
| **GANANCIA NETA ANUAL**         | **350 Bs**                | **~555 Bs**           |
| **GANANCIA ADICIONAL**          |                           | **+58%** y Flujo Mensual|

Nota de gobierno financiero:

- El P&L de Tu Préstamo se evalúa con cuatro capas:  
  `originación neta + comisiones de servicio + spread_plataforma + admin_plataforma`  
  y excluye de ingreso neto los conceptos pass-through (ej. seguro transferido a tercero).
- Sobre ese margen operativo se descuentan costos unitarios del funnel:
  - **Costo analista de riesgo por crédito aprobado:** **Bs 50**.
  - **Costo INFOCRED por consulta:** **Bs 11** por evaluación.
  - Métrica de contribución mensual:  
    `resultado_neto_aprox = EBITDA_aprox - (aprobados_mes * 50) - (consultas_infocred_mes * 11)`.

#### **5. Flujo de Experiencia del Prestatario (Pre-Aprobación a Conversión)**

Para maximizar la conversión de prospectos pre-aprobados a solicitantes completos, se define un flujo de experiencia específico:

1.  **Dashboard Provisional como Herramienta de Conversión:** Tras la pre-aprobación automática, el usuario accede a un dashboard que muestra los beneficios del refinanciamiento basados en los datos **estimados** que proveyó. Se le presenta una **cuota mensual promedio estimada** y visualizaciones de su **ahorro potencial**.

2.  **Transparencia y Gestión de Expectativas:** Para ser transparentes, junto a la cuota estimada, se muestra un descargo de responsabilidad claro: *"LA CUOTA MENSUAL FINAL SE DEFINIRÁ CUANDO CONFIRMEMOS TU SALDO DEUDOR"*.

3.  **Objetivo Estratégico:** El propósito de este dashboard provisional es **motivar al usuario a completar el proceso de carga de documentos** al mostrarle de forma tangible e inmediata el valor de nuestro producto.

4.  **Cálculo Final:** El cálculo oficial y definitivo (incluyendo el "Gross-Up") se realiza únicamente después de que un analista **verifica el saldo deudor real** en los documentos del cliente.

#### **6. Organización y Roles Clave (Operación MVP)**

- **CEO (Isaac Alfaro):** define reglas de negocio, marketing/embudo, valida en producción; no modifica código.
- **CTO (Codex):** implementación técnica end-to-end (frontend/backend/infra), mantiene documentación y despliegues.
- **Operaciones (Karen Bejarano):** concilia pagos de inversionistas y prestatarios, sube PDF de INFOCRED al panel del analista, revisa panel de Operaciones. Rol sugerido en `profiles.role`: `ops` o `admin`.
- **Analista de Riesgo (Sarai Arispe):** decide aprobar/rechazar con la documentación completa; rol `analista` en `profiles.role`.
- **Accesos:** `profiles.role` define permisos (admin/ops/analista/prestatario/inversionista). Emails actuales: Isaac `alfaro.isaac10@gmail.com`, Karen `karen@tuprestamobo.com`, Sarai `<email_de_sarai>`.

#### **7. Alertas y Comunicaciones Operativas**

- **Notificaciones a Operaciones:** envío por email (Resend) al subir comprobante de pago inversionista y al marcar un intent como pagado. Remitente: `notificaciones@tuprestamobo.com`.
- **Destinatarios configurables:** variables de entorno en Supabase `OPS_ALERT_TO` (p. ej. `karen@tuprestamobo.com`) y `OPS_ALERT_CC` (p. ej. `contacto@tuprestamobo.com`). Se pueden cambiar sin tocar código.
- **In-app:** inversionistas reciben notificación interna al crear reserva y al subir comprobante; Operaciones ve intentos pendientes/por conciliar en el panel.

#### **8. Regla de pre-aprobación (DTI)**

- **Cálculo del DTI (Debt-to-Income) en pre-funnel:** usando la deuda de tarjeta declarada (`saldo_deuda_tc`) y tasa anual (`tasa_interes_tc`), se estima la cuota mensual como interés mensual + 1% del saldo (amortización mínima). Fórmula:
  - Interés mensual = `saldo_deuda_tc * (tasa_interes_tc / 100) / 12`
  - Amortización mínima = `saldo_deuda_tc * 0.01`
  - Cuota estimada = interés mensual + amortización mínima
  - DTI = `(cuota estimada / ingreso_mensual) * 100`
- **Filtros automáticos:** rechazar si `ingreso_mensual < 3.000 Bs` o si `DTI > 50%`.
- **Scorecard inicial (si pasa los filtros):**
  - Ingresos: >8k (+3), 5–8k (+2), 3–5k (+1)
  - DTI: <30% (+3), 30–40% (+2), 40–50% (+1)
  - Antigüedad laboral: ≥24m (+2), 12–23m (+1)
  - Resultado: total ≥7 → Perfil A; ≥5 → Perfil B; ≥2 → Perfil C; <2 → Rechazado.
