# Modelo Base de Ingresos – Go To Market (Borrador)

Objetivo: estimar ingresos brutos mensuales por cohorte y en estado estable para 10/50/100/200 refinanciamientos/mes.

Parámetros confirmados

- Ticket promedio: Bs 17.000
- Tasas prestatario por nivel: A 15% · B 17% · C 20%
- Originación por nivel: A 3% · B 4% · C 5% (ingreso mes de desembolso)
- Comisión inversionista: 1% sobre cada pago mensual (capital + interés)
- Servicio+Seguro mensual sobre saldo deudor:
  - Servicio plataforma: 0,10% (ingreso de la plataforma)
  - Seguro desgravamen: 0,50% (pass-through; no ingreso)
- Mora (EL) conservadora: 2% anual aplicada proporcionalmente a cobros/servicio
- Bancos: sin comisiones por transferencias/retiros
- Timing: publicación y fondeo el mismo mes

Datos a definir (para versión 2)

- Mix A/B/C (%)
- Mix de plazos 12/18/24 (%)
- Tasa de aprobación del funnel (approval rate)
  - Costo de buró: Bs 11 por consulta ? costo por aprobado = 11 / approval_rate
  - Sensibilidad sugerida: 15% / 25% / 35%

Metodología de cálculo

- Amortización francesa con tasa del prestatario ? cuota mensual por préstamo
- Ingresos plataforma por cohorte:
  1) Originación (una vez, mes 0)
  2) 1% sobre cobro mensual (capital+interés)
  3) 0,10% mensual sobre saldo (servicio plataforma)
- EL=2% reduce proporcionalmente 2) y 3)
- Estado estable: cuando conviven hasta 24 cohortes (para plazo 24m)

Estimaciones base (mix A/B/C uniforme, plazo 24m)

- Originación por préstamo (promedio A/B/C): ˜ 4% × 17.000 = Bs 680
- 1% sobre cobros (vida 24m, con EL): ˜ Bs 198
- Servicio 0,10% sobre saldo (vida 24m, con EL): ˜ Bs 219
- Total vida por préstamo ˜ Bs 1.097
- MRR por préstamo activo (EL aplicado): ˜ Bs 17,3/mes
- Préstamos activos en estable ˜ 24 × N (N = préstamos/mes)
- Ingreso mensual estable ˜ (17,3 × 24 × N) + (680 × N) ˜ (415 + 680) × N ˜ 1.095 × N

Escenarios – Ingreso mensual estable

- 10 préstamos/mes ? ˜ Bs 10.950/mes
- 50 préstamos/mes ? ˜ Bs 54.750/mes
- 100 préstamos/mes ? ˜ Bs 109.500/mes
- 200 préstamos/mes ? ˜ Bs 219.000/mes

Costo de buró (sensibilidad por aprobado)

- 15% ? ˜ Bs 73,3 por aprobado
- 25% ? ˜ Bs 44,0 por aprobado
- 35% ? ˜ Bs 31,4 por aprobado

Próximos pasos

- Incorporar mix A/B/C y 12/18/24 para curva de rampa 36m
- Añadir tabla mensual por escenario (10/50/100/200) y resumen estable
- Ajustar si el 0,50% del seguro tiene algún split distinto (hoy asumido 100% pass-through)