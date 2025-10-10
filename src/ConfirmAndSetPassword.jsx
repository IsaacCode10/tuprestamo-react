
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const ConfirmAndSetPassword = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // The user is signed in via the magic link.
        // Now, redirect them to the page where they can set their password.
        navigate('/activar-cuenta-prestatario');
      }
    });

    // Cleanup subscription on component unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h2>Redirigiendo, por favor espera...</h2>
    </div>
  );
};

export default ConfirmAndSetPassword;
