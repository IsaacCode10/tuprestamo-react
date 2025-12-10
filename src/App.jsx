import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile.js';
import { trackEvent } from '@/analytics.js';


import '@/style.css';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import LandingPage from '@/components/LandingPage.jsx';
import CalculatorPage from '@/CalculatorPage.jsx'; // <-- NUEVA PÃƒÆ’Ã†â€™Ãƒâ€šÃ‚ÂGINA
import Auth from '@/Auth.jsx';
import AdminDashboard from '@/AdminDashboard.jsx';
import InvestorDashboard from '@/InvestorDashboard.jsx';
import MyInvestmentsList from '@/MyInvestmentsList.jsx';
import InvestorVerification from './InvestorVerification.jsx';
import InvestorManagementDashboard from '@/InvestorManagementDashboard.jsx';
import Opportunities from '@/Opportunities.jsx';
import OpportunityDetail from '@/OpportunityDetail.jsx';
import ConfirmAndSetPassword from '@/ConfirmAndSetPassword.jsx';
import InvestorFAQ from '@/InvestorFAQ.jsx';
import InvestorCalculator from '@/InvestorCalculator.jsx';
import LegalTerms from '@/LegalTerms.jsx';
import PrivacyPolicy from '@/PrivacyPolicy.jsx';
import InvestorProfile from '@/InvestorProfile.jsx';
import BorrowerDashboard from '@/BorrowerDashboard.jsx';
import BorrowerActivateAccount from '@/BorrowerActivateAccount.jsx';
import RiskAnalystDashboard from '@/RiskAnalystDashboard.jsx';
import Profile from './Profile.jsx';
import NotAvailable from './NotAvailable.jsx'; // <-- IMPORTAMOS LA NUEVA PÃƒÆ’Ã†â€™Ãƒâ€šÃ‚ÂGINA
import AdminOperations from '@/AdminOperations.jsx';
import BorrowerLayout from '@/layouts/BorrowerLayout.jsx';

// Componente "Guardia" especÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­fico para rutas de Administrador
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

// Componente "Guardia" especÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­fico para rutas de Inversionista
const InvestorRoute = ({ profile, loading, children, refetchProfile }) => {
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
  
  return React.cloneElement(children, { profile, refetchProfile });
};

// Componente "Guardia" especÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­fico para rutas de Prestatario
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

// Componente para redirigir si el usuario YA estÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ autenticado
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
  const { profile, loading, authEvent, refetchProfile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  // analytics wrapper via trackEvent


  // --- Evento de AnalÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­tica: Campaign Lead ---
  useEffect(() => {
    // Solo se ejecuta una vez por sesiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n
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
      trackEvent('Campaign Lead', properties);
      // Marcamos que el evento ya se disparÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³ en esta sesiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n
      sessionStorage.setItem('utm_event_fired', 'true');
    }
  }, [location.search ]);

  // Rutas donde deseamos ocultar el Header (solo confirmaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n)
  const hideHeaderPaths = [
    '/confirmar',
    '/confirmar-y-crear-perfil'
  ];

  // Ocultar solo en confirmaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n para mantener branding consistente en dashboards
  const isHeaderHidden = hideHeaderPaths.some(path => location.pathname.startsWith(path));

  // Determinar si la ruta actual es un dashboard para ajustar el Footer (estilo minimal)
  const dashboardPaths = [
    '/admin-dashboard',
    '/investor-dashboard',
    '/admin/manage-investors',
    '/dashboard-analista',
    '/admin/operaciones',
    '/borrower-dashboard',
    '/perfil'
  ];
  const isDashboardPage = dashboardPaths.some(path => location.pathname.startsWith(path));

  // Mostrar footer completo en el ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rea del inversionista (no usar versiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n minimal)
  const investorAreaPaths = [
    '/investor-dashboard',
    '/mis-inversiones',
    '/oportunidades',
    '/verificar-cuenta',
    '/calculadora-inversionista'
  ];
  const isInvestorArea = investorAreaPaths.some(path => location.pathname.startsWith(path));
  const isDashboardFooterMinimal = isDashboardPage && !isInvestorArea;

  useEffect(() => {
    if (authEvent === 'PASSWORD_RECOVERY') {
      navigate('/confirmar-y-crear-perfil');
    }
  }, [authEvent, navigate]);

  return (
    <div className="App">
      {!isHeaderHidden && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/calculadora" element={<CalculatorPage />} />
          <Route path="/no-disponible" element={<NotAvailable />} /> {/* <-- AÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ADIMOS LA RUTA */}
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
            path="/admin/operaciones" 
            element={
              <AdminRoute profile={profile} loading={loading}>
                <AdminOperations />
              </AdminRoute>
            }
          />
          <Route 
            path="/investor-dashboard" 
            element={
              <InvestorRoute profile={profile} loading={loading} refetchProfile={refetchProfile}>
                <InvestorDashboard />
              </InvestorRoute>
            }
          />
          <Route 
            path="/mis-inversiones" 
            element={
              <InvestorRoute profile={profile} loading={loading}>
                <MyInvestmentsList />
              </InvestorRoute>
            }
          />
          <Route 
            path="/verificar-cuenta"
            element={
              <InvestorRoute profile={profile} loading={loading}>
                <InvestorVerification />
              </InvestorRoute>
            }
          />
          <Route 
            path="/perfil-inversionista"
            element={
              <InvestorRoute profile={profile} loading={loading}>
                <InvestorProfile />
              </InvestorRoute>
            }
          />
          <Route path="/oportunidades" element={<Opportunities />} />
          <Route path="/oportunidades/:id" element={<OpportunityDetail />} />
          <Route path="/calculadora-inversionista" element={<InvestorCalculator />} />
          <Route path="/faq-inversionista" element={<InvestorFAQ />} />
          <Route path="/terminos" element={<LegalTerms />} />
          <Route path="/privacidad" element={<PrivacyPolicy />} />
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
            element={
              <BorrowerRoute profile={profile} loading={loading}>
                <BorrowerLayout />
              </BorrowerRoute>
            }
          >
            <Route path="/borrower-dashboard" element={<BorrowerDashboard />} />
            <Route path="/perfil" element={<Profile />} />
          </Route>
          <Route path="/activar-cuenta-prestatario" element={<BorrowerActivateAccount />} />
        </Routes>
      </main>
      <Footer isDashboard={isDashboardFooterMinimal} />
    </div>
  );
}

export default App;
