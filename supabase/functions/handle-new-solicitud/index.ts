import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { Resend } from 'https://esm.sh/resend@3.2.0';
import { ensureAuthorizationPreprint } from '../_shared/preprint.ts';

console.log('Function handle-new-solicitud (V8.1 - PDF Auth) starting up.');

// --- Modelo de Negocio v3.1 ---
const PRICING_MODEL = {
  A: { label: 'A', tasa_interes_prestatario: 15.0, tasa_rendimiento_inversionista: 10.0, comision_originacion_porcentaje: 3.0 },
  B: { label: 'B', tasa_interes_prestatario: 17.0, tasa_rendimiento_inversionista: 12.0, comision_originacion_porcentaje: 4.0 },
  C: { label: 'C', tasa_interes_prestatario: 20.0, tasa_rendimiento_inversionista: 15.0, comision_originacion_porcentaje: 5.0 },
  Rechazado: { label: 'Rechazado' },
};

// --- FUNCIÓN DE CÁLCULO DE COSTOS (SIN CAMBIOS) ---
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
    const solicitudPayload = solicitud ?? {};
    const { id: solicitud_id, email, nombre_completo, tipo_solicitud, monto_solicitado, plazo_meses, saldo_deuda_tc } = solicitudPayload;

    // Flujo AUTOMÁTICO para INVERSIONISTA: generar invitación y enviar correo de bienvenida
    if (tipo_solicitud === 'inversionista') {
      console.log(`Solicitud ${solicitud_id}: Iniciando flujo inversionista (auto-invite).`);
      const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

      const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://www.tuprestamobo.com';
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
          redirectTo: `${APP_BASE_URL}/confirmar-y-crear-perfil`,
          // Incluir "full_name" para que el Dashboard de Supabase muestre Display Name
          data: { nombre_completo, full_name: nombre_completo, role: 'inversionista' },
        },
      });
      // Manejo amable si el email ya existe: enviar instrucciones de acceso en lugar de fallar
      if (linkError) {
        const code = (linkError as any)?.code || (linkError as any)?.status || ''
        const msg = String((linkError as any)?.message || '')
        const isEmailExists = code === 'email_exists' || msg.toLowerCase().includes('already been registered')
        if (isEmailExists) {
          console.warn(`Solicitud ${solicitud_id}: Email ya registrado (${email}). Enviando correo de acceso.`)
          const { data: recData } = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: `${APP_BASE_URL}/auth` } })
          const loginUrl = `${APP_BASE_URL}/auth`
          const recoveryUrl = recData?.properties?.action_link || `${APP_BASE_URL}/auth`
          try {
            await resend.emails.send({
              from: 'Tu Prestamo <contacto@tuprestamobo.com>',
              to: [email],
              subject: 'Ya tienes una cuenta en Tu Préstamo',
              html: `
                <h1>Hola ${nombre_completo || ''}</h1>
                <p>Detectamos que este correo ya está registrado como inversionista.</p>
                <p>Puedes ingresar a tu cuenta con el siguiente botón:</p>
                <p style="margin:16px 0">
                  <a href="${loginUrl}" style="background-color:#11696b;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Ingresar</a>
                </p>
                <p>Si olvidaste tu contraseña, restablécela aquí:</p>
                <p style="margin:8px 0">
                  <a href="${recoveryUrl}" style="color:#11696b;">Restablecer contraseña</a>
                </p>
                <p style="margin-top:20px">Equipo de Tu Préstamo</p>
              `,
              text: `Hola ${nombre_completo || ''}\n\nEste correo ya está registrado. Ingresa en ${loginUrl}.\nSi olvidaste tu contraseña, restablécela aquí: ${recoveryUrl}.\n\nEquipo de Tu Préstamo`,
              reply_to: 'contacto@tuprestamobo.com',
            })
          } catch (_) {}
          try { await supabaseAdmin.from('solicitudes').update({ estado: 'contactado' }).eq('id', solicitud_id) } catch {}
          return new Response(JSON.stringify({ message: 'Usuario existente: se enviaron instrucciones de acceso.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
        }
      }
      if (linkError) {
        console.error(`Solicitud ${solicitud_id}: Error al generar link de invitación:`, linkError);
        throw linkError;
      }
      const inviteLink = linkData.properties.action_link;

      const resendResponse = await resend.emails.send({
        from: 'Tu Prestamo <contacto@tuprestamobo.com>',
        to: [email],
        subject: `¡Bienvenido ${nombre_completo} a Tu Préstamo! Activa tu cuenta de inversionista`,
        html: `
          <h1>¡Bienvenido ${nombre_completo} a Tu Préstamo!</h1>
          <p>Estás a un paso de acceder a oportunidades de inversión exclusivas.</p>
          <p>Por favor, haz clic en el siguiente enlace para configurar tu contraseña y activar tu cuenta:</p>
          <p style="margin:20px 0">
            <a href="${inviteLink}" style="background-color:#26C2B2; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Activar Mi Cuenta</a>
          </p>
          <p style="margin-top:20px">Atentamente,<br>El equipo de Tu Préstamo</p>
        `,
        text: `Hola ${nombre_completo},\n\nBienvenido a Tu Préstamo. Para activar tu cuenta de inversionista, abre este enlace: ${inviteLink}\n\nAtentamente,\nEl equipo de Tu Préstamo`,
        reply_to: 'contacto@tuprestamobo.com',
      });
      console.log('Resend response (investor):', resendResponse);
      console.log(`Solicitud ${solicitud_id}: Correo de bienvenida inversionista enviado a ${email}.`);

      try {
        await supabaseAdmin.from('solicitudes').update({ estado: 'contactado' }).eq('id', solicitud_id);
      } catch (_) {}

      return new Response(JSON.stringify({ message: 'Invitación enviada a inversionista.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

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
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Actualización sobre tu solicitud</title>
</head>
<body style="margin:0;padding:0;background:#F8F8F8;font-family: Arial, Helvetica, sans-serif;color:#222;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8F8F8;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#00445A;padding:18px 20px;">
              <img src="https://tuprestamobo.com/Logo-Tu-Prestamo.png" alt="Tu Préstamo" style="height:38px;display:block;">
            </td>
          </tr>
          <tr>
            <td style="padding:24px 20px 8px 20px;">
              <h1 style="margin:0;font-size:22px;color:#00445A;font-weight:700;font-family: Montserrat, Arial, sans-serif;">${nombre_completo || 'Hola'},</h1>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#222;">
                Gracias por tu interés en Tu Préstamo. Por el momento, tu solicitud no cumple los criterios automáticos de pre‑aprobación
                basados en ingresos mensuales y nivel de endeudamiento.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 20px 8px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F8F8F8;border:1px solid #e9ecef;border-radius:10px;padding:14px;">
                <tr>
                  <td style="font-size:15px;line-height:1.6;color:#222;">
                    Te invitamos a intentarlo nuevamente en los próximos meses cuando tu situación financiera haya mejorado.
                    Nuestro objetivo es ofrecerte un crédito responsable y sostenible.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 20px 24px 20px;font-size:14px;line-height:1.6;color:#222;">
              Si tienes dudas, escríbenos a
              <a href="mailto:contacto@tuprestamobo.com" style="color:#00445A;text-decoration:none;">contacto@tuprestamobo.com</a>.
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 18px 20px;font-size:12px;line-height:1.5;color:#777;border-top:1px solid #e9ecef;">
              <p style="margin:12px 0 4px 0;">Ref. de Solicitud: ${solicitud_id}</p>
              <p style="margin:0;">Este es un correo automático. Por favor no respondas a esta dirección.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      });

      return new Response(JSON.stringify({ message: 'Solicitud rechazada automáticamente.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } else {
      console.log(`Solicitud ${solicitud_id}: Iniciando flujo de pre-aprobación.`);
      
      let existingUser = false;
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        user_metadata: { full_name: nombre_completo, role: 'prestatario' }
      });

      if (userError) {
        const normalized = String(userError.message || '').toLowerCase();
        if (normalized.includes('already registered') || normalized.includes('already been registered')) {
            console.warn('Usuario ya registrado, se usara cuenta existente:', userError.message);
            existingUser = true;
        } else {
            throw userError;
        }
      }

      let user_id = user?.user?.id || null;
      if (!user_id && existingUser) {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        if (listError || !listData?.users) {
          console.error('No se pudo listar usuarios existentes:', listError);
          throw listError || new Error('No se pudo listar usuarios');
        }
        const match = listData.users.find((u) => (u.email || '').toLowerCase() === String(email || '').toLowerCase());
        if (!match?.id) {
          console.error('Usuario existente no encontrado en listado');
          throw new Error('Usuario existente no encontrado');
        }
        user_id = match.id;
      }

      console.log(`Solicitud ${solicitud_id}: user_id creado: ${user_id}`);

      const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://www.tuprestamobo.com";
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${APP_BASE_URL}/confirmar`
        }
      });

      if (linkError) {
        console.error(`Error al generar link para ${email}:`, linkError);
        throw linkError;
      }
      const magicLink = linkData.properties.action_link;
      console.log(`Solicitud ${solicitud_id}: Magic Link generado.`);

      const ctaLabel = existingUser ? 'Continuar mi solicitud' : 'Activar Mi Cuenta';
      const introLine = existingUser
        ? 'Detectamos que ya tienes una cuenta. Para continuar con tu solicitud, ingresa con el siguiente enlace:'
        : 'Estamos un paso más cerca de refinanciar tu deuda. El siguiente paso es activar tu cuenta para poder continuar con el proceso.';

      await resend.emails.send({
        from: 'Tu Prestamo <contacto@tuprestamobo.com>',
        to: [email],
        subject: '¡Tu solicitud ha sido pre-aprobada!',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <img src="https://tuprestamobo.com/Logo-Tu-Prestamo.png" alt="Logo Tu Préstamo" style="width: 150px; margin-bottom: 20px;">
            <h2 style="color: #333;">¡Felicidades, ${nombre_completo}! Tu solicitud ha sido pre-aprobada.</h2>
            <p>${introLine}</p>
            <p>Por favor, haz clic en el siguiente botón para continuar:</p>
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <a href="${magicLink}" target="_blank" style="background-color: #28a745; color: #ffffff; padding: 15px 30px; font-size: 18px; text-decoration: none; border-radius: 5px; display: inline-block;">${ctaLabel}</a>
                </td>
              </tr>
            </table>
            <p>Atentamente,<br>El equipo de Tu Préstamo</p>
            <p style="font-size: 10px; color: #999999; margin-top: 20px;">Ref. de Solicitud: ${solicitud_id}</p>
          </div>
        `,
      });
      console.log(`Solicitud ${solicitud_id}: Correo de bienvenida enviado a ${email} via Resend.`);

      const netDebt = Number(saldo_deuda_tc) || null;
      const baseAmount = Number(monto_solicitado) || netDebt || 17000;
      const originacionPct = Number(riskProfile.comision_originacion_porcentaje) || 3;
      const commissionDecimal = originacionPct / 100;
      const grossUpBase = commissionDecimal >= 1 ? baseAmount : baseAmount / (1 - commissionDecimal);
      const clippedGross = Math.min(70000, Math.max(5000, isNaN(grossUpBase) ? baseAmount : grossUpBase));
      const finalAmount = clippedGross;
      const finalPlazo = Number(plazo_meses) || 24;

      const loanCosts = calculateLoanCosts(
        finalAmount,
        riskProfile.tasa_interes_prestatario,
        finalPlazo,
        originacionPct
      );

      console.log(`Solicitud ${solicitud_id}: Iniciando inserción de oportunidad con costos calculados.`);
      const { data: oppData, error: oppError } = await supabaseAdmin.from('oportunidades').insert([{
        solicitud_id,
        user_id,
        monto: finalAmount,
        plazo_meses: finalPlazo,
        perfil_riesgo: riskProfile.label,
        tasa_interes_anual: riskProfile.tasa_interes_prestatario,
        tasa_interes_prestatario: riskProfile.tasa_interes_prestatario,
        tasa_rendimiento_inversionista: riskProfile.tasa_rendimiento_inversionista,
        comision_originacion_porcentaje: riskProfile.comision_originacion_porcentaje,
        cargo_servicio_seguro_porcentaje: 0.15,
        comision_servicio_inversionista_porcentaje: 1.0,
        estado: 'borrador',
        ...loanCosts,
      }]).select().single();

      if (oppError) {
        console.error(`Error al insertar oportunidad para solicitud ${solicitud_id}:`, oppError);
        throw oppError;
      }
      console.log(`Solicitud ${solicitud_id}: Oportunidad insertada con ID: ${oppData.id}`);

      console.log(`Solicitud ${solicitud_id}: Iniciando actualización de solicitud a 'pre-aprobado'.`);
      const { error: updateError } = await supabaseAdmin.from('solicitudes').update({
        estado: 'pre-aprobado',
        user_id,
        opportunity_id: oppData.id,
        monto_solicitado: finalAmount,
        plazo_meses: finalPlazo,
      }).eq('id', solicitud_id);
      if (updateError) {
        console.error(`Error al actualizar solicitud ${solicitud_id} a 'pre-aprobado':`, updateError);
        throw updateError;
      }
      console.log(`Solicitud ${solicitud_id}: Actualización a 'pre-aprobado' finalizada.`);

      console.log(`Solicitud ${solicitud_id}: Generando PDF INFOCRED inmediato.`);
      await ensureAuthorizationPreprint(supabaseAdmin, solicitud, user_id);

      return new Response(JSON.stringify({ message: 'Solicitud pre-aprobada, correo de activación enviado manualmente.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
  } catch (error) {
    console.error(`Error en handle-new-solicitud (V8.0): ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
