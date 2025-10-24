import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Link as ScrollLink } from 'react-scroll';
import { supabase } from '../supabaseClient';
import { trackEvent, resetMixpanel } from '../analytics';
import { useProfile } from '../hooks/useProfile';
import RoleSwitcher from './RoleSwitcher';
import logo from '../assets/Logo-Tu-Prestamo.png';
import './Header.css';

const NavButton = ({ to, text }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigateAndScroll = () => {
    navigate('/');
    setTimeout(() => {
      const element = document.getElementById(to);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Si estamos en la página principal, usamos ScrollLink para un scroll suave
  if (location.pathname === '/') {
    return (
      <ScrollLink to={to} smooth={true} duration={500} offset={-80} className="header__nav-button">
        {text}
      </ScrollLink>
    );
  }

  // Si estamos en otra página, navegamos primero y luego hacemos scroll
  return (
    <button onClick={handleNavigateAndScroll} className="header__nav-button">
      {text}
    </button>
  );
};

const Header = () => {
  const { profile } = useProfile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    trackEvent('Logged Out');
    resetMixpanel();
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    navigate('/');
  };

  // Determinar la ruta del panel de control basado en el rol del perfil
  let dashboardPath = '/'; // Fallback por defecto
  let displayName = 'Mi Cuenta';

  if (profile) {
    // Construir el nombre a mostrar con una lógica de fallbacks
    const firstName = profile.nombre_completo?.split(' ')[0];
    const emailUsername = profile.email?.split('@')[0];
    displayName = `Hola, ${firstName || emailUsername || 'Usuario'}`;

    switch (profile.role) {
      case 'admin':
        dashboardPath = '/admin-dashboard';
        break;
      case 'inversionista':
        dashboardPath = '/investor-dashboard';
        break;
      case 'prestatario':
        dashboardPath = '/borrower-dashboard';
        break;
      default:
        dashboardPath = '/';
    }
  }

  return (
    <header className="header">
      <div className="header__container">
        <NavLink to="/" className="header__logo-link">
          <img src={logo} alt="Logo Tu Préstamo" className="header__logo" />
        </NavLink>

        <div className="header__nav-actions-group">
          <nav className="header__nav">
            <ul className="header__nav-list">
              <li className="header__nav-item">
                <NavButton to="prestatarios" text="REFINANCIAR TARJETA" />
              </li>
              <li className="header__nav-item">
                <NavButton to="inversionistas" text="QUIERO INVERTIR" />
              </li>
              <li className="header__nav-item">
                <NavLink to="/calculadora" className="header__nav-button">
                  CALCULADORA DE AHORRO
                </NavLink>
              </li>
            </ul>
          </nav>

          <div className="header__separator"></div>

          <div className="header__actions">
            {profile ? (
              <div className="header__user-menu">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="header__user-button">
                  {displayName} <span className={`header__user-arrow ${isMenuOpen ? 'open' : ''}`}>▼</span>
                </button>
                {isMenuOpen && (
                  <div className="header__dropdown-menu">
                    <NavLink to={dashboardPath} className="header__dropdown-item" onClick={() => setIsMenuOpen(false)}>
                      Panel de Control
                    </NavLink>
                    <NavLink to="/perfil" className="header__dropdown-item" onClick={() => setIsMenuOpen(false)}>
                      Mi Perfil
                    </NavLink>
                    <div className="header__dropdown-separator"></div>
                    <button onClick={handleLogout} className="header__dropdown-item button">
                      Cerrar Sesión
                    </button>
                    {profile?.id === '8983b4fb-93c8-4951-b2db-c595f61fd3c4' && (
                      <>
                        <div className="header__dropdown-separator"></div>
                        <div className="header__dropdown-roleswitcher" onClick={(e) => e.stopPropagation()}>
                           <RoleSwitcher />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <NavLink to="/auth" className="header__action-button">
                Ingresar
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;