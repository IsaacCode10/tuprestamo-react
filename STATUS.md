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
    *   La `SavingsCalculator` (Calculadora de Ahorros) es completamente dinámica, calculando comisiones y seguros.
    *   **Gestión Dinámica de Documentos (`DocumentManager`):**
        *   Implementada la lógica para mostrar documentos requeridos de forma dinámica según la `situacion_laboral` del prestatario.
        *   Verificado el funcionamiento para prestatarios `Dependiente`.
        *   Añadidos nuevos tipos de documentos: `Boleta_Pago`, `Certificado_Gestora`, `Extracto_Bancario_3_Meses`, `NIT`, `Boleta_Pago_Jubilacion`, `Foto_Selfie_CI`.

---

## Tarea Actual

*   **Definir el "Journey Map" del Inversionista:** Entender el flujo ideal para los inversionistas.

---

## Próximos Pasos (Definidos por Isaac)

*   **Implementar el "Journey Map" del Inversionista:** Desarrollar las funcionalidades necesarias para el flujo del inversionista.
*   **Revisión y Optimización del Admin Dashboard:** Mejorar la interfaz y funcionalidades para el administrador.

---