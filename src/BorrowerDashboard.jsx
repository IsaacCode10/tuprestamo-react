import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

import './BorrowerDashboard.css';
import SavingsCalculator from '@/components/SavingsCalculator.jsx';
import FloatingFinan from '@/components/FloatingFinan.jsx';
import HelpTooltip from '@/components/HelpTooltip.jsx';

// --- Funciones de Cálculo y Helpers ---
const calcularPagoMensual = (monto, tasaAnual, plazoMeses) => {
  if (monto <= 0 || plazoMeses <= 0) return 0;
  if (tasaAnual <= 0) return monto / plazoMeses;
  const tasaMensual = tasaAnual / 100 / 12;
  const factor = Math.pow(1 + tasaMensual, plazoMeses);
  const pago = monto * (tasaMensual * factor) / (factor - 1);
  return pago;
};

const generateAmortizationSchedule = (principal, annualRate, months, adminFeeRate, desgravamenRate, adminFeeMin) => {
  let outstandingBalance = principal;
  const monthlyRate = annualRate / 100 / 12;
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

const getProfileMessage = (profile) => {
  switch (profile) {
    case 'A': return '¡Excelente Perfil!';
    case 'B': return '¡Muy Buen Perfil!';
    case 'C': return '¡Buen Perfil!';
    default: return null; // No mostrar nada si no hay perfil o es un valor inesperado
  }
};


// --- Componentes de UI ---

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

const StatusCard = ({ solicitud, oportunidad, cuotaRealPromedio }) => {
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
            <span className="detail-value">Bs {solicitud.monto_solicitado}</span>
          </div>
          <div>
            <span className="detail-label">Tasa Anual Asignada
              <HelpTooltip definition="Es el costo anual del crédito, expresado como un porcentaje. No incluye comisiones ni otros gastos." />
            </span>
            <span className="detail-value">{tasaAnual !== 'N/A' ? tasaAnual.toFixed(1) : 'N/A'}%</span>
            {profileMessage && <span className="profile-badge">{profileMessage}</span>}
          </div>
          <div>
            <span className="detail-label">Cuota Mensual (Promedio)
              <HelpTooltip definition="Es el monto aproximado que pagarás cada mes. Incluye el capital, intereses, costo administrativo y seguro de desgravamen." />
            </span>
            <span className="detail-value">Bs {cuotaRealPromedio ? cuotaRealPromedio.toFixed(2) : 'N/A'}</span>
          </div>
          <div>
            <span className="detail-label">Plazo</span>
            <span className="detail-value">{solicitud.plazo_meses} meses</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DocumentManager = ({ solicitud, user, uploadedDocuments, onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const getRequiredDocs = (situacionLaboral) => {
    const baseDocs = [
      { id: 'ci_anverso', nombre: 'Cédula de Identidad (Anverso)' },
      { id: 'ci_reverso', nombre: 'Cédula de Identidad (Reverso)' },
      { id: 'factura_servicio', nombre: 'Factura Servicio Básico (Luz, Agua, etc.)' },
      { id: 'extracto_tarjeta', nombre: 'Extracto de la Tarjeta de Crédito a refinanciar' },
      { id: 'selfie_ci', nombre: 'Selfie sosteniendo tu Cédula de Identidad' },
    ];

    const situacionDocs = {
      'Dependiente': [
        { id: 'boleta_pago', nombre: 'Última Boleta de Pago' },
        { id: 'certificado_gestora', nombre: 'Certificado de la Gestora Pública' },
      ],
      'Independiente': [
        { id: 'extracto_bancario_3m', nombre: 'Extracto Bancario (Últimos 3 meses)' },
        { id: 'nit', nombre: 'Número de Identificación Tributaria (NIT)' },
      ],
      'Jubilado': [
        { id: 'boleta_jubilacion', nombre: 'Boleta de Pago de Jubilación' },
      ],
    };

    return [...baseDocs, ...(situacionDocs[situacionLaboral] || [])];
  };

  const handleFileUpload = async (event, docId) => {
    try {
      setUploading(docId);
      setError(null);
      const file = event.target.files[0];
      if (!file) {
        throw new Error('No seleccionaste ningún archivo.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${solicitud.id}_${docId}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('documentos-prestatarios')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Registrar en la tabla 'documentos'
      const { error: dbError } = await supabase.from('documentos').upsert({
        solicitud_id: solicitud.id,
        user_id: user.id,
        tipo_documento: docId,
        nombre_archivo: fileName,
        url_archivo: filePath,
        estado: 'subido'
      }, { onConflict: ['solicitud_id', 'tipo_documento'] });

      if (dbError) {
        throw dbError;
      }

      onUpload(); // Refrescar la lista de documentos
    } catch (error) {
      console.error("Error al subir el archivo:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const requiredDocs = getRequiredDocs(solicitud.situacion_laboral);

  return (
    <div className="card">
      <h2>Sube tu Documentación</h2>
      <p>Para continuar, necesitamos que subas los siguientes documentos. Asegúrate de que sean legibles.</p>
      {error && <p className="error-message">{error}</p>}
      <ul className="document-list">
        {requiredDocs.map(doc => {
          const isUploaded = uploadedDocuments.some(d => d.tipo_documento === doc.id && d.estado === 'subido');
          const isUploading = uploading === doc.id;
          return (
            <li key={doc.id} className={`document-item ${isUploaded ? 'uploaded' : ''}`}>
              <span className="document-name">{doc.nombre}</span>
              <div className="document-status">
                {isUploaded ? (
                  <span className="status-label uploaded">✓ Subido</span>
                ) : (
                  <label className={`upload-button ${isUploading ? 'disabled' : ''}`}>
                    {isUploading ? 'Subiendo...' : 'Seleccionar Archivo'}
                    <input
                      type="file"
                      disabled={isUploading}
                      onChange={(e) => handleFileUpload(e, doc.id)}
                      accept="image/*,application/pdf"
                    />
                  </label>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};


// --- Componente Principal del Dashboard ---

const BorrowerDashboard = () => {
  const [user, setUser] = useState(null);
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setUser(user);

      const { data: solData, error: solError } = await supabase.from('solicitudes').select(`*, oportunidades!solicitudes_opportunity_id_fkey(*)`).eq('email', user.email).order('created_at', { ascending: false }).limit(1);
      if (solError) throw solError;
      if (!solData.length) { setError('No se encontró una solicitud de préstamo para tu cuenta.'); return; }
      const currentSolicitud = solData[0];
      setSolicitud(currentSolicitud);

      const { data: docsData, error: docsError } = await supabase.from('documentos').select('*').eq('solicitud_id', currentSolicitud.id);
      if (docsError) throw docsError;
      setDocuments(docsData);

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Hubo un problema al cargar tu información: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) return <div className="borrower-dashboard">Cargando tu panel...</div>;
  if (error) return <div className="borrower-dashboard" style={{ color: 'red' }}>Error: {error}</div>;
  if (!solicitud) return <div className="borrower-dashboard">No tienes solicitudes activas.</div>;

  let cuotaRealPromedio = null;
  if (solicitud && solicitud.oportunidades) {
    const oportunidad = solicitud.oportunidades;
    const pagoAmortizacionTP = calcularPagoMensual(solicitud.monto_solicitado, oportunidad.tasa_interes_prestatario, solicitud.plazo_meses);
    const { totalAdminFees, totalDesgravamenFees } = generateAmortizationSchedule(solicitud.monto_solicitado, oportunidad.tasa_interes_prestatario, solicitud.plazo_meses, oportunidad.comision_administracion_porcentaje / 100, oportunidad.seguro_desgravamen_porcentaje / 100, 10);
    cuotaRealPromedio = (pagoAmortizacionTP * solicitud.plazo_meses + totalAdminFees + totalDesgravamenFees) / solicitud.plazo_meses;
  }

  return (
    <div className="borrower-dashboard">
      <div className="dashboard-header">
        <h1>Hola, {user?.user_metadata?.full_name || 'Prestatario'}</h1>
        <p>Bienvenido a tu centro de control. Aquí puedes ver el progreso de tu solicitud.</p>
      </div>

      <ProgressStepper currentStep={solicitud.estado} />
      
      <StatusCard solicitud={solicitud} oportunidad={solicitud.oportunidades} cuotaRealPromedio={cuotaRealPromedio} />

      {solicitud.estado === 'pre-aprobado' && (
        <>
          <SavingsCalculator solicitud={solicitud} oportunidad={solicitud.oportunidades} />
          <DocumentManager solicitud={solicitud} user={user} uploadedDocuments={documents} onUpload={fetchData} />
        </>
      )}

      <button onClick={handleLogout} className="logout-button">Cerrar Sesión</button>

      <FloatingFinan />
    </div>
  );
};

export default BorrowerDashboard;
