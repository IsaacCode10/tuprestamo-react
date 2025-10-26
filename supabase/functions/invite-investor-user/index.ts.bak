import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'
import { corsHeaders } from '../_shared/cors.ts'

// Inicializa Resend
import { Resend } from 'https://esm.sh/resend@3.2.0';
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);

serve(async (req) => {
  // Manejo de la solicitud pre-vuelo OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, nombre_completo } = await req.json() // 1. Recibir nombre_completo

    // Crea un cliente de Supabase con rol de 'service_role' para tener permisos de admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Genera un enlace de invitación para el usuario
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('APP_BASE_URL')}/confirmar-y-crear-perfil`,
        data: {
          nombre_completo: nombre_completo, // 2. Pasar el nombre en los metadatos
          role: 'inversionista'             // 3. Asignar el rol de inversionista
        }
      }
    })

    if (error) throw error

    const inviteLink = data.properties.action_link;

    // Envía el correo de invitación usando Resend
    const { error: emailError } = await resend.emails.send({
      from: 'Tu Prestamo <onboarding@tuprestamobo.com>', // Reemplaza con tu email verificado en Resend
      to: email,
      subject: '¡Bienvenido a Tu Préstamo! Activa tu cuenta de inversionista',
      html: `
        <h1>¡Bienvenido a Tu Préstamo!</h1>
        <p>Estás a un paso de acceder a oportunidades de inversión exclusivas.</p>
        <p>Por favor, haz clic en el siguiente enlace para configurar tu contraseña y activar tu cuenta:</p>
        <a href="${inviteLink}" style="background-color:#26C2B2; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Activar Mi Cuenta</a>
        <p>Si no solicitaste esta invitación, puedes ignorar este correo.</p>
      `
    });

    if (emailError) throw emailError;

    return new Response(JSON.stringify({ message: `Invitación enviada a ${email}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
