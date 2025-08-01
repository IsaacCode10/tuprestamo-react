import { supabase } from './supabaseClient';

export const getUserRole = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116: "exact-one-row-not-found"
    console.error('Error fetching user role:', error);
    return null;
  }

  return data ? data.role : 'user'; // Si no hay perfil, se asume rol 'user'
};
