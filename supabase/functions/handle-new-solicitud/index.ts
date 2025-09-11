
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { Resend } from 'https://esm.sh/resend@3.2.0';

console.log('Function handle-new-solicitud (V2 - with user creation) starting up.');

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const APP_BASE_URL = Deno.env.get('APP_BASE_URL'); // e.g., 'https://tuprestamobo.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();
    const { email, nombre_completo, tipo_solicitud } = record;

    if (!email || !nombre_completo || !tipo_solicitud) {
      throw new Error('El registro debe contener email, nombre_completo y tipo_solicitud.');
    }

    // 1. Inicializar el Admin Client de Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 2. Crear el nuevo usuario en Supabase Auth
    console.log(`Creando usuario para ${email}...`);
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true, // Marcar el email como confirmado
      user_metadata: {
        full_name: nombre_completo,
        role: tipo_solicitud,
      }
    });

    if (userError) {
      console.error('Error creando usuario:', userError.message);
      // Si el usuario ya existe, no lo tratamos como un error fatal.
      // Intentamos generar el link de todas formas.
      if (!userError.message.includes('User already registered')) {
        throw userError;
      }
    }
    console.log(`Usuario para ${email} creado o ya existente.`);

    // 3. Generar el enlace de invitación para establecer la contraseña
    console.log(`Generando enlace de invitación para ${email}...`);
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${APP_BASE_URL}/confirmar-y-crear-perfil`
      }
    });

    if (linkError) {
      console.error('Error generando enlace:', linkError.message);
      throw linkError;
    }
    const inviteLink = linkData.properties.action_link;
    console.log(`Enlace generado para ${email}.`);

    // 4. Determinar el contenido del correo según el tipo de solicitud
    let subject = '';
    let htmlContent = '';

    if (tipo_solicitud === 'prestatario') {
      subject = '¡Felicidades! Tu solicitud en Tu Préstamo ha sido pre-aprobada';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <img src="https://tuprestamobo.com/Logo-Tu-Prestamo.png" alt="Logo Tu Préstamo" style="width: 150px; margin-bottom: 20px;">
          <h2>¡Felicidades, ${nombre_completo}!</h2>
          <p>Tu solicitud de préstamo en Tu Préstamo ha sido <strong>pre-aprobada</strong>.</p>
          <p>Este es el primer paso para obtener el financiamiento que necesitas. Ahora, para continuar con el proceso y que podamos realizar el análisis final, necesitamos que completes tu perfil y subas la documentación requerida.</p>
          <p>Por favor, haz clic en el siguiente enlace para crear tu cuenta y subir tus documentos:</p>
          <a href="${inviteLink}" style="background-color: #00445A; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Completar mi Solicitud</a>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <br>
          <p>El equipo de Tu Préstamo</p>
        </div>
      `;
    } else if (tipo_solicitud === 'inversionista') {
      subject = '¡Bienvenido a Tu Préstamo, Inversionista!';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <img src="https://tuprestamobo.com/Logo-Tu-Prestamo.png" alt="Logo Tu Préstamo" style="width: 150px; margin-bottom: 20px;">
          <h2>¡Bienvenido a bordo, ${nombre_completo}!</h2>
          <p>Gracias por tu interés en ser inversionista en Tu Préstamo. Estamos emocionados de tenerte.</p>
          <p>El siguiente paso es crear tu cuenta en nuestra plataforma. Desde allí, podrás ver las oportunidades de inversión disponibles y gestionar tu portafolio.</p>
          <p>Por favor, haz clic en el siguiente enlace para configurar tu cuenta:</p>
          <a href="${inviteLink}" style="background-color: #00445A; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Crear mi Cuenta de Inversionista</a>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <br>
          <p>El equipo de Tu Préstamo</p>
        </div>
      `;
    } else {
        // Fallback por si el tipo_solicitud no es ninguno de los esperados
        throw new Error(`Tipo de solicitud no reconocido: ${tipo_solicitud}`);
    }

    // 5. Enviar el correo de invitación/pre-aprobación
    const { error: emailError } = await resend.emails.send({
      from: 'Tu Prestamo <contacto@tuprestamobo.com>',
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    if (emailError) {
      throw emailError;
    }

    return new Response(JSON.stringify({ message: 'Usuario creado y correo de invitación enviado.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error en handle-new-solicitud (V2):', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
