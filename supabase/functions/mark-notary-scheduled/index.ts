import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { opportunity_id } = await req.json().catch(() => ({}))
    if (!opportunity_id) {
      return new Response(JSON.stringify({ error: 'opportunity_id requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const adminClient = createClient(supabaseUrl, serviceKey)

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ownership check: borrower can only mark notary schedule for own pending-notary opportunity.
    const { data: ownOpp, error: ownErr } = await adminClient
      .from('oportunidades')
      .select('id, solicitud_id, estado')
      .eq('id', opportunity_id)
      .single()
    if (ownErr || !ownOpp) throw ownErr || new Error('Oportunidad no encontrada')

    const { data: sol, error: solErr } = await adminClient
      .from('solicitudes')
      .select('id, user_id, estado')
      .eq('id', ownOpp.solicitud_id)
      .single()
    if (solErr || !sol) throw solErr || new Error('Solicitud no encontrada')

    if (sol.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Permisos insuficientes' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const oppState = String(ownOpp.estado || '').toLowerCase()
    const solState = String(sol.estado || '').toLowerCase()
    if (oppState !== 'pendiente_notariado' && solState !== 'pendiente_notariado') {
      return new Response(JSON.stringify({ error: 'La operación no está en etapa de notariado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: disb, error: disbErr } = await adminClient
      .from('desembolsos')
      .select('id, notariado_ok, notariado_agendado_at')
      .eq('opportunity_id', opportunity_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (disbErr) throw disbErr
    if (!disb?.id) throw new Error('No existe registro de desembolso para esta operación')
    if (disb.notariado_ok) {
      return new Response(JSON.stringify({ message: 'El contrato notariado ya está validado' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (disb.notariado_agendado_at) {
      return new Response(JSON.stringify({ message: 'La firma ya estaba agendada', notariado_agendado_at: disb.notariado_agendado_at }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const nowIso = new Date().toISOString()
    const { error: updErr } = await adminClient
      .from('desembolsos')
      .update({ notariado_agendado_at: nowIso })
      .eq('id', disb.id)
    if (updErr) throw updErr

    return new Response(JSON.stringify({ message: 'Firma agendada', notariado_agendado_at: nowIso }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('mark-notary-scheduled error:', e)
    return new Response(JSON.stringify({ error: (e as Error).message || 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

