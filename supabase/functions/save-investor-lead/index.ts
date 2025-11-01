import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { renderEmail } from '../_shared/email.ts'

type LeadPayload = {
  email: string
  whatsapp?: string | null
  amount: number
  term_years: number
  projected_gain: number
  tasa_dpf?: number
  tasa_tp?: number
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  user_agent?: string | null
}

function isEmail(s: string) {
  return /.+@.+\..+/.test(s)
}

function digitsOnly(s?: string | null) {
  if (!s) return null
  const d = s.replace(/\D/g, '')
  return d || null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body: LeadPayload = await req.json()
    const { email, amount, term_years, projected_gain } = body || ({} as LeadPayload)
    if (!email || !isEmail(email)) throw new Error('email invalido')
    if (!amount || amount <= 0) throw new Error('amount invalido')
    if (!term_years || term_years <= 0) throw new Error('term_years invalido')
    if (typeof projected_gain !== 'number') throw new Error('projected_gain invalido')

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Insert lead
    const leadRow = {
      email,
      whatsapp: digitsOnly(body.whatsapp),
      amount,
      term_years,
      projected_gain,
      tasa_dpf: body.tasa_dpf ?? 0.03,
      tasa_tp: body.tasa_tp ?? 0.09,
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      user_agent: body.user_agent ?? null,
    }
    await admin.from('investor_leads').insert(leadRow)

    // Follow-up email with projection
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const greetingName = email.split('@')[0]
      const appBase = Deno.env.get('APP_BASE_URL') || 'https://www.tuprestamobo.com'

      const fmt = (n: number) => `Bs ${Math.round(n).toLocaleString('es-BO')}`
      const compound = (amt: number, yrs: number, rate: number) => amt * Math.pow(1 + rate, yrs)
      const dpf = compound(amount, term_years, (body.tasa_dpf ?? 0.03))
      const scenarios = [
        { label: 'Conservador (A)', rate: 0.10 },
        { label: 'Balanceado (B)', rate: 0.12 },
        { label: 'Dinamico (C)',  rate: 0.15 },
      ].map(s => {
        const tp = compound(amount, term_years, s.rate)
        const extra = Math.max(0, tp - dpf)
        return { ...s, tp, extra }
      })
      const dpfRatePct = `${((body.tasa_dpf ?? 0.03) * 100).toFixed(1)}%`
      const tableRows = scenarios.map(({ label, rate, tp, extra }) => `
        <tr style="border-top:1px solid #f0f0f0">
          <td style="padding:8px;">${label} (${Math.round(rate*100)}%)</td>
          <td style="padding:8px; text-align:right; white-space:nowrap;">${fmt(tp)}</td>
          <td style="padding:8px; text-align:right; white-space:nowrap;">${fmt(dpf)}</td>
          <td style="padding:8px; text-align:right;"><span style="white-space:nowrap; background:#e6fffb; border:1px solid #a8ede6; color:#006d75; font-weight:800; padding:4px 10px; border-radius:12px; display:inline-block;">${fmt(extra)}</span></td>
        </tr>
      `).join('')
      const extraHtml = `
        <div style="margin-top:12px; max-width:520px; margin-left:auto; margin-right:auto;">
          <div style="text-align:center; margin:12px 0;">
            <div style="display:inline-block; padding:10px 14px; border-radius:12px; background:#eef9f8; border:1px dashed #26C2B2; font-weight:800; color:#11696b;">
              Ganancia adicional estimada frente al DPF: ${fmt(projected_gain)}
            </div>
          </div>
          <h3 style="margin:14px 0 6px 0; text-align:center; color:#00445A;">Escenarios de retorno</h3>
          <table style="width:100%; border-collapse:collapse; font-family:Arial, Helvetica, sans-serif;">
            <thead>
              <tr>
                <th style="text-align:left; padding:8px;">Escenario</th>
                <th style="text-align:right; padding:8px;">Tu Pr&eacute;stamo (final)</th>
                <th style="text-align:right; padding:8px;">DPF (final, ${dpfRatePct})</th>
                <th style="text-align:right; padding:8px;">Ganancia adicional</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `

      const html = renderEmail({
        greetingName,
        title: 'Tu proyecciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de inversiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n',
        intro: `Monto: ${fmt(amount)} ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ Plazo: ${term_years} aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o${term_years===1?'':'s'}`,
        body: 'Te compartimos un resumen con tres escenarios de retorno.',
        extraHtml,
        ctaLabel: 'Crear mi cuenta',
        ctaHref: `${appBase}/?open=investor-form#inversionistas`,
      })
      const subject = `${greetingName}, tu proyecciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n en Tu PrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©stamo ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Monto ${fmt(amount)}, plazo ${term_years} aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±o${term_years===1?'':'s'}`
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Tu Prestamo <contacto@tuprestamobo.com>',
          to: [email],
          subject,
          html,
        })
      })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (e) {
    console.error('save-investor-lead error:', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
