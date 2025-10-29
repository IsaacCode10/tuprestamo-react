import React from 'react';
import { useNavigate } from 'react-router-dom';

const InvestorDashboard = ({ profile }) => {
  const navigate = useNavigate();

  const renderContent = () => {
    if (!profile) {
      return <p>Cargando información de tu perfil...</p>;
    }

    switch (profile.estado_verificacion) {
      case 'verificado':
        return (
          <>
            <p>Bienvenido a tu panel. Tu verificación de identidad está completada y puedes invertir.</p>
            <div className="dashboard-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Ver Oportunidades</button>
              <button className="btn" onClick={() => navigate('/mis-inversiones')}>Mis Inversiones</button>
              <button className="btn" onClick={() => navigate('/retiro')}>Solicitar Retiro</button>
            </div>
          </>
        );
      case 'pendiente_revision':
        return (
          <>
            <div style={{ background: '#fff9e6', border: '1px solid #ffe08a', color: '#8a6d3b', padding: '12px', borderRadius: 8 }}>
              Tu verificación de identidad está en revisión. Te notificaremos pronto.
            </div>
            <div className="dashboard-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Ver Oportunidades</button>
              <button className="btn" onClick={() => navigate('/mis-inversiones')}>Mis Inversiones</button>
            </div>
          </>
        );
      case 'requiere_revision_manual':
        return (
          <>
            <div style={{ background: '#ffe6e6', border: '1px solid #ffb3b3', color: '#8b0000', padding: '12px', borderRadius: 8 }}>
              No pudimos confirmar tu verificación de identidad. Revisa y vuelve a intentarlo.
            </div>
            <div className="dashboard-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Ver Oportunidades</button>
              <button className="btn" onClick={() => navigate('/mis-inversiones')}>Mis Inversiones</button>
              <button className="btn" onClick={() => navigate('/verificar-cuenta')}>Revisar Verificación</button>
            </div>
          </>
        );
      case 'no_iniciado':
      default:
        return (
          <>
            <div style={{ background: '#eef9f8', border: '1px solid #a8ede6', color: '#11696b', padding: '12px', borderRadius: 8 }}>
              Recomendado: completa tu verificación de identidad para agilizar retiros y aumentar límites. Puedes hacerlo más tarde al invertir.
            </div>
            <div className="dashboard-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Ver Oportunidades</button>
              <button className="btn" onClick={() => navigate('/mis-inversiones')}>Mis Inversiones</button>
              <button className="btn" onClick={() => navigate('/verificar-cuenta')}>Verificar mi Cuenta</button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="investor-dashboard-container">
      <h2>Mi Panel de Inversionista</h2>
      {renderContent()}
    </div>
  );
};

export default InvestorDashboard;

