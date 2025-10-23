import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile.js';
import useAnalytics from '@/hooks/useAnalytics'; // Importamos el hook de analítica

import '@/style.css';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import LandingPage from '@/components/LandingPage.jsx';
import CalculatorPage from '@/CalculatorPage.jsx'; // <-- NUEVA PÁGINA
import Auth from '@/Auth.jsx';
import AdminDashboard from '@/AdminDashboard.jsx';
import InvestorDashboard from '@/InvestorDashboard.jsx';
import InvestorManagementDashboard from '@/InvestorManagementDashboard.jsx';
import Opportunities from '@/Opportunities.jsx';
import OpportunityDetail from '@/OpportunityDetail.jsx';
import ConfirmAndSetPassword from '@/ConfirmAndSetPassword.jsx';
import BorrowerDashboard from '@/BorrowerDashboard.jsx';
import BorrowerActivateAccount from '@/BorrowerActivateAccount.jsx';
import RiskAnalystDashboard from '@/RiskAnalystDashboard.jsx';
import Profile from './Profile.jsx';
import NotAvailable from './NotAvailable.jsx'; // <-- IMPORTAMOS LA NUEVA PÁGINA

// Componente "Guardia" específico para rutas de Administrador
const AdminRoute = ({ profile, loading, children }) => {
  const allowedRoles = ['admin', 'analista_riesgo'];

  if (loading) {
    return <div>Verificando acceso...</div>;
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }
  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }
  
  return React.cloneElement(children, { profile });
};

// Componente "Guardia" específico para rutas de Inversionista
const InvestorRoute = ({ profile, loading, children }) => {
  const allowedRoles = ['inversionista', 'admin'];

  if (loading) {
    return <div>Verificando acceso...</div>;
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }
  
  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }
  
  return React.cloneElement(children, { profile });
};

// Componente "Guardia" específico para rutas de Prestatario
const BorrowerRoute = ({ profile, loading, children }) => {
  const allowedRoles = ['prestatario', 'admin'];

  if (loading) {
    return <div>Verificando acceso...</div>;
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }
  
  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }
  
  return React.cloneElement(children, { profile });
};

// Componente para redirigir si el usuario YA está autenticado
const RedirectIfAuth = ({ profile, loading, children }) => {
  if (loading) {
    return <div>Cargando...</div>;
  }

  if (profile) {
    // Si hay perfil, redirige al panel correspondiente
    switch (profile.role) {
      case 'admin':
        return <Navigate to="/admin-dashboard" replace />;
      case 'inversionista':
        return <Navigate to="/investor-dashboard" replace />;
      case 'prestatario':
        return <Navigate to="/borrower-dashboard" replace />;
      default:
        return <Navigate to="/" replace />; // Fallback
    }
  }

  // Si no hay perfil, muestra el contenido (ej. el formulario de login)
  return children;
};


function App() {
  const { profile, loading, authEvent } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const analytics = useAnalytics(); // Inicializamos el hook

  // --- Evento de Analítica: Campaign Lead ---
  useEffect(() => {
    // Solo se ejecuta una vez por sesión
    if (sessionStorage.getItem('utm_event_fired')) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');

    const properties = {};
    if (utmSource) properties.utm_source = utmSource;
    if (utmMedium) properties.utm_medium = utmMedium;
    if (utmCampaign) properties.utm_campaign = utmCampaign;

    // Si encontramos al menos una propiedad UTM, disparamos el evento
    if (Object.keys(properties).length > 0) {
      analytics.capture('campaign_lead', properties);
      // Marcamos que el evento ya se disparó en esta sesión
      sessionStorage.setItem('utm_event_fired', 'true');
    }
  }, [location.search, analytics]);

  // Lista de rutas que se consideran dashboards
  const dashboardPaths = [
    '/admin-dashboard',
    '/investor-dashboard',
    '/admin/manage-investors',
    '/dashboard-analista',
    '/borrower-dashboard',
    '/perfil'
  ];

  // Comprobar si la ruta actual es una de las de dashboard
  const isDashboardPage = dashboardPaths.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    if (authEvent === 'PASSWORD_RECOVERY') {
      navigate('/confirmar-y-crear-perfil');
    }
  }, [authEvent, navigate]);

  return (
    <div className="App">
      {!isDashboardPage && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/calculadora" element={<CalculatorPage />} />
          <Route path="/no-disponible" element={<NotAvailable />} /> {/* <-- AÑADIMOS LA RUTA */}
          <Route 
            path="/auth" 
            element={
              <RedirectIfAuth profile={profile} loading={loading}>
                <Auth />
              </RedirectIfAuth>
            } 
          />
          <Route 
            path="/admin-dashboard" 
            element={
              <AdminRoute profile={profile} loading={loading}>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route 
            path="/investor-dashboard" 
            element={
              <InvestorRoute profile={profile} loading={loading}>
                <InvestorDashboard />
              </InvestorRoute>
            }
          />
          <Route path="/oportunidades" element={<Opportunities />} />
          <Route path="/oportunidades/:id" element={<OpportunityDetail />} />
          <Route path="/confirmar" element={<ConfirmAndSetPassword />} />
          <Route path="/confirmar-y-crear-perfil" element={<ConfirmAndSetPassword />} />
          <Route 
            path="/admin/manage-investors"
            element={
              <AdminRoute profile={profile} loading={loading}>
                <InvestorManagementDashboard />
              </AdminRoute>
            }
          />
          <Route 
            path="/dashboard-analista"
            element={
              <AdminRoute profile={profile} loading={loading}>
                <RiskAnalystDashboard />
              </AdminRoute>
            }
          />
          <Route 
            path="/borrower-dashboard"
            element={
              <BorrowerRoute profile={profile} loading={loading}>
                <BorrowerDashboard />
              </BorrowerRoute>
            }
          />
           <Route 
            path="/perfil"
            element={
              <BorrowerRoute profile={profile} loading={loading}>
                <Profile />
              </BorrowerRoute>
            }
          />
          <Route path="/activar-cuenta-prestatario" element={<BorrowerActivateAccount />} />
        </Routes>
      </main>
      <Footer isDashboard={isDashboardPage} />
    </div>
  );
}

export default App;
