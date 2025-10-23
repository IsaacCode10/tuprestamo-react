import React, { useState, useEffect } from 'react';
import useAnalytics from '@/hooks/useAnalytics'; // Importamos el hook de analítica
import './PublicSavingsCalculator.css';

// --- MOTOR DE CÁLCULO REALISTA (REPLICA DEL BACKEND) ---
const calculateTuPrestamoCosts = (principal, annualRate, termMonths, originacion_porcentaje) => {
  if (principal <= 0 || termMonths <= 0) return { pagoMensual: 0, ahorroTotal: 0 };

  const monthlyRate = annualRate / 12;
  const serviceFeeRate = 0.0015; // 0.15%
  const minServiceFee = 10; // 10 Bs minimum

  let balance = principal;
  let totalInterest = 0;
  let totalServiceFee = 0;

  // Usamos la fórmula de PMT para una cuota fija teórica (solo para el bucle)
  const pmt = (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));

  if (!isFinite(pmt) || annualRate <= 0) {
    const principalPayment = principal / termMonths;
    for (let i = 0; i < termMonths; i++) {
      const serviceFee = Math.max(balance * serviceFeeRate, minServiceFee);
      totalServiceFee += serviceFee;
      balance -= principalPayment;
    }
  } else {
    for (let i = 0; i < termMonths; i++) {
      const interestPayment = balance * monthlyRate;
      const serviceFee = Math.max(balance * serviceFeeRate, minServiceFee);
      // La cuota real varía ligeramente, pero para el cálculo total usamos la lógica de amortización
      const principalPayment = pmt - interestPayment;
      totalInterest += interestPayment;
      totalServiceFee += serviceFee;
      balance -= principalPayment;
    }
  }

  const comision_originacion = principal * (originacion_porcentaje / 100);
  const costo_total_credito = totalInterest + totalServiceFee + comision_originacion;
  const total_a_pagar = principal + costo_total_credito;
  const pagoMensualPromedio = total_a_pagar / termMonths;

  return {
    pagoMensual: pagoMensualPromedio,
    costoTotal: costo_total_credito,
    totalAPagar: total_a_pagar
  };
};

const PublicSavingsCalculator = ({ onApplyClick }) => {
  // --- ESTADO ---
  const [debtAmount, setDebtAmount] = useState('10000');
  const [interestRate, setInterestRate] = useState('24');
  const [bankMonthlyFee, setBankMonthlyFee] = useState('100');
  const [term, setTerm] = useState(24); // Default a 24 meses
  const [results, setResults] = useState(null);
  const analytics = useAnalytics(); // Inicializamos el hook

  // Función centralizada para manejar cambios y enviar eventos
  const handleInputChange = (inputName, value) => {
    analytics.capture('interacted_with_calculator', {
      input_changed: inputName,
    });

    switch (inputName) {
      case 'debtAmount':
        setDebtAmount(value);
        break;
      case 'interestRate':
        setInterestRate(value);
        break;
      case 'bankMonthlyFee':
        setBankMonthlyFee(value);
        break;
      case 'term':
        setTerm(value);
        break;
      default:
        break;
    }
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

    // --- Cálculo del Banco (sin cambios) ---
    const calculateBankMonthlyPayment = (p, r, t) => {
        if (p <= 0 || t <= 0) return 0;
        if (r <= 0) return p / t;
        const monthlyRate = r / 12;
        const factor = Math.pow(1 + monthlyRate, t);
        return p * (monthlyRate * factor) / (factor - 1);
    };
    const bankInterestPayment = calculateBankMonthlyPayment(principal, bankAnnualRate, term);
    const bankTotalPayment = bankInterestPayment + monthlyFee;

    // --- Cálculo de Tu Préstamo (LÓGICA NUEVA Y REALISTA) ---
    const tuPrestamoProfiles = {
      mejorTasa: { rate: 0.15, originacion: 3.0 }, // Perfil A
      tasaPromedio: { rate: 0.17, originacion: 4.0 }, // Perfil B
    };

    const tpResultsA = calculateTuPrestamoCosts(principal, tuPrestamoProfiles.mejorTasa.rate, term, tuPrestamoProfiles.mejorTasa.originacion);
    const tpResultsB = calculateTuPrestamoCosts(principal, tuPrestamoProfiles.tasaPromedio.rate, term, tuPrestamoProfiles.tasaPromedio.originacion);
    
    // --- Cálculo del Ahorro (basado en cuotas promedio) ---
    const totalSaving = (bankTotalPayment - tpResultsA.pagoMensual) * term;

    setResults({
      bankPayment: bankTotalPayment,
      tpPaymentA: tpResultsA.pagoMensual,
      tpPaymentB: tpResultsB.pagoMensual,
      totalSaving: totalSaving,
      bankAnnualRate: bankAnnualRate,
      term: term,
    });
  }, [debtAmount, interestRate, bankMonthlyFee, term]);

  // --- Evento de Analítica: Resultado de cálculo ---
  useEffect(() => {
    if (results) {
      analytics.capture('calculated_loan_result', {
        result_amount: results.totalSaving,
        result_term: results.term,
        monthly_payment: results.tpPaymentA,
      });
    }
  }, [results, analytics]);

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
              onChange={(e) => handleInputChange('debtAmount', e.target.value)} 
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
              onChange={(e) => handleInputChange('interestRate', e.target.value)} 
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
              onChange={(e) => handleInputChange('bankMonthlyFee', e.target.value)} 
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
                  onClick={() => handleInputChange('term', t)}
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
              <p className="no-maintenance-fee">¡Comisiones transparentes incluidas!</p>
            </div>

            <div className="apply-button-container">
              <button className="apply-now-button" onClick={onApplyClick}>¡Quiero este Ahorro!</button>
            </div>
            <p className="results-disclaimer">*El ahorro y la tasa final dependen de la evaluación de tu perfil de crédito.</p>
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