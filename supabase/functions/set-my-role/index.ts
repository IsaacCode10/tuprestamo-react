import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPER_ADMIN_USER_ID = '8983b4fb-93c8-4951-b2db-c595f61fd3c4';

serve(async (req) => {
  // Manejo de la petición pre-vuelo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response("Authentication required", { status: 401, headers: corsHeaders });
    }

    if (user.id !== SUPER_ADMIN_USER_ID) {
      return new Response("You are not authorized to perform this action", { status: 403, headers: corsHeaders });
    }

    const { new_role } = await req.json();
    const validRoles = ['admin', 'inversionista', 'prestatario', 'analista_riesgo'];
    if (!new_role || !validRoles.includes(new_role)) {
      return new Response(`Invalid role specified. Must be one of: ${validRoles.join(', ')}`, { status: 400, headers: corsHeaders });
    }

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ role: new_role })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ message: `Role successfully updated to ${new_role}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})