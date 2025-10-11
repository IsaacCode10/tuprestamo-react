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

      // Now that the user is fully authenticated, get their profile from the DB to redirect
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError("Tuvimos un problema al cargar tu perfil. Por favor, intenta iniciar sesión manualmente.");
        setLoading(false);
        return;
      }

      // Smart redirection based on user role
      setTimeout(() => {
        if (profile?.role === 'prestatario') {
          navigate('/borrower-dashboard');
        } else if (profile?.role === 'inversionista') {
          navigate('/investor-dashboard');
        } else {
          // Fallback to the main page if no role is found
          navigate('/'); 
        }
      }, 2000);
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