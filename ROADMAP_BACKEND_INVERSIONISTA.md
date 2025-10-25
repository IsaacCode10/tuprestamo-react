# Roadmap de Backend del Inversionista (Self‑Service, sin fricción)

Este documento define los procesos del lado del servidor, funciones, triggers y políticas de seguridad que soportan el viaje del inversionista bajo un modelo 100% automático (sin invitaciones manuales).

Leyenda de estados:
- [✔ Completado]
- [⏳ En Progreso]
- [🟡 Pendiente]

---

### Etapa 1: Onboarding y Seguridad [⏳ En Progreso]

Creación y configuración segura del usuario inversionista (self‑service).

1) Registro self‑service (Supabase Auth)
- El usuario se registra directamente en la app eligiendo rol inversionista.
- Verificación de email estándar de Supabase.
- Edge Function/RPC segura asigna el rol en `profiles` (no confiar en el cliente para roles).

2) Post‑signup y bienvenida
- Trigger/Function de post‑signup crea el registro en `profiles` y envía correo de bienvenida (`send-welcome-email`).

3) Políticas de Seguridad (RLS)
- `oportunidades`: los inversionistas leen (`SELECT`) oportunidades con estado `aprobado`/`disponible`.
- `perfiles_de_riesgo`: lectura anonimizada vinculada a oportunidades aprobadas.
- `inversiones`, `transacciones_inversionista`: cada inversionista accede solo a sus filas (`user_id == auth.uid()`).

---

### Etapa 2: Lógica de Fondeo (MVP) [🟡 Pendiente]

1) Intención de Fondeo (Frontend)
- El inversionista registra una intención en `inversiones` (estado `intencion`) y recibe una referencia de pago.
- Se muestra la instrucción de transferencia con referencia única.

2) Conciliación automática de depósito
- Job/servicio de conciliación busca depósitos entrantes y los asocia por referencia/monto.
- Al conciliar: actualizar `inversiones` → `recibido`, sumar al progreso de la oportunidad.

3) Marcado de oportunidad financiada
- Cuando la suma recibida alcanza el objetivo, la oportunidad cambia a `financiado`.
- Trigger `on_opportunity_funded` inicia el proceso de desembolso dirigido al banco del prestatario.

---

### Etapa 3: Retornos y Comisiones [🟡 Pendiente]

1) Recepción de pagos del prestatario
- Registrar pago en `pagos_prestatario` (proceso externo o edge function).

2) Trigger de distribución (`on_borrower_payment`)
- Al detectar un pago, invoca `distribute_investor_returns`.

3) Edge Function `distribute_investor_returns`
- Calcula desglose: capital, interés.
- Calcula comisión 1% para Tu Préstamo sobre el total recibido.
- Inserta `transacciones_inversionista` y actualiza `fondos_disponibles` del inversionista.

---

### MEJORAS POST MVP

- Deprecación: `Edge Function: invite-investor-user` (onboarding ahora self‑service). Retirar en próxima PR si no hay llamadas activas.
- Conciliación automática de depósitos (servicio/job) atada a referencias de intención.
- RPC/Function segura para asignación de rol y creación de `profiles` post‑signup (evitar confiar en el cliente).
- Límites de inversión por usuario y alertas antifraude básicas.
- Integración con PSP/Webhooks para fondeo automático cuando sea viable.
- KYC avanzado con proveedor externo cuando suba el volumen.

