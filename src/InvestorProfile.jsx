import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { profileUpdateSchema } from './schemas';
import InvestorBackBar from '@/components/InvestorBackBar.jsx';
import InvestorBreadcrumbs from '@/components/InvestorBreadcrumbs.jsx';

const InvestorProfile = () => {
  const [profile, setProfile] = useState(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Debes iniciar sesión.'); setLoading(false); return; }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      setProfile(data);
      setPhone(data?.telefono || '');
    } catch (e) {
      console.error('Load profile error', e);
      setError('No se pudo cargar tu perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleSavePhone = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    const parsed = profileUpdateSchema.safeParse({ telefono: phone });
    if (!parsed.success) {
      setError(parsed.error.errors?.[0]?.message || 'Datos inválidos');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('profiles').update({ telefono: parsed.data.telefono }).eq('id', profile.id);
      if (error) throw error;
      setMessage('Teléfono actualizado.');
      await loadProfile();
    } catch (e) {
      console.error('Update phone error', e);
      setError('No se pudo actualizar. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setTimeout(() => { setMessage(''); setError(''); }, 3000);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Contraseña cambiada.');
      setPassword(''); setConfirmPassword('');
    } catch (e) {
      console.error('Password change error', e);
      setError('No se pudo cambiar la contraseña.');
    } finally {
      setLoading(false);
      setTimeout(() => { setMessage(''); setError(''); }, 3000);
    }
  };

  if (loading) return <div className="container" style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>Cargando perfil…</div>;
  if (!profile) return <div className="container" style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>No se encontró el perfil.</div>;

  const displayName = profile.nombre_completo || profile.email;

  return (
    <div className="container" style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <InvestorBackBar fallbackTo="/investor-dashboard" label="Volver al Panel" />
      <InvestorBreadcrumbs items={[{ label: 'Inicio', to: '/investor-dashboard' }, { label: 'Cuenta', to: '/perfil-inversionista' }, { label: 'Mi Perfil' }]} />
      <h2>Mi Perfil de Inversionista</h2>

      {message && <div style={{ color: 'green', marginTop: 8 }}>{message}</div>}
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}

      <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8, marginTop: 16 }}>
        <h3>Datos</h3>
        <div style={{ marginTop: 8 }}>
          <label>Nombre Completo</label>
          <input type="text" value={profile.nombre_completo || ''} disabled style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Correo</label>
          <input type="email" value={profile.email || ''} disabled style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>
        <form onSubmit={handleSavePhone} style={{ marginTop: 8 }}>
          <label>Teléfono</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
          <button type="submit" className="btn btn--primary" style={{ marginTop: 10 }} disabled={loading}>
            {loading ? 'Guardando…' : 'Guardar Teléfono'}
          </button>
        </form>
      </div>

      <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8, marginTop: 16 }}>
        <h3>Seguridad</h3>
        <form onSubmit={handleChangePassword}>
          <label>Nueva Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
          <label style={{ marginTop: 8, display: 'block' }}>Confirmar Contraseña</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
          <button type="submit" className="btn" style={{ marginTop: 10 }} disabled={loading}>
            {loading ? 'Cambiando…' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InvestorProfile;

