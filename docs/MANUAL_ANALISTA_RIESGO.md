# Manual del Analista de Riesgo (MVP)

## 1. Objetivo y rol
- Evaluar solicitudes, validar documentos y definir la propuesta final (monto bruto, neto, tasa, plazo).
- Garantizar que el préstamo cubra el saldo deudor verificado (sin desvío) y que el riesgo esté correctamente clasificado.

## 2. Nomenclatura en la plataforma
- **Oportunidad 61**: número corto de operación; usar este ID en comunicaciones internas.
- **Prestatario**: se muestra como nombre/email; si falta, UUID abreviado (ej. `f6b6…b8b7`).
- **Estados solicitud/oportunidad**: borrador, `pendiente_notariado`, disponible, fondeada, activo, cerrado/en mora.
- **Documentos**: CI, extracto de tarjeta, comprobantes; ubicados en `documentos-prestatarios` (privado).

## 3. Flujo de trabajo (RiskAnalystDashboard)
1) **Revisión inicial**: abrir la solicitud en el panel de analista; validar datos básicos y documentos cargados.
2) **Verificación de saldo deudor**: revisar extracto; registrar `saldo_deudor_verificado` en el scorecard.
3) **Clasificación de riesgo**: revisar scorecard (perfil A/B/C) y antecedentes; ajustar si aplica.
4) **Cálculo de oferta**:
   - Gross-up automático: originación mínima 450 hasta 10k; sobre 10k aplicar % por perfil (A/B/C).
   - Confirmar tasa y plazo aprobados.
5) **Guardar decisión**: guardar en `decisiones_de_riesgo`; actualizar oportunidad/solicitud.
6) **Propuesta final**: disparar propuesta al prestatario (correo/notif).
7) **Paso posterior (Operaciones)**: tras aceptación del prestatario, la operación pasa a `pendiente_notariado`; Operaciones valida notariado y recién publica oportunidad (`disponible`).

## 4. Checklist por solicitud
- Documentos completos y legibles (CI, extracto tarjeta).
- Saldo verificado registrado y consistente con la oferta.
- Tasa/plazo asignados según perfil; originación aplicada correctamente.
- Oportunidad publicada solo después de notariado validado por Operaciones.

## 4.1 Registro INFOCRED (obligatorio)
- **Precondiciones**:
  - Expediente documental completo.
  - Videollamada validada.
  - Autorización INFOCRED firmada a mano cargada en el panel del prestatario.
- **Paso 1: subir PDF de INFOCRED**:
  - En el panel del analista, sección "Historial INFOCRED", subir el PDF emitido por INFOCRED.
  - Verificar que el archivo quede como "PDF subido" y accesible para revisión.
- **Paso 2: registrar score y nivel**:
  - En "Score INFOCRED", cargar el valor exactamente como aparece en el reporte.
  - `infocred_score`: número entre **300 y 850**.
  - `infocred_risk_level`: letra entre **A y H** (A menor riesgo, H mayor riesgo).
  - Guardar con el botón "Guardar Score INFOCRED".
- **Validaciones del sistema**:
  - Si `score` está fuera de 300-850, se rechaza el guardado.
  - Si `nivel` no está en A-H, se rechaza el guardado.
- **Regla operativa**:
  - No avanzar a decisión final sin PDF INFOCRED + score + nivel registrados.
- **Calidad de dato**:
  - No estimar ni interpolar score/nivel.
  - Si el PDF no es legible o hay inconsistencia, solicitar nuevo reporte antes de continuar.

## 5. Incidencias comunes
- **Documento ilegible/faltante**: solicitar recarga; no aprobar hasta validar saldo.
- **Saldo inconsistente**: volver a calcular gross-up y ajustar oferta antes de emitir propuesta final.
- **Estado en inglés**: refrescar; si persiste, reportar a soporte.

## 6. Control de duplicados / identidad (agregado 2026-09-08)

**Regla:** una misma Cédula de Identidad no puede tener más de una solicitud de
prestatario en estado activo (`pendiente`, `pre-aprobado`, `documentos-en-revision`,
`aprobado_para_oferta`) al mismo tiempo. Rechazada o desembolsada, sí puede volver a
aplicar más adelante — solo se bloquea tener dos activas a la vez.

**Por qué se agregó — caso real detectado el 2026-09-08:** un solicitante (Luis Zenón
Segundo Padilla, CI `11366636`) aplicó 4 veces en 3 semanas. El control que existía hasta
ese momento comparaba por **email**, y lo esquivó agregando una letra de más al final del
correo en el segundo intento. Entre intento e intento **cambió los datos que declaró**
(situación laboral e ingreso mensual), es decir, fue ajustando los números a mano
buscando una combinación que pasara el scorecard automático — exactamente el patrón que
un control de identidad real tiene que atrapar.

**Cómo quedó resuelto (dos capas, no solo una):**
1. **Código de la aplicación** (`LoanRequestForm.jsx` y la Edge Function
   `handle-new-solicitud`): el chequeo de "¿ya tiene una solicitud activa?" ahora compara
   por `cedula_identidad`, no por `email`.
2. **Base de datos** (respaldo real, no solo el código): índice único parcial
   `solicitudes_cedula_activa_unique` sobre `cedula_identidad`, condicionado a
   `tipo_solicitud = 'prestatario'` y estado activo. Aunque el código de la app tuviera un
   bug futuro, la base de datos físicamente no va a permitir dos filas activas con la misma
   CI — esto es lo que hace que el control sea real y no dependa de que nadie se acuerde
   de mantenerlo.

**Qué hacer si un analista encuentra un caso similar** (alguien con múltiples intentos y
datos que cambian entre uno y otro): tratarlo como señal de posible manipulación del
scorecard, no como una simple corrección de datos — escalar para revisión manual antes de
avanzar con cualquiera de las solicitudes de esa persona.

## 7. Checklist diario
- Revisar nuevas solicitudes y documentos pendientes.
- Completar decisiones en cola y transferir a Operaciones las aprobadas (`pendiente_notariado`) para cierre notarial/publicación.
- Coordinar con Operaciones si hay cambios de datos que afecten pagos/cronos.
