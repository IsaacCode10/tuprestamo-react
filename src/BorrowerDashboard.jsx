
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

import './BorrowerDashboard.css'; // Importamos los nuevos estilos
import SavingsCalculator from '@/components/SavingsCalculator.jsx';

// --- Componentes de UI específicos para el Dashboard ---

const ProgressStepper = ({ currentStep }) => {
  const steps = [
    'Solicitud Recibida',
    'Verificación Inicial',
    'Sube tus Documentos',
    'Revisión Final',
    'Préstamo Aprobado',
  ];

  const getStepStatus = (stepIndex) => {
    const stepMap = {
      'pre-aprobado': 2, // 'Sube tus Documentos' es el paso 2 (índice)
      'documentos-en-revision': 3,
      'aprobado': 4,
    };
    const currentStepIndex = stepMap[currentStep] || 0;

    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="card">
      <ul className="progress-stepper">
        {steps.map((label, index) => (
          <li key={label} className={`step ${getStepStatus(index)}`}>
            <span className="step-icon">
              {getStepStatus(index) === 'completed' ? '✔' : index + 1}
            </span>
            <span className="step-label">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const StatusCard = ({ solicitud }) => (
  <div className="card">
    <h2>Estado de tu Solicitud</h2>
    <div className="status-card-content">
      <span className="status-highlight">
        {solicitud.estado === 'pre-aprobado'
          ? 'Acción Requerida: Sube tus documentos'
          : `Estado Actual: ${solicitud.estado}`}
      </span>
      <div className="loan-details">
        <div>
          <span className="detail-label">Monto Solicitado</span>
          <span className="detail-value">Bs {solicitud.monto_solicitado}</span>
        </div>
        <div>
          <span className="detail-label">Tasa Anual</span>
          <span className="detail-value">{solicitud.tasa_interes || 'N/A'}%</span>
        </div>
        <div>
          <span className="detail-label">Cuota Mensual (Aprox)</span>
          <span className="detail-value">Bs {solicitud.cuota_mensual || 'N/A'}</span>
        </div>
        <div>
          <span className="detail-label">Plazo</span>
          <span className="detail-value">{solicitud.plazo_meses} meses</span>
        </div>
      </div>
    </div>
  </div>
);

const DocumentManager = ({ solicitud, user, uploadedDocuments, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const requiredDocs = [
    { value: 'CI_Anverso', label: 'Cédula de Identidad (Anverso)' },
    { value: 'CI_Reverso', label: 'Cédula de Identidad (Reverso)' },
    { value: 'Factura_Servicio_Basico', label: 'Factura de Servicio Básico' },
  ];

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      alert('Por favor, selecciona un tipo de documento y un archivo.');
      return;
    }
    setUploading(true);
    setError(null);
    const filePath = `${user.id}/${solicitud.id}/${documentType}_${Date.now()}_${selectedFile.name}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from('documentos-prestatarios')
        .upload(filePath, selectedFile);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('documentos-prestatarios')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('documentos').insert({
        solicitud_id: solicitud.id,
        user_id: user.id,
        nombre_archivo: selectedFile.name,
        tipo_documento: documentType,
        url_archivo: publicUrlData.publicUrl,
      });
      if (insertError) throw insertError;
      
      onUpload(); // Llama a la función para refrescar datos
      setSelectedFile(null);
      setDocumentType('');

    } catch (err) {
      console.error('Error al subir documento:', err);
      setError('Error al subir el documento: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const findDocument = (docType) => uploadedDocuments.find(d => d.tipo_documento === docType);

  return (
    <div className="card">
      <h2>Sube tu Documentación</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {/* Formulario de subida */}
      <div className="upload-form">
        <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} disabled={uploading}>
          <option value="">-- Elige el tipo de documento --</option>
          {requiredDocs.map(doc => (
            <option key={doc.value} value={doc.value} disabled={!!findDocument(doc.value)}>
              {doc.label} {findDocument(doc.value) ? '(Subido)' : ''}
            </option>
          ))}
        </select>
        <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} disabled={uploading || !documentType} />
        <button onClick={handleUpload} disabled={uploading || !selectedFile || !documentType}>
          {uploading ? 'Subiendo...' : 'Subir'}
        </button>
      </div>

      {/* Lista de documentos */}
      <ul className="document-list">
        {requiredDocs.map(doc => {
          const uploadedDoc = findDocument(doc.value);
          return (
            <li key={doc.value} className="document-item">
              <div className="document-info">
                <span className="doc-icon">{uploadedDoc ? '📄' : '📎'}</span>
                <span className="doc-name">{doc.label}</span>
              </div>
              {uploadedDoc ? (
                <div className="document-status-container">
                  <span className={`document-status status-${uploadedDoc.estado.replace('_', '-')}`}>
                    {uploadedDoc.estado.replace('_', ' ')}
                  </span>
                   <a href={uploadedDoc.url_archivo} target="_blank" rel="noopener noreferrer" className="btn-view">Ver</a>
                </div>
              ) : (
                 <span className="document-status status-pending">Pendiente</span>
              )}
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
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      const { data: solData, error: solError } = await supabase
        .from('solicitudes')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false })
        .limit(1);

      if (solError) throw solError;
      if (!solData.length) {
        setError('No se encontró una solicitud de préstamo para tu cuenta.');
        return;
      }
      const currentSolicitud = solData[0];
      setSolicitud(currentSolicitud);

      const { data: docsData, error: docsError } = await supabase
        .from('documentos')
        .select('*')
        .eq('solicitud_id', currentSolicitud.id);
      
      if (docsError) throw docsError;
      setDocuments(docsData);

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Hubo un problema al cargar tu información: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return <div className="borrower-dashboard">Cargando tu panel...</div>;
  }

  if (error) {
    return <div className="borrower-dashboard" style={{ color: 'red' }}>Error: {error}</div>;
  }

  if (!solicitud) {
    return <div className="borrower-dashboard">No tienes solicitudes activas.</div>;
  }

  return (
    <div className="borrower-dashboard">
      
      <div className="dashboard-header">
        <h1>Hola, {user?.user_metadata?.nombre || 'Prestatario'}</h1>
        <p>Bienvenido a tu centro de control. Aquí puedes ver el progreso de tu solicitud.</p>
      </div>

      <ProgressStepper currentStep={solicitud.estado} />
      
      <StatusCard solicitud={solicitud} />

      {solicitud.estado === 'pre-aprobado' && (
        <>
          <SavingsCalculator />
          <DocumentManager 
            solicitud={solicitud} 
            user={user}
            uploadedDocuments={documents}
            onUpload={fetchData} // Pasamos la función para refrescar
          />
        </>
      )}

      <button onClick={handleLogout} className="logout-button">Cerrar Sesión</button>
    </div>
  );
};

export default BorrowerDashboard;
