import React, { useState, useEffect } from 'react';
import './PublicSavingsCalculator.css';

const PublicSavingsCalculator = ({ onApplyClick }) => {
  // --- ESTADO ---
  const [debtAmount, setDebtAmount] = useState('10000');
  const [interestRate, setInterestRate] = useState('24');
  const [bankMonthlyFee, setBankMonthlyFee] = useState('100');
  const [term, setTerm] = useState(12);
  const [results, setResults] = useState(null);

  // --- LÓGICA DE CÁLCULO ---
  const calculateMonthlyPayment = (principal, annualRate, termMonths) => {
    if (principal <= 0 || termMonths <= 0) return 0;
    if (annualRate <= 0) return principal / termMonths;
    const monthlyRate = annualRate / 12;
    const factor = Math.pow(1 + monthlyRate, termMonths);
    return principal * (monthlyRate * factor) / (factor - 1);
  };

  // useEffect para calcular automáticamente
  useEffect(() => {
    const principal = parseFloat(debtAmount);
    const bankAnnualRate = parseFloat(interestRate) / 100;
    const monthlyFee = parseFloat(bankMonthlyFee);

    if (isNaN(principal) || isNaN(bankAnnualRate) || isNaN(monthlyFee) || principal <= 0) {
      setResults(null);
      return;
    }

    // Cálculo del banco
    const bankInterestPayment = calculateMonthlyPayment(principal, bankAnnualRate, term);
    const bankTotalPayment = bankInterestPayment + monthlyFee;

    // Cálculo de Tu Préstamo
    const tuPrestamoRates = {
      nivelA: 0.15, // 15%
      nivelB: 0.17, // 17%
    };

    const tpPaymentA = calculateMonthlyPayment(principal, tuPrestamoRates.nivelA, term);
    const tpPaymentB = calculateMonthlyPayment(principal, tuPrestamoRates.nivelB, term);
    
    // Cálculo del ahorro
    const totalSaving = (bankTotalPayment - tpPaymentA) * term;

    setResults({
      bankPayment: bankTotalPayment,
      tpPaymentA: tpPaymentA,
      tpPaymentB: tpPaymentB,
      totalSaving: totalSaving,
      bankAnnualRate: bankAnnualRate,
      term: term,
    });
  }, [debtAmount, interestRate, bankMonthlyFee, term]);

  // --- RENDERIZADO ---
  return (
    <div className="calculator-layout">
      
      {/* --- COLUMNA DE INPUTS --- */}
      <div className="calculator-column inputs-column">
        <h3>Simula tu Ahorro</h3>
        <div className="calculator-inputs">
          <div className="input-group">
            <label htmlFor="debtAmount">Monto de tu deuda (Bs.)</label>
            <input 
              type="range" 
              id="debtAmount" 
              min="5000" 
              max="70000" 
              step="1000"
              value={debtAmount} 
              onChange={(e) => setDebtAmount(e.target.value)} 
            />
            <span className="slider-value">Bs. {Number(debtAmount).toLocaleString('es-BO')}</span>
          </div>

          <div className="input-group">
            <label htmlFor="interestRate">Tasa de interés de tu banco (% Anual)</label>
            <input 
              type="range" 
              id="interestRate" 
              min="18" 
              max="50" 
              step="1"
              value={interestRate} 
              onChange={(e) => setInterestRate(e.target.value)} 
            />
            <span className="slider-value">{interestRate}%</span>
          </div>

          <div className="input-group">
            <label htmlFor="bankMonthlyFee">Mantenimiento y Seguros (Bs./mes)</label>
            <input 
              type="range" 
              id="bankMonthlyFee" 
              min="0" 
              max="200" 
              step="10"
              value={bankMonthlyFee} 
              onChange={(e) => setBankMonthlyFee(e.target.value)} 
            />
            <span className="slider-value">Bs. {Number(bankMonthlyFee).toLocaleString('es-BO')}</span>
          </div>

          <div className="input-group">
            <label>¿A qué plazo quieres pagarlo?</label>
            <div className="term-buttons">
              {[12, 18, 24].map(t => (
                <button 
                  key={t} 
                  className={`term-button ${term === t ? 'selected' : ''}`}
                  onClick={() => setTerm(t)}
                  type="button"
                >
                  {t} meses
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- COLUMNA DE RESULTADOS --- */}
      <div className="calculator-column results-column">
        <h3>Compara y Ahorra</h3>
        {results ? (
          <>
            <div className="comparison-grid">
              <div className="comparison-column-item">
                <h4 className="column-title bank-title">Con tu Banco</h4>
                <p className="column-rate">{(results.bankAnnualRate * 100).toFixed(0)}% + Cargos</p>
                <p className="column-label">Pago mensual</p>
                <p className="column-payment bank-payment">Bs. {results.bankPayment.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              
              <div className="comparison-column-item">
                <h4 className="column-title">Nuestra Tasa Promedio</h4>
                <p className="column-rate">17%</p>
                <p className="column-label">Pago mensual</p>
                <p className="column-payment">Bs. {results.tpPaymentB.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>

              <div className="comparison-column-item best-deal">
                <h4 className="column-title">Nuestra Mejor Tasa</h4>
                <p className="column-rate">15%</p>
                <p className="column-label">Pago mensual</p>
                <p className="column-payment">Bs. {results.tpPaymentA.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="savings-summary">
              <p className="savings-label">¡Ahorro Total en {results.term} meses!</p>
              <p className="savings-value">Bs. {results.totalSaving > 0 ? results.totalSaving.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</p>
              <p className="no-maintenance-fee">¡Y sin costos de mantenimiento mensuales!</p>
            </div>

            <div className="apply-button-container">
              <button className="apply-now-button" onClick={onApplyClick}>¡Quiero este Ahorro!</button>
            </div>
            <p className="results-disclaimer">*Ahorro calculado con nuestra mejor tasa. No incluye costos de originación. La tasa final depende de tu perfil.</p>
          </>
        ) : (
          <div className="results-placeholder">
            <p>Ajusta los valores para ver tu ahorro potencial.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicSavingsCalculator;