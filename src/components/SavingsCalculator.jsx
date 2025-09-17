import React, { useState, useEffect } from 'react';
import './InteractiveForm.css'; // Reutilizamos estilos para consistencia
import '../BorrowerDashboard.css'; // Usamos estilos del dashboard para la tabla

const SavingsCalculator = ({ solicitud, oportunidad }) => {
  const [montoDeuda, setMontoDeuda] = useState('');
  const [tasaActual, setTasaActual] = useState('');
  const [plazo, setPlazo] = useState(36);
  const [costoMantenimientoBanco, setCostoMantenimientoBanco] = useState('100');
  const [resultados, setResultados] = useState(null);

  if (!oportunidad) {
    return <div>Cargando datos de la oportunidad...</div>;
  }

  const TU_PRESTAMO_TASA_ANUAL = oportunidad.tasa_interes_prestatario / 100;
  const TU_PRESTAMO_COMISION_ADMIN_PORCENTAJE = oportunidad.comision_administracion_porcentaje / 100;
  const TU_PRESTAMO_SEGURO_DESGRAVAMEN_PORCENTAJE = oportunidad.seguro_desgravamen_porcentaje / 100;
  const TU_PRESTAMO_COMISION_ORIGINACION_PORCENTAJE = oportunidad.comision_originacion_porcentaje / 100;
  const TU_PRESTAMO_MANTENIMIENTO_MENSUAL_MINIMO = 10;

  const calcularPagoMensual = (monto, tasaAnual, plazoMeses) => {
    if (monto <= 0 || plazoMeses <= 0) return 0;
    if (tasaAnual <= 0) return monto / plazoMeses;
    const tasaMensual = tasaAnual / 12;
    const factor = Math.pow(1 + tasaMensual, plazoMeses);
    const pago = monto * (tasaMensual * factor) / (factor - 1);
    return pago;
  };

  const generateAmortizationSchedule = (principal, annualRate, months, adminFeeRate, desgravamenRate, adminFeeMin) => {
    let outstandingBalance = principal;
    const monthlyRate = annualRate / 12;
    const pmt = calcularPagoMensual(principal, annualRate, months);
    let totalAdminFees = 0;
    let totalDesgravamenFees = 0;
    for (let i = 0; i < months; i++) {
      const adminFee = Math.max(outstandingBalance * adminFeeRate, adminFeeMin);
      const desgravamenFee = outstandingBalance * desgravamenRate;
      outstandingBalance -= (pmt - (outstandingBalance * monthlyRate));
      totalAdminFees += adminFee;
      totalDesgravamenFees += desgravamenFee;
    }
    return { totalAdminFees, totalDesgravamenFees };
  };

  useEffect(() => {
    if (solicitud) {
      setMontoDeuda(solicitud.monto_solicitado || '');
      setTasaActual(solicitud.tasa_interes_tc || '');
      setPlazo(solicitud.plazo_meses || 36);
    }
  }, [solicitud]);

  const handleCalcular = (e) => {
    if (e) e.preventDefault();
    const deuda = parseFloat(montoDeuda);
    const tasaBanco = parseFloat(tasaActual) / 100;
    const mantenimientoMensualBanco = parseFloat(costoMantenimientoBanco);
    if (isNaN(deuda) || isNaN(tasaBanco) || isNaN(mantenimientoMensualBanco) || deuda <= 0) {
      alert('Por favor, introduce valores numéricos válidos.');
      return;
    }

    const pagoAmortizacionBanco = calcularPagoMensual(deuda, tasaBanco, plazo);
    const interesTotalBanco = (pagoAmortizacionBanco * plazo) - deuda;
    const mantenimientoTotalBanco = mantenimientoMensualBanco * plazo;
    const costoTotalDelCreditoBanco = interesTotalBanco + mantenimientoTotalBanco;
    const totalAPagarBanco = deuda + costoTotalDelCreditoBanco;

    const pagoAmortizacionTP = calcularPagoMensual(deuda, TU_PRESTAMO_TASA_ANUAL, plazo);
    const interesTotalTP = (pagoAmortizacionTP * plazo) - deuda;
    const { totalAdminFees, totalDesgravamenFees } = generateAmortizationSchedule(deuda, TU_PRESTAMO_TASA_ANUAL, plazo, TU_PRESTAMO_COMISION_ADMIN_PORCENTAJE, TU_PRESTAMO_SEGURO_DESGRAVAMEN_PORCENTAJE, TU_PRESTAMO_MANTENIMIENTO_MENSUAL_MINIMO);
    const costoOriginacion = deuda * TU_PRESTAMO_COMISION_ORIGINACION_PORCENTAJE;
    const costoTotalDelCreditoTP = interesTotalTP + totalAdminFees + totalDesgravamenFees + costoOriginacion;
    const totalAPagarTP = deuda + costoTotalDelCreditoTP;

    const ahorroTotal = costoTotalDelCreditoBanco - costoTotalDelCreditoTP;

    const pagoTotalMensualBanco = pagoAmortizacionBanco + mantenimientoMensualBanco;
    const pagoTotalMensualTP = (pagoAmortizacionTP * plazo + totalAdminFees + totalDesgravamenFees) / plazo;

    setResultados({
      tasaBanco: (tasaBanco * 100).toFixed(1),
      pagoTotalMensualBanco: pagoTotalMensualBanco.toFixed(2),
      mantenimientoBanco: mantenimientoMensualBanco.toFixed(2),
      tasaTP: (TU_PRESTAMO_TASA_ANUAL * 100).toFixed(1),
      pagoTotalMensualTP: pagoTotalMensualTP.toFixed(2),
      mantenimientoTP: ((totalAdminFees + totalDesgravamenFees) / plazo).toFixed(2),
      ahorroTotal: ahorroTotal.toFixed(2),
      costoOriginacion: costoOriginacion.toFixed(2),
      costoTotalCreditoBanco: costoTotalDelCreditoBanco.toFixed(2),
      costoTotalCreditoTP: costoTotalDelCreditoTP.toFixed(2),
      totalAPagarBanco: totalAPagarBanco.toFixed(2),
      totalAPagarTP: totalAPagarTP.toFixed(2),
    });
  };

  useEffect(() => {
    if (montoDeuda && tasaActual && plazo && oportunidad) {
      handleCalcular();
    }
  }, [montoDeuda, tasaActual, plazo, oportunidad]);

  return (
    <div className="card savings-calculator">
      <h2>Calcula tu Ahorro y ¡Decídete!</h2>
      <p style={{textAlign: 'center', marginTop: '-10px', marginBottom: '20px'}}>Los datos de tu solicitud han sido pre-cargados, pero puedes modificarlos para simular otros escenarios.</p>
      <form onSubmit={handleCalcular} className="calculator-form">
        {/* Form inputs remain the same */}
        <div className="input-wrapper"><label htmlFor="montoDeuda">Monto de la deuda (Bs)</label><input type="number" id="montoDeuda" value={montoDeuda} onChange={(e) => setMontoDeuda(e.target.value)} required /></div>
        <div className="input-wrapper"><label htmlFor="tasaActual">Tasa de tu Banco (%)</label><input type="number" id="tasaActual" value={tasaActual} onChange={(e) => setTasaActual(e.target.value)} required /></div>
        <div className="input-wrapper"><label htmlFor="costoMantenimientoBanco">Mantenimiento y Seguros de tu Banco (Bs/mes)</label><input type="number" id="costoMantenimientoBanco" value={costoMantenimientoBanco} onChange={(e) => setCostoMantenimientoBanco(e.target.value)} required /></div>
        <div className="input-wrapper"><label htmlFor="plazo">Plazo (meses)</label><select id="plazo" value={plazo} onChange={(e) => setPlazo(parseInt(e.target.value, 10))}><option value={12}>12</option><option value={24}>24</option><option value={36}>36</option><option value={48}>48</option></select></div>
        <button type="submit" className="btn-submit">Recalcular</button>
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

          {/* Nueva Sección de Transparencia Total */}
          <div className="transparency-details">
            <h4 className="transparency-title">Transparencia Total</h4>
            <p className="transparency-subtitle">Desglose final del crédito a {plazo} meses</p>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Con tu Banco</th>
                  <th className="tu-prestamo-header">Con Tu Préstamo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Costo del Crédito (Intereses + Comisiones)</td>
                  <td>Bs. {resultados.costoTotalCreditoBanco}</td>
                  <td className="tu-prestamo-data">Bs. {resultados.costoTotalCreditoTP}</td>
                </tr>
                <tr className="total-row">
                  <td><strong>Total a Pagar (Capital + Costos)</strong></td>
                  <td><strong>Bs. {resultados.totalAPagarBanco}</strong></td>
                  <td className="tu-prestamo-data"><strong>Bs. {resultados.totalAPagarTP}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsCalculator;
