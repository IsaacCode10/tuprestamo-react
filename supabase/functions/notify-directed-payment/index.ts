import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { renderEmail } from '../_shared/email.ts'

type InvestorRow = { investor_id: string; amount: number | null }
type ProfileRow = { id: string; nombre_completo: string | null; email: string | null }

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
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }
    const { opportunity_id } = await req.json()
    if (!opportunity_id) return json({ error: 'opportunity_id requerido' }, 400)

    // Oportunidad + solicitud (para banco) + borrower
    const { data: opp, error: oppErr } = await supabaseAdmin
      .from('oportunidades')
      .select('id, user_id, solicitud_id, monto, plazo_meses, tasa_interes_prestatario, perfil_riesgo, cuota_promedio, saldo_deudor_verificado')
      .eq('id', opportunity_id)
      .maybeSingle()
    if (oppErr) throw oppErr
    if (!opp) return json({ error: 'Oportunidad no encontrada' }, 404)

    const { data: sol } = await supabaseAdmin
      .from('solicitudes')
      .select('bancos_deuda, nombre_completo, email')
      .eq('id', opp.solicitud_id)
      .maybeSingle()

    const { data: borrowerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, nombre_completo, email')
      .eq('id', opp.user_id)
      .maybeSingle()

    const borrowerEmail = borrowerProfile?.email || sol?.email || null
    const borrowerName = borrowerProfile?.nombre_completo || sol?.nombre_completo || 'Cliente'

    // Desembolso (comprobante/contrato)
    const { data: disb } = await supabaseAdmin
      .from('desembolsos')
      .select('monto_neto, comprobante_url, contract_url, paid_at, estado')
      .eq('opportunity_id', opportunity_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let contractSignedUrl: string | null = null
    if (disb?.contract_url) {
      const { data: signed } = await supabaseAdmin
        .storage
        .from('contratos')
        .createSignedUrl(disb.contract_url, 60 * 60 * 24 * 7) // 7 días
      contractSignedUrl = signed?.signedUrl || null
    }

    // Inversionistas pagados
    const { data: invs, error: invErr } = await supabaseAdmin
      .from('inversiones')
      .select('investor_id, amount')
      .eq('opportunity_id', opportunity_id)
      .eq('status', 'pagado')
    if (invErr) throw invErr

    const investorIds = Array.from(new Set((invs || []).map((i: InvestorRow) => i.investor_id).filter(Boolean)))
    let investorProfiles: ProfileRow[] = []
    if (investorIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from('profiles')
        .select('id, nombre_completo, email')
        .in('id', investorIds)
      investorProfiles = profs || []
    }

    // Notificación prestatario (campana)
    const notifications: any[] = []
    notifications.push({
      user_id: opp.user_id,
      type: 'loan_disbursed',
      title: 'Pagamos tu tarjeta',
      body: `Transferimos Bs ${formatMoney(disb?.monto_neto ?? opp.saldo_deudor_verificado)} a tu banco${sol?.bancos_deuda ? ` (${sol.bancos_deuda})` : ''}. Tu cronograma inicia desde hoy.`,
      link_url: '/panel-prestatario',
      priority: 'high',
    })

    // Notificación inversionistas (solo campana)
    (invs || []).forEach((inv) => {
      if (!inv.investor_id) return
      const prof = investorProfiles.find((p) => p.id === inv.investor_id)
      notifications.push({
        user_id: inv.investor_id,
        type: 'loan_disbursed_investor',
        title: 'Préstamo desembolsado',
        body: `El préstamo ${opportunity_id} se pagó al banco. Tu participación: Bs ${formatMoney(inv.amount)}. Las cuotas se acreditarán según el cronograma.`,
        link_url: '/mis-inversiones',
        priority: 'normal',
        data: { opportunity_id, amount: inv.amount, investor_name: prof?.nombre_completo || null },
      })
    })

    if (notifications.length > 0) {
      await supabaseAdmin.from('notifications').insert(notifications)
    }

    // Email único al prestatario al pagar el banco
    if (borrowerEmail && RESEND_API_KEY) {
      const subject = 'Pagamos tu tarjeta – Tu Préstamo'
      const html = renderEmail({
        greetingName: borrowerName,
        title: 'Pagamos tu tarjeta en el banco',
        intro: `Transferimos Bs ${formatMoney(disb?.monto_neto ?? opp.saldo_deudor_verificado)}${sol?.bancos_deuda ? ` a ${sol.bancos_deuda}` : ''}. Desde hoy corre tu cronograma de cuotas.`,
        body: 'Ingresa a tu panel para ver el comprobante, descargar tu contrato y consultar tu QR de pago mensual.',
        ctaLabel: 'Ir a mi panel',
        ctaHref: `${APP_BASE_URL}/panel-prestatario`,
        extraHtml: contractSignedUrl
          ? `<p style="margin:12px 0 0 0;color:#222;">Contrato PDF: <a href="${contractSignedUrl}" target="_blank">Descargar</a></p>`
          : '',
      })

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Tu Préstamo <notificaciones@tuprestamobo.com>',
          to: [borrowerEmail],
          subject,
          html,
        }),
      })
    }

    return json({ ok: true })
  } catch (e) {
    console.error('notify-directed-payment error', e)
    return json({ error: (e as Error).message || 'Error interno' }, 500)
  }
})

function formatMoney(v?: number | null) {
  const num = Number(v || 0)
  return num.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function json(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
