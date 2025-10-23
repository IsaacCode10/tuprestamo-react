# Roadmap de Backend del Inversionista

Este documento detalla los procesos del lado del servidor, funciones, triggers y políticas de seguridad que dan soporte al viaje del inversionista.

**Leyenda de Estados:**
*   `[✅ Completado]`
*   `[🚧 En Progreso]`
*   `[❌ Pendiente]`

---

### Etapa 1: Onboarding y Seguridad `[❌ Pendiente]`

Creación y configuración segura del usuario inversionista.

1.  **Función de Invitación (`Edge Function: invite-investor-user`):
    *   **Disparo:** Invocada manualmente por un administrador a través de una herramienta interna.
    *   **Acción:** Recibe el email del inversionista. Crea un nuevo usuario en `Supabase Auth` y le asigna el rol personalizado `inversionista`.
    *   **Salida:** Envía un correo de activación (magic link) al inversionista para que establezca su contraseña.

2.  **Políticas de Seguridad a Nivel de Fila (RLS):
    *   **Tabla `oportunidades`:** Los usuarios con rol `inversionista` solo pueden leer (`SELECT`) las filas cuyo estado sea `aprobado`.
    *   **Tabla `perfiles_de_riesgo`:** Los inversionistas pueden leer una versión anonimizada de los perfiles vinculados a las oportunidades aprobadas.
    *   **Tablas de Portafolio (`inversiones`, `transacciones_inversionista`):** Se debe asegurar que cada inversionista solo pueda leer o escribir las filas que le pertenecen (donde `inversiones.user_id == auth.uid()`).

---

### Etapa 2: Lógica de Fondeo (MVP) `[❌ Pendiente]`

Coordinación del flujo de capital desde el inversionista hasta el prestatario.

1.  **Intención de Fondeo (Iniciada por Frontend):
    *   El frontend actualiza el `estado` de una fila en la tabla `oportunidades` a `fondeo_pendiente`.
    *   Se inserta una notificación en una tabla `notificaciones_admin` para alertar al equipo de Operaciones.

2.  **Confirmación del Fondeo (Proceso de Admin):
    *   Un administrador, fuera de la plataforma, verifica la recepción de la transferencia bancaria del inversionista.
    *   Una vez verificado, el administrador usa una interfaz de admin para cambiar el estado de la `oportunidad` a `financiado`.

3.  **Disparo del Desembolso (Trigger):
    *   Un trigger en la base de datos (`on_opportunity_funded`) se activa cuando una oportunidad cambia su estado a `financiado`.
    *   **Acción:** Este trigger inicia el proceso de desembolso al prestatario (que puede ser una notificación a Operaciones para realizar la transferencia manual al banco del prestatario).

---

### Etapa 3: Procesamiento de Retornos y Comisiones `[❌ Pendiente]`

Distribución automática de las ganancias generadas por los pagos de los prestatarios.

1.  **Recepción del Pago del Prestatario:
    *   Otro proceso registra el pago de una cuota de un prestatario en una tabla `pagos_prestatario`.

2.  **Trigger de Distribución (`on_borrower_payment`):
    *   Un trigger en la tabla `pagos_prestatario` detecta un nuevo pago exitoso.
    *   **Acción:** Invoca la Edge Function `distribute_investor_returns`, pasándole los detalles del pago.

3.  **Función de Distribución (`Edge Function: distribute_investor_returns`):
    *   Recibe los datos del pago.
    *   Identifica al inversionista que fondeó el préstamo correspondiente.
    *   Calcula el desglose del pago: capital, interés.
    *   Calcula la comisión del 1% para Tu Préstamo sobre el total recibido.
    *   Calcula el monto neto para el inversionista.
    *   Inserta una nueva fila en la tabla `transacciones_inversionista` con el detalle de la ganancia.
    *   Actualiza el campo `fondos_disponibles` en el perfil del inversionista.
