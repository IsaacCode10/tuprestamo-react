# Modelo Base de Ingresos - Go To Market (Borrador)

Objetivo: estimar ingresos brutos mensuales por cohorte y en estado estable para 10/50/100/200 refinanciamientos/mes.

Parámetros confirmados

- Ticket promedio: Bs 17.000
- Tasas prestatario por nivel: A 15% – B 17% – C 20%
- Originación: mínimo Bs 450 hasta neto 10.000; sobre netos >10.000 aplicar A 3% – B 4% – C 5% con gross-up (ingreso mes de desembolso)
- Costo notariado por préstamo desembolsado (MVP): Bs 150 aprox. (absorbido por la plataforma; no se cobra extra al prestatario)
- Comisión inversionista: 1% sobre cada pago mensual (capital + interés)
- Spread de plataforma: diferencia entre tasa activa (prestatario) y tasa pasiva objetivo (inversionista), registrada por cuota
- Servicio+Seguro mensual sobre saldo deudor:
  - Servicio plataforma: 0,10% (ingreso de la plataforma)
  - Seguro desgravamen: 0,50% (pass-through; no ingreso)
  - **Mínimo mensual combinado:** 10 Bs (aplica si 0,15% del saldo < 10 Bs)
  - **Presentación (UI propuesta):** el total de admin/seguro calculado con la regla anterior se prorratea en partes iguales entre las cuotas para mostrar una **cuota fija**; no altera el costo total.
- Mora (EL) conservadora: 2% anual aplicada proporcionalmente a cobros/servicio
- Bancos: sin comisiones por transferencias/retiros
- Timing: publicación y fondeo el mismo mes

Datos a definir (para versión 2)

- Mix A/B/C (%)
- Mix de plazos 12/18/24 (%)
- Tasa de aprobación del funnel (approval rate)
  - Costo de buró: Bs 11 por consulta → costo por aprobado = 11 / approval_rate
  - Sensibilidad sugerida: 15% / 25% / 35%

Metodología de cálculo

- Amortización francesa con tasa del prestatario → cuota mensual por préstamo
- Ingresos plataforma por cohorte:
  1) Originación bruta (una vez, mes 0)
  1.1) Menos costo notariado por préstamo (MVP): Bs 150
  2) Comisión de servicio inversionista (1% mensual sobre flujo definido)
  3) Admin plataforma (0,10% mensual sobre saldo)
  4) Spread plataforma (activo - pasivo) por cuota
- EL=2% reduce proporcionalmente 2), 3) y 4) cuando aplica
- Estado estable: cuando conviven hasta 24 cohortes (para plazo 24m)

Estimaciones base actualizadas (mix A/B/C uniforme, plazo 24m)

- Originación bruta por préstamo (promedio A/B/C): ~ 4% × 17.000 = Bs 680
- Menos costo notariado absorbido (MVP): Bs 150
- Originación neta para la plataforma: Bs 530
- Comisión servicio inversionista (vida 24m, con EL): ~ Bs 198
- Admin plataforma 0,10% sobre saldo (vida 24m, con EL): ~ Bs 219
- Spread plataforma (vida 24m, con EL): **pendiente de calibración con waterfall canónico**
- Total vida por préstamo (neto plataforma): 947 + spread real capturado
- MRR por préstamo activo (EL aplicado): base ~ Bs 17,3/mes + componente spread
- Préstamos activos en estable ~ 24 × N (N = préstamos/mes)
- Ingreso mensual estable (base sin spread) ~ (17,3 × 24 × N) + (530 × N) = (415 + 530) × N = 945 × N
- Ingreso mensual estable total = `base sin spread + spread capturado`

Escenarios – Ingreso mensual estable

- 10 préstamos/mes → ~ Bs 9.450/mes + spread
- 50 préstamos/mes → ~ Bs 47.250/mes + spread
- 100 préstamos/mes → ~ Bs 94.500/mes + spread
- 200 préstamos/mes → ~ Bs 189.000/mes + spread

Costo de buró (sensibilidad por aprobado)

- 15% → ~ Bs 73,3 por aprobado
- 25% → ~ Bs 44,0 por aprobado
- 35% → ~ Bs 31,4 por aprobado

Próximos pasos

- Incorporar mix A/B/C y 12/18/24 para curva de rampa de 36 meses
- Añadir tabla mensual por escenario (10/50/100/200) y resumen estable
- Ajustar si el 0,50% del seguro tiene algún split distinto (hoy asumido 100% pass-through)
