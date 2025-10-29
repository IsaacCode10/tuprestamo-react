import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { trackEvent } from '@/analytics.js';

const MyInvestmentsList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
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

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/oportunidades')}>Seguir Invirtiendo</button>
        <button onClick={() => navigate('/retiro')}>Solicitar Retiro</button>
      </div>
    </div>
  );
};

export default MyInvestmentsList;

