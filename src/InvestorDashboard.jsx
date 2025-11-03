import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const InvestorDashboard = ({ profile, refetchProfile }) => {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  // Usamos un estado local para el perfil para poder actualizarlo
  const [localProfile, setLocalProfile] = useState(profile);

  useEffect(() => {
    setLocalProfile(profile); // Sincronizar con el perfil global si cambia
  }, [profile]);

  const verification = localProfile?.estado_verificacion || 'no_iniciado';

  const Banner = () => {
    if (verification === 'verificado') return null;
    if (verification === 'pendiente_revision') {
      return (
        <div style={{ background: '#fff9e6', border: '1px solid #ffe08a', color: '#8a6d3b', padding: 12, borderRadius: 8 }}>
          Tu verificaciÃ³n de identidad estÃ¡ en revisiÃ³n. Puedes navegar y conocer oportunidades; te avisaremos cuando finalice.
        </div>
      );
    }
    if (verification === 'requiere_revision_manual') {
      return (
        <div style={{ background: '#ffe6e6', border: '1px solid #ffb3b3', color: '#8b0000', padding: 12, borderRadius: 8 }}>
          No pudimos confirmar tu verificaciÃ³n. Revisa tu informaciÃ³n y vuelve a intentarlo.
        </div>
      );
    }
    return (
      <div style={{ background: '#eef9f8', border: '1px solid #a8ede6', color: '#11696b', padding: 12, borderRadius: 8 }}>
        Verifica tu cuenta antes de invertir. PodrÃ¡s explorar oportunidades de inmediato y completar la verificaciÃ³n cuando estÃ©s listo.
      </div>
    );
  };

  const renderContent = () => {
    if (!localProfile) {
      return <p>Cargando informaciÃ³n de tu perfilâ€¦</p>;
    }

    return (
      <>
        <div className="dashboard-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
          <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Ver Oportunidades</button>
          <button className="btn" onClick={() => navigate('/mis-inversiones')}>Mis Inversiones</button>
          <button className="btn" onClick={() => navigate('/retiro')}>Solicitar Retiro</button>
          {verification !== 'verificado' && (
            <button className="btn" onClick={() => navigate('/verificar-cuenta')}>Verificar mi Cuenta</button>
          )}
        </div>
      </>
    );
  };

  const Pill = () => {
    if (verification === 'no_iniciado') return null; // No mostrar pill para el estado inicial
    const bg = verification === 'verificado' ? '#e6fffb' : verification === 'pendiente_revision' ? '#fff9e6' : '#ffe6e6';
    const fg = verification === 'verificado' ? '#006d75' : verification === 'pendiente_revision' ? '#8a6d3b' : '#8b0000';
    const text = verification === 'verificado' ? 'Verificada' : verification === 'pendiente_revision' ? 'En revisiÃ³n' : 'Requiere revisiÃ³n';
    return (
      <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: bg, color: fg }}>
        VerificaciÃ³n: {text}
      </span>
    );
  };

  // Mostrar automÃ¡ticamente notificaciÃ³n KYC (sin abrir menÃº)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('notifications')
          .select('id, title, body, link_url, created_at, read_at')
          .eq('user_id', user.id)
          .eq('type', 'kyc_status')
          .is('read_at', null)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!error && mounted && data && data.length > 0) {
          setToast({ id: data[0].id, title: data[0].title, body: data[0].body, link: data[0].link_url });
        }
      } catch (_) {}
    })();
    return () => { mounted = false };
  }, []);

  const dismissToast = async (openLink = false) => {
    try {
      if (toast?.id) {
        await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', toast.id);
      }
    } catch (_) {}
    const link = toast?.link;
    setToast(null);
    
    // Refrescar el perfil para obtener el estado de verificaciÃ³n mÃ¡s reciente
    if (refetchProfile) {
      refetchProfile();
    }

    if (openLink && link) {
      try {
        const url = new URL(link);
        navigate(url.pathname + (url.search || ''));
      } catch {
        navigate(link);
      }
    }
  };

  const Toast = () => {
    if (!toast) return null;
    return (
      <div style={{ marginTop: 12, padding: 12, borderRadius: 8, border: '1px solid #a8ede6', background: '#eef9f8', color: '#11696b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{toast.title}</div>
          <div style={{ opacity: 0.9 }}>{toast.body}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {toast.link && (<button className="btn btn--primary" onClick={() => dismissToast(true)}>Abrir</button>)}
          <button className="btn" onClick={() => dismissToast(false)}>Cerrar</button>
        </div>
      </div>
    );
  };

  return (
    <div className="investor-dashboard-container">
      <div style={{ marginTop: 6 }}>
        <Pill />
      </div>
      <div style={{ marginTop: 12 }}>
        <Banner />
      </div>
      <Toast />
      {renderContent()}
    </div>
  );
};

export default InvestorDashboard;

