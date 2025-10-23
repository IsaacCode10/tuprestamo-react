# Playbook de Analítica de Producto de "TU PRESTAMO"

**Filosofía:** No volamos a ciegas. Medimos cada interacción del usuario para entender su comportamiento, eliminar la fricción y construir un producto que la gente ame y por el que pague.

---

### Herramienta Seleccionada

- **PostHog:** Solución todo-en-uno que combina analítica de producto, funnels, tendencias, grabaciones de sesiones y más. Su generosa capa gratuita es ideal para nuestra fase de MVP y crecimiento.

---

### Estrategia de Implementación Técnica (CTO-Approved)

Para asegurar una implementación limpia, escalable y fácil de mantener, se seguirá una estrategia de **servicio centralizado**.

1.  **Servicio Centralizado:** En lugar de realizar llamadas directas a `posthog.capture()` desde múltiples componentes, se creará un hook o servicio único (ej: `useAnalytics.js`). Todos los eventos se dispararán a través de este servicio. 
    *   **Ventaja 1 (Cero Errores):** Se evita la dispersión y los errores de tipeo en los nombres de los eventos.
    *   **Ventaja 2 (Mantenimiento Sencillo):** Si en el futuro se decide cambiar de proveedor de analítica, solo se deberá modificar este archivo central.

2.  **Variables de Entorno:** Las credenciales de PostHog (API Key y Host) se gestionarán como variables de entorno (`VITE_PUBLIC_POSTHOG_KEY`, `VITE_PUBLIC_POSTHOG_HOST`) y se configurarán como secretos en Vercel y Supabase, nunca se escribirán directamente en el código.

---

### Plan de Implementación por Fases

**Fase 1: Instalación y Configuración**

1.  **Instalar SDK:** Añadir `posthog-js` al `package.json`.
2.  **Configurar Credenciales:** Solicitar al CEO (Isaac) la API Key y el Host de PostHog y configurarlos como secretos.
3.  **Inicializar PostHog:** Crear un archivo `PostHogProvider.jsx` que inicialice el cliente de PostHog y lo haga disponible para toda la aplicación de React.

**Fase 2: Identificación de Usuario y Servicio Central**

1.  **Identificar Usuarios:** En el punto del código donde se gestiona la sesión del usuario (ej: `useAuth` hook), se añadirá la llamada `posthog.identify()` para asociar los eventos a un `user_id` y `email` específicos.
2.  **Crear Hook de Analítica:** Desarrollar el hook `useAnalytics.js` que expondrá una función `captureEvent(eventName, properties)` para ser usada en toda la aplicación.

**Fase 3: Implementación del "Tracking Plan"**

Se implementarán los eventos definidos por el CEO, utilizando el `useAnalytics` hook en los componentes correspondientes.

---

### Tracking Plan Inicial v1

**Eventos del Prestatario (Borrower Events):**

- `viewed_loan_application_form`
- `started_loan_application`
- `submitted_loan_application` (Propiedades: `loan_amount`, `loan_term`)
- `viewed_borrower_dashboard`
- `started_document_upload` (Propiedades: `document_type`)
- `successfully_uploaded_document` (Propiedades: `document_type`)
- `failed_document_upload` (Propiedades: `document_type`, `error_message`)

**Eventos del Inversionista (Investor Events):**

- `viewed_marketplace`
- `viewed_loan_details` (Propiedades: `loan_id`, `loan_amount`)
- `added_funds_to_wallet` (Propiedades: `amount`)
- `completed_investment` (Propiedades: `investment_amount`, `loan_id`)

**Eventos de Features Clave (Feature Events):**

- `interacted_with_calculator` (Propiedades: `input_changed`)
- `calculated_loan_result` (Propiedades: `result_amount`, `result_term`, `monthly_payment`)

**Eventos de Crecimiento (Growth Events):**

- `campaign_lead` (Propiedades: `utm_source`, `utm_medium`, `utm_campaign`)
