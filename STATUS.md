# Estado del Proyecto: Tu Prestamo

**Fecha del último trabajo:** martes, 16 de septiembre de 2025

---

## Hitos Recientes y Tareas Completadas

### 1. Implementación del Modelo de Riesgo y Precios (Scorecard)
*   **Backend (Edge Function `handle-new-solicitud`):**
    *   Implementado un modelo de riesgo Scorecard multifactorial (Ingreso Mensual, DTI Estimado, Antigüedad Laboral).
    *   El DTI se calcula ahora estimando el pago mensual de la deuda de tarjetas de crédito (Saldo TC * Tasa Anual / 12 + Saldo TC * 0.01).
    *   La función asigna automáticamente un perfil de riesgo (A, B, C, Rechazado) y sus tasas asociadas.
    *   **Correcciones y Mejoras:**
        *   Alineación de nombres de columnas (`ingreso_mensual` singular, `user_id` en `oportunidades`, `opportunity_id` en `solicitudes`).
        *   Manejo robusto de errores y validación de datos de entrada.
        *   Restauración y ajuste del contenido HTML de los correos de pre-aprobación y rechazo.
        *   Eliminación de la mención del perfil de riesgo en el correo de pre-aprobación.
        *   **Actualización de Comisiones:** `comision_originacion_porcentaje` (3.5%) y `seguro_desgravamen_porcentaje` (0.05%) actualizados.
        *   **Nueva Columna:** Añadida `comision_administracion_porcentaje` a la tabla `oportunidades` y almacenada en la Edge Function.
*   **Frontend (Formulario de Solicitud):**
    *   El formulario (`LoanRequestForm.jsx`) se adaptó para recolectar los datos necesarios para el Scorecard.
    *   Corregido el comportamiento errático de los campos de entrada (`InteractiveForm.jsx`) al cambiar de pregunta.

### 2. Flujo de Activación y Dashboard del Prestatario
*   **Flujo End-to-End:** El proceso completo (envío de formulario -> evaluación automática -> pre-aprobación/rechazo -> envío de correo -> creación de cuenta -> acceso al dashboard) funciona correctamente.
*   **Dashboard del Prestatario (`BorrowerDashboard.jsx`):**
    *   El `ProgressStepper` ahora refleja correctamente el estado de la solicitud (`Solicitud Recibida` -> `Verificación Inicial` -> `Sube tus Documentos`).
    *   La `StatusCard` muestra la `Tasa Anual` y `Cuota Mensual` correctas, obtenidas de la oportunidad pre-aprobada.
    *   **La `SavingsCalculator` (Calculadora de Ahorros) ahora es completamente dinámica:**
        *   Se muestra y precarga con los datos de la solicitud pre-aprobada.
        *   Utiliza la tasa de interés del prestatario asignada por el Scorecard para la propuesta de "Tu Préstamo".
        *   **Calcula dinámicamente la Comisión de Administración (0.1% sobre saldo deudor, min. Bs 10) y el Seguro de Desgravamen (0.05% sobre saldo deudor) a lo largo de toda la amortización del préstamo.**
        *   Muestra el "Costo Mantenimiento Mensual" promedio y el ahorro total de forma precisa.
    *   La sección de "Sube tu Documentación" está visible y funcional para los prestatarios pre-aprobados.

---

## Tarea Actual

*   **Verificación Final de la Calculadora:** Realizar una prueba exhaustiva de la calculadora con diferentes escenarios para asegurar que los cálculos son correctos y se alinean con el "Ejemplo de Préstamo de Bs 10.000" proporcionado.

---

## Próximos Pasos (Definidos por Isaac)

*   **Definir el "Journey Map" del Inversionista:** Entender el flujo ideal para los inversionistas.
*   **Implementar el "Journey Map" del Inversionista:** Desarrollar las funcionalidades necesarias para el flujo del inversionista.
*   **Revisión y Optimización del Admin Dashboard:** Mejorar la interfaz y funcionalidades para el administrador.

---