# Roadmap de Frontend del Prestatario

Este documento describe el viaje del usuario prestatario a través de la interfaz de la aplicación, explicando qué componentes de React ve en cada etapa.

---

### **Etapa 1: Descubrimiento y Simulación (Usuario Anónimo)**

El usuario llega a la página principal y queremos captar su interés dándole valor desde el primer momento.

1.  **Descubrimiento (`LandingPage.jsx`)**
    *   El usuario explora la página principal.
    *   En el menú de navegación (`Header.jsx`), ve un botón destacado: **"Calculadora de Ahorros"**.

2.  **Simulación Rápida (Nuevo Componente: `SimpleCalculatorModal.jsx`)**
    *   Al hacer clic en el botón, se abre una calculadora modal muy sencilla.
    *   Solo le pide 2-3 datos clave (ej: "¿Cuánto debes en tu tarjeta?", "¿Cuál es tu cuota mensual actual?").
    *   El objetivo es mostrarle un ahorro *potencial* de forma instantánea para despertar su interés.
    *   Al final de la simulación, un botón claro lo invita al siguiente paso: "Completa tu solicitud".

3.  **Solicitud Inicial y Consentimiento (`LoanRequestForm.jsx`)**
    *   Se abre el formulario modal principal.
    *   El usuario ingresa su información básica (nombre, email, etc.).
    *   **Punto Clave (Infocred):** Dentro de este formulario, se incluye un texto legal claro y una casilla de verificación que el usuario debe marcar, indicando: *"Al enviar esta solicitud, autorizo a Tu Préstamo a consultar mi historial crediticio en burós de información como Infocred para evaluar mi elegibilidad."*

---

### **Etapa 2: Activación de la Cuenta**

El sistema ya tiene los datos básicos del prospecto y lo invita a crear su cuenta.

1.  **Recepción de Correo de Bienvenida**
    *   El usuario recibe un email automático con un enlace único para activar su cuenta.

2.  **Creación de Contraseña (`BorrowerActivateAccount.jsx`)**
    *   Al hacer clic en el enlace, es llevado a una página especial para elegir y confirmar su contraseña.

---

### **Etapa 3: Perfilamiento y Simulación Detallada (Usuario Autenticado)**

El usuario ya tiene acceso a su propio panel de control.

1.  **Primer Vistazo al Dashboard (`BorrowerDashboard.jsx`)**
    *   El usuario inicia sesión y ve su panel de control personal.
    *   Se le muestra un estado claro: "Necesitamos más información para darte una oferta".
    *   Se presenta una lista de los documentos que debe subir según su situación laboral.

2.  **Carga de Documentos (Componente a definir: `DocumentUploader.jsx`)**
    *   El usuario sube los archivos requeridos (PDF, JPG). La interfaz le confirma la carga de cada uno y actualiza la lista de pendientes.

3.  **Simulación Avanzada (`SavingsCalculator.jsx`)**
    *   **Importante:** Dentro de su dashboard, el usuario tiene acceso a la **calculadora de ahorros detallada**. Ahora puede simular diferentes escenarios con mayor precisión, ya que el sistema tiene más datos sobre él. Esta es una herramienta clave de conversión en esta etapa.

---

### **Etapa 4: Evaluación y Oferta**

El usuario ha subido todos sus documentos y ahora espera la respuesta del sistema.

1.  **Estado "En Revisión" (`BorrowerDashboard.jsx`)**
    *   Una vez que todos los documentos están subidos, el dashboard cambia su estado a "Tu solicitud está siendo revisada".

2.  **Visualización de la Oferta (Componente a definir: `LoanOffer.jsx`)**
    *   Cuando su préstamo es aprobado, el dashboard muestra: "¡Tenemos una oferta para ti!".
    *   El usuario puede ver los detalles finales de la oferta (monto, tasa, etc.) y los botones para "Aceptar" o "Rechazar".

---

### **Etapa 5: Desembolso y Ciclo del Préstamo**

1.  **Firma y Desembolso (Flujo Futuro)**
    *   Al aceptar, se inicia el proceso legal y de desembolso.
    *   El dashboard se actualiza a "Préstamo Activo".

2.  **Visualización de Pagos (`BorrowerDashboard.jsx`)**
    *   El dashboard ahora muestra su plan de pagos, fechas de vencimiento y estado de cuotas.
