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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const updateIntentStatus = async (id, status) => {
    const { error } = await supabase.from('payment_intents').update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null }).eq('id', id);
    if (error) {
      setError(error.message);
    } else {
      loadIntents();
    }
  };

  useEffect(() => {
    loadIntents();
  }, []);

  return (
    <div className="admin-ops" style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      <h2>Operaciones</h2>
      <div style={{ marginBottom: 12 }}>
        <TabButton active={tab === 'intents'} onClick={() => setTab('intents')}>Pagos de inversionistas</TabButton>
        {/* placeholders para futuras pestañas */}
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
    </div>
  );
};

export default AdminOperations;
