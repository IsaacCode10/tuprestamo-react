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
      const html = renderEmail({
        greetingName,
        title: 'Tu proyeccion de inversion',
        intro: `Monto: Bs ${Math.round(amount).toLocaleString('es-BO')} • Plazo: ${term_years} año${term_years===1?'':'s'}`,
        body: `Ganancia adicional estimada frente al DPF: Bs ${Math.round(projected_gain).toLocaleString('es-BO')}.`,
        ctaLabel: 'Crear mi cuenta',
        ctaHref: `${appBase}/auth`,
      })
      const subject = `${greetingName} Tu proyeccion de inversion en Tu Prestamo`
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
