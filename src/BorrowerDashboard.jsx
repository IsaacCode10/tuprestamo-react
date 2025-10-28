import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { resetMixpanel } from './analytics';
import { Link, useNavigate } from 'react-router-dom';

import './BorrowerDashboard.css';
import SavingsCalculator from '@/components/SavingsCalculator.jsx';
import FloatingFinan from '@/components/FloatingFinan.jsx';
import HelpTooltip from '@/components/HelpTooltip.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import Header from './components/Header';
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
const ApprovedLoanDashboard = ({ loan, user, onLogout }) => ( <div/> );

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

    const { totalAPagar } = calcularCostosTuPrestamo(
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
                <div className="dashboard-header">
                    <p>Bienvenido a tu centro de control. Aquí puedes ver el progreso de tu solicitud.</p>
                </div>
                <ProgressStepper currentStep={solicitud.estado} allDocumentsUploaded={allDocumentsUploaded} />
                
                <StatusCard 
                    solicitud={solicitud} 
                    oportunidad={oportunidadObj} 
                    simulation={simulation}
                    pagoTotalMensualTP={pagoTotalMensualTP}
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

const calcularCostosTuPrestamo = (principal, annualRate, termMonths, originacion_porcentaje) => {
    if (!principal || !annualRate || !termMonths || !originacion_porcentaje) {
        return { totalAPagar: 0 };
    }
    const monthlyRate = annualRate / 100 / 12;
    const pmt = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
    const totalAPagar = pmt * termMonths + (principal * (originacion_porcentaje / 100));
    return isFinite(totalAPagar) ? { totalAPagar } : { totalAPagar: 0 };
};

const StatusCard = ({ solicitud, oportunidad, simulation, pagoTotalMensualTP }) => {
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
          <div className="summary-item"><strong>Comisión de Originación</strong><div>{comisionOriginacion != null ? `${Number(comisionOriginacion).toFixed(1)}%` : '—'}</div></div>
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
