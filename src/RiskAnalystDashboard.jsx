import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import './RiskAnalystDashboard.css';
import HelpTooltip from './components/HelpTooltip';
import DecisionModal from './DecisionModal'; // Importar el nuevo modal

const RiskAnalystDashboard = () => {
  const [perfiles, setPerfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null);

  // State para el modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState(null); // 'Aprobado' or 'Rechazado'

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

  const handleSelectPerfil = (perfil) => {
    setPerfilSeleccionado(perfil);
  };

  // Abre el modal para tomar la decisión
  const handleOpenDecisionModal = (decision) => {
    setDecisionType(decision);
    setIsModalOpen(true);
  };

  // Se ejecuta al confirmar la decisión en el modal
  const handleSubmitDecision = async (decisionData) => {
    if (!perfilSeleccionado) return;

    const { profileId, decision, motivo, notas } = decisionData;

    // 1. Insertar la decisión en la tabla 'decisiones_de_riesgo'
    const { error: decisionError } = await supabase
      .from('decisiones_de_riesgo')
      .insert({
        perfil_de_riesgo_id: profileId,
        decision: decision,
        motivo: motivo,
        notas: notas,
      });

    if (decisionError) {
      setError(`Error al guardar la decisión: ${decisionError.message}`);
      throw decisionError; // Propagate error to stop the process
    }

    // 2. Actualizar el estado del perfil en 'perfiles_de_riesgo'
    const { error: profileError } = await supabase
      .from('perfiles_de_riesgo')
      .update({ estado: 'Revisado' })
      .eq('id', profileId);

    if (profileError) {
      setError(`Error al actualizar el perfil: ${profileError.message}`);
      // Aquí podríamos tener lógica para revertir la decisión si falla la actualización
      throw profileError;
    }

    // 3. Actualizar la UI
    const nuevosPerfiles = perfiles.filter(p => p.id !== profileId);
    setPerfiles(nuevosPerfiles);
    
    if (perfilSeleccionado && perfilSeleccionado.id === profileId) {
      setPerfilSeleccionado(nuevosPerfiles.length > 0 ? nuevosPerfiles[0] : null);
    }
    
    setIsModalOpen(false); // Cerrar el modal
  };
  
  const renderContent = () => {
    if (loading) {
      return <div className="centered-message">Cargando perfiles...</div>;
    }

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
            <HelpTooltip text="Estos son los perfiles de prestatarios que han completado la carga de documentos y están listos para un análisis de riesgo." />
          </header>
          <div className="perfiles-list">
            {perfiles.map(perfil => (
              <div 
                key={perfil.id} 
                className={`perfil-item ${perfilSeleccionado && perfilSeleccionado.id === perfil.id ? 'selected' : ''}`}
                onClick={() => handleSelectPerfil(perfil)}
              >
                <div className="perfil-item-header">
                  <strong>{perfil.nombre_completo || 'Sin Nombre'}</strong>
                  <span>CI: {perfil.ci || 'N/A'}</span>
                </div>
                <div className="perfil-item-body">
                  <span>Confianza: {perfil.score_confianza || 0}%</span>
                  <span>DTI: {perfil.dti || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="scorecard-digital">
          {perfilSeleccionado ? (
            <>
              <header className="scorecard-header">
                <h1>Scorecard Digital</h1>
                <p>Análisis de Riesgo para <strong>{perfilSeleccionado.nombre_completo || 'N/A'}</strong></p>
              </header>
              
              <section className="metricas-clave">
                <div className="metrica">
                  <span className="metrica-titulo">Ingreso Mensual</span>
                  <span className="metrica-valor">Bs. {(perfilSeleccionado.ingresos_mensuales || 0).toLocaleString('es-BO')}</span>
                </div>
                <div className="metrica">
                  <span className="metrica-titulo">Deuda Total Declarada</span>
                  <span className="metrica-valor">Bs. {(perfilSeleccionado.deuda_total_declarada || 0).toLocaleString('es-BO')}</span>
                </div>
                <div className="metrica">
                  <span className="metrica-titulo">Debt-to-Income (DTI)</span>
                  <span className="metrica-valor">{perfilSeleccionado.dti || 'N/A'}</span>
                  <HelpTooltip text="Porcentaje del ingreso mensual que se destina al pago de deudas. Un DTI más bajo es mejor." />
                </div>
                <div className="metrica score-confianza">
                  <span className="metrica-titulo">Score de Confianza</span>
                  <span className="metrica-valor">{perfilSeleccionado.score_confianza || 0}%</span>
                  <HelpTooltip text="Puntaje calculado basado en la completitud y consistencia de los datos y documentos. No es un score de crédito tradicional." />
                </div>
              </section>

              <section className="checklist-documentos">
                <h2>Checklist de Documentos</h2>
                <ul>
                  {(perfilSeleccionado.documentos_validados || []).map((doc, index) => (
                    <li key={index} className={`doc-item doc-${(doc.estado || 'pendiente').toLowerCase()}`}>
                      <span className="doc-nombre">{doc.tipo_documento}</span>
                      <span className="doc-estado">{doc.estado}</span>
                    </li>
                  ))}
                </ul>
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