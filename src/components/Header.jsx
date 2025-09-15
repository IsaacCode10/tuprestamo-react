
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Link as ScrollLink } from 'react-scroll';
import { supabase } from '../supabaseClient';
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
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    navigate('/');
  };

  // Determinar la ruta del panel de control basado en el rol del perfil
  let dashboardPath = '/'; // Fallback por defecto
  if (profile) {
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
        dashboardPath = '/'; // Si el rol no es reconocido, va a la página principal
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
                <NavButton to="prestatarios" text="QUIERO UN PRESTAMO" />
              </li>
              <li className="header__nav-item">
                <NavButton to="inversionistas" text="QUIERO PRESTAR" />
              </li>
              <li className="header__nav-item">
                <NavButton to="como-funciona" text="CÓMO FUNCIONA" />
              </li>
            </ul>
          </nav>

          <div className="header__separator"></div>

          <div className="header__actions">
            {profile ? (
              <div className="header__user-menu">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="header__user-button">
                  Mi Cuenta <span className={`header__user-arrow ${isMenuOpen ? 'open' : ''}`}>▼</span>
                </button>
                {isMenuOpen && (
                  <div className="header__dropdown-menu">
                    <NavLink to={dashboardPath} className="header__dropdown-item" onClick={() => setIsMenuOpen(false)}>
                      Panel de Control
                    </NavLink>
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
