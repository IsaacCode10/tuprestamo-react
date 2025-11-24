import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import './RiskAnalystDashboard.css';
import HelpTooltip from './components/HelpTooltip';
import DecisionModal from './DecisionModal'; // Importar el nuevo modal

const getRequiredDocsBySituation = (situacion) => {
  const baseDocs = ['ci_anverso', 'ci_reverso', 'factura_servicio', 'extracto_tarjeta', 'selfie_ci'];
  const map = {
    Dependiente: [...baseDocs, 'boleta_pago', 'certificado_gestora'],
    Independiente: [...baseDocs, 'extracto_bancario_m1', 'extracto_bancario_m2', 'extracto_bancario_m3', 'nit'],
    Jubilado: [...baseDocs, 'boleta_jubilacion'],
  };
  return map[situacion] || baseDocs;
};

const FALLBACK_PROFILE = {
  id: '12345-abcde',
  nombre_completo: 'Isaac Alfaro (Prueba)',
  ci: '1234567 LP',
  ingresos_mensuales: 12000,
  deuda_total_declarada: 25000,
  dti: '35%',
  score_confianza: 85,
  estado: 'listo_para_revision',
  documentos_validados: [
    { tipo_documento: 'CI Anverso', estado: 'Verificado' },
    { tipo_documento: 'CI Reverso', estado: 'Verificado' },
    { tipo_documento: 'Factura Servicio Básico', estado: 'Verificado' },
    { tipo_documento: 'Boleta Tarjeta Crédito', estado: 'Pendiente' },
    { tipo_documento: 'Foto Selfie con CI', estado: 'Rechazado' },
  ]
};

