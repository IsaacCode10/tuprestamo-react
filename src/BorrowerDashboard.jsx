import React, { useState, useEffect } from 'react';
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

// --- LISTAS DE FAQs CONTEXTUALES ---
const approvedLoanFaqs = [
  { question: '¿Cuáles son las formas de pago aceptadas?', answer: 'Actualmente, aceptamos pagos por transferencia bancaria. Pronto habilitaremos pagos con tarjeta y QR. Recibirás los detalles en tu correo.' },
  { question: '¿Qué significa la tarjeta "Progreso"?', answer: 'Muestra cuántas cuotas has pagado del total de tu crédito. Por ejemplo, \'1 / 18\' significa que has completado 1 de 18 pagos.' },
  { question: '¿Puedo adelantar cuotas?', answer: '¡Sí! Puedes realizar pagos anticipados para reducir el capital de tu deuda y pagar menos intereses a largo plazo. Contacta a soporte para coordinar un pago anticipado.' },
  { question: '¿Qué pasa si me atraso en un pago?', answer: 'Entendemos que pueden surgir imprevistos. Por favor, contacta a nuestro equipo de soporte lo antes posible para explorar opciones. Ten en cuenta que los atrasos pueden generar intereses moratorios según tu contrato.' }
];

const inProgressFaqs = [
  {
    question: '¿Qué es la Tasa Anual Asignada?',
    answer: 'Es el costo que pagas por tu crédito cada año, expresado como un porcentaje. No incluye otros gastos como comisiones o seguros.'
  },
  {
    question: '¿Qué incluye la Cuota Mensual?',
    answer: 'Tu cuota mensual es un promedio que incluye el pago del capital que te prestamos, los intereses, el costo administrativo mensual y el seguro de desgravamen.'
  },
  {
    question: '¿Por qué debo subir mis documentos?',
    answer: 'Necesitamos verificar tu identidad y tu capacidad de pago para poder darte la aprobación final de tu préstamo. ¡Es el último paso!'
  },
  {
    question: '¿Mis documentos están seguros?',
    answer: 'Sí, tu información es confidencial y está protegida. Solo la usamos para el análisis de tu crédito.'
  }
];

// --- MOCK DATA PARA LA VISTA DE PRÉSTAMO APROBADO ---
const mockLoanData = {
  montoAprobado: 3000,
  saldoPendiente: 2838.71,
  proximaCuota: 198.79,
  fechaProximoPago: '2025-10-15',
  cuotasPagadas: 1,
  cuotasTotales: 18,
  tasaAnual: 15.0,
  historialPagos: [
    { fecha: '2025-09-15', monto: 198.79, estado: 'Pagado' },
  ],
  tablaAmortizacion: [
    { mes: 1, cuota: 198.79, interes: 37.50, capital: 161.29, saldo: 2838.71, estado: 'Pagado' },
    { mes: 2, cuota: 198.79, interes: 35.48, capital: 163.31, saldo: 2675.40, estado: 'Pendiente' },
    { mes: 3, cuota: 198.79, interes: 33.44, capital: 165.35, saldo: 2510.05, estado: 'Pendiente' },
    { mes: 4, cuota: 198.79, interes: 31.38, capital: 167.41, saldo: 2342.64, estado: 'Pendiente' },
    { mes: 5, cuota: 198.79, interes: 29.28, capital: 169.51, saldo: 2173.13, estado: 'Pendiente' },
  ],
};

// --- MOCK DATA PARA NOTIFICACIONES ---
const mockNotifications = [
  { id: 1, message: 'Tu pago de Bs 198.79 para el mes de Septiembre ha sido procesado con éxito.', time: 'hace 2 días', read: false },
  { id: 2, message: 'Recordatorio: El pago de tu próxima cuota vence en 15 días.', time: 'hace 1 semana', read: false },
  { id: 3, message: '¡Bienvenido a tu nuevo panel de control de prestatario!', time: 'hace 2 semanas', read: true },
];


// --- VISTA PARA PRÉSTAMO APROBADO/DESEMBOLSADO ---

