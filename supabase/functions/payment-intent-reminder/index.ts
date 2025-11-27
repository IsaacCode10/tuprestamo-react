import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderEmail } from '../_shared/email.ts'
import { corsHeaders } from '../_shared/cors.ts'

type IntentRow = {
  id: string
  opportunity_id: number
  investor_id: string
  expected_amount: number | null
  expires_at: string | null
  created_at: string | null
}

type ProfileRow = {
  id: string
  nombre_completo: string | null
  email: string | null
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const RESEND_FROM = Deno.env.get('RESEND_FROM_EMAIL') || 'notificaciones@tuprestamobo.com'
const APP_URL = Deno.env.get('APP_URL') || 'https://tuprestamobo.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY missing' }), { status: 500, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: intents, error: intentErr } = await supabase
      .from('payment_intents')
      .select('id, opportunity_id, investor_id, expected_amount, expires_at, created_at, status, reminder_sent_at')
      .eq('status', 'pending')
      .is('reminder_sent_at', null)
      .lt('created_at', cutoff)
      .limit(200)

    if (intentErr) throw intentErr
    if (!intents || intents.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: 'no intents pending >24h' }), { status: 200, headers: corsHeaders })
    }

    const investorIds = Array.from(new Set(intents.map((i: any) => i.investor_id).filter(Boolean)))
    let profiles: ProfileRow[] = []
    if (investorIds.length > 0) {
      const { data: profRows, error: profErr } = await supabase
        .from('profiles')
        .select('id, nombre_completo, email')
        .in('id', investorIds)
      if (profErr) throw profErr
      profiles = profRows || []
    }
    const profileMap = new Map(profiles.map((p) => [p.id, p]))

    const sentIds: string[] = []
    for (const intent of intents as IntentRow[]) {
      const profile = profileMap.get(intent.investor_id)
      const email = profile?.email
      if (!email) continue

      const amount = intent.expected_amount ?? 0
      const expires = intent.expires_at ? new Date(intent.expires_at).toLocaleString('es-BO') : 'pronto'
      const name = profile?.nombre_completo || 'Inversionista'
      const cta = `${APP_URL}/oportunidades/${intent.opportunity_id}`

      const html = renderEmail({
        greetingName: name,
        title: 'Recuerda completar tu inversión',
        intro: `Tu reserva de Bs ${Number(amount).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sigue pendiente de pago.`,
        body: `Paga antes de ${expires} para confirmar tu participación. Si expirara, deberás reservar nuevamente.`,
        ctaLabel: 'Ir a pagar',
        ctaHref: cta,
      })

      const payload = {
        from: RESEND_FROM,
        to: [email],
        subject: 'Recuerda completar tu inversión',
        html,
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        sentIds.push(intent.id)
      }
    }

    if (sentIds.length > 0) {
      await supabase
        .from('payment_intents')
        .update({ reminder_sent_at: new Date().toISOString() })
        .in('id', sentIds)
    }

    return new Response(JSON.stringify({ sent: sentIds.length, total: intents.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
