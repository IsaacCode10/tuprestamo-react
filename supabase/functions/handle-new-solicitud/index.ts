import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { Resend } from 'https://esm.sh/resend@3.2.0';

console.log('Function handle-new-solicitud (V6.0 - Business Model v3.0) starting up.');

// --- Modelo de Negocio v3.0 ---

const PRICING_MODEL = {
  A: { label: 'A', tasa_interes_prestatario: 15.0, tasa_rendimiento_inversionista: 10.0, comision_originacion_porcentaje: 3.0 },
  B: { label: 'B', tasa_interes_prestatario: 17.0, tasa_rendimiento_inversionista: 12.0, comision_originacion_porcentaje: 4.0 },
  C: { label: 'C', tasa_interes_prestatario: 20.0, tasa_rendimiento_inversionista: 15.0, comision_originacion_porcentaje: 5.0 },
  Rechazado: { label: 'Rechazado' },
};

// Lógica del Scorecard de Riesgo
const runRiskScorecard = (solicitud) => {
  const {
    ingreso_mensual,
    saldo_deuda_tc,
    tasa_interes_tc,
    antiguedad_laboral,
  } = solicitud;

  const ingresos = parseFloat(ingreso_mensual);
  const saldoDeuda = parseFloat(saldo_deuda_tc);
  const tasaAnual = parseFloat(tasa_interes_tc);
  const antiguedad = parseInt(antiguedad_laboral, 10);

  if (isNaN(ingresos) || isNaN(saldoDeuda) || isNaN(tasaAnual) || isNaN(antiguedad)) {
    console.error('Datos de solicitud inválidos para scorecard:', solicitud);
    return PRICING_MODEL.Rechazado;
  }

  if (ingresos < 3000) {
    console.log(`Rechazo automático: Ingreso ${ingresos} < 3000`);
    return PRICING_MODEL.Rechazado;
  }

  const interesMensual = (saldoDeuda * (tasaAnual / 100)) / 12;
  const amortizacionCapital = saldoDeuda * 0.01;
  const deudaMensualEstimada = interesMensual + amortizacionCapital;
  const dti = (deudaMensualEstimada / ingresos) * 100;

  if (dti > 50) {
    console.log(`Rechazo automático: DTI ${dti.toFixed(2)}% > 50%`);
    return PRICING_MODEL.Rechazado;
  }

  let totalScore = 0;
  if (ingresos > 8000) totalScore += 3;
  else if (ingresos >= 5000) totalScore += 2;
  else if (ingresos >= 3000) totalScore += 1;

  if (dti < 30) totalScore += 3;
  else if (dti <= 40) totalScore += 2;
  else if (dti <= 50) totalScore += 1;

  if (antiguedad >= 24) totalScore += 2;
  else if (antiguedad >= 12) totalScore += 1;

  console.log(`Scorecard: Ingresos=${ingresos}, DTI=${dti.toFixed(2)}%, Antigüedad=${antiguedad}m => Puntuación Total = ${totalScore}`);

  if (totalScore >= 7) return PRICING_MODEL.A;
  if (totalScore >= 5) return PRICING_MODEL.B;
  if (totalScore >= 2) return PRICING_MODEL.C;
  
  return PRICING_MODEL.Rechazado;
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { record: solicitud } = await req.json();
    const { id: solicitud_id, email, nombre_completo, tipo_solicitud, monto_solicitado, plazo_meses } = solicitud;

    if (tipo_solicitud !== 'prestatario') {
      console.log(`Procesando otro tipo de solicitud: ${tipo_solicitud}`);
      return new Response(JSON.stringify({ message: 'Solicitud no procesable por esta función.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const riskProfile = runRiskScorecard(solicitud);
    console.log(`Solicitud ${solicitud_id}: Perfil Asignado=${riskProfile.label}`);

    if (riskProfile.label === 'Rechazado') {
      console.log(`Solicitud ${solicitud_id}: Iniciando actualización a estado 'rechazado'.`);
      const { error: updateError } = await supabaseAdmin.from('solicitudes').update({ estado: 'rechazado' }).eq('id', solicitud_id);
      if (updateError) console.error(`Error al actualizar solicitud ${solicitud_id} a rechazado:`, updateError);
      console.log(`Solicitud ${solicitud_id}: Actualización a 'rechazado' finalizada.`);

      await resend.emails.send({
        from: 'Tu Prestamo <contacto@tuprestamobo.com>',
        to: [email],
        subject: 'Actualización sobre tu solicitud en Tu Préstamo',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <img src="https://tuprestamobo.com/Logo-Tu-Prestamo.png" alt="Logo Tu Préstamo" style="width: 150px; margin-bottom: 20px;">
            <h2>Hola, ${nombre_completo},</h2>
            <p>Te agradecemos por tu interés en Tu Préstamo. Hemos revisado la información inicial que nos proporcionaste.</p>
            <p>Lamentablemente, en este momento no podemos continuar con tu solicitud de préstamo. Esta decisión se basa en nuestro modelo de riesgo automático y no necesariamente refleja tu capacidad de pago futura.</p>
            <p>Te invitamos a volver a intentarlo en el futuro si tus circunstancias financieras cambian.</p>
            <br>
            <p>El equipo de Tu Préstamo</p>
          </div>
        `,
      });

      return new Response(JSON.stringify({ message: 'Solicitud rechazada automáticamente.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } else {
      console.log(`Solicitud ${solicitud_id}: Iniciando flujo de pre-aprobación.`);
      
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        user_metadata: { full_name: nombre_completo, role: 'prestatario' }
      });

      if (userError) {
        if (userError.message.includes('User already registered')) {
            console.error('Error de usuario ya registrado:', userError.message);
            return new Response(JSON.stringify({ message: 'El usuario ya existe.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 });
        } else {
            throw userError;
        }
      }

      const user_id = user.user.id;
      console.log(`Solicitud ${solicitud_id}: user_id creado: ${user_id}`);
      console.log(`Solicitud ${solicitud_id}: Confiando en el trigger de la DB para crear el perfil.`);

      // Generar link de activación manualmente
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: 'https://tuprestamobo.com/confirmar'
        }
      });

      if (linkError) {
        console.error(`Error al generar link para ${email}:`, linkError);
        throw linkError;
      }
      const magicLink = linkData.properties.action_link;
      console.log(`Solicitud ${solicitud_id}: Magic Link generado.`);

      // Enviar correo de bienvenida con Resend
      await resend.emails.send({
        from: 'Tu Prestamo <contacto@tuprestamobo.com>',
        to: [email],
        subject: '¡Bienvenido a Tu Préstamo! Activa tu cuenta.',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <img src="https://tuprestamobo.com/Logo-Tu-Prestamo.png" alt="Logo Tu Préstamo" style="width: 150px; margin-bottom: 20px;">
            <h2>¡Hola ${nombre_completo}, bienvenido a Tu Préstamo!</h2>
            <p>Tu solicitud de préstamo ha sido pre-aprobada. El siguiente paso es activar tu cuenta para poder continuar con el proceso.</p>
            <p>Por favor, haz clic en el siguiente enlace para confirmar tu correo y establecer tu contraseña:</p>
            <p style="text-align: center;">
              <a href="${magicLink}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Activar Mi Cuenta</a>
            </p>
            <p style="font-size: 12px; color: #888888; text-align: center; margin-top: 20px;">
              Si el botón no funciona, copia y pega esta URL en tu navegador:<br>${magicLink}
            </p>
            <br>
            <p>El equipo de Tu Préstamo</p>
          </div>
        `,
      });
      console.log(`Solicitud ${solicitud_id}: Correo de bienvenida enviado a ${email} via Resend.`);

      console.log(`Solicitud ${solicitud_id}: Iniciando inserción de oportunidad.`);
      const { data: oppData, error: oppError } = await supabaseAdmin.from('oportunidades').insert([{
        solicitud_id,
        user_id,
        monto: monto_solicitado,
        plazo_meses,
        perfil_riesgo: riskProfile.label,
        tasa_interes_anual: riskProfile.tasa_interes_prestatario,
        tasa_interes_prestatario: riskProfile.tasa_interes_prestatario,
        tasa_rendimiento_inversionista: riskProfile.tasa_rendimiento_inversionista,
        comision_originacion_porcentaje: riskProfile.comision_originacion_porcentaje,
        seguro_desgravamen_porcentaje: 0.05, // Parte de la comisión de servicio y seguro de 0.15%
        comision_administracion_porcentaje: 0.1, // Parte de la comisión de servicio y seguro de 0.15%
        comision_servicio_inversionista_porcentaje: 1.0,
        estado: 'disponible',
      }]).select().single();
      if (oppError) {
        console.error(`Error al insertar oportunidad para solicitud ${solicitud_id}:`, oppError);
        throw oppError;
      }
      console.log(`Solicitud ${solicitud_id}: Oportunidad insertada con ID: ${oppData.id}`);

      console.log(`Solicitud ${solicitud_id}: Iniciando actualización de solicitud a 'pre-aprobado'.`);
      const { error: updateError } = await supabaseAdmin.from('solicitudes').update({ estado: 'pre-aprobado', user_id }).eq('id', solicitud_id);
      if (updateError) {
        console.error(`Error al actualizar solicitud ${solicitud_id} a 'pre-aprobado':`, updateError);
        throw updateError;
      }
      console.log(`Solicitud ${solicitud_id}: Actualización a 'pre-aprobado' finalizada.`);

      return new Response(JSON.stringify({ message: 'Solicitud pre-aprobada, correo de activación enviado manualmente.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
  } catch (error) {
    console.error(`Error en handle-new-solicitud (V5.2): ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});