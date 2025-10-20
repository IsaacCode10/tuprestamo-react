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

### **Etapa 3: Perfilamiento y Carga de Documentos (Usuario Autenticado) [✅ Completado]**

El usuario ya tiene acceso a su propio panel de control.

1.  **Primer Vistazo al Dashboard (`BorrowerDashboard.jsx`)**
    *   El usuario inicia sesión y ve su panel de control personal.
    *   Se le muestra un estado claro y la lista de documentos que debe subir.

2.  **Carga de Documentos (`BorrowerDashboard.jsx`)**
    *   El usuario sube los archivos requeridos. La interfaz le confirma la carga de cada uno y actualiza la lista de pendientes.

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