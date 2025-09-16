import React, { useState, useEffect } from 'react';
import './InteractiveForm.css'; // Reutilizamos estilos para consistencia
import '../BorrowerDashboard.css'; // Usamos estilos del dashboard para la tabla

const SavingsCalculator = ({ solicitud, oportunidad }) => {
  // Estados para los valores de los inputs, inicializados desde la solicitud
  const [montoDeuda, setMontoDeuda] = useState('');
  const [tasaActual, setTasaActual] = useState('');
  const [plazo, setPlazo] = useState(36);
  const [costoMantenimientoBanco, setCostoMantenimientoBanco] = useState('150'); // Valor por defecto basado en tu experiencia

  const [resultados, setResultados] = useState(null);

  // Usamos la tasa de la oportunidad para Tu Préstamo
  const TU_PRESTAMO_TASA_ANUAL = oportunidad.tasa_interes_prestatario / 100; 
  const TU_PRESTAMO_COMISION_ADMIN_PORCENTAJE = oportunidad.comision_administracion_porcentaje / 100; // 0.1% -> 0.001
  const TU_PRESTAMO_SEGURO_DESGRAVAMEN_PORCENTAJE = oportunidad.seguro_desgravamen_porcentaje / 100; // 0.05% -> 0.0005
  const TU_PRESTAMO_MANTENIMIENTO_MENSUAL_MINIMO = 10; // Mínimo de 10 Bs

  // Función para calcular la cuota mensual (PMT) - solo capital e interés
  const calcularPagoMensual = (monto, tasaAnual, plazoMeses) => {
    if (monto <= 0 || plazoMeses <= 0) return 0;
    if (tasaAnual <= 0) return monto / plazoMeses; // Si no hay interés, es un pago simple
    const tasaMensual = tasaAnual / 12;
    const factor = Math.pow(1 + tasaMensual, plazoMeses);
    const pago = monto * (tasaMensual * factor) / (factor - 1);
    return pago;
  };

  // Nueva función para generar el plan de amortización completo
  const generateAmortizationSchedule = (principal, annualRate, months, adminFeeRate, desgravamenRate, adminFeeMin) => {
    const schedule = [];
    let outstandingBalance = principal;
    const monthlyRate = annualRate / 12;
    const pmt = calcularPagoMensual(principal, annualRate, months);

    let totalAdminFees = 0;
    let totalDesgravamenFees = 0;

    for (let i = 0; i < months; i++) {
      const interestPayment = outstandingBalance * monthlyRate;
      const principalPayment = pmt - interestPayment;

      const adminFee = Math.max(outstandingBalance * adminFeeRate, adminFeeMin);
      const desgravamenFee = outstandingBalance * desgravamenRate;

      outstandingBalance -= principalPayment;
      if (outstandingBalance < 0) outstandingBalance = 0; // Evitar saldos negativos por redondeo

      totalAdminFees += adminFee;
      totalDesgravamenFees += desgravamenFee;

      schedule.push({
        month: i + 1,
        outstandingBalance: outstandingBalance,
        principalPayment: principalPayment,
        interestPayment: interestPayment,
        adminFee: adminFee,
        desgravamenFee: desgravamenFee,
        totalMonthlyPayment: pmt + adminFee + desgravamenFee,
      });
    }
    return { schedule, totalAdminFees, totalDesgravamenFees };
  };

  // Efecto para auto-rellenar el formulario cuando la solicitud se carga
  useEffect(() => {
    if (solicitud) {
      setMontoDeuda(solicitud.monto_solicitado || '');
      setTasaActual(solicitud.tasa_interes_tc || '');
      setPlazo(solicitud.plazo_meses || 36);
    }
  }, [solicitud]);

  const handleCalcular = (e) => {
    if (e) e.preventDefault(); // Permitir llamar la función sin un evento

    const deuda = parseFloat(montoDeuda);
    const tasaBanco = parseFloat(tasaActual) / 100;
    const mantenimientoBanco = parseFloat(costoMantenimientoBanco);

    if (isNaN(deuda) || isNaN(tasaBanco) || isNaN(mantenimientoBanco) || deuda <= 0) {
      alert('Por favor, introduce valores numéricos válidos.');
      return;
    }

    // Cálculos para "Con tu Banco"
    const pagoAmortizacionBanco = calcularPagoMensual(deuda, tasaBanco, plazo);
    const pagoTotalMensualBanco = pagoAmortizacionBanco + mantenimientoBanco;

    // Cálculos para "Con Tu Préstamo" usando el plan de amortización
    const { totalAdminFees, totalDesgravamenFees } = generateAmortizationSchedule(
      deuda,
      TU_PRESTAMO_TASA_ANUAL,
      plazo,
      TU_PRESTAMO_COMISION_ADMIN_PORCENTAJE,
      TU_PRESTAMO_SEGURO_DESGRAVAMEN_PORCENTAJE,
      TU_PRESTAMO_MANTENIMIENTO_MENSUAL_MINIMO
    );

    const pagoAmortizacionTP = calcularPagoMensual(deuda, TU_PRESTAMO_TASA_ANUAL, plazo);
    const pagoTotalMensualTP = (pagoAmortizacionTP * plazo + totalAdminFees + totalDesgravamenFees) / plazo; // Promedio mensual

    const ahorroMensual = pagoTotalMensualBanco - pagoTotalMensualTP;
    const ahorroTotal = ahorroMensual * plazo;

    setResultados({
      tasaBanco: (tasaBanco * 100).toFixed(1),
      pagoTotalMensualBanco: pagoTotalMensualBanco.toFixed(2),
      mantenimientoBanco: mantenimientoBanco.toFixed(2),
      tasaTP: (TU_PRESTAMO_TASA_ANUAL * 100).toFixed(1),
      pagoTotalMensualTP: pagoTotalMensualTP.toFixed(2),
          setResultados({
      tasaBanco: (tasaBanco * 100).toFixed(1),
      pagoTotalMensualBanco: pagoTotalMensualBanco.toFixed(2),
      mantenimientoBanco: mantenimientoBanco.toFixed(2),
      tasaTP: (TU_PRESTAMO_TASA_ANUAL * 100).toFixed(1),
      pagoTotalMensualTP: pagoTotalMensualTP.toFixed(2),
      mantenimientoTP: ((totalAdminFees + totalDesgravamenFees) / plazo).toFixed(2), // Promedio mensual de comisiones
      ahorroTotal: ahorroTotal.toFixed(2),
      costoOriginacion: costoOriginacion.toFixed(2),
    });
  };

  // Efecto para calcular automáticamente cuando los datos de la solicitud están listos
  useEffect(() => {
    if (montoDeuda && tasaActual && plazo) {
      handleCalcular();
    }
  }, [montoDeuda, tasaActual, plazo, oportunidad]); // Se recalcula si el usuario cambia los valores o la oportunidad cambia

  return (
    <div className="card savings-calculator">
      <h2>Calcula tu Ahorro y ¡Decídete!</h2>
      <p style={{textAlign: 'center', marginTop: '-10px', marginBottom: '20px'}}>Los datos de tu solicitud han sido pre-cargados, pero puedes modificarlos para simular otros escenarios.</p>
      
      <form onSubmit={handleCalcular} className="calculator-form">
        <div className="input-wrapper">
          <label htmlFor="montoDeuda">Monto de la deuda (Bs)</label>
          <input type="number" id="montoDeuda" value={montoDeuda} onChange={(e) => setMontoDeuda(e.target.value)} required />
        </div>
        <div className="input-wrapper">
          <label htmlFor="tasaActual">Tasa de tu Banco (%)</label>
          <input type="number" id="tasaActual" value={tasaActual} onChange={(e) => setTasaActual(e.target.value)} required />
        </div>
        <div className="input-wrapper">
          <label htmlFor="costoMantenimientoBanco">Mantenimiento Mensual (Bs)</label>
          <input type="number" id="costoMantenimientoBanco" value={costoMantenimientoBanco} onChange={(e) => setCostoMantenimientoBanco(e.target.value)} required />
        </div>
        <div className="input-wrapper">
          <label htmlFor="plazo">Plazo (meses)</label>
          <select id="plazo" value={plazo} onChange={(e) => setPlazo(parseInt(e.target.value, 10))}>
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={36}>36</option>
            <option value={48}>48</option>
          </select>
        </div>
        <button type="submit" className="btn-submit">Recalcular</button>
      </form>

      {resultados && (
        <div className="results-container">
          <h3 className="results-title">Propuesta de Ahorro</h3>
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
                <td>Tasa de Interés Anual</td>
                <td>{resultados.tasaBanco}%</td>
                <td className="tu-prestamo-data">{resultados.tasaTP}%</td>
              </tr>
              <tr>
                <td>Costo Admin. y Seguro Mensual</td>
                <td>Bs. {resultados.mantenimientoBanco}</td>
                <td className="tu-prestamo-data">Bs. {resultados.mantenimientoTP}</td>
              </tr>
              <tr className="total-row">
                <td><strong>Pago Mensual Total</strong></td>
                <td><strong>Bs. {resultados.pagoTotalMensualBanco}</strong></td>
                <td className="tu-prestamo-data"><strong>Bs. {resultados.pagoTotalMensualTP}</strong></td>
              </tr>
            </tbody>
          </table>
          <div className="total-savings">
            <p className="total-savings-label">Ahorrarías un total de:</p>
            <p className="total-savings-value">Bs. {resultados.ahorroTotal}</p>
            <p className="total-savings-sublabel">durante los {plazo} meses del crédito</p>
          </div>
          <div className="one-time-costs">
            <h4>Costos Únicos al Desembolso</h4>
            <p><strong>Comisión por Originación:</strong> Bs. {resultados.costoOriginacion}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsCalculator;

      ahorroTotal: ahorroTotal.toFixed(2),
    });
  };

  // Efecto para calcular automáticamente cuando los datos de la solicitud están listos
  useEffect(() => {
    if (montoDeuda && tasaActual && plazo) {
      handleCalcular();
    }
  }, [montoDeuda, tasaActual, plazo, oportunidad]); // Se recalcula si el usuario cambia los valores o la oportunidad cambia

  return (
    <div className="card savings-calculator">
      <h2>Calcula tu Ahorro y ¡Decídete!</h2>
      <p style={{textAlign: 'center', marginTop: '-10px', marginBottom: '20px'}}>Los datos de tu solicitud han sido pre-cargados, pero puedes modificarlos para simular otros escenarios.</p>
      
      <form onSubmit={handleCalcular} className="calculator-form">
        <div className="input-wrapper">
          <label htmlFor="montoDeuda">Monto de la deuda (Bs)</label>
          <input type="number" id="montoDeuda" value={montoDeuda} onChange={(e) => setMontoDeuda(e.target.value)} required />
        </div>
        <div className="input-wrapper">
          <label htmlFor="tasaActual">Tasa de tu Banco (%)</label>
          <input type="number" id="tasaActual" value={tasaActual} onChange={(e) => setTasaActual(e.target.value)} required />
        </div>
        <div className="input-wrapper">
          <label htmlFor="costoMantenimientoBanco">Mantenimiento Mensual (Bs)</label>
          <input type="number" id="costoMantenimientoBanco" value={costoMantenimientoBanco} onChange={(e) => setCostoMantenimientoBanco(e.target.value)} required />
        </div>
        <div className="input-wrapper">
          <label htmlFor="plazo">Plazo (meses)</label>
          <select id="plazo" value={plazo} onChange={(e) => setPlazo(parseInt(e.target.value, 10))}>
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={36}>36</option>
            <option value={48}>48</option>
          </select>
        </div>
        <button type="submit" className="btn-submit">Recalcular</button>
      </form>

      {resultados && (
        <div className="results-container">
          <h3 className="results-title">Propuesta de Ahorro</h3>
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
                <td>Tasa de Interés Anual</td>
                <td>{resultados.tasaBanco}%</td>
                <td className="tu-prestamo-data">{resultados.tasaTP}%</td>
              </tr>
              <tr>
                <td>Costo Mantenimiento Mensual</td>
                <td>Bs. {resultados.mantenimientoBanco}</td>
                <td className="tu-prestamo-data">Bs. {resultados.mantenimientoTP}</td>
              </tr>
              <tr className="total-row">
                <td><strong>Pago Mensual Total</strong></td>
                <td><strong>Bs. {resultados.pagoTotalMensualBanco}</strong></td>
                <td className="tu-prestamo-data"><strong>Bs. {resultados.pagoTotalMensualTP}</strong></td>
              </tr>
            </tbody>
          </table>
          <div className="total-savings">
            <p className="total-savings-label">Ahorrarías un total de:</p>
            <p className="total-savings-value">Bs. {resultados.ahorroTotal}</p>
            <p className="total-savings-sublabel">durante los {plazo} meses del crédito</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsCalculator;