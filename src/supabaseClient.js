 import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// --- INICIO DEL CÓDIGO DE DEPURACIÓN ---
console.log("Supabase URL desde env:", supabaseUrl);
console.log("Supabase Key desde env:", supabaseKey ? 'Una llave ha sido encontrada' : 'LLAVE NO ENCONTRADA');
// --- FIN DEL CÓDIGO DE DEPURACIÓN ---

export const supabase = createClient(supabaseUrl, supabaseKey)
      (Nota: Imprimimos si la llave fue encontrada o no, en lugar de la llave misma, por seguridad, aunque sea la llave
  pública).
