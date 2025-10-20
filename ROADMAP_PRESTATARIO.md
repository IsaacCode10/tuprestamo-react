# Roadmap del Flujo de Adquisición de Prestatarios (V2)

Este documento describe el flujo de usuario y técnico completo, desde la solicitud hasta la aprobación final, incorporando el modelo de "Refinanciamiento Dirigido".

**Leyenda de Estados:**
*   `[✅ Completado]`
*   `[🚧 En Progreso]`
*   `[🔒 Bloqueado]`
*   `[❌ Pendiente]`

---

## Fase 1: Solicitud y Pre-Aprobación [✅ Completado]

1.  **Llenado de Formulario:** El usuario completa el formulario de solicitud (`LoanRequestForm.jsx`), indicando un **monto de deuda estimado**.
2.  **Decisión de Pre-Aprobación:** Una Edge Function (`handle-new-solicitud`) realiza una evaluación inicial.
3.  **Creación de Usuario y Notificación:** Si es pre-aprobado, se crea la cuenta de usuario y se le envía un correo para establecer su contraseña y acceder a su dashboard. Si es rechazado, se le notifica por correo.

---

## Fase 2: Carga de Documentos y Síntesis de Perfil [🚧 En Progreso]

1.  **Acceso al Dashboard:** El usuario ingresa a su `BorrowerDashboard.jsx`.
2.  **Carga de Documentos:** El usuario sube los documentos requeridos (CI, extracto de tarjeta, etc.).
3.  **Síntesis de Perfil (Automático):** `[🚧 En Progreso / 🔒 Bloqueado por Supabase]` Una vez completada la carga, se dispara la Edge Function `sintetizar-perfil-riesgo`.
    *   Esta función recopila toda la información de `solicitudes` y `documentos`.
    *   Calcula métricas clave (DTI, score de confianza).
    *   Crea una nueva fila en la tabla `perfiles_de_riesgo` con el estado `listo_para_revision`.

---

## Fase 3: Verificación y Aprobación Final (Flujo del Analista) [🚧 Parcialmente Completado]

1.  **Revisión del Perfil:** `[✅ Completado]` El analista de riesgo (Sarai) ve el nuevo perfil en su `RiskAnalystDashboard.jsx` (Scorecard Digital).
2.  **Verificación de Documentos:** `[✅ Completado]` Sarai revisa los documentos para validar la información del cliente directamente desde el Scorecard.
3.  **Paso Crítico: Verificación de Deuda:** `[❌ Pendiente]`
    *   Sarai abre el **extracto de la tarjeta de crédito**.
    *   Compara el `monto_solicitado` por el cliente con el saldo real.
    *   **Funcionalidad Faltante:** Se debe añadir un campo en el Scorecard para que Sarai ingrese el `saldo_deudor_verificado`.
4.  **Cálculo "Gross-Up" (Automático):** `[❌ Pendiente]`
    *   Al guardar el `saldo_deudor_verificado`, el sistema **automáticamente** debe calcular el `monto_total_del_prestamo` final.
    *   **Fórmula:** `Monto Total del Préstamo = Saldo Deudor Verificado / (1 - Tasa de Comisión)`
5.  **Decisión Final:** `[✅ Completado]` Con los datos disponibles, Sarai toma la decisión final de "Aprobar" o "Rechazar" en el sistema a través de un modal.

---

## Fase 4: Desembolso Dirigido [❌ Pendiente]

1.  **Notificación al Prestatario:** El prestatario es notificado de la aprobación final y ve los términos finales (no editables) en su dashboard.
2.  **Desembolso Indirecto:** El equipo de operaciones de Tu Préstamo transfiere el `monto_neto_desembolsado` (que es igual al `saldo_deudor_verificado`) directamente a la institución financiera del cliente para liquidar la deuda de la tarjeta de crédito.
3.  **Cierre del Ciclo:** Se confirma el cierre de la deuda y el préstamo del cliente con Tu Préstamo queda oficialmente activo.
