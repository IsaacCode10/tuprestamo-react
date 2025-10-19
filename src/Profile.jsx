import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { profileUpdateSchema } from './schemas'; // <-- 1. IMPORT SCHEMA
import './Profile.css';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        setError("No se pudo cargar el perfil.");
      } else if (data) {
        setProfile(data);
        setPhone(data.telefono || '');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // --- 2. ZOD VALIDATION ---
    const result = profileUpdateSchema.safeParse({ telefono: phone });
    if (!result.success) {
      setError(result.error.errors[0].message);
      setTimeout(() => setError(''), 4000);
      return;
    }
    // --- END VALIDATION ---

    setLoading(true);
    try {
      // Use validated data from Zod
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ telefono: result.data.telefono })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setMessage('¡Perfil actualizado con éxito!');
      await fetchProfile(); // Recargamos los datos frescos

    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Hubo un error al actualizar tu perfil. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
      setTimeout(() => { setMessage(''); setError(''); }, 4000);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setTimeout(() => setError(''), 4000);
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({ password: password });

      if (error) throw error;

      setMessage('¡Contraseña cambiada con éxito!');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      setError('Hubo un error al cambiar tu contraseña. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
      setTimeout(() => { setMessage(''); setError(''); }, 4000);
    }
  };

  if (loading) {
    return <div>Cargando perfil...</div>;
  }
  
  if (!profile) {
    return <div>No se pudo cargar el perfil. Por favor, intenta recargar la página.</div>;
  }

  const displayName = profile.nombre_completo || profile.email;

  return (
    <div className="profile-page">
      <h1>Perfil de {displayName}</h1>
      
      {message && <div className="profile-message success">{message}</div>}
      {error && <div className="profile-message error">{error}</div>}

      {/* --- Tarjeta de Información Personal --- */}
      <div className="profile-card">
        <h2>Información Personal</h2>
        <form onSubmit={handleUpdateProfile}>
          <div className="form-group">
            <label htmlFor="fullName">Nombre Completo</label>
            <input type="text" id="fullName" value={profile.nombre_completo || 'No especificado'} disabled />
          </div>
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input type="email" id="email" value={profile.email || ''} disabled />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Número de Teléfono</label>
            <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Añade tu teléfono" />
          </div>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      {/* --- Tarjeta de Seguridad --- */}
      <div className="profile-card">
        <h2>Seguridad</h2>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label htmlFor="password">Nueva Contraseña</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
            <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Vuelve a escribir la contraseña" />
          </div>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>

      {/* --- Tarjeta de Preferencias --- */}
      <div className="profile-card">
        <h2>Preferencias de Notificación</h2>
        <div className="preference-item-static">
          <p>Canal de Notificaciones</p>
          <span className="channel-display">Correo Electrónico</span>
        </div>
        <p className="preferences-note">
          Actualmente, todas las notificaciones importantes, incluyendo recordatorios de pago, se envían a tu correo registrado. Próximamente podrás personalizar tus preferencias y añadir otros canales.
        </p>
      </div>

    </div>
  );
};

export default Profile;
