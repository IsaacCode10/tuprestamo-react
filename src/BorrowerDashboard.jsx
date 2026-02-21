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
const DASHBOARD_CACHE_KEY = 'borrowerDashboardCache';
const getCachedDashboard = () => {
  try {
    const raw = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (_) {
    return {};
  }
};

const isDev = process.env.NODE_ENV === 'development';
const diagLog = (...args) => {
  if (isDev) console.log(...args);
};

const getOfferFinancials = (solicitud, oportunidad) => {
  const netoFromOpp = Number(oportunidad?.saldo_deudor_verificado || 0);
  const netoFallback = Number(solicitud?.saldo_deuda_tc || solicitud?.monto_solicitado || 0);
  const neto = netoFromOpp > 0 ? netoFromOpp : netoFallback;

  const plazo = Number(oportunidad?.plazo_meses || solicitud?.plazo_meses || 24);
  const tasa = Number(oportunidad?.tasa_interes_prestatario || solicitud?.tasa_interes_tc || 0);
  const originacionPct = Number(oportunidad?.comision_originacion_porcentaje || 0);
  const breakdown = calcTPBreakdown(neto, tasa, plazo, originacionPct);

  const montoBrutoDb = Number(oportunidad?.monto || 0);
  const montoBruto = montoBrutoDb > 0 ? montoBrutoDb : (breakdown.bruto || 0);
  const originacionMonto = montoBruto > 0 && neto > 0 ? Math.max(0, montoBruto - neto) : (breakdown.originacion || 0);

  const serviceTotalDb = Number(oportunidad?.comision_servicio_seguro_total || 0);
  const serviceTotal = serviceTotalDb > 0 ? serviceTotalDb : (breakdown.totalServiceFee || 0);
  const adminSeguroFlat = plazo > 0 ? serviceTotal / plazo : 0;

  const cuotaPromedioDb = Number(oportunidad?.cuota_promedio || 0);
  const cuotaTotal = cuotaPromedioDb > 0 ? cuotaPromedioDb : ((breakdown.monthlyPaymentAmort || 0) + adminSeguroFlat);

  const interesTotalDb = Number(oportunidad?.interes_total || 0);
  const interesTotal = interesTotalDb > 0 ? interesTotalDb : (breakdown.totalInterest || 0);
  const costoCreditoDb = Number(oportunidad?.costo_total_credito || 0);
  const costoCredito = costoCreditoDb > 0 ? costoCreditoDb : (interesTotal + serviceTotal + originacionMonto);
  const totalPagar = neto + costoCredito;

  return {
    neto,
    plazo,
    tasa,
    originacionPct,
    montoBruto,
    originacionMonto,
    adminSeguroFlat,
    cuotaTotal,
    costoCredito,
    totalPagar,
  };
};

const BorrowerOfferView = ({ solicitud, oportunidad, onAccept, onReject, loading }) => {
  const [showAmortModal, setShowAmortModal] = useState(false);
  const { neto, plazo, tasa, originacionPct, montoBruto, adminSeguroFlat, cuotaTotal, costoCredito, totalPagar } =
    getOfferFinancials(solicitud, oportunidad);
  const formatMoney = (v) => `Bs ${Number(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const schedule = (() => {
    const items = [];
    const monthlyRate = tasa / 100 / 12;
    const payment = Math.max(0, Number(cuotaTotal || 0) - Number(adminSeguroFlat || 0));
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
      value: `${Number(plazo || 0).toLocaleString('es-BO')} meses`,
    },
    {
      id: 'cuota',
      title: 'Cuota Mensual Tu Préstamo',
      value: formatMoney(cuotaTotal),
      tooltip: 'Cuota mensual final estimada: capital + interés + costo de admin/seguro.',
    },
    {
      id: 'monto',
      title: 'Monto Aprobado (bruto)',
      value: formatMoney(montoBruto),
      tooltip: 'Bruto = saldo deudor verificado + comisión de originación (mínimo Bs 450 si corresponde).',
    },
    {
      id: 'neto',
      title: 'Monto a pagar a tu banco (neto)',
      value: formatMoney(neto),
      tooltip: 'Este es el saldo de tu tarjeta que liquidaremos directo en tu banco acreedor.',
    },
    {
      id: 'admin',
      title: 'Costo Admin + Seguro mensual',
      value: formatMoney(adminSeguroFlat),
      tooltip: 'Costo de administración de plataforma + seguro de desgravamen. Mínimo 10 Bs/mes, baja con el saldo.',
    },
  ];

  return (
    <div className="borrower-dashboard borrower-offer-view">
      <InvestorBreadcrumbs items={[{ label: 'Inicio', to: '/borrower-dashboard' }, { label: 'Propuesta de Crédito' }]} />
      <div className="dashboard-header">
        <p>Bienvenido a tu centro de control. Aquí puedes ver el progreso de tu solicitud.</p>
      </div>
      <ProgressStepper currentStep="prestatario_acepto" allDocumentsUploaded />

      <div className="card">
        <h2 className="tp-section-title">Resumen de tu Solicitud</h2>
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

      <div className="card" style={{ background: '#f7fbfb', border: '1px solid #e6f4f3' }}>
        <p className="muted" style={{ margin: 0 }}>
          Importante: antes de publicar tu oportunidad, necesitamos la firma notariada del contrato. Esto garantiza un desembolso seguro y rápido una vez se complete el fondeo.
        </p>
      </div>

      <div className="card transparency-card">
        <h2 className="tp-section-title">Transparencia Total</h2>
        <p className="muted">Desglose final del crédito a {plazo} meses</p>
        <div style={{ margin: '8px 0', color: '#0d1a26' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Costos Únicos al Desembolso</div>
          <div style={{ fontWeight: 700 }}>
            Comisión por Originación:{' '}
            {neto <= 10000
              ? 'Bs 450.00 (mínimo aplicado)'
              : originacionPct
                ? `${originacionPct}% aplicado en el bruto`
                : 'N/D'}
          </div>
        </div>
        <table className="transparency-table">
          <thead>
            <tr>
              <th>Concepto</th>
              <th className="tp-col">Con Tu Préstamo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Costo del Crédito (Intereses + Comisiones)</td>
              <td className="tp-col">{formatMoney(costoCredito)}</td>
            </tr>
            <tr className="total-row">
              <td><strong>Total a Pagar (Capital + Costos)</strong></td>
              <td className="tp-col"><strong>{formatMoney(totalPagar)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card offer-cta amort-card">
        <div>
          <h2>Tabla de amortización</h2>
          <p className="muted">Consulta el detalle de tus cuotas con capital, interés y admin/seguro.</p>
        </div>
        <div className="offer-cta-actions">
          <button className="btn btn--primary" onClick={() => setShowAmortModal(true)}>Ver tabla</button>
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
                      <td>{formatMoney(row.cuota)}</td>
                      <td>{formatMoney(row.capital)}</td>
                      <td>{formatMoney(row.interes)}</td>
                      <td>{formatMoney(row.adminSeguro)}</td>
                      <td>{formatMoney(row.saldo)}</td>
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

const BorrowerPublishedView = ({ solicitud, oportunidad, userId }) => {
  const { neto, plazo, tasa, originacionPct, montoBruto, originacionMonto, adminSeguroFlat, cuotaTotal, costoCredito, totalPagar } =
    getOfferFinancials(solicitud, oportunidad);
  const adminSeguro = adminSeguroFlat;
  const formatMoney = (v) => `Bs ${Number(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const [disbursement, setDisbursement] = useState(null);
  const [contractLink, setContractLink] = useState(null);
  const [loadingDisb, setLoadingDisb] = useState(false);
  const [disbError, setDisbError] = useState('');
  const [borrowerIntents, setBorrowerIntents] = useState([]);
  const [loadingIntents, setLoadingIntents] = useState(false);
  const [intentsError, setIntentsError] = useState('');
  const [payMode, setPayMode] = useState('qr');
  const [showBorrowerQrModal, setShowBorrowerQrModal] = useState(false);
  const [scheduleRows, setScheduleRows] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const receiptInputRefs = useRef({});
  const [uploadingReceiptId, setUploadingReceiptId] = useState(null);
  const [receiptUploadMessage, setReceiptUploadMessage] = useState('');
  const [receiptUploadError, setReceiptUploadError] = useState('');
  const disbEstado = (disbursement?.estado || '').toLowerCase();
  const oppEstado = (oportunidad?.estado || '').toLowerCase();

  const isNotariadoPending = solicitud?.estado === 'pendiente_notariado' || oppEstado === 'pendiente_notariado';
  const currentStepperState = (() => {
    if (disbEstado === 'pagado' || oppEstado === 'activo') return 'desembolsado';
    if (disbursement || oppEstado === 'fondeada') return 'fondeada';
    if (isNotariadoPending) return 'pendiente_notariado';
    return 'prestatario_acepto';
  })();

  const headerCopy = (() => {
    if (isNotariadoPending) {
      return {
        title: 'Firma notariada pendiente',
        subtitle: 'Antes de publicar tu oportunidad necesitamos la firma notariada del contrato. Apenas esté lista, publicamos tu oportunidad para fondeo.'
      };
    }
    if (disbEstado === 'pagado' || oppEstado === 'activo') {
      return {
        title: 'Tu préstamo fue desembolsado',
        subtitle: 'Pagamos tu tarjeta directamente en tu banco. Tu contrato está al final de la página, al igual que el cronograma de pagos.'
      };
    }
    if (disbursement || oppEstado === 'fondeada') {
      return {
        title: 'Tu oportunidad se fondeó al 100%',
        subtitle: 'Estamos ejecutando el pago dirigido a tu banco. Te avisaremos cuando esté confirmado y podrás descargar tu contrato aquí.'
      };
    }
    return {
      title: 'Tu oportunidad está publicada',
      subtitle: 'Estamos fondeando tu crédito con nuestra comunidad de inversionistas. Cuando esté financiado, pagaremos tu tarjeta directamente en tu banco y te avisaremos por correo.'
    };
  })();

  const breadcrumbLabel = (() => {
    if (isNotariadoPending) return 'Firma notariada';
    if (disbEstado === 'pagado' || oppEstado === 'activo') return 'Préstamo desembolsado';
    if (disbursement || oppEstado === 'fondeada') return '100% fondeada';
    return 'Propuesta publicada';
  })();

  useEffect(() => {
    const fetchDisbursement = async () => {
      if (!oportunidad?.id || !userId) return;
      setLoadingDisb(true);
      setDisbError('');
      try {
        const { data, error } = await supabase
          .from('desembolsos')
          .select('id, estado, monto_bruto, monto_neto, comprobante_url, contract_url, notariado_ok, paid_at, created_at')
          .eq('opportunity_id', oportunidad.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        setDisbursement(data);
        if (data?.contract_url) {
          const { data: signed, error: signedErr } = await supabase
            .storage
            .from('contratos')
            .createSignedUrl(data.contract_url, 60 * 60);
          if (signedErr) throw signedErr;
          setContractLink(signed?.signedUrl || null);
        } else {
          setContractLink(null);
        }
      } catch (err) {
        console.error('Error cargando desembolso:', err);
        setDisbError('No pudimos cargar el desembolso/contrato. Intenta más tarde.');
      } finally {
        setLoadingDisb(false);
      }
    };
    fetchDisbursement();
  }, [oportunidad?.id, userId]);

  const loadBorrowerIntents = useCallback(async () => {
    if (!oportunidad?.id || !userId) return;
    setLoadingIntents(true);
    setIntentsError('');
    setScheduleError('');
    try {
      const { data, error } = await supabase
        .from('borrower_schedule_view')
        .select(`
          amortizacion_id,
          opportunity_id,
          installment_no,
          due_date,
          principal,
          interest,
          payment,
          balance,
          amortizacion_status,
          borrower_payment_intent_id,
          borrower_id,
          expected_amount,
          borrower_status,
          paid_at,
          paid_amount,
          receipt_url,
          intent_updated_at
        `)
        .eq('opportunity_id', oportunidad.id)
        .eq('borrower_id', userId)
        .order('installment_no', { ascending: true });
      if (error) throw error;
      const withSigned = await Promise.all((data || []).map(async (row) => {
        let signedReceipt = null;
        if (row.receipt_url) {
          try {
            const { data: signed, error: signErr } = await supabase
              .storage
              .from('comprobantes-pagos')
              .createSignedUrl(row.receipt_url, 60 * 60);
            if (!signErr) signedReceipt = signed?.signedUrl || null;
          } catch (_) {}
        }
        return { ...row, receipt_signed_url: signedReceipt };
      }));
      setScheduleRows(withSigned.map((row) => ({
        ...row,
        status: row.amortizacion_status,
      })));
      const intents = withSigned
        .filter((row) => row.borrower_payment_intent_id)
        .map((row) => ({
          id: row.borrower_payment_intent_id,
          due_date: row.due_date,
          expected_amount: row.expected_amount,
          status: row.borrower_status,
          paid_at: row.paid_at,
          paid_amount: row.paid_amount,
          receipt_url: row.receipt_url,
          receipt_signed_url: row.receipt_signed_url,
        }));
      setBorrowerIntents(intents);
    } catch (err) {
      console.error('Error cargando cuotas prestatario:', err);
      setIntentsError('No pudimos cargar tus cuotas. Intenta más tarde.');
      setScheduleError('No pudimos cargar el cronograma. Intenta más tarde.');
    } finally {
      setLoadingIntents(false);
    }
  }, [oportunidad?.id, userId]);

  useEffect(() => {
    loadBorrowerIntents();
  }, [loadBorrowerIntents]);

  useEffect(() => {
    if (!oportunidad?.id) return;
    setLoadingSchedule(true);
    setScheduleError('');
    const fetchSchedule = async () => {
      await loadBorrowerIntents();
      setLoadingSchedule(false);
    };
    fetchSchedule();
  }, [oportunidad?.id, loadBorrowerIntents]);

  const summaryItems = [
    { id: 'tasa', title: 'Tasa Propuesta (anual)', value: `${tasa ? tasa.toFixed(1) : '0'}%` },
    { id: 'plazo', title: 'Plazo', value: `${Number(plazo || 0).toLocaleString('es-BO')} meses` },
    { id: 'cuota', title: 'Cuota Mensual Tu Préstamo', value: formatMoney(cuotaTotal), tooltip: 'Cuota mensual final: capital + interés + admin/seguro prorrateado.' },
    { id: 'monto', title: 'Monto Aprobado (bruto)', value: formatMoney(montoBruto), tooltip: 'Bruto = saldo deudor verificado + comisión de originación.' },
    { id: 'neto', title: 'Monto a pagar a tu banco (neto)', value: formatMoney(neto), tooltip: 'Saldo de tu tarjeta que liquidaremos directo en tu banco acreedor.' },
    { id: 'admin', title: 'Costo Admin + Seguro mensual', value: formatMoney(adminSeguro), tooltip: 'Cargo prorrateado en la cuota. Calculado con 0,15% sobre saldo (mínimo 10 Bs) y distribuido en el plazo.' },
  ];

  const formatDate = (value) => {
    if (!value) return 'N/D';
    try {
      return new Date(value).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
      return String(value);
    }
  };
  const dateKey = (value) => {
    if (!value) return '';
    if (typeof value === 'string') {
      const match = value.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch (_) {
      return '';
    }
  };

  const uploadBorrowerReceipt = async (file) => {
    if (!file) return null;
    const path = `borrower/${Date.now()}_${file.name}`;
    const { error, data } = await supabase.storage.from('comprobantes-pagos').upload(path, file, { upsert: true });
    if (error) throw error;
    return data?.path || path;
  };

  const handleBorrowerReceiptChange = async (event, intent) => {
    const file = event?.target?.files?.[0];
    if (!file || !intent?.id) return;
    setReceiptUploadMessage('');
    setReceiptUploadError('');
    setUploadingReceiptId(intent.id);
    try {
      const uploadedPath = await uploadBorrowerReceipt(file);
      const { error } = await supabase
        .from('borrower_payment_intents')
        .update({ receipt_url: uploadedPath })
        .eq('id', intent.id);
      if (error) throw error;
      setReceiptUploadMessage(`Comprobante enviado para la cuota con vencimiento ${formatDate(intent.due_date)}.`);
      await loadBorrowerIntents();
    } catch (err) {
      console.error('Error subiendo comprobante prestatario:', err);
      setReceiptUploadError(err?.message || 'No pudimos subir el comprobante. Intenta nuevamente.');
    } finally {
      setUploadingReceiptId(null);
      if (event?.target) event.target.value = '';
    }
  };

  const normalizeSchedule = () => {
    if (!Array.isArray(scheduleRows)) return [];
    return scheduleRows.map((row, idx) => {
      const rowKey = dateKey(row.due_date);
      const intentByDate = borrowerIntents.find((b) => dateKey(b?.due_date) === rowKey);
      const intentByOrder = borrowerIntents[idx];
      const intent = intentByDate || intentByOrder || null;
      const intentStatus = (intent?.status || '').toLowerCase();
      const rowStatus = (row?.status || '').toLowerCase();
      const isPaid = ['paid', 'pagado'].includes(intentStatus) || rowStatus === 'pagado';
      return {
        ...row,
        intent,
        uiStatus: isPaid ? 'pagado' : (row.status || intent?.status || 'pendiente'),
      };
    });
  };

  const schedule = normalizeSchedule();
  const nextPending = schedule.find((row) => (row.uiStatus || '').toLowerCase() !== 'pagado');
  const nextIntent = nextPending?.intent || null;
  const nextIntentAmount = cuotaTotal || nextIntent?.expected_amount || nextPending?.payment || 0;
  const nextIntentDate = nextIntent?.due_date || nextPending?.due_date;
  const totalCuotas = schedule.length;
  const currentCuotaNumber = nextPending ? (schedule.findIndex((row) => row === nextPending) + 1) : totalCuotas;

  return (
    <div className="borrower-dashboard borrower-offer-view">
      <InvestorBreadcrumbs items={[{ label: 'Inicio', to: '/borrower-dashboard' }, { label: breadcrumbLabel }]} />
      <div className="dashboard-header">
        <h2>{headerCopy.title}</h2>
        <p>{headerCopy.subtitle}</p>
      </div>
      <ProgressStepper
        currentStep={currentStepperState}
        allDocumentsUploaded
        hasDisbursement={!!disbursement}
        disbursementState={disbursement?.estado}
        opportunityState={oportunidad?.estado}
      />

      <div className="card">
        <h2 className="tp-section-title">Resumen de tu Solicitud</h2>
        <div className="loan-summary-grid">
          {summaryItems.map(item => (
            <div key={item.id} className="loan-summary-card">
              <div className="summary-card-title">{item.title}</div>
              <div className="summary-card-value">{item.value}</div>
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
        <h2 className="tp-section-title">Transparencia Total</h2>
        <p className="muted">Desglose final del crédito a {plazo} meses</p>
        <div style={{ margin: '8px 0', color: '#0d1a26' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Costos Únicos al Desembolso</div>
          <div style={{ fontWeight: 700 }}>
            Comisión por Originación:{' '}
            {neto <= 10000
              ? 'Bs 450.00 (mínimo aplicado)'
              : originacionPct
                ? `${originacionPct}% aplicado en el bruto`
                : 'N/D'}
          </div>
        </div>
        <table className="transparency-table">
          <thead>
            <tr>
              <th>Concepto</th>
              <th className="tp-col">Con Tu Préstamo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Costo del Crédito (Intereses + Comisiones)</td>
              <td className="tp-col">{formatMoney(costoCredito)}</td>
            </tr>
            <tr className="total-row">
              <td><strong>Total a Pagar (Capital + Costos)</strong></td>
              <td className="tp-col"><strong>{formatMoney(totalPagar)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      {(oppEstado === 'activo' || disbEstado === 'pagado') && (
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2>Tu próxima cuota</h2>
            <p className="muted">Paga con QR o transferencia. Usa el monto exacto y la referencia de tu nombre/CI.</p>
          </div>
          {loadingIntents && <p className="muted">Cargando tus cuotas...</p>}
          {intentsError && <p style={{ color: 'red' }}>{intentsError}</p>}
          {!loadingIntents && !intentsError && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', alignItems: 'flex-start', textAlign: 'center' }}>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontSize: 14, color: '#385b64' }}>Fecha de vencimiento</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{nextIntentDate ? formatDate(nextIntentDate) : 'Se generará pronto'}</div>
                </div>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontSize: 14, color: '#385b64' }}>Número de cuota</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{totalCuotas ? `Cuota #${currentCuotaNumber}/${totalCuotas}` : 'N/D'}</div>
                </div>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontSize: 14, color: '#385b64' }}>Monto de la cuota</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{formatMoney(nextIntentAmount)}</div>
                </div>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontSize: 14, color: '#385b64' }}>Estado</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#0a7a4b' }}>{nextPending ? 'Pendiente' : 'Al día'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', minWidth: 180 }}>
                  <button className={['btn', payMode === 'qr' ? 'btn--primary' : ''].join(' ')} type="button" onClick={() => setPayMode('qr')}>Pagar con QR</button>
                  <button className={['btn', payMode === 'transfer' ? 'btn--primary' : ''].join(' ')} type="button" onClick={() => setPayMode('transfer')}>Transferencia</button>
                </div>
              </div>

          <div style={{ padding: 12, borderRadius: 10, background: '#f7fbfc', border: '1px solid #a8ede6', display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, color: '#385b64' }}>Comprobante</div>
                <div style={{ fontWeight: 600, color: '#0f5a62' }}>
                  {nextIntent?.receipt_signed_url
                    ? 'Recibido'
                    : nextIntent?.receipt_url
                      ? 'En revisión'
                      : nextPending
                        ? 'Pendiente de envío'
                        : 'No corresponde'}
                </div>
                {nextIntent?.receipt_url && !nextIntent.receipt_signed_url && (
                  <small style={{ color: '#55747b' }}>Validaremos tu comprobante en breve.</small>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {nextIntent?.receipt_signed_url ? (
                  <a className="btn btn--primary" href={nextIntent.receipt_signed_url} target="_blank" rel="noreferrer">Ver comprobante</a>
                ) : nextIntent ? (
                  <>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => receiptInputRefs.current[nextIntent.id]?.click()}
                      disabled={uploadingReceiptId === nextIntent.id}
                    >
                      {uploadingReceiptId === nextIntent.id ? 'Subiendo...' : 'Subir comprobante'}
                    </button>
                    <input
                      ref={(el) => {
                        if (el) {
                          receiptInputRefs.current[nextIntent.id] = el;
                        } else {
                          delete receiptInputRefs.current[nextIntent.id];
                        }
                      }}
                      type="file"
                      accept="application/pdf,image/*"
                      style={{ display: 'none' }}
                      onChange={(event) => handleBorrowerReceiptChange(event, nextIntent)}
                    />
                  </>
                ) : (
                  <small className="muted">Pronto podrás subir el comprobante.</small>
                )}
              </div>
            </div>
            {receiptUploadMessage && <p style={{ color: '#0a7a4b', margin: '0 0 4px 0' }}>{receiptUploadMessage}</p>}
            {receiptUploadError && <p style={{ color: '#b00020', margin: '0 0 4px 0' }}>{receiptUploadError}</p>}
          </div>

              {payMode === 'qr' && (
                <div style={{ padding: 12, border: '1px dashed #a8ede6', borderRadius: 10, background: '#f7fbfc', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                  <p style={{ margin: 0, color: '#0f5a62', fontWeight: 600 }}>Escanea este QR para pagar tu cuota</p>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowBorrowerQrModal(true)}
                    onKeyPress={(e) => { if (e.key === 'Enter') setShowBorrowerQrModal(true); }}
                    style={{ cursor: 'zoom-in', borderRadius: 12, padding: 6, transition: 'transform 0.2s', display: 'inline-block', background: '#fff' }}
                  >
                    <img
                      src="/qr-pago.png"
                      alt="QR de pago Tu Préstamo"
                      style={{ width: 200, height: 200, objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                  <small style={{ color: '#55747b' }}>Monto exacto: {formatMoney(nextIntentAmount)}</small>
                </div>
              )}

              {payMode === 'transfer' && (
                <div style={{ padding: 12, border: '1px dashed #a8ede6', borderRadius: 10, background: '#f7fbfc', display: 'grid', gap: 6 }}>
                  <p style={{ margin: 0, color: '#0f5a62', fontWeight: 600 }}>Datos de transferencia</p>
                  <div style={{ color: '#0d1a26' }}>Banco: Ganadero · Cuenta Corriente</div>
                  <div style={{ color: '#0d1a26' }}>N° de cuenta: 000-0000000</div>
                  <div style={{ color: '#0d1a26' }}>Beneficiario: Tu Préstamo Bolivia SRL</div>
                  <div style={{ color: '#0d1a26' }}>Moneda: Bolivianos</div>
                  <small style={{ color: '#55747b' }}>Monto exacto: {formatMoney(nextIntentAmount)}</small>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {(oportunidad?.estado === 'fondeada' || oportunidad?.estado === 'activo' || disbursement) && (
        <div className="card">
          <h2>Pago dirigido y contrato</h2>
          <p className="muted">
            {isNotariadoPending
              ? 'Para publicar tu oportunidad necesitamos la firma notariada del contrato. Aqui puedes descargar el PDF y agendar la firma.'
              : (disbursement?.paid_at || disbursement?.estado === 'pagado'
                ? 'Ya realizamos el pago de tu tarjeta. Aqui puedes ver el comprobante y tu contrato.'
                : 'Te avisaremos por correo cuando paguemos tu tarjeta. Aqui veras el comprobante y tu contrato PDF.')}
          </p>
          {loadingDisb && <p className="muted">Cargando información de desembolso...</p>}
          {disbError && <p style={{ color: 'red' }}>{disbError}</p>}
          {disbursement ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div><strong>Estado:</strong> {disbursement.estado || 'pendiente'} {disbursement.paid_at ? `(pagado ${new Date(disbursement.paid_at).toLocaleString('es-BO')})` : ''}</div>
              <div><strong>Monto neto al banco:</strong> {formatMoney(disbursement.monto_neto || neto)}</div>
              {!disbursement.notariado_ok && disbursement.estado !== 'pagado' && !disbursement.paid_at && (
                <div style={{ padding: 12, borderRadius: 8, background: '#fff7ec', border: '1px solid #ffd7b0', color: '#8a4b06' }}>
                  <strong>Contrato notariado pendiente.</strong> Para publicar tu oportunidad y continuar con el pago al banco debes agendar la firma notariada.
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {disbursement.comprobante_url ? (
                  <a className="btn" href={disbursement.comprobante_url} target="_blank" rel="noreferrer">Ver comprobante banco</a>
                ) : (
                  <span className="muted">Comprobante en proceso</span>
                )}
                {contractLink ? (
                  <a className="btn btn--primary" href={contractLink} target="_blank" rel="noreferrer">Descargar contrato PDF</a>
                ) : (
                  <span className="muted">Contrato en proceso</span>
                )}
                {!disbursement.notariado_ok && disbursement.estado !== 'pagado' && !disbursement.paid_at && (
                  <a
                    className="btn btn--primary"
                    href={`https://wa.me/59178271936?text=${encodeURIComponent(
                      `Hola, soy ${solicitud?.nombre_completo || 'un cliente'} y mi crédito fue aprobado. Quiero agendar la firma notariada. Solicitud ID ${solicitud?.id || 'N/D'}${(oportunidad?.id || disbursement?.opportunity_id) ? ` / Oportunidad ${oportunidad?.id || disbursement?.opportunity_id}` : ''}.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Agendar firma
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="muted">Aún no registramos el desembolso. Te avisaremos cuando esté listo.</p>
          )}
        </div>
      )}

      {(oppEstado === 'activo' || disbEstado === 'pagado') && (
        <div className="card">
          <h2>Cronograma de pagos</h2>
          <p className="muted">Fechas, montos y estado de cada cuota.</p>
          {(loadingSchedule || loadingIntents) && <p className="muted">Cargando cronograma...</p>}
          {(scheduleError || intentsError) && <p style={{ color: 'red' }}>{scheduleError || intentsError}</p>}
          {!loadingSchedule && !loadingIntents && !scheduleError && !intentsError && (
            <div style={{ overflowX: 'auto' }}>
              <table className="amort-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vence</th>
                    <th>Cuota</th>
                    <th>Capital</th>
                    <th>Interés</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Comprobante</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(row => (
                    <tr key={row.installment_no}>
                      <td>{row.installment_no}</td>
                      <td>{formatDate(row.due_date)}</td>
                      <td>{formatMoney(cuotaTotal || row.payment)}</td>
                      <td>{formatMoney(row.principal)}</td>
                      <td>{formatMoney(row.interest)}</td>
                      <td>{formatMoney(row.balance)}</td>
                      <td>{(row.uiStatus || 'pendiente').toUpperCase()}</td>
                      <td>
                        {row.intent?.receipt_signed_url ? (
                          <a className="btn btn--sm" href={row.intent.receipt_signed_url} target="_blank" rel="noreferrer">Ver comprobante</a>
                        ) : row.intent?.receipt_url ? (
                          <small className="muted">En revisión</small>
                        ) : (
                          <small className="muted">Pendiente</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {showBorrowerQrModal && <QrLightbox src="/qr-pago.png" onClose={() => setShowBorrowerQrModal(false)} />}
    </div>
  );
};

const QrLightbox = ({ src, onClose }) => {
  if (!src) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          padding: 16,
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          maxWidth: '90vw',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img src={src} alt="QR ampliado" style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', margin: '0 auto' }} />
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button className="btn" type="button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTES DE VISTA APROBADA (SIN CAMBIOS) ---
const LoanSummaryCard = ({ title, value, subtext, isPrimary = false }) => ( <div/> );
const AmortizationTable = ({ schedule }) => ( <div/> );
const PaymentHistory = ({ history }) => ( <div/> );
const ApprovedLoanDashboard = ({ loan, user, onLogout }) => {
  // Valores de ejemplo si no hay datos reales del préstamo aún
  const principal = Number(loan?.capital_pendiente || 12000);
  const annualRate = Number(loan?.tasa_anual || 24);
  const months = Number(loan?.plazo_restante || 24);
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
      { id: 'boleta_aviso_electricidad', nombre: 'Boleta de aviso de electricidad', definition: 'Para validar tu dirección y tu historial de pago del servicio eléctrico. Este aviso suele mostrar los últimos meses.', tooltip: 'Sube la boleta de aviso de cobranza de luz eléctrica (historial del último año).' },
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
    const requestedAmountValue = parseNumberValue(solicitud?.saldo_deuda_tc || solicitud?.monto_solicitado);

    const [simulation, setSimulation] = useState({
        montoDeuda: requestedAmountValue || '',
        tasaActual: solicitud.tasa_interes_tc || '',
        plazo: solicitud.plazo_meses || 24,
        costoMantenimientoBanco: '100',
    });

    useEffect(() => {
        if (!solicitud) return;
        const preferredDebt = parseNumberValue(solicitud?.saldo_deuda_tc || solicitud?.monto_solicitado);
        setSimulation(prev => ({
            ...prev,
            montoDeuda: preferredDebt || prev.montoDeuda,
            tasaActual: solicitud.tasa_interes_tc || prev.tasaActual,
            plazo: solicitud.plazo_meses || prev.plazo,
        }));
    }, [solicitud?.saldo_deuda_tc, solicitud?.monto_solicitado, solicitud?.tasa_interes_tc, solicitud?.plazo_meses]);

    const handleSimulationChange = (newValues) => {
        setSimulation(prev => ({ ...prev, ...newValues }));
    };

    useEffect(() => {
      if (!solicitud?.id) return;
      const selectedPlazo = Number(simulation.plazo);
      if (![12, 24, 36, 48].includes(selectedPlazo)) return;
      const persistedPlazo = Number(solicitud.plazo_meses || 0);
      if (persistedPlazo === selectedPlazo) return;

      const timer = setTimeout(async () => {
        const { error } = await supabase
          .from('solicitudes')
          .update({ plazo_meses: selectedPlazo })
          .eq('id', solicitud.id);

        if (error) {
          console.error('No se pudo guardar el plazo seleccionado por el prestatario:', error);
          return;
        }
        if (typeof onRefreshData === 'function') onRefreshData();
      }, 500);

      return () => clearTimeout(timer);
    }, [simulation.plazo, solicitud?.id, solicitud?.plazo_meses, onRefreshData]);

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

    const scrollToDocuments = () => {
        const el = document.getElementById('documentos-section');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

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
                        userId={user?.id}
                        showAmortization={['desembolsado', 'activo', 'en_curso', 'pagado'].includes((solicitud?.estado || '').toLowerCase()) ||
                          ['desembolsado', 'activo', 'en_curso', 'pagado'].includes((activeOpportunity?.estado || '').toLowerCase())}
                    />

                <>
                    <SavingsCalculator 
                            oportunidad={activeOpportunity}
                        simulation={simulation}
                        onSimulationChange={handleSimulationChange}
                        isLocked={solicitud.estado === 'documentos-en-revision'}
                    />
                    <div className="card" style={{ display: 'grid', gap: 10 }}>
                        <div>
                            <h2>Siguiente paso: sube tu documentación</h2>
                            <p className="muted">Para aprobar tu crédito necesitamos verificar tus documentos. Apenas estén completos, el equipo de riesgo revisa y te envía la propuesta final.</p>
                        </div>
                        <div>
                            <button className="btn btn--primary" type="button" onClick={scrollToDocuments}>
                                Subir documentación
                            </button>
                        </div>
                    </div>
                    <div id="documentos-section">
                    <DocumentManager 
                        solicitud={solicitud} 
                        user={user} 
                        uploadedDocuments={documents} 
                        onDocumentUploaded={onDocumentUploaded} 
                        requiredDocs={requiredDocs} 
                        analyzedDocTypes={analyzedDocTypes} 
                        onRefreshData={onRefreshData}
                    />
                    </div>
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
const ProgressStepper = ({ currentStep, allDocumentsUploaded, hasDisbursement = false, disbursementState, opportunityState }) => {
  const steps = [
    'Solicitud Recibida',
    'Verificación Inicial',
    'Sube tus Documentos',
    'Revisión Final',
    'Préstamo Aprobado',
    'Propuesta Publicada',
    '100% Fondeada',
    'Préstamo desembolsado'
  ];
  const getStepStatus = (stepIndex) => {
    const stepMap = {
      'pre-aprobado': 2,
      'documentos-en-revision': 3,
      'aprobado': 4,
      'pendiente_notariado': 4,
      'prestatario_acepto': 5,
      'fondeada': 6,
      'pago_dirigido': 7,
      'desembolsado': 7,
      'pagado': 7,
      'activo': 7
    };
    let currentStepIndex = stepMap[currentStep] || 0;

    if (currentStepIndex === 0 && currentStep !== 'pendiente') {
      currentStepIndex = 1; // ensure verification step is marked when no longer pending
    }

    if (allDocumentsUploaded && currentStepIndex < 3) {
      currentStepIndex = 3;
    }

    const oppState = (opportunityState || '').toLowerCase();
    const disbState = (disbursementState || '').toLowerCase();
    if (oppState === 'fondeada' || hasDisbursement) {
      currentStepIndex = Math.max(currentStepIndex, 6);
    }
    if (['pagado', 'desembolsado', 'activo'].includes(oppState) || disbState === 'pagado') {
      currentStepIndex = Math.max(currentStepIndex, 7);
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
        Primero revisamos tu documentación; si todo está OK, te haremos una videollamada para conocerte. Luego recibirás la propuesta del préstamo en este panel.
      </p>
    </div>
  );
};

const RejectedView = ({ solicitud }) => (
  <div className="borrower-dashboard">
    <InvestorBreadcrumbs items={[{ label: 'Inicio', to: '/borrower-dashboard' }, { label: 'Estado de Solicitud' }]} />
    <div className="dashboard-header">
      <h2>Tu solicitud no fue aprobada en esta ocasión</h2>
      <p className="muted">
        Revisamos tu información con detalle, pero por el momento no podemos aprobar el crédito.
      </p>
    </div>
    <div className="card">
      <p style={{ margin: 0 }}>
        Podrás volver a postular cuando tu situación financiera mejore. Si necesitas ayuda, escríbenos a soporte@tuprestamobo.com.
      </p>
      {solicitud?.id && (
        <div className="muted" style={{ marginTop: 8 }}>Solicitud ID: {solicitud.id}</div>
      )}
    </div>
  </div>
);
const UploadToast = ({ visible }) => (
  <div className={`upload-toast ${visible ? 'upload-toast--visible' : ''}`} role="status" aria-live="polite">
    <span className="upload-toast__icon" aria-hidden="true">✔</span>
    <p>¡Todo listo! Tu solicitud pasa a Revisión Final.</p>
  </div>
);

const StatusCard = ({ solicitud, oportunidad, simulation, pagoTotalMensualTP, userId, showAmortization }) => {
  const monto = Number(simulation.montoDeuda) || 0;
  const tasaBancoAnual = Number(simulation.tasaActual) || 0;
  const plazo = Number(simulation.plazo) || 0;
  const tasaTP = oportunidad?.tasa_interes_prestatario || null;
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
      <h2 className="tp-section-title">Resumen de tu Solicitud</h2>
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

      {showAmortization ? <AmortizationSchedule userId={userId} /> : null}
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
  const isReviewLocked = solicitud?.estado === 'documentos-en-revision';

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
        // El flujo no debe depender de IA: re-evaluar avance por documentos subidos.
        try {
          const { error: notifyError } = await supabase.functions.invoke('notify-uploads-complete', {
            body: { solicitud_id: solicitud.id }
          });
          if (notifyError) console.warn('Error calling notify-uploads-complete (fallback):', notifyError);
        } catch (notifyErr) {
          console.warn('Fallo invocando notify-uploads-complete en fallback manual:', notifyErr);
        }
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
    if (isReviewLocked) return;
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
          // La autorización firmada no pasa por IA, pero sí debe habilitar avance de flujo.
          try {
            const { error: notifyError } = await supabase.functions.invoke('notify-uploads-complete', {
              body: { solicitud_id: solicitud.id }
            });
            if (notifyError) console.warn('Error calling notify-uploads-complete (signed auth):', notifyError);
          } catch (notifyErr) {
            console.warn('Fallo invocando notify-uploads-complete para autorización firmada:', notifyErr);
          }
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
    <div className={`card ${isReviewLocked ? 'document-manager-locked' : ''}`}>
      <h2 className="tp-section-title">Sube tu Documentación</h2>
      {isReviewLocked && (
        <p className="document-lock-copy">
          Tu documentación ya está en revisión final y no puede modificarse en esta etapa.
        </p>
      )}
      <p>
        {isReviewLocked
          ? 'La carga de archivos está temporalmente bloqueada mientras el equipo de riesgo finaliza la revisión.'
          : 'Arrastra y suelta tus archivos en las casillas correspondientes o haz clic para seleccionarlos. Formatos aceptados: PDF, JPG, PNG.'}
      </p>
      <div className="document-grid">
        {requiredDocs.map(doc => {
          // Considerar documento "subido" si existe registro, sin depender del estado específico
          const hasLegacyFactura = doc.id === 'boleta_aviso_electricidad' && uploadedDocuments.some(d => d.tipo_documento === 'factura_servicio');
          const isUploaded = uploadedDocuments.some(d => d.tipo_documento === doc.id) || hasLegacyFactura;
          const isAnalyzed = analyzedSet.has(doc.id) || (doc.id === 'boleta_aviso_electricidad' && analyzedSet.has('factura_servicio'));
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
                onManualRetry={() => handleRetryAnalysis(
                  uploadedDocuments.find(d => d.tipo_documento === doc.id) ||
                  (doc.id === 'boleta_aviso_electricidad' ? uploadedDocuments.find(d => d.tipo_documento === 'factura_servicio') : null)
                )}
                onFileSelect={(file) => handleFileUpload(file, doc.id)}
                disabled={isReviewLocked || ((isUploadingGlobal && !uploadProgress[doc.id]) || (isAuthFirmada && !authPreprintUrl))}
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
          disabled={globalHelpRequested || isReviewLocked}
        >
          {globalHelpRequested ? 'Ayuda solicitada' : 'Necesito ayuda para subir un documento'}
        </button>
        {globalHelpRequested && !isReviewLocked && (
          <span className="help-pill-subtext">Te contactaremos en breve para ayudarte.</span>
        )}
        {isReviewLocked && (
          <span className="help-pill-subtext">Si necesitas una corrección, contacta al equipo de soporte.</span>
        )}
      </div>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL DEL DASHBOARD ---
const BorrowerDashboard = () => {
  const cached = useMemo(() => getCachedDashboard(), []);
  const [user, setUser] = useState(null);
  const [solicitud, setSolicitud] = useState(cached.solicitud || null);
  const [loading, setLoading] = useState(!cached.solicitud);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState(cached.documents || []);
  const [analyzedDocTypes, setAnalyzedDocTypes] = useState(cached.analyzedDocTypes || []);
  const [proposalLoading, setProposalLoading] = useState(false);
  const navigate = useNavigate();
  const hasHydratedFromCache = useRef(false);

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
      let analyzedTypes = [];
      try {
        const { data: analyzedData } = await supabase
          .from('analisis_documentos')
          .select('document_type')
          .eq('solicitud_id', solData.id);
        analyzedTypes = (analyzedData || []).map(d => d.document_type);
        setAnalyzedDocTypes(analyzedTypes);
      } catch (_) {}

      try {
        sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
          solicitud: solicitudConOpps,
          documents: docsData || [],
          analyzedDocTypes: analyzedTypes,
        }));
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
    if (hasHydratedFromCache.current) return;
    hasHydratedFromCache.current = true;
    fetchData({ silent: true });
  }, [fetchData]);

  // El scroll se conserva desde el layout persistente; aquí no forzamos movimientos.

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

  if (loading && !solicitud) return <div className="borrower-dashboard">Cargando tu panel...</div>;
  if (error) return <div className="borrower-dashboard" style={{ color: 'red' }}>Error: {error}</div>;
  
  const estadoSolicitud = solicitud?.estado;

  if (estadoSolicitud === 'aprobado_para_oferta') {
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

  if (['rechazado', 'rechazado_final'].includes(estadoSolicitud)) {
    return <RejectedView solicitud={solicitud} />;
  }

  if (['pendiente_notariado', 'prestatario_acepto', 'fondeada', 'desembolsado', 'activo', 'en_curso', 'pagado'].includes(estadoSolicitud)) {
    const opp = Array.isArray(solicitud.oportunidades) ? solicitud.oportunidades[0] : null;
    return <BorrowerPublishedView solicitud={solicitud} oportunidad={opp} userId={user?.id} />;
  }

  if (estadoSolicitud === 'aprobado') {
    const opp = Array.isArray(solicitud.oportunidades) ? solicitud.oportunidades[0] : null;
    return <BorrowerOfferView solicitud={solicitud} oportunidad={opp} onAccept={() => handleProposalDecision('Aceptar')} onReject={() => handleProposalDecision('Rechazar')} loading={proposalLoading} />;
  }

  if (!solicitud) return <div className="borrower-dashboard">No tienes solicitudes activas.</div>;

  return <InProgressApplicationView solicitud={solicitud} user={user} documents={documents} onDocumentUploaded={handleDocumentUploaded} onLogout={handleLogout} analyzedDocTypes={analyzedDocTypes} onRefreshData={refreshData} />;
};

export default BorrowerDashboard;


