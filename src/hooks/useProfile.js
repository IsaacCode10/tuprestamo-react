import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { identifyUser, resetMixpanel } from '@/analytics.js';

/**
 * Un hook personalizado para obtener y gestionar el perfil completo del usuario,
 * incluyendo su rol desde la tabla 'profiles'.
 * Devuelve el evento de autenticación para que el componente App pueda manejar la redirección.
 */
export function useProfile() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authEvent, setAuthEvent] = useState(null); // Nuevo estado para el evento

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, nombre_completo, email')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
          setProfile(null);
        } else {
          setProfile(data);
          // Identificar usuario en Mixpanel
          if (data) {
            identifyUser(data.id, {
              $email: data.email,
              name: data.nombre_completo,
              role: data.role,
            });
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setAuthEvent(event); // Capturamos el evento que ocurra
      
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
        // Resetear identificación en Mixpanel al cerrar sesión
        resetMixpanel();
      } else if (session?.user) {
        // Para otros eventos como SIGNED_IN, volvemos a buscar el perfil
        fetchSessionAndProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, profile, loading, authEvent }; // Devolvemos el evento
}
