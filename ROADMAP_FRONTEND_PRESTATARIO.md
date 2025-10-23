# Roadmap de Frontend del Prestatario

Este documento describe el viaje del usuario prestatario a través de la interfaz de la aplicación, explicando qué componentes de React ve en cada etapa.

**Leyenda de Estados:**
*   `[✅ Completado]`
*   `[🚧 En Progreso]`
*   `[🔒 Bloqueado]`
*   `[❌ Pendiente]`

---

### **Etapa 1: Descubrimiento y Solicitud (Usuario Anónimo) [✅ Completado]**

El usuario llega a la página principal y queremos captar su interés y datos iniciales.

1.  **Descubrimiento y Simulación (`LandingPage.jsx`, `PublicSavingsCalculator.jsx`)**
    *   El usuario explora la página principal y puede usar una calculadora pública para estimar ahorros.

2.  **Solicitud Inicial y Consentimiento (`LoanRequestForm.jsx`)**
    *   Se abre el formulario modal principal donde el usuario ingresa su información básica.
    *   **Punto Clave (Infocred):** Se incluye el texto legal y la casilla de autorización para consulta de burós de crédito.

---

### **Etapa 2: Activación de la Cuenta [✅ Completado]**

El sistema ya tiene los datos básicos del prospecto y lo invita a crear su cuenta.

1.  **Recepción de Correo de Bienvenida**
    *   El usuario recibe un email automático con un enlace único para activar su cuenta.

2.  **Creación de Contraseña (`BorrowerActivateAccount.jsx`)**
    *   Al hacer clic en el enlace, es llevado a una página especial para elegir y confirmar su contraseña.

---

### **Etapa 3: Dashboard Provisional y Carga de Documentos (Conversión) [🚧 En Progreso]**

El usuario ya tiene acceso a su panel de control, que ahora actúa como una herramienta de conversión.

1.  **Dashboard de Conversión (`BorrowerDashboard.jsx`)**
    *   Al iniciar sesión, el usuario ve un dashboard diseñado para motivarlo a completar el proceso.
    *   **Cálculos Provisionales:** Se le presenta una **cuota mensual promedio estimada** y visualizaciones de ahorro potencial, calculadas a partir de los datos que él mismo proveyó.
    *   **Disclaimer de Transparencia:** Para gestionar sus expectativas, se muestra un aviso claro:
        > *"LA CUOTA MENSUAL FINAL SE DEFINIRÁ CUANDO CONFIRMEMOS TU SALDO DEUDOR"*

2.  **Llamada a la Acción: Carga de Documentos (`BorrowerDashboard.jsx`)**
    *   El objetivo del dashboard es llevar al usuario a la sección de carga de documentos.
    *   La interfaz muestra la lista de documentos requeridos y permite su subida, confirmando cada éxito y actualizando los pendientes.

---

### **Etapa 4: Evaluación y Oferta [🚧 Parcialmente Completado]**

El usuario ha subido todos sus documentos y ahora espera la respuesta del sistema.

1.  **Estado "En Revisión" (`BorrowerDashboard.jsx`) [✅ Completado]**
    *   Una vez que todos los documentos están subidos, el dashboard cambia su estado a "Tu solicitud está siendo revisada".

2.  **Visualización de la Oferta (Componente `LoanOffer.jsx`) [❌ Pendiente]**
    *   Cuando su préstamo es aprobado, el dashboard debe mostrar: "¡Tenemos una oferta para ti!".
    *   Se debe construir el componente que muestre los detalles finales de la oferta (monto, tasa, etc.) y los botones para "Aceptar" o "Rechazar".

---

### **Etapa 5: Desembolso y Ciclo del Préstamo [❌ Pendiente]**

1.  **Firma y Desembolso (Flujo Futuro)**
    *   Al aceptar la oferta, se debe iniciar el proceso legal y de desembolso.
    *   El dashboard debe actualizarse a "Préstamo Activo".

2.  **Visualización de Pagos (`BorrowerDashboard.jsx`)**
    *   El dashboard deberá mostrar el plan de pagos, fechas de vencimiento y estado de cuotas del préstamo activo.