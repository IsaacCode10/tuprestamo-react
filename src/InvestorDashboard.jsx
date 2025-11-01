import React from 'react';
import { useNavigate } from 'react-router-dom';

const InvestorDashboard = ({ profile }) => {
  const navigate = useNavigate();

  const verification = profile?.estado_verificacion || 'no_iniciado';

  const Banner = () => {
    if (verification === 'verificado') return null;
    if (verification === 'pendiente_revision') {
      return (
        <div style={{ background: '#fff9e6', border: '1px solid #ffe08a', color: '#8a6d3b', padding: 12, borderRadius: 8 }}>
          Tu verificación de identidad está en revisión. Puedes navegar y conocer oportunidades; te avisaremos cuando finalice.
        </div>
      );
    }
    if (verification === 'requiere_revision_manual') {
      return (
        <div style={{ background: '#ffe6e6', border: '1px solid #ffb3b3', color: '#8b0000', padding: 12, borderRadius: 8 }}>
          No pudimos confirmar tu verificación. Revisa tu información y vuelve a intentarlo.
        </div>
      );
    }
    return (
      <div style={{ background: '#eef9f8', border: '1px solid #a8ede6', color: '#11696b', padding: 12, borderRadius: 8 }}>
        Verifica tu cuenta antes de invertir. Podrás explorar oportunidades de inmediato y completar la verificación cuando estés listo.
      </div>
    );
  };

  const renderContent = () => {
    if (!profile) {
      return <p>Cargando información de tu perfil…</p>;
    }

    return (
      <>
        <div className="dashboard-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
          <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Ver Oportunidades</button>
          <button className="btn" onClick={() => navigate('/mis-inversiones')}>Mis Inversiones</button>
          <button className="btn" onClick={() => navigate('/retiro')}>Solicitar Retiro</button>
          {verification !== 'verificado' && (
            <button className="btn" onClick={() => navigate('/verificar-cuenta')}>Verificar mi Cuenta</button>
          )}
        </div>
      </>
    );
  };

  const Pill = () => {
    if (verification === 'no_iniciado') return null; // No mostrar pill para el estado inicial
    const bg = verification === 'verificado' ? '#e6fffb' : verification === 'pendiente_revision' ? '#fff9e6' : '#ffe6e6';
    const fg = verification === 'verificado' ? '#006d75' : verification === 'pendiente_revision' ? '#8a6d3b' : '#8b0000';
    const text = verification === 'verificado' ? 'Verificada' : verification === 'pendiente_revision' ? 'En revisión' : 'Requiere revisión';
    return (
      <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: bg, color: fg }}>
        Verificación: {text}
      </span>
    );
  };

  return (
    <div className="investor-dashboard-container">
      <div style={{ marginTop: 6 }}>
        <Pill />
      </div>
      <div style={{ marginTop: 12 }}>
        <Banner />
      </div>
      {renderContent()}
    </div>
  );
};

export default InvestorDashboard;
