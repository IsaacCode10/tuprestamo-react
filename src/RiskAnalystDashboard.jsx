
import React, { useState } from 'react';
import './RiskAnalystDashboard.css';
import HelpTooltip from './components/HelpTooltip';

// Datos de ejemplo que eventualmente vendrán de la tabla perfiles_de_riesgo
const mockPerfiles = [
  {
    id: 1,
    nombre: 'Juan Perez',
    ci: '1234567 LP',
    ingresoMensual: 8500,
    deudaTotal: 3400,
    dti: '40%',
    documentos: [
      { nombre: 'CI Anverso', estado: 'Verificado' },
      { nombre: 'CI Reverso', estado: 'Verificado' },
      { nombre: 'Factura Servicio', estado: 'Verificado' },
      { nombre: 'Boleta Tarjeta', estado: 'Verificado' },
      { nombre: 'Selfie con CI', estado: 'Verificado' },
      { nombre: 'Boletas de Pago (3)', estado: 'Verificado' },
      { nombre: 'Certificado Gestora', estado: 'Pendiente' },
    ],
    scoreConfianza: 85,
    fechaSolicitud: '2025-09-28',
  },
  {
    id: 2,
    nombre: 'Maria Garcia',
    ci: '7654321 CB',
    ingresoMensual: 4200,
    deudaTotal: 2500,
    dti: '60%',
    documentos: [
      { nombre: 'CI Anverso', estado: 'Verificado' },
      { nombre: 'CI Reverso', estado: 'Verificado' },
      { nombre: 'Factura Servicio', estado: 'Rechazado' },
      { nombre: 'Boleta Tarjeta', estado: 'Verificado' },
      { nombre: 'Selfie con CI', estado: 'Verificado' },
      { nombre: 'Extracto Bancario', estado: 'Verificado' },
      { nombre: 'NIT', estado: 'Verificado' },
    ],
    scoreConfianza: 58,
    fechaSolicitud: '2025-09-27',
  },
];

const RiskAnalystDashboard = () => {
  const [perfiles, setPerfiles] = useState(mockPerfiles);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(perfiles[0]);

  const handleSelectPerfil = (perfil) => {
    setPerfilSeleccionado(perfil);
  };

  const handleDecision = (id, decision) => {
    console.log(`Decisión tomada para perfil ${id}: ${decision}`);
    // Aquí iría la lógica para registrar la decisión y actualizar el estado.
    // Por ahora, solo lo quitamos de la lista.
    setPerfiles(perfiles.filter(p => p.id !== id));
    if (perfilSeleccionado && perfilSeleccionado.id === id) {
      setPerfilSeleccionado(perfiles.length > 1 ? perfiles.filter(p => p.id !== id)[0] : null);
    }
  };

  return (
    <div className="risk-analyst-dashboard">
      <aside className="lista-perfiles">
        <header>
          <h2>Perfiles a Revisar</h2>
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
                <strong>{perfil.nombre}</strong>
                <span>CI: {perfil.ci}</span>
              </div>
              <div className="perfil-item-body">
                <span>Confianza: {perfil.scoreConfianza}%</span>
                <span>DTI: {perfil.dti}</span>
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
              <p>Análisis de Riesgo para <strong>{perfilSeleccionado.nombre}</strong></p>
            </header>
            
            <section className="metricas-clave">
              <div className="metrica">
                <span className="metrica-titulo">Ingreso Mensual</span>
                <span className="metrica-valor">Bs. {perfilSeleccionado.ingresoMensual.toLocaleString('es-BO')}</span>
              </div>
              <div className="metrica">
                <span className="metrica-titulo">Deuda Total Declarada</span>
                <span className="metrica-valor">Bs. {perfilSeleccionado.deudaTotal.toLocaleString('es-BO')}</span>
              </div>
              <div className="metrica">
                <span className="metrica-titulo">Debt-to-Income (DTI)</span>
                <span className="metrica-valor">{perfilSeleccionado.dti}</span>
                <HelpTooltip text="Porcentaje del ingreso mensual que se destina al pago de deudas. Un DTI más bajo es mejor." />
              </div>
              <div className="metrica score-confianza">
                <span className="metrica-titulo">Score de Confianza</span>
                <span className="metrica-valor">{perfilSeleccionado.scoreConfianza}%</span>
                <HelpTooltip text="Puntaje calculado basado en la completitud y consistencia de los datos y documentos. No es un score de crédito tradicional." />
              </div>
            </section>

            <section className="checklist-documentos">
              <h2>Checklist de Documentos</h2>
              <ul>
                {perfilSeleccionado.documentos.map((doc, index) => (
                  <li key={index} className={`doc-item doc-${doc.estado.toLowerCase()}`}>
                    <span className="doc-nombre">{doc.nombre}</span>
                    <span className="doc-estado">{doc.estado}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="zona-decision">
              <h2>Zona de Decisión</h2>
              <div className="decision-buttons">
                <button 
                  className="btn-decision aprobar" 
                  onClick={() => handleDecision(perfilSeleccionado.id, 'Aprobado')}
                >
                  Aprobar Préstamo
                </button>
                <button 
                  className="btn-decision rechazar"
                  onClick={() => handleDecision(perfilSeleccionado.id, 'Rechazado')}
                >
                  Rechazar Préstamo
                </button>
              </div>
              <div className="campo-justificacion">
                 <label htmlFor="justificacion">Justificación de la Decisión (Obligatorio)</label>
                 <textarea id="justificacion" rows="3" placeholder="Ej: El DTI es muy elevado para el nivel de ingresos..." />
              </div>
            </section>
          </>
        ) : (
          <div className="no-perfil-seleccionado">
            <h2>No hay perfiles para revisar</h2>
            <p>Cuando un nuevo prestatario complete su solicitud, aparecerá aquí.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default RiskAnalystDashboard;
