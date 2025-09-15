import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import './Auth.css'; // Reutilizar estilos de autenticación

const BorrowerActivateAccount = () => {
  const [nombre_completo, setNombreCompleto] = useState(''); // 1. Añadir estado para el nombre
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(false); // Para alternar entre registro y login
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extraer el email de la URL si está presente
    const params = new URLSearchParams(location.search);
    const emailFromUrl = params.get('email');
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [location]);

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLoginMode) {
        // Lógica de Inicio de Sesión
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage('Inicio de sesión exitoso. Redirigiendo...');
      } else {
        // Lógica de Registro (activación de cuenta)
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'prestatario',
              nombre_completo: nombre_completo, // 3. Pasar el nombre
            },
          },
        });
        if (error) throw error;
        setMessage('¡Registro exitoso! Ahora puedes iniciar sesión.');
        setIsLoginMode(true); // Cambiar a modo login después del registro
      }

      // Después de un registro/login exitoso, redirigir al dashboard del prestatario
      // Esto se ejecutará después de que el estado de Supabase se actualice
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate('/borrower-dashboard');
      }

    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>{isLoginMode ? 'Iniciar Sesión' : 'Activar Cuenta de Prestatario'}</h2>
      <form onSubmit={handleAuthAction}>
        {/* 2. Añadir campo de nombre si estamos en modo registro */}
        {!isLoginMode && (
          <div>
            <label htmlFor="nombre_completo">Nombre Completo</label>
            <input
              id="nombre_completo"
              type="text"
              value={nombre_completo}
              onChange={(e) => setNombreCompleto(e.target.value)}
              required
            />
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
            disabled={!!location.search.includes('email=')} // Deshabilitar si el email viene de la URL
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
          {loading ? 'Cargando...' : (isLoginMode ? 'Iniciar Sesión' : 'Registrarse y Activar')}
        </button>
      </form>
      <p className="toggle-auth">
        {isLoginMode ? '¿No tienes una cuenta? ' : '¿Ya tienes una cuenta? '}
        <button onClick={() => setIsLoginMode(!isLoginMode)}>
          {isLoginMode ? 'Activar Cuenta' : 'Iniciar Sesión'}
        </button>
      </p>
      {message && <p className="form-message">{message}</p>}
    </div>
  );
};

export default BorrowerActivateAccount;
