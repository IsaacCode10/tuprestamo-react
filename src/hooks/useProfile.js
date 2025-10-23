import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { usePostHog } from 'posthog-js/react'; // 1. Importar PostHog

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
  const posthog = usePostHog(); // 2. Obtener la instancia de PostHog

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
          // 3. Identificar al usuario en PostHog cuando se carga el perfil
          if (posthog && data) {
            posthog.identify(
              data.id, // ID único del usuario
              {
                email: data.email, 
                name: data.nombre_completo, // Propiedades adicionales
                role: data.role
              }
            );
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
        // 4. Resetear la identificación en PostHog al cerrar sesión
        if (posthog) {
          posthog.reset();
        }
      } else if (session?.user) {
        // Para otros eventos como SIGNED_IN, volvemos a buscar el perfil
        fetchSessionAndProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, [posthog]); // 5. Añadir posthog como dependencia del useEffect

  return { session, profile, loading, authEvent }; // Devolvemos el evento
}