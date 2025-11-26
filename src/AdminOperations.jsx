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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receiptFiles, setReceiptFiles] = useState({});
  const [borrowerReceiptFiles, setBorrowerReceiptFiles] = useState({});

  const loadIntents = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('payment_intents')
      .select('id, opportunity_id, investor_id, expected_amount, status, expires_at, paid_at, paid_amount, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) setError(error.message);
    setIntents(data || []);
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
    const payload = { status };
    if (status === 'paid') payload.paid_at = new Date().toISOString();
    try {
      if (status === 'paid') {
        const file = borrowerReceiptFiles[id];
        if (file) {
          const path = await uploadReceipt(file, 'borrower');
          payload.receipt_url = path;
        }
      }
      const { error } = await supabase.from('borrower_payment_intents').update(payload).eq('id', id);
      if (error) throw error;
      loadBorrowerIntents();
      setBorrowerReceiptFiles((prev) => ({ ...prev, [id]: null }));
    } catch (e) {
      setError((e).message || 'Error al actualizar cuota');
    }
  };

  const updatePayoutStatus = async (id, status) => {
    const payload = { status };
    if (status === 'paid') payload.paid_at = new Date().toISOString();
    try {
      if (status === 'paid') {
        const file = receiptFiles[id];
        if (file) {
          const path = await uploadReceipt(file, 'payouts');
          payload.receipt_url = path;
        }
      }
      const { error } = await supabase.from('payouts_inversionistas').update(payload).eq('id', id);
      if (error) throw error;
      loadPayouts();
      setReceiptFiles((prev) => ({ ...prev, [id]: null }));
    } catch (e) {
      setError((e).message || 'Error al actualizar payout');
    }
  };

  useEffect(() => {
    loadIntents();
    loadBorrowerIntents();
    loadPayouts();
  }, []);

  return (
    <div className="admin-ops" style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      <h2>Operaciones</h2>
      <div style={{ marginBottom: 12 }}>
        <TabButton active={tab === 'intents'} onClick={() => setTab('intents')}>Pagos de inversionistas</TabButton>
        <TabButton active={tab === 'borrower'} onClick={() => setTab('borrower')}>Pagos de prestatarios</TabButton>
        <TabButton active={tab === 'payouts'} onClick={() => setTab('payouts')}>Payouts a inversionistas</TabButton>
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

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
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {intents.map((i) => (
                <tr key={i.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.opportunity_id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.investor_id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{formatMoney(i.expected_amount)}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.status}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.expires_at ? new Date(i.expires_at).toLocaleString('es-BO') : '—'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn--primary" onClick={() => updateIntentStatus(i.id, 'paid')} disabled={i.status === 'paid'}>Marcar pagado</button>
                    <button className="btn" onClick={() => updateIntentStatus(i.id, 'expired')} disabled={i.status === 'expired'}>Expirar</button>
                  </td>
                </tr>
              ))}
              {intents.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 12, textAlign: 'center', color: '#55747b' }}>No hay intents</td>
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
