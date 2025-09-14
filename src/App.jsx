import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useProfile } from './hooks/useProfile.js';

import './style.css';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import Auth from './Auth';
import AdminDashboard from './AdminDashboard';
import InvestorDashboard from './InvestorDashboard';
import InvestorManagementDashboard from './InvestorManagementDashboard';
import Opportunities from './Opportunities';
import OpportunityDetail from './OpportunityDetail';
import ConfirmAndSetPassword from './ConfirmAndSetPassword';
import BorrowerDashboard from './BorrowerDashboard';
import BorrowerActivateAccount from './BorrowerActivateAccount';

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
  
  return children;
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
  
  return children;
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
  
  return children;
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
  const { profile, loading, authEvent } = useProfile(); // Obtenemos el authEvent
  const navigate = useNavigate();

  useEffect(() => {
    // Si el evento es PASSWORD_RECOVERY, redirigimos a la página de creación de contraseña
    if (authEvent === 'PASSWORD_RECOVERY') {
      navigate('/confirmar-y-crear-perfil');
    }
  }, [authEvent, navigate]); // El efecto se ejecuta cuando authEvent cambia

  return (
    <div className="App">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
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
            path="/borrower-dashboard"
            element={
              <BorrowerRoute profile={profile} loading={loading}>
                <BorrowerDashboard />
              </BorrowerRoute>
            }
          />
          <Route path="/prestatario-activar-cuenta" element={<BorrowerActivateAccount />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
