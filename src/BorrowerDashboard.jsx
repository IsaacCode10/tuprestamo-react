import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { resetMixpanel } from './analytics';
import { Link, useNavigate } from 'react-router-dom';

import './BorrowerDashboard.css';
import SavingsCalculator from '@/components/SavingsCalculator.jsx';
import FloatingFinan from '@/components/FloatingFinan.jsx';
import HelpTooltip from '@/components/HelpTooltip.jsx';
import { annuityPayment, applyExtraPaymentReduceTerm } from '@/utils/amortization.js';
import NotificationBell from './components/NotificationBell.jsx';
import Header from './components/Header';
import InvestorBreadcrumbs from '@/components/InvestorBreadcrumbs.jsx';
import { trackEvent } from '@/analytics.js';

// --- LISTAS DE FAQs CONTEXTUALES (SIN CAMBIOS) ---
const approvedLoanFaqs = [];
const inProgressFaqs = [];

// --- MOCK DATA (SIN CAMBIOS) ---
const mockLoanData = {};
const mockNotifications = [];

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
      setLoading(false);
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
  const baseDocs = [
    { id: 'autorizacion_infocred', nombre: 'Autorización Consulta Infocred', definition: 'Documento generado automáticamente que nos autoriza a consultar tu historial crediticio.' },
    { id: 'ci_anverso', nombre: 'Cédula de Identidad (Anverso)', definition: 'Para verificar tu identidad y cumplir con las regulaciones bolivianas (KYC - Conoce a tu Cliente).' },
    { id: 'ci_reverso', nombre: 'Cédula de Identidad (Reverso)', definition: 'Para verificar tu identidad y cumplir con las regulaciones bolivianas (KYC - Conoce a tu Cliente).' },
    { id: 'factura_servicio', nombre: 'Factura Servicio Básico', definition: 'Para confirmar tu dirección de residencia actual. Puede ser una factura de luz, agua o gas de los últimos 3 meses.' },
    { id: 'extracto_tarjeta', nombre: 'Extracto de Tarjeta de Crédito', definition: 'Necesitamos tu último extracto mensual para verificar datos clave: saldo deudor, tasa de interés, cargos por mantenimiento y el número de cuenta. Esto es crucial para calcular tu ahorro y para realizar el pago directo de la deuda por ti.' },
    { id: 'selfie_ci', nombre: 'Selfie con Cédula de Identidad', definition: 'Una medida de seguridad adicional para prevenir el fraude y asegurar que realmente eres tú quien solicita el préstamo. Sostén tu CI al lado de tu cara.' },
  ];
  const situacionDocs = {
    'Dependiente': [
      { id: 'boleta_pago', nombre: 'Última Boleta de Pago', definition: 'Para verificar tus ingresos mensuales y tu relación laboral como dependiente.' },
      { id: 'certificado_gestora', nombre: 'Certificado de la Gestora Pública', definition: 'Confirma tus aportes y nos ayuda a complementar el análisis de tus ingresos.' },
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
  return [...baseDocs, ...(situacionDocs[situacionLaboral] || [])];
};

// --- VISTA PARA SOLICITUD EN PROGRESO ---
const InProgressApplicationView = ({ solicitud, user, documents, onUpload, onLogout, fetchData }) => {
    const oportunidadObj = Array.isArray(solicitud.oportunidades) && solicitud.oportunidades.length > 0
        ? solicitud.oportunidades[0]
        : null;

    const [simulation, setSimulation] = useState({
        montoDeuda: solicitud.monto_solicitado || '',
        tasaActual: solicitud.tasa_interes_tc || '',
        plazo: solicitud.plazo_meses || 24,
        costoMantenimientoBanco: '100',
    });

    const handleSimulationChange = (newValues) => {
        setSimulation(prev => ({ ...prev, ...newValues }));
    };

    const { totalAPagar, commission: originacionMonto, minApplied } = calcularCostosTuPrestamo(
        parseFloat(simulation.montoDeuda),
        oportunidadObj?.tasa_interes_prestatario,
        simulation.plazo,
        oportunidadObj?.comision_originacion_porcentaje
    );
    const pagoTotalMensualTP = totalAPagar > 0 ? totalAPagar / simulation.plazo : 0;

    const requiredDocs = getRequiredDocs(solicitud.situacion_laboral);
    const allDocumentsUploaded = requiredDocs.every(doc => 
        documents.some(uploadedDoc => uploadedDoc.tipo_documento === doc.id && uploadedDoc.estado === 'subido')
    );

    return (
        <>
            <Header />
            <div className="borrower-dashboard">
                <InvestorBreadcrumbs items={[{ label: 'Inicio', to: '/borrower-dashboard' }, { label: 'Mi Solicitud' }]} />
                <div className="dashboard-header">
                    <p>Bienvenido a tu centro de control. Aquí puedes ver el progreso de tu solicitud.</p>
                </div>
                <ProgressStepper currentStep={solicitud.estado} allDocumentsUploaded={allDocumentsUploaded} />
                
                <StatusCard 
                    solicitud={solicitud} 
                    oportunidad={oportunidadObj} 
                    simulation={simulation}
                    pagoTotalMensualTP={pagoTotalMensualTP}
                    originacionMonto={originacionMonto}
                    minApplied={minApplied}
                />

                <>
                    <SavingsCalculator 
                        oportunidad={oportunidadObj}
                        simulation={simulation}
                        onSimulationChange={handleSimulationChange}
                    />
                    <DocumentManager solicitud={solicitud} user={user} uploadedDocuments={documents} onUpload={fetchData} requiredDocs={requiredDocs} />
                </>
                <FloatingFinan faqItems={inProgressFaqs} />
            </div>
        </>
    );
}

const getProfileMessage = (profile) => { /* ... */ };

// --- PROGRESS STEPPER CON LÓGICA DE UI MEJORADA ---
const ProgressStepper = ({ currentStep, allDocumentsUploaded }) => {
  const steps = ['Solicitud Recibida', 'Verificación Inicial', 'Sube tus Documentos', 'Revisión Final', 'Préstamo Aprobado'];
  const getStepStatus = (stepIndex) => {
    const stepMap = { 'pre-aprobado': 2, 'documentos-en-revision': 3, 'aprobado': 4 };
    let currentStepIndex = stepMap[currentStep] || 0;

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

const calcularCostosTuPrestamo = (principalNet, annualRate, termMonths, originacion_porcentaje) => {
    if (!principalNet || !annualRate || !termMonths || !originacion_porcentaje) {
        return { totalAPagar: 0, commission: 0, minApplied: false, principalBruto: 0 };
    }
    const net = Number(principalNet) || 0;
    const p = Number(originacion_porcentaje) / 100;
    // Política MVP: 450 Bs fijos hasta 10.000 Bs netos; arriba, % con gross-up.
    const MIN_ORIGINACION = 450;
    const THRESHOLD_NET = 10000;
    let commission = 0;
    let principalBruto = 0;
    let minApplied = false;
    if (net <= THRESHOLD_NET) {
        commission = MIN_ORIGINACION;
        principalBruto = net + commission;
        minApplied = true;
    } else {
        const feePctIfGross = net * p / (1 - p);
        commission = feePctIfGross;
        principalBruto = net / (1 - p);
        minApplied = false;
    }
    const monthlyRate = Number(annualRate) / 100 / 12;
    const n = Number(termMonths) || 0;
    let pmt = 0;
    if (n > 0) {
        pmt = monthlyRate > 0 ? (principalBruto * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n)) : (principalBruto / n);
    }
    const totalAPagar = isFinite(pmt) ? pmt * n : 0;
    return { totalAPagar, commission, minApplied, principalBruto, monthlyPayment: pmt };
};

const StatusCard = ({ solicitud, oportunidad, simulation, pagoTotalMensualTP, originacionMonto, minApplied }) => {
  const monto = Number(simulation.montoDeuda) || 0;
  const tasaBancoAnual = Number(simulation.tasaActual) || 0;
  const plazo = Number(simulation.plazo) || 0;
  const costoMant = Number(simulation.costoMantenimientoBanco) || 0;

  const monthlyRateBank = tasaBancoAnual / 100 / 12;
  const cuotaBanco = monthlyRateBank > 0 && plazo > 0
    ? (monto * monthlyRateBank) / (1 - Math.pow(1 + monthlyRateBank, -plazo)) + costoMant
    : 0;

  const tasaTP = oportunidad?.tasa_interes_prestatario ?? null;
  const comisionOriginacion = oportunidad?.comision_originacion_porcentaje ?? null;

  return (
    <div className="card">
      <h2>Resumen de tu Solicitud</h2>
      <div className="status-card-content">
        <p className="status-highlight">Tu solicitud está en proceso. Revisa los datos clave:</p>
        <div className="summary-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1rem',
          textAlign: 'left'
        }}>
          <div className="summary-item"><strong>Monto Solicitado</strong><div>Bs. {monto.toLocaleString()}</div></div>
          <div className="summary-item"><strong>Tasa Banco (anual)</strong><div>{tasaBancoAnual ? `${tasaBancoAnual.toFixed(1)}%` : '—'}</div></div>
          <div className="summary-item"><strong>Tasa Propuesta (anual)</strong><div>{tasaTP != null ? `${Number(tasaTP).toFixed(1)}%` : '—'}</div></div>
          <div className="summary-item"><strong>Cuota Mensual Banco</strong><div>Bs. {cuotaBanco > 0 ? cuotaBanco.toFixed(2) : '—'}</div></div>
          <div className="summary-item"><strong>Cuota Mensual Tu Préstamo</strong><div>Bs. {pagoTotalMensualTP > 0 ? pagoTotalMensualTP.toFixed(2) : '—'}</div></div>
          <div className="summary-item"><strong>Comisión de Originación</strong>
            <div>{comisionOriginacion != null ? `${Number(comisionOriginacion).toFixed(1)}%` : '—'}</div>
            {originacionMonto > 0 && (
              <div style={{ fontSize: '0.9em', color: '#444' }}>Monto estimado: Bs. {Number(originacionMonto).toFixed(2)} {minApplied ? '(mínimo aplicado)' : ''}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
const FileSlot = ({ doc, isUploaded, isUploading, isAnalysing, progress, error, onFileSelect, disabled }) => {
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

  const statusClass = isUploading
    ? 'status-subiendo'
    : isUploaded
    ? 'status-completado'
    : 'status-pendiente';

  const statusText = error
    ? 'Error al subir'
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
        <div className="file-slot-name">{doc.nombre}</div>
        <div className={`file-slot-status ${statusClass}`}>{statusText}</div>
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
const DocumentManager = ({ solicitud, user, uploadedDocuments, onUpload, requiredDocs }) => {
  const [uploadProgress, setUploadProgress] = useState({});
  const [analysing, setAnalysing] = useState({});
  const [errors, setErrors] = useState({});
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);

  const handleFileUpload = async (file, docId) => {
    if (!file) return;
    trackEvent('Started Document Upload', { document_type: docId });

    if (isUploadingGlobal) {
      setErrors(prev => ({ ...prev, [docId]: "Espera a que la subida actual termine." }));
      return;
    }

    setIsUploadingGlobal(true);
    setUploadProgress(prev => ({ ...prev, [docId]: 0 }));
    setErrors(prev => ({ ...prev, [docId]: null }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${solicitud.id}_${docId}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      await supabase.storage.from('documentos-prestatarios').upload(filePath, file, { upsert: true });
      setUploadProgress(prev => ({ ...prev, [docId]: 100 }));

      await supabase.from('documentos').upsert({ solicitud_id: solicitud.id, user_id: user.id, tipo_documento: docId, nombre_archivo: fileName, url_archivo: filePath, estado: 'subido' }, { onConflict: ['solicitud_id', 'tipo_documento'] });

      // Ejecutar análisis en segundo plano (dejamos que Realtime refresque la UI)
      setAnalysing(prev => ({ ...prev, [docId]: true }));
      supabase.functions
        .invoke('analizar-documento-v2', {
          body: { filePath: filePath, documentType: docId, solicitud_id: solicitud.id },
        })
        .then(async ({ error }) => {
          if (error) console.warn('Error en analizar-documento-v2:', error);
          const { error: notifyError } = await supabase.functions.invoke('notify-uploads-complete', {
            body: { solicitud_id: solicitud.id }
          });
          if (notifyError) console.warn('Error calling notify-uploads-complete:', notifyError);
        })
        .catch(err => {
          console.warn('Fallo invocando analizar-documento-v2:', err);
        })
        .finally(() => {
          setAnalysing(prev => ({ ...prev, [docId]: false }));
          // No forzamos refresco; Realtime gestiona las actualizaciones
        });
      trackEvent('Successfully Uploaded Document', { document_type: docId });

    } catch (error) {
      console.error("Error en el proceso de carga y análisis:", error);
      trackEvent('Failed Document Upload', { document_type: docId, error_message: error.message });
      setErrors(prev => ({ ...prev, [docId]: `Error: ${error.message}` }));
    } finally {
      setUploadProgress(prev => ({ ...prev, [docId]: undefined }));
      setIsUploadingGlobal(false);
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
          return (
            <FileSlot
              key={doc.id}
              doc={doc}
              isUploaded={isUploaded}
              isUploading={!!uploadProgress[doc.id]}
              isAnalysing={!!analysing[doc.id]}
              progress={uploadProgress[doc.id]}
              error={errors[doc.id]}
              onFileSelect={(file) => handleFileUpload(file, doc.id)}
              disabled={isUploadingGlobal && !uploadProgress[doc.id]}
            />
          );
        })}
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
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
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

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Hubo un problema al cargar tu información: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    trackEvent('Viewed Borrower Dashboard');
    fetchData(); 
  }, [navigate]);

  // Suscripción en tiempo real a cambios de 'documentos' para esta solicitud
  useEffect(() => {
    if (!solicitud?.id) return;
    const channel = supabase
      .channel(`documentos-solicitud-${solicitud.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'documentos', filter: `solicitud_id=eq.${solicitud.id}` }, () => fetchData())
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch (_) {}
    };
  }, [solicitud?.id]);

  const handleLogout = async () => {
    trackEvent('Logged Out');
    resetMixpanel();
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) return <div className="borrower-dashboard">Cargando tu panel...</div>;
  if (error) return <div className="borrower-dashboard" style={{ color: 'red' }}>Error: {error}</div>;
  
  if (solicitud?.estado === 'desembolsado' || solicitud?.estado === 'aprobado') {
    return <ApprovedLoanDashboard loan={mockLoanData} user={user} onLogout={handleLogout} />;
  }

  if (!solicitud) return <div className="borrower-dashboard">No tienes solicitudes activas.</div>;

  return <InProgressApplicationView solicitud={solicitud} user={user} documents={documents} onUpload={fetchData} onLogout={handleLogout} fetchData={fetchData} />;
};

export default BorrowerDashboard;