const LoanSummaryCard = ({ title, value, subtext, isPrimary = false }) => (
  <div className={`loan-summary-card ${isPrimary ? 'primary' : ''}`}>
    <h3 className="summary-card-title">{title}</h3>
    <p className="summary-card-value">{value}</p>
    {subtext && <p className="summary-card-subtext">{subtext}</p>}
  </div>
);

const AmortizationTable = ({ schedule }) => (
  <div className="card amortization-table">
    <h3>Tabla de Amortización</h3>
    <table>
      <thead>
        <tr>
          <th>Mes</th>
          <th>Cuota Total</th>
          <th>Interés</th>
          <th>Capital</th>
          <th>Saldo Restante</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {schedule.map(row => (
          <tr key={row.mes}>
            <td>{row.mes}</td>
            <td>Bs {row.cuota.toFixed(2)}</td>
            <td>Bs {row.interes.toFixed(2)}</td>
            <td>Bs {row.capital.toFixed(2)}</td>
            <td>Bs {row.saldo.toFixed(2)}</td>
            <td><span className={`status status-${row.estado.toLowerCase()}`}>{row.estado}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PaymentHistory = ({ history }) => (
  <div className="card payment-history">
    <h3>Historial de Pagos</h3>
    {history.length === 0 ? (
      <p>Aún no has realizado ningún pago.</p>
    ) : (
      <table>
        <thead>
          <tr>
            <th>Fecha de Pago</th>
            <th>Monto Pagado</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {history.map((payment, index) => (
            <tr key={index}>
              <td>{new Date(payment.fecha).toLocaleDateString('es-ES')}</td>
              <td>Bs {payment.monto.toFixed(2)}</td>
              <td><span className={`status status-${payment.estado.toLowerCase()}`}>{payment.estado}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const ApprovedLoanDashboard = ({ loan, user, onLogout }) => {
  return (
    <div className="borrower-dashboard approved">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Hola, {user?.user_metadata?.full_name || 'Prestatario'}</h1>
          <p>Este es el resumen de tu préstamo con Tu Préstamo.</p>
        </div>
        <NotificationBell notifications={mockNotifications} />
      </div>

      <div className="loan-summary-grid">
        <LoanSummaryCard 
          title="Saldo Pendiente" 
          value={`Bs ${loan.saldoPendiente.toLocaleString('es-BO', {minimumFractionDigits: 2})}`}
          isPrimary
        />
        <LoanSummaryCard 
          title="Próxima Cuota" 
          value={`Bs ${loan.proximaCuota.toLocaleString('es-BO', {minimumFractionDigits: 2})}`}
        />
        <LoanSummaryCard 
          title="Fecha de Próximo Pago" 
          value={new Date(loan.fechaProximoPago).toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit', year: 'numeric'})}
        />
        <LoanSummaryCard 
          title="Progreso" 
          value={`${loan.cuotasPagadas} / ${loan.cuotasTotales}`}
          subtext="Cuotas Pagadas"
        />
      </div>

      <div className="payment-cta-section">
        <button className="cta-button">Realizar Pago</button>
        <p>Tu próximo pago vence en {Math.ceil((new Date(loan.fechaProximoPago) - new Date()) / (1000 * 60 * 60 * 24))} días.</p>
      </div>

      <PaymentHistory history={loan.historialPagos} />
      
      <AmortizationTable schedule={loan.tablaAmortizacion} />

      <FloatingFinan faqItems={approvedLoanFaqs} />
    </div>
  );
};


// --- VISTA PARA SOLICITUD EN PROGRESO ---

const InProgressApplicationView = ({ solicitud, user, documents, onUpload, onLogout, fetchData }) => {
    const oportunidadObj = Array.isArray(solicitud.oportunidades) && solicitud.oportunidades.length > 0
        ? solicitud.oportunidades[0]
        : null;

    // --- STATE LIFTING: Central state for the simulation ---
    const [simulation, setSimulation] = useState({
        montoDeuda: solicitud.monto_solicitado || '',
        tasaActual: solicitud.tasa_interes_tc || '',
        plazo: solicitud.plazo_meses || 24,
        costoMantenimientoBanco: '100', // Default value
    });

    // Handler to update simulation state from child components
    const handleSimulationChange = (newValues) => {
        setSimulation(prev => ({ ...prev, ...newValues }));
    };

    // --- CENTRALIZED CALCULATION ---
    const { totalAPagar } = calcularCostosTuPrestamo(
        parseFloat(simulation.montoDeuda),
        oportunidadObj?.tasa_interes_prestatario,
        simulation.plazo,
        oportunidadObj?.comision_originacion_porcentaje
    );
    const pagoTotalMensualTP = totalAPagar > 0 ? totalAPagar / simulation.plazo : 0;

    return (
        <>
            <Header />
            <div className="borrower-dashboard">
                <div className="dashboard-header">
                    <p>Bienvenido a tu centro de control. Aquí puedes ver el progreso de tu solicitud.</p>
                </div>
                <ProgressStepper currentStep={solicitud.estado} />
                
                {/* StatusCard now receives simulation data */}
                <StatusCard 
                    solicitud={solicitud} 
                    oportunidad={oportunidadObj} 
                    simulation={simulation}
                    pagoTotalMensualTP={pagoTotalMensualTP}
                />

                {/* FIX: Always show calculator and document manager in this view for development */}
                <>
                    <SavingsCalculator 
                        oportunidad={oportunidadObj}
                        simulation={simulation}
                        onSimulationChange={handleSimulationChange}
                    />
                    <DocumentManager solicitud={solicitud} user={user} uploadedDocuments={documents} onUpload={fetchData} />
                </>
                <FloatingFinan faqItems={inProgressFaqs} />
            </div>
        </>
    );
}

// (Todos los componentes y helpers de la vista original se mantienen aquí)

const getProfileMessage = (profile) => {
  switch (profile) {
    case 'A': return '¡Excelente Perfil!';
    case 'B': return '¡Muy Buen Perfil!';
    case 'C': return '¡Buen Perfil!';
    default: return null;
  }
};

const ProgressStepper = ({ currentStep }) => {
  const steps = ['Solicitud Recibida', 'Verificación Inicial', 'Sube tus Documentos', 'Revisión Final', 'Préstamo Aprobado'];
  const getStepStatus = (stepIndex) => {
    const stepMap = { 'pre-aprobado': 2, 'documentos-en-revision': 3, 'aprobado': 4 };
    const currentStepIndex = stepMap[currentStep] || 0;
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
        totalAPagar: total_a_pagar,
    };
};

const StatusCard = ({ solicitud, oportunidad, simulation, pagoTotalMensualTP }) => {
  const tasaAnual = oportunidad?.tasa_interes_prestatario || 'N/A';
  const profileMessage = oportunidad?.perfil_riesgo ? getProfileMessage(oportunidad.perfil_riesgo) : null;

  return (
    <div className="card">
      <h2>Estado de tu Solicitud</h2>
      <div className="status-card-content">
        <span className="status-highlight">{solicitud.estado === 'pre-aprobado' ? 'Acción Requerida: Sube tus documentos' : `Estado Actual: ${solicitud.estado}`}</span>
        <div className="loan-details">
          <div>
            <span className="detail-label">Monto Solicitado</span>
            {/* This now comes from the simulation state */}
            <span className="detail-value">Bs {simulation.montoDeuda}</span>
          </div>
          <div>
            <span className="detail-label">Tasa Anual Asignada
              <HelpTooltip text="Es el costo anual del crédito, expresado como un porcentaje. No incluye comisiones ni otros gastos." />
            </span>
            <span className="detail-value">{tasaAnual !== 'N/A' ? tasaAnual.toFixed(1) : 'N/A'}%</span>
            {profileMessage && <span className="profile-badge">{profileMessage}</span>}
          </div>
          <div>
            <span className="detail-label">Cuota Mensual (Promedio)
              <HelpTooltip text="Es el monto aproximado que pagarás cada mes. Incluye el capital, intereses, costo administrativo y seguro de desgravamen." />
            </span>
            {/* This is now passed as a prop */}
            <span className="detail-value">Bs {pagoTotalMensualTP ? pagoTotalMensualTP.toFixed(2) : 'N/A'}</span>
          </div>
          <div>
            <span className="detail-label">Plazo</span>
            {/* This now comes from the simulation state */}
            <span className="detail-value">{simulation.plazo} meses</span>
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '15px', textAlign: 'center', padding: '0 1rem' }}>
          *Estos son cálculos preliminares. El monto final y las cuotas se confirmarán después de la verificación de tus documentos.
        </p>
      </div>
    </div>
  );
};

const FileSlot = ({ doc, isUploaded, isUploading, isAnalysing, progress, error, onFileSelect, disabled }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = React.useRef();

  const handleDrag = (e, isOver) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setDragOver(isOver);
  };

  const handleDrop = (e) => {
    handleDrag(e, false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (disabled) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const status = isAnalysing
    ? 'Analizando con IA...'
    : isUploading
    ? `Subiendo... ${progress}%`
    : isUploaded
    ? 'Completado'
    : 'Pendiente';

  return (
    <div
      className={`file-slot ${dragOver ? 'dragging' : ''} ${isUploaded ? 'completed' : ''} ${isAnalysing ? 'analysing' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={(e) => handleDrag(e, true)}
      onDragEnter={(e) => handleDrag(e, true)}
      onDragLeave={(e) => handleDrag(e, false)}
      onDrop={handleDrop}
      onClick={() => !isUploading && !isUploaded && !disabled && inputRef.current.click()}
    >
      <input
        type="file"
        ref={inputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        disabled={isUploading || isUploaded || disabled}
      />
      <div className="file-slot-icon">
        {isUploaded ? '✅' : isAnalysing ? '🧠' : isUploading ? '...': '📄'}
      </div>
      <div className="file-slot-info">
                  <div className="file-slot-name">
                    {doc.nombre}
                    <HelpTooltip text={doc.definition} />
                  </div>        <span className={`file-slot-status status-${status.toLowerCase().replace(/\.\.\./g, '')}`}>{status}</span>
        {isUploading && (
          <div className="progress-bar">
            <div className="progress-bar-inner" style={{ width: `${progress}%` }}></div>
          </div>
        )}
        {error && <span className="file-slot-error">{error}</span>}
      </div>
      {!isUploaded && !isUploading && !isAnalysing && !disabled && (
        <div className="file-slot-action">
          <span>+</span>
        </div>
      )}
    </div>
  );
};

const DocumentManager = ({ solicitud, user, uploadedDocuments, onUpload }) => {
  const [uploadProgress, setUploadProgress] = useState({});
  const [analysing, setAnalysing] = useState({});
  const [errors, setErrors] = useState({});
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);

  const getRequiredDocs = (situacionLaboral) => {
    const baseDocs = [
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

  const handleFileUpload = async (file, docId) => {
    if (!file) return;

    // Evento de analítica: Inicio de subida de documento
    trackEvent('Started Document Upload', {
      document_type: docId,
    });

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

      const { error: uploadError } = await supabase.storage.from('documentos-prestatarios').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      setUploadProgress(prev => ({ ...prev, [docId]: 100 }));

      const { error: dbError } = await supabase.from('documentos').upsert({ solicitud_id: solicitud.id, user_id: user.id, tipo_documento: docId, nombre_archivo: fileName, url_archivo: filePath, estado: 'subido' }, { onConflict: ['solicitud_id', 'tipo_documento'] });
      if (dbError) throw dbError;

      setAnalysing(prev => ({ ...prev, [docId]: true }));

      // Invoke the Supabase Edge Function instead of the old Vercel-style API
      const { error: functionError } = await supabase.functions.invoke('analizar-documento-v2', {
        body: {
          filePath: filePath,
          documentType: docId,
          solicitud_id: solicitud.id
        },
      });

      if (functionError) {
        throw functionError;
      }

      onUpload();

      // Evento de analítica: Documento subido con éxito
      trackEvent('Successfully Uploaded Document', {
        document_type: docId,
      });

    } catch (error) {
      console.error("Error en el proceso de carga y análisis:", error);

      // Evento de analítica: Fallo en la subida de documento
      trackEvent('Failed Document Upload', {
        document_type: docId,
        error_message: error.message,
      });

      setErrors(prev => ({ ...prev, [docId]: `Error: ${error.message}` }));
    } finally {
      setUploadProgress(prev => ({ ...prev, [docId]: undefined }));
      setAnalysing(prev => ({ ...prev, [docId]: false }));
      setIsUploadingGlobal(false);
    }
  };

  const requiredDocs = getRequiredDocs(solicitud.situacion_laboral);

  return (
    <div className="card">
      <h2>Sube tu Documentación</h2>
      <p>Arrastra y suelta tus archivos en las casillas correspondientes o haz clic para seleccionarlos. Formatos aceptados: PDF, JPG, PNG.</p>
      <div className="document-grid">
        {requiredDocs.map(doc => {
          const isUploaded = uploadedDocuments.some(d => d.tipo_documento === doc.id && d.estado === 'subido');
          const progress = uploadProgress[doc.id];
          const isUploading = typeof progress === 'number';
          const isAnalysing = analysing[doc.id];
          const error = errors[doc.id];

          return (
            <FileSlot
              key={doc.id}
              doc={doc}
              isUploaded={isUploaded}
              isUploading={isUploading}
              isAnalysing={isAnalysing}
              progress={progress}
              error={error}
              onFileSelect={(file) => handleFileUpload(file, doc.id)}
              disabled={isUploadingGlobal && !isUploading}
            />
          );
        })}
      </div>
    </div>
  );
};


// --- Componente Principal del Dashboard ---

const BorrowerDashboard = () => {
  // Analítica centralizada via trackEvent

  // FORZAR ESTADO PARA SIMULACIÓN DE UI: 'en-progreso' o 'desembolsado'
  const [simulationStatus, setSimulationStatus] = useState('en-progreso');

  const [user, setUser] = useState(null);
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Capturamos el evento cuando el componente se monta
    trackEvent('Viewed Borrower Dashboard');
  }, );

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      // 1. Fetch la solicitud principal
      const { data: solData, error: solError } = await supabase
        .from('solicitudes')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(); // .single() para obtener un objeto, no un array

      if (solError) throw solError;
      if (!solData) {
        setError('No se encontró una solicitud de préstamo para tu cuenta.');
        setLoading(false);
        return;
      }

      let finalSolicitud = { ...solData, oportunidades: [] };

      // 2. Si hay un opportunity_id, fetch la oportunidad correspondiente
      if (solData.opportunity_id) {
        const { data: oppData, error: oppError } = await supabase
          .from('oportunidades')
          .select('*')
          .eq('id', solData.opportunity_id)
          .single();

        if (oppError) {
          console.warn('Se encontró un opportunity_id, pero hubo un error al cargar la oportunidad:', oppError);
        } else if (oppData) {
          // 3. Combina los datos
          finalSolicitud.oportunidades = [oppData];
        }
      }
      
      setSolicitud(finalSolicitud);

      // Fetch de documentos (sin cambios)
      const { data: docsData, error: docsError } = await supabase.from('documentos').select('*').eq('solicitud_id', solData.id);
      if (docsError) throw docsError;

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Hubo un problema al cargar tu información: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [navigate]);

  const handleLogout = async () => {
    trackEvent('Logged Out');
    resetMixpanel();
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) return <div className="borrower-dashboard">Cargando tu panel...</div>;
  if (error) return <div className="borrower-dashboard" style={{ color: 'red' }}>Error: {error}</div>;
  
  // --- Lógica de Renderizado Condicional ---
  const effectiveStatus = simulationStatus || solicitud?.estado;

  if (effectiveStatus === 'desembolsado' || effectiveStatus === 'aprobado') {
    return <ApprovedLoanDashboard loan={mockLoanData} user={user} onLogout={handleLogout} />;
  }

  if (!solicitud) return <div className="borrower-dashboard">No tienes solicitudes activas.</div>;

  return <InProgressApplicationView solicitud={solicitud} user={user} documents={documents} onUpload={fetchData} onLogout={handleLogout} fetchData={fetchData} />;
};

// Force refresh for Vercel cache
export default BorrowerDashboard;





