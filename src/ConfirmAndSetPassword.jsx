import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './Auth.css';

const ConfirmAndSetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Estas a un paso. Por favor, establece una contrasena para tu cuenta.');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [linkErrorCode, setLinkErrorCode] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Parse magic-link errors in the hash (e.g., #error=access_denied&error_code=otp_expired)
  useEffect(() => {
    try {
      const hash = location.hash && location.hash.startsWith('#') ? location.hash.substring(1) : '';
      if (hash) {
        const p = new URLSearchParams(hash);
        const code = p.get('error_code') || '';
        const err = p.get('error') || '';
        if (code) setLinkErrorCode(code);
        if (code === 'otp_expired' || err === 'access_denied') {
          setError('El enlace expiro por seguridad. Solicita un nuevo acceso a tu correo.');
        }
      }
    } catch {}
  }, [location.hash]);

  // On load, check if a user session exists from the magic link
  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError('Error al verificar la sesion. Intenta de nuevo desde tu correo.');
        return;
      }
      if (!session?.user) {
        if (!linkErrorCode) {
          setError('Sesion no encontrada o invalida. Por favor, usa el enlace de tu correo para continuar.');
        }
      } else {
        setUser(session.user);
        setError('');
      }
    };
    checkUserSession();
  }, [linkErrorCode]);

  const handleResendLink = async (e) => {
    e.preventDefault();
    setResendLoading(true);
    setMessage('');
    setError('');
    try {
      if (!email) throw new Error('Ingresa tu email.');
      const redirectTo = `${window.location.origin}/confirmar-y-crear-perfil`;
      const { error: sendErr } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (sendErr) throw sendErr;
      setMessage('Te enviamos un nuevo enlace de acceso a tu correo. Revisa tu bandeja y Spam.');
    } catch (e) {
      setError(e.message || 'No pudimos enviar el enlace.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(`Error al establecer la contrasena: ${updateError.message}`);
      setLoading(false);
      return;
    }

    setMessage('Contrasena establecida con exito! Redirigiendo a tu dashboard...');

    // Ensure profile exists and has role/name from invite metadata
    const desiredRole = user?.user_metadata?.role || 'inversionista';
    const desiredNombre = user?.user_metadata?.nombre_completo || user?.user_metadata?.full_name || null;
    const emailVal = user?.email || null;

    try {
      if (desiredNombre || desiredRole) {
        await supabase.auth.updateUser({
          data: {
            ...(desiredNombre ? { full_name: desiredNombre, nombre_completo: desiredNombre } : {}),
            ...(desiredRole ? { role: desiredRole } : {}),
          }
        });
      }
    } catch {}

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role, nombre_completo, email')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from('profiles').upsert({ id: user.id, role: desiredRole, nombre_completo: desiredNombre, email: emailVal });
    } else {
      const patch = {};
      if (!existingProfile.role && desiredRole) patch.role = desiredRole;
      if (!existingProfile.nombre_completo && desiredNombre) patch.nombre_completo = desiredNombre;
      if (!existingProfile.email && emailVal) patch.email = emailVal;
      if (Object.keys(patch).length > 0) {
        await supabase.from('profiles').update(patch).eq('id', user.id);
      }
    }

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
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Establece tu Contrasena</h2>
        {linkErrorCode && !user && (
          <div className="auth-message auth-message-error" style={{ marginBottom: 12 }}>
            Enlace invalido o expirado. Solicita un nuevo acceso a tu correo.
          </div>
        )}
        {(!user && linkErrorCode) && (
          <form onSubmit={handleResendLink} style={{ marginBottom: 16 }}>
            <div>
              <label htmlFor="email">Tu correo</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required />
            </div>
            <button type="submit" disabled={resendLoading || !email}>
              {resendLoading ? 'Enviando...' : 'Enviar nuevo enlace'}
            </button>
          </form>
        )}
        <form onSubmit={handleSetPassword}>
          <div>
            <label htmlFor="password">Nueva Contrasena:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Debe tener al menos 6 caracteres"
              disabled={!user || loading}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword">Confirmar Contrasena:</label>
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
            {loading ? 'Guardando...' : 'Guardar Contrasena y Acceder'}
          </button>
        </form>
        {message && <p className="auth-message auth-message-success">{message}</p>}
        {error && <p className="auth-message auth-message-error">{error}</p>}
        {!user && !error && <p className="auth-message">Verificando sesion...</p>}
      </div>
    </div>
  );
};

export default ConfirmAndSetPassword;

