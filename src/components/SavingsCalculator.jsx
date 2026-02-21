import React, { useState, useEffect } from 'react';
import './InteractiveForm.css'; // Reutilizamos estilos para consistencia
import '../BorrowerDashboard.css'; // Usamos estilos del dashboard para la tabla
import { calcTPBreakdown } from '@/utils/loan.js';

const SavingsCalculator = ({ oportunidad, simulation, onSimulationChange }) => {
  // Los valores ahora vienen del prop `simulation`
  const { montoDeuda, tasaActual, plazo, costoMantenimientoBanco } = simulation;
  
  const [resultados, setResultados] = useState(null);

  // Opciones de plazo para el MVP
  const standardPlazos = [12, 24, 36, 48];
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

    // --- CÁLCULO TU PRÉSTAMO (helper con política 450 / gross-up) ---
    const brk = calcTPBreakdown(
      deuda,
      oportunidad.tasa_interes_prestatario,
      plazo,
      oportunidad.comision_originacion_porcentaje
    );

    setResultados({
      tasaBanco: (tasaBanco * 100).toFixed(1),
      tasaTP: (TU_PRESTAMO_TASA_ANUAL * 100).toFixed(1),
      mantenimientoBanco: mantenimientoMensualBanco.toFixed(2),
      mantenimientoTP: brk.avgServiceFee.toFixed(2),
      pagoTotalMensualBanco: pagoTotalMensualBanco.toFixed(2),
      pagoTotalMensualTP: (brk.monthlyPaymentTotal).toFixed(2),
      costoTotalCreditoBanco: costoTotalDelCreditoBanco.toFixed(2),
      costoTotalCreditoTP: brk.costoTotalCredito.toFixed(2),
      totalAPagarBanco: totalAPagarBanco.toFixed(2),
      totalAPagarTP: brk.totalAPagar.toFixed(2),
      costoOriginacion: brk.originacion.toFixed(2),
      ahorroTotal: (costoTotalDelCreditoBanco - brk.costoTotalCredito).toFixed(2),
    });
  };

  // Auto-calcular al montar y cuando cambien los inputs/base
  useEffect(() => {
    handleCalcular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oportunidad?.tasa_interes_prestatario, montoDeuda, tasaActual, plazo, costoMantenimientoBanco]);

  return (
    <div className="savings-calculator">
      <h2>Calcula tu Ahorro y ¡Decídete!</h2>
      <div className="calculator-form">
        <div className="input-wrapper">
          <label htmlFor="montoDeuda">Monto de la deuda (Bs)</label>
          <input type="number" id="montoDeuda" value={montoDeuda} onChange={(e) => onSimulationChange({ montoDeuda: e.target.value })} required />
        </div>
        <div className="input-wrapper">
          <label htmlFor="tasaActual">Tasa de tu Banco (%)</label>
          <input type="number" id="tasaActual" value={tasaActual} onChange={(e) => onSimulationChange({ tasaActual: e.target.value })} required />
        </div>
        <div className="input-wrapper">
          <label htmlFor="costoMantenimientoBanco">Mantenimiento y Seguros de tu Banco (Bs/mes)</label>
          <input type="number" id="costoMantenimientoBanco" value={costoMantenimientoBanco} onChange={(e) => onSimulationChange({ costoMantenimientoBanco: e.target.value })} required />
        </div>
        <div className="input-wrapper">
          <label htmlFor="plazo">Plazo (meses)</label>
          <select id="plazo" value={plazo} onChange={(e) => onSimulationChange({ plazo: parseInt(e.target.value, 10) })}>
            {availablePlazos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {resultados && (
        <div className="results-container">
          <h3 className="results-title">Propuesta de Ahorro</h3>
          <table className="comparison-table">
            <thead><tr><th>Concepto</th><th>Con tu Banco</th><th className="tu-prestamo-header">Con Tu Préstamo</th></tr></thead>
            <tbody>
              <tr><td>Tasa de Interés Anual</td><td>{resultados.tasaBanco}%</td><td className="tu-prestamo-data">{resultados.tasaTP}%</td></tr>
              <tr><td>Costo Admin. y Seguro Mensual</td><td>Bs. {resultados.mantenimientoBanco}</td><td className="tu-prestamo-data">Bs. {resultados.mantenimientoTP}</td></tr>
              <tr className="total-row"><td><strong>Cuota Mensual Total</strong></td><td><strong>Bs. {resultados.pagoTotalMensualBanco}</strong></td><td className="tu-prestamo-data"><strong>Bs. {resultados.pagoTotalMensualTP}</strong></td></tr>
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
