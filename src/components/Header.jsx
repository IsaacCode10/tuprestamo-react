import React, { useState, useEffect, useRef } from 'react';
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

  // Si estamos en la pÃ¡gina principal, usamos ScrollLink para un scroll suave
  if (location.pathname === '/') {
    return (
      <ScrollLink to={to} smooth={true} duration={500} offset={-80} className="header__nav-button">
        {text}
      </ScrollLink>
    );
  }

  // Si estamos en otra pÃ¡gina, navegamos primero y luego hacemos scroll
  // Cargar notificaciones al abrir el menú de usuario
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('notifications')
          .select('id, title, body, created_at, read_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(15);
        if (!error && Array.isArray(data)) {
          const mapped = data.map(n => ({ id: n.id, message: n.title || n.body, time: new Date(n.created_at).toLocaleString('es-BO'), read: !!n.read_at }));
          setNotifications(mapped);
        }
      } catch (_) { /* noop */ }
    };
    if (isMenuOpen) load();
  }, [isMenuOpen]);

  // Suscripción Realtime a nuevas notificaciones
  useEffect(() => {
    let channel;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel('notif_' + user.id)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
          const r = payload.new;
          setNotifications(prev => ([{ id: r.id, message: r.title || r.body, time: new Date(r.created_at).toLocaleString('es-BO'), read: !!r.read_at }, ...prev]).slice(0, 15));
        })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const markAllRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (_) { /* noop */ }
  };

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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpis, setKpis] = useState({ totalInvested: 0, positions: 0 });
  // Notificaciones conectadas a Supabase
  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter(n => !n.read).length;
  const centerNavRef = useRef(null);

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
    // Construir el nombre a mostrar con una lÃ³gica de fallbacks
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

  // Ãrea del inversionista (para personalizar el header)
  const investorAreaPaths = [
    '/investor-dashboard',
    '/mis-inversiones',
    '/retiro',
    '/oportunidades',
    '/verificar-cuenta',
    '/faq-inversionista',
    '/terminos',
    '/privacidad'
  ];
  // Solo aplicar header de inversionista si hay sesiÃ³n y rol vÃ¡lido
  const isInvestorLogged = !!profile && (profile.role === 'inversionista' || profile.role === 'admin');
  const isInvestorArea = isInvestorLogged && investorAreaPaths.some((p) => location.pathname.startsWith(p));
  const verificationStatus = profile?.estado_verificacion || 'no_iniciado';
  const statusLabel = {
    verificado: 'Verificada',
    pendiente_revision: 'En revisiÃ³n',
    requiere_revision_manual: 'Requiere revisiÃ³n',
    no_iniciado: 'Pendiente',
  }[verificationStatus] || 'Pendiente';

  // Cerrar menÃº central al hacer click fuera
  useEffect(() => {
    const handleDocClick = (e) => {
      try {
        if (centerNavRef.current && centerNavRef.current.contains(e.target)) return;
      } catch (_) {}
      if (openCenterMenu) setOpenCenterMenu(null);
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [openCenterMenu]);

  // Al cambiar de ruta, cerrar menÃºs abiertos (user y central)
  useEffect(() => {
    if (isMenuOpen) setIsMenuOpen(false);
    if (openCenterMenu) setOpenCenterMenu(null);
    if (isMobileNavOpen) setIsMobileNavOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <header className="header">
      <div className="header__container">
        <NavLink to="/" className="header__logo-link">
          <img src={logo} alt="Logo Tu PrÃ©stamo" className="header__logo" />
        </NavLink>
        <button
          className="header__mobile-toggle"
          aria-label="Abrir menÃº"
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
        >
          <span className="mobile-toggle-bar" />
          <span className="mobile-toggle-bar" />
          <span className="mobile-toggle-bar" />
        </button>

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
              <ul ref={centerNavRef} className="header__nav-list" style={{ justifyContent: 'center', gap: '0.5rem' }}>
                <li className="header__nav-item">
                  <button
                    className="header__nav-button"
                    onClick={() => { setIsMenuOpen(false); setOpenCenterMenu(openCenterMenu === 'invertir' ? null : 'invertir'); }}
                  >
                    Invertir
                  </button>
                  {openCenterMenu === 'invertir' && (
                    <div className="header__dropdown-menu" style={{ minWidth: 220 }}>
                      <button className="header__dropdown-item" onClick={() => { setOpenCenterMenu(null); setIsMenuOpen(false); navigate('/oportunidades'); }}>Ver Oportunidades</button>
                      <button className="header__dropdown-item" onClick={() => { setOpenCenterMenu(null); setIsMenuOpen(false); navigate('/oportunidades?filters=1'); }}>Buscar / Filtrar</button>
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
                    Portafolio
                  </button>
                  {openCenterMenu === 'portafolio' && (
                    <div className="header__dropdown-menu" style={{ minWidth: 260 }}>
                      <div className="header__dropdown-item" style={{ cursor: 'default', paddingBottom: 8 }}>
                        {kpiLoading ? (
                          <span>Cargando resumenâ€¦</span>
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
                      <button className="header__dropdown-item" onClick={() => { setOpenCenterMenu(null); setIsMenuOpen(false); navigate('/mis-inversiones'); }}>Mis Inversiones</button>
                      <button className="header__dropdown-item" onClick={() => { setOpenCenterMenu(null); setIsMenuOpen(false); navigate('/retiro'); }}>Retiros</button>
                    </div>
                  )}
                </li>
                <li className="header__nav-item">
                  <button
                    className="header__nav-button"
                    onClick={() => { setIsMenuOpen(false); setOpenCenterMenu(openCenterMenu === 'cuenta' ? null : 'cuenta'); }}
                  >
                    Cuenta
                  </button>
                  {openCenterMenu === 'cuenta' && (
                    <div className="header__dropdown-menu" style={{ minWidth: 240 }}>
                      <div className="header__dropdown-item" style={{ cursor: 'default', opacity: 0.8 }}>
                        VerificaciÃ³n de identidad: <strong style={{ marginLeft: 6 }}>{statusLabel}</strong>
                      </div>
                      <button className="header__dropdown-item" onClick={() => { setOpenCenterMenu(null); setIsMenuOpen(false); navigate('/verificar-cuenta'); }}>Verificar mi Cuenta</button>
                      <button className="header__dropdown-item" onClick={() => { setOpenCenterMenu(null); setIsMenuOpen(false); navigate('/faq-inversionista'); }}>Centro de Ayuda</button>
                    </div>
                  )}
                </li>
              </ul>
            )}
          </nav>

          <div className="header__separator"></div>

          <div className="header__actions">
            {profile ? (
              <div className="header__user-menu">
                <button onClick={() => { setOpenCenterMenu(null); setIsMenuOpen(!isMenuOpen); }} className="header__user-button">
                  {displayName} <span className={`header__user-arrow ${isMenuOpen ? 'open' : ''}`} aria-hidden="true"></span>
                </button>
                {isMenuOpen && (
                  <div className="header__dropdown-menu">
                    <button className="header__dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={async () => { await markAllRead(); setIsMenuOpen(false); }}>
                      <NotificationBell notifications={notifications} />
                      <span>Notificaciones</span>
                      <span className="notif-pill">{unreadCount}</span>
                    </button>
                    <NavLink to={dashboardPath} className="header__dropdown-item" onClick={() => setIsMenuOpen(false)}>
                      Panel de Control
                    </NavLink>
                    {profile?.role === 'inversionista' ? (
                      <NavLink to="/perfil-inversionista" className="header__dropdown-item" onClick={() => setIsMenuOpen(false)}>
                        Mi Perfil
                      </NavLink>
                    ) : (
                      <NavLink to="/perfil" className="header__dropdown-item" onClick={() => setIsMenuOpen(false)}>
                        Mi Perfil
                      </NavLink>
                    )}
                    <div className="header__dropdown-separator"></div>
                    <button onClick={handleLogout} className="header__dropdown-item button">
                      Cerrar Sesion
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
      {isMobileNavOpen && (
        <div className="mobile-menu-overlay" onClick={() => setIsMobileNavOpen(false)}>
          <div className="mobile-menu-panel" onClick={(e) => e.stopPropagation()}>
            {!profile ? (
              <>
                <button className="mobile-menu-item" onClick={() => { setIsMobileNavOpen(false); navigate('/'); setTimeout(() => document.getElementById('prestatarios')?.scrollIntoView({ behavior: 'smooth' }), 50); }}>Refinanciar tarjeta</button>
                <button className="mobile-menu-item" onClick={() => { setIsMobileNavOpen(false); navigate('/'); setTimeout(() => document.getElementById('inversionistas')?.scrollIntoView({ behavior: 'smooth' }), 50); }}>Quiero invertir</button>
                <button className="mobile-menu-item" onClick={() => { setIsMobileNavOpen(false); navigate('/calculadora'); }}>Calculadora de ahorro</button>
                <div className="mobile-menu-sep" />
                <button className="mobile-menu-item primary" onClick={() => { setIsMobileNavOpen(false); navigate('/auth'); }}>Ingresar</button>
              </>
            ) : (
              <>
                {isInvestorLogged && (
                  <>
                    <button className="mobile-menu-item" onClick={() => { setIsMobileNavOpen(false); navigate('/oportunidades'); }}>Oportunidades</button>
                    <button className="mobile-menu-item" onClick={() => { setIsMobileNavOpen(false); navigate('/mis-inversiones'); }}>Mis inversiones</button>
                    <button className="mobile-menu-item" onClick={() => { setIsMobileNavOpen(false); navigate('/retiro'); }}>Retiros</button>
                    <button className="mobile-menu-item" onClick={() => { setIsMobileNavOpen(false); navigate('/verificar-cuenta'); }}>Verificar cuenta ({statusLabel})</button>
                    <button className="mobile-menu-item" onClick={() => { setIsMobileNavOpen(false); navigate('/faq-inversionista'); }}>Centro de Ayuda</button>
                    <div className="mobile-menu-sep" />
                  </>
                )}
                <button className="mobile-menu-item" onClick={() => { setIsMobileNavOpen(false); navigate(dashboardPath); }}>Panel</button>
                {profile?.role === 'inversionista' ? (
                  <button className="mobile-menu-item" onClick={() => { setIsMobileNavOpen(false); navigate('/perfil-inversionista'); }}>Mi Perfil</button>
                ) : (
                  <button className="mobile-menu-item" onClick={() => { setIsMobileNavOpen(false); navigate('/perfil'); }}>Mi Perfil</button>
                )}
                <button className="mobile-menu-item danger" onClick={() => { setIsMobileNavOpen(false); handleLogout(); }}>Cerrar sesiÃ³n</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
