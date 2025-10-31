import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { identifyUser, resetMixpanel } from '@/analytics.js';

/**
 * Un hook personalizado para obtener y gestionar el perfil completo del usuario,
 * incluyendo su rol desde la tabla 'profiles'.
 * Devuelve el evento de autenticaciÃ³n para que el componente App pueda manejar la redirecciÃ³n.
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
          .select('id, role, nombre_completo, email, estado_verificacion')
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
        // Resetear identificaciÃ³n en Mixpanel al cerrar sesiÃ³n
        resetMixpanel();
      } else if (session?.user) {
        // Para otros eventos como SIGNED_IN, volvemos a buscar el perfil
        fetchSessionAndProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  
  useEffect(() => {
    let channel;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;
      channel = supabase
        .channel('profile_' + userId)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: id=eq. }, (payload) => {
          try {
            const next = payload.new || {};
            setProfile(prev => prev ? { ...prev, ...next } : next);
          } catch {}
        })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);


