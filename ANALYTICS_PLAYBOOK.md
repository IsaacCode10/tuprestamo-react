# Playbook de Analytics — Tu Prestamo (Mixpanel)

Objetivo: medir lo minimo necesario para tomar decisiones de lanzamiento sin inflar complejidad ni costo. El foco del MVP es entender el funnel prestatario y mantener visibilidad basica del funnel inversionista.

---

## 1. Estado actual del proyecto

### Herramienta y alcance
- Herramienta principal: Mixpanel.
- Plan actual: Free / Starter.
- Entorno activo: produccion. En desarrollo y preview no se prioriza analitica operativa.
- Session Replay: activo con muestreo bajo.
- Autocapture y page view automatico: activos.

### Implementacion tecnica
- Inicializacion central: `src/analytics.js`
- Entrada principal: `src/main.jsx`
- Wrapper disponible:
  - `initMixpanel`
  - `trackEvent`
  - `identifyUser`
  - `setSuperProperties`
  - `resetMixpanel`

### Lo que confirmamos en produccion
- El evento automatico de trafico que realmente entra a Mixpanel es:
  - `$mp_web_page_view` / `[Auto] Page View`
- No existe hoy en datos el evento:
  - `Signed Up`
- Si existen en datos y/o codigo productivo:
  - `Logged In`
  - `Viewed Marketplace`
  - `Viewed Loan Details`
  - `Created Investment Intent`
  - `Receipt Uploaded`
  - `Viewed Loan Application Form`
  - `Started Loan Application`
  - `Submitted Loan Application`
  - `Viewed Borrower Dashboard`
  - `Calculated Loan Result`
  - `Interacted With Calculator`

---

## 2. Eventos implementados hoy

### Trafico y sesion
- `[Auto] Page View`
- eventos autocapture de Mixpanel como click, scroll, input change y session record

### Autenticacion
- `Logged In`
- `Logged Out`
- `Login Failed`
- `Signed Up` existe en codigo, pero no se ha validado en datos reales de produccion

### Funnel prestatario
- `Viewed Loan Application Form`
- `Started Loan Application`
- `Submitted Loan Application`
- `Viewed Borrower Dashboard`
- `Borrower Proposal Help Clicked`
- `Borrower_Proposal_Decision`

### Nuevos eventos agregados para el MVP prestatario
- `Borrower Proposal Viewed`
- `Borrower Proposal Accepted`
- `Borrower Proposal Rejected`
- `Borrower Opportunity Published`
- `Loan Funded`
- `Loan Disbursed`

### Funnel inversionista
- `Viewed Marketplace`
- `Viewed Loan Details`
- `Created Investment Intent`
- `Receipt Uploaded`
- `Payment Under Review Shown`
- `Payment Intent Expired`
- `Viewed Portfolio`

### Calculadora y top-of-funnel publico
- `Interacted With Calculator`
- `Calculated Loan Result`
- eventos legacy todavia presentes:
  - `Calculator_Viewed`
  - `Calculator_Calculate_Clicked`
  - `Calculator_LeadForm_Viewed`
  - `Submitted Investor Interest`

---

## 3. Taxonomia real que debemos respetar

### Regla general
- No crear eventos nuevos sin necesidad.
- No mezclar nombres nuevos con versiones legacy para el mismo hito.
- Si un evento ya existe en produccion y sirve, se reutiliza.

### Problema actual
Hoy conviven dos capas:
- taxonomia nueva orientada a producto:
  - `Viewed Marketplace`
  - `Created Investment Intent`
  - `Receipt Uploaded`
- taxonomia legacy de calculadora/formularios:
  - `Calculator_Viewed`
  - `Calculator_Calculate_Clicked`
  - `Submitted Investor Interest`

### Decision MVP
- Para dashboard operativo usar solo eventos confirmados y utiles.
- No intentar limpiar toda la taxonomia antes del lanzamiento.
- La normalizacion completa se deja para una fase posterior.

---

## 4. Dashboard recomendado hoy con plan Free

Limite operativo recomendado: 5 reportes maximo. El objetivo no es tener un dashboard bonito; es tener uno accionable.

### Dashboard principal recomendado: foco prestatario
1. `Usuarios unicos diarios`
- Evento: `[Auto] Page View`
- Metrica: usuarios unicos
- Rango: 30 dias

2. `Calculadora usada`
- Evento: `Calculated Loan Result`
- Metrica: total events
- Rango: 30 dias

3. `Funnel prestatario`
- `Viewed Loan Application Form`
- `Started Loan Application`
- `Submitted Loan Application`
- `Viewed Borrower Dashboard`

4. `Funnel propuesta a desembolso`
- `Borrower Proposal Viewed`
- `Borrower Proposal Accepted`
- `Loan Disbursed`

Nota operativa:
- Este funnel no se considera activo hasta que esos 3 eventos hayan ocurrido al menos una vez en produccion y aparezcan visibles en Mixpanel.
- Mixpanel no muestra eventos nuevos con valor 0 si nunca fueron emitidos; primero deben entrar al proyecto una vez.
- Mientras eso no ocurra, este funnel debe tratarse como pendiente de activacion y no como KPI valido del MVP.

5. `Marketplace a intencion`
- `Viewed Marketplace`
- `Created Investment Intent`

