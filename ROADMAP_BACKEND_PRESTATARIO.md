# Roadmap de Backend del Prestatario

Este documento detalla los procesos del lado del servidor que dan soporte al viaje del prestatario. Describe cómo fluyen los datos y qué funciones se activan en cada etapa.

---

### **Etapa 1: Creación de Solicitud y Consentimientos**

Esta etapa se inicia cuando el usuario anónimo envía el primer formulario.

1.  **Recepción de Datos**
    *   Un endpoint de la API recibe los datos del `LoanRequestForm.jsx`.

2.  **Creación de la Solicitud**
    *   Se inserta una nueva fila en la tabla `solicitudes` con la información del prospecto y un estado inicial (ej: `prospecto`).

3.  **Generación de Constancia de Autorización (Infocred)**
    *   **Acción Crítica:** Inmediatamente después de crear la solicitud, se dispara un proceso automático.
    *   Este proceso toma los datos del usuario (nombre, CI) y genera un documento PDF simple que certifica que el usuario otorgó su consentimiento para la consulta en burós de crédito.
    *   El PDF generado se guarda en Supabase Storage, en una carpeta segura, y su URL se asocia a la `solicitud_id` correspondiente. Esto nos da el respaldo documental.

4.  **Envío de Correo de Activación**
    *   Se invoca la Edge Function `send-welcome-email`.
    *   Esta función genera un enlace de activación único y envía el correo de bienvenida al usuario para que pueda establecer su contraseña.

---

### **Etapa 2: Activación de Usuario**

1.  **Manejo de Contraseña**
    *   El frontend (`BorrowerActivateAccount.jsx`) se comunica con Supabase Auth.
    *   Supabase Auth se encarga de forma segura de validar el token del usuario, actualizar su estado a "activo" y almacenar de forma encriptada su nueva contraseña.

---

### **Etapa 3: Análisis de Documentos (Proceso Asíncrono)**

Este es un proceso continuo que ocurre a medida que el usuario sube sus documentos.

1.  **Recepción de Archivos**
    *   El frontend sube los archivos (CI, boletas, etc.) a una carpeta específica en Supabase Storage.

2.  **Disparo del Análisis de IA**
    *   Cada subida de archivo dispara la función `analizar-documento` (que descubrimos en los archivos de Vercel).
    *   Esta función utiliza un proveedor de IA (Gemini) para leer el documento y extraer la información relevante según el tipo de archivo (ej: del CI extrae el nombre, del extracto bancario extrae el saldo, etc.).

3.  **Almacenamiento de Datos Extraídos**
    *   El resultado del análisis (un objeto JSON con los datos) se guarda como una nueva fila en la tabla `analisis_documentos`, siempre vinculada a la `solicitud_id` original.

---

### **Etapa 4: Síntesis del Perfil de Riesgo**

Esta etapa se activa automáticamente solo cuando el sistema detecta que ya se analizaron todos los documentos requeridos para un solicitante.

1.  **Verificación de Completitud**
    *   Después de cada análisis de documento, una lógica (`checkAndTriggerSynthesis`) verifica: "¿Ya tenemos todos los documentos necesarios para este solicitante según su situación laboral?".

2.  **Invocación de la Síntesis**
    *   Si la respuesta es sí, se invoca la Edge Function `sintetizar-perfil-riesgo` que acabamos de construir.

3.  **Consolidación de Datos**
    *   La función `sintetizar-perfil-riesgo` lee todos los registros de la tabla `analisis_documentos` para esa solicitud y los une en un único gran objeto JSON (`datos_sintetizados`).

4.  **Cálculo de Métricas**
    *   Con los datos consolidados, calcula las métricas clave de riesgo: DTI (Debt-to-Income), score de confianza, etc. (`metricas_evaluacion`).

5.  **Creación del Perfil de Riesgo**
    *   Finalmente, inserta una única fila en la tabla `perfiles_de_riesgo` con toda la información consolidada y un estado `listo_para_revision`.

---

### **Etapa 5: Decisión Humana y Creación de la Oportunidad**

Aquí es donde interviene el analista de riesgo.

1.  **Revisión del Analista**
    *   El analista de riesgo ve el nuevo perfil en su dashboard (`RiskAnalystDashboard.jsx`).

2.  **Registro de la Decisión**
    *   El analista toma una decisión (Aprobar / Rechazar) y la registra a través del `DecisionModal.jsx`.
    *   Esta decisión se guarda en la tabla `decisiones_de_riesgo`.

3.  **Creación de la Oportunidad de Inversión**
    *   Si la decisión fue "Aprobar", el sistema crea automáticamente una nueva fila en la tabla `oportunidades`.
    *   Esta acción hace que el préstamo aprobado sea visible para los inversionistas en su propio dashboard.
