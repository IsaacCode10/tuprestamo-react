// Loan calculation helpers (policy-aligned)
// Política MVP de originación:
// - Si neto <= 10.000 Bs -> originación fija 450; bruto = neto + 450
// - Si neto > 10.000 Bs  -> originación % por nivel con gross-up

export function calcOriginacionYBruto(neto, originacionPct) {
  const net = Number(neto) || 0;
  const p = (Number(originacionPct) || 0) / 100;
  const MIN_ORIGINACION = 450;
  const THRESHOLD_NET = 10000;

  if (net <= 0) return { originacion: 0, bruto: 0, minApplied: false };

  if (net <= THRESHOLD_NET) {
    return { originacion: MIN_ORIGINACION, bruto: net + MIN_ORIGINACION, minApplied: true };
  }
  const originacion = p > 0 ? (net * p) / (1 - p) : 0;
  const bruto = p > 0 ? net / (1 - p) : net;
  return { originacion, bruto, minApplied: false };
}

// Retorna la cuota mensual total (amortización + admin/seguro promedio mensual)
export function calcCuotaMensualTP(neto, tasaAnualPct, meses, originacionPct) {
  const n = Number(meses) || 0;
  const tasaAnual = Number(tasaAnualPct) || 0;
  if (!n || !tasaAnualPct) return 0;

  const { bruto } = calcOriginacionYBruto(neto, originacionPct);
  if (!bruto) return 0;

  const monthlyRate = tasaAnual / 100 / 12;
  const pmt = monthlyRate > 0
    ? (bruto * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n))
    : (bruto / n);

  // Admin/seguro: 0.15% del saldo, mínimo 10 Bs por mes (promedio en el período)
  const serviceFeeRate = 0.0015;
  const minServiceFee = 10;
  let balance = bruto;
  let totalServiceFee = 0;

  if (!isFinite(pmt)) {
    const principalPayment = bruto / n;
    for (let i = 0; i < n; i++) {
      const serviceFee = Math.max(balance * serviceFeeRate, minServiceFee);
      totalServiceFee += serviceFee;
      balance -= principalPayment;
    }
  } else {
    for (let i = 0; i < n; i++) {
      const interestPayment = balance * monthlyRate;
      const serviceFee = Math.max(balance * serviceFeeRate, minServiceFee);
      const principalPayment = pmt - interestPayment;
      totalServiceFee += serviceFee;
      balance -= principalPayment;
    }
  }

  const avgServiceFee = n > 0 ? totalServiceFee / n : 0;
  return (pmt || 0) + avgServiceFee;
}

// Devuelve el desglose completo para TP
export function calcTPBreakdown(neto, tasaAnualPct, meses, originacionPct) {
  const n = Number(meses) || 0;
  const tasaAnual = Number(tasaAnualPct) || 0;
  const { originacion, bruto, minApplied } = calcOriginacionYBruto(neto, originacionPct);
  if (!bruto || !n || !tasaAnualPct) {
    return {
      originacion: 0,
      bruto: 0,
      monthlyPaymentAmort: 0,
      avgServiceFee: 0,
      monthlyPaymentTotal: 0,
      totalInterest: 0,
      totalServiceFee: 0,
      costoTotalCredito: 0,
      totalAPagar: 0,
      minApplied,
    };
  }

  const monthlyRate = tasaAnual / 100 / 12;
  const pmt = monthlyRate > 0 ? (bruto * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n)) : (bruto / n);

  const serviceFeeRate = 0.0015;
  const minServiceFee = 10;
  let balance = bruto;
  let totalInterest = 0;
  let totalServiceFee = 0;

  if (!isFinite(pmt)) {
    const principalPayment = bruto / n;
    for (let i = 0; i < n; i++) {
      const serviceFee = Math.max(balance * serviceFeeRate, minServiceFee);
      totalServiceFee += serviceFee;
      balance -= principalPayment;
    }
  } else {
    for (let i = 0; i < n; i++) {
      const interestPayment = balance * monthlyRate;
      const serviceFee = Math.max(balance * serviceFeeRate, minServiceFee);
      const principalPayment = pmt - interestPayment;
      totalInterest += interestPayment;
      totalServiceFee += serviceFee;
      balance -= principalPayment;
    }
  }

  const costoTotalCredito = originacion + totalInterest + totalServiceFee;
  const totalAPagar = (Number(neto) || 0) + costoTotalCredito;
  const avgServiceFee = n > 0 ? totalServiceFee / n : 0;
  return {
    originacion,
    bruto,
    monthlyPaymentAmort: pmt || 0,
    avgServiceFee,
    monthlyPaymentTotal: (pmt || 0) + avgServiceFee,
    totalInterest,
    totalServiceFee,
    costoTotalCredito,
    totalAPagar,
    minApplied,
  };
}
