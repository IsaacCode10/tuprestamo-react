import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { resetMixpanel } from './analytics';
import { Link, useNavigate } from 'react-router-dom';

import './BorrowerDashboard.css';
import SavingsCalculator from '@/components/SavingsCalculator.jsx';
import { calcTPBreakdown } from '@/utils/loan.js';
import AmortizationSchedule from '@/components/AmortizationSchedule.jsx';
import FloatingFinan from '@/components/FloatingFinan.jsx';
import HelpTooltip from '@/components/HelpTooltip.jsx';
import { annuityPayment, applyExtraPaymentReduceTerm } from '@/utils/amortization.js';
import NotificationBell from './components/NotificationBell.jsx';
import InvestorBreadcrumbs from '@/components/InvestorBreadcrumbs.jsx';
import { trackEvent } from '@/analytics.js';

// --- LISTAS DE FAQs CONTEXTUALES (SIN CAMBIOS) ---
const approvedLoanFaqs = [];
const inProgressFaqs = [
  {
    question: '¿Qué significa que ya estoy en Revisión Final?',
    answer: 'Tus documentos llegaron completos, ahora los analistas financieros y de riesgo los revisan; si todo está en orden recibirás una propuesta formal desde este mismo panel.'
  },
  {
    question: '¿Qué documento falta y cómo lo detecto?',
    answer: 'Revisa el Document Manager: cada tarjeta se actualiza con estado y análisis. Si ves una tarjeta con “Pendiente” o “Subiendo”, es el que falta.'
  },
  {
    question: '¿Cuánto tarda el análisis? ¿Necesito hacer algo más?',
    answer: 'Una vez subido el archivo, el análisis ocurre automáticamente y debería reflejarse en segundos. Si algo falla, el mismo panel mostrará el error y podrás reintentar.'
  },
  {
    question: '¿Puedo volver a subir un documento?',
    answer: 'Sí. Toca el slot correspondiente, selecciona el archivo correcto y el sistema reemplazará la carga anterior sin duplicados.'
  },
  {
    question: '¿Qué pasa si no tengo un documento y necesito ayuda?',
    answer: 'Haz clic en “Necesito ayuda para subir un documento” y Sarai o el equipo de soporte se contactarán contigo. Así no tenés que tocar Supabase.'
  }
];

// --- MOCK DATA (SIN CAMBIOS) ---
const mockLoanData = {};
const mockNotifications = [];

const isDev = process.env.NODE_ENV === 'development';
const diagLog = (...args) => {
  if (isDev) console.log(...args);
};

