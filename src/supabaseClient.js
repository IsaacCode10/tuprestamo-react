import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// DEBUG: Imprimir las variables de entorno para verificar que se están cargando en producción.
console.log('DEBUG: Supabase URL leída:', supabaseUrl);
console.log('DEBUG: ¿Existe la Supabase Key?:', supabaseKey ? `Sí, comienza con "${supabaseKey.substring(0, 5)}..."` : 'No, es undefined');


export const supabase = createClient(supabaseUrl, supabaseKey)