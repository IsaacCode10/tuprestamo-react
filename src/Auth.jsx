import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { trackEvent, identifyUser } from './analytics';
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
          // Identify the user in Mixpanel and set profile properties
          identifyUser(data.user.id, {
            $email: email,
            'Signup Role': role,
            full_name: 'Nuevo Usuario',
          });
          // Track the sign-up event
          trackEvent('Signed Up', { 'Signup Role': role });

          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ id: data.user.id, role: role, email: email, full_name: 'Nuevo Usuario' });
          if (profileError) throw profileError;
        }
        alert('¡Registro exitoso! Revisa tu correo para verificar tu cuenta.');
        setIsSignUp(false); // Switch to login view after successful sign up

      } else {
        // --- LOGIN LOGIC ---
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
          trackEvent('Login Failed', { 'Error Message': error.message });
          throw error;
        }

        if(data.user) {
            identifyUser(data.user.id, { $email: email });
            trackEvent('Logged In');
        }
        // App.jsx will handle redirection based on the user's role from their profile
      }
    } catch (error) {
      setError(error.message);
      // The login failure is already tracked where the error is thrown
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'consent', access_type: 'offline' }
        }
      });
      if (error) throw error;
      // Redirige a Google; no continuamos aqui
    } catch (e) {
      setError(e.message);
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
          <div style={{ marginTop: 16 }}>
            <button type="button" onClick={handleGoogleLogin} disabled={loading} className="google-btn">
              <svg className="google-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.22 3.6l6.9-6.9C36.64 2.02 30.82 0 24 0 14.62 0 6.4 5.38 2.56 13.22l8.04 6.24C12.36 13.02 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.22-.44-4.74H24v9.04h12.7c-.55 2.96-2.22 5.48-4.72 7.18l7.24 5.62C43.93 37.04 46.5 30.96 46.5 24z"/>
                <path fill="#FBBC05" d="M10.6 28.46A14.5 14.5 0 0 1 9.5 24c0-1.55.26-3.04.74-4.44l-8.04-6.24C.74 15.92 0 19.86 0 24c0 4.14.74 8.08 2.2 11.68l8.4-6.22z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.92-2.14 15.9-5.82l-7.24-5.62c-2 1.34-4.58 2.14-8.66 2.14-6.26 0-11.64-3.52-13.4-8.92l-8.4 6.22C6.4 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              Continuar con Google
            </button>
          </div>
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
