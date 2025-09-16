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
*   **Frontend (Formulario de Solicitud):**
    *   El formulario (`LoanRequestForm.jsx`) se adaptó para recolectar los datos necesarios para el Scorecard.
    *   Corregido el comportamiento errático de los campos de entrada (`InteractiveForm.jsx`) al cambiar de pregunta.

### 2. Flujo de Activación y Dashboard del Prestatario
*   **Flujo End-to-End:** El proceso completo (envío de formulario -> evaluación automática -> pre-aprobación/rechazo -> envío de correo -> creación de cuenta -> acceso al dashboard) funciona correctamente.
*   **Dashboard del Prestatario (`BorrowerDashboard.jsx`):**
    *   El `ProgressStepper` ahora refleja correctamente el estado de la solicitud (`Solicitud Recibida` -> `Verificación Inicial` -> `Sube tus Documentos`).
    *   La `StatusCard` muestra la `Tasa Anual` y `Cuota Mensual` correctas, obtenidas de la oportunidad pre-aprobada.
    *   La `SavingsCalculator` (Calculadora de Ahorros) se muestra y precarga con los datos de la solicitud pre-aprobada.
    *   La `SavingsCalculator` utiliza la tasa de interés del prestatario asignada por el Scorecard para la propuesta de "Tu Préstamo".
    *   La sección de "Sube tu Documentación" está visible y funcional para los prestatarios pre-aprobados.

---

## Tarea Actual

*   **Pulir la Calculadora de Ahorros:**
    *   Asegurar que el "Costo Mantenimiento Mensual" para "Tu Préstamo" en la calculadora sea dinámico si no es un valor fijo de 10 Bs. (Actualmente está hardcodeado en 10 Bs).

---

## Próximos Pasos (Definidos por Isaac)

*   **Definir el "Journey Map" del Inversionista:** Entender el flujo ideal para los inversionistas.
*   **Implementar el "Journey Map" del Inversionista:** Desarrollar las funcionalidades necesarias para el flujo del inversionista.
*   **Revisión y Optimización del Admin Dashboard:** Mejorar la interfaz y funcionalidades para el administrador.

---