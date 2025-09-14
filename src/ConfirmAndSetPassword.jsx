import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './Auth.css'; // Reutilizamos los estilos

const ConfirmAndSetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Por favor, establece tu contraseña para activar tu cuenta.');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Al cargar el componente, verificamos si hay un usuario en la sesión actual
  // que fue establecida por el enlace de recuperación.
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("No se pudo verificar la sesión. Por favor, intenta de nuevo desde el enlace en tu correo.");
      } else {
        setUser(user);
      }
    };
    fetchUser();
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
    // Actualizamos la contraseña para el usuario en sesión
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(`Error al establecer la contraseña: ${updateError.message}`);
      setLoading(false);
    } else {
      setMessage('¡Contraseña establecida con éxito! Obteniendo tu perfil y redirigiendo...');

      // Ahora que el usuario está completamente autenticado, obtenemos su perfil de la DB
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

      // Redirección inteligente basada en el rol del usuario
      setTimeout(() => {
        if (profile?.role === 'prestatario') {
          navigate('/borrower-dashboard');
        } else if (profile?.role === 'inversionista') {
          navigate('/investor-dashboard');
        } else {
          // Si por alguna razón no hay rol, lo mandamos a la página principal
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
              disabled={!user} // Deshabilitar si no se ha verificado el usuario
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
              disabled={!user} // Deshabilitar si no se ha verificado el usuario
            />
          </div>
          <button type="submit" disabled={loading || !password || !user}>
            {loading ? 'Guardando...' : 'Guardar Contraseña y Acceder'}
          </button>
        </form>
        {message && <p className="auth-message auth-message-success">{message}</p>}
        {error && <p className="auth-message auth-message-error">{error}</p>}
      </div>
    </div>
  );
};

export default ConfirmAndSetPassword;