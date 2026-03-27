# Plan: Optimizacion Rapida de Conversion Home Prestatario

## Objetivo

Optimizar la home actual para aumentar la conversion de visitantes a intencion real de prestatario sin tocar:

- backend
- formulario
- logica de solicitudes
- dashboards
- flujo documental

La estrategia es intervenir solo en:

- hero
- primer scroll
- mensajes clave
- CTA principal
- copy de la seccion prestatarios
- rol de la seccion "Mi Testimonio"

Todo con riesgo bajo y velocidad alta de implementacion.

---

## Diagnostico Base

Con base en Mixpanel:

- Page Views unicos (30 dias): 580
- Calculated Loan Result: 32
- Viewed Loan Application Form: 15
- Started Loan Application: 13
- Submitted Loan Application: 8
- Viewed Borrower Dashboard: 3

### Lectura principal

- El problema principal no esta dentro del formulario.
- El cuello de botella mas fuerte esta antes del formulario.
- La home actual explica el negocio, pero no empuja suficiente intencion.
- El primer scroll hoy probablemente mezcla demasiada complejidad para trafico frio.

---

## Principios de esta iteracion

1. No rehacer el sitio completo.
2. No tocar backend ni formularios.
3. No mover piezas criticas del flujo operativo.
4. Priorizar cambios de copy, foco, jerarquia y CTA.
5. Mantener el riesgo tecnico lo mas bajo posible.
6. Mejorar conversion con cambios que puedan salir en horas, no en dias.
7. Evaluar cada cambio de copy tambien por su impacto visual en el layout.

---

## Plan Paso a Paso

### Paso 1. Definir la estrategia del primer scroll

Objetivo:

- definir que debe comunicar el hero
- definir que no debe explicar aun
- aclarar el rol del primer scroll

Hipotesis:

- el hero debe vender alivio financiero y claridad, no explicar el marketplace

Estado: En progreso

---

### Paso 2. Aprobar el nuevo hero

Incluye:

- headline
- subtitulo
- CTA principal para prestatario
- cajas de apoyo

Objetivo:

- hacer que el usuario entienda en segundos:
  - esto es para mi
  - esto me puede ayudar
  - este es el siguiente paso

Estado: Pendiente

#### Decision tomada

Se aprueba una linea de hero orientada a conversion directa:

- enfoque principal: dolor del usuario con deuda de tarjeta
- tono: directo, claro, sin explicacion institucional del marketplace
- objetivo: mover a mas usuarios desde visita a intencion

#### Hero elegido: Opcion 1 - Dolor Directo

Titulo base:

- Deja de pagar tanto por tu tarjeta de credito

Subtitulo base:

- Si tu tarjeta te cobra intereses altos, mantenimiento y pagos minimos que no te dejan avanzar, en Tu Prestamo puedes solicitar una evaluacion para refinanciar tu deuda con condiciones mas claras.

CTA prestatario base:

- Solicitar evaluacion

CTA inversionista:

- Quiero invertir

Cajas de apoyo:

- Pago directo a tu banco acreedor
- Tasas desde 15% anual segun perfil
- Proceso 100% online

Estado: Aprobado

#### Ajuste estrategico posterior

Para esta etapa del negocio, el hero dejara de ser dual.

Decision:

- el hero se optimiza solo para prestatarios
- el CTA de inversionistas sale del hero
- el acceso para inversionistas se mantiene en el header
- la narrativa para inversionistas se mantiene mas abajo en la home

Razon:

- el cuello de botella actual es la conversion de tenedores de tarjeta de credito
- dividir la atencion en el primer scroll reduce claridad
- esta etapa requiere foco, no simetria entre audiencias

---

### Paso 3. Revisar la seccion Prestatarios

Incluye:

- simplificar copy
- reducir ruido
- alinear beneficios con el dolor real
- reforzar el CTA

Objetivo:

- que la seccion ayude a decidir, no solo a explicar

Estado: Pendiente

---

### Paso 4. Definir el rol de "Mi Testimonio"

Preguntas a resolver:

- se mantiene o no
- donde debe vivir
- que funcion cumple dentro del funnel

Criterio:

- no debe robar protagonismo al mensaje principal
- debe funcionar como confianza narrativa, no como prueba social falsa

Estado: Pendiente

---

### Paso 5. Reordenar mentalmente la home

Objetivo:

- decidir que queda arriba
- que baja
- que se mantiene igual

Sin:

- rediseño profundo
- cambios estructurales costosos

Estado: Pendiente

---

### Paso 6. Implementar en codigo

Incluye:

- cambios aprobados de copy
- ajustes de CTA
- ajustes de jerarquia visual o de orden si son de bajo riesgo

No incluye:

- cambios de backend
- cambios de DB
- cambios al formulario

Estado: Pendiente

---

### Paso 7. Revision final pre-deploy

Checklist:

- coherencia del mensaje
- lectura mobile
- consistencia de CTA
- validacion final antes de deploy nocturno

Estado: Pendiente

---

## Estrategia Aprobada del Primer Scroll

### El hero debe lograr una sola cosa

Que una persona con deuda de tarjeta piense:

- esto es para mi
- puede ayudarme
- voy a dar el siguiente paso

### El hero debe comunicar

1. Que problema resolvemos
2. Para quien es
3. Que beneficio concreto prometemos
4. Que hacer ahora

### El hero NO debe explicar aun

- el marketplace completo
- el fondeo colectivo
- la logica operativa completa
- demasiados detalles de pricing
- demasiadas condiciones del proceso

### Rol correcto del hero

Debe funcionar como:

- identificador de dolor
- traductor de propuesta de valor
- disparador de accion

No como:

- resumen institucional del negocio
- pitch corporativo
- explicacion completa del ecosistema

---

## Tesis de esta iteracion

En esta fase, la home debe priorizar al prestatario.

No porque inversionistas no importen, sino porque:

- el cuello de botella actual esta en conversion de prestatarios
- la mezcla prematura de audiencias puede estar reduciendo claridad

---

## Regla de diseno para esta iteracion

No vamos a optimizar solo palabras.

Cada ajuste de copy debe evaluarse tambien por:

- longitud del texto
- balance visual de la seccion
- cantidad de lineas en desktop y mobile
- riesgo de dejar huecos o romper la composicion

### Criterio operativo

- no vaciar secciones de forma extrema
- no inflar bloques con texto innecesario
- mantener una densidad visual parecida, pero con mejor foco
- mejorar mensaje sin destruir el equilibrio del diseño actual

### Implicacion

Antes de implementar cada bloque se evaluara:

1. que idea debe comunicar
2. cuanta longitud necesita
3. como afecta al layout existente

Esto aplica especialmente a:

- hero
- cajas de apoyo
- seccion Prestatarios
- Mi Testimonio

---

## Resultado esperado de esta iteracion

No se busca:

- rehacer toda la web
- rediseñar backend
- transformar toda la arquitectura

Si se busca:

- mejorar claridad del hero
- reducir friccion mental
- aumentar intencion hacia formulario
- hacer que la propuesta de valor se entienda mas rapido

---

## Registro de decisiones

### Decision 1

La primera iteracion sera de bajo riesgo:

- copy
- mensaje
- CTA
- jerarquia

Sin tocar:

- backend
- formulario
- flujo operativo

### Decision 2

No se usara prueba social inventada.

La confianza se construira con:

- claridad
- transparencia
- seriedad visual
- explicacion del proceso
- consistencia del mensaje
