// Simple amortization helpers (French system) and extra-payment recalculation

export function annuityPayment(principal, annualPct, months) {
  const P = Number(principal) || 0;
  const N = Number(months) || 0;
  const r = (Number(annualPct) || 0) / 100 / 12;
  if (N <= 0) return 0;
  if (r === 0) return P / N;
  return P * r / (1 - Math.pow(1 + r, -N));
}

export function buildSchedule(principal, annualPct, months) {
  const P = Number(principal) || 0;
  const N = Number(months) || 0;
  const r = (Number(annualPct) || 0) / 100 / 12;
  const payment = annuityPayment(P, annualPct, N);
  let balance = P;
  const rows = [];
  let totalInterest = 0;
  for (let m = 1; m <= N; m++) {
    const interest = +(balance * r).toFixed(2);
    const principalPart = +(payment - interest).toFixed(2);
    balance = +(balance - principalPart).toFixed(2);
    totalInterest += interest;
    rows.push({ month: m, payment: +payment.toFixed(2), principal: principalPart, interest, balance: Math.max(0, balance) });
  }
  return { payment: +payment.toFixed(2), rows, totalInterest: +totalInterest.toFixed(2) };
}

// Apply an extra principal payment now, keep same monthly payment, reduce term
export function applyExtraPaymentReduceTerm(principal, annualPct, months, extraAmount) {
  const extra = Number(extraAmount) || 0;
  const P0 = Math.max(0, (Number(principal) || 0) - extra);
  const r = (Number(annualPct) || 0) / 100 / 12;
  const original = buildSchedule(principal, annualPct, months);
  if (P0 <= 0) {
    return { original, newPayment: 0, newMonths: 0, newSchedule: { payment: 0, rows: [], totalInterest: 0 }, interestSaved: original.totalInterest };
  }
  const payment = original.payment; // keep same monthly
  // Recompute number of months needed with same payment
  // payment = P0 * r / (1 - (1+r)^-n) => (1 - (P0*r/payment)) = (1+r)^-n
  if (r === 0) {
    const n = Math.ceil(P0 / payment);
    const sch = buildSchedule(P0, annualPct, n);
    return finish(original, sch);
  }
  const ratio = 1 - (P0 * r / payment);
  const n = Math.max(1, Math.ceil(-Math.log(ratio) / Math.log(1 + r)));
  const sch = buildSchedule(P0, annualPct, n);
  return finish(original, sch);
}

function finish(original, sch) {
  const interestSaved = +(original.totalInterest - sch.totalInterest).toFixed(2);
  return {
    original,
    newPayment: sch.payment,
    newMonths: sch.rows.length,
    newSchedule: sch,
    interestSaved,
  };
}

