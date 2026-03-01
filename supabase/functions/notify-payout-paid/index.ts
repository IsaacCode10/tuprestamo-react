import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { renderEmail } from '../_shared/email.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://tuprestamobo.com'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    if (!RESEND_API_KEY) return json({ ok: true, skipped: 'RESEND_API_KEY missing' })

    const body = await req.json().catch(() => ({}))
    const payoutIdRaw = body?.payout_id
    if (!payoutIdRaw) return json({ error: 'payout_id requerido' }, 400)

    const payoutId = Number(payoutIdRaw)
    if (!Number.isFinite(payoutId)) return json({ error: 'payout_id inválido' }, 400)

    const { data: payout, error: payoutErr } = await supabaseAdmin
      .from('payouts_inversionistas')
      .select('id, opportunity_id, investor_id, amount, status, paid_at')
      .eq('id', payoutId)
      .maybeSingle()
    if (payoutErr) throw payoutErr
    if (!payout) return json({ error: 'Payout no encontrado' }, 404)
    if ((payout.status || '').toLowerCase() !== 'paid') {
      return json({ ok: true, skipped: 'payout_not_paid' })
    }

    const [{ data: profile, error: profileErr }, { data: opp, error: oppErr }] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, nombre_completo, email')
        .eq('id', payout.investor_id)
        .maybeSingle(),
      supabaseAdmin
        .from('oportunidades')
        .select('id')
        .eq('id', payout.opportunity_id)
        .maybeSingle(),
    ])
    if (profileErr) throw profileErr
    if (oppErr) throw oppErr

    const investorEmail = profile?.email || null
    if (!investorEmail) return json({ ok: true, skipped: 'investor_email_missing' })

    const amount = Number(payout.amount || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const paidAt = payout.paid_at
      ? new Date(payout.paid_at).toLocaleString('es-BO')
      : 'hoy'

    const html = renderEmail({
      greetingName: profile?.nombre_completo || 'Inversionista',
      title: 'Pago acreditado',
      intro: `Acreditamos Bs ${amount} en tu cuenta registrada.`,
      body: `Corresponde al cobro de tu inversión en la oportunidad ID ${opp?.id ?? payout.opportunity_id}.`,
      ctaLabel: 'IR A MIS INVERSIONES',
      ctaHref: `${APP_BASE_URL}/mis-inversiones`,
      extraHtml: `<p style="margin:12px 0 0 0;color:#222;">Fecha de acreditación: ${paidAt}</p>`,
      footerNote: 'Este correo es informativo. Si necesitas ayuda, contáctanos por nuestros canales oficiales.',
    })

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Tu Préstamo <notificaciones@tuprestamobo.com>',
        to: [investorEmail],
        subject: 'Pago acreditado en Tu Préstamo',
        html,
      }),
    })
    if (!resendResp.ok) {
      const txt = await resendResp.text()
      throw new Error(`Resend error: ${resendResp.status} ${txt}`)
    }

    return json({ ok: true })
  } catch (e) {
    console.error('notify-payout-paid error', e)
    return json({ error: (e as Error).message || 'Error interno' }, 500)
  }
})

function json(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

