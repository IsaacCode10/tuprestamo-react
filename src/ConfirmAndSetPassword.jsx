import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useProfile } from './hooks/useProfile'; // Importamos nuestro hook de perfil
import './Auth.css'; // Reutilizamos los estilos

const ConfirmAndSetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Por favor, establece tu contraseña para activar tu cuenta.');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile(); // Usamos el hook para obtener el perfil del usuario

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
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(`Error al establecer la contraseña: ${updateError.message}`);
      setLoading(false);
    } else {
      setMessage('¡Contraseña establecida con éxito! Redirigiendo a tu panel...');

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

  // Muestra un mensaje de carga mientras se obtiene el perfil del usuario
  if (profileLoading) {
    return (
        <div className="auth-container">
            <p>Verificando invitación y cargando perfil...</p>
        </div>
    );
  }

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
            />
          </div>
          <button type="submit" disabled={loading || !password}>
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