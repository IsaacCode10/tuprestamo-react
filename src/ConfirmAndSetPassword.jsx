import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './Auth.css'; // Reusing the auth styles

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
  // Parse magic-link errors in hash (e.g., #error=access_denied&error_code=otp_expired)
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

  // On component load, check if a user session exists from the magic link.
  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setError('Error al verificar la sesion. Intenta de nuevo desde tu correo.');
        return;
      }
      
      if (!session?.user) {
        if (!linkErrorCode) {
          setError("Sesion no encontrada o invalida. Por favor, usa el enlace de tu correo para continuar.");
        }
      } else {
        setUser(session.user);
        setError(''); // Clear any previous errors
      }
    };
    checkUserSession();
  }, [linkErrorCode]);
  const handleResendLink = async (e) => {
    e.preventDefault();
    setResendLoading(true);
      const redirectTo = `${window.location.origin}/confirmar-y-crear-perfil`;
    setError('');
    try {
      if (!email) throw new Error('Ingresa tu email.');
      
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
      setError('Las contrasenas no coinciden.');
    setMessage('');

    if (password !== confirmPassword) {
      setError('La contrasena debe tener al menos 6 caracteres.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseÃƒÆ’Ã‚Â±a debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    
      setError(Error al establecer la contrasena: );
    const { error: updateError } = await supabase.auth.updateUser({ password });

      setMessage('Contrasena establecida con exito! Redirigiendo a tu dashboard...');
      setError(`Error al establecer la contraseÃƒÆ’Ã‚Â±a: ${updateError.message}`);
      setLoading(false);
    } else {
      setMessage('Ãƒâ€šÃ‚Â¡ContraseÃƒÆ’Ã‚Â±a establecida con ÃƒÆ’Ã‚Â©xito! Redirigiendo a tu dashboard...');

      // Asegurar que exista el perfil y que tenga nombre/rol desde los metadatos del usuario invitado
      const desiredRole = user?.user_metadata?.role || 'inversionista';
      const desiredNombre = user?.user_metadata?.nombre_completo || user?.user_metadata?.full_name || null;
      const email = user?.email || null;

      // TambiÃƒÆ’Ã‚Â©n actualizar metadata del usuario para que Supabase muestre el Display Name
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

      // Intentar obtener el perfil existente (puede no existir aÃƒÆ’Ã‚Âºn para flujo de invitaciÃƒÆ’Ã‚Â³n)
      const { data: existingProfile, error: fetchErr } = await supabase
        .from('profiles')
        .select('id, role, nombre_completo, email')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchErr) {
        // Continuar pero registrar el error en consola
        console.warn('No se pudo leer perfil existente, se intentarÃƒÆ’Ã‚Â¡ crear/actualizar:', fetchErr);
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

      // Leer rol final para decidir redirecciÃƒÆ’Ã‚Â³n
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
        <h2>Establece tu Contrasena</h2>
{linkErrorCode && !user && (
  <div className=\"auth-message auth-message-error\" style={{ marginBottom: 12 }}>
    Enlace invalido o expirado. Solicita un nuevo acceso a tu correo.
  </div>
)}
{(!user && linkErrorCode) && (
  <form onSubmit={handleResendLink} style={{ marginBottom: 16 }}>
    <div>
      <label htmlFor=\"email\">Tu correo</label>
      <input id=\"email\" type=\"email\" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=\"tu@correo.com\" required />
    </div>
    <button type=\"submit\" disabled={resendLoading || !email}>
      {resendLoading ? 'Enviando...' : 'Enviar nuevo enlace'}
    </button>
            <label htmlFor="password">Nueva Contrasena:</label>
)}
        <form onSubmit={handleSetPassword}>
          <div>
            <label htmlFor="password">Nueva ContraseÃƒÆ’Ã‚Â±a:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder='Debe tener al menos 6 caracteres'
            <label htmlFor="confirmPassword">Confirmar Contrasena:</label>
            />
          </div>
          <div>
            <label htmlFor="confirmPassword">Confirmar ContraseÃƒÆ’Ã‚Â±a:</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            {loading ? 'Guardando...' : 'Guardar Contrasena y Acceder'}
            />
          </div>
          <button type="submit" disabled={loading || !password || !user}>
            {loading ? 'Guardando...' : 'Guardar ContraseÃƒÆ’Ã‚Â±a y Acceder'}
        {!user && !error && <p className=\
        </form>
        {message && <p className="auth-message auth-message-success">{message}</p>}
        {error && <p className="auth-message auth-message-error">{error}</p>}
        {!user && !error && <p className="auth-message">Verificando sesiÃƒÆ’Ã‚Â³n...</p>}
      </div>
    </div>
  );
};

export default ConfirmAndSetPassword;

