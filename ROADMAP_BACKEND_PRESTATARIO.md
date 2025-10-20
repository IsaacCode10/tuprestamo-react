# Roadmap de Backend del Prestatario (V2 - Actualizado)

Este documento detalla los procesos del lado del servidor que dan soporte al viaje del prestatario, reflejando el modelo de decisión automática.

**Leyenda de Estados:**
*   `[✅ Completado]`
*   `[🚧 En Progreso]`
*   `[🔒 Bloqueado]`
*   `[❌ Pendiente]`

---

### **Etapa 1: Solicitud y Decisión Automática (Motor de Decisión) [✅ Completado]**

Esta etapa se inicia cuando el usuario anónimo envía el primer formulario y se resuelve en segundos.

1.  **Recepción y Disparo (Trigger)**
    *   El frontend envía los datos del `LoanRequestForm.jsx`.
    *   Se inserta una nueva fila en la tabla `solicitudes`.
    *   **Acción Crítica:** Un trigger en la base de datos detecta la nueva fila e invoca la Edge Function `handle-new-solicitud`, pasándole los datos de la solicitud.

2.  **Ejecución del Motor de Decisión (`handle-new-solicitud`)**
    *   La función recibe los datos y ejecuta el `runRiskScorecard` para asignar un perfil de riesgo (A, B, C, o Rechazado).
    *   Se abren dos posibles caminos:

    **A) Si es Pre-Aprobado (Perfil A, B, o C):**
    1.  **Cálculo de Costos:** Se calculan todos los costos del crédito (intereses, comisiones, cuota promedio) basados en el perfil de riesgo.
    2.  **Creación de la Oportunidad:** Se inserta una nueva fila en la tabla `oportunidades` con el `solicitud_id`, el perfil de riesgo, la tasa asignada y todos los costos ya calculados.
    3.  **Creación de Usuario:** Se crea una nueva cuenta para el prestatario en Supabase Auth.
    4.  **Envío de Correo de Activación:** Se genera un "magic link" y se envía un correo de bienvenida y pre-aprobación, invitando al usuario a establecer su contraseña.
    5.  **Actualización de la Solicitud:** Se actualiza la fila original en `solicitudes` al estado `pre-aprobado` y se le asigna el `user_id` recién creado.

    **B) Si es Rechazado:**
    1.  **Actualización de la Solicitud:** Se actualiza la fila en `solicitudes` al estado `rechazado`.
    2.  **Envío de Correo de Notificación:** Se envía un correo al usuario informándole que su solicitud no pudo ser procesada en este momento.

---

### **Etapa 2: Activación de Usuario [✅ Completado]**

1.  **Manejo de Contraseña**
    *   El frontend (`BorrowerActivateAccount.jsx`) se comunica con Supabase Auth.
    *   Supabase Auth valida el token del usuario, actualiza su estado a "activo" y almacena de forma segura su nueva contraseña.

---

### **Etapa 3: Análisis de Documentos (Proceso Asíncrono) [🚧 En Progreso]**

Ocurre a medida que el usuario sube sus documentos en su dashboard.

1.  **Recepción y Análisis IA**
    *   Cada subida de archivo desde el `BorrowerDashboard.jsx` dispara la función `analizar-documento`.
    *   La IA extrae la información relevante del documento.
    *   El resultado se guarda en la tabla `analisis_documentos`.
    *   *Nota: La implementación de la IA para la extracción de datos aún está en desarrollo.*

---

### **Etapa 4: Síntesis del Perfil de Riesgo [🚧 En Progreso / 🔒 Bloqueado]**

Se activa automáticamente cuando todos los documentos requeridos han sido analizados.

1.  **Verificación e Invocación**
    *   Una lógica (`checkAndTriggerSynthesis`) verifica que todos los documentos para una solicitud están completos y analizados.
    *   Si es así, se invoca la Edge Function `sintetizar-perfil-riesgo`.

2.  **Consolidación y Creación del Perfil**
    *   La función une todos los datos de `analisis_documentos` y `solicitudes`.
    *   Calcula métricas finales (DTI verificado, etc.).
    *   Inserta una única fila en la tabla `perfiles_de_riesgo` con estado `listo_para_revision`.
    *   ***Nota: La Edge Function está desarrollada, pero su despliegue y pruebas están bloqueados por inestabilidad de la plataforma Supabase (timeouts y gestión de secretos).***

---

### **Etapa 5: Decisión Humana Final y Activación del Préstamo [✅ Completado]**

Aquí interviene el analista de riesgo para la aprobación definitiva.

1.  **Revisión y Decisión del Analista**
    *   El analista revisa el perfil completo en su `RiskAnalystDashboard.jsx`.
    *   Registra la decisión final ("Aprobar" / "Rechazar") en la tabla `decisiones_de_riesgo`.
    *   ***Nota: Implementado a través del Scorecard Digital en el frontend, que escribe directamente en la tabla `decisiones_de_riesgo` y actualiza el estado en `perfiles_de_riesgo` a 'Revisado'.***

2.  **Activación de la Oportunidad [❌ Pendiente]**
    *   Si la decisión fue "Aprobar", el sistema actualiza el estado de la `oportunidad` (creada en la Etapa 1) a `aprobado` o `financiado`.
    *   Esta acción hace que el préstamo sea visible para los inversionistas y da inicio al proceso de desembolso.
