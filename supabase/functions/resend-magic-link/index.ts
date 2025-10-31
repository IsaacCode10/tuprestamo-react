import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type Payload = {
  email: string
  redirectTo?: string
}

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email)
}

console.log('Function resend-magic-link starting up...')

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders })

  try {
    const { email, redirectTo }: Payload = await req.json()
    if (!email || !isValidEmail(email)) throw new Error('email invalido')

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('Faltan SUPABASE_URL o SERVICE_ROLE')

    const appBase = Deno.env.get('APP_BASE_URL') || 'https://www.tuprestamobo.com'
    const finalRedirect = (() => {
      if (redirectTo && /^https?:\/\//i.test(redirectTo)) return redirectTo
      const path = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/confirmar-y-crear-perfil'
      return `${appBase}${path}`
    })()

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Personalizacion ligera desde profiles
    let displayName = ''
    try {
      const { data: prof } = await admin
        .from('profiles')
        .select('nombre_completo')
        .eq('email', email)
        .maybeSingle()
      displayName = (prof?.nombre_completo || '').split(' ')[0] || ''
    } catch {}

    // Generar magic link via Admin API
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: finalRedirect },
    })
    if (error) throw error
    const link = data?.properties?.action_link
    if (!link) throw new Error('No se pudo generar enlace')

    // Enviar email via Resend (si hay API key).
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const subject = `${displayName || email} Tu enlace de acceso a Tu Prestamo`
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
          <p>Hola ${displayName || email},</p>
          <p>Usa el siguiente enlace para acceder y establecer tu contraseña:</p>
          <p><a href="${link}" style="background:#11696b;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Acceder</a></p>
          <p style="color:#777;font-size:12px;">Si no solicitaste este acceso, ignora este mensaje.</p>
        </div>`
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Tu Prestamo <acceso@tuprestamobo.com>',
          to: [email],
          subject,
          html,
        })
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    console.error('resend-magic-link error:', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

