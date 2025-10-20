import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import './RiskAnalystDashboard.css';
import HelpTooltip from './components/HelpTooltip';
import DecisionModal from './DecisionModal'; // Importar el nuevo modal

// --- Objeto de prueba para desarrollo ---
const mockProfile = {
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
// --------------------------------------

const RiskAnalystDashboard = () => {
  // --- Estados con datos de prueba ---
  const [perfiles, setPerfiles] = useState([mockProfile]);
  const [loading, setLoading] = useState(false); // Inicia en false
  const [error, setError] = useState(null);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(mockProfile);
  // ----------------------------------

  // State para el modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState(null); // 'Aprobado' or 'Rechazado'

  // State para el cálculo de gross-up
  const [saldoDeudorVerificado, setSaldoDeudorVerificado] = useState('');
  const [montoTotalPrestamo, setMontoTotalPrestamo] = useState(null);
  const TASA_COMISION = 0.08; // 8%

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

  // Efecto para calcular el Gross-Up
  useEffect(() => {
    const saldo = parseFloat(saldoDeudorVerificado);
    if (saldo > 0) {
      const montoCalculado = saldo / (1 - TASA_COMISION);
      setMontoTotalPrestamo(montoCalculado.toFixed(2));
    } else {
      setMontoTotalPrestamo(null);
    }
  }, [saldoDeudorVerificado]);

  const handleSelectPerfil = (perfil) => {
    setPerfilSeleccionado(perfil);
    // Limpiar los campos de cálculo al cambiar de perfil
    setSaldoDeudorVerificado('');
    setMontoTotalPrestamo(null);
  };

  // Abre el modal para tomar la decisión
  const handleOpenDecisionModal = (decision) => {
    setDecisionType(decision);
    setIsModalOpen(true);
  };

  // Se ejecuta al confirmar la decisión en el modal
  const handleSubmitDecision = async (decisionData) => {
    // --- Lógica de guardado desactivada en modo de prueba ---
    alert("Modo de prueba: La decisión no se guardará en la base de datos.");
    console.log("Decisión a guardar:", decisionData);
    setIsModalOpen(false);
    return;
    // ------------------------------------------------------
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
                    <HelpTooltip text={`Este es el monto total que se solicitará a los inversionistas. Se calcula como: Saldo Verificado / (1 - ${TASA_COMISION * 100}% de comisión).`} />
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
