import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Payload = {
  user_id: string
  type: string
  title: string
  body: string
  link_url?: string
  data?: Record<string, unknown>
  email?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  try {
    const payload: Payload = await req.json()
    const { user_id, type, title, body, link_url, data, email } = payload || ({} as Payload)
    if (!user_id || !type || !title || !body) throw new Error('user_id, type, title y body son requeridos')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // 1) Insertar notificación in-app
    const { error: insertErr } = await supabase.from('notifications').insert({
      user_id, type, title, body, link_url, data: data ?? null,
      priority: 'normal'
    })
    if (insertErr) throw insertErr

    // 2) Email opcional vía Resend
    if (email) {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles').select('email, nombre_completo').eq('id', user_id).single()
      if (profileErr) throw profileErr

      const to = profile?.email
      const resendKey = Deno.env.get('RESEND_API_KEY')
      if (to && resendKey) {
        const html = `
          <div style="font-family:Arial,Helvetica,sans-serif; line-height:1.5;">
            <img src="https://tuprestamobo.com/Logo-Tu-Prestamo.png" alt="Tu Préstamo" style="height:36px; margin-bottom:12px;"/>
            <p>Hola ${profile?.nombre_completo || ''},</p>
            <p>${body}</p>
            ${link_url ? `<p><a href="${link_url}" style="color:#00445A; font-weight:600;">Ver más detalles</a></p>` : ''}
            <p style="color:#999; font-size:12px;">Este es un mensaje automático de Tu Préstamo.</p>
          </div>`
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

