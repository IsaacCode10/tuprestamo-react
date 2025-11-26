import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Marca intents vencidos como expired y libera la inversión asociada
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    const now = new Date().toISOString()

    // Obtener intents vencidos en pending
    const { data: intents, error } = await supabase
      .from('payment_intents')
      .select('id, opportunity_id, payment_intent_id: id')
      .eq('status', 'pending')
      .lt('expires_at', now)
      .limit(500)

    if (error) throw error

    if (intents && intents.length > 0) {
      const ids = intents.map((i) => i.id)
      // Marcar intents como expired
      const { error: updErr } = await supabase
        .from('payment_intents')
        .update({ status: 'expired' })
        .in('id', ids)
      if (updErr) throw updErr

      // Marcar inversiones vinculadas como expiradas
      const { error: invErr } = await supabase
        .from('inversiones')
        .update({ status: 'expirado' })
        .in('payment_intent_id', ids)
      if (invErr) throw invErr
    }

    return new Response(JSON.stringify({ expired: intents?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
