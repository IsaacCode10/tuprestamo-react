import React from 'react';
import { useNavigate } from 'react-router-dom';

const InvestorDashboard = ({ profile }) => {
  const navigate = useNavigate();

  const renderContent = () => {
    // Asegurarse de que el perfil se ha cargado
    if (!profile) {
      return <p>Cargando información de tu perfil...</p>;
    }

    switch (profile.estado_verificacion) {
      case 'verificado':
        return (
          <>
            <p>Bienvenido a tu panel. Tu cuenta está verificada y lista para invertir.</p>
            <div className="dashboard-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Ver Oportunidades</button>
              <button className="btn" onClick={() => navigate('/mis-inversiones')}>Mis Inversiones</button>
              <button className="btn" onClick={() => navigate('/retiro')}>Solicitar Retiro</button>
            </div>
          </>
        );
      case 'pendiente_revision':
        return (
          <p>Tu solicitud de verificación ha sido enviada. Estamos revisando tus datos y te notificaremos pronto. El proceso puede tardar hasta 24 horas hábiles.</p>
        );
      case 'requiere_revision_manual':
        return (
          <>
            <p>Hubo un problema al verificar tus documentos. Por favor, revisa tus datos y vuelve a intentarlo. Si el problema persiste, contacta a soporte.</p>
            <button className="btn btn--primary" onClick={() => navigate('/verificar-cuenta')}>Revisar Verificación</button>
          </>
        );
      case 'no_iniciado':
      default:
        return (
          <>
            <p>Para poder invertir, el último paso es verificar tu identidad. Es un proceso rápido y seguro.</p>
            <button className="btn btn--primary" onClick={() => navigate('/verificar-cuenta')}>Verificar mi Cuenta</button>
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
