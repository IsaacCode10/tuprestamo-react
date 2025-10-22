import React, { useState, useEffect } from 'react';
import './InteractiveForm.css'; // Reutilizamos estilos para consistencia
import '../BorrowerDashboard.css'; // Usamos estilos del dashboard para la tabla

const SavingsCalculator = ({ oportunidad, simulation, onSimulationChange }) => {
  // Los valores ahora vienen del prop `simulation`
  const { montoDeuda, tasaActual, plazo, costoMantenimientoBanco } = simulation;
  
  const [resultados, setResultados] = useState(null);

  // Opciones de plazo dinámicas
  const standardPlazos = [12, 18, 24];
  const [availablePlazos, setAvailablePlazos] = useState(standardPlazos);

  if (!oportunidad) {
    return <div>Cargando datos de la oportunidad...</div>;
  }

  const TU_PRESTAMO_TASA_ANUAL = oportunidad.tasa_interes_prestatario / 100;

  // Efecto para asegurar que el plazo actual siempre sea una opción visible
  useEffect(() => {
      if (!standardPlazos.includes(plazo)) {
        const newPlazos = [...standardPlazos, plazo].sort((a, b) => a - b);
        setAvailablePlazos(newPlazos);
      }
  }, [plazo]);

  const handleCalcular = () => {
    const deuda = parseFloat(montoDeuda);
    const tasaBanco = parseFloat(tasaActual) / 100;
    const mantenimientoMensualBanco = parseFloat(costoMantenimientoBanco);
    if (isNaN(deuda) || isNaN(tasaBanco) || isNaN(mantenimientoMensualBanco) || deuda <= 0) {
      setResultados(null); // Limpiar resultados si los datos son inválidos
      return;
    }

    // --- CÁLCULO BANCO TRADICIONAL ---
    const calcularPagoMensualBanco = (monto, tasaAnual, plazoMeses) => {
        if (monto <= 0 || plazoMeses <= 0) return 0;
        if (tasaAnual <= 0) return monto / plazoMeses;
        const tasaMensual = tasaAnual / 12;
        const factor = Math.pow(1 + tasaMensual, plazoMeses);
        return monto * (tasaMensual * factor) / (factor - 1);
    };
    const pagoAmortizacionBanco = calcularPagoMensualBanco(deuda, tasaBanco, plazo);
    const interesTotalBanco = (pagoAmortizacionBanco * plazo) - deuda;
    const mantenimientoTotalBanco = mantenimientoMensualBanco * plazo;
    const costoTotalDelCreditoBanco = interesTotalBanco + mantenimientoTotalBanco;
    const totalAPagarBanco = deuda + costoTotalDelCreditoBanco;
    const pagoTotalMensualBanco = pagoAmortizacionBanco + mantenimientoMensualBanco;

    // --- CÁLCULO TU PRÉSTAMO (V3.1 - con lógica de backend espejada) ---
    const calcularCostoTotalCreditoV3_1 = (principal, annualRate, termMonths, originacion_porcentaje) => {
        // FIX: Add guard clause to prevent NaN calculations if data is missing
        if (!principal || !annualRate || !termMonths || !originacion_porcentaje) {
            return {
                interesTotal: 0,
                comisionServicioTotal: 0,
                costoOriginacion: 0,
                costoTotalCredito: 0,
                totalAPagar: 0,
            };
        }
        const monthlyRate = annualRate / 12;
        const serviceFeeRate = 0.0015; // 0.15%
        const minServiceFee = 10; // 10 Bs minimum
        let balance = principal;
        let totalInterest = 0;
        let totalServiceFee = 0;

        const pmt = (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));

        if (!isFinite(pmt)) {
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
                const principalPayment = pmt - interestPayment;
                totalInterest += interestPayment;
                totalServiceFee += serviceFee;
                balance -= principalPayment;
            }
        }
        
        const comision_originacion = principal * (originacion_porcentaje / 100);
        const costo_total_credito = totalInterest + totalServiceFee + comision_originacion;
        const total_a_pagar = principal + costo_total_credito;

        return {
            interesTotal: totalInterest,
            comisionServicioTotal: totalServiceFee,
            costoOriginacion: comision_originacion,
            costoTotalCredito: costo_total_credito,
            totalAPagar: total_a_pagar,
        };
    };

    const {
        costoTotalCredito: costoTotalDelCreditoTP,
        totalAPagar: totalAPagarTP,
        comisionServicioTotal: comisionServicioTotalTP,
        costoOriginacion,
    } = calcularCostoTotalCreditoV3_1(deuda, TU_PRESTAMO_TASA_ANUAL, plazo, oportunidad.comision_originacion_porcentaje);

    const ahorroTotal = costoTotalDelCreditoBanco - costoTotalDelCreditoTP;
    const pagoTotalMensualTP = totalAPagarTP / plazo;
    const mantenimientoTP = comisionServicioTotalTP / plazo;

    setResultados({
      tasaBanco: (tasaBanco * 100).toFixed(1),
      pagoTotalMensualBanco: pagoTotalMensualBanco.toFixed(2),
      mantenimientoBanco: mantenimientoMensualBanco.toFixed(2),
      tasaTP: (TU_PRESTAMO_TASA_ANUAL * 100).toFixed(1),
      pagoTotalMensualTP: pagoTotalMensualTP.toFixed(2),
      mantenimientoTP: mantenimientoTP.toFixed(2),
      ahorroTotal: ahorroTotal.toFixed(2),
      costoOriginacion: costoOriginacion.toFixed(2),
      costoTotalCreditoBanco: costoTotalDelCreditoBanco.toFixed(2),
      costoTotalCreditoTP: costoTotalDelCreditoTP.toFixed(2),
      totalAPagarBanco: totalAPagarBanco.toFixed(2),
      totalAPagarTP: totalAPagarTP.toFixed(2),
    });
  };

  // Recalcular cada vez que los datos de la simulación cambian
  useEffect(() => {
    handleCalcular();
  }, [simulation, oportunidad]); // Depende del objeto de simulación completo

  return (
    <div className="card savings-calculator">
      <h2>Calcula tu Ahorro y ¡Decídete!</h2>
      <p style={{textAlign: 'center', marginTop: '-10px', marginBottom: '20px'}}>Los datos de tu solicitud han sido pre-cargados, pero puedes modificarlos para simular otros escenarios.</p>
      {/* El formulario ya no necesita un manejador de envío */}
      <form className="calculator-form">
        {/* Los inputs ahora llaman a onSimulationChange para actualizar el estado del padre */}
        <div className="input-wrapper"><label htmlFor="montoDeuda">Monto de la deuda (Bs)</label><input type="number" id="montoDeuda" value={montoDeuda} onChange={(e) => onSimulationChange({ montoDeuda: e.target.value })} required /></div>
        <div className="input-wrapper"><label htmlFor="tasaActual">Tasa de tu Banco (%)</label><input type="number" id="tasaActual" value={tasaActual} onChange={(e) => onSimulationChange({ tasaActual: e.target.value })} required /></div>
        <div className="input-wrapper"><label htmlFor="costoMantenimientoBanco">Mantenimiento y Seguros de tu Banco (Bs/mes)</label><input type="number" id="costoMantenimientoBanco" value={costoMantenimientoBanco} onChange={(e) => onSimulationChange({ costoMantenimientoBanco: e.target.value })} required /></div>
        <div className="input-wrapper">
          <label htmlFor="plazo">Plazo (meses)</label>
          <select id="plazo" value={plazo} onChange={(e) => onSimulationChange({ plazo: parseInt(e.target.value, 10) })}>
            {availablePlazos.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        {/* El botón de Recalcular ha sido eliminado */}
      </form>

      {resultados && (
        <div className="results-container">
          <h3 className="results-title">Propuesta de Ahorro</h3>
          <table className="comparison-table">
            <thead><tr><th>Concepto</th><th>Con tu Banco</th><th className="tu-prestamo-header">Con Tu Préstamo</th></tr></thead>
            <tbody>
              <tr><td>Tasa de Interés Anual</td><td>{resultados.tasaBanco}%</td><td className="tu-prestamo-data">{resultados.tasaTP}%</td></tr>
              <tr><td>Costo Admin. y Seguro Mensual</td><td>Bs. {resultados.mantenimientoBanco}</td><td className="tu-prestamo-data">Bs. {resultados.mantenimientoTP}</td></tr>
              <tr className="total-row"><td><strong>Pago Mensual Total</strong></td><td><strong>Bs. {resultados.pagoTotalMensualBanco}</strong></td><td className="tu-prestamo-data"><strong>Bs. {resultados.pagoTotalMensualTP}</strong></td></tr>
            </tbody>
          </table>

          <div className="total-savings">
            <p className="total-savings-label">Ahorrarías un total de:</p>
            <p className="total-savings-value">Bs. {resultados.ahorroTotal > 0 ? resultados.ahorroTotal : '0.00'}</p>
            <p className="total-savings-sublabel">en costos financieros durante los {plazo} meses del crédito</p>
          </div>

          <div className="one-time-costs">
            <h4>Costos Únicos al Desembolso</h4>
            <p><strong>Comisión por Originación:</strong> Bs. {resultados.costoOriginacion}</p>
          </div>

          <div className="transparency-details">
            <h4 className="transparency-title">Transparencia Total</h4>
            <p className="transparency-subtitle">Desglose final del crédito a {plazo} meses</p>
            <table className="comparison-table">
              <thead><tr><th>Concepto</th><th>Con tu Banco</th><th className="tu-prestamo-header">Con Tu Préstamo</th></tr></thead>
              <tbody>
                <tr><td>Costo del Crédito (Intereses + Comisiones)</td><td>Bs. {resultados.costoTotalCreditoBanco}</td><td className="tu-prestamo-data">Bs. {resultados.costoTotalCreditoTP}</td></tr>
                <tr className="total-row"><td><strong>Total a Pagar (Capital + Costos)</strong></td><td><strong>Bs. {resultados.totalAPagarBanco}</strong></td><td className="tu-prestamo-data"><strong>Bs. {resultados.totalAPagarTP}</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsCalculator;