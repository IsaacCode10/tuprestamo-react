# Roadmap del Flujo de Adquisición de Prestatarios (V2)

Este documento describe el flujo de usuario y técnico completo, desde la solicitud hasta la aprobación final, incorporando el modelo de "Refinanciamiento Dirigido".

**Leyenda de Estados:**
*   `[✅ Completado]`
*   `[🚧 En Progreso]`
*   `[🔒 Bloqueado]`
*   `[❌ Pendiente]`

---

## Fase 1: Solicitud y Pre-Aprobación [✅ Completado]

1.  **Llenado de Formulario:** El usuario completa el formulario de solicitud (`LoanRequestForm.jsx`), indicando un **monto de deuda estimado**.
2.  **Decisión de Pre-Aprobación:** Una Edge Function (`handle-new-solicitud`) realiza una evaluación inicial.
3.  **Creación de Usuario y Notificación:** Si es pre-aprobado, se crea la cuenta de usuario y se le envía un correo para establecer su contraseña y acceder a su dashboard. Si es rechazado, se le notifica por correo.

---

## Fase 2: Dashboard Provisional y Carga de Documentos [✅ Completado]

1.  **Acceso al Dashboard de Conversión:** El usuario ingresa a su `BorrowerDashboard.jsx`, que le muestra una **simulación de su cuota y ahorro potencial** basada en los datos estimados que proveyó.
2.  **Objetivo: Motivar la Carga:** El propósito de este dashboard es actuar como una **herramienta de conversión**, mostrando los beneficios para incentivar al usuario a completar el siguiente paso.
3.  **Transparencia:** Junto a los cálculos provisionales, se muestra un aviso legal claro: *"LA CUOTA MENSUAL FINAL SE DEFINIRÁ CUANDO CONFIRMEMOS TU SALDO DEUDOR"*.
4.  **Carga de Documentos:** El usuario sube los documentos requeridos (CI, extracto de tarjeta, etc.) a través del mismo dashboard.
5.  **Síntesis de Perfil:** `[🚧 En Progreso]` La revisión es manual desde el Scorecard; la función `sintetizar-perfil-riesgo` queda pendiente para automatizar.

---

## Fase 3: Verificación y Aprobación Final (Flujo del Analista) [✅ Completado]

1.  **Revisión del Perfil:** `[✅ Completado]` El analista de riesgo (Sarai) ve el nuevo perfil en su `RiskAnalystDashboard.jsx` (Scorecard Digital).
2.  **Verificación de Documentos:** `[✅ Completado]` Sarai revisa los documentos para validar la información del cliente directamente desde el Scorecard.
3.  **Videollamada de Verificación:** `[✅ Completado]` Se realiza una videollamada breve para conocer al prestatario antes de consultar INFOCRED.
4.  **Consulta INFOCRED:** `[✅ Completado]` Se carga el PDF de INFOCRED luego de la videollamada y con expediente completo.
5.  **Paso Crítico: Verificación de Deuda:** `[✅ Completado]` El analista ingresa el **saldo deudor verificado** en el Scorecard.
6.  **Cálculo "Gross-Up" (Automático):** `[✅ Completado]` Se calcula el monto bruto con mínimo Bs 450 hasta 10k o % por perfil sobre 10k.
7.  **Decisión Final:** `[✅ Completado]` El modal registra en `decisiones_de_riesgo`, actualiza estados y dispara el correo de propuesta.
---

## Fase 4: Desembolso Dirigido [🚧 En Progreso]

1.  **Notificación al Prestatario:** `[✅]` Correo de propuesta branded con CTA; dashboard de propuesta muestra términos finales, admin/seguro prorrateado y tabla de amortización.
2.  **Publicación a inversionistas:** `[✅]` Al aceptar la propuesta, la oportunidad queda `disponible` para fondeo.
3.  **Fondeo completo:** `[❌ Pendiente]` La oportunidad pasa a `fondeada` cuando se llena el 100% con inversionistas.
4.  **Desembolso dirigido:** `[❌ Pendiente]` Automatizar el pago directo al banco acreedor, generar comprobante para el prestatario y marcar el préstamo como activo.

