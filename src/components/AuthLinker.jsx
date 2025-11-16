import React, { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient.js';

const providerLabel = (p) => {
  switch (p) {
    case 'google': return 'Google';
    case 'apple': return 'Apple';
    case 'email': return 'Email/Contraseña';
    default: return p;
  }
};

const AuthLinker = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refreshUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user || null);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const identities = user?.identities || [];
  const canUnlink = (provider, total) => total > 1 && provider !== 'email';

  const handleLinkGoogle = async () => {
    setError(''); setMessage('');
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/perfil-inversionista' }
      });
      if (error) throw error;
      // Flow redirige; en caso de no redirigir, refrescamos
      if (!data?.url) await refreshUser();
      setMessage('Cuenta de Google vinculada.');
    } catch (e) {
      // Mensaje claro si ya existe la identidad en otra cuenta
      const msg = e?.message || 'No se pudo vincular Google.';
      if (/already/i.test(msg)) {
        setError('Esta cuenta de Google ya está vinculada a otro usuario. Inicia sesión con ese método o desvincúlala desde allí.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
      setTimeout(() => { setMessage(''); setError(''); }, 4000);
    }
  };

  const handleUnlink = async (identityId, provider) => {
    setError(''); setMessage('');
    try {
      setLoading(true);
      const total = identities.length;
      if (!canUnlink(provider, total)) {
        setError('No puedes desvincular este método (dejarías la cuenta sin acceso o es el primario).');
        return;
      }
      const { error } = await supabase.auth.unlinkIdentity({ identity_id: identityId });
      if (error) throw error;
      await refreshUser();
      setMessage('Método desvinculado.');
    } catch (e) {
      setError(e?.message || 'No se pudo desvincular.');
    } finally {
      setLoading(false);
      setTimeout(() => { setMessage(''); setError(''); }, 3000);
    }
  };

  if (loading) return <div>Cargando métodos de acceso…</div>;
  if (!user) return <div>Inicia sesión para gestionar tus métodos de acceso.</div>;

  return (
    <div style={{ marginTop: 12 }}>
      {message && <div style={{ color: 'green', marginBottom: 8 }}>{message}</div>}
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

      <h4 style={{ margin: '8px 0' }}>Vincula tus cuentas</h4>
      <p style={{ color: '#3a5963', marginBottom: 8 }}>
        Recomendado: vincula tu Google para acceso rápido y seguro (biométrico en móvil).
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={handleLinkGoogle} disabled={loading}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          Vincular Google
        </button>
      </div>

      <h4 style={{ margin: '16px 0 8px' }}>Métodos actuales</h4>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {identities.map((id) => (
          <li key={id.identity_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #f0f0f0' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{providerLabel(id.provider)}</div>
              {id.identity_data?.email && (
                <div style={{ color: '#5b7b85', fontSize: 14 }}>{id.identity_data.email}</div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => handleUnlink(id.identity_id, id.provider)}
                disabled={loading || !canUnlink(id.provider, identities.length)}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: '1px solid #e0b3b1', background: '#fff7f7', color: '#b0302c', cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Desvincular
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p style={{ color: '#6b8a94', fontSize: 13, marginTop: 8 }}>
        Nota: no puedes desvincular tu último método de acceso ni el método de Email/Contraseña.
      </p>
    </div>
  );
};

export default AuthLinker;

