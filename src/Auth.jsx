import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './Auth.css';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('prestatario');
  const [isSignUp, setIsSignUp] = useState(false); // Default to Login view
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // --- SIGN UP LOGIC ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: role, full_name: 'Nuevo Usuario' }, // Add a default name
          },
        });
        if (error) throw error;

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ id: data.user.id, role: role, email: email, full_name: 'Nuevo Usuario' });
          if (profileError) throw profileError;
        }
        alert('¡Registro exitoso! Revisa tu correo para verificar tu cuenta.');
        setIsSignUp(false); // Switch to login view after successful sign up

      } else {
        // --- LOGIN LOGIC ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // App.jsx will handle redirection based on the user's role from their profile
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIN VIEW ---
  if (!isSignUp) {
    return (
      <div className="auth-container">
        <div className="auth-form-section">
          <h2>Iniciar Sesión</h2>
          <form onSubmit={handleAuthAction}>
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
            <button type="submit" disabled={loading} className="auth-button">
              {loading ? 'Cargando...' : 'Iniciar Sesión'}
            </button>
          </form>
          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="auth-cta-section">
          <h3>¿Eres nuevo en Tu Préstamo?</h3>
          <p>Descubre cómo podemos ayudarte a alcanzar tus metas financieras.</p>
          <button onClick={() => navigate('/')} className="cta-button primary">
            Refinanciar Tarjeta
          </button>
          <button onClick={() => navigate('/')} className="cta-button secondary">
            Quiero Invertir
          </button>
          
        </div>
      </div>
    );
  }

  // --- SIGN UP VIEW ---
  return (
    <div className="auth-container">
      <div className="auth-form-section">
        <h2>Crear una Cuenta</h2>
        <form onSubmit={handleAuthAction}>
          <div className="role-selection">
            <p>Selecciona tu objetivo principal:</p>
            <label className={role === 'prestatario' ? 'active' : ''}>
              <input
                type="radio"
                name="role"
                value="prestatario"
                checked={role === 'prestatario'}
                onChange={(e) => setRole(e.target.value)}
              />
              <span>Refinanciar Tarjeta</span>
              <small>Para consolidar deudas y mejorar mis finanzas.</small>
            </label>
            <label className={role === 'inversionista' ? 'active' : ''}>
              <input
                type="radio"
                name="role"
                value="inversionista"
                checked={role === 'inversionista'}
                onChange={(e) => setRole(e.target.value)}
              />
              <span>Quiero Invertir</span>
              <small>Para obtener rendimientos atractivos apoyando a otros.</small>
            </label>
          </div>
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
              placeholder="Crea una contraseña segura"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Creando cuenta...' : 'Crear Mi Cuenta'}
          </button>
        </form>
        <p className="toggle-auth">
          ¿Ya tienes una cuenta?{' '}
          <button className="link-button" onClick={() => setIsSignUp(false)}>
            Inicia Sesión
          </button>
        </p>
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};

export default Auth;