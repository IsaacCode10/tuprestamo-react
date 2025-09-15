import React, { useState } from 'react';
import './InteractiveForm.css'; // Reutilizamos estilos para consistencia

const SavingsCalculator = () => {
  const [montoDeuda, setMontoDeuda] = useState('');
  const [tasaActual, setTasaActual] = useState('');
  const [plazo, setPlazo] = useState(36);
  const [resultados, setResultados] = useState(null);

  const TU_PRESTAMO_TASA_ANUAL = 0.17; // 17% como acordamos

  const calcularPagoMensual = (monto, tasaAnual, plazoMeses) => {
    if (monto <= 0 || tasaAnual <= 0 || plazoMeses <= 0) return 0;
    const tasaMensual = tasaAnual / 12;
    const factor = Math.pow(1 + tasaMensual, plazoMeses);
    const pago = monto * (tasaMensual * factor) / (factor - 1);
    return pago;
  };

  const handleCalcular = (e) => {
    e.preventDefault();
    const deuda = parseFloat(montoDeuda);
    const tasaBanco = parseFloat(tasaActual) / 100;

    if (isNaN(deuda) || isNaN(tasaBanco) || deuda <= 0 || tasaBanco <= 0) {
      alert('Por favor, introduce valores válidos para el monto y la tasa.');
      return;
    }

    const pagoMensualBanco = calcularPagoMensual(deuda, tasaBanco, plazo);
    const pagoMensualTP = calcularPagoMensual(deuda, TU_PRESTAMO_TASA_ANUAL, plazo);

    const totalPagadoBanco = pagoMensualBanco * plazo;
    const totalPagadoTP = pagoMensualTP * plazo;
    const ahorroTotal = totalPagadoBanco - totalPagadoTP;

    setResultados({
      pagoMensualBanco,
      pagoMensualTP,
      ahorroTotal,
    });
  };

  return (
    <div className="interactive-form-container savings-calculator">
      <h2 className="form-title">Calcula tu Ahorro y ¡Decídete!</h2>
      <p className="form-subtitle">Compara lo que pagas hoy con lo que pagarías con nosotros.</p>
      
      <form onSubmit={handleCalcular} className="form-step">
        <div className="input-wrapper">
          <label htmlFor="montoDeuda">¿Cuánto debes en tu tarjeta? (Bs)</label>
          <input 
            type="number"
            id="montoDeuda"
            value={montoDeuda}
            onChange={(e) => setMontoDeuda(e.target.value)}
            placeholder="Ej: 10000"
            required
          />
        </div>

        <div className="input-wrapper">
          <label htmlFor="tasaActual">¿Qué tasa de interés anual te cobra tu banco? (%)</label>
          <input 
            type="number"
            id="tasaActual"
            value={tasaActual}
            onChange={(e) => setTasaActual(e.target.value)}
            placeholder="Ej: 24"
            required
          />
        </div>

        <div className="input-wrapper">
          <label htmlFor="plazo">¿En qué plazo te gustaría pagarlo?</label>
          <select id="plazo" value={plazo} onChange={(e) => setPlazo(parseInt(e.target.value, 10))}>
            <option value={12}>12 meses</option>
            <option value={24}>24 meses</option>
            <option value={36}>36 meses</option>
            <option value={48}>48 meses</option>
          </select>
        </div>

        <button type="submit" className="btn-submit">Calcular Ahorro</button>
      </form>

      {resultados && (
        <div className="results-container">
          <h3 className="results-title">¡Mira lo que te ahorrarías!</h3>
          <div className="results-comparison">
            <div className="result-card bank">
              <h4>Con tu Banco</h4>
              <p className="result-value">Bs. {resultados.pagoMensualBanco.toFixed(2)}</p>
              <p className="result-label">Pago Mensual</p>
            </div>
            <div className="result-card tu-prestamo">
              <h4>Con Tu Préstamo</h4>
              <p className="result-value">Bs. {resultados.pagoMensualTP.toFixed(2)}</p>
              <p className="result-label">Pago Mensual</p>
            </div>
          </div>
          <div className="total-savings">
            <p className="total-savings-label">Ahorro Total Estimado en {plazo} meses:</p>
            <p className="total-savings-value">Bs. {resultados.ahorroTotal.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsCalculator;
