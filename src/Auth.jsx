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
  const [resetMessage, setResetMessage] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const navigate = useNavigate();

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetMessage(null);

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

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Ingresa tu email para recuperar la contraseña.');
      return;
    }
    setResetLoading(true);
    setError(null);
    setResetMessage(null);
    try {
      const redirectTo = `${window.location.origin}/confirmar-y-crear-perfil`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (resetError) throw resetError;
      setResetMessage('Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja de Spam.');
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setResetLoading(false);
    }
  };

  // Google sign-in deshabilitado hasta contar con custom domain (Supabase Pro)

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
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="password">Contraseña</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showLoginPassword}
                  onMouseDown={() => setShowLoginPassword(true)}
                  onMouseUp={() => setShowLoginPassword(false)}
                  onMouseLeave={() => setShowLoginPassword(false)}
                  onTouchStart={() => setShowLoginPassword(true)}
                  onTouchEnd={() => setShowLoginPassword(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M12 5c-5 0-9 4.5-9 7s4 7 9 7 9-4.5 9-7-4-7-9-7Zm0 12c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5Zm0-8.2A3.2 3.2 0 0 0 8.8 12 3.2 3.2 0 0 0 12 15.2 3.2 3.2 0 0 0 15.2 12 3.2 3.2 0 0 0 12 8.8Z"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="auth-button">
              {loading ? 'Cargando...' : 'Iniciar Sesión'}
            </button>
          </form>
          <button
            type="button"
            className="link-button"
            onClick={handlePasswordReset}
            disabled={resetLoading}
            style={{ marginTop: 12 }}
          >
            {resetLoading ? 'Enviando...' : 'Olvide mi contrasena'}
          </button>
          {error && <p className="error-message">{error}</p>}
          {resetMessage && <p className="success-message">{resetMessage}</p>}
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
          {null}
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
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="password">Contraseña</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showSignupPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crea una contraseña segura"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  aria-label={showSignupPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showSignupPassword}
                  onMouseDown={() => setShowSignupPassword(true)}
                  onMouseUp={() => setShowSignupPassword(false)}
                  onMouseLeave={() => setShowSignupPassword(false)}
                  onTouchStart={() => setShowSignupPassword(true)}
                  onTouchEnd={() => setShowSignupPassword(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M12 5c-5 0-9 4.5-9 7s4 7 9 7 9-4.5 9-7-4-7-9-7Zm0 12c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5Zm0-8.2A3.2 3.2 0 0 0 8.8 12 3.2 3.2 0 0 0 12 15.2 3.2 3.2 0 0 0 15.2 12 3.2 3.2 0 0 0 12 8.8Z"
                    />
                  </svg>
                </button>
              </div>
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
