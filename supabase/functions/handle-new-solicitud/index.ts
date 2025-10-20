import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { Resend } from 'https://esm.sh/resend@3.2.0';

console.log('Function handle-new-solicitud (V8.0 - Business Model v3.1) starting up.');

// --- Modelo de Negocio v3.1 ---

const PRICING_MODEL = {
  A: { label: 'A', tasa_interes_prestatario: 15.0, tasa_rendimiento_inversionista: 10.0, comision_originacion_porcentaje: 3.0 },
  B: { label: 'B', tasa_interes_prestatario: 17.0, tasa_rendimiento_inversionista: 12.0, comision_originacion_porcentaje: 4.0 },
  C: { label: 'C', tasa_interes_prestatario: 20.0, tasa_rendimiento_inversionista: 15.0, comision_originacion_porcentaje: 5.0 },
  Rechazado: { label: 'Rechazado' },
};

// --- NUEVA FUNCIÓN DE CÁLCULO DE COSTOS CENTRALIZADA ---
const calculateLoanCosts = (principal, annualRate, termMonths, originacion_porcentaje) => {
  console.log(`Calculando costos para: P=${principal}, R=${annualRate}%, T=${termMonths}m, O=${originacion_porcentaje}%`);
  const monthlyRate = annualRate / 100 / 12;
  const serviceFeeRate = 0.0015; // 0.15%
  const minServiceFee = 10; // 10 Bs minimum

  let balance = principal;
  let totalInterest = 0;
  let totalServiceFee = 0;

  const pmt = (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));

  if (!isFinite(pmt)) {
    console.log('Tasa de interés es 0 o inválida. Calculando como préstamo sin interés.');
    const principalPayment = principal / termMonths;
    for (let i = 0; i < termMonths; i++) {
      const serviceFee = Math.max(balance * serviceFeeRate, minServiceFee);
      totalServiceFee += serviceFee;
      balance -= principalPayment;
    }
  } else {
    for (let i = 0; i < termMonths; i++) {
      const interestPayment = balance * monthlyRate;
      const serviceFee = Math.max(balance * serviceFeeRate, minServiceFee);
      const principalPayment = pmt - interestPayment;

      totalInterest += interestPayment;
      totalServiceFee += serviceFee;
      balance -= principalPayment;
    }
  }

  const comision_originacion = principal * (originacion_porcentaje / 100);
  const costo_total_credito = totalInterest + totalServiceFee + comision_originacion;
  const total_a_pagar = principal + costo_total_credito;
  const cuota_promedio = total_a_pagar / termMonths;

  const results = {
    interes_total: parseFloat(totalInterest.toFixed(2)),
    comision_servicio_seguro_total: parseFloat(totalServiceFee.toFixed(2)),
    costo_total_credito: parseFloat(costo_total_credito.toFixed(2)),
    cuota_promedio: parseFloat(cuota_promedio.toFixed(2)),
  };

  console.log('Resultados del cálculo de costos:', results);
  return results;
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
        subject: '¡Tu solicitud ha sido pre-aprobada!',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <img src="https://tuprestamobo.com/Logo-Tu-Prestamo.png" alt="Logo Tu Préstamo" style="width: 150px; margin-bottom: 20px;">
            <h2 style="color: #333;">¡Felicidades, ${nombre_completo}! Tu solicitud ha sido pre-aprobada.</h2>
            <p>Estamos un paso más cerca de refinanciar tu deuda. El siguiente paso es activar tu cuenta para poder continuar con el proceso.</p>
            <p>Por favor, haz clic en el siguiente botón para confirmar tu correo y establecer tu contraseña:</p>
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <a href="${magicLink}" target="_blank" style="background-color: #28a745; color: #ffffff; padding: 15px 30px; font-size: 18px; text-decoration: none; border-radius: 5px; display: inline-block;">Activar Mi Cuenta</a>
                </td>
              </tr>
            </table>
            <p>Atentamente,<br>El equipo de Tu Préstamo</p>
          </div>
        `,
      });
      console.log(`Solicitud ${solicitud_id}: Correo de bienvenida enviado a ${email} via Resend.`);

      // --- ¡AQUÍ OCURRE LA MAGIA! ---
      // 1. Calcular todos los costos usando la nueva función centralizada
      const loanCosts = calculateLoanCosts(
        monto_solicitado,
        riskProfile.tasa_interes_prestatario,
        plazo_meses,
        riskProfile.comision_originacion_porcentaje
      );

      console.log(`Solicitud ${solicitud_id}: Iniciando inserción de oportunidad con costos calculados.`);
      // 2. Insertar la oportunidad con los costos ya calculados
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
        cargo_servicio_seguro_porcentaje: 0.15,
        comision_servicio_inversionista_porcentaje: 1.0,
        estado: 'disponible',
        // --- NUEVOS CAMPOS CON VALORES CALCULADOS ---
        ...loanCosts,
      }]).select().single();

      if (oppError) {
        console.error(`Error al insertar oportunidad para solicitud ${solicitud_id}:`, oppError);
        throw oppError;
      }
      console.log(`Solicitud ${solicitud_id}: Oportunidad insertada con ID: ${oppData.id}`);

      console.log(`Solicitud ${solicitud_id}: Iniciando actualización de solicitud a 'pre-aprobado'.`);
      const { error: updateError } = await supabaseAdmin.from('solicitudes').update({ estado: 'pre-aprobado', user_id, opportunity_id: oppData.id }).eq('id', solicitud_id);
      if (updateError) {
        console.error(`Error al actualizar solicitud ${solicitud_id} a 'pre-aprobado':`, updateError);
        throw updateError;
      }
      console.log(`Solicitud ${solicitud_id}: Actualización a 'pre-aprobado' finalizada.`);

      return new Response(JSON.stringify({ message: 'Solicitud pre-aprobada, correo de activación enviado manualmente.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
  } catch (error) {
    console.error(`Error en handle-new-solicitud (V8.0): ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
