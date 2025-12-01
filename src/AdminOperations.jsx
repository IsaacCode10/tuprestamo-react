import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`btn ${active ? 'btn--primary' : ''}`}
    style={{ marginRight: 8, marginBottom: 8 }}
  >
    {children}
  </button>
);

const formatMoney = (v) => `Bs ${Number(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AdminOperations = () => {
  const [tab, setTab] = useState('intents');
  const [intents, setIntents] = useState([]);
  const [borrowerIntents, setBorrowerIntents] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [investorMap, setInvestorMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receiptFiles, setReceiptFiles] = useState({});
  const [borrowerReceiptFiles, setBorrowerReceiptFiles] = useState({});
  const [infoMessage, setInfoMessage] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const loadIntents = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('payment_intents')
      .select('id, opportunity_id, investor_id, expected_amount, status, expires_at, paid_at, paid_amount, created_at, receipt_url')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) setError(error.message);
    const rows = data || [];
    setIntents(rows);
    // cargar perfiles para mostrar nombre/email en vez de UUID
    const investorIds = Array.from(new Set(rows.map(r => r.investor_id).filter(Boolean)));
    if (investorIds.length > 0) {
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, nombre_completo, email')
        .in('id', investorIds);
      if (!profErr && profs) {
        const map = {};
        profs.forEach(p => { map[p.id] = `${p.nombre_completo || ''}${p.email ? ` (${p.email})` : ''}`.trim(); });
        setInvestorMap(map);
      }
    }
    setLoading(false);
  };

  const loadBorrowerIntents = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('borrower_payment_intents')
      .select('id, opportunity_id, borrower_id, expected_amount, status, due_date, paid_at, paid_amount, created_at')
      .order('due_date', { ascending: true })
      .limit(100);
    if (error) setError(error.message);
    setBorrowerIntents(data || []);
    setLoading(false);
  };

  const loadPayouts = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('payouts_inversionistas')
      .select('id, opportunity_id, investor_id, amount, status, paid_at, receipt_url, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) setError(error.message);
    setPayouts(data || []);
    setLoading(false);
  };

  const reopenOpportunity = async (opportunityId) => {
    try {
      setError('');
      setInfoMessage('');
      const { error } = await supabase.rpc('reopen_opportunity_if_unfunded', { p_opportunity_id: opportunityId });
      if (error) throw error;
      setInfoMessage(`Oportunidad ${opportunityId} reabierta a disponible (sin pagos acreditados).`);
      loadIntents();
    } catch (e) {
      setError((e).message || 'No se pudo reabrir la oportunidad');
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    setError('');
    setInfoMessage('');
    await Promise.all([loadIntents(), loadBorrowerIntents(), loadPayouts()]);
    setLastRefreshed(new Date());
    setLoading(false);
  };

  const uploadReceipt = async (file, prefix = 'payouts') => {
    if (!file) return null;
    const path = `${prefix}/${Date.now()}_${file.name}`;
    const { error, data } = await supabase.storage.from('comprobantes-pagos').upload(path, file);
    if (error) throw error;
    return data?.path || path;
  };

  const updateIntentStatus = async (id, status) => {
    try {
      if (status === 'paid') {
        // Usar RPC para recalcular fondeo e inversiones pagadas
        const { error: rpcErr } = await supabase.rpc('mark_payment_intent_paid', { p_intent_id: id });
        if (rpcErr) throw rpcErr;
      } else {
        const { error } = await supabase.from('payment_intents').update({ status }).eq('id', id);
        if (error) throw error;
      }
      loadIntents();
    } catch (e) {
      setError((e).message || 'Error al actualizar intent');
    }
  };

  const updateBorrowerIntentStatus = async (id, status) => {
    try {
      if (status === 'paid') {
        const file = borrowerReceiptFiles[id];
        let receiptPath = null;
        if (file) {
          receiptPath = await uploadReceipt(file, 'borrower');
        }
        const { error: rpcErr } = await supabase.rpc('process_borrower_payment', {
          p_intent_id: id,
          p_receipt_url: receiptPath,
        });
        if (rpcErr) throw rpcErr;
        setBorrowerReceiptFiles((prev) => ({ ...prev, [id]: null }));
      } else {
        const payload = { status };
        if (status === 'expired') payload.paid_at = null;
        const { error } = await supabase.from('borrower_payment_intents').update(payload).eq('id', id);
        if (error) throw error;
      }
      loadBorrowerIntents();
    } catch (e) {
      setError((e).message || 'Error al actualizar cuota');
    }
  };

  const updatePayoutStatus = async (id, status) => {
    try {
      if (status === 'paid') {
        const file = receiptFiles[id];
        let receiptPath = null;
        if (file) {
          receiptPath = await uploadReceipt(file, 'payouts');
        }
        const { error: rpcErr } = await supabase.rpc('mark_payout_paid', {
          p_payout_id: id,
          p_receipt_url: receiptPath,
        });
        if (rpcErr) throw rpcErr;
        setReceiptFiles((prev) => ({ ...prev, [id]: null }));
      } else {
        const payload = { status };
        if (status === 'expired') payload.paid_at = null;
        const { error } = await supabase.from('payouts_inversionistas').update(payload).eq('id', id);
        if (error) throw error;
      }
      loadPayouts();
    } catch (e) {
      setError((e).message || 'Error al actualizar payout');
    }
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => { refreshAll(); }, 30000); // auto refresh cada 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="admin-ops" style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      <h2>Operaciones</h2>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <TabButton active={tab === 'intents'} onClick={() => setTab('intents')}>Pagos de inversionistas</TabButton>
        <TabButton active={tab === 'review'} onClick={() => setTab('review')}>Por conciliar</TabButton>
        <TabButton active={tab === 'borrower'} onClick={() => setTab('borrower')}>Pagos de prestatarios</TabButton>
        <TabButton active={tab === 'payouts'} onClick={() => setTab('payouts')}>Payouts a inversionistas</TabButton>
        <button className="btn btn--secondary" onClick={refreshAll} disabled={loading}>Refrescar</button>
        {lastRefreshed && (
          <span style={{ color: '#55747b', fontSize: '0.9rem' }}>
            Actualizado: {lastRefreshed.toLocaleTimeString('es-BO')}
          </span>
        )}
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {infoMessage && <p style={{ color: '#0f5a62', fontWeight: 600 }}>{infoMessage}</p>}

      {tab === 'intents' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>ID</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Oportunidad</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Inversionista</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Monto</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Estado</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Expira</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Comprobante</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {intents.map((i) => {
                const statusLower = (i.status || '').toLowerCase();
                const canPay = ['pending', 'unmatched'].includes(statusLower);
                const canExpire = statusLower === 'pending';
                return (
                  <tr key={i.id}>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', fontFamily: 'monospace', fontSize: '0.9rem' }}>{i.id}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.opportunity_id}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{investorMap[i.investor_id] || i.investor_id}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{formatMoney(i.expected_amount)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.status}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.expires_at ? new Date(i.expires_at).toLocaleString('es-BO') : '—'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                    {i.receipt_url ? <a className="btn" href={supabase.storage.from('comprobantes-pagos').getPublicUrl(i.receipt_url).data.publicUrl} target="_blank" rel="noreferrer">Ver</a> : '—'}
                  </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn--primary" onClick={() => updateIntentStatus(i.id, 'paid')} disabled={!canPay}>Marcar pagado</button>
                      <button className="btn" onClick={() => updateIntentStatus(i.id, 'expired')} disabled={!canExpire}>Expirar</button>
                      <button className="btn" onClick={() => reopenOpportunity(i.opportunity_id)} disabled={statusLower === 'paid'}>Reabrir (sin pagos)</button>
                    </td>
                  </tr>
                );
              })}
              {intents.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 12, textAlign: 'center', color: '#55747b' }}>No hay intents</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'review' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>ID</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Oportunidad</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Inversionista</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Monto</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Estado</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Expira</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Comprobante</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {intents
                .filter((i) => ['pending', 'unmatched'].includes((i.status || '').toLowerCase()))
                .sort((a, b) => {
                  const aExp = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
                  const bExp = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
                  return aExp - bExp;
                })
                .map((i) => (
                  <tr key={i.id}>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', fontFamily: 'monospace', fontSize: '0.9rem' }}>{i.id}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.opportunity_id}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{investorMap[i.investor_id] || i.investor_id}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{formatMoney(i.expected_amount)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.status}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.expires_at ? new Date(i.expires_at).toLocaleString('es-BO') : '—'}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                      {i.receipt_url ? (
                        <a className="btn" href={supabase.storage.from('comprobantes-pagos').getPublicUrl(i.receipt_url).data.publicUrl} target="_blank" rel="noreferrer">Ver</a>
                      ) : (
                        <span style={{ color: '#888' }}>Sin comprobante</span>
                      )}
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn--primary" onClick={() => updateIntentStatus(i.id, 'paid')} disabled={i.status === 'paid'}>Marcar pagado</button>
                      <button className="btn" onClick={() => updateIntentStatus(i.id, 'expired')} disabled={i.status === 'expired'}>Expirar</button>
                    </td>
                  </tr>
                ))}
              {intents.filter((i) => ['pending', 'unmatched'].includes((i.status || '').toLowerCase())).length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 12, textAlign: 'center', color: '#55747b' }}>No hay pagos pendientes por conciliar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'borrower' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>ID</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Oportunidad</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Prestatario</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Monto</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Vence</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Estado</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Recibo</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {borrowerIntents.map((i) => (
                <tr key={i.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.opportunity_id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.borrower_id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{formatMoney(i.expected_amount)}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.due_date ? new Date(i.due_date).toLocaleDateString('es-BO') : '—'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.status}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                    {i.receipt_url ? (
                      <a href={i.receipt_url} target="_blank" rel="noreferrer">Ver comprobante</a>
                    ) : '—'}
                    <div style={{ marginTop: 6 }}>
                      <input type="file" accept=".pdf,image/*" onChange={(e) => setBorrowerReceiptFiles(prev => ({ ...prev, [i.id]: e.target.files?.[0] || null }))} />
                    </div>
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn--primary" onClick={() => updateBorrowerIntentStatus(i.id, 'paid')} disabled={i.status === 'paid'}>Marcar pagado</button>
                    <button className="btn" onClick={() => updateBorrowerIntentStatus(i.id, 'expired')} disabled={i.status === 'expired'}>Expirar</button>
                  </td>
                </tr>
              ))}
              {borrowerIntents.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 12, textAlign: 'center', color: '#55747b' }}>No hay cuotas registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'payouts' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>ID</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Oportunidad</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Inversionista</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Monto</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Estado</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Recibo</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{p.id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{p.opportunity_id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{p.investor_id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{formatMoney(p.amount)}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{p.status}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                    {p.receipt_url ? (
                      <a href={p.receipt_url} target="_blank" rel="noreferrer">Ver comprobante</a>
                    ) : '—'}
                    <div style={{ marginTop: 6 }}>
                      <input type="file" accept=".pdf,image/*" onChange={(e) => setReceiptFiles(prev => ({ ...prev, [p.id]: e.target.files?.[0] || null }))} />
                    </div>
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn--primary" onClick={() => updatePayoutStatus(p.id, 'paid')} disabled={p.status === 'paid'}>Marcar pagado</button>
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 12, textAlign: 'center', color: '#55747b' }}>No hay payouts</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOperations;
