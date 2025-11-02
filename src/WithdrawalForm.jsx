import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { trackEvent } from '@/analytics.js';
import InvestorBackBar from '@/components/InvestorBackBar.jsx';
import InvestorBreadcrumbs from '@/components/InvestorBreadcrumbs.jsx';

const WithdrawalForm = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError('Debes iniciar sesión para solicitar un retiro.');
        return;
      }
      const { data, error: pErr } = await supabase
        .from('profiles')
        .select('id, nombre_completo, email, role')
        .eq('id', session.user.id)
        .single();
      if (pErr) {
        setError('No pudimos cargar tu perfil. Intenta nuevamente.');
        return;
      }
      setProfile(data);
    };
    init();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    if (!profile) {
      setError('No pudimos validar tu perfil.');
      return;
    }

    setLoading(true);
    try {
      // MVP: registrar la solicitud en la tabla "solicitudes"
      // Usamos campos existentes: tipo_solicitud='retiro', monto_solicitado y un comentario opcional en "como_se_entero"
      const insert = {
        tipo_solicitud: 'retiro',
        monto_solicitado: amt,
        user_id: profile.id,
        nombre_completo: profile.nombre_completo || 'Inversionista',
        email: profile.email || null,
        como_se_entero: note?.slice(0, 250) || null,
        // telefono, departamento opcionales si están en el perfil en tu esquema
      };
      const { error: insErr } = await supabase.from('solicitudes').insert(insert);
      if (insErr) throw insErr;

      trackEvent('Requested Withdrawal', { amount: amt });
      setMessage('Tu solicitud de retiro fue registrada. Operaciones te contactará.');
      setAmount('');
      setNote('');
      setTimeout(() => navigate('/investor-dashboard'), 1800);
    } catch (e) {
      console.error('Withdrawal request error:', e);
      setError('No pudimos registrar tu solicitud. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="withdrawal-form-container" style={{ maxWidth: 560, margin: '0 auto', padding: 16 }}>
      <InvestorBackBar fallbackTo="/investor-dashboard" label="Volver al Panel" />
      <InvestorBreadcrumbs items={[
        { label: 'Inicio', to: '/investor-dashboard' },
        { label: 'Portafolio', to: '/mis-inversiones' },
        { label: 'Retiros' },
      ]} />
      <h2>Solicitar Retiro</h2>
      <p>Envía una solicitud para retirar fondos disponibles a tu cuenta bancaria registrada.</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="amount">Monto a retirar (Bs.)</label>
          <input
            id="amount"
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 6 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="note">Nota para Operaciones (opcional)</label>
          <textarea
            id="note"
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Cuenta bancaria registrada o aclaraciones..."
            style={{ width: '100%', padding: 8, marginTop: 6 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--primary" type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Enviar Solicitud'}</button>
          <button className="btn btn--secondary" type="button" onClick={() => navigate('/investor-dashboard')}>Cancelar</button>
        </div>
      </form>
      {message && <p style={{ color: 'green', marginTop: 12 }}>{message}</p>}
      {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
    </div>
  );
};

export default WithdrawalForm;

