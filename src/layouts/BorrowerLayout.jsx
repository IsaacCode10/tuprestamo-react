import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

// Layout persistente para prestatario: conserva scroll y evita remount completo en navegación interna.
const BorrowerLayout = () => {
  const location = useLocation();
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    const saveScroll = () => {
      try {
        sessionStorage.setItem(`borrowerScroll:${prevPath.current}`, String(window.scrollY || 0));
      } catch (_) {}
    };
    window.addEventListener('scroll', saveScroll, { passive: true });
    return () => {
      saveScroll();
      window.removeEventListener('scroll', saveScroll);
    };
  }, []);

  useEffect(() => {
    const key = `borrowerScroll:${location.pathname}`;
    const stored = sessionStorage.getItem(key);
    const y = Number(stored);
    window.requestAnimationFrame(() => {
      window.scrollTo(0, Number.isNaN(y) ? 0 : y);
    });
    prevPath.current = location.pathname;
  }, [location.pathname]);

  return <Outlet />;
};

export default BorrowerLayout;
