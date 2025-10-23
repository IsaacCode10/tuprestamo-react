# Roadmap General del Inversionista

Este documento describe el flujo de usuario y técnico completo para el inversionista, desde que es invitado a la plataforma hasta que recibe los retornos de sus inversiones.

**Leyenda de Estados:**
*   `[✅ Completado]`
*   `[🚧 En Progreso]`
*   `[❌ Pendiente]`

---

### Fase 1: Invitación y Registro `[❌ Pendiente]`

El acceso a la plataforma para inversionistas es solo por invitación para mantener un control de calidad (KYC).

1.  **Invitación (Admin):** Un administrador de Tu Préstamo utiliza una herramienta interna para enviar una invitación por correo electrónico a un inversionista calificado.
2.  **Creación de Usuario (Backend):** El sistema (`Edge Function: invite-investor-user`) crea una cuenta de usuario en Supabase Auth con el rol de `inversionista` y le envía un enlace de activación único.
3.  **Activación de Cuenta (Frontend):** El inversionista hace clic en el enlace, es dirigido a una página para establecer su contraseña y activa su cuenta.

---

### Fase 2: Visualización y Fondeo de Oportunidades `[❌ Pendiente]`

Una vez activo, el inversionista puede ver y decidir en qué préstamos invertir.

1.  **Acceso al Dashboard:** El inversionista inicia sesión y accede a su `InvestorDashboard.jsx`, donde ve un resumen de su portafolio (Total Invertido, Rendimiento, Fondos Disponibles).
2.  **Exploración de Oportunidades:** Navega a la sección "Oportunidades de Inversión", que es una lista de todos los préstamos aprobados a prestatarios (leídos de la tabla `oportunidades`). La lista muestra métricas clave: Monto Requerido, Tasa de Rendimiento para el inversionista, Plazo y Nivel de Riesgo (A, B, C).
3.  **Decisión de Fondeo (MVP):**
    *   El inversionista selecciona una oportunidad que le interesa.
    *   Hace clic en "Me interesa fondear". Esto abre un modal con instrucciones.
    *   **Proceso Manual (Offline):** El inversionista realiza una transferencia bancaria por el monto total del préstamo a la cuenta bancaria de Tu Préstamo.
    *   **Notificación:** El inversionista usa la plataforma para notificar que ha realizado la transferencia.
4.  **Verificación y Activación del Préstamo (Admin):**
    *   El equipo de Operaciones de Tu Préstamo recibe la notificación.
    *   Verifica la recepción de los fondos en la cuenta bancaria.
    *   Un administrador actualiza el estado del préstamo en el sistema a `financiado`, lo que dispara el desembolso dirigido al prestatario.

---

### Fase 3: Gestión de Portafolio y Retornos `[❌ Pendiente]`

El inversionista monitorea sus inversiones y recibe sus ganancias.

1.  **Actualización del Portafolio:** El préstamo `financiado` ahora aparece en la sección "Mis Inversiones" del dashboard del inversionista.
2.  **Recepción de Pagos Mensuales (Backend):**
    *   Cada vez que un prestatario realiza un pago mensual, un proceso automático en el backend (`Edge Function: distribute_investor_returns`) se activa.
    *   La función calcula la porción del pago que corresponde al inversionista (capital + interés).
    *   Calcula y deduce la comisión por servicio de Tu Préstamo (1% sobre el pago total recibido).
    *   Acredita la ganancia neta al saldo de "Fondos Disponibles" del inversionista.
3.  **Monitoreo:** El `InvestorDashboard.jsx` se actualiza para reflejar los pagos recibidos y el rendimiento actualizado de la inversión.
4.  **Retiro de Fondos:** El inversionista puede solicitar un retiro de sus "Fondos Disponibles" a su cuenta bancaria registrada. Este proceso, en el MVP, notificará a Operaciones para realizar la transferencia manual.
