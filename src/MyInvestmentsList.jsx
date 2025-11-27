import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { trackEvent } from '@/analytics.js';
import InvestorBackBar from '@/components/InvestorBackBar.jsx';
import InvestorBreadcrumbs from '@/components/InvestorBreadcrumbs.jsx';

const MyInvestmentsList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [oppsById, setOppsById] = useState({});

  useEffect(() => {
    trackEvent('Viewed Portfolio');
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Debes iniciar sesión para ver tu portafolio.');
          setLoading(false);
          return;
        }

        const { data: invs, error: invErr } = await supabase
          .from('inversiones')
          .select('id, opportunity_id, amount, status, created_at')
          .eq('investor_id', user.id)
          .order('created_at', { ascending: false });
        if (invErr) throw invErr;

        setRows(invs || []);
        const oppIds = Array.from(new Set((invs || []).map(r => r.opportunity_id).filter(Boolean)));
        if (oppIds.length > 0) {
          const { data: opps, error: oppErr } = await supabase
            .from('oportunidades')
            .select('id, monto, plazo_meses, perfil_riesgo, tasa_rendimiento_inversionista')
            .in('id', oppIds);
          if (oppErr) throw oppErr;
          const map = {};
          (opps || []).forEach(o => { map[o.id] = o; });
          setOppsById(map);
        } else {
          setOppsById({});
        }

        // Payouts recibidos / pendientes
        const { data: payoutRows, error: payoutErr } = await supabase
          .from('payouts_inversionistas')
          .select('*')
          .eq('investor_id', user.id)
          .order('created_at', { ascending: false });
        if (payoutErr) throw payoutErr;
        setPayouts(payoutRows || []);

        // Notificaciones in-app
        const { data: notifRows, error: notifErr } = await supabase
          .from('notifications')
          .select('id, title, body, created_at, read_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (notifErr) throw notifErr;
        setNotifications(notifRows || []);
      } catch (e) {
        console.error('Error loading portfolio:', e);
        setError('No pudimos cargar tu portafolio. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const hasRows = useMemo(() => (rows || []).length > 0, [rows]);

  if (loading) return <p>Cargando tu portafolio...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="portfolio-container" style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <InvestorBackBar fallbackTo="/investor-dashboard" label="Volver al Panel" />
      <InvestorBreadcrumbs items={[
        { label: 'Inicio', to: '/investor-dashboard' },
        { label: 'Portafolio', to: '/mis-inversiones' },
        { label: 'Mis Inversiones' },
      ]} />
      <h2>Mis Inversiones</h2>
      {!hasRows ? (
        <div>
          <p>No has registrado inversiones todavía.</p>
          <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Ver Oportunidades</button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Fecha</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Oportunidad</th>
                <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #eee' }}>Monto (Bs.)</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Tasa Bruta</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Plazo</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Riesgo</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const o = oppsById[r.opportunity_id] || {};
                return (
                  <tr key={r.id}>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{new Date(r.created_at).toLocaleDateString('es-BO')}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>ID {r.opportunity_id || '-'}{o.monto ? ` · Bs. ${Number(o.monto).toLocaleString('es-BO')}` : ''}</td>
                    <td style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid #f3f3f3' }}>Bs. {Number(r.amount).toLocaleString('es-BO')}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{o.tasa_rendimiento_inversionista != null ? `${Number(o.tasa_rendimiento_inversionista).toFixed(2)}%` : 'n/d'}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{o.plazo_meses != null ? `${o.plazo_meses} meses` : 'n/d'}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{o.perfil_riesgo || 'n/d'}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{r.status || 'intencion'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasRows && (
        <>
          <h3 style={{ marginTop: 24 }}>Cobros recibidos / próximos pagos</h3>
          {payouts.length === 0 ? (
            <p style={{ color: '#555' }}>Aún no registramos cobros de esta oportunidad. Te avisaremos cuando se acredite.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Fecha</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Oportunidad</th>
                    <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #eee' }}>Monto cobrado (Bs.)</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Estado</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => {
                    const o = oppsById[p.opportunity_id] || {};
                    const fecha = p.paid_at || p.created_at;
                    const montoCobrado = p.paid_amount ?? p.expected_amount ?? p.amount ?? 0;
                    return (
                      <tr key={p.id}>
                        <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{fecha ? new Date(fecha).toLocaleDateString('es-BO') : '-'}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>ID {p.opportunity_id || '-'}{o.monto ? ` · Bs. ${Number(o.monto).toLocaleString('es-BO')}` : ''}</td>
                        <td style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid #f3f3f3' }}>Bs. {Number(montoCobrado).toLocaleString('es-BO')}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{p.status === 'paid' ? 'Pagado' : p.status === 'pending' ? 'Pendiente' : p.status || 'n/d'}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="btn btn--primary" onClick={() => navigate('/oportunidades', { state: { prefillAmount: Number(montoCobrado) || undefined } })}>Reinvertir</button>
                          {p.receipt_url && <a className="btn" href={p.receipt_url} target="_blank" rel="noreferrer">Ver comprobante</a>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {notifications.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>Notificaciones</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {notifications.map(n => (
              <li key={n.id} style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: n.read_at ? '#fafafa' : '#eef9f8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{n.title}</div>
                    <div style={{ color: '#444' }}>{n.body}</div>
                  </div>
                  <div style={{ minWidth: 140, textAlign: 'right', color: '#666', fontSize: 12 }}>
                    {new Date(n.created_at).toLocaleString('es-BO')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Seguir Invirtiendo</button>
      </div>
    </div>
  );
};

export default MyInvestmentsList;
