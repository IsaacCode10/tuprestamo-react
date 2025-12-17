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
  const [oppsById, setOppsById] = useState({});
  const [intentsMap, setIntentsMap] = useState({ byId: {}, byOpportunity: {} });
  const [investorSchedules, setInvestorSchedules] = useState({});
  const [payoutSignedMap, setPayoutSignedMap] = useState({});

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
          const opps = await Promise.all(oppIds.map(async (oid) => {
            const { data, error } = await supabase
              .rpc('get_opportunity_details_with_funding', { p_opportunity_id: oid })
              .single();
            if (error) {
              console.warn('No se pudo cargar oportunidad', oid, error);
              return null;
            }
            return {
              id: data.id,
              monto: data.monto,
              plazo_meses: data.plazo_meses,
              perfil_riesgo: data.perfil_riesgo,
              tasa_rendimiento_inversionista: data.tasa_rendimiento_inversionista,
              total_funded: Number(data?.total_funded || 0),
              saldo_pendiente: data?.saldo_pendiente != null ? Number(data.saldo_pendiente) : null,
              estado: data?.estado,
            };
          }));
          const map = {};
          (opps || []).filter(Boolean).forEach(o => { map[o.id] = o; });
          setOppsById(map);

          // Cargar próximas cuotas prorrateadas para el inversionista (primeras 3)
          const schedulesMap = {};
          await Promise.all(oppIds.map(async (oid) => {
            try {
              const { data, error } = await supabase
                .rpc('get_investor_installments', { p_opportunity_id: oid, p_investor_id: user.id });
              if (error) return;
              schedulesMap[oid] = (data || []).slice(0, 3);
            } catch (_) {
              // noop
            }
          }));
          setInvestorSchedules(schedulesMap);
        } else {
          setOppsById({});
        }

        // Intents del inversionista (para saber si ya subió comprobante)
        const { data: intentRows, error: intentErr } = await supabase
          .from('payment_intents')
          .select('id, opportunity_id, status, receipt_url, created_at')
          .eq('investor_id', user.id)
          .order('created_at', { ascending: false });
        if (intentErr) throw intentErr;
        const byId = {};
        const byOpportunity = {};
        (intentRows || []).forEach((row) => {
          byId[row.id] = row;
          // Guarda el más reciente por oportunidad
          if (!byOpportunity[row.opportunity_id]) {
            byOpportunity[row.opportunity_id] = row;
          }
        });
        setIntentsMap({ byId, byOpportunity });

        // Payouts recibidos / pendientes
        const { data: payoutRows, error: payoutErr } = await supabase
          .from('payouts_inversionistas')
          .select('*')
          .eq('investor_id', user.id)
          .order('created_at', { ascending: false });
        if (payoutErr) throw payoutErr;
        setPayouts(payoutRows || []);
        // Firmar comprobantes de payouts (bucket privado)
        const signedMap = {};
        await Promise.all((payoutRows || []).map(async (p) => {
          if (!p?.receipt_url) return;
          try {
            const { data: signed, error: signErr } = await supabase
              .storage
              .from('comprobantes-pagos')
              .createSignedUrl(p.receipt_url, 60 * 60);
            if (!signErr && signed?.signedUrl) signedMap[p.id] = signed.signedUrl;
          } catch (_) {}
        }));
        setPayoutSignedMap(signedMap);

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
  const hasReviewNotice = useMemo(() => {
    return (rows || []).some((r) => {
      const intent = intentsMap.byOpportunity[r.opportunity_id];
      const isPendingPayment = (r.status || '').toLowerCase() === 'pendiente_pago';
      return isPendingPayment && intent?.receipt_url;
    });
  }, [rows, intentsMap]);

  const formatDate = (value) => {
    if (!value) return 'N/D';
    try {
      return new Date(value).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
      return String(value);
    }
  };

  const formatStatus = (r, o, intent) => {
    const isFondeada = o?.saldo_pendiente != null ? o.saldo_pendiente <= 0 : false;
    const isPendingPayment = (r.status || '').toLowerCase() === 'pendiente_pago';
    const hasReceipt = !!intent?.receipt_url;
    const intentPending = (intent?.status || '').toLowerCase() === 'pending';
    if (isFondeada) return 'Fondeada';
    if (isPendingPayment && hasReceipt && intentPending) return 'Pago en revisión';
    if (isPendingPayment) return 'Pendiente de pago';
    if ((r.status || '').toLowerCase() === 'pagado') return 'Pagado';
    return r.status || 'intencion';
  };

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
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const o = oppsById[r.opportunity_id] || {};
                const intent = intentsMap.byOpportunity[r.opportunity_id];
                const isPendingPayment = (r.status || '').toLowerCase() === 'pendiente_pago';
                const remaining = o.saldo_pendiente != null ? o.saldo_pendiente : null;
                const isFondeada = remaining !== null ? remaining <= 0 : false;
                const showReview = isPendingPayment && intent?.receipt_url && (intent?.status || '').toLowerCase() === 'pending';
                const canPayNow = isPendingPayment && !isFondeada && !showReview;
                return (
                  <tr key={r.id}>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{new Date(r.created_at).toLocaleDateString('es-BO')}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>ID {r.opportunity_id || '-'}{o.monto ? ` · Bs. ${Number(o.monto).toLocaleString('es-BO')}` : ''}</td>
                    <td style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid #f3f3f3' }}>Bs. {Number(r.amount).toLocaleString('es-BO')}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{o.tasa_rendimiento_inversionista != null ? `${Number(o.tasa_rendimiento_inversionista).toFixed(2)}%` : 'n/d'}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{o.plazo_meses != null ? `${o.plazo_meses} meses` : 'n/d'}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{o.perfil_riesgo || 'n/d'}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{formatStatus(r, o, intent)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                      {canPayNow ? (
                        <button className="btn btn--primary" onClick={() => navigate(`/oportunidades/${r.opportunity_id}`)}>
                          Pagar ahora
                        </button>
                      ) : showReview ? (
                        <span style={{ color: '#d9534f', fontWeight: 600 }}>Estamos validando tu pago</span>
                      ) : (
                        <span style={{ color: '#777' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasRows && (
        <>
          <div style={{ marginTop: 16, padding: 12, border: '1px solid #d9f0f0', borderRadius: 10, background: '#f7fbfc' }}>
            <strong>Estado de tus préstamos financiados</strong>
            <p style={{ margin: '6px 0 0 0', color: '#0f5a62' }}>
              Los prestatarios pagan el <strong>día 5 de cada mes</strong>. Te avisaremos cuando se acredite cada cobro.
            </p>
          </div>
          <h3 style={{ marginTop: 24 }}>Cobros recibidos / próximos pagos</h3>
          {payouts.length === 0 ? (
            <p style={{ color: '#555' }}>{hasReviewNotice ? 'Recibimos tu comprobante. Te avisaremos cuando se acredite.' : 'Aún no registramos cobros de esta oportunidad. Te avisaremos cuando se acredite.'}</p>
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
                    const signedReceipt = payoutSignedMap[p.id] || null;
                    return (
                      <tr key={p.id}>
                        <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{fecha ? new Date(fecha).toLocaleDateString('es-BO') : '-'}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>ID {p.opportunity_id || '-'}{o.monto ? ` · Bs. ${Number(o.monto).toLocaleString('es-BO')}` : ''}</td>
                        <td style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid #f3f3f3' }}>Bs. {Number(montoCobrado).toLocaleString('es-BO')}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{p.status === 'paid' ? 'Pagado' : p.status === 'pending' ? 'Pendiente' : p.status || 'n/d'}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="btn btn--primary" onClick={() => navigate('/oportunidades', { state: { prefillAmount: Number(montoCobrado) || undefined } })}>Reinvertir</button>
                          {signedReceipt && <a className="btn" href={signedReceipt} target="_blank" rel="noreferrer">Ver comprobante</a>}
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

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Seguir Invirtiendo</button>
      </div>

      {hasRows && (
      <div style={{ marginTop: 24 }}>
          <h3>Próximas cuotas (tu parte)</h3>
          <p style={{ color: '#55747b', marginTop: 4 }}>Cálculo prorrateado según tu inversión. Neto estima 1% de comisión.</p>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {rows.map((r) => {
              const o = oppsById[r.opportunity_id] || {};
              const upcoming = investorSchedules[r.opportunity_id] || [];
              const isFondeada = o?.saldo_pendiente != null ? o.saldo_pendiente <= 0 : false;
              if (!isFondeada || upcoming.length === 0) return null;
              return (
                <div key={`sched-${r.opportunity_id}`} style={{ border: '1px solid #e6f4f3', borderRadius: 10, padding: 12, background: '#f7fbfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>ID {r.opportunity_id}</div>
                      {o.monto && <div style={{ color: '#0f5a62' }}>Meta: Bs. {Number(o.monto).toLocaleString('es-BO')}</div>}
                    </div>
                    <div style={{ background: '#d4f4ef', color: '#0f5a62', borderRadius: 999, padding: '4px 10px', fontWeight: 700 }}>Fondeada</div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    {upcoming.map((cuota) => (
                      <div key={cuota.installment_no} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e1eeee' }}>
                        <span>Cuota {cuota.installment_no}</span>
                        <span style={{ fontWeight: 700 }}>{formatDate(cuota.due_date)}</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#0f5a62', fontWeight: 700 }}>Bs. {Number(cuota.payment_investor_bruto || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <small style={{ color: '#55747b' }}>Neto est.: Bs. {Number(cuota.payment_investor_neto || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <small style={{ color: '#55747b' }}>Pago dirigido ejecutado; cobros se acreditan tras conciliación.</small>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyInvestmentsList;
