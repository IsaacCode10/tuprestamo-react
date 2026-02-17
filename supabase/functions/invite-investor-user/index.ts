// DEPRECADO: Onboarding de inversionistas ahora es self‑service. Mantener por compatibilidad temporal y retirar en próxima PR si no hay usos.\nimport { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'
import { corsHeaders } from '../_shared/cors.ts'

// Inicializa Resend
import { Resend } from 'https://esm.sh/resend@3.2.0'
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

serve(async (req) => {
  // Manejo de la solicitud pre-vuelo OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, nombre_completo } = await req.json()

    // 0) Autenticación: exigir JWT y rol admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid or expired token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const requesterId = userData.user.id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', requesterId)
      .single()
    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // 1) Cliente admin para operación privilegiada
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2) Generar enlace de invitación
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('APP_BASE_URL')}/confirmar-y-crear-perfil`,
        data: {
          nombre_completo: nombre_completo,
          role: 'inversionista',
        },
      },
    })
    if (error) throw error

    const inviteLink = data.properties.action_link

    // 3) Enviar correo de invitación
    const { error: emailError } = await resend.emails.send({
      from: 'Tu Préstamo <onboarding@tuprestamobo.com>',
      to: email,
      subject: '¡Bienvenido a Tu Préstamo! Activa tu cuenta de inversionista',
      html: `
        <h1>¡Bienvenido a Tu Préstamo!</h1>
        <p>Estás a un paso de acceder a oportunidades de inversión exclusivas.</p>
        <p>Por favor, haz clic en el siguiente enlace para configurar tu contraseña y activar tu cuenta:</p>
        <a href="${inviteLink}" style="background-color:#26C2B2; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Activar Mi Cuenta</a>
        <p>Si no solicitaste esta invitación, puedes ignorar este correo.</p>
      `,
    })
    if (emailError) throw emailError

    return new Response(JSON.stringify({ message: `Invitación enviada a ${email}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