const BorrowerOfferView = ({ solicitud, oportunidad, onAccept, onReject, loading }) => {
  const [showAmortModal, setShowAmortModal] = useState(false);
  const neto = Number(solicitud?.saldo_deuda_tc || solicitud?.monto_solicitado || 0);
  const plazo = Number(oportunidad?.plazo_meses || solicitud?.plazo_meses || 24);
  const tasa = Number(oportunidad?.tasa_interes_prestatario || solicitud?.tasa_interes_tc || 0);
  const originacionPct = Number(oportunidad?.comision_originacion_porcentaje || 0);
  const breakdown = calcTPBreakdown(neto, tasa, plazo, originacionPct);
  const montoBruto = breakdown.bruto || Number(oportunidad?.monto || 0);
  const originacionMonto = breakdown.originacion || 0;
  const adminSeguroFlat = plazo > 0 ? (breakdown.totalServiceFee || 0) / plazo : 0;
  const cuotaTotal = (breakdown.monthlyPaymentAmort || 0) + adminSeguroFlat;
  const adminSeguro = adminSeguroFlat;
  const costoCredito = (breakdown.totalInterest || 0) + (breakdown.totalServiceFee || 0) + originacionMonto;
  const totalPagar = neto + costoCredito;
  const tasaBanco = Number(solicitud?.tasa_interes_tc || 0);
  const costoBanco = tasaBanco && plazo
    ? ((neto * (tasaBanco / 100)) / 12) * plazo
    : 0;
  const totalBanco = neto + costoBanco;

  const schedule = (() => {
    const items = [];
    const monthlyRate = tasa / 100 / 12;
    const payment = breakdown.monthlyPaymentAmort || 0;
    const serviceFee = adminSeguroFlat;
    let balance = montoBruto;
    for (let i = 1; i <= plazo; i++) {
      const interest = balance * monthlyRate;
      const principal = payment - interest;
      balance = Math.max(0, balance - principal);
      items.push({
        n: i,
        cuota: payment + serviceFee,
        capital: principal,
        interes: interest,
        adminSeguro: serviceFee,
        saldo: balance,
      });
    }
    return items;
  })();

  const summaryItems = [
    {
      id: 'tasa',
      title: 'Tasa Propuesta (anual)',
      value: tasa ? `${tasa.toFixed(1)}%` : 'N/D',
    },
    {
      id: 'plazo',
      title: 'Plazo',
      value: `${plazo} meses`,
    },
    {
      id: 'cuota',
      title: 'Cuota Mensual Tu Préstamo',
      value: `Bs ${cuotaTotal.toFixed(2)}`,
      tooltip: 'Cuota mensual final estimada: capital + interés + costo de admin/seguro.',
    },
    {
      id: 'monto',
      title: 'Monto Aprobado (bruto)',
      value: `Bs ${montoBruto.toLocaleString('es-BO')}`,
      tooltip: 'Bruto = saldo deudor verificado + comisión de originación (mínimo Bs 450 si corresponde).',
    },
    {
      id: 'admin',
      title: 'Costo Admin + Seguro mensual',
      value: `Bs ${adminSeguro.toFixed(2)}`,
      tooltip: 'Costo de administración de plataforma + seguro de desgravamen. Mínimo 10 Bs/mes, baja con el saldo.',
    },
  ];

  return (
    <div className="borrower-dashboard borrower-offer-view">
      <InvestorBreadcrumbs items={[{ label: 'Inicio', to: '/borrower-dashboard' }, { label: 'Propuesta de Crédito' }]} />
      <div className="dashboard-header">
        <p>Bienvenido a tu centro de control. Aquí puedes ver el progreso de tu solicitud.</p>
      </div>
      <ProgressStepper currentStep="aprobado" allDocumentsUploaded />

      <div className="card">
        <h2>Resumen de tu Solicitud</h2>
        <div className="loan-summary-grid">
          {summaryItems.map(item => (
            <div key={item.id} className="loan-summary-card">
              <div className="summary-card-title">{item.title}</div>
              <div className="summary-card-value">{item.value}</div>
              {item.extra && <div className="summary-card-subtext">{item.extra}</div>}
              {item.tooltip && (
                <div className="summary-card-help">
                  <HelpTooltip text={item.tooltip} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card transparency-card">
        <h2>Transparencia Total</h2>
        <p className="muted">Desglose final del crédito a {plazo} meses</p>
        <table className="transparency-table">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Con tu Banco</th>
              <th className="tp-col">Con Tu Préstamo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Costo del Crédito (Intereses + Comisiones)</td>
              <td>Bs {costoBanco.toFixed(2)}</td>
              <td className="tp-col">Bs {costoCredito.toFixed(2)}</td>
            </tr>
            <tr className="total-row">
              <td><strong>Total a Pagar (Capital + Costos)</strong></td>
              <td><strong>Bs {totalBanco.toFixed(2)}</strong></td>
              <td className="tp-col"><strong>Bs {totalPagar.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card offer-cta">
        <div>
          <h2>Tabla de amortización</h2>
          <p className="muted">Consulta el detalle de tus cuotas con capital, interés y admin/seguro.</p>
        </div>
        <div className="offer-cta-actions">
          <button className="btn" onClick={() => setShowAmortModal(true)}>Ver tabla</button>
        </div>
      </div>

      <div className="card offer-cta">
        <div>
          <h2>¿Aceptas esta propuesta?</h2>
          <p className="muted">Al aceptar, publicaremos tu oportunidad para que los inversionistas la fondeen. El pago se hará directamente a tu banco acreedor.</p>
        </div>
        <div className="offer-cta-actions">
          <button className="btn btn--primary" onClick={onAccept} disabled={loading}>Aceptar propuesta</button>
          <button className="btn" onClick={onReject} disabled={loading}>No aceptar</button>
        </div>
      </div>

      {showAmortModal && (
        <div className="offer-modal-backdrop" onClick={() => setShowAmortModal(false)}>
          <div className="offer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="offer-modal-header">
              <h4>Tabla de amortización</h4>
              <button className="btn btn--ghost" onClick={() => setShowAmortModal(false)}>Cerrar</button>
            </div>
            <div className="offer-modal-body">
              <table className="amort-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cuota</th>
                    <th>Capital</th>
                    <th>Interés</th>
                    <th>Admin/Seguro</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(row => (
                    <tr key={row.n}>
                      <td>{row.n}</td>
                      <td>Bs {row.cuota.toFixed(2)}</td>
                      <td>Bs {row.capital.toFixed(2)}</td>
                      <td>Bs {row.interes.toFixed(2)}</td>
                      <td>Bs {row.adminSeguro.toFixed(2)}</td>
                      <td>Bs {row.saldo.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTES DE VISTA APROBADA (SIN CAMBIOS) ---
const LoanSummaryCard = ({ title, value, subtext, isPrimary = false }) => ( <div/> );
const AmortizationTable = ({ schedule }) => ( <div/> );
const PaymentHistory = ({ history }) => ( <div/> );
const ApprovedLoanDashboard = ({ loan, user, onLogout }) => {
  // Valores de ejemplo si no hay datos reales del préstamo aún
  const principal = Number(loan?.capital_pendiente ?? 12000);
  const annualRate = Number(loan?.tasa_anual ?? 24);
  const months = Number(loan?.plazo_restante ?? 24);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const monthly = annuityPayment(principal, annualRate, months);
  const result = applyExtraPaymentReduceTerm(principal, annualRate, months, Number(amount || 0));
  const handleConfirm = async () => {
    try {
      setLoading(true);
      const extra = Number(amount);
      if (!extra || extra <= 0) { setMsg('Ingresa un monto válido.'); setLoading(false); return; }
      trackEvent('ExtraPaymentRequested', { amount: extra, capital_before: principal, new_months: result.newMonths, interest_saved: result.interestSaved });
      try {
        await supabase.from('pagos_extra_solicitados').insert({ user_id: user?.id, monto: extra, capital_antes: principal, tasa_anual: annualRate, plazo_antes: months });
      } catch (_) {}
      setMsg('Solicitud registrada. Te contactaremos para procesar el pago.');
      setTimeout(() => { setShowModal(false); setMsg(''); setAmount(''); }, 1200);
    } finally {
      if (!silent) setLoading(false);
    }
  };
  return (
    <div className="borrower-dashboard">
      <div className="dashboard-header">
        <h2>Mi Préstamo</h2>
        <button onClick={onLogout} className="btn">Cerrar sesión</button>
      </div>
      <div className="cards-grid">
        <div className="card"><h4>Capital pendiente</h4><div>Bs {principal.toLocaleString('es-BO')}</div></div>
        <div className="card"><h4>Tasa anual</h4><div>{annualRate}%</div></div>
        <div className="card"><h4>Plazo restante</h4><div>{months} meses</div></div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Pagos Anticipados</h3>
        <p style={{ color: '#385b64' }}>Sin penalidades. Tu pago extra se aplica 100% a capital y reducimos el plazo.</p>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>Realizar Pago Extra</button>
      </div>

      <AmortizationSchedule userId={user?.id} />

      {showModal && (
        <div className="modal-overlay" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div className="modal" style={{background:'#fff',borderRadius:8,padding:16,width:'min(520px, 92vw)'}}>
            <h3>Pago Extra a Capital</h3>
            <label style={{display:'block',marginTop:8}}>Monto (Bs)
              <input type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:'100%',padding:8,marginTop:6}}/>
            </label>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12,color:'#385b64'}}>
              <div><strong>Cuota actual:</strong> Bs {monthly.toFixed(2)}</div>
              <div><strong>Nuevo plazo:</strong> {result.newMonths} meses</div>
              <div><strong>Ahorro intereses:</strong> Bs {Number(result.interestSaved||0).toFixed(2)}</div>
            </div>
            {msg && <div style={{marginTop:8,color:'#0a7a4b'}}>{msg}</div>}
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}>
              <button className="btn" onClick={()=>setShowModal(false)} disabled={loading}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleConfirm} disabled={loading}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- FUNCIÓN HELPER MOVILIZADA PARA SER REUTILIZABLE ---
  const getRequiredDocs = (situacionLaboral) => {
    // Documentos base (sin la autorización firmada, que irá al final)
    const baseDocs = [
      { id: 'ci_anverso', nombre: 'Cédula de Identidad (Anverso)', definition: 'Para verificar tu identidad y cumplir con las regulaciones bolivianas (KYC - Conoce a tu Cliente).' },
      { id: 'ci_reverso', nombre: 'Cédula de Identidad (Reverso)', definition: 'Para verificar tu identidad y cumplir con las regulaciones bolivianas (KYC - Conoce a tu Cliente).' },
      { id: 'factura_servicio', nombre: 'Factura Servicio Básico', definition: 'Para confirmar tu dirección de residencia actual. Puede ser una factura de luz, agua o gas.', tooltip: 'Adjunta la última factura de agua, electricidad o internet que muestre tu dirección actual.' },
      { id: 'extracto_tarjeta', nombre: 'Extracto de Tarjeta de Crédito', definition: 'Necesitamos tu último extracto mensual para verificar datos clave: saldo deudor, tasa de interés, cargos por mantenimiento y el número de cuenta. Esto es crucial para calcular tu ahorro y para realizar el pago directo de la deuda por ti.', tooltip: 'La última boleta que te envía el banco; si no llega, solicita el documento a través de la banca en línea o en una agencia.' },
      { id: 'selfie_ci', nombre: 'Selfie con Cédula de Identidad', definition: 'Una medida de seguridad adicional para prevenir el fraude y asegurar que realmente eres tú quien solicita el préstamo. Sostén tu CI al lado de tu cara.' },
    ];
  const situacionDocs = {
      'Dependiente': [
        { id: 'boleta_pago', nombre: 'Última Boleta de Pago', definition: 'Para verificar tus ingresos mensuales y tu relación laboral como dependiente.', tooltip: 'Debe mostrar empresa, fecha de ingreso y líquido pagable. Si falta algún dato, pídeselo a RRHH.' },
        { id: 'certificado_gestora', nombre: 'Certificado de la Gestora Pública', definition: 'Confirma tus aportes y nos ayuda a complementar el análisis de tus ingresos.', tooltip: <>Solicítalo en la Gestora Pública de Pensiones (o AFP) presentando tu cédula. También puedes descargarlo en <a href="https://www.gestorapublica.gob.bo" target="_blank" rel="noopener noreferrer">gestorapublica.gob.bo</a> y si la web no responde, acércate a sus oficinas.</> },
      ],
    'Independiente': [
      { id: 'extracto_bancario_m1', nombre: 'Extracto Bancario (Mes 1)', definition: 'Tu extracto bancario más reciente. Permite verificar la consistencia de tus ingresos.' },
      { id: 'extracto_bancario_m2', nombre: 'Extracto Bancario (Mes 2)', definition: 'Tu extracto bancario del mes anterior. Permite verificar la consistencia de tus ingresos.' },
      { id: 'extracto_bancario_m3', nombre: 'Extracto Bancario (Mes 3)', definition: 'Tu extracto bancario de hace dos meses. Permite verificar la consistencia de tus ingresos.' },
      { id: 'nit', nombre: 'NIT (Opcional)', definition: 'Si tienes NIT, súbelo para confirmar tu actividad económica. Si no, puedes dejar este campo vacío.' },
    ],
    'Jubilado': [
      { id: 'boleta_jubilacion', nombre: 'Boleta de Pago de Jubilación', definition: 'Para verificar tus ingresos como jubilado y la regularidad de los mismos.' },
    ],
  };
  const docs = [...baseDocs, ...(situacionDocs[situacionLaboral] || [])];
  // Agregar al final la autorización firmada (fricción al final)
  docs.push({ id: 'autorizacion_infocred_firmada', nombre: 'Autorización Consulta Infocred (Firmada a mano)', definition: 'Imprimí, firmá a mano dentro del recuadro y subí una foto nítida.' });
  return docs;
};

// --- VISTA PARA SOLICITUD EN PROGRESO ---
const InProgressApplicationView = ({ solicitud, user, documents, onDocumentUploaded, onLogout, analyzedDocTypes, onRefreshData }) => {
    const oportunidadObj = Array.isArray(solicitud.oportunidades) && solicitud.oportunidades.length > 0
        ? solicitud.oportunidades[0]
        : null;
    const oportunidadFallback = getFallbackOpportunity(solicitud);
    const activeOpportunity = oportunidadObj || oportunidadFallback;
    const requestedAmountValue = parseNumberValue(solicitud?.saldo_deuda_tc ?? solicitud?.monto_solicitado);

    const [simulation, setSimulation] = useState({
        montoDeuda: requestedAmountValue ?? '',
        tasaActual: solicitud.tasa_interes_tc || '',
        plazo: solicitud.plazo_meses || 24,
        costoMantenimientoBanco: '100',
    });

    useEffect(() => {
        if (!solicitud) return;
        const preferredDebt = parseNumberValue(solicitud?.saldo_deuda_tc ?? solicitud?.monto_solicitado);
        setSimulation(prev => ({
            ...prev,
            montoDeuda: preferredDebt ?? prev.montoDeuda,
            tasaActual: solicitud.tasa_interes_tc ?? prev.tasaActual,
            plazo: solicitud.plazo_meses ?? prev.plazo,
        }));
    }, [solicitud?.saldo_deuda_tc, solicitud?.monto_solicitado, solicitud?.tasa_interes_tc, solicitud?.plazo_meses]);

    const handleSimulationChange = (newValues) => {
        setSimulation(prev => ({ ...prev, ...newValues }));
    };

    const breakdownTP = calcTPBreakdown(
        parseFloat(simulation.montoDeuda),
        activeOpportunity?.tasa_interes_prestatario,
        simulation.plazo,
        activeOpportunity?.comision_originacion_porcentaje
    );
    const originacionMonto = breakdownTP.originacion || 0;
    const minApplied = breakdownTP.minApplied || false;
    const pagoTotalMensualTP = Number(breakdownTP.monthlyPaymentTotal) || 0;

    const requiredDocs = getRequiredDocs(solicitud.situacion_laboral);
    const allDocumentsUploaded = requiredDocs.every(doc => 
        documents.some(uploadedDoc => uploadedDoc.tipo_documento === doc.id && uploadedDoc.estado === 'subido')
    );
    const showFinalReviewNote = allDocumentsUploaded || ['documentos-en-revision','aprobado'].includes(solicitud.estado);
    const [showUploadToast, setShowUploadToast] = useState(false);
    const prevAllDocs = useRef(allDocumentsUploaded);
    useEffect(() => {
        let timer;
        if (allDocumentsUploaded && !prevAllDocs.current) {
            setShowUploadToast(true);
            timer = setTimeout(() => setShowUploadToast(false), 3200);
        }
        prevAllDocs.current = allDocumentsUploaded;
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [allDocumentsUploaded]);

    return (
        <>
            <div className="borrower-dashboard">
                <InvestorBreadcrumbs items={[{ label: 'Inicio', to: '/borrower-dashboard' }, { label: 'Mi Solicitud' }]} />
                <div className="dashboard-header">
                    <p>Bienvenido a tu centro de control. Aquí puedes ver el progreso de tu solicitud.</p>
                </div>
                <ProgressStepper currentStep={solicitud.estado} allDocumentsUploaded={allDocumentsUploaded} />
                <UploadToast visible={showUploadToast} />
                <FinalReviewNote visible={showFinalReviewNote} />
                
                    <StatusCard 
                        solicitud={solicitud} 
                        oportunidad={activeOpportunity} 
                        simulation={simulation}
                        pagoTotalMensualTP={pagoTotalMensualTP}
                        originacionMonto={originacionMonto}
                        minApplied={minApplied}
                    />

                <>
                        <SavingsCalculator 
                            oportunidad={activeOpportunity}
                        simulation={simulation}
                        onSimulationChange={handleSimulationChange}
                    />
                    <DocumentManager 
                        solicitud={solicitud} 
                        user={user} 
                        uploadedDocuments={documents} 
                        onDocumentUploaded={onDocumentUploaded} 
                        requiredDocs={requiredDocs} 
                        analyzedDocTypes={analyzedDocTypes} 
                        onRefreshData={onRefreshData}
                    />
                </>
                <FloatingFinan faqItems={inProgressFaqs} />
            </div>
        </>
    );
}

const riskRateMap = { A: 15, B: 17, C: 20 };
const commissionMap = { A: 3, B: 4, C: 5 };

const deriveRiskProfile = (solicitud) => {
  if (!solicitud) return null;
  const ingresos = Number(solicitud.ingreso_mensual);
  const saldoDeuda = Number(solicitud.saldo_deuda_tc);
  const tasaAnual = Number(solicitud.tasa_interes_tc);
  const antiguedad = Number(solicitud.antiguedad_laboral);
  if ([ingresos, saldoDeuda, tasaAnual, antiguedad].some(val => Number.isNaN(val))) return null;
  if (ingresos < 3000) return 'Rechazado';
  const interesMensual = (saldoDeuda * (tasaAnual / 100)) / 12;
  const amortizacionCapital = saldoDeuda * 0.01;
  const deudaMensualEstimada = interesMensual + amortizacionCapital;
  const dti = (deudaMensualEstimada / ingresos) * 100;
  if (dti > 50) return 'Rechazado';
  let totalScore = 0;
  if (ingresos > 8000) totalScore += 3;
  else if (ingresos >= 5000) totalScore += 2;
  else if (ingresos >= 3000) totalScore += 1;
  if (dti < 30) totalScore += 3;
  else if (dti <= 40) totalScore += 2;
  else if (dti <= 50) totalScore += 1;
  if (antiguedad >= 24) totalScore += 2;
  else if (antiguedad >= 12) totalScore += 1;
  if (totalScore >= 7) return 'A';
  if (totalScore >= 5) return 'B';
  if (totalScore >= 2) return 'C';
  return 'Rechazado';
};

const getFallbackOpportunity = (solicitud) => {
  const profile = deriveRiskProfile(solicitud);
  const tasa = profile && riskRateMap[profile] ? riskRateMap[profile] : 20;
  const commission = profile && commissionMap[profile] ? commissionMap[profile] : 3;
  const montoDeuda = Number(solicitud?.saldo_deuda_tc) || Number(solicitud?.monto_solicitado) || 0;
  return {
    tasa_interes_prestatario: tasa,
    tasa_interes_anual: tasa,
    comision_originacion_porcentaje: commission,
    monto: montoDeuda,
    user_id: solicitud?.user_id,
  };
};

const getProfileMessage = (profile) => { /* ... */ };

const parseNumberValue = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

// --- PROGRESS STEPPER CON LÓGICA DE UI MEJORADA ---
const ProgressStepper = ({ currentStep, allDocumentsUploaded }) => {
  const steps = ['Solicitud Recibida', 'Verificación Inicial', 'Sube tus Documentos', 'Revisión Final', 'Préstamo Aprobado'];
  const getStepStatus = (stepIndex) => {
    const stepMap = { 'pre-aprobado': 2, 'documentos-en-revision': 3, 'aprobado': 4 };
    let currentStepIndex = stepMap[currentStep] ?? 0;

    if (currentStepIndex === 0 && currentStep !== 'pendiente') {
      currentStepIndex = 1; // ensure verification step is marked when no longer pending
    }

    if (allDocumentsUploaded && currentStepIndex < 3) {
      currentStepIndex = 3;
    }

    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'active';
    return 'pending';
  };
  return (
    <div className="card">
      <ul className="progress-stepper">{steps.map((label, index) => <li key={label} className={`step ${getStepStatus(index)}`}><span className="step-icon">{getStepStatus(index) === 'completed' ? '✔' : index + 1}</span><span className="step-label">{label}</span></li>)}</ul>
    </div>
  );
};

const FinalReviewNote = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="final-review-note">
      <p>
        Ya con todos tus documentos en mano, nuestros analistas revisarán con cuidado que todo cumpla riesgo, compliance y requisitos internos; si todo está alineado, recibirás la propuesta del préstamo desde este mismo panel.
      </p>
      </div>
    );
};

const UploadToast = ({ visible }) => (
  <div className={`upload-toast ${visible ? 'upload-toast--visible' : ''}`} role="status" aria-live="polite">
    <span className="upload-toast__icon" aria-hidden="true">✔</span>
    <p>¡Todo listo! Tu solicitud pasa a Revisión Final.</p>
  </div>
);

const StatusCard = ({ solicitud, oportunidad, simulation, pagoTotalMensualTP }) => {
  const monto = Number(simulation.montoDeuda) || 0;
  const tasaBancoAnual = Number(simulation.tasaActual) || 0;
  const plazo = Number(simulation.plazo) || 0;
  const tasaTP = oportunidad?.tasa_interes_prestatario ?? null;
  const cuotaTpResumen = pagoTotalMensualTP;

    const effectiveMonto = Number(simulation.montoDeuda) || Number(oportunidad?.monto) || Number(solicitud?.monto_solicitado) || 0;
    const effectivePlazo = Number(simulation.plazo) || Number(oportunidad?.plazo_meses) || Number(solicitud?.plazo_meses) || 24;
    const breakdownTP = calcTPBreakdown(
      effectiveMonto,
      oportunidad?.tasa_interes_prestatario,
      effectivePlazo,
      oportunidad?.comision_originacion_porcentaje
    );
    const derivedMonthly = breakdownTP.monthlyPaymentTotal || cuotaTpResumen;
    const effectiveCuota = derivedMonthly > 0 ? derivedMonthly : cuotaTpResumen;

    const summaryItems = [
    {
      id: 'tasa',
      title: 'Tasa Propuesta (anual)',
      value: tasaTP != null ? `${Number(tasaTP).toFixed(1)}%` : '-',
      extra: tasaTP != null ? 'Excelente perfil' : null,
      tooltip: 'Premiamos a los buenos perfiles como el tuyo.'
    },
    {
      id: 'plazo',
      title: 'Plazo',
      value: plazo ? `${plazo} meses` : '-'
    },
      {
        id: 'cuota',
        title: 'Cuota Mensual Total',
        value: effectiveCuota > 0 ? `Bs ${effectiveCuota.toFixed(2)}` : '-',
        tooltip: 'Incluye capital + interés + costo de administración y seguro. Monto final sujeto a validación de documentos.'
      },
      {
        id: 'monto',
        title: 'Monto Solicitado',
        value: `Bs ${effectiveMonto.toLocaleString('es-BO')}`
      },
    {
      id: 'tasa-banco',
      title: 'Tasa Banco (anual)',
      value: tasaBancoAnual ? `${tasaBancoAnual.toFixed(1)}%` : '-'
    },
  ];

  return (
    <div className="card">
      <h2>Resumen de tu Solicitud</h2>
      <div className="loan-summary-grid">
        {summaryItems.map((item) => (
          <div key={item.id} className="loan-summary-card">
            <div className="summary-card-title">{item.title}</div>
            <div className="summary-card-value">{item.value}</div>
            {item.extra && <div className="summary-card-subtext">{item.extra}</div>}
            {item.tooltip && (
              <div className="summary-card-help">
                <HelpTooltip text={item.tooltip} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
const FileSlot = ({ doc, isUploaded, isUploading, isAnalysing, progress, error, onFileSelect, disabled, isAnalyzed, manualFallback, onManualRetry }) => {
  const inputRef = useRef(null);

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };


  const handleChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input value to allow re-uploading the same file name
    e.target.value = '';
  };

  const fallbackActive = Boolean(manualFallback?.message);
  const statusClass = fallbackActive
    ? 'status-manual'
    : isUploading
    ? 'status-subiendo'
    : isUploaded
    ? 'status-completado'
    : 'status-pendiente';

  const statusText = error
    ? 'Error al subir'
    : fallbackActive
    ? 'Revisión manual activada'
    : isUploading
    ? `Subiendo... ${Math.max(0, Math.min(100, Number(progress) || 0))}%`
    : isAnalysing
    ? 'Analizando documento...'
    : isUploaded
    ? 'Completado'
    : 'Pendiente';

  return (
    <div
      className={`file-slot ${isUploaded ? 'completed' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
    >
      <div className="file-slot-icon">📄</div>
        <div className="file-slot-info">
          <div className="file-slot-name-row">
            <span className="file-slot-name">{doc.nombre}</span>
            {doc.tooltip && (
              <span className="file-slot-tooltip">
                <HelpTooltip text={doc.tooltip} />
              </span>
            )}
          </div>
          <div className={`file-slot-status ${statusClass}`}>{statusText}</div>
        {fallbackActive && (
          <div className="manual-fallback">
            <p className="manual-fallback-text">{manualFallback.message}</p>
            <div className="manual-fallback-actions">
              <button className="btn btn--ghost btn--xs" type="button" onClick={onManualRetry}>
                Reintentar análisis
              </button>
            </div>
          </div>
        )}
        {isAnalyzed && doc.id !== 'autorizacion_infocred_firmada' ? (
          <div className="ai-badge" aria-label="Analizado por IA">
            <span className="ai-icon" aria-hidden="true">🧠</span>
            Analizado por IA
          </div>
        ) : null}
        {error && <span className="file-slot-error">{error}</span>}
      </div>
      <div className="file-slot-action">➔</div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={handleChange}
        disabled={disabled}
      />
      {isUploading && (
        <div className="progress-bar">
          <div
            className="progress-bar-inner"
            style={{ width: `${Math.max(0, Math.min(100, Number(progress) || 0))}%` }}
          />
        </div>
      )}
    </div>
  );
};

// --- DOCUMENT MANAGER CONECTADO A LA NUEVA EDGE FUNCTION ---
const DocumentManager = ({ solicitud, user, uploadedDocuments, onDocumentUploaded, requiredDocs, analyzedDocTypes, onRefreshData }) => {
  const [uploadProgress, setUploadProgress] = useState({});
  const [analysing, setAnalysing] = useState({});
  const [errors, setErrors] = useState({});
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
  const [authPreprintUrl, setAuthPreprintUrl] = useState(null);
  const [manualFallback, setManualFallback] = useState({});
  const [globalHelpRequested, setGlobalHelpRequested] = useState(false);
  const [helpRequestsResolved, setHelpRequestsResolved] = useState(false);
  const uploadedSet = new Set((uploadedDocuments || []).map(d => d.tipo_documento));
  const analyzedSet = new Set(analyzedDocTypes || []);
  const requiredDocIds = useMemo(() => (requiredDocs || []).map(doc => doc.id), [requiredDocs]);

  const activateManualFallback = useCallback((docId, message) => {
    setManualFallback(prev => ({
      ...prev,
      [docId]: { message, acknowledged: false }
    }));
  }, []);

  const clearManualFallback = useCallback((docId) => {
    setManualFallback(prev => {
      if (!prev[docId]) return prev;
      const next = { ...prev };
      delete next[docId];
      return next;
    });
  }, []);

  const handleGlobalHelp = useCallback(async () => {
    if (globalHelpRequested) return;
    setGlobalHelpRequested(true);
    try {
      await supabase.from('document_help_requests').insert({
        solicitud_id: solicitud.id,
        user_id: user?.id,
        payload: { event: 'global_help_request' },
        status: 'pending'
      });
      trackEvent('Requested Global Document Help', { solicitud_id: solicitud?.id });
    } catch (err) {
      console.error('Error registrando request de ayuda global:', err);
    }
  }, [globalHelpRequested, solicitud?.id, user?.id]);

  useEffect(() => {
    if (!isDev) { // keep functionality without logs
      const pre = uploadedDocuments?.find(d => d.tipo_documento === 'autorizacion_infocred_preimpresa');
      const fetchSigned = async () => {
        if (!pre || !pre.url_archivo) {
          setAuthPreprintUrl(null);
          return;
        }
        try {
          const { data, error } = await supabase
            .storage
            .from('documentos-prestatarios')
            .createSignedUrl(pre.url_archivo, 60 * 30);
          if (error) {
            setAuthPreprintUrl(null);
            return;
          }
          setAuthPreprintUrl(data?.signedUrl || null);
        } catch (e) {
          setAuthPreprintUrl(null);
        }
      };
      fetchSigned();
      return;
    }
    diagLog('--- DIAGNÓSTICO DESCARGA PDF ---');
    diagLog('1. Documentos recibidos:', uploadedDocuments);
    const pre = uploadedDocuments?.find(d => d.tipo_documento === 'autorizacion_infocred_preimpresa');
    diagLog('2. Documento "preimpreso" encontrado en la base de datos:', pre);

    const fetchSigned = async () => {
      if (!pre || !pre.url_archivo) {
        diagLog('3. ERROR: No se encontró el documento preimpreso o no tiene URL. No se puede generar enlace de descarga.');
        setAuthPreprintUrl(null);
        return;
      }
      diagLog('3. URL de archivo encontrada:', pre.url_archivo);
      try {
        diagLog('4. Intentando generar URL firmada para el archivo...');
        const { data, error } = await supabase
          .storage
          .from('documentos-prestatarios')
          .createSignedUrl(pre.url_archivo, 60 * 30); // 30 minutos
        
        if (error) {
          diagLog('5. ERROR al generar URL firmada:', error);
          setAuthPreprintUrl(null);
          return;
        }
        
        diagLog('5. ÉXITO. URL firmada generada:', data?.signedUrl);
        setAuthPreprintUrl(data?.signedUrl || null);
      } catch (e) {
        diagLog('6. ERROR CATASTRÓFICO en fetchSigned:', e);
        setAuthPreprintUrl(null);
      }
    };
    fetchSigned();
    diagLog('--- FIN DIAGNÓSTICO ---');
  }, [uploadedDocuments]);

  const handleAuthPreprintDownload = useCallback(() => {
    if (!authPreprintUrl) {
      console.error("Intento de descarga pero la URL del PDF no está lista.");
      return;
    }
    try {
      trackEvent('Downloaded Authorization PDF', { solicitud_id: solicitud.id });
    } catch (_) {}
    window.open(authPreprintUrl, '_blank');
  }, [authPreprintUrl, solicitud?.id]);

  useEffect(() => {
    if (!analyzedDocTypes || analyzedDocTypes.length === 0) return;
    setAnalysing(prev => {
      const next = { ...prev };
      let changed = false;
      analyzedDocTypes.forEach(type => {
        if (next[type]) {
          next[type] = false;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [analyzedDocTypes]);

  useEffect(() => {
    if (!solicitud?.id || helpRequestsResolved) return;
    if (!requiredDocIds.length) return;
    const allAnalyzed = requiredDocIds.every(id => analyzedDocTypes?.includes(id));
    if (!allAnalyzed) return;
    const resolveHelpRequests = async () => {
      const { error } = await supabase
        .from('document_help_requests')
        .update({ status: 'resolved' })
        .eq('solicitud_id', solicitud.id)
        .eq('status', 'pending');
      if (!error) {
        setHelpRequestsResolved(true);
      } else {
        console.error('No se pudo cerrar help requests automáticamente:', error);
      }
    };
    resolveHelpRequests();
  }, [analyzedDocTypes, requiredDocIds, solicitud?.id, helpRequestsResolved]);

  const shouldActivateManualFallback = useCallback((error) => {
    if (!error) return false;
    const msg = ((error?.message || '')).toLowerCase();
    return msg.includes('gemini') || msg.includes('modo_manual') || msg.includes('analizar');
  }, []);

  const analyzeDocument = useCallback(async (docId, filePath) => {
    setAnalysing(prev => ({ ...prev, [docId]: true }));
    try {
      const { error: analysisError } = await supabase.functions.invoke('analizar-documento-v2', {
        body: { filePath, documentType: docId, solicitud_id: solicitud.id },
      });
      if (analysisError) throw analysisError;
      const { error: notifyError } = await supabase.functions.invoke('notify-uploads-complete', {
        body: { solicitud_id: solicitud.id }
      });
      if (notifyError) console.warn('Error calling notify-uploads-complete:', notifyError);
      clearManualFallback(docId);
    } catch (err) {
      if (shouldActivateManualFallback(err)) {
        console.warn('Gemini fallback manual activado:', err.message || err);
        activateManualFallback(docId, 'La IA no pudo leer este documento, lo mantenemos en revisión manual.');
        setErrors(prev => ({ ...prev, [docId]: null }));
        trackEvent('ManualFallbackTriggered', { document_type: docId });
      } else {
        throw err;
      }
    } finally {
      setAnalysing(prev => ({ ...prev, [docId]: false }));
    }
  }, [activateManualFallback, clearManualFallback, shouldActivateManualFallback, solicitud?.id]);

  const handleRetryAnalysis = useCallback(async (doc) => {
    if (!doc?.url_archivo) {
      setErrors(prev => ({ ...prev, [doc.tipo_documento]: 'No hay archivo disponible para reanálisis.' }));
      return;
    }
    try {
      await analyzeDocument(doc.tipo_documento, doc.url_archivo);
      trackEvent('Reanalysis Requested', { document_type: doc.tipo_documento });
    } catch (err) {
      console.error('Error reintentando el análisis:', err);
      trackEvent('Reanalysis Failed', { document_type: doc.tipo_documento, error_message: err?.message });
    }
  }, [analyzeDocument]);


  const handleFileUpload = async (file, docId) => {
    if (!file) return;
    trackEvent('Started Document Upload', { document_type: docId });

    if (isUploadingGlobal) {
      setErrors(prev => ({ ...prev, [docId]: "Espera a que la subida actual termine." }));
      return;
    }

    setIsUploadingGlobal(true);
    setUploadProgress(prev => ({ ...prev, [docId]: 5 }));
    // Progreso suave mientras sube (simulado) para mejor UX
    let progressTimer;
    try {
      progressTimer = setInterval(() => {
        setUploadProgress(prev => {
          const curr = Number(prev[docId] || 0);
          const next = Math.min(90, curr + 5);
          return { ...prev, [docId]: next };
        });
      }, 300);
    } catch (_) {}
    setErrors(prev => ({ ...prev, [docId]: null }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${solicitud.id}_${docId}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      await supabase.storage.from('documentos-prestatarios').upload(filePath, file, { upsert: true });
      setUploadProgress(prev => ({ ...prev, [docId]: 100 }));

      const { data: newDoc, error: upsertError } = await supabase.from('documentos').upsert({ solicitud_id: solicitud.id, user_id: user.id, tipo_documento: docId, nombre_archivo: fileName, url_archivo: filePath, estado: 'subido' }, { onConflict: ['solicitud_id', 'tipo_documento'] }).select().single();
      
      if (upsertError) throw upsertError;

      // Actualizar estado local inmediatamente para reflejar la subida.
      if (typeof onDocumentUploaded === 'function') {
        onDocumentUploaded(newDoc);
      }

      if (docId === 'autorizacion_infocred_firmada') {
        try { trackEvent('Uploaded Signed Authorization', { solicitud_id: solicitud.id, file: fileName }); } catch (_) {}
      }

        if (docId !== 'autorizacion_infocred_firmada') {
          await analyzeDocument(docId, filePath);
          trackEvent('Successfully Uploaded Document', { document_type: docId });
        } else {
          trackEvent('Uploaded Signed Authorization', { solicitud_id: solicitud.id, document_type: docId });
        }
      if (typeof onRefreshData === 'function') {
        onRefreshData();
      }

    } catch (error) {
      console.error("Error en el proceso de carga y análisis:", error);
      trackEvent('Failed Document Upload', { document_type: docId, error_message: error.message });
      setErrors(prev => ({ ...prev, [docId]: `Error: ${error.message}` }));
    } finally {
      setUploadProgress(prev => ({ ...prev, [docId]: undefined }));
      setIsUploadingGlobal(false);
      try { clearInterval(progressTimer); } catch(_) {}
    }
  };

  return (
    <div className="card">
      <h2>Sube tu Documentación</h2>
      <p>Arrastra y suelta tus archivos en las casillas correspondientes o haz clic para seleccionarlos. Formatos aceptados: PDF, JPG, PNG.</p>
      <div className="document-grid">
        {requiredDocs.map(doc => {
          // Considerar documento "subido" si existe registro, sin depender del estado específico
          const isUploaded = uploadedDocuments.some(d => d.tipo_documento === doc.id);
          const isAnalyzed = analyzedSet.has(doc.id);
          // El estado "analizando" se controla localmente solo para el doc en subida
          const isAuthFirmada = doc.id === 'autorizacion_infocred_firmada';
          return (
            <div key={doc.id}>
              {isAuthFirmada && (
                <div className="info-box" style={{marginBottom:8, background:'#f7fbfb', border:'1px solid #e6f4f3', borderRadius:8, padding:10}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}>
                    <div style={{display:'inline-flex',alignItems:'center',gap:6}}>
                      <span style={{color:'#385b64',fontWeight:700}}>Autorización INFOCRED (requisito ASFI)</span>
                      <HelpTooltip text={'Autorización para consultar tu historial crediticio en INFOCRED; requisito indispensable de ASFI para evaluar y aprobar el crédito.'} />
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{color:'#55747b'}}>Imprimí, firmá a mano y subí la foto.</span>
                      <button type="button" className="btn btn--sm btn--primary" onClick={handleAuthPreprintDownload} disabled={!authPreprintUrl}>
                        Descargar PDF
                      </button>
                      {!authPreprintUrl && <span style={{color:'#8a8a8a'}}>Generando…</span>}
                    </div>
                  </div>
                </div>
              )}
              <FileSlot
                key={doc.id}
                doc={doc}
                isUploaded={isUploaded}
                isUploading={!!uploadProgress[doc.id]}
                isAnalysing={!!analysing[doc.id] && !isAnalyzed}
                progress={uploadProgress[doc.id]}
                error={errors[doc.id]}
                manualFallback={manualFallback[doc.id]}
                onManualRetry={() => handleRetryAnalysis(uploadedDocuments.find(d => d.tipo_documento === doc.id))}
                onFileSelect={(file) => handleFileUpload(file, doc.id)}
                disabled={(isUploadingGlobal && !uploadProgress[doc.id]) || (isAuthFirmada && !authPreprintUrl)}
                isAnalyzed={isAnalyzed}
              />
            </div>
          );
        })}
      </div>
      <div className="document-help-footer">
        <button
          className={`help-pill help-pill--global ${globalHelpRequested ? 'help-pill--active' : ''}`}
          type="button"
          onClick={handleGlobalHelp}
          disabled={globalHelpRequested}
        >
          {globalHelpRequested ? 'Ayuda solicitada' : 'Necesito ayuda para subir un documento'}
        </button>
        {globalHelpRequested && (
          <span className="help-pill-subtext">Te contactaremos en breve para ayudarte.</span>
        )}
      </div>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL DEL DASHBOARD ---
const BorrowerDashboard = () => {
  const [user, setUser] = useState(null);
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [analyzedDocTypes, setAnalyzedDocTypes] = useState([]);
  const [proposalLoading, setProposalLoading] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async (opts = {}) => {
    const silent = opts && opts.silent === true;
    if (!silent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setUser(user);

      // 1) Traer la solicitud sin embeds para evitar ambigüedad
      const { data: solData, error: solError } = await supabase
        .from('solicitudes')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (solError) throw solError;
      if (!solData) {
        setError('No se encontró una solicitud de préstamo para tu cuenta.');
        setLoading(false);
        return;
      }
      // 2) Traer oportunidades asociadas en una segunda consulta (sin ambigüedad)
      const { data: oppsData, error: oppsError } = await supabase
        .from('oportunidades')
        .select('*')
        .eq('solicitud_id', solData.id)
        .order('created_at', { ascending: false });
      if (oppsError) throw oppsError;

      const solicitudConOpps = { ...solData, oportunidades: oppsData || [] };
      setSolicitud(solicitudConOpps);

      const { data: docsData, error: docsError } = await supabase
        .from('documentos')
        .select('*')
        .eq('solicitud_id', solData.id);
      if (docsError) throw docsError;
      setDocuments(docsData || []);
      // Analizados por IA
      try {
        const { data: analyzedData } = await supabase
          .from('analisis_documentos')
          .select('document_type')
          .eq('solicitud_id', solData.id);
        setAnalyzedDocTypes((analyzedData || []).map(d => d.document_type));
      } catch (_) {}

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Hubo un problema al cargar tu información: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleDocumentUploaded = (newDoc) => {
    setDocuments(currentDocs => {
      const docIndex = currentDocs.findIndex(d => d.id === newDoc.id);
      if (docIndex > -1) {
        const updatedDocs = [...currentDocs];
        updatedDocs[docIndex] = newDoc;
        return updatedDocs;
      } else {
        return [...currentDocs, newDoc];
      }
    });
  };

  const refreshData = useCallback(() => fetchData({ silent: true }), [fetchData]);

  useEffect(() => { 
    trackEvent('Viewed Borrower Dashboard');
    fetchData(); 
  }, [fetchData, navigate]);

  // Suscripción en tiempo real a cambios de 'documentos' para esta solicitud
  useEffect(() => {
    if (!solicitud?.id) return;

    diagLog('[Realtime] Suscribiendo a cambios para solicitud ID:', solicitud.id);

    const handleDocumentChange = (payload) => {
      diagLog('[Realtime] Evento de "documentos" recibido:', payload);
      const newDoc = payload.new;
      if (!newDoc) {
        diagLog('[Realtime] Payload de "documentos" no contenía datos nuevos. Ignorando.');
        return;
      }
      
      setDocuments(currentDocs => {
        diagLog('[Realtime] Actualizando estado de "documentos". Documento nuevo/actualizado:', newDoc.tipo_documento);
        const docIndex = currentDocs.findIndex(d => d.id === newDoc.id);
        if (docIndex > -1) {
          const updatedDocs = [...currentDocs];
          updatedDocs[docIndex] = newDoc;
          return updatedDocs;
        } else {
          return [...currentDocs, newDoc];
        }
      });
    };

    const handleAnalysisChange = (payload) => {
      diagLog('[Realtime] Evento de "analisis_documentos" recibido:', payload);
      const docType = payload.new?.document_type;
      if (docType) {
        diagLog('[Realtime] Tipo de documento analizado:', docType);
        setAnalyzedDocTypes(prev => {
          const current = Array.isArray(prev) ? prev : [];
          const typesSet = new Set(current);
          if (typesSet.has(docType)) {
            diagLog('[Realtime] El tipo de documento ya estaba en el estado. No hay cambios.');
            return prev;
          }
          typesSet.add(docType);
          diagLog('[Realtime] Añadiendo nuevo tipo de documento al estado.');
          return Array.from(typesSet);
        });
      } else {
        diagLog('[Realtime] Payload de "analisis_documentos" no contenía un document_type. Ignorando.');
      }
    };

    const docChannel = supabase
      .channel(`documentos-solicitud-${solicitud.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documentos', filter: `solicitud_id=eq.${solicitud.id}` }, handleDocumentChange)
      .subscribe((status) => {
        diagLog(`[Realtime] Estado del canal 'documentos': ${status}`);
      });

    const analysisChannel = supabase
      .channel(`analisis-docs-solicitud-${solicitud.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analisis_documentos', filter: `solicitud_id=eq.${solicitud.id}` }, handleAnalysisChange)
      .subscribe((status) => {
        diagLog(`[Realtime] Estado del canal 'analisis_documentos': ${status}`);
      });

    return () => {
      diagLog('[Realtime] Desuscribiendo de los canales.');
      supabase.removeChannel(docChannel);
      supabase.removeChannel(analysisChannel);
    };
  }, [solicitud?.id]);

  const handleLogout = async () => {
    trackEvent('Logged Out');
    resetMixpanel();
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleProposalDecision = async (decision) => {
    if (!solicitud?.id) return;
    setProposalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('aceptar-propuesta-prestatario', {
        body: { solicitud_id: solicitud.id, decision },
      });
      if (error) throw error;
      trackEvent('Borrower_Proposal_Decision', { decision, solicitud_id: solicitud.id });
      await fetchData({ silent: true });
      alert(data?.message || 'Acción registrada.');
    } catch (err) {
      console.error('Error registrando decisión de propuesta:', err);
      alert('No pudimos registrar tu decisión. Intenta nuevamente.');
    } finally {
      setProposalLoading(false);
    }
  };

  if (loading) return <div className="borrower-dashboard">Cargando tu panel...</div>;
  if (error) return <div className="borrower-dashboard" style={{ color: 'red' }}>Error: {error}</div>;
  
  if (solicitud?.estado === 'desembolsado' || solicitud?.estado === 'aprobado') {
    return <ApprovedLoanDashboard loan={mockLoanData} user={user} onLogout={handleLogout} />;
  }

  if (solicitud?.estado === 'aprobado_para_oferta') {
    const opp = Array.isArray(solicitud.oportunidades) ? solicitud.oportunidades[0] : null;
    return (
      <BorrowerOfferView
        solicitud={solicitud}
        oportunidad={opp}
        onAccept={() => handleProposalDecision('Aceptar')}
        onReject={() => handleProposalDecision('Rechazar')}
        loading={proposalLoading}
      />
    );
  }

  if (!solicitud) return <div className="borrower-dashboard">No tienes solicitudes activas.</div>;

  return <InProgressApplicationView solicitud={solicitud} user={user} documents={documents} onDocumentUploaded={handleDocumentUploaded} onLogout={handleLogout} analyzedDocTypes={analyzedDocTypes} onRefreshData={refreshData} />;
};

export default BorrowerDashboard;
