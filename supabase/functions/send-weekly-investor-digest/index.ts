import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@3.2.0'
import { corsHeaders } from '../_shared/cors.ts'

// Envío semanal de digest a inversionistas verificados (free tier friendly).
// Ejecutar manual o via cron. Usa Brand Kit base (#00445A / #26C2B2).

type Opportunity = {
  id: number
  monto: number
  plazo_meses: number
  perfil_riesgo: string | null
  tasa_rendimiento_inversionista: number | null
  comision_servicio_inversionista_porcentaje: number | null
}

const MAX_RECIPIENTS = 200 // proteger free tier Resend

const fmtMoney = (n: number | null | undefined) =>
  `Bs ${Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const renderHtml = (ops: Opportunity[], appBase: string) => {
  const cards = ops.map(o => `
    <tr>
      <td style="padding:10px 12px; border-bottom:1px solid #e9ecef;">
        <div style="font-weight:700; color:#00445A;">Oportunidad #${o.id} · Perfil ${o.perfil_riesgo || 'N/D'}</div>
        <div style="margin:4px 0; color:#00445A;">Monto: ${fmtMoney(o.monto)} · Plazo: ${o.plazo_meses}m</div>
        <div style="color:#11696b; font-size:14px;">Rendimiento: ${o.tasa_rendimiento_inversionista ?? 'N/D'}% · Comisión servicio: ${o.comision_servicio_inversionista_porcentaje ?? '1'}%</div>
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<body style="background:#f7fafb; margin:0; padding:0; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f7fafb; padding:20px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" role="presentation" style="background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 18px rgba(0,0,0,0.05);">
          <tr>
            <td style="background:#00445A; color:#fff; padding:18px 20px; font-weight:700; font-size:18px;">
              Oportunidades publicadas esta semana
            </td>
          </tr>
          <tr>
            <td style="padding:18px 20px; color:#133; font-size:15px;">
              <p style="margin:0 0 12px 0;">Te compartimos las oportunidades abiertas para fondeo. Paga tu monto en la plataforma y nosotros conciliamos.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 10px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
                ${cards}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 20px; text-align:center;">
              <a href="${appBase}/oportunidades" target="_blank" style="display:inline-block; background:#26C2B2; color:#fff; text-decoration:none; font-weight:700; padding:12px 20px; border-radius:8px;">Ver oportunidades</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 18px 20px; font-size:12px; color:#556; line-height:1.5;">
              Recibes este correo porque estás registrado como inversionista verificado. Enviamos como digest semanal para cuidar la cuota gratuita de Resend.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'Falta RESEND_API_KEY' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }
    const resend = new Resend(resendKey)
    const appBase = Deno.env.get('APP_BASE_URL') || 'https://www.tuprestamobo.com'

    // 1) Oportunidades disponibles (solo las que se publicaron y aún tienen cupo)
    const { data: opps, error: oppErr } = await supabase
      .from('oportunidades')
      .select('id, monto, plazo_meses, perfil_riesgo, tasa_rendimiento_inversionista, comision_servicio_inversionista_porcentaje')
      .eq('estado', 'disponible')
      .order('created_at', { ascending: false })
      .limit(20)
    if (oppErr) throw oppErr

    if (!opps || opps.length === 0) {
      return new Response(JSON.stringify({ message: 'Sin oportunidades disponibles; no se envía digest.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 2) Inversionistas verificados
    const { data: investors, error: invErr } = await supabase
      .from('profiles')
      .select('id, email, nombre_completo')
      .eq('role', 'inversionista')
      .eq('estado_verificacion', 'verificado')
      .not('email', 'is', null)
      .limit(MAX_RECIPIENTS)
    if (invErr) throw invErr

    if (!investors || investors.length === 0) {
      return new Response(JSON.stringify({ message: 'Sin inversionistas verificados; no se envía digest.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const html = renderHtml(opps, appBase)
    const text = `Tienes ${opps.length} oportunidad(es) disponibles. Ingresa a ${appBase}/oportunidades para ver detalles.`
    const subject = `Oportunidades publicadas - ${opps.length} abiertas`
    const toList = investors.map(i => i.email as string)

    await resend.emails.send({
      from: 'Tu Prestamo <notificaciones@tuprestamobo.com>',
      to: toList,
      subject,
      html,
      text,
    })

    return new Response(JSON.stringify({ message: `Digest enviado a ${toList.length} inversionistas`, opportunities: opps.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (e) {
    console.error('Error en send-weekly-investor-digest:', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
