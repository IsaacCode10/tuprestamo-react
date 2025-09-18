import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './Auth.css';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('prestatario'); // Nuevo estado para el rol
  const [isSignUp, setIsSignUp] = useState(true); // Estado para alternar
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Lógica de Registro
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: role }, // Guardar el rol en metadata
          },
        });
        if (error) throw error;

        // --- NUEVO: Insertar/Actualizar perfil en la tabla 'profiles' ---
        if (data.user) {
          const { error: profileInsertError } = await supabase
            .from('profiles')
            .upsert({ id: data.user.id, role: role, email: email }); // Assuming 'email' is also in profiles table
          if (profileInsertError) throw profileInsertError;
        }
        // --- FIN NUEVO ---

        alert('¡Registro exitoso! Revisa tu correo para verificar tu cuenta.');
      } else {
        // Lógica de Inicio de Sesión
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // No direct navigation here. App.jsx will handle it based on profile.role
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>{isSignUp ? 'Crear una Cuenta' : 'Iniciar Sesión'}</h2>
      <form onSubmit={handleAuthAction}>
        {isSignUp && (
          <div className="role-selection">
            <label>
              <input
                type="radio"
                name="role"
                value="prestatario"
                checked={role === 'prestatario'}
                onChange={(e) => setRole(e.target.value)}
              />
              Soy Prestatario
            </label>
            <label>
              <input
                type="radio"
                name="role"
                value="inversionista"
                checked={role === 'inversionista'}
                onChange={(e) => setRole(e.target.value)}
              />
              Soy Inversionista
            </label>
          </div>
        )}
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
          />
        </div>
        <div>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Cargando...' : (isSignUp ? 'Registrarse' : 'Iniciar Sesión')}
        </button>
      </form>
      <p className="toggle-auth">
        {isSignUp ? '¿Ya tienes una cuenta? ' : '¿No tienes una cuenta? '}
        <button onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
        </button>
      </p>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default Auth;
