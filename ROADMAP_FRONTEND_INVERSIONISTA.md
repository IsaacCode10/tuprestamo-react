# Roadmap de Frontend del Inversionista

Este documento describe el viaje del inversionista a través de la interfaz de la aplicación, explicando qué componentes de React ve en cada etapa.

**Leyenda de Estados:**
*   `[✅ Completado]`
*   `[🚧 En Progreso]`
*   `[❌ Pendiente]`

---

### Etapa 1: Activación de la Cuenta `[❌ Pendiente]`

El inversionista llega a la plataforma a través de un enlace de invitación único.

1.  **Creación de Contraseña (`InvestorActivateAccount.jsx`):**
    *   Al hacer clic en el enlace del correo de invitación, el inversionista es llevado a una página especial para elegir y confirmar su contraseña. El diseño será similar al `BorrowerActivateAccount.jsx`.

---

### Etapa 2: Dashboard y Visualización del Portafolio `[❌ Pendiente]`

Una vez activo, el inversionista accede a su centro de control.

1.  **Dashboard Principal (`InvestorDashboard.jsx`):
    *   Es la primera pantalla al iniciar sesión.
    *   Muestra componentes clave con un resumen de su actividad.

2.  **Resumen de Métricas (`PortfolioSummary.jsx`):
    *   Un componente destacado dentro del dashboard.
    *   Muestra tarjetas con métricas importantes: "Total Invertido", "Rendimiento Anual Promedio", "Ganancias Totales" y "Fondos Disponibles para Retirar/Reinversión".

3.  **Lista de Inversiones (`MyInvestmentsList.jsx`):
    *   Un componente que muestra una tabla o lista de todos los préstamos que el inversionista ha financiado.
    *   Columnas: Prestatario (ID anónimo), Monto Invertido, Tasa de Rendimiento, Próximo Pago, Estado (Activo, Atrasado, Completado).

---

### Etapa 3: Exploración y Fondeo de Oportunidades `[❌ Pendiente]`

Aquí es donde el inversionista pone su capital a trabajar.

1.  **Página de Oportunidades (`Opportunities.jsx`):
    *   Una página dedicada que muestra una lista de todos los préstamos aprobados que están disponibles para ser fondeados.
    *   Cada item de la lista es un "card" que resume la oportunidad: Nivel de Riesgo (A, B, C), Monto Requerido, Tasa de Rendimiento, Plazo.

2.  **Detalle de la Oportunidad (`OpportunityDetail.jsx`):
    *   Al hacer clic en una oportunidad, se navega a una vista detallada con toda la información anonimizada del perfil de riesgo del prestatario.

3.  **Modal de Fondeo (`FundingModal.jsx`):
    *   En la página de detalle, un botón de "Me interesa Fondear" abre este modal.
    *   El modal muestra los datos de la cuenta bancaria de Tu Préstamo a la cual el inversionista debe transferir los fondos.
    *   Incluye un botón de "He realizado la transferencia" que notifica al sistema y cambia el estado de la oportunidad a `fondeo_pendiente`.

---

### Etapa 4: Gestión de Perfil y Fondos `[❌ Pendiente]`

Funcionalidades administrativas para el inversionista.

1.  **Perfil del Inversionista (`InvestorProfile.jsx`):
    *   Una página de configuración donde el inversionista puede gestionar sus datos personales y, crucialmente, registrar la cuenta bancaria donde recibirá sus retiros.

2.  **Formulario de Retiro (`WithdrawalForm.jsx`):
    *   Un componente simple donde el inversionista puede ingresar un monto a retirar de sus "Fondos Disponibles" y solicitar la transferencia.
    *   Al enviar, se genera una notificación para el equipo de Operaciones de Tu Préstamo.
