import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderEmail } from '../_shared/email.ts'

type Payload = {
  user_id: string
  type: string
  title: string
  body: string
  link_url?: string
  cta_label?: string
  footer_note?: string
  data?: Record<string, unknown>
  email?: boolean
  suppress_in_app?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }
  try {
    const payload: Payload = await req.json()
    const { user_id, type, title, body, link_url, cta_label, footer_note, data, email, suppress_in_app } = payload || ({} as Payload)
    if (!user_id || !type || !title || !body) throw new Error('user_id, type, title y body son requeridos')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // 1) Insertar notificacion in-app (opcional)
    if (!suppress_in_app) {
      const { error: insertErr } = await supabase.from('notifications').insert({
        user_id, type, title, body, link_url, data: data ?? null,
        priority: 'normal'
      })
      if (insertErr) throw insertErr
    }

    // 2) Email opcional via Resend
    if (email) {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles').select('email, nombre_completo').eq('id', user_id).single()
      if (profileErr) throw profileErr

      const to = profile?.email
      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (to && resendKey) {
        const html = renderEmail({
          greetingName: profile?.nombre_completo || '',
          title,
          body,
          ctaLabel: link_url ? (cta_label || 'Ver detalles') : undefined,
          ctaHref: link_url,
          footerNote: footer_note,
        })
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Tu Préstamo <notificaciones@tuprestamobo.com>',
            to: [to],
            subject: title,
            html,
          })
        })
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' }, status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { headers: { 'Content-Type': 'application/json' }, status: 400 })
  }
})
