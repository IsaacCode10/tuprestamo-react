import React from 'react';
import { useNavigate } from 'react-router-dom';

const InvestorDashboard = () => {
  const navigate = useNavigate();
  return (
    <div className="investor-dashboard-container">
      <h2>Mi Panel de Inversionista</h2>
      <p>Bienvenido a tu panel de inversionista. Aquí podrás ver tus inversiones, rendimientos y más.</p>
      <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Ver Oportunidades de Inversión</button>
      {/* Future content: list of investments, earnings, etc. */}
    </div>
  );
};

export default InvestorDashboard;
