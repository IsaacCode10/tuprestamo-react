# V0 - Baseline Home Generalista

## Estado

Documentada como linea base previa a la optimizacion de conversion enfocada en prestatarios.

## Contexto

La home V0 fue construida como una pagina principal general del negocio, con presencia simultanea de:

- propuesta para prestatarios
- propuesta para inversionistas
- explicacion general del marketplace
- secciones institucionales y de confianza

Esta version funciono como base inicial del sitio en produccion.

## Objetivo que cumplia

- presentar el modelo general de Tu Prestamo
- comunicar que existen dos lados del marketplace
- permitir que tanto prestatarios como inversionistas encontraran su camino

## Diagnostico posterior

Con el analisis de Mixpanel y auditoria de conversion, se concluyo que:

- el problema principal no estaba en el formulario
- el principal cuello de botella estaba antes del formulario
- la home explicaba el negocio, pero no empujaba suficiente intencion
- el hero y el primer scroll mezclaban demasiadas cosas para trafico frio
- la propuesta para prestatarios no dominaba el primer impacto

## Metricas baseline conocidas

Ventana analizada:

- 24 Feb 2026 a 26 Mar 2026

Metricas:

- Unique Page Views: 580
- Calculated Loan Result: 32
- Viewed Loan Application Form: 15
- Started Loan Application: 13
- Submitted Loan Application: 8
- Viewed Borrower Dashboard: 3

## Lectura del funnel

- La conversion de visita a formulario era baja.
- La conversion dentro del formulario era razonablemente buena.
- El cuello de botella principal estaba en:
  - hero
  - propuesta de valor
  - CTA principal
  - mezcla de audiencias

## Problemas principales detectados

1. Hero demasiado institucional y poco centrado en el dolor del tenedor de tarjeta.
2. CTA principal debil para trafico frio.
3. Mezcla prematura entre prestatarios e inversionistas.
4. Exceso de explicacion antes de accion.
5. Home mas cercana a brochure corporativo que a landing de conversion.

## Aprendizajes de V0

- Explicar el negocio no es lo mismo que convertir.
- El usuario prestatario necesita un mensaje mucho mas directo en los primeros segundos.
- La dualidad del marketplace no debe dominar el primer scroll.
- El formulario no era el principal culpable de la baja conversion.

## Siguiente paso

Diseñar V1 enfocada en prestatarios y optimizar:

- hero
- beneficios
- seccion prestatarios

Sin tocar:

- backend
- formulario
- flujo operativo

