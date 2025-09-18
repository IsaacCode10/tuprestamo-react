
import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import AdminNav from './components/AdminNav';
import './Auth.css'; // Reutilizar estilos para el formulario

const InvestorManagement = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (!email) {
      setError('Por favor, introduce una dirección de correo electrónico.');
      setLoading(false);
      return;
    }

    const { data, error: functionError } = await supabase.functions.invoke('invite-investor-user', {
      body: JSON.stringify({ email }),
    });

    if (functionError) {
      console.error('Error inviting investor:', functionError);
      setError(`Error al invitar al inversionista: ${functionError.message}`);
    } else {
      console.log('Invite response:', data);
      setMessage(`Invitación enviada correctamente a ${email}.`);
      setEmail(''); // Limpiar el campo de email
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <AdminNav />
      <div className="auth-form-container">
        <h2>Invitar Nuevo Inversionista</h2>
        <p>
          Introduce el correo electrónico del inversionista al que deseas invitar.
          Recibirá un correo para configurar su cuenta y contraseña.
        </p>
        <form onSubmit={handleInvite} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico del Inversionista</label>
            <input
              id="email"
              type="email"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Enviando Invitación...' : 'Invitar Inversionista'}
          </button>
        </form>
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};

export default InvestorManagement;