const RiskAnalystDashboard = () => {
  const [perfiles, setPerfiles] = useState([]);
  const [loading, setLoading] = useState(false); // Inicia en false
  const [error, setError] = useState(null);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null);
  const [showOnlyComplete, setShowOnlyComplete] = useState(false);
  // ----------------------------------

  // State para el modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState(null); // 'Aprobado' or 'Rechazado'
  const [isSavingDecision, setIsSavingDecision] = useState(false);

  // State para el cálculo de gross-up
  const [saldoDeudorVerificado, setSaldoDeudorVerificado] = useState('');
  const [montoTotalPrestamo, setMontoTotalPrestamo] = useState(null);
  const [helpRequests, setHelpRequests] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [analisisDocs, setAnalisisDocs] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const [infocredSignedUrl, setInfocredSignedUrl] = useState(null);
  const [uploadingInfocred, setUploadingInfocred] = useState(false);
  const [infocredError, setInfocredError] = useState(null);
  const [docLinks, setDocLinks] = useState({});
  const [docLinksLoading, setDocLinksLoading] = useState({});
  const infocredInputRef = React.useRef(null);
  const COMISION_ORIGINACION = { A: 0.03, B: 0.04, C: 0.05 };
  const TASA_INTERES_PRESTATARIO = { A: 15, B: 17, C: 20 };
  const DEFAULT_COMISION = 0.05; // fallback conservador
  const [infocredScore, setInfocredScore] = useState('');
  const [infocredRiskLevel, setInfocredRiskLevel] = useState('');
  const [savingInfocredMeta, setSavingInfocredMeta] = useState(false);

  /* --- SECCIÓN DE FETCHING DE DATOS REALES (DESACTIVADA TEMPORALMENTE) ---
  const fetchPerfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('perfiles_de_riesgo')
        .select('*')
        .eq('estado', 'listo_para_revision');

      if (error) throw error;

      setPerfiles(data || []);
      if (data && data.length > 0) {
        setPerfilSeleccionado(data[0]);
      } else {
        setPerfilSeleccionado(null);
      }
    } catch (err) {
      setError('No se pudieron cargar los perfiles. ' + err.message);
      console.error("Error fetching risk profiles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerfiles();
  }, [fetchPerfiles]);
  */

  const perfilRiesgo = useMemo(() => {
    const raw = perfilSeleccionado?.perfil_riesgo || perfilSeleccionado?.perfil || perfilSeleccionado?.risk_profile;
    return raw ? String(raw).toUpperCase() : null;
  }, [perfilSeleccionado?.perfil_riesgo, perfilSeleccionado?.perfil, perfilSeleccionado?.risk_profile]);

  const comisionOriginacion = useMemo(() => {
    return (perfilRiesgo && COMISION_ORIGINACION[perfilRiesgo]) ?? DEFAULT_COMISION;
  }, [perfilRiesgo]);

  // Efecto para calcular el Gross-Up con la comisión según perfil
  useEffect(() => {
    const saldo = parseFloat(saldoDeudorVerificado);
    if (saldo > 0 && comisionOriginacion > 0 && comisionOriginacion < 1) {
      const montoCalculado = saldo / (1 - comisionOriginacion);
      setMontoTotalPrestamo(montoCalculado.toFixed(2));
    } else {
      setMontoTotalPrestamo(null);
    }
  }, [saldoDeudorVerificado, comisionOriginacion]);

  const handleSelectPerfil = (perfil) => {
    setPerfilSeleccionado(perfil);
    // Limpiar los campos de cálculo al cambiar de perfil
    setSaldoDeudorVerificado('');
    setMontoTotalPrestamo(null);
    setInfocredError(null);
    setInfocredScore('');
    setInfocredRiskLevel('');
  };

  // Abre el modal para tomar la decisión
  const handleOpenDecisionModal = (decision) => {
    setDecisionType(decision);
    setIsModalOpen(true);
  };

  // Se ejecuta al confirmar la decisión en el modal
  const handleSubmitDecision = async (decisionData) => {
    setIsSavingDecision(true);
    try {
      const payload = {
        solicitud_id: perfilSeleccionado?.id,
        decision: decisionData.decision,
        motivo: decisionData.motivo,
        notas: decisionData.notas,
        monto_bruto_aprobado: montoTotalPrestamo ? Number(montoTotalPrestamo) : null,
        perfil_riesgo: perfilRiesgo,
        plazo_meses: perfilSeleccionado?.plazo_meses || 24,
      };
      const { data, error } = await supabase.functions.invoke('registrar-decision-final', {
        body: payload,
      });
      if (error) throw error;
      setError(null);
      alert(data?.message || 'Decisión registrada.');
      // refrescar perfiles para reflejar estado
      fetchPerfiles();
    } catch (err) {
      console.error('Error guardando decisión:', err);
      alert('Hubo un inconveniente al guardar la decisión. Intenta nuevamente.');
    } finally {
      setIsSavingDecision(false);
      setIsModalOpen(false);
    }
  };
  
  useEffect(() => {
    const fetchHelpRequests = async () => {
      const { data, error } = await supabase
        .from('document_help_requests')
        .select('id, solicitud_id, created_at, status, payload, solicitudes (id, email, nombre_completo, estado)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching help requests:', error);
        return;
      }
      setHelpRequests(data || []);
    };
    fetchHelpRequests();
  }, []);

  const isProfileComplete = (perfil) => {
    const validatedDocs = perfil?.documentos_validados || [];
    if (validatedDocs.length > 0) {
      return validatedDocs.every(doc => (doc.estado || '').toLowerCase() === 'verificado');
    }
    const analyzedSet = new Set((analisisDocs || []).map(a => a.document_type));
    if (documentos.length === 0 && analyzedSet.size === 0) return false;
    const docsCovered = documentos.reduce((acc, doc) => {
      const estado = (doc.estado || '').toLowerCase();
      const ok = ['analizado', 'subido', 'verificado', 'validado'].some(s => estado.includes(s));
      if (ok && doc.tipo_documento) acc.add(doc.tipo_documento);
      return acc;
    }, new Set());
    const requiredDocs = getRequiredDocsBySituation(perfil?.situacion_laboral);
    return requiredDocs.every(docId => docsCovered.has(docId) || analyzedSet.has(docId));
  };

  const fetchDocumentos = useCallback(async (solicitudId) => {
    if (!solicitudId) return;
    setDocLoading(true);
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('solicitud_id', solicitudId);
      if (error) throw error;
      setDocumentos(data || []);
      const { data: analizados, error: analError } = await supabase
        .from('analisis_documentos')
        .select('document_type, analysed_at')
        .eq('solicitud_id', solicitudId);
      if (!analError) {
        setAnalisisDocs(analizados || []);
      }
    } catch (err) {
      console.error('Error cargando documentos:', err);
    } finally {
      setDocLoading(false);
    }
  }, []);

  useEffect(() => {
    if (perfilSeleccionado?.id) {
      fetchDocumentos(perfilSeleccionado.id);
      const score = perfilSeleccionado?.metricas_evaluacion?.infocred_score;
      const risk = perfilSeleccionado?.metricas_evaluacion?.infocred_risk_level;
      setInfocredScore(score ?? '');
      setInfocredRiskLevel(risk ?? '');
    } else {
      setDocumentos([]);
      setInfocredSignedUrl(null);
      setInfocredScore('');
      setInfocredRiskLevel('');
    }
  }, [perfilSeleccionado?.id, perfilSeleccionado?.metricas_evaluacion, fetchDocumentos]);

  const infocredDoc = documentos.find(doc => doc.tipo_documento === 'historial_infocred');

  useEffect(() => {
    const buildSignedUrl = async () => {
      if (!infocredDoc?.url_archivo) {
        setInfocredSignedUrl(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .storage
          .from('documentos-prestatarios')
          .createSignedUrl(infocredDoc.url_archivo, 60 * 30);
        if (error) throw error;
        setInfocredSignedUrl(data?.signedUrl || null);
      } catch (err) {
        console.error('No se pudo generar URL firmada de INFOCRED:', err);
        setInfocredSignedUrl(null);
      }
    };
    buildSignedUrl();
  }, [infocredDoc?.url_archivo]);

  const handleOpenDoc = async (doc) => {
    if (!doc?.url_archivo) return;
    const docId = doc.tipo_documento || doc.id;
    setDocLinksLoading(prev => ({ ...prev, [docId]: true }));
    try {
      const { data, error } = await supabase
        .storage
        .from('documentos-prestatarios')
        .createSignedUrl(doc.url_archivo, 60 * 15);
      if (error) throw error;
      const link = data?.signedUrl;
      setDocLinks(prev => ({ ...prev, [docId]: link }));
      if (link) window.open(link, '_blank');
    } catch (err) {
      console.error('No se pudo abrir el documento:', err);
      const msg = err?.message || 'Error desconocido';
      alert(`No pudimos abrir el documento. Detalle: ${msg}. Reintenta o revisa permisos.`);
    } finally {
      setDocLinksLoading(prev => {
        const next = { ...prev };
        delete next[docId];
        return next;
      });
    }
  };

  const filteredPerfiles = showOnlyComplete
    ? perfiles.filter(p => isProfileComplete(p))
    : perfiles;

  const fetchPerfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Traer solicitudes base
      const { data: solicitudesData, error: solicitudesError } = await supabase
        .from('solicitudes')
        .select('*')
        .eq('estado', 'documentos-en-revision')
        .order('created_at', { ascending: false });
      if (solicitudesError) throw solicitudesError;

      const solicitudIds = (solicitudesData || []).map(i => i.id).filter(Boolean);

      // 2) Traer perfiles de riesgo desde oportunidades
      let oportunidadesMap = {};
      if (solicitudIds.length > 0) {
        const { data: oppData, error: oppError } = await supabase
          .from('oportunidades')
          .select('solicitud_id, perfil_riesgo')
          .in('solicitud_id', solicitudIds);
        if (!oppError && Array.isArray(oppData)) {
          oportunidadesMap = oppData.reduce((acc, row) => {
            acc[row.solicitud_id] = row.perfil_riesgo;
            return acc;
          }, {});
        } else if (oppError) {
          console.warn('No se pudo obtener perfil_riesgo desde oportunidades:', oppError);
        }
      }

      // 3) Traer métricas (score_confianza) desde perfiles_de_riesgo
      let perfilesMap = {};
      if (solicitudIds.length > 0) {
        let perfilesData = null;
        // Primer intento: columnas extendidas
        const { data: perfilesAttempt, error: perfilesError } = await supabase
          .from('perfiles_de_riesgo')
          .select('solicitud_id, score_confianza, metricas_evaluacion, indice_confianza_datos')
          .in('solicitud_id', solicitudIds);

        if (perfilesError) {
          console.warn('No se pudo obtener métricas desde perfiles_de_riesgo (intento extendido):', perfilesError);
          const { data: perfilesFallback, error: perfilesFallbackError } = await supabase
            .from('perfiles_de_riesgo')
            .select('solicitud_id, indice_confianza_datos')
            .in('solicitud_id', solicitudIds);
          if (!perfilesFallbackError && Array.isArray(perfilesFallback)) {
            perfilesData = perfilesFallback;
          } else if (perfilesFallbackError) {
            console.warn('No se pudo obtener métricas desde perfiles_de_riesgo (fallback):', perfilesFallbackError);
          }
        } else {
          perfilesData = perfilesAttempt;
        }

        if (Array.isArray(perfilesData)) {
          perfilesMap = perfilesData.reduce((acc, row) => {
            acc[row.solicitud_id] = row;
            return acc;
          }, {});
        }
      }

      const enriched = (solicitudesData || []).map(item => {
        const inferredPerfil =
          item?.perfil_riesgo ??
          oportunidadesMap[item?.id] ??
          item?.perfil ??
          item?.risk_profile ??
          null;
        const perfilMetrics = perfilesMap[item?.id] || {};
        const score =
          item?.score_confianza ??
          perfilMetrics?.score_confianza ??
          perfilMetrics?.metricas_evaluacion?.score_confianza ??
          perfilMetrics?.indice_confianza_datos ??
          null;
        return { ...item, perfil_riesgo: inferredPerfil, score_confianza: score, metricas_evaluacion: perfilMetrics?.metricas_evaluacion };
      });

      setPerfiles(enriched);
      if (enriched.length > 0) {
        // Mantener el perfil seleccionado si aún existe en la nueva lista, o seleccionar el primero.
        setPerfilSeleccionado(prev => 
          enriched.find(p => prev?.id === p.id) || enriched[0]
        );
      } else {
        setPerfilSeleccionado(null);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError('No se pudieron cargar los perfiles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerfiles();
  }, [fetchPerfiles]);

  const handleInfocredUpload = async (file) => {
    if (!file || !perfilSeleccionado?.id) return;
    setUploadingInfocred(true);
    setInfocredError(null);
    try {
      const userId = perfilSeleccionado.user_id || perfilSeleccionado.userId || 'sin-user';
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
      const safeName = `historial_infocred_${perfilSeleccionado.id}.${ext}`;
      const storagePath = `${userId}/${safeName}`;

      const { error: uploadError } = await supabase
        .storage
        .from('documentos-prestatarios')
        .upload(storagePath, file, { upsert: true, contentType: 'application/pdf' });
      if (uploadError) throw uploadError;

      const { data: docData, error: docError } = await supabase
        .from('documentos')
        .upsert(
          {
            solicitud_id: perfilSeleccionado.id,
            user_id: userId,
            tipo_documento: 'historial_infocred',
            nombre_archivo: safeName,
            url_archivo: storagePath,
            estado: 'subido',
          },
          { onConflict: ['solicitud_id', 'tipo_documento'] }
        )
        .select()
        .single();
      if (docError) throw docError;

      // Refrescar documentos y enlace firmado
      setDocumentos(prev => {
        const others = (prev || []).filter(d => d.tipo_documento !== 'historial_infocred');
        return [...others, docData];
      });
      fetchDocumentos(perfilSeleccionado.id);
    } catch (err) {
      console.error('Error subiendo historial INFOCRED:', err);
      setInfocredError(err?.message || 'No se pudo subir el PDF');
    } finally {
      setUploadingInfocred(false);
    }
  };

  const handleSaveInfocredMeta = async () => {
    if (!perfilSeleccionado?.id) return;
    const scoreVal = Number(infocredScore);
    const riskVal = (infocredRiskLevel || '').toUpperCase();
    if (!scoreVal || scoreVal < 300 || scoreVal > 850) {
      alert('Ingresa un score INFOCRED entre 300 y 850.');
      return;
    }
    if (!riskVal || !['A','B','C','D','E','F','G','H'].includes(riskVal)) {
      alert('Selecciona el nivel de riesgo INFOCRED (A-H).');
      return;
    }
    setSavingInfocredMeta(true);
    try {
      const currentMetrics = perfilSeleccionado?.metricas_evaluacion || {};
      const updatedMetrics = { ...currentMetrics, infocred_score: scoreVal, infocred_risk_level: riskVal };
      const { error } = await supabase
        .from('perfiles_de_riesgo')
        .update({ metricas_evaluacion: updatedMetrics })
        .eq('solicitud_id', perfilSeleccionado.id);
      if (error) throw error;
      setPerfilSeleccionado(prev => prev ? { ...prev, metricas_evaluacion: updatedMetrics } : prev);
      alert('Score INFOCRED guardado.');
    } catch (err) {
      console.error('No se pudo guardar score INFOCRED:', err);
      alert('No pudimos guardar el score INFOCRED. Intenta nuevamente.');
    } finally {
      setSavingInfocredMeta(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="centered-message">Cargando perfiles...</div>;
    }

    const derivedIncome = Number(perfilSeleccionado?.ingreso_mensual || 0);
    const derivedSaldo = Number(perfilSeleccionado?.saldo_deuda_tc || perfilSeleccionado?.monto_solicitado || 0);
    const tasa = Number(perfilSeleccionado?.tasa_interes_tc || 0);
    const interesMensual = derivedSaldo && tasa ? (derivedSaldo * (tasa / 100)) / 12 : 0;
    const amortizacion = derivedSaldo ? derivedSaldo * 0.01 : 0;
    const dtiCalculado = derivedIncome ? ((interesMensual + amortizacion) / derivedIncome) * 100 : null;
    const requiredDocs = getRequiredDocsBySituation(perfilSeleccionado?.situacion_laboral);
    const analyzedSet = new Set((analisisDocs || []).map(a => a.document_type));
    const completionRatio = requiredDocs.length ? Math.min(1, documentos.length / requiredDocs.length) : 0;
    const scoreFallback = isProfileComplete(perfilSeleccionado) ? 90 : Math.round(completionRatio * 80);
    const docByType = documentos.reduce((acc, doc) => {
      if (doc?.tipo_documento) acc[doc.tipo_documento] = doc;
      return acc;
    }, {});
    const uploadedRequiredCount = requiredDocs.filter(docId => !!docByType[docId]).length;
    const analyzedCount = analyzedSet.size;
    const infocredStatus = infocredDoc ? 'PDF subido' : 'Pendiente';
    const infocredScoreValue = (perfilSeleccionado?.metricas_evaluacion?.infocred_score ?? infocredScore) || 'N/D';
    const infocredRiskValue = (perfilSeleccionado?.metricas_evaluacion?.infocred_risk_level ?? infocredRiskLevel) || 'N/D';

    if (error && !isModalOpen) { // No mostrar error de fondo si el modal está abierto
      return <div className="centered-message error">Error: {error}</div>;
    }

    if (perfiles.length === 0) {
      return (
        <div className="centered-message">
          <h2>No hay perfiles para revisar</h2>
          <p>Cuando un nuevo prestatario complete su solicitud, aparecerá aquí.</p>
        </div>
      );
    }

    return (
      <>
        <aside className="lista-perfiles">
          <header>
            <h2>Perfiles a Revisar ({perfiles.length})</h2>
            <div className="filter-group">
              <button
                type="button"
                className={`filter-pill ${showOnlyComplete ? 'filter-pill--active' : ''}`}
                onClick={() => setShowOnlyComplete(prev => !prev)}
              >
                {showOnlyComplete ? 'Todos los perfiles' : 'Solo completos'}
              </button>
            </div>
            <HelpTooltip text="Estos son los perfiles de prestatarios que han completado la carga de documentos y están listos para un análisis de riesgo." />
          </header>
          <div className="perfiles-list">
            {filteredPerfiles.map(perfil => (
              <div 
                key={perfil.id} 
                className={`perfil-item ${perfilSeleccionado && perfilSeleccionado.id === perfil.id ? 'selected' : ''}`}
                onClick={() => handleSelectPerfil(perfil)}
              >
                <div className="perfil-item-header">
                  <div>
                    <strong>{perfil.nombre_completo || 'Sin Nombre'}</strong>
                    <div className="muted">ID: {perfil.id}</div>
                  </div>
                  <span>CI: {perfil.cedula_identidad || 'N/A'}</span>
                </div>
                <div className="perfil-item-body">
                  <span>DTI: {perfil.dti || (perfil.saldo_deuda_tc && perfil.ingreso_mensual ? `${(((perfil.saldo_deuda_tc * 0.01 + (perfil.saldo_deuda_tc * (perfil.tasa_interes_tc || 0) / 100) / 12)) / (perfil.ingreso_mensual || 1) * 100).toFixed(1)}%` : 'N/A')}</span>
                </div>
              </div>
            ))}
          </div>
          <section className="help-requests-analyst">
            <header className="help-requests-header">
              <h3>Solicitudes que pidieron ayuda</h3>
              <span className="help-requests-count">{helpRequests.length} pendientes</span>
            </header>
            {helpRequests.length === 0 ? (
              <p className="help-requests-empty">Sin solicitudes nuevas. Tus leads más calientes están listos.</p>
            ) : (
              <ul>
                {helpRequests.map((request) => (
                  <li key={request.id} className="help-request-row">
                    <div>
                      <strong>{request.solicitudes?.nombre_completo || 'Sin nombre'}</strong>
                      <p>{request.solicitudes?.email || 'Sin correo'}</p>
                    </div>
                    <div className="help-request-meta">
                      <span>{new Date(request.created_at).toLocaleString('es-BO')}</span>
                      <span className="help-request-status">{request.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <main className="scorecard-digital">
          {perfilSeleccionado ? (
              <>
              <header className="scorecard-header">
                <h1>Scorecard Digital</h1>
            <p>Análisis de Riesgo para <strong>{perfilSeleccionado.nombre_completo || 'N/A'}</strong> (ID {perfilSeleccionado.id || 'N/D'})</p>
          </header>

              <section className="resumen-expediente">
                <div className="resumen-grid">
                  <div>
                    <div className="muted">Situación laboral</div>
                    <strong>{perfilSeleccionado.situacion_laboral || 'N/D'}</strong>
                    {perfilSeleccionado.antiguedad_laboral && (
                      <div className="muted">Antigüedad: {perfilSeleccionado.antiguedad_laboral} meses</div>
                    )}
                  </div>
                  <div>
                    <div className="muted">Identidad</div>
                    <strong>CI: {perfilSeleccionado.cedula_identidad || 'N/D'}</strong>
                    <div className="muted">{perfilSeleccionado.email || ''}</div>
                    <div className="muted">{perfilSeleccionado.departamento || ''}</div>
                  </div>
                  <div>
                    <div className="muted">Documentos</div>
                    <strong>{uploadedRequiredCount}/{requiredDocs.length || 'N/A'} subidos</strong>
                    <div className="muted">{analyzedCount} analizados por IA</div>
                  </div>
                  <div>
                    <div className="muted">InfoCred</div>
                    <strong>{infocredStatus}</strong>
                    <div className="muted">{infocredDoc ? 'Lista para revisión' : 'Sube el reporte'}</div>
                  </div>
                </div>
              </section>
              
              <section className="metricas-clave">
                <div className="metrica">
                  <span className="metrica-titulo">Ingreso Mensual</span>
                  <span className="metrica-valor">Bs. {(perfilSeleccionado.ingreso_mensual || 0).toLocaleString('es-BO')}</span>
                  <div className="muted">Fuente: solicitud/boleta</div>
                </div>
                <div className="metrica">
                  <span className="metrica-titulo">Deuda Total Declarada</span>
                  <span className="metrica-valor">Bs. {(perfilSeleccionado.saldo_deuda_tc || 0).toLocaleString('es-BO')}</span>
                  <div className="muted">Pago mín. estimado: Bs. {(interesMensual + amortizacion).toFixed(0)}</div>
                </div>
                <div className="metrica">
                  <span className="metrica-titulo">Debt-to-Income (DTI)</span>
                  <span className="metrica-valor">
                    {perfilSeleccionado.dti || (dtiCalculado ? `${dtiCalculado.toFixed(1)}%` : 'N/A')}
                  </span>
                  <div className="muted">Ingreso usado: Bs. {derivedIncome.toLocaleString('es-BO')}</div>
                  <HelpTooltip text="Porcentaje del ingreso mensual que se destina al pago de deudas. Un DTI más bajo es mejor." />
                </div>
                <div className="metrica score-confianza">
                  <span className="metrica-titulo">Score de Confianza</span>
                  <span className="metrica-valor">{perfilSeleccionado.score_confianza || scoreFallback}%</span>
                  <HelpTooltip text="Puntaje calculado basado en la completitud y consistencia de los datos y documentos. No es un score de crédito tradicional." />
                </div>
                <div className="metrica">
                  <span className="metrica-titulo">Perfil de Riesgo</span>
                  <span className="metrica-valor">{perfilRiesgo || 'N/D'}</span>
                  <div className="muted">Determina tasa y originación</div>
                  <HelpTooltip
                    text={
                      perfilRiesgo
                        ? `Perfil ${perfilRiesgo}: tasa prestatario ${TASA_INTERES_PRESTATARIO[perfilRiesgo] ?? 'N/D'}% anual; comisión de originación ${(comisionOriginacion * 100).toFixed(1)}%.`
                        : 'Perfil aún no asignado. Se definirá tras el scorecard y validaciones.'
                    }
                  />
                </div>
                <div className="metrica">
                  <span className="metrica-titulo">Score INFOCRED</span>
                  <span className="metrica-valor">{perfilSeleccionado?.metricas_evaluacion?.infocred_score ?? 'N/D'}</span>
                  <div className="muted">Nivel: {perfilSeleccionado?.metricas_evaluacion?.infocred_risk_level ?? 'N/D'} (buró)</div>
                </div>
              </section>

              <section className="checklist-documentos">
                <h2>Checklist de Documentos</h2>
                {docLoading ? (
                  <p>Cargando documentos...</p>
                ) : (requiredDocs.length > 0 ? (
                  <ul>
                    {requiredDocs.map((docId) => {
                      const doc = docByType[docId];
                      const estado = (doc?.estado || (analyzedSet.has(docId) ? 'analizado' : 'pendiente')).toLowerCase();
                      return (
                        <li key={docId} className={`doc-item doc-${estado}`}>
                          <span className="doc-nombre">{docId}</span>
                          <div className="doc-actions">
                            <span className="doc-estado">{estado}</span>
                            {doc && (
                              <button
                                type="button"
                                className="btn-link"
                                onClick={() => handleOpenDoc(doc)}
                                disabled={!!docLinksLoading[docId]}
                              >
                                {docLinksLoading[docId] ? 'Abriendo...' : 'Ver'}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p>No hay documentos cargados para este expediente.</p>
                ))}
              </section>

              <section className="infocred-upload">
                <div className="infocred-header">
                  <div>
                    <h2>Historial INFOCRED</h2>
                    <p>Sube el PDF que recibes de INFOCRED tras validar la autorización firmada. Solo disponible cuando el expediente está completo.</p>
                  </div>
                  <div className="infocred-actions">
                    <button
                      type="button"
                      className="btn-decision aprobar"
                      onClick={() => infocredInputRef.current?.click()}
                      disabled={!isProfileComplete(perfilSeleccionado) || uploadingInfocred}
                    >
                      {uploadingInfocred ? 'Subiendo...' : (infocredDoc ? 'Reemplazar PDF' : 'Subir PDF')}
                    </button>
                    {!isProfileComplete(perfilSeleccionado) && (
                      <span className="pill muted">Completa checklist para habilitar</span>
                    )}
                  </div>
                </div>

                <input
                  ref={infocredInputRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setInfocredError(null);
                      await handleInfocredUpload(file);
                    }
                    if (e.target) e.target.value = '';
                  }}
                />

                <div className="infocred-body">
                  {docLoading ? (
                    <p>Cargando documentos...</p>
                  ) : infocredDoc ? (
                    <div className="infocred-card">
                      <div>
                        <strong>PDF subido:</strong> {infocredDoc.nombre_archivo || 'historial_infocred.pdf'}
                        <p className="muted">Subido por analista. Si hay nueva consulta, puedes reemplazarlo.</p>
                      </div>
                      {infocredSignedUrl ? (
                        <a href={infocredSignedUrl} target="_blank" rel="noreferrer" className="btn-link">Ver PDF</a>
                      ) : (
                        <span className="pill muted">Generando enlace...</span>
                      )}
                    </div>
                  ) : (
                    <div className="infocred-empty">
                      <p>Aún no se ha cargado el historial de INFOCRED.</p>
                      <p className="muted">Sube el PDF una vez recibas el reporte del buró.</p>
                    </div>
                  )}
                  {infocredError && <div className="error-text">Error: {infocredError}</div>}
                </div>

                <div className="infocred-meta">
                  <h3>Score INFOCRED</h3>
                  <p className="muted">Obligatorio: ingresa el score (300-850) y el nivel A-H tal como aparece en el reporte de INFOCRED.</p>
                  <div className="infocred-meta-grid">
                    <div>
                      <label className="metrica-titulo" htmlFor="infocred-score">Score</label>
                      <input
                        id="infocred-score"
                        type="number"
                        min={300}
                        max={850}
                        value={infocredScore}
                        onChange={(e) => setInfocredScore(e.target.value)}
                        className="metrica-input"
                        placeholder="Ej: 685"
                      />
                    </div>
                    <div>
                      <label className="metrica-titulo" htmlFor="infocred-risk">Nivel (A-H)</label>
                      <select
                        id="infocred-risk"
                        value={infocredRiskLevel}
                        onChange={(e) => setInfocredRiskLevel(e.target.value.toUpperCase())}
                        className="metrica-input"
                      >
                        <option value="">Selecciona</option>
                        {['A','B','C','D','E','F','G','H'].map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn-decision aprobar"
                      onClick={handleSaveInfocredMeta}
                      disabled={savingInfocredMeta}
                    >
                      {savingInfocredMeta ? 'Guardando...' : 'Guardar Score INFOCRED'}
                    </button>
                  </div>
                </div>
              </section>

              {/* Nueva sección para verificación manual y cálculo */}
              <section className="verificacion-manual">
                <h2>Verificación y Cálculo Final</h2>
                <div className="metrica">
                  <label htmlFor="saldo-verificado" className="metrica-titulo">Saldo Deudor Verificado (del extracto)</label>
                  <input
                    type="number"
                    id="saldo-verificado"
                    className="metrica-input"
                    value={saldoDeudorVerificado}
                    onChange={(e) => setSaldoDeudorVerificado(e.target.value)}
                    placeholder="Ej: 5500.50"
                  />
                  <HelpTooltip text="Ingrese aquí el saldo deudor exacto que figura en el extracto de la tarjeta de crédito del cliente." />
                </div>
                {montoTotalPrestamo && (
                  <div className="metrica-calculada">
                    <span className="metrica-titulo">Monto Total del Préstamo (Gross-Up)</span>
                    <span className="metrica-valor-calculado">Bs. {montoTotalPrestamo}</span>
                    <HelpTooltip text={`Este es el monto total que se solicitará a los inversionistas. Se calcula como: Saldo Verificado / (1 - ${(comisionOriginacion * 100).toFixed(1)}% de comisión de originación para el perfil ${perfilRiesgo || 'N/D'}).`} />
                  </div>
                )}
              </section>

              {/* La vieja zona de decisión se reemplaza por estos botones que abren el modal */}
              <section className="zona-decision">
                <h2>Zona de Decisión</h2>
                <div className="decision-buttons">
                  <button 
                    className="btn-decision aprobar" 
                    onClick={() => handleOpenDecisionModal('Aprobado')}
                  >
                    Aprobar Préstamo
                  </button>
                  <button 
                    className="btn-decision rechazar"
                    onClick={() => handleOpenDecisionModal('Rechazado')}
                  >
                    Rechazar Préstamo
                  </button>
                </div>
              </section>
            </>
          ) : (
            <div className="no-perfil-seleccionado">
              <h2>Seleccione un perfil</h2>
              <p>Haga clic en un perfil de la lista de la izquierda para ver los detalles.</p>
            </div>
          )}
        </main>
      </>
    );
  };

  return (
    <div className="risk-analyst-dashboard">
      {renderContent()}
      
      {/* El Modal se renderiza aquí */}
      <DecisionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitDecision}
        profile={perfilSeleccionado}
        decisionType={decisionType}
      />
    </div>
  );
};

export default RiskAnalystDashboard;