### Dashboard alternativo si el foco cambia a inversionista
1. `Usuarios unicos diarios`
2. `Funnel inversionista`
   - `Viewed Marketplace`
   - `Viewed Loan Details`
   - `Created Investment Intent`
   - `Receipt Uploaded`
3. `Marketplace a intencion`
4. `Intenciones por oportunidad`
5. `Comprobantes por oportunidad`

---

## 5. Lo que tiene sentido medir en las primeras semanas

### Preguntas clave del lanzamiento
1. Cuanta gente llega a la pagina.
2. Cuanta gente usa la calculadora.
3. Cuanta gente empieza solicitud.
4. Cuanta gente envia solicitud.
5. Cuanta gente llega a propuesta.
6. Cuanta gente acepta propuesta.
7. Cuantos casos llegan a desembolso.

### KPIs MVP prestatario
- usuarios unicos diarios
- resultados de calculadora por dia
- solicitudes enviadas por dia
- tasa de conversion:
  - formulario visto -> formulario iniciado
  - formulario iniciado -> solicitud enviada
  - propuesta vista -> propuesta aceptada
  - propuesta aceptada -> desembolso

### KPIs MVP inversionista
- marketplace visto
- detalle visto
- intencion creada
- comprobante subido

No hace falta medir retencion sofisticada, cohortes complejas ni revenue analytics en la primera etapa.

---

## 6. Recomendaciones operativas para plan Free

- Mantener 1 board principal, no varios boards dispersos.
- Evitar dashboards con mas de 5 o 6 reportes.
- Evitar breakdowns innecesarios.
- No usar Session Replay como KPI.
- No activar Active Ping por ahora.
- Revisar manualmente volumen de eventos 1 vez por semana.

### Criterio practico
Si el dashboard no ayuda a decidir:
- donde se cae el prestatario,
- si la calculadora genera intent,
- y si la propuesta termina en desembolso,
entonces sobra.

---

## 7. Eventos pendientes o deseables para fase siguiente

Estos no bloquean lanzamiento, pero mejoran la lectura del negocio cuando ya haya mas volumen:

### Prestatario
- `Borrower First Installment Paid`
- `Borrower Installment Receipt Uploaded`
- `Borrower Reanalysis Requested`
- activar y validar visualmente en Mixpanel:
  - `Borrower Proposal Viewed`
  - `Borrower Proposal Accepted`
  - `Borrower Proposal Rejected`
  - `Loan Disbursed`

### Inversionista
- `Payment Marked Paid`
- `Payout Received`

### Atribucion
- validar si `Signed Up` se usa realmente en produccion
- si no se usa, no construir dashboard sobre ese evento
- mantener UTMs first-touch y last-touch ya implementadas

---

## 8. Recomendaciones cuando ya tengamos prestamos aprobados y publicados

Cuando el pipeline empiece a moverse con casos reales completos, el dashboard debe evolucionar desde activacion a cierre.

### Agregar reportes nuevos
1. `Propuesta a desembolso por semana`
- `Borrower Proposal Viewed`
- `Borrower Proposal Accepted`
- `Loan Funded`
- `Loan Disbursed`

2. `Desembolsos por semana`
- evento: `Loan Disbursed`

3. `Funnel inversionista completo`
- `Viewed Marketplace`
- `Viewed Loan Details`
- `Created Investment Intent`
- `Receipt Uploaded`
- `Payment Marked Paid`
- `Payout Received`

4. `Prestamos publicados a fondeados`
- `Borrower Opportunity Published`
- `Loan Funded`

### Preguntas de negocio que ese tablero debe responder
- de cada 10 solicitudes enviadas, cuantas llegan a propuesta
- de cada 10 propuestas vistas, cuantas se aceptan
- de cada 10 aceptadas, cuantas se desembolsan
- de cada oportunidad publicada, cuantas se fondean
- de cada intencion de inversion, cuantas llegan a comprobante

---

## 9. Checklist de mantenimiento

### Cada semana
- revisar si los eventos criticos siguen llegando
- revisar duplicados evidentes
- revisar si hay eventos nuevos no documentados
- revisar si el board sigue respondiendo preguntas reales

### Cada cambio de producto
- si cambia el flujo, actualizar este documento
- si cambia el nombre de un evento, documentarlo aqui antes de usarlo en dashboard
- si aparece un evento nuevo en produccion, confirmar primero su utilidad antes de meterlo al board

---

## 10. Resumen ejecutivo

Hoy el MVP debe medirse asi:
- foco principal: funnel prestatario
- foco secundario: funnel inversionista basico
- board pequeno, accionable y compatible con plan Free

Lo mas importante ya implementado para la salida:
- formulario prestatario
- propuesta prestatario
- aceptacion/rechazo
- publicacion
- fondeo
- desembolso

Pendiente de validacion en Mixpanel:
- el funnel prestatario de propuesta a desembolso solo se da por terminado cuando `Borrower Proposal Viewed`, `Borrower Proposal Accepted` y `Loan Disbursed` ya existan como eventos visibles en produccion.

Lo que sigue despues del lanzamiento:
- validar eventos nuevos en Mixpanel
- cerrar dashboard prestatario definitivo
- agregar cierre operativo del lado inversionista (`Payment Marked Paid`, `Payout Received`) cuando ya exista suficiente volumen real
