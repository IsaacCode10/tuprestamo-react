import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Link as ScrollLink } from 'react-scroll';
import { supabase } from '../supabaseClient';
import { trackEvent, resetMixpanel } from '../analytics';
import { useProfile } from '../hooks/useProfile';
import RoleSwitcher from './RoleSwitcher';
import NotificationBell from './NotificationBell.jsx';
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
  const [openCenterMenu, setOpenCenterMenu] = useState(null); // 'invertir' | 'portafolio' | 'cuenta' | null
  const navigate = useNavigate();
  const location = useLocation();
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpis, setKpis] = useState({ totalInvested: 0, positions: 0 });

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

  // Área del inversionista (para personalizar el header)
  const investorAreaPaths = ['/investor-dashboard', '/mis-inversiones', '/retiro', '/oportunidades', '/verificar-cuenta'];
  const isInvestorArea = investorAreaPaths.some((p) => location.pathname.startsWith(p));
  const verificationStatus = profile?.estado_verificacion || 'no_iniciado';
  const statusLabel = {
    verificado: 'Verificado',
    pendiente_revision: 'En revisión',
    requiere_revision_manual: 'Requiere revisión',
    no_iniciado: 'No iniciado',
  }[verificationStatus] || 'No iniciado';

  return (
    <header className="header">
      <div className="header__container">
        <NavLink to="/" className="header__logo-link">
          <img src={logo} alt="Logo Tu Préstamo" className="header__logo" />
        </NavLink>

        <div className="header__nav-actions-group">
          <nav className="header__nav">
            {!isInvestorArea ? (
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
            ) : (
              <ul className="header__nav-list" style={{ justifyContent: 'center', gap: '0.5rem' }}>
                <li className="header__nav-item">
                  <button
                    className="header__nav-button"
                    onClick={() => setOpenCenterMenu(openCenterMenu === 'invertir' ? null : 'invertir')}
                  >
                    Invertir ▾
                  </button>
                  {openCenterMenu === 'invertir' && (
                    <div className="header__dropdown-menu" style={{ minWidth: 220 }}>
                      <button className="header__dropdown-item" onClick={() => { setOpenCenterMenu(null); navigate('/oportunidades'); }}>Ver Oportunidades</button>
                      <button className="header__dropdown-item" onClick={() => { setOpenCenterMenu(null); navigate('/oportunidades?filters=1'); }}>Buscar / Filtrar</button>
                    </div>
                  )}
                </li>
                <li className="header__nav-item">
                  <button
                    className="header__nav-button"
                    onClick={async () => {
                      const next = openCenterMenu === 'portafolio' ? null : 'portafolio';
                      setOpenCenterMenu(next);
                      if (next === 'portafolio' && profile) {
                        try {
                          setKpiLoading(true);
                          const { data: { user } } = await supabase.auth.getUser();
                          if (user) {
                            const { data, error } = await supabase
                              .from('inversiones')
                              .select('amount, opportunity_id')
                              .eq('investor_id', user.id);
                            if (!error && Array.isArray(data)) {
                              const totalInvested = data.reduce((acc, r) => acc + Number(r.amount || 0), 0);
                              const positions = new Set(data.map(r => r.opportunity_id)).size;
                              setKpis({ totalInvested, positions });
                            }
                          }
                        } catch (_) { /* noop */ } finally { setKpiLoading(false); }
                      }
                    }}
                  >
                    Portafolio ▾
                  </button>
                  {openCenterMenu === 'portafolio' && (
                    <div className="header__dropdown-menu" style={{ minWidth: 260 }}>
                      <div className="header__dropdown-item" style={{ cursor: 'default', paddingBottom: 8 }}>
                        {kpiLoading ? (
                          <span>Cargando resumen…</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ minWidth: 110 }}>
                              <div style={{ fontSize: 12, opacity: 0.7 }}>Total Invertido</div>
                              <div style={{ fontWeight: 700 }}>Bs. {Number(kpis.totalInvested || 0).toLocaleString('es-BO')}</div>
                            </div>
                            <div style={{ minWidth: 110 }}>
                              <div style={{ fontSize: 12, opacity: 0.7 }}>Oportunidades</div>
                              <div style={{ fontWeight: 700 }}>{kpis.positions || 0}</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <button className="header__dropdown-item" onClick={() => { setOpenCenterMenu(null); navigate('/mis-inversiones'); }}>Mis Inversiones</button>
                      <button className="header__dropdown-item" onClick={() => { setOpenCenterMenu(null); navigate('/retiro'); }}>Retiros</button>
                    </div>
                  )}
                </li>
                <li className="header__nav-item">
                  <button
                    className="header__nav-button"
                    onClick={() => setOpenCenterMenu(openCenterMenu === 'cuenta' ? null : 'cuenta')}
                  >
                    Cuenta ▾
                  </button>
                  {openCenterMenu === 'cuenta' && (
                    <div className="header__dropdown-menu" style={{ minWidth: 240 }}>
                      <div className="header__dropdown-item" style={{ cursor: 'default', opacity: 0.8 }}>
                        Estado KYC: <strong style={{ marginLeft: 6 }}>{statusLabel}</strong>
                      </div>
                      <button className="header__dropdown-item" onClick={() => { setOpenCenterMenu(null); navigate('/verificar-cuenta'); }}>Verificar mi Cuenta</button>
                      <button className="header__dropdown-item" onClick={() => { setOpenCenterMenu(null); navigate('/faq-inversionista'); }}>Centro de Ayuda</button>
                    </div>
                  )}
                </li>
              </ul>
            )}
          </nav>

          <div className="header__separator"></div>

          <div className="header__actions">
            {isInvestorArea && (
              <div style={{ marginRight: 8 }}>
                <NotificationBell />
              </div>
            )}
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
