import React, { useState, useMemo } from 'react';
import { annuityPayment, applyExtraPaymentReduceTerm } from '@/utils/amortization.js';

const number = (v) => isNaN(Number(v)) ? 0 : Number(v);

const ExtraPaymentSimulator = ({ principal = 10000, annualRate = 24, months = 24 }) => {
  const [amount, setAmount] = useState('500');
  const [p, setP] = useState(String(principal));
  const [rate, setRate] = useState(String(annualRate));
  const [n, setN] = useState(String(months));

  const result = useMemo(() => {
    const P = number(p), R = number(rate), N = number(n), A = number(amount);
    return applyExtraPaymentReduceTerm(P, R, N, A);
  }, [p, rate, n, amount]);

  const monthly = useMemo(() => annuityPayment(number(p), number(rate), number(n)), [p, rate, n]);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Pago Extra a Capital (Simulador)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <label>Capital actual
          <input type="number" min="0" value={p} onChange={e => setP(e.target.value)} />
        </label>
        <label>Tasa anual (%)
          <input type="number" min="0" step="0.01" value={rate} onChange={e => setRate(e.target.value)} />
        </label>
        <label>Plazo restante (meses)
          <input type="number" min="1" value={n} onChange={e => setN(e.target.value)} />
        </label>
        <label>Monto pago extra (Bs)
          <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} />
        </label>
      </div>

      <div style={{ display:'flex', gap: 16, marginTop: 12, flexWrap:'wrap' }}>
        <div><strong>Cuota actual:</strong> Bs {monthly.toFixed(2)}</div>
        <div><strong>Nuevo plazo estimado:</strong> {result.newMonths} meses</div>
        <div><strong>Ahorro en intereses:</strong> Bs {result.interestSaved?.toFixed(2)}</div>
      </div>

      <p style={{ marginTop: 8, color: '#3a5963' }}>Regla MVP: mantenemos la misma cuota y reducimos el plazo restante. El pago extra se imputa 100% a capital.</p>
    </div>
  );
};

export default ExtraPaymentSimulator;

