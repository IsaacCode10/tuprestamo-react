import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const RoleSwitcher = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const switchRole = async (newRole) => {
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('set-my-role', {
        body: { new_role: newRole },
      });

      if (error) throw error;

      setMessage(`Rol cambiado a ${newRole}. Redirigiendo...`);

      let targetDashboard = '/';
      if (newRole === 'admin') targetDashboard = '/admin-dashboard';
      if (newRole === 'inversionista') targetDashboard = '/investor-dashboard';
      if (newRole === 'prestatario') targetDashboard = '/borrower-dashboard';

      setTimeout(() => {
        window.location.href = targetDashboard;
      }, 1500); // Espera 1.5 segundos para que el usuario lea el mensaje

    } catch (error) {
      console.error('Error switching role:', error);
      setMessage(`Error al cambiar de rol: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-switcher" style={{ border: '1px solid #f0ad4e', padding: '10px', marginTop: '20px', borderRadius: '5px' }}>
      <h4>Cambiar Vista (Super-Admin)</h4>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => switchRole('admin')} disabled={loading}>Ver como Admin</button>
        <button onClick={() => switchRole('inversionista')} disabled={loading}>Ver como Inversionista</button>
        <button onClick={() => switchRole('prestatario')} disabled={loading}>Ver como Prestatario</button>
      </div>
      {message && <p style={{ marginTop: '10px', color: message.includes('Error') ? 'red' : 'green' }}>{message}</p>}
    </div>
  );
};

export default RoleSwitcher;