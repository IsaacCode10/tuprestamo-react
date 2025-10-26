# Roadmap de Frontend del Inversionista (Self‑Service)

Describe el viaje del inversionista en la UI, optimizado para cero fricción y alta conversión.

Leyenda de estados:
- [✔ Completado]
- [⏳ En Progreso]
- [🟡 Pendiente]

---

### Etapa 1: Registro y Activación de Cuenta [⏳ En Progreso]

1) Registro directo (Sign Up)
- Formulario simple: nombre, email, contraseña, seleccionar rol `inversionista`.
- Verificación de email de Supabase (link de activación) y redirección al `InvestorDashboard`.
- Email de bienvenida automático con CTA al dashboard.

2) Onboarding ligero en dashboard
- Banner “Completa tu perfil” (nombre legal, CI, fecha de nacimiento, ciudad, cuenta bancaria para retiros opcional).
- Aceptación de Términos y Condiciones + declaración de riesgos (paso rápido, en-modal).

---

### Etapa 2: Explorar y Fondear [🟡 Pendiente]

1) Oportunidades (`Opportunities.jsx`)
- Lista de préstamos aprobados disponibles para fondeo.
- Cards con: riesgo (A/B/C), monto requerido, tasa, plazo.

2) Detalle (`OpportunityDetail.jsx`)
- Información anonimizada del perfil de riesgo y progreso de fondeo.

3) Intento de fondeo (modal)
- Botón “Quiero Invertir” abre modal.
- Si perfil incompleto, pedir datos mínimos + T&C y continuar.
- Insertar “intención de fondeo” y mostrar instrucción de transferencia con referencia única.

---

### Etapa 3: Portafolio y Fondos [🟡 Pendiente]

- `InvestorDashboard.jsx`: resumen (“Total Invertido”, “Ganancias Totales”, “Fondos Disponibles”).
- `MyInvestmentsList.jsx`: tabla de inversiones (monto, tasa, próximo pago, estado).
- `InvestorProfile.jsx`: gestión de datos y cuenta bancaria.
- `WithdrawalForm.jsx`: solicitar retiros desde “Fondos Disponibles”.

---

### Analítica (Mixpanel)

- Growth: `Campaign Lead` (UTMs), `Signed Up`.
- Funnel: `Viewed Marketplace`, `Viewed Loan Details`, `Completed Investment`.
- Identidad: `identifyUser` con rol inversionista tras login/registro.

