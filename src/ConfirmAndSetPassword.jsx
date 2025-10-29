import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './Auth.css'; // Reusing the auth styles

const ConfirmAndSetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Estás a un paso. Por favor, establece una contraseña para tu cuenta.');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // On component load, check if a user session exists from the magic link.
  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setError("Error al verificar la sesión. Intenta de nuevo desde tu correo.");
        return;
      }
      
      if (!session?.user) {
        setError("Sesión no encontrada o inválida. Por favor, usa el enlace de tu correo para continuar.");
      } else {
        setUser(session.user);
        setError(''); // Clear any previous errors
      }
    };
    checkUserSession();
  }, []);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    
    // Update the password for the currently logged-in user
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(`Error al establecer la contraseña: ${updateError.message}`);
      setLoading(false);
    } else {
      setMessage('¡Contraseña establecida con éxito! Redirigiendo a tu dashboard...');

      // Asegurar que exista el perfil y que tenga nombre/rol desde los metadatos del usuario invitado
      const desiredRole = user?.user_metadata?.role || 'inversionista';
      const desiredNombre = user?.user_metadata?.nombre_completo || user?.user_metadata?.full_name || null;
      const email = user?.email || null;

      // También actualizar metadata del usuario para que Supabase muestre el Display Name
      try {
        if (desiredNombre || desiredRole) {
          await supabase.auth.updateUser({
            data: {
              ...(desiredNombre ? { full_name: desiredNombre, nombre_completo: desiredNombre } : {}),
              ...(desiredRole ? { role: desiredRole } : {}),
            }
          });
        }
      } catch (e) {
        console.warn('No se pudo actualizar user metadata (full_name/role):', e);
      }

      // Intentar obtener el perfil existente (puede no existir aún para flujo de invitación)
      const { data: existingProfile, error: fetchErr } = await supabase
        .from('profiles')
        .select('id, role, nombre_completo, email')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchErr) {
        // Continuar pero registrar el error en consola
        console.warn('No se pudo leer perfil existente, se intentará crear/actualizar:', fetchErr);
      }

      if (!existingProfile) {
        await supabase.from('profiles').upsert({
          id: user.id,
          role: desiredRole,
          nombre_completo: desiredNombre,
          email,
        });
      } else {
        // Completar campos faltantes si es necesario
        const patch = {};
        if (!existingProfile.role && desiredRole) patch.role = desiredRole;
        if (!existingProfile.nombre_completo && desiredNombre) patch.nombre_completo = desiredNombre;
        if (!existingProfile.email && email) patch.email = email;
        if (Object.keys(patch).length > 0) {
          await supabase.from('profiles').update(patch).eq('id', user.id);
        }
      }

      // Leer rol final para decidir redirección
      const { data: finalProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setTimeout(() => {
        if (finalProfile?.role === 'prestatario') {
          navigate('/borrower-dashboard');
        } else if (finalProfile?.role === 'inversionista') {
          navigate('/investor-dashboard');
        } else {
          navigate('/');
        }
      }, 1200);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Establece tu Contraseña</h2>
        <form onSubmit={handleSetPassword}>
          <div>
            <label htmlFor="password">Nueva Contraseña:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder='Debe tener al menos 6 caracteres'
              disabled={!user || loading}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword">Confirmar Contraseña:</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={!user || loading}
            />
          </div>
          <button type="submit" disabled={loading || !password || !user}>
            {loading ? 'Guardando...' : 'Guardar Contraseña y Acceder'}
          </button>
        </form>
        {message && <p className="auth-message auth-message-success">{message}</p>}
        {error && <p className="auth-message auth-message-error">{error}</p>}
        {!user && !error && <p className="auth-message">Verificando sesión...</p>}
      </div>
    </div>
  );
};

export default ConfirmAndSetPassword;
